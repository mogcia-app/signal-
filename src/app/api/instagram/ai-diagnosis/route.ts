import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildAnalysisPrompt } from "../../../../utils/aiPromptBuilder";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import { buildAIContext } from "@/lib/ai/context";
import type { AIContextBundle } from "@/lib/ai/context";
import type { AIGenerationResponse, AIReference } from "@/types/ai";

// OpenAI APIの初期化
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

export async function POST(request: NextRequest) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "instagram-ai-diagnosis", limit: 15, windowSeconds: 60 },
      auditEventName: "instagram_ai_diagnosis",
    });

    const _body = await request.json();

    // OpenAI APIキーのチェック
    if (!openai) {
      return NextResponse.json({ error: "OpenAI APIキーが設定されていません" }, { status: 500 });
    }

    const aiContext = await buildAIContext(userId, {
      snapshotLimit: 5,
      includeMasterContext: true,
    });
    const _userProfile = aiContext.userProfile ?? null;
    const _latestPlan = aiContext.latestPlan ?? null;

    // ✅ 最近の投稿データを取得（PDCA - Do）
    let recentPosts: Array<{
      title: string;
      content: string;
      hashtags: string[];
      createdAt: Date;
      isAIGenerated?: boolean;
    }> = [];
    try {
      const postsSnapshot = await adminDb
        .collection("posts")
        .where("userId", "==", userId)
        .where("platform", "==", "instagram")
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();

      recentPosts = postsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          title: data.title || "",
          content: data.content || "",
          hashtags: data.hashtags || [],
          createdAt: data.createdAt?.toDate?.() || new Date(),
          isAIGenerated: data.isAIGenerated || false,
        };
      });
      console.log(`✅ 投稿データ取得成功: ${recentPosts.length}件`);
    } catch (error) {
      console.warn("⚠️ 投稿データ取得エラー:", error);
    }

    // ✅ 分析データを取得（PDCA - Check）
    let analyticsData: Array<{
      reach: number;
      likes: number;
      comments: number;
      shares: number;
      publishedTime?: string;
    }> = [];
    try {
      const analyticsSnapshot = await adminDb
        .collection("analytics")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(30)
        .get();

      analyticsData = analyticsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          reach: data.reach || 0,
          likes: data.likes || 0,
          comments: data.comments || 0,
          shares: data.shares || 0,
          publishedTime: data.publishedTime || "",
        };
      });
      console.log(`✅ 分析データ取得成功: ${analyticsData.length}件`);
    } catch (error) {
      console.warn("⚠️ 分析データ取得エラー:", error);
    }

    // AI診断処理
    const diagnosisResult = await runAIDiagnosis({
      aiContext,
      recentPosts,
      analyticsData,
    });

    return NextResponse.json(diagnosisResult);
  } catch (error) {
    console.error("AI診断エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// AI診断処理ロジック（PDCA - Check）
async function runAIDiagnosis({
  aiContext,
  recentPosts,
  analyticsData,
}: {
  aiContext: AIContextBundle;
  recentPosts: Array<{
    title: string;
    content: string;
    hashtags: string[];
    createdAt: Date;
    isAIGenerated?: boolean;
  }>;
  analyticsData: Array<{
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    publishedTime?: string;
  }>;
}) {
  if (!openai) {
    throw new Error("OpenAI API not initialized");
  }

  const userProfile = aiContext.userProfile ?? null;
  const latestPlan = aiContext.latestPlan ?? null;
  const references: AIReference[] = [...aiContext.references];

  let systemPrompt: string;

  if (userProfile) {
    systemPrompt = buildAnalysisPrompt(userProfile, "instagram");

    if (latestPlan) {
      const planType = (latestPlan.planType as string) || "AI生成";
      const strategy = (latestPlan.generatedStrategy as string) || "";

      systemPrompt += `

【運用計画の参照（PDCA - Plan）】
- 計画タイプ: ${planType}
- 戦略の概要: ${strategy.substring(0, 300)}...

この運用計画に対する進捗と改善点を評価してください。`;
    }

    if (recentPosts.length > 0) {
      const aiGeneratedCount = recentPosts.filter((p) => p.isAIGenerated).length;
      systemPrompt += `

【投稿データの参照（PDCA - Do）】
- 総投稿数: ${recentPosts.length}件
- AI生成投稿: ${aiGeneratedCount}件
- 最近の投稿テーマ: ${recentPosts
        .slice(0, 5)
        .map((p) => p.title)
        .join(", ")}

投稿内容の質と運用計画との整合性を評価してください。`;
    }

    // 分析データの参照
    if (analyticsData.length > 0) {
      const totalReach = analyticsData.reduce((sum, a) => sum + a.reach, 0);
      const totalEngagement = analyticsData.reduce(
        (sum, a) => sum + a.likes + a.comments + a.shares,
        0
      );
      const avgEngagement =
        totalReach > 0 ? ((totalEngagement / totalReach) * 100).toFixed(2) : "0";

      systemPrompt += `

【分析データの参照（PDCA - Check）】
- データ期間: 過去${analyticsData.length}件
- 総リーチ: ${totalReach.toLocaleString()}
- 総エンゲージメント: ${totalEngagement.toLocaleString()}
- 平均エンゲージメント率: ${avgEngagement}%

パフォーマンスを評価し、改善提案を行ってください。`;
    }
  } else {
    // フォールバック
    systemPrompt = `あなたはInstagram運用の分析専門家です。現在の運用状況を分析し、具体的な改善提案を行ってください。`;
  }

  const userPrompt = `
上記のクライアント情報、運用計画、投稿データ、分析データを総合的に評価し、以下の形式で診断結果を提供してください：

## 📊 現状評価
- 運用計画の達成度
- 投稿の質と一貫性
- エンゲージメントの状況

## 💡 改善提案
1. すぐに実行できる改善策（3つ）
2. 中長期的な戦略改善（2つ）

## 🎯 次のアクション
- 優先的に取り組むべき項目
- 期待される効果

具体的で実行可能な提案を行ってください。`;

  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-4o-mini", // コスト削減のためgpt-4o-miniに変更
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const aiResponse = chatCompletion.choices[0].message.content || "";

  const generationReferences: AIReference[] = [...references];
  if (recentPosts.length > 0) {
    generationReferences.push({
      id: `recent-posts-${recentPosts.length}`,
      sourceType: "analytics",
      label: "最近の投稿",
      summary: `${recentPosts.length}件 / AI生成 ${recentPosts.filter((p) => p.isAIGenerated).length}件`,
    });
  }
  if (analyticsData.length > 0) {
    const totalReach = analyticsData.reduce((sum, a) => sum + a.reach, 0);
    generationReferences.push({
      id: `analytics-${analyticsData.length}`,
      sourceType: "analytics",
      label: "最新パフォーマンス",
      summary: `データ${analyticsData.length}件 / リーチ${totalReach.toLocaleString()}`,
    });
  }

  const generationPayload: AIGenerationResponse = {
    draft: {
      title: "AI診断レポート",
      body: aiResponse.trim(),
      hashtags: [],
    },
    insights: [],
    aiInsights: [],
    imageHints: [],
    references: generationReferences,
    metadata: {
      model: "gpt-4o-mini",
      generatedAt: new Date().toISOString(),
      promptVersion: "instagram-ai-diagnosis:v1",
    },
    rawText: aiResponse,
  };

  return {
    success: true,
    diagnosis: aiResponse,
    metadata: {
      postsAnalyzed: recentPosts.length,
      analyticsDataPoints: analyticsData.length,
      hasPlan: latestPlan ? true : false,
      timestamp: new Date().toISOString(),
    },
    generation: generationPayload,
  };
}
