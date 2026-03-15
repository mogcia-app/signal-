/** @jest-environment node */

import { createJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockSearchSimilarQuestions = jest.fn();

jest.mock("@/repositories/rag-repository", () => ({
  RagRepository: {
    searchSimilarQuestions: (...args: unknown[]) => mockSearchSimilarQuestions(...args),
    recordLearningData: jest.fn(),
    saveVectorDocument: jest.fn(),
    updateUsageCount: jest.fn(),
  },
}));

jest.mock("../../../lib/server/auth-context", () => {
  const actual = jest.requireActual("../../../lib/server/auth-context");
  return {
    ...actual,
    requireAuthContext: (...args: unknown[]) => mockRequireAuthContext(...args),
  };
});

describe("API regression foundation: /api/rag", () => {
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
    const request = createJsonRequest("http://localhost:3000/api/rag?action=search&question=test");
    const response = await GET(request as never);
    const body = await readJson<{ success: boolean; error: string; code: string }>(response);

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: "Missing Bearer token",
      code: "UNAUTHORIZED",
    });
  });

  test("returns 403 when another user's rag data is requested", async () => {
    const { GET } = await loadRoute();
    const request = createJsonRequest(
      "http://localhost:3000/api/rag?action=search&question=test&userId=user-2",
    );
    const response = await GET(request as never);
    const body = await readJson<{ success: boolean; error: string; code: string }>(response);

    expect(response.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: "他のユーザーのRAGデータにはアクセスできません",
      code: "FORBIDDEN",
    });
    expect(mockSearchSimilarQuestions).not.toHaveBeenCalled();
  });

  test("returns similar questions for the authenticated user", async () => {
    mockSearchSimilarQuestions.mockResolvedValueOnce([
      {
        id: "vector-1",
        userId: "user-1",
        question: "alpha beta",
        answer: "Keep a consistent cadence",
        vector: [1, 1],
        category: "general",
        tags: ["posting"],
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        usageCount: 1,
        qualityScore: 0.9,
        similarity: 0.92,
      },
    ]);

    const { GET } = await loadRoute();
    const request = createJsonRequest(
      "http://localhost:3000/api/rag?action=search&question=alpha%20beta&userId=user-1",
    );
    const response = await GET(request as never);
    const body = await readJson<{
      success: boolean;
      data: {
        similarQuestions: Array<{ id: string; question: string; similarity: number }>;
        hasSimilarQuestions: boolean;
        recommendedAction: string;
      };
    }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.hasSimilarQuestions).toBe(true);
    expect(body.data.recommendedAction).toBe("use_cached");
    expect(body.data.similarQuestions).toHaveLength(1);
    expect(body.data.similarQuestions[0]).toEqual(
      expect.objectContaining({
        id: "vector-1",
        question: "alpha beta",
      }),
    );
    expect(body.data.similarQuestions[0].similarity).toBeGreaterThanOrEqual(0.7);
  });
});
