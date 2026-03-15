/** @jest-environment node */

import { createJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockAnalyticsGet = jest.fn();
const mockAnalyticsUpdate = jest.fn();

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: (name: string) => {
      if (name !== "analytics") {
        throw new Error(`Unexpected collection: ${name}`);
      }

      return {
        where: () => ({
          get: (...args: unknown[]) => mockAnalyticsGet(...args),
        }),
        doc: () => ({
          update: (...args: unknown[]) => mockAnalyticsUpdate(...args),
        }),
      };
    },
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

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockRequireAuthContext.mockResolvedValue({ uid: "user-1" });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
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
    expect(mockAnalyticsGet).not.toHaveBeenCalled();
  });

  test("updates missing publishedTime values for the authenticated user", async () => {
    const localPublishedAt = new Date(2024, 0, 2, 3, 4, 0);

    mockAnalyticsGet.mockResolvedValueOnce({
      docs: [
        {
          id: "analytics-1",
          data: () => ({
            userId: "user-1",
            publishedAt: localPublishedAt,
            publishedTime: "",
          }),
        },
        {
          id: "analytics-2",
          data: () => ({
            userId: "user-1",
            publishedAt: new Date("2024-01-02T05:06:00Z"),
            publishedTime: "05:06",
          }),
        },
      ],
    });

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
    expect(mockAnalyticsUpdate).toHaveBeenCalledTimes(1);
    expect(mockAnalyticsUpdate).toHaveBeenCalledWith({
      publishedTime: "03:04",
    });
  });
});
