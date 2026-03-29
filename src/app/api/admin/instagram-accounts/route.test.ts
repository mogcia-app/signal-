/** @jest-environment node */

import { createNextJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAdminContext = jest.fn();
const mockGetInstagramAccountForClient = jest.fn();
const mockListInstagramAccounts = jest.fn();
const mockUpsertInstagramAccount = jest.fn();

jest.mock("@/lib/server/admin-auth", () => ({
  requireAdminContext: (...args: unknown[]) => mockRequireAdminContext(...args),
}));

jest.mock("@/lib/server/instagram-scheduler", () => ({
  getInstagramAccountForClient: (...args: unknown[]) => mockGetInstagramAccountForClient(...args),
  listInstagramAccounts: (...args: unknown[]) => mockListInstagramAccounts(...args),
  upsertInstagramAccount: (...args: unknown[]) => mockUpsertInstagramAccount(...args),
}));

describe("API regression foundation: /api/admin/instagram-accounts", () => {
  const loadRoute = async () => import("./route");

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminContext.mockResolvedValue({ uid: "admin-1" });
  });

  test("returns account details for a client uid", async () => {
    mockGetInstagramAccountForClient.mockResolvedValueOnce({
      id: "acc-1",
      client_id: "user-1",
      instagram_user_id: "1784",
      page_access_token: "token-value",
      token_expire_at: new Date("2099-01-01T00:00:00Z"),
    });

    const { GET } = await loadRoute();
    const response = await GET(
      createNextJsonRequest("http://localhost:3000/api/admin/instagram-accounts?clientId=user-1") as never,
    );
    const body = await readJson<{
      success: boolean;
      data: { account: { clientId: string; instagramUserId: string; pageAccessToken: string } | null };
    }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.account).toEqual(
      expect.objectContaining({
        clientId: "user-1",
        instagramUserId: "1784",
        pageAccessToken: "token-value",
      }),
    );
  });

  test("returns 400 when required fields are missing on update", async () => {
    const { PUT } = await loadRoute();
    const response = await PUT(
      createNextJsonRequest("http://localhost:3000/api/admin/instagram-accounts", {
        method: "PUT",
        body: { clientId: "user-1" },
      }) as never,
    );
    const body = await readJson<{ success: boolean; error: string }>(response);

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: "clientId, instagramUserId, pageAccessToken are required.",
    });
  });

  test("upserts account configuration", async () => {
    mockUpsertInstagramAccount.mockResolvedValueOnce({
      id: "acc-1",
      client_id: "user-1",
      instagram_user_id: "1784",
      page_access_token: "token-value",
      token_expire_at: new Date("2099-01-01T00:00:00Z"),
    });

    const { PUT } = await loadRoute();
    const response = await PUT(
      createNextJsonRequest("http://localhost:3000/api/admin/instagram-accounts", {
        method: "PUT",
        body: {
          clientId: "user-1",
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
    expect(body.success).toBe(true);
    expect(body.data.account).toEqual({
      id: "acc-1",
      clientId: "user-1",
      instagramUserId: "1784",
      pageAccessToken: "token-value",
      tokenExpireAt: "2099-01-01T00:00:00.000Z",
    });
  });
});
