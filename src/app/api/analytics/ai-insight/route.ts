import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import * as admin from "firebase-admin";

import { getAdminDb } from "../../../../lib/firebase-admin";
import { requireAuthContext } from "../../../../lib/server/auth-context";

interface InsightRequestBody {
  userId: string;
  metrics?: {
    totals: Record<string, number>;
    averages: Record<string, number>;
    commentThreads: Array<{ comment: string; reply: string; relatedPostTitle?: string }>;
    recentPosts: Array<{
      postId?: string;
      title: string;
      content?: string;
      hashtags?: string[];
      likes?: number;
      comments?: number;
      shares?: number;
      saves?: number;
      reach?: number;
      engagementRate?: number | null;
      publishedAt?: string;
      publishedTime?: string;
      weekday?: string;
    }>;
    postCount: number;
    feedbackEntries: Array<{
      sentiment: "satisfied" | "dissatisfied";
      sentimentLabel: string;
      memo: string;
      relatedPostTitle: string;
      publishedAt?: string;
      publishedTime?: string;
      weekday?: string;
    }>;
    feedbackStats: {
      total: number;
      satisfied: number;
      dissatisfied: number;
    };
  };
  masterContext?: MasterContextSummary | null;
  targetCategory?: "feed" | "reel" | "story" | string;
}

type MasterContextSummary = {
  learningPhase?: string | null;
  ragHitRate?: number | null;
  totalInteractions?: number | null;
  feedbackStats?: Record<string, unknown> | null;
  actionStats?: Record<string, unknown> | null;
  pdcaMetrics?: Record<string, unknown> | null;
  personalizedInsights?: Array<Record<string, unknown>> | null;
  recommendations?: Array<Record<string, unknown>> | null;
  postPatterns?: {
    summaries?: Record<string, unknown>;
    topHashtags?: Record<string, number>;
    signals?: Array<Record<string, unknown>>;
  } | null;
  timeline?: Array<Record<string, unknown>> | null;
  weeklyTimeline?: Array<Record<string, unknown>> | null;
  achievements?: Array<Record<string, unknown>> | null;
};

type MetricsPayload = NonNullable<InsightRequestBody["metrics"]>;

async function savePostSummaries(params: {
  userId: string;
  targetCategory: InsightRequestBody["targetCategory"];
  recentPosts: MetricsPayload["recentPosts"];
  summary: AiInsightResult;
  metricsSnapshot: {
    totals: MetricsPayload["totals"];
    averages: MetricsPayload["averages"];
    feedbackStats: MetricsPayload["feedbackStats"];
    postCount: MetricsPayload["postCount"];
  };
}) {
  const { userId, targetCategory, recentPosts, summary, metricsSnapshot } = params;
  if (!recentPosts?.length) {
    return;
  }

  const postsWithId = recentPosts.filter((post) => post.postId);
  if (!postsWithId.length) {
    return;
  }

  const db = getAdminDb();
  const batch = db.batch();
  const generatedAt = new Date().toISOString();
  const timestamp = admin.firestore.FieldValue.serverTimestamp();

  postsWithId.forEach((post) => {
    const docRef = db.collection("ai_post_summaries").doc(`${userId}_${post.postId}`);
    batch.set(
      docRef,
      {
        userId,
        postId: post.postId,
        category: targetCategory ?? "feed",
        postTitle: post.title ?? "",
        postPublishedAt: post.publishedAt ?? null,
        summary: summary.summary,
        insights: summary.insights,
        recommendedActions: summary.recommendedActions,
        generatedAt,
        postHashtags: post.hashtags ?? [],
        metricsSnapshot,
        updatedAt: timestamp,
      },
      { merge: true },
    );
  });

  await batch.commit();
}

