/** @jest-environment node */

import { createNextJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockGetUserProfile = jest.fn();
const mockFetchDashboardData = jest.fn();
const mockUpdate = jest.fn();

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

jest.mock("@/repositories/home-dashboard-repository", () => ({
  HomeDashboardRepository: {
    fetchDashboardData: (...args: unknown[]) => mockFetchDashboardData(...args),
  },
}));

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: () => ({
      doc: () => ({
        update: (...args: unknown[]) => mockUpdate(...args),
      }),
    }),
  },
}));

describe("/api/home/dashboard", () => {
  const loadRoute = async () => import("./route");

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuthContext.mockResolvedValue({ uid: "user-1" });
    mockGetUserProfile.mockResolvedValue({ activePlanId: "plan-1" });
    mockUpdate.mockResolvedValue(undefined);
  });

  test("keeps currentPlan when only one post type has posting days", async () => {
    mockFetchDashboardData.mockResolvedValue({
      analytics: [],
      posts: [],
      activePlan: {
        id: "plan-1",
        title: "プラン",
        generatedStrategy: null,
        aiGenerationStatus: "completed",
        aiGenerationCompletedAt: null,
        formData: {
          operationPurpose: "認知拡大",
          startDate: "2026-05-22",
          targetFollowers: 110,
          currentFollowers: 100,
          customTargetFollowers: "10",
          weeklyPosts: "weekly-1-2",
          reelCapability: "none",
          storyFrequency: "none",
          feedDays: ["月"],
          reelDays: [],
          storyDays: [],
          targetAudience: "",
          postingTime: "",
          regionRestriction: "none",
          regionName: "",
        },
        startDate: new Date("2026-05-22T00:00:00+09:00"),
        endDate: new Date("2026-06-21T23:59:59+09:00"),
        createdAt: new Date("2026-05-22T00:00:00+09:00"),
        simulationResult: null,
      },
    });

    const { GET } = await loadRoute();
    const response = await GET(createNextJsonRequest("http://localhost:3000/api/home/dashboard"));
    const body = await readJson<{ success: boolean; data: { currentPlan: { id: string } | null } }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.currentPlan).toEqual(expect.objectContaining({ id: "plan-1" }));
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
