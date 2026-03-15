/** @jest-environment node */

import { createNextJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockGetHomeWeeklyPlans = jest.fn();

jest.mock("@/domain/plan/usecases/get-home-weekly-plans", () => ({
  getHomeWeeklyPlans: (...args: unknown[]) => mockGetHomeWeeklyPlans(...args),
}));

jest.mock("@/lib/server/auth-context", () => {
  const actual = jest.requireActual("@/lib/server/auth-context");
  return {
    ...actual,
    requireAuthContext: (...args: unknown[]) => mockRequireAuthContext(...args),
  };
});

describe("API regression foundation: /api/home/weekly-plans", () => {
  const loadRoute = async () => import("./route");
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockRequireAuthContext.mockResolvedValue({ uid: "user-1" });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  test("returns 401 when auth context rejects", async () => {
    const { UnauthorizedError } = jest.requireActual("@/lib/server/auth-context") as {
      UnauthorizedError: new (message?: string) => Error;
    };

    mockRequireAuthContext.mockRejectedValueOnce(new UnauthorizedError("Missing Bearer token"));

    const { GET } = await loadRoute();
    const request = createNextJsonRequest("http://localhost:3000/api/home/weekly-plans");
    const response = await GET(request);
    const body = await readJson<{ success: boolean; error: string; code: string }>(response);

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: "Missing Bearer token",
      code: "UNAUTHORIZED",
    });
  });

  test("returns 404 when user profile is missing", async () => {
    mockGetHomeWeeklyPlans.mockResolvedValueOnce({ kind: "user-profile-not-found" });

    const { GET } = await loadRoute();
    const request = createNextJsonRequest("http://localhost:3000/api/home/weekly-plans");
    const response = await GET(request);
    const body = await readJson<{ success: boolean; error: string }>(response);

    expect(response.status).toBe(404);
    expect(body).toEqual({
      success: false,
      error: "ユーザープロファイルが見つかりません",
    });
    expect(mockGetHomeWeeklyPlans).toHaveBeenCalledWith("user-1");
  });

  test("returns null data when no weekly plans are available", async () => {
    mockGetHomeWeeklyPlans.mockResolvedValueOnce({ kind: "empty" });

    const { GET } = await loadRoute();
    const request = createNextJsonRequest("http://localhost:3000/api/home/weekly-plans");
    const response = await GET(request);
    const body = await readJson<{ success: boolean; data: null }>(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: null,
    });
  });

  test("returns weekly plan data for authenticated users", async () => {
    mockGetHomeWeeklyPlans.mockResolvedValueOnce({
      kind: "ok",
      data: {
        currentWeek: 2,
        currentWeekPlan: {
          week: 2,
          targetFollowers: 120,
          increase: 10,
          theme: "テーマ",
          feedPosts: [],
          storyContent: ["story-1"],
        },
        allWeeklyPlans: [],
        schedule: {
          feed: { weeklyOption: "weekly-1-2", preferredDays: [], preferredTime: "09:00" },
          reel: { weeklyOption: "none", preferredDays: [], preferredTime: "12:00" },
          story: { weeklyOption: "daily", preferredDays: [], preferredTime: "18:00" },
        },
      },
    });

    const { GET } = await loadRoute();
    const request = createNextJsonRequest("http://localhost:3000/api/home/weekly-plans");
    const response = await GET(request);
    const body = await readJson<{
      success: boolean;
      data: { currentWeek: number; currentWeekPlan: { week: number; theme: string } | null };
    }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.currentWeek).toBe(2);
    expect(body.data.currentWeekPlan).toEqual(
      expect.objectContaining({
        week: 2,
        theme: "テーマ",
      }),
    );
  });
});
