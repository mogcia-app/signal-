/** @jest-environment node */

import { createJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockGetUserProfile = jest.fn();
const mockCanAccessFeature = jest.fn();
const mockPostList = jest.fn();

jest.mock("@/repositories/post-repository", () => ({
  PostRepository: {
    list: (...args: unknown[]) => mockPostList(...args),
  },
}));

jest.mock("../../../lib/server/auth-context", () => {
  const actual = jest.requireActual("../../../lib/server/auth-context");
  return {
    ...actual,
    requireAuthContext: (...args: unknown[]) => mockRequireAuthContext(...args),
  };
});

jest.mock("@/lib/server/user-profile", () => ({
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
}));

jest.mock("@/lib/plan-access", () => ({
  canAccessFeature: (...args: unknown[]) => mockCanAccessFeature(...args),
}));

jest.mock("@/lib/server/post-image-storage", () => ({
  uploadPostImageDataUrl: jest.fn(),
}));

describe("API regression foundation: /api/posts", () => {
  const loadRoute = async () => import("./route");
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockRequireAuthContext.mockResolvedValue({ uid: "user-1" });
    mockGetUserProfile.mockResolvedValue({ plan: "matsu" });
    mockCanAccessFeature.mockReturnValue(true);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  test("returns 401 when auth context rejects", async () => {
    const { UnauthorizedError } = jest.requireActual("../../../lib/server/auth-context") as {
      UnauthorizedError: new (message?: string) => Error;
    };

    mockRequireAuthContext.mockRejectedValueOnce(new UnauthorizedError("Missing Bearer token"));

    const { GET } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/posts");
    const response = await GET(request as never);
    const body = await readJson<{ success: boolean; error: string; code: string }>(response);

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: "Missing Bearer token",
      code: "UNAUTHORIZED",
    });
  });

  test("returns 403 when another user's posts are requested", async () => {
    const { GET } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/posts?userId=user-2");
    const response = await GET(request as never);
    const body = await readJson<{ error: string }>(response);

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: "別ユーザーの投稿にはアクセスできません",
    });
    expect(mockPostList).not.toHaveBeenCalled();
  });

  test("returns posts for the authenticated user when feature access is allowed", async () => {
    mockPostList.mockResolvedValueOnce({
      total: 1,
      posts: [
        {
          id: "post-1",
          userId: "user-1",
          title: "Post title",
          content: "Post body",
          postType: "feed",
          status: "draft",
          hashtags: [],
          scheduledDate: null,
          scheduledTime: null,
          imageUrl: null,
          analytics: null,
          snapshotReferences: [],
          generationReferences: [],
          createdAt: new Date("2024-01-02T03:04:05Z"),
          updatedAt: new Date("2024-01-02T03:04:05Z"),
        },
      ],
    });

    const { GET } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/posts?userId=user-1");
    const response = await GET(request as never);
    const body = await readJson<{
      posts: Array<{ id: string; title: string; userId: string }>;
      total: number;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.posts).toHaveLength(1);
    expect(body.posts[0]).toEqual(
      expect.objectContaining({
        id: "post-1",
        userId: "user-1",
        title: "Post title",
      }),
    );
    expect(mockGetUserProfile).toHaveBeenCalledWith("user-1");
    expect(mockCanAccessFeature).toHaveBeenCalledWith({ plan: "matsu" }, "canAccessPosts");
    expect(mockPostList).toHaveBeenCalledWith({
      userId: "user-1",
      status: null,
      postType: null,
      limit: 50,
    });
  });
});
