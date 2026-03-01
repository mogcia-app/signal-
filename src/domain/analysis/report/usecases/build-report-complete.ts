import { calculatePerformanceScore } from "@/domain/analysis/report/calculators/performance-score";
import {
  aggregatePreviousMonthAnalytics,
  detectRiskAlerts,
  type RuntimeRiskAlert,
} from "@/domain/analysis/report/calculators/risk-detection";
import { analyzeFeedbackSentiment } from "@/domain/analysis/report/usecases/analyze-feedback-sentiment";
import { buildPostDeepDive } from "@/domain/analysis/report/usecases/build-post-deep-dive";
import { buildReviewContext } from "@/domain/analysis/report/usecases/build-review-context";
import { orchestrateMonthlyReview } from "@/domain/analysis/report/usecases/orchestrate-monthly-review";
import type { AiClient, AnalyticsData, ParsedActionPlan } from "@/domain/analysis/report/types";
import type { AIReference, SnapshotReference } from "@/types/ai";
import type { MasterContextSummary } from "@/types/ai";
import type {
  ReportAnalyticsDocument,
  ReportPostSummaryDocument,
  ReportRepositoryData,
} from "@/repositories/types";
import type { MonthlyReviewStore } from "@/domain/analysis/report/usecases/monthly-review-persistence";

interface AiLearningReferences {
  masterContext: MasterContextSummary | null;
  references: AIReference[];
  snapshotReferences: SnapshotReference[];
}

export interface ReportCompleteResult {
  performanceScore: ReturnType<typeof calculatePerformanceScore>;
  riskAlerts: RuntimeRiskAlert[];
  feedbackSentiment: ReturnType<typeof analyzeFeedbackSentiment>;
  postDeepDive: ReturnType<typeof buildPostDeepDive>;
  aiLearningReferences: AiLearningReferences;
  postSummaries: Array<{
    postId: string;
    summary: string;
    strengths: string[];
    improvements: string[];
    recommendedActions: string[];
    reach: number;
  }>;
  monthlyReview: {
    review: string;
    actionPlans: ParsedActionPlan[];
    hasPlan: boolean;
    analyzedCount: number;
    generationState: "locked" | "ready" | "generated";
    requiredCount: number;
    remainingCount: number;
  };
}

interface BuildReportCompleteInput {
  userId: string;
  month: string;
  forceRegenerate: boolean;
  allowAiGeneration: boolean;
  reportData: ReportRepositoryData;
  aiClient: AiClient | null;
  monthlyReviewStore: MonthlyReviewStore;
  fetchPostSummaries: (userId: string, postIds: string[]) => Promise<ReportPostSummaryDocument[]>;
  fetchAiLearningReferences: (userId: string) => Promise<AiLearningReferences>;
}

function deduplicateAnalyticsByPost(
  analytics: ReportAnalyticsDocument[],
  validPostIds: Set<string>
): Map<string, ReportAnalyticsDocument> {
  const map = new Map<string, ReportAnalyticsDocument>();
  analytics.forEach((entry) => {
    if (!validPostIds.has(entry.postId)) {
      return;
    }
    const existing = map.get(entry.postId);
    if (!existing || entry.publishedAt > existing.publishedAt) {
      map.set(entry.postId, entry);
    }
  });
  return map;
}

function buildPostsForDirection(postIds: string[], analyticsByPostId: Map<string, ReportAnalyticsDocument>) {
  return postIds.flatMap((postId) => {
    const analytics = analyticsByPostId.get(postId);
    if (!analytics) {
      return [];
    }

    const publishedTime = analytics.publishedTime
      ? analytics.publishedTime
      : `${String(analytics.publishedAt.getHours()).padStart(2, "0")}:${String(
          analytics.publishedAt.getMinutes()
        ).padStart(2, "0")}`;

    return [
      {
        analyticsSummary: {
          likes: analytics.likes,
          comments: analytics.comments,
          shares: analytics.shares,
          saves: analytics.saves,
          reach: analytics.reach,
          publishedTime,
        },
      },
    ];
  });
}

