/** @jest-environment node */

import { createJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockFindLegacyProfileByUserId = jest.fn();

jest.mock("@/repositories/user-profile-repository", () => ({
  UserProfileRepository: {
    findLegacyProfileByUserId: (...args: unknown[]) => mockFindLegacyProfileByUserId(...args),
    createLegacyProfile: jest.fn(),
    updateLegacyProfile: jest.fn(),
  },
}));

jest.mock("../../../lib/server/auth-context", () => {
  const actual = jest.requireActual("../../../lib/server/auth-context");
  return {
    ...actual,
    requireAuthContext: (...args: unknown[]) => mockRequireAuthContext(...args),
  };
});

describe("API regression foundation: /api/users", () => {
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
    const { UnauthorizedError } = jest.requireActual("../../../lib/server/auth-context") as {
      UnauthorizedError: new (message?: string) => Error;
    };

    mockRequireAuthContext.mockRejectedValueOnce(new UnauthorizedError("Missing Bearer token"));

    const { GET } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/users");
    const response = await GET(request as never);
    const body = await readJson<{ success: boolean; error: string; code: string }>(response);

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: "Missing Bearer token",
      code: "UNAUTHORIZED",
    });
  });

  test("returns 403 when another user's profile is requested", async () => {
    const { GET } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/users?userId=user-2");
    const response = await GET(request as never);
    const body = await readJson<{ success: boolean; error: string; code: string }>(response);

    expect(response.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: "他のユーザープロフィールにはアクセスできません",
      code: "FORBIDDEN",
    });
    expect(mockFindLegacyProfileByUserId).not.toHaveBeenCalled();
  });

  test("returns the authenticated user's profile when authorized", async () => {
    mockFindLegacyProfileByUserId.mockResolvedValueOnce({
      id: "profile-1",
      userId: "user-1",
      email: "user@example.com",
      displayName: "User One",
    });

    const { GET } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/users?userId=user-1");
    const response = await GET(request as never);
    const body = await readJson<{
      user: { id: string; userId: string; email: string; displayName: string };
    }>(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      user: {
        id: "profile-1",
        userId: "user-1",
        email: "user@example.com",
        displayName: "User One",
      },
    });
    expect(mockFindLegacyProfileByUserId).toHaveBeenCalledTimes(1);
  });
});
