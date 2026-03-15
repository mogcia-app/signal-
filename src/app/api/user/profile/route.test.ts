/** @jest-environment node */

import { createJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockGetUserDocument = jest.fn();
const mockUpdateUserDocument = jest.fn();

jest.mock("@/repositories/user-profile-repository", () => ({
  UserProfileRepository: {
    getUserDocument: (...args: unknown[]) => mockGetUserDocument(...args),
    updateUserDocument: (...args: unknown[]) => mockUpdateUserDocument(...args),
  },
}));

jest.mock("../../../../lib/server/auth-context", () => {
  const actual = jest.requireActual("../../../../lib/server/auth-context");
  return {
    ...actual,
    requireAuthContext: (...args: unknown[]) => mockRequireAuthContext(...args),
  };
});

describe("API regression foundation: /api/user/profile", () => {
  const loadRoute = async () => import("./route");
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockRequireAuthContext.mockResolvedValue({ uid: "user-1" });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  test("returns 401 when auth context rejects", async () => {
    const { UnauthorizedError } = jest.requireActual("../../../../lib/server/auth-context") as {
      UnauthorizedError: new (message?: string) => Error;
    };

    mockRequireAuthContext.mockRejectedValueOnce(new UnauthorizedError("Missing Bearer token"));

    const { GET } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/user/profile?userId=user-1");
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
    const request = createJsonRequest("http://localhost:3000/api/user/profile?userId=user-2");
    const response = await GET(request as never);
    const body = await readJson<{ success: boolean; error: string }>(response);

    expect(response.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: "Unauthorized",
    });
    expect(mockGetUserDocument).not.toHaveBeenCalled();
  });

  test("updates the authenticated user's profile", async () => {
    mockUpdateUserDocument.mockResolvedValueOnce({
      id: "user-1",
      email: "user@example.com",
      name: "Updated User",
      businessInfo: { companyName: "New Co" },
    });

    const { PUT } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/user/profile", {
      method: "PUT",
      body: {
        userId: "user-1",
        updates: {
          name: "Updated User",
          businessInfo: { companyName: "New Co" },
        },
      },
    });
    const response = await PUT(request as never);
    const body = await readJson<{
      success: boolean;
      data: { id: string; name: string; businessInfo: { companyName: string } };
      message: string;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Profile updated successfully");
    expect(body.data).toEqual({
      id: "user-1",
      email: "user@example.com",
      name: "Updated User",
      businessInfo: { companyName: "New Co" },
    });
    expect(mockUpdateUserDocument).toHaveBeenCalledTimes(1);
    expect(mockUpdateUserDocument).toHaveBeenCalledWith("user-1", {
      name: "Updated User",
      businessInfo: { companyName: "New Co" },
    });
  });
});
