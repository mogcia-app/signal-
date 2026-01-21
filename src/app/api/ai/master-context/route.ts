import { NextRequest, NextResponse } from "next/server";
import { getMasterContext } from "../monthly-analysis/infra/firestore/master-context";
import type {
  MasterContext,
  PatternSummary,
  PostLearningSignal,
  PostPerformanceTag,
} from "../monthly-analysis/types";
import { buildAIContext } from "@/lib/ai/context";
import type { AIReference, SnapshotReference } from "@/types/ai";

type PostPatternSummaries = Partial<Record<PostPerformanceTag, PatternSummary>>;

function buildPatternResponse(
  context: MasterContext | null
): {
  summaries: PostPatternSummaries;
  topHashtags: Record<string, number>;
  signals: Array<{
    postId: string;
    title: string;
    category: string;
    hashtags: string[];
    kpiScore: number;
    sentimentScore: number;
    sentimentLabel: "positive" | "negative" | "neutral";
    engagementRate: number;
    reach: number;
    followerIncrease: number;
    tag: PostPerformanceTag;
    feedbackCounts: PostLearningSignal["feedbackCounts"];
  }>;
} {
  if (!context?.postPatterns) {
    return {
      summaries: {},
      topHashtags: {},
      signals: [],
    };
  }

  const signals = Array.isArray(context.postPatterns.signals)
    ? context.postPatterns.signals.slice(0, 24).map((signal) => ({
        postId: signal.postId,
        title: signal.title,
        category: signal.category,
        hashtags: signal.hashtags,
        kpiScore: signal.kpiScore,
        sentimentScore: signal.sentimentScore,
        sentimentLabel: signal.sentimentLabel,
        engagementRate: signal.engagementRate,
        reach: signal.reach,
        followerIncrease: signal.followerIncrease,
        tag: signal.tag,
        feedbackCounts: signal.feedbackCounts,
      }))
    : [];

  return {
    summaries: context.postPatterns.summaries || {},
    topHashtags: context.postPatterns.topHashtags || {},
    signals,
  };
}

type LearningContextPayload = {
  references?: AIReference[];
  snapshotReferences?: SnapshotReference[];
  masterContext?: {
    learningPhase?: string;
    ragHitRate?: number;
    totalInteractions?: number;
    feedbackStats?: MasterContext["feedbackStats"] | null;
    actionStats?: MasterContext["actionStats"] | null;
    achievements?: MasterContext["achievements"] | null;
  } | null;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const forceRefreshParam = searchParams.get("forceRefresh");
    const forceRefresh = Boolean(forceRefreshParam && forceRefreshParam !== "0");

    const [context, aiContextBundle] = await Promise.all([
      getMasterContext(userId, { forceRefresh }),
      buildAIContext(userId, {
        includeUserProfile: false,
        includePlan: false,
        includeSnapshots: true,
        includeMasterContext: false,
        snapshotLimit: 8,
      }),
    ]);

    if (!context) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const { summaries, topHashtags, signals } = buildPatternResponse(context);

    const learningContext: LearningContextPayload | null = aiContextBundle
      ? {
          references: aiContextBundle.references,
          snapshotReferences: aiContextBundle.snapshotReferences,
          masterContext: context
            ? {
                learningPhase: context.learningPhase,
                ragHitRate: context.ragHitRate,
                totalInteractions: context.totalInteractions,
                feedbackStats: context.feedbackStats ?? null,
                actionStats: context.actionStats ?? null,
                achievements: context.achievements ?? null,
              }
            : null,
        }
      : null;

    return NextResponse.json({
      success: true,
      data: {
        learningPhase: context.learningPhase,
        ragHitRate: context.ragHitRate,
        totalInteractions: context.totalInteractions,
        feedbackStats: context.feedbackStats ?? null,
        actionStats: context.actionStats ?? null,
        personalizedInsights: context.personalizedInsights,
        recommendations: context.recommendations,
        postPatterns: {
          summaries,
          topHashtags,
          signals,
        },
        timeline: context.timeline ?? [],
        weeklyTimeline: context.weeklyTimeline ?? [],
        achievements: context.achievements ?? [],
        postInsights: context.postInsights ?? null,
        lastUpdated: context.lastUpdated?.toISOString?.() ?? null,
        learningContext,
      },
    });
  } catch (error) {
    console.error("マスターコンテキスト取得エラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: "マスターコンテキストの取得に失敗しました",
      },
      { status: 500 }
    );
  }
}


