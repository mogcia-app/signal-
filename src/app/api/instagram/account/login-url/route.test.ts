/** @jest-environment node */

import { createNextJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockCreateInstagramOAuthState = jest.fn();
const mockBuildInstagramOAuthLoginUrl = jest.fn();

jest.mock("@/lib/server/auth-context", () => {
  const actual = jest.requireActual("@/lib/server/auth-context");
  return {
    ...actual,
    requireAuthContext: (...args: unknown[]) => mockRequireAuthContext(...args),
  };
});

jest.mock("@/lib/server/meta-instagram-oauth", () => ({
  createInstagramOAuthState: (...args: unknown[]) => mockCreateInstagramOAuthState(...args),
  buildInstagramOAuthLoginUrl: (...args: unknown[]) => mockBuildInstagramOAuthLoginUrl(...args),
}));

describe("API regression foundation: /api/instagram/account/login-url", () => {
  const loadRoute = async () => import("./route");
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockRequireAuthContext.mockResolvedValue({ uid: "user-1" });
    mockCreateInstagramOAuthState.mockResolvedValue("state-1");
    mockBuildInstagramOAuthLoginUrl.mockReturnValue("https://www.facebook.com/dialog/oauth");
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  test("returns Meta login url for the authenticated user", async () => {
    const { POST } = await loadRoute();
    const response = await POST(
      createNextJsonRequest("http://localhost:3000/api/instagram/account/login-url", {
        method: "POST",
        body: { redirectPath: "/instagram/account" },
      }) as never,
    );
    const body = await readJson<{ success: boolean; data: { loginUrl: string } }>(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        loginUrl: "https://www.facebook.com/dialog/oauth",
      },
    });
    expect(mockCreateInstagramOAuthState).toHaveBeenCalledWith({
      uid: "user-1",
      redirectPath: "/instagram/account",
    });
  });
});
