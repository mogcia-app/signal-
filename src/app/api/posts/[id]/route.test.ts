/** @jest-environment node */

import { createJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockGetUserProfile = jest.fn();
const mockCanAccessFeature = jest.fn();
const mockPostGetById = jest.fn();

jest.mock("@/repositories/post-repository", () => ({
  PostRepository: {
    getById: (...args: unknown[]) => mockPostGetById(...args),
    updateById: jest.fn(),
    deleteById: jest.fn(),
  },
}));

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

jest.mock("@/lib/plan-access", () => ({
  canAccessFeature: (...args: unknown[]) => mockCanAccessFeature(...args),
}));

jest.mock("@/lib/server/post-image-storage", () => ({
  deletePostImageByUrl: jest.fn(),
  uploadPostImageDataUrl: jest.fn(),
}));

describe("API regression foundation: /api/posts/[id]", () => {
  const loadRoute = async () => import("./route");
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    mockRequireAuthContext.mockResolvedValue({ uid: "user-1" });
    mockGetUserProfile.mockResolvedValue({ plan: "matsu" });
    mockCanAccessFeature.mockReturnValue(true);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  test("returns 401 when auth context rejects", async () => {
    const { UnauthorizedError } = jest.requireActual("@/lib/server/auth-context") as {
      UnauthorizedError: new (message?: string) => Error;
    };

    mockRequireAuthContext.mockRejectedValueOnce(new UnauthorizedError("Missing Bearer token"));

    const { GET } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/posts/post-1");
    const response = await GET(request as never, { params: Promise.resolve({ id: "post-1" }) });
    const body = await readJson<{ success: boolean; error: string; code: string }>(response);

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: "Missing Bearer token",
      code: "UNAUTHORIZED",
    });
  });

  test("returns 403 when plan access is denied", async () => {
    mockCanAccessFeature.mockReturnValueOnce(false);

    const { GET } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/posts/post-1");
    const response = await GET(request as never, { params: Promise.resolve({ id: "post-1" }) });
    const body = await readJson<{ error: string }>(response);

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: "投稿管理機能は、現在のプランではご利用いただけません。",
    });
    expect(mockPostGetById).not.toHaveBeenCalled();
  });

  test("returns the requested post when authorized", async () => {
    mockPostGetById.mockResolvedValueOnce({
      id: "post-1",
      userId: "user-1",
      title: "Post title",
      content: "Post body",
      hashtags: [],
      postType: "feed",
      status: "draft",
      scheduledDate: null,
      scheduledTime: null,
      imageUrl: null,
      analytics: null,
      snapshotReferences: [],
      generationReferences: [],
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-02T00:00:00Z"),
    });

    const { GET } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/posts/post-1");
    const response = await GET(request as never, { params: Promise.resolve({ id: "post-1" }) });
    const body = await readJson<{ post: { id: string; title: string; userId: string } }>(response);

    expect(response.status).toBe(200);
    expect(body.post).toEqual(
      expect.objectContaining({
        id: "post-1",
        userId: "user-1",
        title: "Post title",
      }),
    );
    expect(mockPostGetById).toHaveBeenCalledWith("user-1", "post-1");
  });
});
