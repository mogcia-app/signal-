/** @jest-environment node */

import { createNextJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockPublishDueScheduledPosts = jest.fn();

jest.mock("@/lib/server/instagram-scheduler", () => ({
  publishDueScheduledPosts: (...args: unknown[]) => mockPublishDueScheduledPosts(...args),
}));

describe("API regression foundation: /api/instagram/scheduler/publish-due", () => {
  const loadRoute = async () => import("./route");
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = "secret";
  });

  afterAll(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  test("returns 401 when cron secret is missing", async () => {
    const { POST } = await loadRoute();
    const response = await POST(
      createNextJsonRequest("http://localhost:3000/api/instagram/scheduler/publish-due", {
        method: "POST",
      }) as never,
    );
    const body = await readJson<{ success: boolean; error: string }>(response);

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: "Unauthorized",
    });
  });

  test("publishes due posts when authorized", async () => {
    mockPublishDueScheduledPosts.mockResolvedValueOnce({
      attempted: 2,
      published: 2,
      failed: 0,
    });

    const { POST } = await loadRoute();
    const response = await POST(
      createNextJsonRequest("http://localhost:3000/api/instagram/scheduler/publish-due", {
        method: "POST",
        headers: {
          authorization: "Bearer secret",
        },
      }) as never,
    );
    const body = await readJson<{
      success: boolean;
      data: { attempted: number; published: number; failed: number };
    }>(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        attempted: 2,
        published: 2,
        failed: 0,
      },
    });
  });
});
