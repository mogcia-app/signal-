/** @jest-environment node */

import { createNextJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAdminContext = jest.fn();
const mockPublishDueScheduledPosts = jest.fn();

jest.mock("@/lib/server/admin-auth", () => ({
  requireAdminContext: (...args: unknown[]) => mockRequireAdminContext(...args),
}));

jest.mock("@/lib/server/instagram-scheduler", () => ({
  publishDueScheduledPosts: (...args: unknown[]) => mockPublishDueScheduledPosts(...args),
}));

describe("API regression foundation: /api/admin/instagram-scheduler/publish-due", () => {
  const loadRoute = async () => import("./route");

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminContext.mockResolvedValue({ uid: "admin-1" });
  });

  test("publishes due posts for admins", async () => {
    mockPublishDueScheduledPosts.mockResolvedValueOnce({
      attempted: 3,
      published: 2,
      failed: 1,
    });

    const { POST } = await loadRoute();
    const response = await POST(
      createNextJsonRequest("http://localhost:3000/api/admin/instagram-scheduler/publish-due", {
        method: "POST",
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
        attempted: 3,
        published: 2,
        failed: 1,
      },
    });
  });
});