export async function buildReportComplete(input: BuildReportCompleteInput): Promise<ReportCompleteResult> {
  const planStartDate = input.reportData.activePlan?.startDate || input.reportData.activePlan?.createdAt || null;
  const planEndDate = input.reportData.activePlan?.endDate || null;
  const hasPlan =
    Boolean(input.reportData.activePlan) &&
    (!planStartDate || planStartDate <= input.reportData.endDate) &&
    (!planEndDate || planEndDate >= input.reportData.startDate);

  const postIdsInPeriod = new Set(input.reportData.posts);
  const analyticsByPostId = deduplicateAnalyticsByPost(input.reportData.analytics, postIdsInPeriod);

  const validAnalyticsData: AnalyticsData[] = Array.from(analyticsByPostId.values()).map((data) => ({
    likes: data.likes,
    comments: data.comments,
    shares: data.shares,
    reposts: data.reposts,
    reach: data.reach,
    saves: data.saves,
    followerIncrease: data.followerIncrease,
    postType: data.postType,
    publishedAt: data.publishedAt,
  }));

  const postCount = postIdsInPeriod.size;
  const analyzedCount = validAnalyticsData.length;
  const totalLikes = validAnalyticsData.reduce((sum, data) => sum + data.likes, 0);
  const totalReach = validAnalyticsData.reduce((sum, data) => sum + data.reach, 0);
  const totalSaves = validAnalyticsData.reduce((sum, data) => sum + (data.saves || 0), 0);
  const totalComments = validAnalyticsData.reduce((sum, data) => sum + data.comments, 0);
  const totalShares = validAnalyticsData.reduce((sum, data) => sum + data.shares, 0);
  const totalReposts = validAnalyticsData.reduce((sum, data) => sum + (data.reposts || 0), 0);
  const followerIncreaseFromPosts = validAnalyticsData.reduce((sum, data) => sum + (data.followerIncrease || 0), 0);
  // 投稿に紐づかない手入力増加数は廃止済みのため、現在は合算しない
  const followerIncreaseFromOther = 0;
  const totalFollowerIncrease = followerIncreaseFromPosts + followerIncreaseFromOther;

  const performanceScore = calculatePerformanceScore({
    postCount,
    analyzedCount,
    hasPlan,
    totalLikes,
    totalComments,
    totalShares,
    totalReposts,
    totalSaves,
    totalFollowerIncrease,
    totalReach,
    analyticsData: validAnalyticsData,
  });

  const previous = aggregatePreviousMonthAnalytics(
    input.reportData.previousAnalytics.map((analytics) => ({
      postId: analytics.postId,
      publishedAt: analytics.publishedAt,
      likes: analytics.likes,
      reach: analytics.reach,
      comments: analytics.comments,
      followerIncrease: analytics.followerIncrease,
    }))
  );

  const riskAlerts: RuntimeRiskAlert[] = detectRiskAlerts({
    current: {
      analyzedCount,
      totalLikes,
      totalReach,
      totalComments,
      totalFollowerIncrease,
    },
    previous,
  });

  const postsMap = new Map<string, { id: string; title: string; postType: "feed" | "reel" | "story" }>();
  analyticsByPostId.forEach((data, postId) => {
    postsMap.set(postId, {
      id: postId,
      title: data.title,
      postType: data.postType === "reel" || data.postType === "story" ? data.postType : "feed",
    });
  });

  const feedbackSentiment = analyzeFeedbackSentiment({
    entries: input.reportData.feedbackEntries,
    postsMap,
    snapshotStatusMap: input.reportData.snapshotStatusMap,
    startDate: input.reportData.startDate,
    endDate: input.reportData.endDate,
  });

  const postDeepDive = buildPostDeepDive({
    analyticsByPostId,
    snapshotStatusMap: input.reportData.snapshotStatusMap,
    limit: 10,
  });

  const aiLearningReferences = await input.fetchAiLearningReferences(input.userId);

  const summaryDocs = await input.fetchPostSummaries(input.userId, Array.from(analyticsByPostId.keys()));
  const validPostSummaries = summaryDocs.map((summary) => ({
    postId: summary.postId,
    summary: summary.summary,
    strengths: summary.strengths,
    improvements: summary.improvements,
    recommendedActions: summary.recommendedActions,
    reach: analyticsByPostId.get(summary.postId)?.reach || 0,
  }));

  const reviewContext = buildReviewContext({
    analyticsByPostId,
    postSummaries: validPostSummaries,
    totalReach,
    hasPlan,
    plan: hasPlan ? input.reportData.activePlan : null,
    user: input.reportData.user,
  });

  const monthlyReview = await orchestrateMonthlyReview({
    store: input.monthlyReviewStore,
    aiClient: input.aiClient,
    userId: input.userId,
    month: input.month,
    forceRegenerate: input.forceRegenerate,
    allowAiGeneration: input.allowAiGeneration,
    totals: {
      analyzedCount,
      hasPlan,
      totalLikes,
      totalReach,
      totalComments,
      totalSaves,
      totalShares,
      totalFollowerIncrease,
      engagementRate: performanceScore.kpis.engagementRate,
      engagementRateNeedsReachInput: performanceScore.kpis.engagementRateNeedsReachInput,
      prevTotalReach: previous.totalReach,
      prevTotalFollowerIncrease: previous.totalFollowerIncrease,
    },
    reviewContext,
    directionAlignmentWarnings: input.reportData.directionAlignmentWarnings.map((warning) => ({
      directionAlignment: warning.directionAlignment,
      directionComment: warning.directionComment,
      aiDirectionMainTheme: warning.aiDirectionMainTheme,
    })),
    postsForDirection: buildPostsForDirection(input.reportData.posts, analyticsByPostId),
  });

  return {
    performanceScore,
    riskAlerts,
    feedbackSentiment,
    postDeepDive,
    aiLearningReferences,
    postSummaries: validPostSummaries,
    monthlyReview: {
      review: monthlyReview.review,
      actionPlans: monthlyReview.actionPlans,
      hasPlan,
      analyzedCount,
      generationState: monthlyReview.generationState,
      requiredCount: monthlyReview.requiredCount,
      remainingCount: monthlyReview.remainingCount,
    },
  };
}
