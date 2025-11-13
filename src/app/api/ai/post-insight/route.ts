import { NextRequest, NextResponse } from "next/server";
import { getMasterContext } from "../monthly-analysis/route";
import type { PostLearningSignal } from "../monthly-analysis/route";

interface PostInsightRequest {
  userId?: string;
  postId?: string;
  forceRefresh?: boolean;
}

async function callOpenAIForPostInsight(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content: `あなたはInstagram運用のエキスパートアナリストです。投稿データを基に、強み・改善点・次のアクションを簡潔に提案してください。出力はJSONのみ。`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PostInsightRequest;
    const { userId, postId, forceRefresh } = body;

    if (!userId || !postId) {
      return NextResponse.json(
        { success: false, error: "userId と postId は必須です" },
        { status: 400 }
      );
    }

    const masterContext = await getMasterContext(userId, { forceRefresh });

    if (!masterContext?.postPatterns?.signals?.length) {
      return NextResponse.json(
        { success: false, error: "投稿分析データがまだ生成されていません" },
        { status: 404 }
      );
    }

    const rawSignal = masterContext.postPatterns.signals.find((item) => item.postId === postId);

    if (!rawSignal) {
      return NextResponse.json(
        { success: false, error: "対象の投稿分析データが見つかりません" },
        { status: 404 }
      );
    }

    const signal = rawSignal as Partial<PostLearningSignal>;

    const metrics: PostLearningSignal["metrics"] = signal.metrics
      ? {
          reach: signal.metrics.reach ?? 0,
          saves: signal.metrics.saves ?? 0,
          likes: signal.metrics.likes ?? 0,
          comments: signal.metrics.comments ?? 0,
          shares: signal.metrics.shares ?? 0,
          savesRate: signal.metrics.savesRate ?? 0,
          commentsRate: signal.metrics.commentsRate ?? 0,
          likesRate: signal.metrics.likesRate ?? 0,
          reachToFollowerRatio: signal.metrics.reachToFollowerRatio ?? 0,
          velocityScore: signal.metrics.velocityScore ?? 0,
          totalEngagement: signal.metrics.totalEngagement ?? 0,
          earlyEngagement: signal.metrics.earlyEngagement ?? null,
          watchTimeSeconds: signal.metrics.watchTimeSeconds ?? null,
          linkClicks: signal.metrics.linkClicks ?? null,
          impressions: signal.metrics.impressions ?? null,
        }
      : {
          reach: signal.reach ?? 0,
          saves: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          savesRate: 0,
          commentsRate: 0,
          likesRate: 0,
          reachToFollowerRatio: 0,
          velocityScore: 0,
          totalEngagement: signal.engagementRate ?? 0,
          earlyEngagement: null,
          watchTimeSeconds: null,
          linkClicks: null,
          impressions: null,
        };

    const comparisons: PostLearningSignal["comparisons"] = signal.comparisons
      ? {
          reachDiff: signal.comparisons.reachDiff ?? 0,
          engagementRateDiff: signal.comparisons.engagementRateDiff ?? 0,
          savesRateDiff: signal.comparisons.savesRateDiff ?? 0,
          commentsRateDiff: signal.comparisons.commentsRateDiff ?? 0,
          clusterPerformanceDiff: signal.comparisons.clusterPerformanceDiff ?? 0,
        }
      : {
          reachDiff: 0,
          engagementRateDiff: 0,
          savesRateDiff: 0,
          commentsRateDiff: 0,
          clusterPerformanceDiff: 0,
        };

    const significance: PostLearningSignal["significance"] = signal.significance
      ? {
          reach: signal.significance.reach ?? "neutral",
          engagement: signal.significance.engagement ?? "neutral",
          savesRate: signal.significance.savesRate ?? "neutral",
          commentsRate: signal.significance.commentsRate ?? "neutral",
        }
      : {
          reach: "neutral",
          engagement: "neutral",
          savesRate: "neutral",
          commentsRate: "neutral",
        };

    const cluster: PostLearningSignal["cluster"] = signal.cluster
      ? {
          id: signal.cluster.id ?? "",
          label: signal.cluster.label ?? "未分類",
          centroidDistance: signal.cluster.centroidDistance ?? 0,
          baselinePerformance: signal.cluster.baselinePerformance ?? 0,
          similarPosts: Array.isArray(signal.cluster.similarPosts)
            ? signal.cluster.similarPosts.map((similar) => ({
                postId: similar.postId ?? "",
                title: similar.title ?? "タイトル不明",
                performanceScore: similar.performanceScore ?? 0,
                publishedAt: similar.publishedAt ?? null,
              }))
            : [],
        }
      : {
          id: "",
          label: "未分類",
          centroidDistance: 0,
          baselinePerformance: signal.engagementRate ?? 0,
          similarPosts: [],
        };

    const payload = {
      id: signal.postId ?? "",
      title: signal.title ?? "タイトル未設定",
      category: signal.category ?? "feed",
      hashtags: Array.isArray(signal.hashtags) ? signal.hashtags : [],
      metrics,
      comparisons,
      significance,
      cluster,
      sentiment: {
        score: signal.sentimentScore ?? 0,
        label: signal.sentimentLabel ?? "neutral",
      },
    };

    const prompt = `以下のInstagram投稿データを分析し、JSON形式で出力してください。
出力形式:
{
  "summary": "投稿全体の一言まとめ（30-60文字程度）",
  "strengths": ["強み1", "強み2"],
  "improvements": ["改善点1", "改善点2"],
  "nextActions": ["次のアクション1", "次のアクション2"]
}
条件:
- 箇条書きは2-3個に収める
- 具体的かつ実行しやすい表現にする
- 日本語で記述する

投稿データ:
${JSON.stringify(payload, null, 2)}`;

    const rawResponse = await callOpenAIForPostInsight(prompt);
    const trimmed = rawResponse.trim();
    const jsonText = trimmed.startsWith("{") ? trimmed : trimmed.slice(trimmed.indexOf("{"));
    const parsed = JSON.parse(jsonText);

    return NextResponse.json({
      success: true,
      data: {
        summary: typeof parsed.summary === "string" ? parsed.summary : "",
        strengths: Array.isArray(parsed.strengths)
          ? parsed.strengths.filter((item: unknown): item is string => typeof item === "string")
          : [],
        improvements: Array.isArray(parsed.improvements)
          ? parsed.improvements.filter((item: unknown): item is string => typeof item === "string")
          : [],
        nextActions: Array.isArray(parsed.nextActions)
          ? parsed.nextActions.filter((item: unknown): item is string => typeof item === "string")
          : [],
      },
    });
  } catch (error) {
    console.error("投稿AIサマリー生成エラー:", error);
    const message = error instanceof Error ? error.message : "投稿AIサマリーの生成に失敗しました";

    if (
      message.includes("OpenAI API key not configured") ||
      message.includes("Incorrect API key")
    ) {
      const fallback = {
        summary:
          "投稿データは取得できていますが、AI要約の生成環境がまだ整っていないため暫定的なメッセージを表示しています。",
        strengths: [
          "投稿の指標データやフィードバック情報は正常に保存されています。",
          "次回のAI要約では、これらのデータをもとに強みと改善点を深掘りできます。",
        ],
        improvements: [
          "AI要約を利用するには、管理者によるシステム設定が完了するまでお待ちください。",
          "設定が完了次第、再度「AIサマリーを生成」ボタンから最新の要約を取得できます。",
        ],
        nextActions: [
          "必要に応じて管理者へ「AIサマリー機能の有効化」をご依頼ください。",
          "運用記録やフィードバックの入力を継続し、準備が整ったタイミングで再試行してください。",
        ],
      };

      return NextResponse.json({
        success: true,
        data: fallback,
        warning:
          "OpenAI API キーが未設定または無効なため、フォールバックのサマリーを返しました。環境変数 OPENAI_API_KEY を設定してください。",
        requiresSetup: true,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}


