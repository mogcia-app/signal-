/** @jest-environment node */

import { createNextJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockGetMetaReviewConnectionStatus = jest.fn();

jest.mock("@/lib/server/auth-context", () => {
  const actual = jest.requireActual("@/lib/server/auth-context");
  return {
    ...actual,
    requireAuthContext: (...args: unknown[]) => mockRequireAuthContext(...args),
  };
});

jest.mock("@/lib/server/meta-review", () => ({
  getMetaReviewConnectionStatus: (...args: unknown[]) => mockGetMetaReviewConnectionStatus(...args),
}));

describe("API regression foundation: /api/review/meta/connect/status", () => {
  const loadRoute = async () => import("./route");
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockRequireAuthContext.mockResolvedValue({ uid: "user-1" });
    mockGetMetaReviewConnectionStatus.mockResolvedValue({
      pageConnected: true,
      instagramConnected: true,
      pageId: "page-1",
      instagramAccountId: "ig-1",
      note: "Connected page token can access the linked Instagram Business account.",
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

    const { GET } = await loadRoute();
    const request = createNextJsonRequest("http://localhost:3000/api/review/meta/connect/status");
    const response = await GET(request as never);
    const body = await readJson<{ success: boolean; error: string; code: string }>(response);

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: "Missing Bearer token",
      code: "UNAUTHORIZED",
    });
  });

  test("returns live connection status for authenticated requests", async () => {
    const { GET } = await loadRoute();
    const request = createNextJsonRequest("http://localhost:3000/api/review/meta/connect/status");
    const response = await GET(request as never);
    const body = await readJson<{
      success: boolean;
      data: {
        pageConnected: boolean;
        instagramConnected: boolean;
        pageId: string | null;
        instagramAccountId: string | null;
        note: string;
      };
    }>(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        pageConnected: true,
        instagramConnected: true,
        pageId: "page-1",
        instagramAccountId: "ig-1",
        note: "Connected page token can access the linked Instagram Business account.",
      },
    });
    expect(mockGetMetaReviewConnectionStatus).toHaveBeenCalledWith("user-1");
  });
});
