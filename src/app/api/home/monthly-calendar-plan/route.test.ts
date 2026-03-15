/** @jest-environment node */

import { createNextJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockGetUserProfile = jest.fn();
const mockGetMonthlyCalendarPlan = jest.fn();
const mockGetOwnedPlanDocument = jest.fn();
const mockSaveMonthlyCalendarPlan = jest.fn();

jest.mock("@/lib/server/user-profile", () => ({
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
}));

jest.mock("@/repositories/plan-repository", () => ({
  PlanRepository: {
    getMonthlyCalendarPlan: (...args: unknown[]) => mockGetMonthlyCalendarPlan(...args),
    getOwnedPlanDocument: (...args: unknown[]) => mockGetOwnedPlanDocument(...args),
    saveMonthlyCalendarPlan: (...args: unknown[]) => mockSaveMonthlyCalendarPlan(...args),
  },
}));

jest.mock("@/lib/server/auth-context", () => {
  const actual = jest.requireActual("@/lib/server/auth-context");
  return {
    ...actual,
    requireAuthContext: (...args: unknown[]) => mockRequireAuthContext(...args),
  };
});

describe("API regression foundation: /api/home/monthly-calendar-plan", () => {
  const loadRoute = async () => import("./route");
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockRequireAuthContext.mockResolvedValue({ uid: "user-1" });
    mockGetUserProfile.mockResolvedValue({ activePlanId: "plan-1" });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  test("returns 401 when auth context rejects", async () => {
    const { UnauthorizedError } = jest.requireActual("@/lib/server/auth-context") as {
      UnauthorizedError: new (message?: string) => Error;
    };

    mockRequireAuthContext.mockRejectedValueOnce(new UnauthorizedError("Missing Bearer token"));

    const { GET } = await loadRoute();
    const request = createNextJsonRequest("http://localhost:3000/api/home/monthly-calendar-plan");
    const response = await GET(request);
    const body = await readJson<{ success: boolean; error: string; code: string }>(response);

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: "Missing Bearer token",
      code: "UNAUTHORIZED",
    });
  });

  test("returns null data when no active plan can be resolved", async () => {
    mockGetUserProfile.mockResolvedValueOnce({ activePlanId: null });

    const { GET } = await loadRoute();
    const request = createNextJsonRequest("http://localhost:3000/api/home/monthly-calendar-plan");
    const response = await GET(request);
    const body = await readJson<{ success: boolean; data: null }>(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: null,
    });
    expect(mockGetMonthlyCalendarPlan).not.toHaveBeenCalled();
  });

  test("returns the saved monthly calendar plan", async () => {
    mockGetMonthlyCalendarPlan.mockResolvedValueOnce({
      startDate: "2025-10-01",
      endDate: "2025-10-31",
      items: [
        {
          dateIso: "2025-10-03",
          dayLabel: "金",
          postType: "feed",
          suggestedTime: "09:00",
          title: "投稿タイトル",
          direction: "方向性",
          hook: "導入",
        },
      ],
    });

    const { GET } = await loadRoute();
    const request = createNextJsonRequest("http://localhost:3000/api/home/monthly-calendar-plan");
    const response = await GET(request);
    const body = await readJson<{
      success: boolean;
      data: { startDate: string; endDate: string; items: Array<{ title: string; dateIso: string }> };
    }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({
      startDate: "2025-10-01",
      endDate: "2025-10-31",
      items: [
        expect.objectContaining({
          dateIso: "2025-10-03",
          title: "投稿タイトル",
        }),
      ],
    });
    expect(mockGetMonthlyCalendarPlan).toHaveBeenCalledWith("user-1", "plan-1");
  });

  test("returns 400 when startDate or endDate is invalid", async () => {
    const { POST } = await loadRoute();
    const request = createNextJsonRequest("http://localhost:3000/api/home/monthly-calendar-plan", {
      method: "POST",
      body: {
        startDate: "2025/10/01",
        endDate: "2025-10-31",
        items: [],
      },
    });
    const response = await POST(request);
    const body = await readJson<{ error: string }>(response);

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "startDate/endDate が不正です",
    });
    expect(mockSaveMonthlyCalendarPlan).not.toHaveBeenCalled();
  });

  test("returns 404 when the plan does not belong to the user", async () => {
    mockGetOwnedPlanDocument.mockResolvedValueOnce(null);

    const { POST } = await loadRoute();
    const request = createNextJsonRequest("http://localhost:3000/api/home/monthly-calendar-plan", {
      method: "POST",
      body: {
        startDate: "2025-10-01",
        endDate: "2025-10-31",
        items: [],
      },
    });
    const response = await POST(request);
    const body = await readJson<{ error: string }>(response);

    expect(response.status).toBe(404);
    expect(body).toEqual({
      error: "計画が見つかりません",
    });
  });

  test("saves the normalized monthly calendar plan", async () => {
    mockGetOwnedPlanDocument.mockResolvedValueOnce({ id: "plan-1", userId: "user-1" });

    const { POST } = await loadRoute();
    const request = createNextJsonRequest("http://localhost:3000/api/home/monthly-calendar-plan", {
      method: "POST",
      body: {
        startDate: "2025-10-01",
        endDate: "2025-10-31",
        items: [
          {
            dateIso: "2025-10-03",
            dayLabel: "金",
            postType: "feed",
            suggestedTime: "09:00",
            title: "投稿タイトル",
            direction: " 方向性 ",
            hook: " 導入 ",
          },
          {
            dateIso: "invalid",
            dayLabel: "金",
            postType: "feed",
            suggestedTime: "09:00",
            title: "除外される",
          },
        ],
      },
    });
    const response = await POST(request);
    const body = await readJson<{
      success: boolean;
      data: { items: Array<{ title: string; direction?: string; hook?: string }> };
    }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.items).toEqual([
      {
        dateIso: "2025-10-03",
        dayLabel: "金",
        postType: "feed",
        suggestedTime: "09:00",
        title: "投稿タイトル",
        direction: "方向性",
        hook: "導入",
      },
    ]);
    expect(mockSaveMonthlyCalendarPlan).toHaveBeenCalledWith({
      userId: "user-1",
      planId: "plan-1",
      startDate: "2025-10-01",
      endDate: "2025-10-31",
      items: [
        {
          dateIso: "2025-10-03",
          dayLabel: "金",
          postType: "feed",
          suggestedTime: "09:00",
          title: "投稿タイトル",
          direction: "方向性",
          hook: "導入",
        },
      ],
    });
  });
});
