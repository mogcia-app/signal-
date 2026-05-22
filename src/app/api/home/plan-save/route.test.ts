/** @jest-environment node */

import { createNextJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockGetUserProfile = jest.fn();
const mockGetLastMonthPerformance = jest.fn();
const mockBuildStrategy = jest.fn();
const mockSavePlanInput = jest.fn();

jest.mock("@/lib/server/auth-context", () => {
  const actual = jest.requireActual("@/lib/server/auth-context");
  return {
    ...actual,
    requireAuthContext: (...args: unknown[]) => mockRequireAuthContext(...args),
  };
});

jest.mock("@/lib/server/user-profile", () => ({
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
}));

jest.mock("@/repositories/plan-repository", () => ({
  PlanRepository: {
    getLastMonthPerformance: (...args: unknown[]) => mockGetLastMonthPerformance(...args),
    savePlanInput: (...args: unknown[]) => mockSavePlanInput(...args),
  },
}));

jest.mock("@/domain/plan/plan-engine", () => ({
  PlanEngine: {
    buildStrategy: (...args: unknown[]) => mockBuildStrategy(...args),
  },
}));

describe("/api/home/plan-save", () => {
  const loadRoute = async () => import("./route");

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuthContext.mockResolvedValue({ uid: "user-1" });
    mockGetUserProfile.mockResolvedValue({ id: "user-1" });
    mockGetLastMonthPerformance.mockResolvedValue(null);
    mockBuildStrategy.mockResolvedValue({
      weeklyPlans: [{ week: 1, targetFollowers: 110, increase: 10, theme: "テーマ", feedPosts: [], storyContent: [] }],
    });
    mockSavePlanInput.mockResolvedValue("plan-1");
  });

  test("accepts saving when only one post type has posting days", async () => {
    const { POST } = await loadRoute();
    const request = createNextJsonRequest("http://localhost:3000/api/home/plan-save", {
      method: "POST",
      body: {
        startDate: "2026-05-22",
        currentFollowers: 100,
        targetFollowerIncrease: 10,
        targetFollowers: 110,
        operationPurpose: "認知拡大",
        weeklyPosts: "none",
        reelCapability: "weekly-1-2",
        storyFrequency: "none",
        feedDays: [],
        reelDays: ["火"],
        storyDays: [],
      },
    });

    const response = await POST(request);
    const body = await readJson<{ success: boolean; planId: string }>(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      planId: "plan-1",
      message: "計画を保存しました",
    });
  });

  test("rejects saving when all post types are empty", async () => {
    const { POST } = await loadRoute();
    const request = createNextJsonRequest("http://localhost:3000/api/home/plan-save", {
      method: "POST",
      body: {
        startDate: "2026-05-22",
        currentFollowers: 100,
        targetFollowerIncrease: 10,
        targetFollowers: 110,
        operationPurpose: "認知拡大",
        weeklyPosts: "none",
        reelCapability: "none",
        storyFrequency: "none",
        feedDays: [],
        reelDays: [],
        storyDays: [],
      },
    });

    const response = await POST(request);
    const body = await readJson<{ error: string }>(response);

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "フィード・リール・ストーリーズのいずれか1つ以上で投稿曜日を設定してください",
    });
  });

  test("accepts saving when target follower increase is omitted but post days exist", async () => {
    const { POST } = await loadRoute();
    const request = createNextJsonRequest("http://localhost:3000/api/home/plan-save", {
      method: "POST",
      body: {
        startDate: "2026-05-22",
        currentFollowers: 100,
        targetFollowerIncrease: 10,
        targetFollowers: 110,
        operationPurpose: "認知拡大",
        weeklyPosts: "weekly-1-2",
        reelCapability: "none",
        storyFrequency: "none",
        feedDays: ["月"],
        reelDays: [],
        storyDays: [],
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