const buildPrompt = (
  body: InsightRequestBody["metrics"],
  masterContext?: MasterContextSummary | null,
  targetCategory: InsightRequestBody["targetCategory"] = "feed",
) => {
  if (!body) {
    return "";
  }

  const { totals, averages, commentThreads, recentPosts, postCount, feedbackEntries, feedbackStats } =
    body;
  const summary = {
    postCount,
    totals,
    averages,
    recentPosts,
    commentThreads: commentThreads.slice(0, 10),
    feedbackStats,
    feedbackEntries: feedbackEntries.slice(0, 15),
    masterContext,
  };

  const categoryLabel =
    targetCategory === "reel"
      ? "Instagramリール分析"
      : targetCategory === "story"
        ? "Instagramストーリーズ分析"
        : "Instagramフィード分析";

  const focusNotes =
    targetCategory === "reel"
      ? "リール固有の指標（再生時間、スキップ率、再視聴、再生完了率など）や、ショート動画ならではの視聴動線にも注意を向けてください。"
      : targetCategory === "story"
        ? "ストーリーズ固有の指標（完読率、離脱ポイント、反応スタンプなど）にも言及してください。"
        : "フィード投稿の定量指標に加えて、投稿タイプやハッシュタグの傾向に着目してください。";

  return `あなたは${categoryLabel}に精通したマーケターAIです。以下の構造化データを読み取り、次の内容を日本語で出力してください。
1. 全体像を二文以内でまとめた簡潔なサマリー
2. 目立った強みやリスクを最大3つまで、箇条書きで「ハイライト」として提示
3. 改善や次の一手に繋がる具体的なアクション提案を最大3つまで、箇条書きで提示

${focusNotes}

また、定量データに加えて、満足度フィードバックのメモやコメント／返信内容、学習ダッシュボードのマスターコンテキスト（成功パターンや蓄積された洞察）を必ず読み込み、ユーザーの生声と長期傾向から気づきを深掘りしてください。

出力は次のJSON形式にしてください:
{ "summary": string, "insights": string[], "recommendedActions": string[] }

解析対象データ:
  ${JSON.stringify(summary, null, 2)}`;
};

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

export async function POST(request: NextRequest) {
  const auth = await requireAuthContext(request);
  const body = (await request.json().catch(() => null)) as InsightRequestBody | null;

  if (!body) {
    return NextResponse.json({ success: false, error: "リクエストボディが不正です" }, { status: 400 });
  }

  if (body.userId !== auth.uid) {
    return NextResponse.json({ success: false, error: "権限がありません" }, { status: 403 });
  }

  if (!body.metrics) {
    return NextResponse.json(
      { success: false, error: "分析するデータがありません" },
      { status: 400 },
    );
  }

  const prompt = buildPrompt(body.metrics, body.masterContext, body.targetCategory);

  if (!prompt) {
    return NextResponse.json(
      { success: false, error: "分析するデータが不足しています" },
      { status: 400 },
    );
  }

  try {
    if (!openai) {
      throw new Error("OpenAI API key not configured");
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an experienced Instagram growth consultant responding with concise Japanese text.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const outputText = response.choices[0]?.message?.content;
    const parsed = outputText ? (JSON.parse(outputText) as AiInsightResult) : null;

    if (!parsed) {
      throw new Error("AIレスポンスの解析に失敗しました");
    }

    try {
      await savePostSummaries({
        userId: body.userId,
        targetCategory: body.targetCategory ?? "feed",
        recentPosts: body.metrics.recentPosts ?? [],
        summary: parsed,
        metricsSnapshot: {
          totals: body.metrics.totals,
          averages: body.metrics.averages,
          feedbackStats: body.metrics.feedbackStats,
          postCount: body.metrics.postCount,
        },
      });
    } catch (storeError) {
      console.error("[AI_INSIGHT] Failed to persist post summaries:", storeError);
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("[AI_INSIGHT] OpenAI error:", error);

    const fallback: AiInsightResult = {
      summary:
        "投稿データが少ないため詳細なAI分析はできませんが、投稿頻度を保ちつつコメント内容を会話のヒントとして活用しましょう。",
      insights: [
        "投稿データとコメントログの蓄積がまだ少ない傾向です。",
        "ユーザーからのコメント内容を確認し、次回投稿の改善に活かしましょう。",
      ],
      recommendedActions: [
        "投稿ごとにユーザー反応を記録し、コメントに素早く返信してください。",
        "エンゲージメントが高かった投稿の構成やハッシュタグを再利用してみましょう。",
      ],
    };

    return NextResponse.json({
      success: true,
      data: fallback,
      warning: "AI分析で問題が発生したためフォールバックを返しています",
    });
  }
}
interface AiInsightResult {
  summary: string;
  insights: string[];
  recommendedActions: string[];
}

