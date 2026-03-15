/** @jest-environment node */

import { getHomeWeeklyPlans } from "./get-home-weekly-plans";
import type { PlanInput } from "@/domain/plan/plan-input";
import type { StrategyPlan } from "@/domain/plan/strategy-plan";

const mockGetActivePlanInput = jest.fn();
const mockGetActivePlanId = jest.fn();
const mockGetOwnedPlanDocument = jest.fn();
const mockSaveStrategyPlanData = jest.fn();
const mockGetLastMonthPerformance = jest.fn();
const mockGetUserProfile = jest.fn();
const mockBuildStrategy = jest.fn();
const mockGetLocalDate = jest.fn();
const mockGetCurrentWeekIndex = jest.fn();

jest.mock("@/repositories/plan-repository", () => ({
  PlanRepository: {
    getActivePlanInput: (...args: unknown[]) => mockGetActivePlanInput(...args),
    getActivePlanId: (...args: unknown[]) => mockGetActivePlanId(...args),
    getOwnedPlanDocument: (...args: unknown[]) => mockGetOwnedPlanDocument(...args),
    saveStrategyPlanData: (...args: unknown[]) => mockSaveStrategyPlanData(...args),
    getLastMonthPerformance: (...args: unknown[]) => mockGetLastMonthPerformance(...args),
  },
}));

jest.mock("@/lib/server/user-profile", () => ({
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
}));

jest.mock("@/domain/plan/plan-engine", () => ({
  PlanEngine: {
    buildStrategy: (...args: unknown[]) => mockBuildStrategy(...args),
  },
}));

jest.mock("@/lib/utils/timezone", () => ({
  getLocalDate: (...args: unknown[]) => mockGetLocalDate(...args),
}));

jest.mock("@/lib/plans/weekly-plans", () => ({
  getCurrentWeekIndex: (...args: unknown[]) => mockGetCurrentWeekIndex(...args),
}));

function createPlanInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    userId: "user-1",
    snsType: "instagram",
    currentFollowers: 100,
    targetFollowers: 200,
    operationPurpose: "grow",
    weeklyPosts: "weekly-1-2",
    reelCapability: "weekly-1-2",
    storyFrequency: "weekly-1-2",
    startDate: "2024-01-01",
    ...overrides,
  };
}

function createStrategyPlan(overrides: Partial<StrategyPlan> = {}): StrategyPlan {
  return {
    id: "plan-1",
    planInputId: "plan-1",
    userId: "user-1",
    snsType: "instagram",
    weeklyPlans: [
      {
        week: 1,
        targetFollowers: 120,
        increase: 20,
        theme: "今週のテーマ",
        feedPosts: [{ day: "月曜", content: "通常投稿", type: "feed" }],
        storyContent: ["ストーリー: 補足"],
      },
    ],
    schedule: {
      weeklyFrequency: "weekly-1-2",
      feedPosts: 2,
      reelPosts: 2,
      storyPosts: 2,
      postingDays: [
        { day: "月曜", time: "13:00", type: "feed" },
        { day: "木曜", time: "19:00", type: "reel" },
      ],
      storyDays: [{ day: "火曜", time: "11:00" }],
    },
    expectedResults: {
      monthlyReach: 1000,
      engagementRate: "5%",
      profileViews: 100,
      saves: 10,
      newFollowers: 20,
    },
    difficulty: {
      stars: "3",
      label: "中程度",
      industryRange: "標準",
      achievementRate: 50,
    },
    monthlyGrowthRate: "10%",
    features: [],
    suggestedContentTypes: [],
    startDate: new Date("2024-01-01T00:00:00Z"),
    endDate: new Date("2024-01-31T00:00:00Z"),
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("getHomeWeeklyPlans", () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    mockGetLocalDate.mockReturnValue(new Date("2024-01-08T00:00:00+09:00"));
    mockGetCurrentWeekIndex.mockReturnValue(0);
    mockGetLastMonthPerformance.mockResolvedValue(null);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test("returns empty when no active plan input exists", async () => {
    mockGetActivePlanInput.mockResolvedValueOnce(null);

    const result = await getHomeWeeklyPlans("user-1");

    expect(result).toEqual({ kind: "empty" });
    expect(mockBuildStrategy).not.toHaveBeenCalled();
  });

  test("uses saved strategy plan without AI regeneration", async () => {
    const planInput = createPlanInput();
    const savedStrategy = createStrategyPlan();

    mockGetActivePlanInput.mockResolvedValueOnce(planInput);
    mockGetActivePlanId.mockResolvedValueOnce("plan-1");
    mockGetOwnedPlanDocument.mockResolvedValueOnce({
      id: "plan-1",
      userId: "user-1",
      planData: {
        weeklyPlans: savedStrategy.weeklyPlans,
        schedule: savedStrategy.schedule,
        expectedResults: savedStrategy.expectedResults,
        difficulty: savedStrategy.difficulty,
        monthlyGrowthRate: savedStrategy.monthlyGrowthRate,
        features: savedStrategy.features,
        suggestedContentTypes: savedStrategy.suggestedContentTypes,
        startDate: savedStrategy.startDate,
        endDate: savedStrategy.endDate,
      },
    });

    const result = await getHomeWeeklyPlans("user-1");

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") {
      throw new Error("Expected ok result");
    }
    expect(result.data.currentWeek).toBe(1);
    expect(result.data.currentWeekPlan?.week).toBe(1);
    expect(result.data.currentWeekPlan?.feedPosts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "feed",
          title: "通常投稿",
        }),
      ]),
    );
    expect(result.data.currentWeekPlan?.feedPosts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "story",
          title: "補足",
        }),
      ]),
    );
    expect(mockBuildStrategy).not.toHaveBeenCalled();
    expect(mockSaveStrategyPlanData).not.toHaveBeenCalled();
  });

  test("persists only the current week on first generated fallback flow", async () => {
    const planInput = createPlanInput();
    const generatedStrategy = createStrategyPlan({
      weeklyPlans: [
        {
          week: 1,
          targetFollowers: 120,
          increase: 20,
          theme: "今週のテーマ",
          feedPosts: [{ day: "月曜", content: "通常投稿", type: "feed" }],
          storyContent: ["ストーリー: 補足"],
        },
        {
          week: 2,
          targetFollowers: 140,
          increase: 20,
          theme: "来週のテーマ",
          feedPosts: [{ day: "木曜", content: "来週投稿", type: "reel" }],
          storyContent: [],
        },
      ],
    });

    mockGetActivePlanInput.mockResolvedValueOnce(planInput);
    mockGetActivePlanId.mockResolvedValueOnce("plan-1");
    mockGetOwnedPlanDocument.mockResolvedValueOnce(null);
    mockGetUserProfile.mockResolvedValueOnce({ id: "user-1", activePlanId: "plan-1" });
    mockBuildStrategy.mockResolvedValueOnce(generatedStrategy);

    const result = await getHomeWeeklyPlans("user-1");

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") {
      throw new Error("Expected ok result");
    }
    expect(result.data.currentWeekPlan?.week).toBe(1);
    expect(result.data.allWeeklyPlans).toHaveLength(1);
    expect(result.data.allWeeklyPlans[0].week).toBe(1);
    expect(mockSaveStrategyPlanData).toHaveBeenCalledTimes(1);
    expect(mockSaveStrategyPlanData).toHaveBeenCalledWith({
      userId: "user-1",
      planId: "plan-1",
      strategyPlan: expect.objectContaining({
        weeklyPlans: [expect.objectContaining({ week: 1 })],
      }),
    });
  });
});
