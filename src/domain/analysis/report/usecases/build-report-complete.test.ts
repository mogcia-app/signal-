import { buildReportComplete } from "@/domain/analysis/report/usecases/build-report-complete";
import type { MonthlyReviewStore } from "@/domain/analysis/report/usecases/monthly-review-persistence";
import type { ReportRepositoryData } from "@/repositories/types";

const monthlyReviewStore: MonthlyReviewStore = {
  getMonthlyReview: jest.fn(async () => null),
  saveMonthlyReview: jest.fn(async () => undefined),
  upsertAiDirection: jest.fn(async () => undefined),
};

describe("buildReportComplete", () => {
  it("counts analytics in the selected period even when the post list was not matched", async () => {
    const publishedAt = new Date("2026-08-07T00:00:00.000Z");
    const reportData: ReportRepositoryData = {
      month: "2026-08",
      startDate: new Date("2026-08-01T00:00:00.000Z"),
      endDate: new Date("2026-08-31T23:59:59.999Z"),
      posts: [],
      analytics: [
        {
          postId: "post-1",
          title: "対象月の投稿",
          postType: "feed",
          publishedAt,
          publishedTime: "09:00",
          likes: 6,
          comments: 1,
          shares: 2,
          reposts: 0,
          reach: 260,
          saves: 3,
          followerIncrease: 0,
        },
      ],
      activePlan: null,
      user: null,
      previousAnalytics: [],
      followerCount: null,
      feedbackEntries: [],
      snapshotStatusMap: new Map(),
      directionAlignmentWarnings: [],
    };

    const result = await buildReportComplete({
      userId: "user-1",
      month: "2026-08",
      forceRegenerate: false,
      allowAiGeneration: false,
      reportData,
      aiClient: null,
      monthlyReviewStore,
      fetchPostSummaries: jest.fn(async () => []),
      fetchAiLearningReferences: jest.fn(async () => ({
        masterContext: null,
        references: [],
        snapshotReferences: [],
      })),
    });

    expect(result.monthlyReview.analyzedCount).toBe(1);
    expect(result.monthlyReview.requiredCount).toBe(1);
    expect(result.monthlyReview.remainingCount).toBe(0);
    expect(result.monthlyReview.generationState).toBe("ready");
    expect(result.performanceScore.kpis.totalLikes).toBe(6);
    expect(result.performanceScore.kpis.totalReach).toBe(260);
    expect(result.postDeepDive.posts).toHaveLength(1);
  });

  it("keeps plan scoring period-based while showing an existing plan as created for July 2026", async () => {
    const reportData: ReportRepositoryData = {
      month: "2026-07",
      startDate: new Date("2026-07-01T00:00:00.000Z"),
      endDate: new Date("2026-07-31T23:59:59.999Z"),
      posts: [],
      analytics: [],
      activePlan: {
        title: "8月運用計画",
        targetFollowers: 1000,
        currentFollowers: 500,
        strategies: [],
        postCategories: [],
        startDate: new Date("2026-08-01T00:00:00.000Z"),
        endDate: null,
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
      },
      user: null,
      previousAnalytics: [],
      followerCount: null,
      feedbackEntries: [],
      snapshotStatusMap: new Map(),
      directionAlignmentWarnings: [],
    };

    const result = await buildReportComplete({
      userId: "user-1",
      month: "2026-07",
      forceRegenerate: false,
      allowAiGeneration: false,
      reportData,
      aiClient: null,
      monthlyReviewStore,
      fetchPostSummaries: jest.fn(async () => []),
      fetchAiLearningReferences: jest.fn(async () => ({
        masterContext: null,
        references: [],
        snapshotReferences: [],
      })),
    });

    expect(result.performanceScore.metrics.hasPlan).toBe(false);
    expect(result.performanceScore.metrics.displayHasPlan).toBe(true);
    expect(result.monthlyReview.hasPlan).toBe(false);
  });

  it("does not backfill the plan display before July 2026", async () => {
    const reportData: ReportRepositoryData = {
      month: "2026-06",
      startDate: new Date("2026-06-01T00:00:00.000Z"),
      endDate: new Date("2026-06-30T23:59:59.999Z"),
      posts: [],
      analytics: [],
      activePlan: {
        title: "8月運用計画",
        targetFollowers: 1000,
        currentFollowers: 500,
        strategies: [],
        postCategories: [],
        startDate: new Date("2026-08-01T00:00:00.000Z"),
        endDate: null,
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
      },
      user: null,
      previousAnalytics: [],
      followerCount: null,
      feedbackEntries: [],
      snapshotStatusMap: new Map(),
      directionAlignmentWarnings: [],
    };

    const result = await buildReportComplete({
      userId: "user-1",
      month: "2026-06",
      forceRegenerate: false,
      allowAiGeneration: false,
      reportData,
      aiClient: null,
      monthlyReviewStore,
      fetchPostSummaries: jest.fn(async () => []),
      fetchAiLearningReferences: jest.fn(async () => ({
        masterContext: null,
        references: [],
        snapshotReferences: [],
      })),
    });

    expect(result.performanceScore.metrics.hasPlan).toBe(false);
    expect(result.performanceScore.metrics.displayHasPlan).toBe(false);
  });
});
