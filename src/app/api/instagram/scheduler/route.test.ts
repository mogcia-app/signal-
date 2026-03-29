/** @jest-environment node */

import { createNextJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockUploadPostImageDataUrl = jest.fn();
const mockGetInstagramAccountForClient = jest.fn();
const mockListScheduledPostsForClient = jest.fn();
const mockCreateScheduledPost = jest.fn();

jest.mock("@/lib/server/auth-context", () => {
  const actual = jest.requireActual("@/lib/server/auth-context");
  return {
    ...actual,
    requireAuthContext: (...args: unknown[]) => mockRequireAuthContext(...args),
  };
});

jest.mock("@/lib/server/post-image-storage", () => ({
  uploadPostImageDataUrl: (...args: unknown[]) => mockUploadPostImageDataUrl(...args),
}));

jest.mock("@/lib/server/instagram-scheduler", () => ({
  getInstagramAccountForClient: (...args: unknown[]) => mockGetInstagramAccountForClient(...args),
  listScheduledPostsForClient: (...args: unknown[]) => mockListScheduledPostsForClient(...args),
  createScheduledPost: (...args: unknown[]) => mockCreateScheduledPost(...args),
  parseScheduledAt: jest.requireActual("@/lib/server/instagram-scheduler").parseScheduledAt,
}));

describe("API regression foundation: /api/instagram/scheduler", () => {
  const loadRoute = async () => import("./route");
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockRequireAuthContext.mockResolvedValue({ uid: "user-1" });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  test("returns scheduled posts for the authenticated client", async () => {
    mockGetInstagramAccountForClient.mockResolvedValueOnce({
      id: "acc-1",
      client_id: "user-1",
      instagram_user_id: "ig-user",
      page_access_token: "token",
      token_expire_at: new Date("2026-01-01T00:00:00Z"),
    });
    mockListScheduledPostsForClient.mockResolvedValueOnce([
      {
        id: "post-1",
        image_url: "https://example.com/image.jpg",
        caption: "caption",
        creation_id: "creation-1",
        scheduled_time: new Date("2026-01-02T00:00:00Z"),
        status: "scheduled",
        published_at: null,
        last_error: null,
      },
    ]);

    const { GET } = await loadRoute();
    const response = await GET(createNextJsonRequest("http://localhost:3000/api/instagram/scheduler") as never);
    const body = await readJson<{
      success: boolean;
      data: { accountConnected: boolean; posts: Array<{ id: string; status: string }> };
    }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.accountConnected).toBe(true);
    expect(body.data.posts).toHaveLength(1);
    expect(body.data.posts[0]).toEqual(expect.objectContaining({ id: "post-1", status: "scheduled" }));
  });

  test("returns 400 when required fields are missing on create", async () => {
    const { POST } = await loadRoute();
    const response = await POST(
      createNextJsonRequest("http://localhost:3000/api/instagram/scheduler", {
        method: "POST",
        body: { caption: "only caption" },
      }) as never,
    );
    const body = await readJson<{ success: boolean; error: string }>(response);

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: "imageData, caption, scheduledAt are required.",
    });
  });

  test("creates a scheduled post for valid input", async () => {
    mockUploadPostImageDataUrl.mockResolvedValueOnce({
      imageUrl: "https://example.com/uploaded.jpg",
      storagePath: "posts/user-1/test.jpg",
    });
    mockCreateScheduledPost.mockResolvedValueOnce({
      id: "scheduled-1",
      image_url: "https://example.com/uploaded.jpg",
      caption: "test caption",
      creation_id: "creation-1",
      scheduled_time: new Date("2099-01-01T01:00:00Z"),
      status: "scheduled",
    });

    const { POST } = await loadRoute();
    const response = await POST(
      createNextJsonRequest("http://localhost:3000/api/instagram/scheduler", {
        method: "POST",
        body: {
          imageData: "data:image/png;base64,aGVsbG8=",
          caption: "test caption",
          scheduledAt: "2099-01-01T01:00:00.000Z",
        },
      }) as never,
    );
    const body = await readJson<{
      success: boolean;
      data: { id: string; creationId: string; status: string };
    }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({
      id: "scheduled-1",
      imageUrl: "https://example.com/uploaded.jpg",
      caption: "test caption",
      creationId: "creation-1",
      scheduledTime: "2099-01-01T01:00:00.000Z",
      status: "scheduled",
    });
    expect(mockUploadPostImageDataUrl).toHaveBeenCalledWith({
      userId: "user-1",
      imageDataUrl: "data:image/png;base64,aGVsbG8=",
    });
  });
});
