import { orchestrateMonthlyReview } from "@/domain/analysis/report/usecases/orchestrate-monthly-review";
import { buildPreviousComparisonText } from "@/domain/analysis/report/usecases/monthly-review-generation";
import type { AiClient } from "@/domain/analysis/report/types";
import type { MonthlyReviewStore } from "@/domain/analysis/report/usecases/monthly-review-persistence";

function createStore(): MonthlyReviewStore {
  return {
    getMonthlyReview: jest.fn().mockResolvedValue(null),
    saveMonthlyReview: jest.fn().mockResolvedValue(undefined),
    upsertAiDirection: jest.fn().mockResolvedValue(undefined),
  };
}

function createAiClient(review = "📊 Instagram運用レポート（2月総括）\n\n3. 次月への反映\n提案"): AiClient {
  return {
    generateText: jest.fn().mockResolvedValue(review),
  };
}

function baseInput(overrides: Partial<Parameters<typeof orchestrateMonthlyReview>[0]> = {}) {
  return {
    store: createStore(),
    aiClient: createAiClient(),
    userId: "user-1",
    month: "2026-02",
    forceRegenerate: false,
    allowAiGeneration: true,
    totals: {
      analyzedCount: 1,
      hasPlan: false,
      totalLikes: 10,
      totalReach: 100,
      totalReposts: 0,
      totalComments: 1,
      totalSaves: 2,
      totalShares: 3,
      totalFollowerIncrease: 4,
      engagementRate: 16,
      engagementRateNeedsReachInput: false,
      previous: {
        analyzedCount: 0,
        totalLikes: 0,
        totalReach: 0,
        totalComments: 0,
        totalShares: 0,
        totalReposts: 0,
        totalSaves: 0,
        totalFollowerIncrease: 0,
        engagementRate: null,
      },
      prevTotalReach: 0,
      prevTotalFollowerIncrease: 0,
    },
    reviewContext: {
      businessInfoText: "",
      aiSettingsText: "",
      postTypeInfo: "",
      topPostInfo: "",
      postSummaryInsights: "",
    },
    directionAlignmentWarnings: [],
    postsForDirection: [],
    ...overrides,
  };
}

describe("orchestrateMonthlyReview", () => {
  test("allows monthly review generation with one analyzed post", async () => {
    const input = baseInput();

    const result = await orchestrateMonthlyReview(input);

    expect(result.generationState).toBe("generated");
    expect(result.requiredCount).toBe(1);
    expect(result.remainingCount).toBe(0);
    expect(input.aiClient?.generateText).toHaveBeenCalled();
  });

  test("keeps monthly review locked when there is no analyzed post", async () => {
    const input = baseInput({
      totals: {
        ...baseInput().totals,
        analyzedCount: 0,
      },
    });

    const result = await orchestrateMonthlyReview(input);

    expect(result.generationState).toBe("locked");
    expect(result.requiredCount).toBe(1);
    expect(result.remainingCount).toBe(1);
    expect(result.review).toBe("");
    expect(input.aiClient?.generateText).not.toHaveBeenCalled();
  });
});

describe("buildPreviousComparisonText", () => {
  test("builds month-over-month comparisons for major report metrics", () => {
    const text = buildPreviousComparisonText({
      analyzedCount: 4,
      totalLikes: 120,
      totalReach: 1000,
      totalComments: 20,
      totalShares: 12,
      totalReposts: 4,
      totalSaves: 30,
      totalFollowerIncrease: 8,
      engagementRate: 15.2,
      previous: {
        analyzedCount: 2,
        totalLikes: 100,
        totalReach: 800,
        totalComments: 25,
        totalShares: 10,
        totalReposts: 2,
        totalSaves: 20,
        totalFollowerIncrease: 10,
        engagementRate: 16.5,
      },
    });

    expect(text).toContain("分析済み投稿数: 今月 4件 / 前月 2件 / 前月比 +100.0%");
    expect(text).toContain("閲覧数: 今月 1,000人 / 前月 800人 / 前月比 +25.0%");
    expect(text).toContain("コメント数: 今月 20件 / 前月 25件 / 前月比 -20.0%");
    expect(text).toContain("エンゲージメント率: 今月 15.20% / 前月 16.50% / 前月差 -1.30pt");
  });
});
