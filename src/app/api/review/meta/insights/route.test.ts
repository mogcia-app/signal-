/** @jest-environment node */

import { createNextJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAdminContext = jest.fn();
const mockGetMetaReviewInsights = jest.fn();

jest.mock("@/lib/server/admin-auth", () => {
  const actual = jest.requireActual("@/lib/server/auth-context");
  return {
    ...actual,
    requireAdminContext: (...args: unknown[]) => mockRequireAdminContext(...args),
  };
});

jest.mock("@/lib/server/meta-review", () => ({
  getMetaReviewInsights: (...args: unknown[]) => mockGetMetaReviewInsights(...args),
}));

describe("API regression foundation: /api/review/meta/insights", () => {
  const loadRoute = async () => import("./route");
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockRequireAdminContext.mockResolvedValue({ uid: "user-1" });
    mockGetMetaReviewInsights.mockResolvedValue({
      mediaId: "media-1",
      metrics: [
        { name: "impressions", value: 1200 },
        { name: "reach", value: 980 },
        { name: "likes", value: 140 },
        { name: "comments", value: 12 },
        { name: "saved", value: 22 },
      ],
      note: "Metrics fetched from the Instagram Graph API for the requested media.",
    });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  test("returns 401 when admin context rejects", async () => {
    const { UnauthorizedError } = jest.requireActual("@/lib/server/auth-context") as {
      UnauthorizedError: new (message?: string) => Error;
    };

    mockRequireAdminContext.mockRejectedValueOnce(new UnauthorizedError("Missing Bearer token"));

    const { GET } = await loadRoute();
    const request = createNextJsonRequest(
      "http://localhost:3000/api/review/meta/insights?mediaId=media-1",
    );
    const response = await GET(request as never);
    const body = await readJson<{ success: boolean; error: string; code: string }>(response);

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: "Missing Bearer token",
      code: "UNAUTHORIZED",
    });
  });

  test("returns live insights for admin requests", async () => {
    const { GET } = await loadRoute();
    const request = createNextJsonRequest(
      "http://localhost:3000/api/review/meta/insights?mediaId=media-1",
    );
    const response = await GET(request as never);
    const body = await readJson<{
      success: boolean;
      data: {
        mediaId: string;
        metrics: Array<{ name: string; value: number }>;
        note: string;
      };
    }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.mediaId).toBe("media-1");
    expect(body.data.metrics).toHaveLength(5);
    expect(body.data.note).toContain("Instagram Graph API");
    expect(mockGetMetaReviewInsights).toHaveBeenCalledWith({
      clientId: "user-1",
      mediaId: "media-1",
    });
  });
});
