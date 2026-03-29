/** @jest-environment node */

import { createNextJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockGetInstagramAccountForClient = jest.fn();
const mockUpsertInstagramAccount = jest.fn();

jest.mock("@/lib/server/auth-context", () => {
  const actual = jest.requireActual("@/lib/server/auth-context");
  return {
    ...actual,
    requireAuthContext: (...args: unknown[]) => mockRequireAuthContext(...args),
  };
});

jest.mock("@/lib/server/instagram-scheduler", () => ({
  getInstagramAccountForClient: (...args: unknown[]) => mockGetInstagramAccountForClient(...args),
  upsertInstagramAccount: (...args: unknown[]) => mockUpsertInstagramAccount(...args),
}));

describe("API regression foundation: /api/instagram/account", () => {
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

  test("returns the authenticated user's account", async () => {
    mockGetInstagramAccountForClient.mockResolvedValueOnce({
      id: "acc-1",
      client_id: "user-1",
      instagram_user_id: "1784",
      page_access_token: "token-value",
      token_expire_at: new Date("2099-01-01T00:00:00Z"),
    });

    const { GET } = await loadRoute();
    const response = await GET(createNextJsonRequest("http://localhost:3000/api/instagram/account") as never);
    const body = await readJson<{
      success: boolean;
      data: { account: { clientId: string; instagramUserId: string } | null };
    }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.account).toEqual(
      expect.objectContaining({
        clientId: "user-1",
        instagramUserId: "1784",
      }),
    );
  });

  test("returns 400 when required fields are missing", async () => {
    const { PUT } = await loadRoute();
    const response = await PUT(
      createNextJsonRequest("http://localhost:3000/api/instagram/account", {
        method: "PUT",
        body: { instagramUserId: "1784" },
      }) as never,
    );
    const body = await readJson<{ success: boolean; error: string }>(response);

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: "instagramUserId, pageAccessToken are required.",
    });
  });

  test("upserts the authenticated user's account", async () => {
    mockUpsertInstagramAccount.mockResolvedValueOnce({
      id: "acc-1",
      client_id: "user-1",
      instagram_user_id: "1784",
      page_access_token: "token-value",
      token_expire_at: new Date("2099-01-01T00:00:00Z"),
    });

    const { PUT } = await loadRoute();
    const response = await PUT(
      createNextJsonRequest("http://localhost:3000/api/instagram/account", {
        method: "PUT",
        body: {
          instagramUserId: "1784",
          pageAccessToken: "token-value",
          tokenExpireAt: "2099-01-01T00:00:00.000Z",
        },
      }) as never,
    );
    const body = await readJson<{
      success: boolean;
      data: { account: { clientId: string; instagramUserId: string; tokenExpireAt: string | null } };
    }>(response);

    expect(response.status).toBe(200);
    expect(body.data.account).toEqual({
      id: "acc-1",
      clientId: "user-1",
      instagramUserId: "1784",
      pageAccessToken: "token-value",
      tokenExpireAt: "2099-01-01T00:00:00.000Z",
    });
    expect(mockUpsertInstagramAccount).toHaveBeenCalledWith({
      clientId: "user-1",
      instagramUserId: "1784",
      pageAccessToken: "token-value",
      tokenExpireAt: new Date("2099-01-01T00:00:00.000Z"),
    });
  });
});
