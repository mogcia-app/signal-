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

// 月名を取得
function getMonthName(date: string): string {
  const [yearStr, monthStr] = date.split("-").map(Number);
  const dateObj = new Date(yearStr, monthStr - 1, 1);
  return dateObj.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
}

// 次月名を取得
function getNextMonthName(date: string): string {
  const [yearStr, monthStr] = date.split("-").map(Number);
  const nextMonth = new Date(yearStr, monthStr, 1);
  return nextMonth.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
}

// レビューテキストから提案セクションを抽出してパース
interface ActionPlan {
  title: string;
  description: string;
  action: string;
}

function extractActionPlansFromReview(reviewText: string, nextMonth: string): ActionPlan[] {
  const actionPlans: ActionPlan[] = [];
  
  if (!reviewText || !nextMonth) {
    return actionPlans;
  }
  
  // 「📈 ${nextMonth}に向けた提案」セクションを探す（より柔軟なパターン）
  const escapedMonth = nextMonth.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  
  // 複数のパターンを試す
  const patterns = [
    // パターン1: 「📈 ${nextMonth}に向けた提案」
    new RegExp(`📈\\s*${escapedMonth}に向けた提案[\\s\\S]*?(?=⸻|$)`, "i"),
    // パターン2: 「📈 向けた提案」（月名なし）
    /📈\s*[^\n]*向けた提案[\s\S]*?(?=⸻|$)/i,
    // パターン3: 「提案」セクション全体
    /📈[\s\S]*?提案[\s\S]*?(?=⸻|$)/i,
  ];
  
  let proposalText = "";
  for (const pattern of patterns) {
    const match = reviewText.match(pattern);
    if (match) {
      proposalText = match[0];
      if (process.env.NODE_ENV === "development") {
        console.log("✅ 提案セクションを発見:", proposalText.substring(0, 200));
      }
      break;
    }
  }
  
  if (!proposalText) {
    if (process.env.NODE_ENV === "development") {
      console.log("⚠️ 提案セクションが見つかりませんでした");
      console.log("📋 レビューテキストの最後500文字:", reviewText.slice(-500));
    }
    return actionPlans;
  }
  
  // 各提案を抽出（「1.」「2.」「3.」で始まる行）
  // タブや全角スペースも考慮
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
    console.log("📋 抽出されたアクションプラン:", actionPlans.length, "件");
  }
  
  return actionPlans;
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-monthly-review-simple", limit: 10, windowSeconds: 60 },
      auditEventName: "analytics_monthly_review_simple_access",
    });

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // YYYY-MM形式

    if (!date || !/^\d{4}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "date parameter is required (format: YYYY-MM)" },
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

    // 保存されたレビューを取得（存在する場合）
    const savedReviewDoc = await adminDb
      .collection("monthly_reviews")
      .doc(`${uid}_${date}`)
      .get();

    // 保存されたデータがある場合、それを返す（再生成フラグがない限り）
    const forceRegenerate = searchParams.get("regenerate") === "true";
    if (savedReviewDoc.exists && !forceRegenerate) {
      const savedData = savedReviewDoc.data();
      return NextResponse.json({
        success: true,
        data: {
          review: savedData?.review || "",
          actionPlans: savedData?.actionPlans || [],
          hasPlan: savedData?.hasPlan || false,
          analyzedCount: savedData?.analyzedCount || 0,
        },
      });
    }

    // 月の範囲を計算
    const { start, end } = getMonthRange(date);
    const startTimestamp = admin.firestore.Timestamp.fromDate(start);
    const endTimestamp = admin.firestore.Timestamp.fromDate(end);

    // 必要なデータを取得（並列）- analyticsコレクション（分析済みデータ）のみを使用
    const [analyticsSnapshot, plansSnapshot, userDoc] = await Promise.all([
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

      // ユーザー情報（ビジネス情報とAI設定を取得）
      adminDb.collection("users").doc(uid).get(),
    ]);

    const analyzedCount = analyticsSnapshot.docs.length;
    const hasPlan = !plansSnapshot.empty;

    // initialFollowersを取得（フォロワー数計算で使用）
    let initialFollowers = 0;
    if (userDoc.exists) {
      const userData = userDoc.data();
      initialFollowers = userData?.businessInfo?.initialFollowers || 0;
    }

    // 投稿と分析データをpostIdで紐付け
    const analyticsByPostId = new Map<string, any>();
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

    // KPIを集計（提供されている場合はそれを使用、そうでない場合は計算）
    let totalLikes = useProvidedKpis ? providedKpis.totalLikes! : 0;
    let totalReach = useProvidedKpis ? providedKpis.totalReach! : 0;
    let totalComments = useProvidedKpis ? providedKpis.totalComments! : 0;
    let totalSaves = useProvidedKpis ? providedKpis.totalSaves! : 0;
    let totalShares = 0; // シェア数は提供されていないので計算
    let totalFollowerIncrease = useProvidedKpis ? providedKpis.totalFollowerIncrease! : 0;
    let currentTotalFollowers = 0; // 現在のフォロワー数（表示用）

    if (!useProvidedKpis) {
      // KPIデータが提供されていない場合は計算
      analyticsByPostId.forEach((data) => {
        totalLikes += data.likes || 0;
        totalReach += data.reach || 0;
        totalComments += data.comments || 0;
        totalSaves += data.saves || 0;
        totalShares += data.shares || 0;
        totalFollowerIncrease += data.followerIncrease || 0;
      });

      // フォロワー増加数の計算（performance-scoreと同じロジック）
      // 1. analyticsのfollowerIncreaseの合計を計算（上記で既に計算済み）
      const followerIncreaseFromPosts = totalFollowerIncrease;

      // 2. 前月を計算
      const [yearStr, monthStr] = date.split("-").map(Number);
      const prevMonth = new Date(yearStr, monthStr - 2, 1);
      const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

      // 3. 当月と前月のデータを取得
      const [currentMonthSnapshot, prevMonthSnapshot] = await Promise.all([
        // 当月のデータ
        adminDb
          .collection("follower_counts")
          .where("userId", "==", uid)
          .where("snsType", "==", "instagram")
          .where("month", "==", date)
          .limit(1)
          .get(),
        // 前月のデータ
        adminDb
          .collection("follower_counts")
          .where("userId", "==", uid)
          .where("snsType", "==", "instagram")
          .where("month", "==", prevMonthStr)
          .limit(1)
          .get(),
      ]);

      // 4. homeで入力された値（その他からの増加数）を取得
      let followerIncreaseFromOther = 0;
      let currentFollowersFromHome = 0;
      if (!currentMonthSnapshot.empty) {
        const currentData = currentMonthSnapshot.docs[0].data();
        currentFollowersFromHome = currentData.followers || 0;
      }

      // 5. 前月のhomeで入力されたフォロワー数を取得
      let previousFollowersFromHome = 0;
      if (!prevMonthSnapshot.empty) {
        const prevData = prevMonthSnapshot.docs[0].data();
        previousFollowersFromHome = prevData.followers || 0;
      }

      // 6. 初回ログイン月の判定（前月のデータが存在しない場合）
      const isFirstMonth = prevMonthSnapshot.empty;

      // 7. その他からの増加数を計算
      if (isFirstMonth) {
        // 初回ログイン月：homeで入力された現在のフォロワー数
        followerIncreaseFromOther = currentFollowersFromHome;
      } else {
        // 2ヶ月目以降：homeで入力された現在のフォロワー数 - 前月のhomeで入力されたフォロワー数
        followerIncreaseFromOther = currentFollowersFromHome - previousFollowersFromHome;
      }

      // 8. 合計増加数の計算
      // 初回ログイン月：ツール利用開始時のフォロワー数 + 投稿からの増加数 + その他からの増加数
      // 2ヶ月目以降：投稿からの増加数 + その他からの増加数
      if (isFirstMonth && initialFollowers > 0) {
        totalFollowerIncrease = initialFollowers + followerIncreaseFromPosts + followerIncreaseFromOther;
      } else {
        totalFollowerIncrease = followerIncreaseFromPosts + followerIncreaseFromOther;
      }

      // 9. 現在のフォロワー数を計算（表示用）
      // homeで入力された現在のフォロワー数 + アナリティクスからの増加数
      // 初回ログイン月：initialFollowers + followerIncreaseFromPosts + currentFollowersFromHome
      // 2ヶ月目以降：initialFollowers + followerIncreaseFromPosts + (currentFollowersFromHome - previousFollowersFromHome)
      let currentTotalFollowers = 0;
      if (isFirstMonth && initialFollowers > 0) {
        currentTotalFollowers = initialFollowers + followerIncreaseFromPosts + currentFollowersFromHome;
      } else {
        // 2ヶ月目以降：initialFollowers + 投稿からの増加数 + (homeで入力された現在のフォロワー数 - 前月のhomeで入力されたフォロワー数)
        // つまり、initialFollowers + followerIncreaseFromPosts + followerIncreaseFromOther
        // でも、これはtotalFollowerIncreaseと同じなので、initialFollowers + totalFollowerIncreaseで計算
        currentTotalFollowers = initialFollowers + totalFollowerIncrease;
      }
      
      // ただし、homeで入力された現在のフォロワー数が直接利用可能な場合はそれを使用
      if (currentFollowersFromHome > 0) {
        // homeで入力された現在のフォロワー数は、既にinitialFollowers + 投稿からの増加数 + その他からの増加数を含んでいる可能性がある
        // より正確には、follower_counts.followersが現在のフォロワー数なので、それを使用
        if (isFirstMonth) {
          currentTotalFollowers = initialFollowers + followerIncreaseFromPosts + currentFollowersFromHome;
        } else {
          // 2ヶ月目以降：前月のフォロワー数 + 今月の増加数
          // 前月のフォロワー数 = initialFollowers + (前月までの投稿からの増加数 + 前月までのhomeで入力された増加数)
          // 今月の増加数 = followerIncreaseFromPosts + followerIncreaseFromOther
          // でも、これは複雑なので、homeで入力された現在のフォロワー数を使用
          // ただし、homeで入力された値が正確な現在のフォロワー数であることを前提とする
          currentTotalFollowers = currentFollowersFromHome + followerIncreaseFromPosts;
        }
      }
    } else {
      // KPIデータが提供されている場合でも、シェア数は計算が必要
      analyticsByPostId.forEach((data) => {
        totalShares += data.shares || 0;
      });
      
      // currentTotalFollowersを計算（useProvidedKpisがtrueの場合）
      // performance-scoreから渡されたtotalFollowerIncreaseを使用
      // 初回ログイン月かどうかを判定するために、前月のデータを確認
      const [yearStr, monthStr] = date.split("-").map(Number);
      const prevMonth = new Date(yearStr, monthStr - 2, 1);
      const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
      
      const prevMonthSnapshot = await adminDb
        .collection("follower_counts")
        .where("userId", "==", uid)
        .where("snsType", "==", "instagram")
        .where("month", "==", prevMonthStr)
        .limit(1)
        .get();
      
      const isFirstMonth = prevMonthSnapshot.empty;
      
      let currentTotalFollowers = 0;
      if (isFirstMonth && initialFollowers > 0) {
        // 初回ログイン月：totalFollowerIncreaseが既に現在のフォロワー数
        currentTotalFollowers = totalFollowerIncrease;
      } else {
        // 2ヶ月目以降：initialFollowers + totalFollowerIncrease
        currentTotalFollowers = initialFollowers + totalFollowerIncrease;
      }
    }

    // 投稿タイプ別の統計を計算（analyticsコレクションのデータのみを使用）
    const postTypeStats: Record<string, { count: number; totalReach: number; labels: string[] }> = {};
    const postReachMap = new Map<string, { reach: number; title: string; type: string }>();

    analyticsByPostId.forEach((analytics, postId) => {
      const postType = analytics.category || analytics.postType || "unknown";
      const postTitle = analytics.title || analytics.caption?.substring(0, 50) || "タイトルなし";
      const reach = analytics.reach || 0;

      if (!postTypeStats[postType]) {
        postTypeStats[postType] = { count: 0, totalReach: 0, labels: [] };
      }
      postTypeStats[postType].count++;
      postTypeStats[postType].totalReach += reach;
      if (postTitle && !postTypeStats[postType].labels.includes(postTitle)) {
        postTypeStats[postType].labels.push(postTitle);
      }

      postReachMap.set(postId, { reach, title: postTitle, type: postType });
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

    // 投稿タイプ別の統計を配列に変換（リーチ数でソート）
    const postTypeArray = Object.entries(postTypeStats)
      .map(([type, stats]) => ({
        type,
        label: typeLabelMap[type] || type,
        count: stats.count,
        totalReach: stats.totalReach,
        percentage: totalReach > 0 ? (stats.totalReach / totalReach) * 100 : 0,
      }))
      .sort((a, b) => b.totalReach - a.totalReach);

    // 最も閲覧された投稿を取得
    let topPost = null;
    if (postReachMap.size > 0) {
      const sortedPosts = Array.from(postReachMap.entries())
        .map(([postId, data]) => ({ postId, ...data }))
        .sort((a, b) => b.reach - a.reach);
      topPost = sortedPosts[0];
    }

    // 前月のデータを取得（前月比計算用）
    const prevMonth = new Date(start);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
    const { start: prevStart, end: prevEnd } = getMonthRange(prevMonthStr);
    const prevStartTimestamp = admin.firestore.Timestamp.fromDate(prevStart);
    const prevEndTimestamp = admin.firestore.Timestamp.fromDate(prevEnd);

    const [prevAnalyticsSnapshot, followerCountSnapshot] = await Promise.all([
      adminDb
        .collection("analytics")
        .where("userId", "==", uid)
        .where("publishedAt", ">=", prevStartTimestamp)
        .where("publishedAt", "<=", prevEndTimestamp)
        .get(),
      adminDb
        .collection("follower_counts")
        .where("userId", "==", uid)
        .where("snsType", "==", "instagram")
        .where("month", "==", date)
        .limit(1)
        .get(),
    ]);

    let prevTotalReach = 0;
    prevAnalyticsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      prevTotalReach += data.reach || 0;
    });

    const reachChange = prevTotalReach > 0 
      ? ((totalReach - prevTotalReach) / prevTotalReach) * 100 
      : 0;

    // フォロワー数を取得（follower_countsから、なければanalyticsから計算）
    let currentFollowers = 0;
    if (!followerCountSnapshot.empty) {
      const followerData = followerCountSnapshot.docs[0].data();
      currentFollowers = followerData.followers || followerData.startFollowers || 0;
    } else {
      // follower_countsがない場合、analyticsから最新のフォロワー数を取得
      // ただし、これは正確ではない可能性があるため、0の場合は表示しない
      const latestAnalytics = analyticsSnapshot.docs
        .map((doc) => {
          const data = doc.data();
          const publishedAt = data.publishedAt;
          return { publishedAt, followers: data.followers || 0 };
        })
        .filter((item) => item.followers > 0)
        .sort((a, b) => {
          if (!a.publishedAt || !b.publishedAt) return 0;
          const aTime = a.publishedAt instanceof admin.firestore.Timestamp
            ? a.publishedAt.toMillis()
            : a.publishedAt.getTime?.() || 0;
          const bTime = b.publishedAt instanceof admin.firestore.Timestamp
            ? b.publishedAt.toMillis()
            : b.publishedAt.getTime?.() || 0;
          return bTime - aTime;
        });
      if (latestAnalytics.length > 0) {
        currentFollowers = latestAnalytics[0].followers;
      }
    }

    // 運用計画の情報を取得
    let planInfo = null;
    if (hasPlan) {
      const planDoc = plansSnapshot.docs[0];
      const planData = planDoc.data();
      planInfo = {
        title: planData.title || "運用計画",
        targetFollowers: planData.targetFollowers || 0,
        currentFollowers: planData.currentFollowers || 0,
        strategies: Array.isArray(planData.strategies) ? planData.strategies : [],
        postCategories: Array.isArray(planData.postCategories) ? planData.postCategories : [],
      };
    }

    // 投稿タイプ別の情報を文字列化（AI生成とフォールバックの両方で使用）
    const postTypeInfo = postTypeArray.length > 0
      ? postTypeArray
          .map((stat, index) => {
            const order = index === 0 ? "最も多く" : index === 1 ? "次いで" : "最後に";
            return `${order}${stat.label}が${stat.count}件（全体の${stat.percentage.toFixed(0)}％）`;
          })
          .join("、")
      : "投稿タイプのデータがありません";

    const topPostInfo = topPost
      ? `「${topPost.title}」投稿で、${topPost.reach.toLocaleString()}回閲覧`
      : "データがありません";

    const reachChangeText = prevTotalReach > 0
      ? `（前月比${reachChange >= 0 ? "+" : ""}${reachChange.toFixed(1)}％）`
      : "";

    // ユーザーのビジネス情報とAI設定を取得
    let businessInfoText = "";
    let aiSettingsText = "";
    if (userDoc.exists) {
      const userData = userDoc.data();
      const businessInfo = userData?.businessInfo || {};
      const snsAISettings = userData?.snsAISettings?.instagram || {};

      // ビジネス情報を構築
      const businessInfoParts: string[] = [];
      if (businessInfo.industry) businessInfoParts.push(`業種: ${businessInfo.industry}`);
      if (businessInfo.companySize) businessInfoParts.push(`会社規模: ${businessInfo.companySize}`);
      if (businessInfo.businessType) businessInfoParts.push(`事業形態: ${businessInfo.businessType}`);
      if (businessInfo.description) businessInfoParts.push(`事業内容: ${businessInfo.description}`);
      if (businessInfo.catchphrase) businessInfoParts.push(`キャッチコピー: ${businessInfo.catchphrase}`);
      if (Array.isArray(businessInfo.targetMarket) && businessInfo.targetMarket.length > 0) {
        businessInfoParts.push(`ターゲット市場: ${businessInfo.targetMarket.join("、")}`);
      }
      if (Array.isArray(businessInfo.productsOrServices) && businessInfo.productsOrServices.length > 0) {
        const productsText = businessInfo.productsOrServices
          .map((p: { name?: string; details?: string }) => {
            if (p.details) {
              return `${p.name}（${p.details}）`;
            }
            return p.name;
          })
          .filter(Boolean)
          .join("、");
        if (productsText) businessInfoParts.push(`商品・サービス: ${productsText}`);
      }
      if (Array.isArray(businessInfo.goals) && businessInfo.goals.length > 0) {
        businessInfoParts.push(`目標: ${businessInfo.goals.join("、")}`);
      }
      if (Array.isArray(businessInfo.challenges) && businessInfo.challenges.length > 0) {
        businessInfoParts.push(`課題: ${businessInfo.challenges.join("、")}`);
      }

      if (businessInfoParts.length > 0) {
        businessInfoText = `\n【ビジネス情報】\n${businessInfoParts.join("\n")}`;
      }

      // AI設定を構築
      const aiSettingsParts: string[] = [];
      if (snsAISettings.tone) aiSettingsParts.push(`トーン: ${snsAISettings.tone}`);
      if (snsAISettings.manner) aiSettingsParts.push(`マナー・ルール: ${snsAISettings.manner}`);
      if (snsAISettings.goals) aiSettingsParts.push(`Instagram運用の目標: ${snsAISettings.goals}`);
      if (snsAISettings.motivation) aiSettingsParts.push(`運用動機: ${snsAISettings.motivation}`);
      if (snsAISettings.additionalInfo) aiSettingsParts.push(`その他参考情報: ${snsAISettings.additionalInfo}`);

      if (aiSettingsParts.length > 0) {
        aiSettingsText = `\n【Instagram AI設定】\n${aiSettingsParts.join("\n")}`;
      }
    }

    // AI生成（シンプルなプロンプト）
    let reviewText = "";
    if (openai && analyzedCount > 0) {
      try {
        const currentMonth = getMonthName(date);
        const nextMonth = getNextMonthName(date);

        const prompt = `以下のInstagram運用データを基に、${currentMonth}の振り返りを以下の形式で出力してください。

【データ】
- 分析済み投稿数: ${analyzedCount}件
- いいね数: ${totalLikes.toLocaleString()}
- リーチ数: ${totalReach.toLocaleString()}${reachChangeText}
- コメント数: ${totalComments.toLocaleString()}
- 保存数: ${totalSaves.toLocaleString()}
- シェア数: ${totalShares.toLocaleString()}
${hasPlan ? `- 運用計画: ${planInfo?.title || "あり"}` : "- 運用計画: 未設定"}
${businessInfoText}
${aiSettingsText}

【投稿タイプ別の統計】
${postTypeInfo}

【最も閲覧された投稿】
${topPostInfo}

【出力形式】
必ず以下の4つのセクションを全て含めてください。最後の「📈 ${nextMonth}に向けた提案」セクションは必須です。

📊 Instagram運用レポート（${currentMonth}総括）

⸻

🔹 アカウント全体の動き
	•	閲覧数：${totalReach.toLocaleString()}人${reachChangeText}
	•	いいね数：${totalLikes.toLocaleString()}
	•	コメント数：${totalComments.toLocaleString()}
	•	保存数：${totalSaves.toLocaleString()}

{全体的な評価コメント（2-3文）。以下の点を含めてください：
- リーチ数やいいね数の具体的な数値とその意味
- 前月比がある場合は、その変化率と評価（増加している場合は「前月比で○％増加し、順調に成長しています」など）
- 保存数やコメント数が0でない場合は、それらも言及
- 数値だけを羅列するのではなく、自然な文章で説明してください
}

⸻

🔹 コンテンツ別の傾向
	•	${postTypeInfo}。
	•	もっとも閲覧されたコンテンツは${topPostInfo}。
{傾向の説明（1-2文）。以下の点を含めてください：
- どの投稿タイプが最も効果的だったか、その理由
- 投稿タイプ別のバランスや改善の余地
- 自然な文章で、数値だけを羅列しないでください
- 最も閲覧された投稿の詳細は上記の箇条書きで既に記載しているので、ここでは重複せず、投稿タイプ全体の傾向に焦点を当ててください}

⸻

💡 総評

${currentMonth}は全体的に{評価（好調/順調/改善の余地ありなど）}で、
特に{強調ポイント（具体的な数値や投稿タイプなど）}が目立つ結果でした。
また、{具体的な傾向（投稿タイプ別の特徴や、エンゲージメントの特徴など）}が高い反応を得ており、
アカウントの方向性がしっかり定まりつつあります。

{注意：
- 上記のテンプレートをそのまま出力せず、データに基づいて自然な文章で総評を書いてください
- 数値や具体的な事実を含めながら、読みやすい文章にしてください
- 「コンテンツ別の傾向」セクションで既に言及した投稿名や詳細は重複させないでください
- 総評では、全体の評価や今後の展望に焦点を当ててください}

⸻

📈 ${nextMonth}に向けた提案
	1.	{提案1のタイトル}
　{提案1の説明。データに基づいた具体的な理由を記載してください。}
　→ {具体的なアクション}
	2.	{提案2のタイトル}
　{提案2の説明。データに基づいた具体的な理由を記載してください。}
	3.	{提案3のタイトル}
　{提案3の説明。データに基づいた具体的な理由を記載してください。}

{注意：
- 各セクションで既に言及した内容（投稿名、投稿タイプの詳細など）は重複させないでください
- 提案は、これまでの分析を踏まえた具体的なアクションプランにしてください
- 同じ投稿名や数値を繰り返し言及しないでください
- 「来月はこうしようね」という親しみやすいトーンで書いてください
- **この「📈 ${nextMonth}に向けた提案」セクションは必須です。必ず含めてください。**
- **重要：提案は必ず「ビジネス情報」と「Instagram AI設定」を参照してください。業種、商品・サービス、ターゲット市場、目標、課題、キャッチコピーなどの具体的な情報を活用して、そのビジネスに特化した提案をしてください。凡庸な例（「役立つ情報や美しい風景」など）ではなく、そのビジネスの具体的な商品・サービス名や業種に基づいた提案をしてください。**


【重要】
- データが0の場合は0と記載し、「データ未取得」とは書かないでください
- 実績データに基づいて正確な数値を記載してください
- 投稿タイプ別の統計や最も閲覧された投稿の情報を必ず反映してください
- 前月比がある場合は、その変化を評価コメントに含めてください
- 提案はデータに基づいた具体的な内容にしてください
- 数値だけを羅列するのではなく、自然で読みやすい日本語の文章で説明してください
- テンプレートの{評価}や{強調ポイント}などのプレースホルダーをそのまま出力せず、実際のデータに基づいて具体的な内容を書いてください
- 文章は簡潔で分かりやすく、専門用語を使いすぎないでください
- **重複を避ける：同じ投稿名、同じ数値、同じ情報を複数のセクションで繰り返し言及しないでください。各セクションで異なる視点や情報を提供してください**
- 「コンテンツ別の傾向」で最も閲覧された投稿を紹介したら、「総評」では別の視点（全体の評価、今後の展望など）に焦点を当ててください
- **重要：必ず「📈 ${nextMonth}に向けた提案」セクションを含めてください。このセクションは必須です。**
- **最重要：提案セクションでは、必ず「ビジネス情報」と「Instagram AI設定」を参照してください。業種、商品・サービス、ターゲット市場、目標、課題、キャッチコピーなどの具体的な情報を活用し、そのビジネスに特化した提案をしてください。凡庸な例（「役立つ情報や美しい風景」など）ではなく、そのビジネスの具体的な商品・サービス名や業種に基づいた提案をしてください。例えば、美容・健康業種なら「カット」「カラー」などの具体的なサービス名を、飲食業種なら「ランチセット」「ディナーコース」などの具体的なメニュー名を使用してください。**`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "あなたはInstagram運用の専門家です。データに基づいて自然で読みやすい日本語で振り返りを提供します。数値だけを羅列するのではなく、具体的な数値とその意味を自然な文章で説明してください。テンプレートのプレースホルダー（{評価}など）をそのまま出力せず、実際のデータに基づいて具体的な内容を書いてください。必ず「📈 ${nextMonth}に向けた提案」セクションを含めてください。このセクションは必須です。提案は必ず「ビジネス情報」と「Instagram AI設定」を参照し、そのビジネスに特化した提案をしてください。凡庸な例ではなく、具体的な商品・サービス名や業種に基づいた提案をしてください。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        });

        reviewText = completion.choices[0]?.message?.content || "";
        
        // デバッグ: 生成されたテキストを確認
        if (process.env.NODE_ENV === "development") {
          console.log("📋 AI生成テキストの長さ:", reviewText.length);
          console.log("📋 AI生成テキストの最後1000文字:", reviewText.slice(-1000));
          const hasProposal = reviewText.includes("📈") || reviewText.includes("提案");
          console.log("📋 提案セクションが含まれているか:", hasProposal);
          
          // 提案セクションが含まれていない場合、別途生成を試みる
          if (!hasProposal) {
            console.log("⚠️ 提案セクションが生成されていません。別途生成を試みます...");
          }
        }
        
        // 提案セクションが含まれていない場合、別途生成
        if (!reviewText.includes("📈") && !reviewText.includes("提案")) {
          try {
            const proposalPrompt = `以下のInstagram運用データを基に、${getNextMonthName(date)}に向けた具体的なアクションプランを3つ生成してください。

【データ】
- 分析済み投稿数: ${analyzedCount}件
- いいね数: ${totalLikes.toLocaleString()}
- リーチ数: ${totalReach.toLocaleString()}${prevTotalReach > 0 ? `（前月比${reachChange >= 0 ? "+" : ""}${reachChange.toFixed(1)}％）` : ""}
- コメント数: ${totalComments.toLocaleString()}
- 保存数: ${totalSaves.toLocaleString()}
${businessInfoText}
${aiSettingsText}

【投稿タイプ別の統計】
${postTypeArray.length > 0
  ? postTypeArray
      .map((stat) => `${stat.label}: ${stat.count}件（${stat.percentage.toFixed(0)}％）`)
      .join("、")
  : "データがありません"}

【出力形式】
📈 ${getNextMonthName(date)}に向けた提案
	1.	{提案1のタイトル}
　{提案1の説明。データに基づいた具体的な理由を記載してください。}
　→ {具体的なアクション}
	2.	{提案2のタイトル}
　{提案2の説明。データに基づいた具体的な理由を記載してください。}
	3.	{提案3のタイトル}
　{提案3の説明。データに基づいた具体的な理由を記載してください。}

「来月はこうしようね」という親しみやすいトーンで書いてください。`;

            const proposalCompletion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: "あなたはInstagram運用の専門家です。データに基づいて具体的なアクションプランを提供します。必ず「ビジネス情報」と「Instagram AI設定」を参照し、そのビジネスに特化した提案をしてください。凡庸な例ではなく、具体的な商品・サービス名や業種に基づいた提案をしてください。",
                },
                {
                  role: "user",
                  content: proposalPrompt,
                },
              ],
              temperature: 0.7,
              max_tokens: 800,
            });

            const proposalText = proposalCompletion.choices[0]?.message?.content || "";
            if (proposalText) {
              reviewText += "\n\n⸻\n\n" + proposalText;
              if (process.env.NODE_ENV === "development") {
                console.log("✅ 提案セクションを別途生成しました");
              }
            }
          } catch (proposalError) {
            console.error("提案セクション生成エラー:", proposalError);
          }
        }
      } catch (aiError) {
        console.error("AI生成エラー:", aiError);
        // AI生成に失敗した場合はフォールバック
        reviewText = `📊 Instagram運用レポート（${getMonthName(date)}総括）

⸻

🔹 アカウント全体の動き
	•	閲覧数：${totalReach.toLocaleString()}人${reachChangeText}
	•	いいね数：${totalLikes.toLocaleString()}
	•	コメント数：${totalComments.toLocaleString()}
	•	保存数：${totalSaves.toLocaleString()}

${analyzedCount > 0 
  ? `${totalReach > 0 
    ? `リーチ数${totalReach.toLocaleString()}人、いいね数${totalLikes.toLocaleString()}件を達成しました。${reachChangeText ? `前月比で${reachChange >= 0 ? "増加" : "減少"}しており、${reachChange >= 0 ? "順調に成長" : "改善の余地"}が見られます。` : ""}${totalSaves > 0 ? `保存数${totalSaves.toLocaleString()}件も獲得しており、` : ""}${totalComments > 0 ? `コメント${totalComments.toLocaleString()}件もあり、` : ""}エンゲージメントが良好です。` 
    : "投稿データを蓄積中です。"}` 
  : "投稿データがまだありません。"}

⸻

🔹 コンテンツ別の傾向
	•	${postTypeInfo}。
	•	もっとも閲覧されたコンテンツは${topPostInfo}。

${postTypeArray.length > 0 
  ? `${postTypeArray[0].label}が${postTypeArray[0].percentage.toFixed(0)}％と最も多く閲覧されており、${postTypeArray.length > 1 ? `次いで${postTypeArray[1].label}が${postTypeArray[1].percentage.toFixed(0)}％となっています。` : ""}${topPost ? `特に「${topPost.title}」は${topPost.reach.toLocaleString()}回の閲覧を獲得し、高い反応を得ています。` : "継続的な投稿が効果を発揮しています。"}` 
  : "投稿タイプの分析を継続しましょう。"}

⸻

💡 総評

${getMonthName(date)}は${totalReach > 0 
  ? `リーチ数${totalReach.toLocaleString()}人、いいね数${totalLikes.toLocaleString()}件を達成し、${reachChange >= 0 ? "順調に成長" : "改善の余地"}が見られます。` 
  : "データ蓄積の段階です。"}${postTypeArray.length > 0 ? `${postTypeArray[0].label}が中心となっており、` : ""}${topPost ? `「${topPost.title}」のような` : ""}反応の良いコンテンツが効果を発揮しています。継続的な投稿と分析により、アカウントの成長を目指しましょう。`;
      }
    } else {
      // データがない場合のフォールバック
      reviewText = `📊 Instagram運用レポート（${getMonthName(date)}総括）

⸻

💡 総評

${getMonthName(date)}のデータがまだありません。投稿を開始してデータを蓄積しましょう。`;
    }

    // 提案セクションを抽出してパース
    const nextMonth = getNextMonthName(date);
    const actionPlans = extractActionPlansFromReview(reviewText, nextMonth);
    
    // デバッグログ（開発環境のみ）
    if (process.env.NODE_ENV === "development") {
      console.log("📋 レビューテキスト全体の長さ:", reviewText.length);
      console.log("📋 レビューテキストの最後500文字:", reviewText.slice(-500));
      console.log("📋 次月名:", nextMonth);
      console.log("📋 抽出されたアクションプラン数:", actionPlans.length);
      if (actionPlans.length > 0) {
        console.log("📋 アクションプラン:", JSON.stringify(actionPlans, null, 2));
      } else {
        // 提案セクションが含まれているか確認
        const hasProposalSection = reviewText.includes("📈") || reviewText.includes("提案");
        console.log("📋 提案セクションのキーワードが含まれているか:", hasProposalSection);
        if (hasProposalSection) {
          console.log("📋 提案セクションを含む部分:", reviewText.match(/📈[\s\S]{0,500}/)?.[0]);
        }
      }
    }

    // 生成されたレビューをFirestoreに保存
    if (reviewText) {
      try {
        const reviewDocRef = adminDb
          .collection("monthly_reviews")
          .doc(`${uid}_${date}`);
        
        await reviewDocRef.set({
          userId: uid,
          month: date,
          review: reviewText,
          actionPlans,
          hasPlan,
          analyzedCount,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      } catch (saveError) {
        console.error("レビュー保存エラー:", saveError);
        // 保存エラーは無視してレスポンスを返す
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        review: reviewText,
        actionPlans,
        hasPlan,
        analyzedCount,
      },
    });
  } catch (error) {
    console.error("❌ 月次振り返り取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(
      {
        ...body,
        error: "月次振り返りの取得に失敗しました",
      },
      { status }
    );
  }
}

