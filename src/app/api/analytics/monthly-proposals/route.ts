import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { adminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import * as admin from "firebase-admin";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

// 月の範囲を計算
function getMonthRange(date: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = date.split("-").map(Number);
  const start = new Date(Date.UTC(yearStr, monthStr - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(yearStr, monthStr, 0, 23, 59, 59, 999));
  return { start, end };
}

// 次月名を取得
function getNextMonthName(date: string): string {
  const [yearStr, monthStr] = date.split("-").map(Number);
  const nextMonth = new Date(yearStr, monthStr, 1);
  return nextMonth.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
}

// 月名を取得
function getMonthName(date: string): string {
  const [yearStr, monthStr] = date.split("-").map(Number);
  const dateObj = new Date(yearStr, monthStr - 1, 1);
  return dateObj.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
}

interface ActionPlan {
  title: string;
  description: string;
  action: string;
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-monthly-proposals", limit: 10, windowSeconds: 60 },
      auditEventName: "analytics_monthly_proposals_access",
    });

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 7); // YYYY-MM形式

    if (!/^\d{4}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "date parameter must be in YYYY-MM format" },
        { status: 400 }
      );
    }

    // KPIデータがクエリパラメータで提供されているか確認
    const providedKpis = {
      totalLikes: searchParams.get("totalLikes") ? Number.parseInt(searchParams.get("totalLikes")!, 10) : null,
      totalReach: searchParams.get("totalReach") ? Number.parseInt(searchParams.get("totalReach")!, 10) : null,
      totalSaves: searchParams.get("totalSaves") ? Number.parseInt(searchParams.get("totalSaves")!, 10) : null,
      totalComments: searchParams.get("totalComments") ? Number.parseInt(searchParams.get("totalComments")!, 10) : null,
      totalFollowerIncrease: searchParams.get("totalFollowerIncrease") ? Number.parseInt(searchParams.get("totalFollowerIncrease")!, 10) : null,
    };

    const useProvidedKpis = Object.values(providedKpis).every((v) => v !== null);

    // 保存されたアクションプランを取得（存在する場合）
    const savedReviewDoc = await adminDb
      .collection("monthly_reviews")
      .doc(`${uid}_${date}`)
      .get();

    // 保存されたデータがある場合、アクションプランを返す（再生成フラグがない限り）
    const forceRegenerate = searchParams.get("regenerate") === "true";
    if (savedReviewDoc.exists && !forceRegenerate) {
      const savedData = savedReviewDoc.data();
      if (savedData?.actionPlans && Array.isArray(savedData.actionPlans) && savedData.actionPlans.length > 0) {
        return NextResponse.json({
          success: true,
          data: {
            actionPlans: savedData.actionPlans,
            month: date,
            nextMonthName: getNextMonthName(date),
          },
        });
      }
    }

    // 月の範囲を計算
    const { start, end } = getMonthRange(date);
    const startTimestamp = admin.firestore.Timestamp.fromDate(start);
    const endTimestamp = admin.firestore.Timestamp.fromDate(end);

    // 必要なデータを取得（並列）- analyticsコレクション（分析済みデータ）のみを使用
    const [analyticsSnapshot, plansSnapshot] = await Promise.all([
      // 期間内の分析データを取得（分析済みデータのみ）
      adminDb
        .collection("analytics")
        .where("userId", "==", uid)
        .where("publishedAt", ">=", startTimestamp)
        .where("publishedAt", "<=", endTimestamp)
        .get(),

      // 運用計画の有無
      adminDb
        .collection("plans")
        .where("userId", "==", uid)
        .where("snsType", "==", "instagram")
        .where("status", "==", "active")
        .limit(1)
        .get(),
    ]);

    // 投稿と分析データをpostIdで紐付け（重複除去: 同じpostIdの最新レコードのみ保持）
    const analyticsByPostId = new Map<string, admin.firestore.DocumentData>();
    analyticsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const postId = data.postId;
      if (postId) {
        const existing = analyticsByPostId.get(postId);
        if (!existing || (data.publishedAt && existing.publishedAt && data.publishedAt > existing.publishedAt)) {
          analyticsByPostId.set(postId, data);
        }
      }
    });

    const analyzedCount = analyticsByPostId.size; // 分析済み投稿数
    const hasPlan = !plansSnapshot.empty;

    // KPIを集計（提供されている場合はそれを使用、そうでない場合は計算）
    let totalLikes = useProvidedKpis ? providedKpis.totalLikes! : 0;
    let totalReach = useProvidedKpis ? providedKpis.totalReach! : 0;
    let totalComments = useProvidedKpis ? providedKpis.totalComments! : 0;
    let totalSaves = useProvidedKpis ? providedKpis.totalSaves! : 0;
    // totalShares is assigned but not used
    // let totalShares = 0; // シェア数は提供されていないので計算
    let totalFollowerIncrease = useProvidedKpis ? providedKpis.totalFollowerIncrease! : 0;

    if (!useProvidedKpis) {
      // KPIデータが提供されていない場合は計算
      analyticsByPostId.forEach((data) => {
        totalLikes += data.likes || 0;
        totalReach += data.reach || 0;
        totalComments += data.comments || 0;
        totalSaves += data.saves || 0;
        // totalShares is not available in analytics data
        totalFollowerIncrease += data.followerIncrease || 0;
      });
    } else {
      // KPIデータが提供されている場合でも、シェア数は計算が必要
      // totalShares is not available in analytics data, so no calculation needed
    }

    // 投稿タイプ別の統計を計算（analyticsコレクションのデータのみを使用）
    const postTypeStats: Record<string, { count: number; totalReach: number }> = {};

    analyticsByPostId.forEach((analytics, _postId) => {
      const postType = analytics.category || analytics.postType || "unknown";
      const reach = analytics.reach || 0;

      if (!postTypeStats[postType]) {
        postTypeStats[postType] = { count: 0, totalReach: 0 };
      }
      postTypeStats[postType].count++;
      postTypeStats[postType].totalReach += reach;
    });

    // 投稿タイプのラベルを日本語に変換
    const typeLabelMap: Record<string, string> = {
      feed: "画像投稿",
      reel: "リール",
      story: "ストーリー",
      carousel: "カルーセル",
      video: "動画",
      unknown: "その他",
    };

    // 投稿タイプ別の統計を配列に変換
    const postTypeArray = Object.entries(postTypeStats)
      .map(([type, stats]) => ({
        type,
        label: typeLabelMap[type] || type,
        count: stats.count,
        totalReach: stats.totalReach,
        percentage: totalReach > 0 ? (stats.totalReach / totalReach) * 100 : 0,
      }))
      .sort((a, b) => b.totalReach - a.totalReach);

    // 前月のデータを取得（前月比計算用）
    const prevMonth = new Date(start);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
    const { start: prevStart, end: prevEnd } = getMonthRange(prevMonthStr);
    const prevStartTimestamp = admin.firestore.Timestamp.fromDate(prevStart);
    const prevEndTimestamp = admin.firestore.Timestamp.fromDate(prevEnd);

    const prevAnalyticsSnapshot = await adminDb
      .collection("analytics")
      .where("userId", "==", uid)
      .where("publishedAt", ">=", prevStartTimestamp)
      .where("publishedAt", "<=", prevEndTimestamp)
      .get();

    let prevTotalReach = 0;
    prevAnalyticsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      prevTotalReach += data.reach || 0;
    });

    const reachChange = prevTotalReach > 0 
      ? ((totalReach - prevTotalReach) / prevTotalReach) * 100 
      : 0;

    const reachChangeText = prevTotalReach > 0
      ? `（前月比${reachChange >= 0 ? "+" : ""}${reachChange.toFixed(1)}％）`
      : "";

    // 運用計画の情報を取得
    if (hasPlan) {
      const planDoc = plansSnapshot.docs[0];
      const _planData = planDoc.data();
      // planInfo is assigned but not used
      // planInfo = {
      //   title: planData.title || "運用計画",
      //   targetFollowers: planData.targetFollowers || 0,
      //   currentFollowers: planData.currentFollowers || 0,
      // };
    }

    // AI生成で提案セクションを生成
    let actionPlans: ActionPlan[] = [];
    const nextMonth = getNextMonthName(date);
    const currentMonth = getMonthName(date);
    
    if (openai && analyzedCount > 0) {
      try {

        // まず振り返りの内容を簡易生成（提案の根拠として使用）
        const reviewSummary = `今月（${currentMonth}）の振り返り：
- 分析済み投稿数: ${analyzedCount}件
- リーチ数: ${totalReach.toLocaleString()}人${reachChangeText}
- いいね数: ${totalLikes.toLocaleString()}、コメント数: ${totalComments.toLocaleString()}、保存数: ${totalSaves.toLocaleString()}
- フォロワー増減: ${totalFollowerIncrease >= 0 ? "+" : ""}${totalFollowerIncrease.toLocaleString()}
- 投稿タイプ別: ${postTypeArray.length > 0
  ? postTypeArray
      .map((stat) => `${stat.label}が${stat.count}件（${stat.percentage.toFixed(0)}％）`)
      .join("、")
  : "データがありません"}
${totalReach > 0 
  ? `${reachChange >= 0 ? "前月比で増加傾向" : "前月比で減少傾向"}が見られます。` 
  : ""}
${postTypeArray.length > 0 
  ? `${postTypeArray[0].label}が最も多く閲覧されており、${postTypeArray[0].percentage.toFixed(0)}％を占めています。` 
  : ""}`;

        const prompt = `以下の${currentMonth}の振り返りを基に、${nextMonth}に向けた具体的なアクションプランを3つ生成してください。

【${currentMonth}の振り返り】
${reviewSummary}

【出力形式】
必ず以下の形式で出力してください：

📈 ${nextMonth}に向けた提案
	1.	{提案1のタイトル}
　{提案1の説明。振り返りの内容を根拠として、「${currentMonth}は○○だったため、${nextMonth}はここを注力しましょう」という形式で具体的な理由を記載してください。}
　→ {具体的なアクション}
	2.	{提案2のタイトル}
　{提案2の説明。振り返りの内容を根拠として、「${currentMonth}は○○だったため、${nextMonth}はここを注力しましょう」という形式で具体的な理由を記載してください。}
	3.	{提案3のタイトル}
　{提案3の説明。振り返りの内容を根拠として、「${currentMonth}は○○だったため、${nextMonth}はここを注力しましょう」という形式で具体的な理由を記載してください。}

【重要】
- **必ず3つの提案を生成してください。1つや2つでは不十分です。**
- 各提案の説明では、必ず「${currentMonth}は○○だったため」という根拠を示してください
- 「${nextMonth}はここを注力しましょう」というトーンで書いてください
- 振り返りの内容（数値、傾向、投稿タイプなど）を具体的に引用して根拠としてください
- データに基づいた具体的なアクションプランにしてください
- 各提案は必ず「タイトル」「説明（根拠付き）」「→ 具体的なアクション」の3要素を含めてください
- テンプレートのプレースホルダー（{提案1のタイトル}など）をそのまま出力せず、実際のデータに基づいて具体的な内容を書いてください
- **出力形式の「1.」「2.」「3.」の3つ全てを含めてください。**`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "あなたはInstagram運用の専門家です。振り返りの内容を根拠として、具体的なアクションプランを提供します。必ず3つの提案を生成してください。各提案には必ず「今月は○○だったため、来月はここを注力しましょう」という形式で根拠を含めてください。必ず指定された形式で出力してください。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        });

        const proposalText = completion.choices[0]?.message?.content || "";
        
        // 提案セクションをパース
        actionPlans = parseActionPlansFromText(proposalText);
        
        if (process.env.NODE_ENV === "development") {
          console.log("📋 生成された提案テキスト全体:", proposalText);
          console.log("📋 パースされたアクションプラン数:", actionPlans.length);
          if (actionPlans.length > 0) {
            console.log("📋 パースされたアクションプラン:", JSON.stringify(actionPlans, null, 2));
          }
        }
        
        // 3つ未満の場合は再試行またはフォールバック
        if (actionPlans.length < 3 && actionPlans.length > 0) {
          if (process.env.NODE_ENV === "development") {
            console.log("⚠️ アクションプランが3つ未満です。再生成を試みます...");
          }
        }
      } catch (aiError) {
        console.error("AI提案生成エラー:", aiError);
        // フォールバック（3つ生成）
        actionPlans = [
          {
            title: "投稿頻度の維持",
            description: `${getMonthName(date)}は${analyzedCount}件の分析済み投稿がありました。${nextMonth}は安定した投稿頻度を維持するため、ここを注力しましょう。`,
            action: "週間投稿スケジュールを設定する",
          },
          {
            title: "エンゲージメントの向上",
            description: `${getMonthName(date)}はいいね数${totalLikes.toLocaleString()}件、コメント数${totalComments.toLocaleString()}件でした。${nextMonth}はフォロワーとの関係を深めるため、ここを注力しましょう。`,
            action: "コメントへの返信を増やす",
          },
          {
            title: "投稿タイプの最適化",
            description: `${postTypeArray.length > 0 ? `${getMonthName(date)}は${postTypeArray[0].label}が${postTypeArray[0].percentage.toFixed(0)}％と最も多く閲覧されました。` : `${getMonthName(date)}のデータを分析した結果、`}${nextMonth}は効果的な投稿タイプを活用するため、ここを注力しましょう。`,
            action: `${postTypeArray.length > 0 ? `${postTypeArray[0].label}の投稿を継続する` : "投稿タイプのバランスを改善する"}`,
          },
        ];
      }
    }

    // 生成されたアクションプランをFirestoreに保存（monthly_reviewsに保存）
    if (actionPlans.length > 0) {
      try {
        const reviewDocRef = adminDb
          .collection("monthly_reviews")
          .doc(`${uid}_${date}`);
        
        await reviewDocRef.set({
          userId: uid,
          month: date,
          actionPlans,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      } catch (saveError) {
        console.error("アクションプラン保存エラー:", saveError);
        // 保存エラーは無視してレスポンスを返す
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        actionPlans,
        month: date,
        nextMonthName: getNextMonthName(date),
      },
    });
  } catch (error) {
    console.error("❌ 月次提案取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(
      {
        ...body,
        error: "月次提案の取得に失敗しました",
      },
      { status }
    );
  }
}

