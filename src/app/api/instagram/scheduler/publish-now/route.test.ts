/** @jest-environment node */

import { createNextJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockPublishDueScheduledPosts = jest.fn();

jest.mock("@/lib/server/auth-context", () => {
  const actual = jest.requireActual("@/lib/server/auth-context");
  return {
    ...actual,
    requireAuthContext: (...args: unknown[]) => mockRequireAuthContext(...args),
  };
});

jest.mock("@/lib/server/instagram-scheduler", () => ({
  publishDueScheduledPosts: (...args: unknown[]) => mockPublishDueScheduledPosts(...args),
}));

describe("API regression foundation: /api/instagram/scheduler/publish-now", () => {
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

  test("publishes due posts for the authenticated user", async () => {
    mockPublishDueScheduledPosts.mockResolvedValueOnce({
      attempted: 1,
      published: 1,
      failed: 0,
    });

    const { POST } = await loadRoute();
    const response = await POST(
      createNextJsonRequest("http://localhost:3000/api/instagram/scheduler/publish-now", {
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
        attempted: 1,
        published: 1,
        failed: 0,
      },
    });
  });
});
