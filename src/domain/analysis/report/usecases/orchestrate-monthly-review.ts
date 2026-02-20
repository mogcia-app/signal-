import type { AiClient, ParsedActionPlan } from "@/domain/analysis/report/types";
import { extractActionPlansFromReview } from "@/domain/analysis/report/parsers/action-plans-from-review";
import {
  buildAiErrorFallbackMonthlyReview,
  buildNoDataMonthlyReview,
  formatFollowerChangeText,
  formatReachChangeText,
  type DirectionAlignmentWarning,
} from "@/domain/analysis/report/usecases/monthly-review-generation";
import { generateMonthlyReviewWithAi } from "@/domain/analysis/report/usecases/generate-monthly-review-with-ai";
import {
  loadReusableMonthlyReview,
  persistGeneratedMonthlyReview,
  type DirectionPostInput,
  type MonthlyReviewStore,
} from "@/domain/analysis/report/usecases/monthly-review-persistence";
import { getMonthName, getNextMonthName } from "@/domain/analysis/report/utils/month";

interface ReviewContextInput {
  planTitle?: string;
  businessInfoText: string;
  aiSettingsText: string;
  postTypeInfo: string;
  topPostInfo: string;
  postSummaryInsights: string;
}

interface MonthlyTotals {
  analyzedCount: number;
  hasPlan: boolean;
  totalLikes: number;
  totalReach: number;
  totalComments: number;
  totalSaves: number;
  totalShares: number;
  totalFollowerIncrease: number;
  engagementRate: number | null;
  engagementRateNeedsReachInput: boolean;
  prevTotalReach: number;
  prevTotalFollowerIncrease: number;
}

interface OrchestrateMonthlyReviewInput {
  store: MonthlyReviewStore;
  aiClient: AiClient | null;
  userId: string;
  month: string;
  forceRegenerate: boolean;
  allowAiGeneration: boolean;
  totals: MonthlyTotals;
  reviewContext: ReviewContextInput;
  directionAlignmentWarnings: DirectionAlignmentWarning[];
  postsForDirection: DirectionPostInput[];
}

export async function orchestrateMonthlyReview(
  input: OrchestrateMonthlyReviewInput
): Promise<{
  review: string;
  actionPlans: ParsedActionPlan[];
  generationState: "locked" | "ready" | "generated";
  requiredCount: number;
  remainingCount: number;
}> {
  const requiredCount = 10;
  const remainingCount = Math.max(0, requiredCount - input.totals.analyzedCount);
  const monthName = getMonthName(input.month);
  const nextMonth = getNextMonthName(input.month);
  const reachChangeText = formatReachChangeText(input.totals.prevTotalReach, input.totals.totalReach);
  const followerChangeText = formatFollowerChangeText(
    input.totals.prevTotalFollowerIncrease,
    input.totals.totalFollowerIncrease
  );

  let monthlyReview = null;
  let actionPlans: ParsedActionPlan[] = [];

  const reusableReview = await loadReusableMonthlyReview({
    store: input.store,
    userId: input.userId,
    month: input.month,
    forceRegenerate: input.forceRegenerate,
  });
  monthlyReview = reusableReview.monthlyReview;
  actionPlans = reusableReview.actionPlans;
  let generationState: "locked" | "ready" | "generated" =
    input.totals.analyzedCount < requiredCount ? "locked" : "ready";
  if (input.totals.analyzedCount < requiredCount) {
    monthlyReview = "";
    actionPlans = [];
    generationState = "locked";
  } else if (monthlyReview && !reusableReview.isFallback) {
    generationState = "generated";
  }

  if (!monthlyReview || input.forceRegenerate) {
    if (input.forceRegenerate) {
      monthlyReview = null;
      actionPlans = [];
    }

    if (input.totals.analyzedCount < requiredCount) {
      monthlyReview = "";
      actionPlans = [];
      generationState = "locked";
    } else if (input.aiClient && input.allowAiGeneration) {
      try {
        monthlyReview = await generateMonthlyReviewWithAi({
          aiClient: input.aiClient,
          nextMonth,
          monthlyReviewPromptInput: {
            currentMonth: monthName,
            nextMonth,
            analyzedCount: input.totals.analyzedCount,
            totalLikes: input.totals.totalLikes,
            totalReach: input.totals.totalReach,
            totalComments: input.totals.totalComments,
            totalSaves: input.totals.totalSaves,
            totalShares: input.totals.totalShares,
            totalFollowerIncrease: input.totals.totalFollowerIncrease,
            engagementRate: input.totals.engagementRate,
            engagementRateNeedsReachInput: input.totals.engagementRateNeedsReachInput,
            reachChangeText,
            followerChangeText,
            hasPlan: input.totals.hasPlan,
            planTitle: input.reviewContext.planTitle,
            businessInfoText: input.reviewContext.businessInfoText,
            aiSettingsText: input.reviewContext.aiSettingsText,
            postTypeInfo: input.reviewContext.postTypeInfo,
            topPostInfo: input.reviewContext.topPostInfo,
            postSummaryInsights: input.reviewContext.postSummaryInsights,
            directionAlignmentWarnings: input.directionAlignmentWarnings,
          },
          proposalPromptInput: {
            nextMonth,
            analyzedCount: input.totals.analyzedCount,
            totalLikes: input.totals.totalLikes,
            totalReach: input.totals.totalReach,
            totalComments: input.totals.totalComments,
            totalSaves: input.totals.totalSaves,
            totalFollowerIncrease: input.totals.totalFollowerIncrease,
            engagementRate: input.totals.engagementRate,
            engagementRateNeedsReachInput: input.totals.engagementRateNeedsReachInput,
            reachChangeText,
            followerChangeText,
            businessInfoText: input.reviewContext.businessInfoText,
            aiSettingsText: input.reviewContext.aiSettingsText,
            postTypeSummary: input.reviewContext.postTypeInfo,
            directionAlignmentWarnings: input.directionAlignmentWarnings,
          },
        });

        actionPlans = extractActionPlansFromReview(monthlyReview, nextMonth);
        generationState = "generated";

        try {
          await persistGeneratedMonthlyReview({
            store: input.store,
            userId: input.userId,
            month: input.month,
            review: monthlyReview,
            actionPlans,
            hasPlan: input.totals.hasPlan,
            analyzedCount: input.totals.analyzedCount,
            postsForDirection: input.postsForDirection,
          });
        } catch (error) {
          console.error("レビュー保存エラー:", error);
        }
      } catch (error) {
        console.error("AI生成エラー:", error);
        monthlyReview = buildAiErrorFallbackMonthlyReview({
          monthName,
          totalReach: input.totals.totalReach,
          totalLikes: input.totals.totalLikes,
          totalSaves: input.totals.totalSaves,
          totalComments: input.totals.totalComments,
          reachChangeText,
        });
        actionPlans = [];
        generationState = "ready";
      }
    } else if (!input.allowAiGeneration) {
      monthlyReview = "";
      actionPlans = [];
      generationState = "ready";
    }
  }

  if (!monthlyReview) {
    if (generationState === "generated") {
      monthlyReview = buildNoDataMonthlyReview(monthName);
      actionPlans = [];
    }
  }

  return {
    review: monthlyReview ?? "",
    actionPlans,
    generationState,
    requiredCount,
    remainingCount,
  };
}
