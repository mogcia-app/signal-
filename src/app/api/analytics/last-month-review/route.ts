import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import { getMasterContext } from "../../ai/monthly-analysis/route";
import type { PostLearningSignal, PatternSummary } from "../../ai/monthly-analysis/route";

// 先月の日付を取得（YYYY-MM形式）
function getLastMonth(): string {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
}

// 月名を取得
function getMonthName(date: string): string {
  const [yearStr, monthStr] = date.split("-").map(Number);
  const dateObj = new Date(yearStr, monthStr - 1, 1);
  return dateObj.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "last-month-review", limit: 10, windowSeconds: 60 },
      auditEventName: "last_month_review_access",
    });

    const lastMonth = getLastMonth();
    const lastMonthName = getMonthName(lastMonth);

    // マスターコンテキストから先月の投稿パターンを取得
    // OpenAI APIエラーが発生してもフォールバック処理で続行できるようにtry-catchで囲む
    let masterContext;
    try {
      masterContext = await getMasterContext(uid, { forceRefresh: false });
    } catch (error) {
      console.error("マスターコンテキスト取得エラー:", error);
      // エラーが発生しても、データがあれば続行できるようにnullを設定
      masterContext = null;
    }

    if (!masterContext?.postPatterns?.signals?.length) {
      return NextResponse.json({
        success: true,
        data: {
          month: lastMonth,
          monthName: lastMonthName,
          hasData: false,
          message: "先月の分析データがまだありません。投稿とフィードバックを継続してデータを蓄積しましょう。",
        },
      });
    }

    // 先月の投稿のみをフィルタリング
    const lastMonthStart = new Date(
      Number.parseInt(lastMonth.split("-")[0], 10),
      Number.parseInt(lastMonth.split("-")[1], 10) - 1,
      1
    );
    const lastMonthEnd = new Date(
      Number.parseInt(lastMonth.split("-")[0], 10),
      Number.parseInt(lastMonth.split("-")[1], 10),
      0,
      23,
      59,
      59
    );

    // 投稿データとanalyticsデータを取得して日付でフィルタリング
    const [postsSnapshot, analyticsSnapshot] = await Promise.all([
      adminDb.collection("posts").where("userId", "==", uid).get(),
      adminDb.collection("analytics").where("userId", "==", uid).get(),
    ]);

    const postIdToDateMap = new Map<string, Date>();
    
    // postsコレクションから日付を取得
    postsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const postId = doc.id;
      let publishedAt: Date | null = null;

      if (data.publishedAt) {
        if (data.publishedAt instanceof Date) {
          publishedAt = data.publishedAt;
        } else if (data.publishedAt.toDate) {
          publishedAt = data.publishedAt.toDate();
        } else if (typeof data.publishedAt === "string") {
          publishedAt = new Date(data.publishedAt);
        }
      } else if (data.createdAt) {
        if (data.createdAt instanceof Date) {
          publishedAt = data.createdAt;
        } else if (data.createdAt.toDate) {
          publishedAt = data.createdAt.toDate();
        } else if (typeof data.createdAt === "string") {
          publishedAt = new Date(data.createdAt);
        }
      }

      if (publishedAt && !isNaN(publishedAt.getTime())) {
        postIdToDateMap.set(postId, publishedAt);
      }
    });

    // analyticsコレクションからも日付を取得（postsにない場合の補完）
    analyticsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const postId = data.postId || doc.id;
      
      if (postIdToDateMap.has(postId)) {
        return; // 既にpostsから取得済み
      }

      let publishedAt: Date | null = null;
      if (data.publishedAt) {
        if (data.publishedAt instanceof Date) {
          publishedAt = data.publishedAt;
        } else if (data.publishedAt.toDate) {
          publishedAt = data.publishedAt.toDate();
        } else if (typeof data.publishedAt === "string") {
          publishedAt = new Date(data.publishedAt);
        }
      } else if (data.createdAt) {
        if (data.createdAt instanceof Date) {
          publishedAt = data.createdAt;
        } else if (data.createdAt.toDate) {
          publishedAt = data.createdAt.toDate();
        } else if (typeof data.createdAt === "string") {
          publishedAt = new Date(data.createdAt);
        }
      }

      if (publishedAt && !isNaN(publishedAt.getTime())) {
        postIdToDateMap.set(postId, publishedAt);
      }
    });

    // 先月の投稿のみをフィルタリング
    const lastMonthSignals = masterContext.postPatterns.signals.filter((signal) => {
      const postDate = postIdToDateMap.get(signal.postId);
      if (!postDate) return false;
      return postDate >= lastMonthStart && postDate <= lastMonthEnd;
    });

    if (lastMonthSignals.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          month: lastMonth,
          monthName: lastMonthName,
          hasData: false,
          message: "先月の投稿分析データがまだありません。投稿とフィードバックを継続してデータを蓄積しましょう。",
        },
      });
    }

    // GOLD投稿とRED投稿を分類
    const goldSignals = lastMonthSignals.filter((s) => s.tag === "gold");
    const redSignals = lastMonthSignals.filter((s) => s.tag === "red");
    const graySignals = lastMonthSignals.filter((s) => s.tag === "gray");

    // パターンサマリーを取得
    const goldSummary = masterContext.postPatterns.summaries?.gold;
    const redSummary = masterContext.postPatterns.summaries?.red;
    const graySummary = masterContext.postPatterns.summaries?.gray;

    // 先月のアクションプランを取得（monthly_reviewsコレクションから）
    const monthlyReviewDoc = await adminDb
      .collection("monthly_reviews")
      .doc(`${uid}_${lastMonth}`)
      .get();

    let actionPlans: Array<{ title: string; description: string; action: string }> = [];
    if (monthlyReviewDoc.exists) {
      const reviewData = monthlyReviewDoc.data();
      if (reviewData?.actionPlans && Array.isArray(reviewData.actionPlans)) {
        actionPlans = reviewData.actionPlans.slice(0, 3); // 最大3件
      }
    }

    // 先月のKPIサマリーを取得（既に取得済みのanalyticsSnapshotを使用）
    let totalReach = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalSaves = 0;
    let totalFollowerIncrease = 0;

    analyticsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const postId = doc.id;
      const postDate = postIdToDateMap.get(postId);

      if (postDate && postDate >= lastMonthStart && postDate <= lastMonthEnd) {
        totalReach += data.reach || 0;
        totalLikes += data.likes || 0;
        totalComments += data.comments || 0;
        totalSaves += data.saves || 0;
        totalFollowerIncrease += data.followerIncrease || 0;
      }
    });

    // 先月全体の平均を計算（比較用）
    const allLastMonthSignals = lastMonthSignals;
    const avgAllEngagementRate = allLastMonthSignals.length > 0
      ? allLastMonthSignals.reduce((sum, s) => sum + s.engagementRate, 0) / allLastMonthSignals.length
      : 0;
    const avgAllReach = allLastMonthSignals.length > 0
      ? allLastMonthSignals.reduce((sum, s) => sum + s.reach, 0) / allLastMonthSignals.length
      : 0;
    const avgAllSavesRate = allLastMonthSignals.length > 0
      ? allLastMonthSignals.reduce((sum, s) => sum + (s.metrics?.savesRate || 0), 0) / allLastMonthSignals.length
      : 0;

    // 何が良かったか（GOLD投稿の分析）
    // 新しい定義：次も再現できる行動・構造があった
    
    // GOLD投稿から再現可能なパターンを分析
    const reproduciblePatterns: string[] = [];
    const reproducibleStructures: string[] = [];
    
    goldSignals.forEach((signal) => {
      // 再現可能な構造を特定
      if (signal.hashtags && signal.hashtags.length >= 3) {
        const hashtagPattern = signal.hashtags.slice(0, 3).join("、");
        if (!reproducibleStructures.includes(hashtagPattern)) {
          reproducibleStructures.push(hashtagPattern);
        }
      }
      
      // 投稿タイプのパターン
      const typeLabel = signal.category === "feed" ? "画像投稿" : signal.category === "reel" ? "リール" : "ストーリー";
      if (!reproduciblePatterns.includes(typeLabel)) {
        reproduciblePatterns.push(typeLabel);
      }
      
      // タイトルが明確なテーマを持っているか
      if (signal.title && signal.title.length >= 10) {
        const theme = signal.title.substring(0, 20);
        if (!reproduciblePatterns.includes(`「${theme}...」のようなテーマ`)) {
          reproduciblePatterns.push(`「${theme}...」のようなテーマ`);
        }
      }
    });
    
    // summaryからハッシュタグの長いリストを削除
    let goldSummaryText = goldSummary?.summary || "";
    if (goldSummaryText) {
      // ハッシュタグの長いリストを削除
      goldSummaryText = goldSummaryText.replace(/よく使われたハッシュタグは[^。]+です。/g, "");
      goldSummaryText = goldSummaryText.trim();
    }
    
    // keyThemesからハッシュタグを除外し、実際の成功要因を抽出
    const goldKeyThemes = goldSummary?.keyThemes || [];
    const goldHashtagPattern = /^[ひだまり|白石館|祐徳稲荷神社|ドライブ|外出|レクリエーション|笑顔|気分転換|介護|施設|佐賀|カカシ|グループ|ホーム|老人|福祉|地域|貢献|アットホーム|デイサービス|夕食|安心|場所|鍋島館|利用者|家族|新しい|心温まる|空間|住まい|声]/;
    const actualGoldThemes = goldKeyThemes.filter((theme) => {
      // ハッシュタグっぽいもの（長い文字列、スペース区切りなど）を除外
      const words = theme.split(/\s+/);
      return words.length <= 3 && !goldHashtagPattern.test(theme);
    });

    // GOLD投稿の実際の成功要因を分析
    const successFactors: string[] = [];
    const replicationActions: string[] = [];
    if (goldSignals.length > 0) {
      // 平均エンゲージメント率
      const avgEngagementRate = goldSignals.reduce((sum, s) => sum + s.engagementRate, 0) / goldSignals.length;
      if (avgEngagementRate > 0) {
        const lift = avgAllEngagementRate > 0 ? ((avgEngagementRate / avgAllEngagementRate - 1) * 100) : 0;
        successFactors.push(`平均エンゲージメント率: ${avgEngagementRate.toFixed(1)}%${lift > 0 ? ` (平均比+${lift.toFixed(0)}%)` : ""}`);
        if (lift > 20) {
          replicationActions.push(`エンゲージメント率が平均より${lift.toFixed(0)}%高い成功パターンを再現`);
        }
      }
      
      // 投稿タイプの分布
      const postTypeCounts: Record<string, number> = {};
      goldSignals.forEach((s) => {
        const type = s.category || "feed";
        postTypeCounts[type] = (postTypeCounts[type] || 0) + 1;
      });
      const topPostType = Object.entries(postTypeCounts).sort((a, b) => b[1] - a[1])[0];
      if (topPostType) {
        const typeLabel = topPostType[0] === "feed" ? "画像投稿" : topPostType[0] === "reel" ? "リール" : "ストーリー";
        successFactors.push(`${typeLabel}が${topPostType[1]}件と最も多い`);
        if (topPostType[1] >= goldSignals.length * 0.5) {
          replicationActions.push(`${typeLabel}の投稿を増やす`);
        }
      }
      
      // 平均リーチ
      const avgReach = goldSignals.reduce((sum, s) => sum + s.reach, 0) / goldSignals.length;
      if (avgReach > 0) {
        const lift = avgAllReach > 0 ? ((avgReach / avgAllReach - 1) * 100) : 0;
        successFactors.push(`平均リーチ: ${Math.round(avgReach).toLocaleString()}人${lift > 0 ? ` (平均比+${lift.toFixed(0)}%)` : ""}`);
        if (lift > 20) {
          replicationActions.push(`リーチが平均より${lift.toFixed(0)}%高い成功パターンを分析`);
        }
      }
      
      // 平均保存率
      const avgSavesRate = goldSignals.reduce((sum, s) => sum + (s.metrics?.savesRate || 0), 0) / goldSignals.length;
      if (avgSavesRate > 0) {
        const lift = avgAllSavesRate > 0 ? ((avgSavesRate / avgAllSavesRate - 1) * 100) : 0;
        successFactors.push(`平均保存率: ${(avgSavesRate * 100).toFixed(1)}%${lift > 0 ? ` (平均比+${lift.toFixed(0)}%)` : ""}`);
        if (lift > 20) {
          replicationActions.push(`保存率が平均より${lift.toFixed(0)}%高いコンテンツタイプを再現`);
        }
      }

      // 成功パターンの特徴から再現アクションを生成
      if (actualGoldThemes.length > 0) {
        replicationActions.push(`成功テーマ「${actualGoldThemes[0]}」を活用した投稿を増やす`);
      }
      if (goldSummary?.suggestedAngles && goldSummary.suggestedAngles.length > 0) {
        replicationActions.push(`成功アングル「${goldSummary.suggestedAngles[0]}」をテンプレート化`);
      }
    }

    // 新しい定義に基づく説明を生成
    // 「良かった」= 次も再現できる行動・構造があった
    let finalGoldSummaryText = "";
    
    if (goldSignals.length > 0) {
      const summaryParts: string[] = [];
      
      // 再現可能なパターンがあることを強調
      if (reproduciblePatterns.length > 0) {
        summaryParts.push(`${goldSignals.length}件の投稿に再現可能なパターンが見つかりました`);
        if (reproduciblePatterns.length <= 2) {
          summaryParts.push(`特に「${reproduciblePatterns.join("」「")}」の構造が効果的でした`);
        }
      } else if (reproducibleStructures.length > 0) {
        summaryParts.push(`${goldSignals.length}件の投稿に再現可能な構造が見つかりました`);
      } else {
        summaryParts.push(`${goldSignals.length}件の投稿に再現可能な要素が見つかりました`);
      }
      
      // 具体的な再現可能な要素を追加
      if (reproducibleStructures.length > 0 && reproducibleStructures.length <= 2) {
        summaryParts.push(`ハッシュタグパターン「${reproducibleStructures[0]}」などの構造が効果的でした`);
      }
      
      finalGoldSummaryText = summaryParts.join("。") + "。";
    } else {
      finalGoldSummaryText = "再現可能なパターンの分析データがまだ不足しています。";
    }
    
    // AIが生成したsummaryがある場合は、それを参考にしつつ新しい定義を反映
    if (goldSummaryText && goldSummaryText.length > 0) {
      // AIの要約から再現可能性に関する部分を抽出
      const reproducibilityKeywords = ["再現", "パターン", "構造", "テンプレ", "活用", "効果的"];
      const hasReproducibilityContent = reproducibilityKeywords.some((keyword) => 
        goldSummaryText.includes(keyword)
      );
      
      if (hasReproducibilityContent) {
        // AIの要約を優先しつつ、新しい定義を反映
        finalGoldSummaryText = goldSummaryText.replace(
          /成功パターンが\d+件見つかりました/g,
          `${goldSignals.length}件の投稿に再現可能なパターンが見つかりました`
        );
      }
    }

    const whatWorkedWell = {
      count: goldSignals.length,
      summary: finalGoldSummaryText,
      keyThemes: actualGoldThemes.length > 0 ? actualGoldThemes : successFactors.slice(0, 3),
      successFactors: successFactors, // 実際の成功要因を追加
      suggestedAngles: goldSummary?.suggestedAngles || [],
      replicationActions: replicationActions, // 再現アクション
      topPosts: goldSignals
        .sort((a, b) => b.kpiScore - a.kpiScore)
        .slice(0, 3)
        .map((s) => {
          const erLift = avgAllEngagementRate > 0 ? ((s.engagementRate / avgAllEngagementRate - 1) * 100) : 0;
          const reachLift = avgAllReach > 0 ? ((s.reach / avgAllReach - 1) * 100) : 0;
          return {
            postId: s.postId,
            title: s.title,
            kpiScore: s.kpiScore,
            engagementRate: s.engagementRate,
            reach: s.reach,
            savesRate: s.metrics?.savesRate || 0,
            category: s.category || "feed",
            hashtags: s.hashtags?.slice(0, 5) || [],
            erLift: erLift,
            reachLift: reachLift,
          };
        }),
    };

    // 何が悪かったか（RED投稿の分析）
    // 新しい定義：改善すれば変えられる要因が特定できた
    
    // RED投稿から改善可能な要因を分析
    const improvableFactors: string[] = [];
    const structuralIssues: string[] = [];
    
    redSignals.forEach((signal) => {
      // 改善可能な要因を特定
      if (!signal.hashtags || signal.hashtags.length === 0) {
        if (!improvableFactors.includes("ハッシュタグ未設定")) {
          improvableFactors.push("ハッシュタグ未設定");
        }
      } else if (signal.hashtags.length < 3) {
        if (!improvableFactors.includes("ハッシュタグが少ない")) {
          improvableFactors.push("ハッシュタグが少ない");
        }
      }
      
      if (!signal.title || signal.title.length < 10) {
        if (!improvableFactors.includes("タイトルが不明確")) {
          improvableFactors.push("タイトルが不明確");
        }
      }
      
      // 投稿タイプの問題
      const typeLabel = signal.category === "feed" ? "画像投稿" : signal.category === "reel" ? "リール" : "ストーリー";
      if (signal.engagementRate < avgAllEngagementRate * 0.7) {
        if (!structuralIssues.includes(`${typeLabel}の構成見直しが必要`)) {
          structuralIssues.push(`${typeLabel}の構成見直しが必要`);
        }
      }
    });
    
    // summaryから件数の不一致を修正し、より分かりやすい説明にする
    let redSummaryText = redSummary?.summary || "";
    if (redSummaryText && redSignals.length > 0) {
      // ハッシュタグの長いリストを削除（後で別途表示）
      redSummaryText = redSummaryText.replace(/よく使われたハッシュタグは[^。]+です。/g, "");
      redSummaryText = redSummaryText.trim();
    }
    
    // keyThemesがハッシュタグのリストの可能性があるので、実際の共通課題とハッシュタグを分離
    const redKeyThemes = redSummary?.keyThemes || [];
    const redHashtagPattern = /^[ひだまり|白石館|祐徳稲荷神社|ドライブ|外出|レクリエーション|笑顔|気分転換|介護|施設|佐賀|カカシ|グループ|ホーム|老人|福祉|地域|貢献|アットホーム|デイサービス|夕食|安心|場所]/;
    const actualThemes = redKeyThemes.filter((theme) => {
      // ハッシュタグっぽいもの（長い文字列、スペース区切りなど）を除外
      const words = theme.split(/\s+/);
      return words.length <= 3 && !redHashtagPattern.test(theme);
    });
    const hashtags = redKeyThemes.filter((theme) => {
      const words = theme.split(/\s+/);
      return words.length > 3 || redHashtagPattern.test(theme);
    });
    
    // 新しい定義に基づく説明を生成
    // 「ダメだった」= 改善すれば変えられる要因が特定できた
    let finalRedSummaryText = "";
    
    if (redSignals.length > 0) {
      const summaryParts: string[] = [];
      
      // 改善可能な要因が特定できたことを強調
      if (improvableFactors.length > 0 || structuralIssues.length > 0) {
        summaryParts.push(`${redSignals.length}件の投稿で改善可能な要因が特定できました`);
        
        // 具体的な改善要因を追加
        const allFactors = [...improvableFactors, ...structuralIssues];
        if (allFactors.length > 0 && allFactors.length <= 3) {
          summaryParts.push(`特に「${allFactors.join("」「")}」などの改善点が見つかりました`);
        }
      } else {
        summaryParts.push(`${redSignals.length}件の投稿で改善の余地が見つかりました`);
      }
      
      finalRedSummaryText = summaryParts.join("。") + "。";
    } else {
      finalRedSummaryText = "改善可能な要因の分析データがまだ不足しています。";
    }
    
    // AIが生成したsummaryがある場合は、それを参考にしつつ新しい定義を反映
    if (redSummaryText && redSummaryText.length > 0) {
      // AIの要約から改善可能性に関する部分を抽出
      const improvabilityKeywords = ["改善", "見直し", "変更", "修正", "要因", "課題"];
      const hasImprovabilityContent = improvabilityKeywords.some((keyword) => 
        redSummaryText.includes(keyword)
      );
      
      if (hasImprovabilityContent) {
        // AIの要約を優先しつつ、新しい定義を反映
        finalRedSummaryText = redSummaryText.replace(
          /改善が必要な(?:パターン|投稿)が\d+件見つかりました/g,
          `${redSignals.length}件の投稿で改善可能な要因が特定できました`
        );
      }
    }

    // RED投稿の実際の失敗要因を分析
    const failureFactors: string[] = [];
    if (redSignals.length > 0) {
      // 平均エンゲージメント率
      const avgEngagementRate = redSignals.reduce((sum, s) => sum + s.engagementRate, 0) / redSignals.length;
      if (avgEngagementRate > 0) {
        failureFactors.push(`平均エンゲージメント率: ${avgEngagementRate.toFixed(1)}%（平均を下回る可能性）`);
      }
      
      // 投稿タイプの分布
      const postTypeCounts: Record<string, number> = {};
      redSignals.forEach((s) => {
        const type = s.category || "feed";
        postTypeCounts[type] = (postTypeCounts[type] || 0) + 1;
      });
      const topPostType = Object.entries(postTypeCounts).sort((a, b) => b[1] - a[1])[0];
      if (topPostType) {
        const typeLabel = topPostType[0] === "feed" ? "画像投稿" : topPostType[0] === "reel" ? "リール" : "ストーリー";
        failureFactors.push(`${typeLabel}が${topPostType[1]}件と最も多い`);
      }
      
      // 平均リーチ
      const avgReach = redSignals.reduce((sum, s) => sum + s.reach, 0) / redSignals.length;
      if (avgReach > 0) {
        failureFactors.push(`平均リーチ: ${Math.round(avgReach).toLocaleString()}人`);
      }
      
      // 平均保存率
      const avgSavesRate = redSignals.reduce((sum, s) => sum + (s.metrics?.savesRate || 0), 0) / redSignals.length;
      if (avgSavesRate > 0) {
        failureFactors.push(`平均保存率: ${(avgSavesRate * 100).toFixed(1)}%`);
      }
    }

    // 改善可能な要因をkeyThemesに反映
    const allImprovableFactors = [
      ...improvableFactors,
      ...structuralIssues,
      ...(actualThemes.length > 0 ? actualThemes : []),
      ...(redSummary?.cautions?.slice(0, 2) || [])
    ].filter((factor, index, self) => self.indexOf(factor) === index); // 重複除去

    const whatDidntWork = {
      count: redSignals.length,
      summary: finalRedSummaryText || (redSignals.length > 0 
        ? `改善可能な要因が特定できた投稿が${redSignals.length}件見つかりました。`
        : "改善可能な要因の分析データがまだ不足しています。"),
      keyThemes: allImprovableFactors.length > 0 ? allImprovableFactors.slice(0, 3) : (redSummary?.cautions?.slice(0, 3) || []),
      failureFactors: failureFactors, // 実際の失敗要因を追加
      hashtags: hashtags.length > 0 ? hashtags.slice(0, 1) : [], // ハッシュタグは1つだけ表示
      cautions: redSummary?.cautions || [],
      topPosts: redSignals
        .sort((a, b) => a.kpiScore - b.kpiScore)
        .slice(0, 3)
        .map((s) => ({
          postId: s.postId,
          title: s.title,
          kpiScore: s.kpiScore,
          engagementRate: s.engagementRate,
        })),
    };

    // どうすべきか（アクションプラン）
    const whatToDoNext = {
      actionPlans: actionPlans.length > 0 ? actionPlans : [],
      recommendations: masterContext.recommendations || [],
      focusAreas: masterContext.personalizedInsights
        ?.filter((insight) => insight.includes("重点テーマ"))
        .map((insight) => insight.replace("重点テーマ: ", "")) || [],
    };

    // whatWorkedWellが常に含まれるようにする（countが0でもsummaryがあれば表示）
    const whatWorkedWellData = goldSignals.length > 0 || goldSummary?.summary
      ? whatWorkedWell
      : {
          count: 0,
          summary: "先月の成功パターンの分析データがまだ不足しています。投稿とフィードバックを継続してデータを蓄積しましょう。",
          keyThemes: [],
          suggestedAngles: [],
          topPosts: [],
        };

    return NextResponse.json({
      success: true,
      data: {
        month: lastMonth,
        monthName: lastMonthName,
        hasData: true,
        kpiSummary: {
          totalReach,
          totalLikes,
          totalComments,
          totalSaves,
          totalFollowerIncrease,
          totalPosts: lastMonthSignals.length,
        },
        whatWorkedWell: whatWorkedWellData,
        whatDidntWork,
        whatToDoNext,
        grayCount: graySignals.length, // 参考情報として
      },
    });
  } catch (error) {
    console.error("❌ 先月の振り返り取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(
      {
        ...body,
        error: "先月の振り返りデータの取得に失敗しました",
      },
      { status }
    );
  }
}

