/** @jest-environment node */

import { createJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockFillMissingPublishedTime = jest.fn();

jest.mock("@/repositories/analytics-repository", () => ({
  AnalyticsRepository: {
    fillMissingPublishedTime: (...args: unknown[]) => mockFillMissingPublishedTime(...args),
  },
}));

jest.mock("@/lib/server/auth-context", () => {
  const actual = jest.requireActual("@/lib/server/auth-context");
  return {
    ...actual,
    requireAuthContext: (...args: unknown[]) => mockRequireAuthContext(...args),
  };
});

describe("API regression foundation: /api/analytics/update-published-time", () => {
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

    const { POST } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/analytics/update-published-time", {
      method: "POST",
      body: {},
    });
    const response = await POST(request as never);
    const body = await readJson<{ success: boolean; error: string; code: string }>(response);

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: "Missing Bearer token",
      code: "UNAUTHORIZED",
    });
  });

  test("returns 403 when another user's analytics are updated", async () => {
    const { POST } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/analytics/update-published-time", {
      method: "POST",
      body: { userId: "user-2" },
    });
    const response = await POST(request as never);
    const body = await readJson<{ error: string }>(response);

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: "他のユーザーのanalyticsは更新できません",
    });
    expect(mockFillMissingPublishedTime).not.toHaveBeenCalled();
  });

  test("updates missing publishedTime values for the authenticated user", async () => {
    mockFillMissingPublishedTime.mockResolvedValueOnce([
      {
        id: "analytics-1",
        publishedAt: "2024-01-02T03:04:00.000Z",
        publishedTime: "03:04",
      },
    ]);

    const { POST } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/analytics/update-published-time", {
      method: "POST",
      body: { userId: "user-1" },
    });
    const response = await POST(request as never);
    const body = await readJson<{
      message: string;
      updates: Array<{ id: string; publishedTime: string }>;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.message).toBe("1件のデータを更新しました");
    expect(body.updates).toEqual([
      expect.objectContaining({
        id: "analytics-1",
        publishedTime: "03:04",
      }),
    ]);
    expect(mockFillMissingPublishedTime).toHaveBeenCalledTimes(1);
    expect(mockFillMissingPublishedTime).toHaveBeenCalledWith("user-1");
  });
});