// テキストからアクションプランをパース
function parseActionPlansFromText(text: string): ActionPlan[] {
  const actionPlans: ActionPlan[] = [];
  
  if (!text) {
    if (process.env.NODE_ENV === "development") {
      console.log("⚠️ パース対象のテキストが空です");
    }
    return actionPlans;
  }
  
  // 「📈」で始まるセクションを探す
  const proposalSectionMatch = text.match(/📈[\s\S]*/);
  if (!proposalSectionMatch) {
    if (process.env.NODE_ENV === "development") {
      console.log("⚠️ 提案セクション（📈）が見つかりませんでした");
      console.log("📋 テキストの最初500文字:", text.substring(0, 500));
    }
    return actionPlans;
  }
  
  const proposalText = proposalSectionMatch[0];
  
  if (process.env.NODE_ENV === "development") {
    console.log("📋 提案セクションテキスト:", proposalText.substring(0, 500));
  }
  
  // 各提案を抽出（「1.」「2.」「3.」で始まる行）
  // より柔軟なパターンで抽出（タブや全角スペースも考慮）
  const proposalRegex = /(\d+)\.\s*([^\n]+)(?:\n\s*([^\n]+(?:\n\s*[^\n]+)*?))?(?=\n\s*\d+\.|$)/g;
  let proposalMatch;
  
  while ((proposalMatch = proposalRegex.exec(proposalText)) !== null) {
    const title = proposalMatch[2]?.trim() || "";
    const descriptionAndAction = (proposalMatch[3] || "").trim();
    
    if (!title) {
      continue;
    }
    
    // 「→」で区切って説明とアクションを分離
    const lines = descriptionAndAction.split(/\n/).map(line => line.trim()).filter(line => line);
    let description = "";
    let action = "";
    
    for (const line of lines) {
      // 「→」または全角「→」で始まる行をアクションとして扱う
      if (line.match(/^[→→]\s*/)) {
        action = line.replace(/^[→→]\s*/, "").trim();
      } else {
        description += (description ? " " : "") + line;
      }
    }
    
    actionPlans.push({
      title,
      description: description.trim(),
      action: action.trim(),
    });
  }
  
  if (process.env.NODE_ENV === "development") {
    console.log("📋 パース結果:", actionPlans.length, "件のアクションプランを抽出");
    if (actionPlans.length < 3) {
      console.log("⚠️ アクションプランが3つ未満です。正規表現を確認してください。");
    }
  }
  
  return actionPlans;
}
