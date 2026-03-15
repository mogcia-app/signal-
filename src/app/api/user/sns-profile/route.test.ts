/** @jest-environment node */

import { createJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockGetSnsProfiles = jest.fn();

jest.mock("@/repositories/user-profile-repository", () => ({
  UserProfileRepository: {
    getSnsProfiles: (...args: unknown[]) => mockGetSnsProfiles(...args),
    updateSnsProfile: jest.fn(),
  },
}));

jest.mock("@/lib/server/auth-context", () => {
  const actual = jest.requireActual("@/lib/server/auth-context");
  return {
    ...actual,
    requireAuthContext: (...args: unknown[]) => mockRequireAuthContext(...args),
  };
});

describe("API regression foundation: /api/user/sns-profile", () => {
  const loadRoute = async () => import("./route");
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockRequireAuthContext.mockResolvedValue({ uid: "user-1" });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  test("returns 401 when auth context rejects", async () => {
    const { UnauthorizedError } = jest.requireActual("@/lib/server/auth-context") as {
      UnauthorizedError: new (message?: string) => Error;
    };

    mockRequireAuthContext.mockRejectedValueOnce(new UnauthorizedError("Missing Bearer token"));

    const { GET } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/user/sns-profile");
    const response = await GET(request as never);
    const body = await readJson<{ success: boolean; error: string; code: string }>(response);

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: "Missing Bearer token",
      code: "UNAUTHORIZED",
    });
  });

  test("returns 403 when another user's sns profile is requested", async () => {
    const { GET } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/user/sns-profile?userId=user-2");
    const response = await GET(request as never);
    const body = await readJson<{ success: boolean; error: string; code: string }>(response);

    expect(response.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: "他のユーザーのSNSプロフィールにはアクセスできません",
      code: "FORBIDDEN",
    });
    expect(mockGetSnsProfiles).not.toHaveBeenCalled();
  });

  test("returns the authenticated user's sns profiles when authorized", async () => {
    mockGetSnsProfiles.mockResolvedValueOnce({
      instagram: { handle: "@user-1" },
    });

    const { GET } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/user/sns-profile?userId=user-1");
    const response = await GET(request as never);
    const body = await readJson<{ snsProfiles: { instagram: { handle: string } } }>(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      snsProfiles: {
        instagram: { handle: "@user-1" },
      },
    });
    expect(mockGetSnsProfiles).toHaveBeenCalledTimes(1);
  });
});
