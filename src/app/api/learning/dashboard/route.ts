import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import { getMasterContext } from "@/app/api/ai/monthly-analysis/infra/firestore/master-context";
import type {
  MasterContext,
  PatternSummary,
  PostLearningSignal,
  PostPerformanceTag,
} from "@/app/api/ai/monthly-analysis/types";
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
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "learning-dashboard", limit: 60, windowSeconds: 60 },
      auditEventName: "learning_dashboard_access",
    });

    const { searchParams } = new URL(request.url);
    const forceRefreshParam = searchParams.get("forceRefresh");
    const forceRefresh = Boolean(forceRefreshParam && forceRefreshParam !== "0");
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitParam) || 10, 1), 100);

    // 並列でデータを取得
    const [context, aiContextBundle, feedbackSnapshot, actionLogsSnapshot] = await Promise.all([
      // マスターコンテキスト取得
      getMasterContext(uid, { forceRefresh }),
      // AIコンテキストバンドル取得
      buildAIContext(uid, {
        includeUserProfile: false,
        includePlan: false,
        includeSnapshots: true,
        includeMasterContext: false,
        snapshotLimit: 8,
      }),
      // フィードバック履歴取得
      adminDb
        .collection("ai_post_feedback")
        .where("userId", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get(),
      // アクションログ履歴取得
      adminDb
        .collection("ai_action_logs")
        .where("userId", "==", uid)
        .orderBy("updatedAt", "desc")
        .limit(limit * 2)
        .get(),
    ]);

    // マスターコンテキストがnullの場合でも、フィードバック履歴とアクション履歴は返す

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

    // フィードバック履歴をマッピング
    const feedbackHistory = feedbackSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        postId: data.postId ?? null,
        sentiment:
          data.sentiment === "positive" || data.sentiment === "negative" ? data.sentiment : "neutral",
        comment: data.comment ?? "",
        weight: typeof data.weight === "number" ? data.weight : 1,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    // アクションログ履歴をマッピング
    let actionLogs = actionLogsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        actionId: data.actionId || doc.id,
        title: data.title ?? "未設定",
        focusArea: data.focusArea ?? "全体",
        applied: Boolean(data.applied),
        resultDelta: typeof data.resultDelta === "number" ? Number(data.resultDelta) : null,
        feedback: data.feedback ?? "",
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? 
                   (data.createdAt?.toDate?.()?.toISOString() ?? null),
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    // 最新のlimit件までに絞る
    actionLogs = actionLogs.slice(0, limit);

    // contextがnullの場合のデフォルト値
    if (!context) {
      return NextResponse.json({
        success: true,
        data: {
          learningPhase: "initial" as const,
          ragHitRate: 0,
          totalInteractions: 0,
          feedbackStats: null,
          actionStats: null,
          personalizedInsights: [],
          recommendations: [],
          postPatterns: {
            summaries: {},
            topHashtags: {},
            signals: [],
          },
          timeline: [],
          weeklyTimeline: [],
          achievements: [],
          postInsights: null,
          lastUpdated: null,
          learningContext: null,
          feedbackHistory,
          actionHistory: actionLogs,
        },
      });
    }

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
        feedbackHistory,
        actionHistory: actionLogs,
      },
    });
  } catch (error) {
    console.error("❌ Learning dashboard error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

