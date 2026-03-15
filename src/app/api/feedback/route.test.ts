/** @jest-environment node */

import { createJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockFeedbackCreate = jest.fn();
const mockFeedbackListByUser = jest.fn();

jest.mock("@/repositories/feedback-repository", () => ({
  FeedbackRepository: {
    create: (...args: unknown[]) => mockFeedbackCreate(...args),
    listByUser: (...args: unknown[]) => mockFeedbackListByUser(...args),
  },
}));

jest.mock("../../../lib/server/auth-context", () => {
  const actual = jest.requireActual("../../../lib/server/auth-context");
  return {
    ...actual,
    requireAuthContext: (...args: unknown[]) => mockRequireAuthContext(...args),
  };
});

describe("API regression foundation: /api/feedback", () => {
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
    const { UnauthorizedError } = jest.requireActual("../../../lib/server/auth-context") as {
      UnauthorizedError: new (message?: string) => Error;
    };

    mockRequireAuthContext.mockRejectedValueOnce(new UnauthorizedError("Missing Bearer token"));

    const { GET } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/feedback");
    const response = await GET(request as never);
    const body = await readJson<{ success: boolean; error: string; code: string }>(response);

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: "Missing Bearer token",
      code: "UNAUTHORIZED",
    });
  });

  test("returns 403 when another user's feedback is requested", async () => {
    const { GET } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/feedback?userId=user-2");
    const response = await GET(request as never);
    const body = await readJson<{ success: boolean; error: string; code: string }>(response);

    expect(response.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: "他のユーザーのフィードバックにはアクセスできません",
      code: "FORBIDDEN",
    });
    expect(mockFeedbackListByUser).not.toHaveBeenCalled();
  });

  test("creates feedback for the authenticated user", async () => {
    mockFeedbackCreate.mockResolvedValueOnce({ id: "feedback-1" });

    const { POST } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/feedback", {
      method: "POST",
      body: {
        userId: "user-1",
        pageType: "analytics",
        satisfaction: "satisfied",
        feedback: "helpful",
        contextData: { source: "test" },
      },
    });
    const response = await POST(request as never);
    const body = await readJson<{ success: boolean; message: string; id: string }>(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      message: "フィードバックが保存されました",
      id: "feedback-1",
    });
    expect(mockFeedbackCreate).toHaveBeenCalledTimes(1);
    expect(mockFeedbackCreate.mock.calls[0][0]).toMatchObject({
      userId: "user-1",
      pageType: "analytics",
      satisfaction: "satisfied",
      feedback: "helpful",
      contextData: { source: "test" },
    });
  });
});
