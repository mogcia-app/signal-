/** @jest-environment node */

import { createJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockVectorDocumentsGet = jest.fn();
const mockLearningDataAdd = jest.fn();

jest.mock("firebase-admin", () => ({
  firestore: {
    FieldValue: {
      increment: (value: number) => ({ __increment: value }),
    },
  },
}));

jest.mock("../../../lib/firebase-admin", () => ({
  adminDb: {
    collection: (name: string) => {
      if (name === "vector_documents") {
        return {
          where: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({
                  get: (...args: unknown[]) => mockVectorDocumentsGet(...args),
                }),
              }),
            }),
          }),
        };
      }

      if (name === "learning_data") {
        return {
          add: (...args: unknown[]) => mockLearningDataAdd(...args),
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    },
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

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockRequireAuthContext.mockResolvedValue({ uid: "user-1" });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
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
    expect(mockVectorDocumentsGet).not.toHaveBeenCalled();
  });

  test("returns similar questions for the authenticated user", async () => {
    const matchingVector = new Array(100).fill(0);
    matchingVector[0] = 1;
    matchingVector[1] = 1;

    mockVectorDocumentsGet.mockResolvedValueOnce({
      docs: [
        {
          id: "vector-1",
          data: () => ({
            userId: "user-1",
            question: "alpha beta",
            answer: "Keep a consistent cadence",
            vector: matchingVector,
            category: "general",
            tags: ["posting"],
            createdAt: new Date("2024-01-01T00:00:00Z"),
            updatedAt: new Date("2024-01-01T00:00:00Z"),
            usageCount: 1,
            qualityScore: 0.9,
          }),
        },
      ],
    });

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
