import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";

// OpenAI APIの初期化
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

interface ChatRequest {
  message: string;
  context?: Record<string, unknown>;
  userId?: string;
  browserInfo?: {
    isSafari: boolean;
    isMobile: boolean;
    userAgent: string;
  };
}

interface InstagramData {
  planData?: Record<string, unknown> | null;
  analyticsData?: Record<string, unknown>[];
  postsData?: Record<string, unknown>[];
  goalSettings?: Record<string, unknown> | null;
  businessInfo?: Record<string, unknown> | null;
}

export async function POST(request: NextRequest) {
  try {
    const { uid: authenticatedUserId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "ai-chat-post", limit: 20, windowSeconds: 60 },
      auditEventName: "ai_chat_post",
    });

    if (!openai) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const body: ChatRequest = await request.json();
    const { message, userId, browserInfo } = body;

    // ブラウザ情報をログ出力
    if (browserInfo) {
      console.log("Browser info:", browserInfo);
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (userId && userId !== authenticatedUserId) {
      return NextResponse.json(
        { error: "User mismatch detected" },
        { status: 403 },
      );
    }

    const currentUserId = authenticatedUserId;

    // Instagram全体のデータを取得
    const instagramData = await fetchInstagramData(currentUserId);

    // Instagram専門のAIプロンプトを構築
    const systemPrompt = buildInstagramAIPrompt(instagramData);

    // OpenAI APIを呼び出し
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: message,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const aiResponse =
      completion.choices[0]?.message?.content || "申し訳ございません。回答を生成できませんでした。";

    // 使用回数を記録
    await recordUsage(currentUserId);

    // Safari/iOSでの互換性を考慮したレスポンス
    const response = {
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString(),
      browserCompatible: true,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("AI Chat API Error:", error);

    const { status, body } = buildErrorResponse(error);
    const errorResponse = {
      ...body,
      browserCompatible: true,
    };

    return NextResponse.json(errorResponse, {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  }
}

// Instagram全体のデータを取得する関数
async function fetchInstagramData(userId: string): Promise<InstagramData> {
  try {
    const [planSnapshot, analyticsSnapshot, postsSnapshot, goalSettingsSnapshot, userSnapshot] =
      await Promise.all([
        // 運用計画データ
        adminDb
          .collection("plans")
          .where("userId", "==", userId)
          .orderBy("createdAt", "desc")
          .limit(1)
          .get(),

        // 分析データ（最新10件）
        adminDb
          .collection("analytics")
          .where("userId", "==", userId)
          .orderBy("createdAt", "desc")
          .limit(10)
          .get(),

        // 投稿データ（最新10件）
        adminDb
          .collection("posts")
          .where("userId", "==", userId)
          .orderBy("createdAt", "desc")
          .limit(10)
          .get(),

        // 目標設定データ
        adminDb.collection("goalSettings").where("userId", "==", userId).limit(1).get(),

        // ユーザープロファイル（ビジネス情報）
        adminDb.collection("users").doc(userId).get(),
      ]);

    const planData = planSnapshot.docs[0]?.data() || null;
    const analyticsData = analyticsSnapshot.docs.map((doc) => doc.data());
    const postsData = postsSnapshot.docs.map((doc) => doc.data());
    const goalSettings = goalSettingsSnapshot.docs[0]?.data() || null;
    const businessInfo = userSnapshot.data()?.businessInfo || null;

    // 最近の活動データ（投稿と分析の統合）
    return {
      planData,
      analyticsData,
      postsData,
      goalSettings,
      businessInfo,
    };
  } catch (error) {
    console.error("Failed to fetch Instagram data:", error);
    return {};
  }
}

// Instagram専門のAIプロンプトを構築
function buildInstagramAIPrompt(instagramData: InstagramData): string {
  const { planData, analyticsData, postsData, goalSettings, businessInfo } = instagramData;

  let systemPrompt = `あなたはInstagram運用の専門AIアドバイザーです。ユーザーのInstagramアカウント全体を理解し、具体的で実践的なアドバイスを提供してください。

【御社専用AI設定】
${
  businessInfo
    ? `
- 業種: ${businessInfo.industry || "未設定"}
- 会社規模: ${businessInfo.companySize || "未設定"}
- 事業形態: ${businessInfo.businessType || "未設定"}
- ターゲット市場: ${Array.isArray(businessInfo.targetMarket) ? businessInfo.targetMarket.join("、") : businessInfo.targetMarket || "未設定"}
- キャッチコピー: ${businessInfo.catchphrase || "未設定"}
- 事業内容: ${businessInfo.description || "未設定"}
- 目標: ${Array.isArray(businessInfo.goals) ? businessInfo.goals.join("、") : ""}
- 課題: ${Array.isArray(businessInfo.challenges) ? businessInfo.challenges.join("、") : ""}
`
    : "ビジネス情報未設定"
}

【あなたの役割】
- Instagram運用の専門家として、ユーザーの状況を正確に把握し、最適なアドバイスを提供
- データに基づいた具体的な改善提案
- 実現可能で段階的なアクションプラン
- ポジティブで励ましになる回答

【現在のユーザー状況】`;

  // 運用計画データ
  if (planData) {
    systemPrompt += `

📋 【運用計画】
- 計画名: ${planData.title || "未設定"}
- 目標フォロワー数: ${planData.targetFollowers?.toLocaleString() || "未設定"}人
- 現在のフォロワー数: ${planData.currentFollowers?.toLocaleString() || "未設定"}人
- 計画期間: ${planData.planPeriod || "未設定"}
- ターゲットオーディエンス: ${planData.targetAudience || "未設定"}
- カテゴリ: ${planData.category || "未設定"}
- 戦略: ${Array.isArray(planData.strategies) ? planData.strategies.join(", ") : planData.strategies || "未設定"}`;

    if (planData.aiPersona) {
      const aiPersona = planData.aiPersona as Record<string, unknown>;
      systemPrompt += `
- AIペルソナ: ${aiPersona.tone || "未設定"}、${aiPersona.style || "未設定"}
- 興味分野: ${Array.isArray(aiPersona.interests) ? aiPersona.interests.join(", ") : aiPersona.interests || "未設定"}`;
    }

    if (planData.simulation) {
      const simulation = planData.simulation as Record<string, unknown>;
      const postTypes = simulation.postTypes as Record<string, Record<string, unknown>> | undefined;
      systemPrompt += `
- 投稿戦略: リール${(postTypes?.reel?.weeklyCount as number) || 0}回/週、フィード${(postTypes?.feed?.weeklyCount as number) || 0}回/週、ストーリー${(postTypes?.story?.weeklyCount as number) || 0}回/週`;
    }
  }

  // 目標設定データ
  if (goalSettings) {
    systemPrompt += `

🎯 【目標設定】
- 週間投稿目標: ${goalSettings.weeklyPostGoal || "未設定"}投稿
- フォロワー増加目標: ${goalSettings.followerGoal || "未設定"}人/月
- 月間投稿目標: ${goalSettings.monthlyPostGoal || "未設定"}投稿`;
  }

  // 最近の分析データ
  if (analyticsData && analyticsData.length > 0) {
    const recentAnalytics = analyticsData.slice(0, 3);
    systemPrompt += `

📊 【最近の分析データ】
${recentAnalytics
  .map(
    (analytics, index) => {
      const analyticsRecord = analytics as Record<string, unknown>;
      const engagementRate = typeof analyticsRecord.engagementRate === 'number' ? analyticsRecord.engagementRate : null;
      return `
${index + 1}. リーチ: ${analyticsRecord.reach || 0}、いいね: ${analyticsRecord.likes || 0}、コメント: ${analyticsRecord.comments || 0}
   エンゲージメント率: ${engagementRate ? engagementRate.toFixed(2) + "%" : "未計算"}`;
    }
  )
  .join("")}`;
  }

  // 最近の投稿データ
  if (postsData && postsData.length > 0) {
    const recentPosts = postsData.slice(0, 3);
    systemPrompt += `

📝 【最近の投稿】
${recentPosts
  .map(
    (post, index) => {
      const postRecord = post as Record<string, unknown>;
      const content = typeof postRecord.content === 'string' ? postRecord.content : '';
      const title = typeof postRecord.title === 'string' ? postRecord.title : '';
      const type = typeof postRecord.type === 'string' ? postRecord.type : "フィード";
      return `
${index + 1}. ${type}: ${title || (content ? content.substring(0, 50) : '') || "タイトルなし"}...`;
    }
  )
  .join("")}`;
  }

  systemPrompt += `

【回答のガイドライン】
1. 上記のデータを基に、具体的で実践的なアドバイスを提供
2. ユーザーの現在の状況と目標を考慮した改善提案
3. 段階的で実現可能なアクションプラン
4. ポジティブで励ましになるトーン
5. Instagram運用のベストプラクティスに基づいた提案
6. 必要に応じて具体的な数値目標や期限を提案

ユーザーの質問に対して、上記の情報を活用して専門的で実用的な回答を提供してください。`;

  return systemPrompt;
}

// 使用回数を記録
async function recordUsage(userId: string): Promise<void> {
  try {
    const today = new Date();
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const usageRef = adminDb.collection("aiChatUsage").doc(`${userId}-${monthKey}`);

    await adminDb.runTransaction(async (transaction) => {
      const usageDoc = await transaction.get(usageRef);

      if (!usageDoc.exists) {
        transaction.set(usageRef, {
          userId,
          month: monthKey,
          count: 1,
          lastUsed: today,
          createdAt: today,
        });
      } else {
        const currentCount = usageDoc.data()?.count || 0;
        transaction.update(usageRef, {
          count: currentCount + 1,
          lastUsed: today,
        });
      }
    });
  } catch (error) {
    console.error("Failed to record usage:", error);
  }
}
