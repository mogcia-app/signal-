import { jwtVerify, type JWTPayload } from "jose";
import { createHash } from "node:crypto";

export type InviteTokenPayload = JWTPayload & {
  tokenHash?: string;
  tenantType?: string;
  agencyId?: string | null;
  userId?: string;
  userEmail?: string;
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

export const hashInviteToken = (token: string): string => {
  return createHash("sha256").update(token).digest("hex");
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

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (exp <= nowSeconds) {
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
