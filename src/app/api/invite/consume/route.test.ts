/** @jest-environment node */

import { createJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockConsumeLogAdd = jest.fn();
const mockVerifyInviteToken = jest.fn();
const mockNormalizeEmail = jest.fn((value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "",
);

jest.mock("@/lib/firebase-admin", () => ({
  getAdminDb: () => ({
    collection: (name: string) => {
      if (name !== "inviteConsumeLogs") {
        throw new Error(`Unexpected collection: ${name}`);
      }

      return {
        add: (...args: unknown[]) => mockConsumeLogAdd(...args),
      };
    },
  }),
}));

jest.mock("@/lib/server/invite-token", () => {
  class MockInviteTokenError extends Error {
    constructor(
      message: string,
      public readonly code:
        | "INVITE_SECRET_MISSING"
        | "INVITE_SIGNATURE_INVALID"
        | "INVITE_EXPIRED"
        | "INVITE_PAYLOAD_INVALID",
    ) {
      super(message);
      this.name = "InviteTokenError";
    }
  }

  return {
    InviteTokenError: MockInviteTokenError,
    verifyInviteToken: (token: string) => mockVerifyInviteToken(token),
    normalizeEmail: (value: unknown) => mockNormalizeEmail(value),
  };
});

describe("API regression foundation: /api/invite/consume", () => {
  const loadRoute = async () => import("./route");
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockVerifyInviteToken.mockResolvedValue({
      userId: "user-1",
      userEmail: "USER@example.com",
      nonce: "nonce-1",
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("allows public access with a valid invite token", async () => {
    mockConsumeLogAdd.mockResolvedValueOnce({ id: "consume-1" });

    const { POST } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/invite/consume", {
      method: "POST",
      body: { token: "signed-token" },
    });
    const response = await POST(request as never);
    const body = await readJson<{
      success: boolean;
      next: string;
      data: { userId: string; userEmail: string };
    }>(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      next: "/login",
      data: {
        userId: "user-1",
        userEmail: "user@example.com",
      },
    });
    expect(mockVerifyInviteToken).toHaveBeenCalledWith("signed-token");
    expect(mockConsumeLogAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        userEmail: "user@example.com",
        nonce: "nonce-1",
        source: "invite_link",
      }),
    );
  });

  test("returns 400 when token is missing", async () => {
    const { POST } = await loadRoute();
    const request = createJsonRequest("http://localhost:3000/api/invite/consume", {
      method: "POST",
      body: {},
    });
    const response = await POST(request as never);
    const body = await readJson<{ success: boolean; code: string }>(response);

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      code: "INVALID_REQUEST",
    });
    expect(mockVerifyInviteToken).not.toHaveBeenCalled();
  });
});
