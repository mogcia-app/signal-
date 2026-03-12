import { jwtVerify, type JWTPayload } from "jose";

export type InviteTokenPayload = JWTPayload & {
  uid?: string;
  email?: string;
  nonce?: string;
  userId?: string;
  userEmail?: string;
  tokenHash?: string;
  tenantType?: string;
  agencyId?: string | null;
};

export class InviteTokenError extends Error {
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

const getInviteSecret = (): Uint8Array => {
  const secret = process.env.INVITE_LINK_SECRET?.trim();
  if (!secret) {
    throw new InviteTokenError("INVITE_LINK_SECRET is not configured", "INVITE_SECRET_MISSING");
  }
  return new TextEncoder().encode(secret);
};

export const normalizeEmail = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().toLowerCase();
};

const isPayloadExpired = (exp: number): boolean => {
  // Some legacy invite links stored exp in milliseconds instead of seconds.
  const expiresAtMs = exp > 1_000_000_000_000 ? exp : exp * 1000;
  return expiresAtMs <= Date.now();
};

export async function verifyInviteToken(token: string): Promise<InviteTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getInviteSecret(), {
      algorithms: ["HS256"],
    });

    const exp = payload.exp;
    if (typeof exp !== "number") {
      throw new InviteTokenError("Invite token is missing exp", "INVITE_PAYLOAD_INVALID");
    }

    if (isPayloadExpired(exp)) {
      throw new InviteTokenError("Invite token has expired", "INVITE_EXPIRED");
    }

    return payload as InviteTokenPayload;
  } catch (error) {
    if (error instanceof InviteTokenError) {
      throw error;
    }

    throw new InviteTokenError("Invite token signature is invalid", "INVITE_SIGNATURE_INVALID");
  }
}
