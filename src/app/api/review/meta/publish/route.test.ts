/** @jest-environment node */

import { createNextJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockParseScheduledAt = jest.fn();
const mockCreateScheduledPost = jest.fn();

jest.mock("@/lib/server/auth-context", () => {
  const actual = jest.requireActual("@/lib/server/auth-context");
  return {
    ...actual,
    requireAuthContext: (...args: unknown[]) => mockRequireAuthContext(...args),
  };
});

jest.mock("@/lib/server/instagram-scheduler", () => ({
  parseScheduledAt: (...args: unknown[]) => mockParseScheduledAt(...args),
  createScheduledPost: (...args: unknown[]) => mockCreateScheduledPost(...args),
}));

describe("API regression foundation: /api/review/meta/publish", () => {
  const loadRoute = async () => import("./route");
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockRequireAuthContext.mockResolvedValue({ uid: "user-1" });
    mockParseScheduledAt.mockReturnValue(new Date("2025-01-01T00:00:00.000Z"));
    mockCreateScheduledPost.mockResolvedValue({
      id: "scheduled-1",
      client_id: "user-1",
      image_url: "https://example.com/image.png",
      caption: "caption",
      creation_id: "17890001",
      scheduled_time: new Date("2025-01-01T00:00:00.000Z"),
      status: "scheduled",
      created_at: new Date("2024-12-31T00:00:00.000Z"),
      updated_at: new Date("2024-12-31T00:00:00.000Z"),
      published_at: null,
      published_media_id: null,
      last_error: null,
    });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  test("returns 401 when auth context rejects", async () => {
    const { UnauthorizedError } = jest.requireActual("@/lib/server/auth-context") as {
      UnauthorizedError: new (message?: string) => Error;
    };

    mockRequireAuthContext.mockRejectedValueOnce(new UnauthorizedError("Missing Bearer token"));

    const { POST } = await loadRoute();
    const request = createNextJsonRequest("http://localhost:3000/api/review/meta/publish", {
      method: "POST",
      body: {
        caption: "caption",
        imageUrl: "https://example.com/image.png",
        scheduledAt: "2025-01-01T00:00:00.000Z",
      },
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

  test("returns 400 when required publish fields are missing", async () => {
    const { POST } = await loadRoute();
    const request = createNextJsonRequest("http://localhost:3000/api/review/meta/publish", {
      method: "POST",
      body: {
        caption: "caption only",
      },
    });
    const response = await POST(request as never);
    const body = await readJson<{ success: boolean; error: string }>(response);

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: "caption, imageUrl, scheduledAt are required.",
    });
  });

  test("creates a live publish container for authenticated requests", async () => {
    const { POST } = await loadRoute();
    const request = createNextJsonRequest("http://localhost:3000/api/review/meta/publish", {
      method: "POST",
      body: {
        caption: "caption",
        imageUrl: "https://example.com/image.png",
        scheduledAt: "2025-01-01T00:00:00.000Z",
      },
    });
    const response = await POST(request as never);
    const body = await readJson<{
      success: boolean;
      data: { creationId: string; scheduledPublishTime: string; note: string };
    }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.creationId).toBe("17890001");
    expect(body.data.scheduledPublishTime).toBe("2025-01-01T00:00:00.000Z");
    expect(body.data.note).toContain("Instagram Graph API");
    expect(mockParseScheduledAt).toHaveBeenCalledWith("2025-01-01T00:00:00.000Z");
    expect(mockCreateScheduledPost).toHaveBeenCalledWith({
      clientId: "user-1",
      imageUrl: "https://example.com/image.png",
      caption: "caption",
      scheduledAt: new Date("2025-01-01T00:00:00.000Z"),
    });
  });
});
