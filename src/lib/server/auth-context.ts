import type { NextRequest } from "next/server";
import { adminAuth, adminDb } from "../firebase-admin";
import { logAccessEvent, logSecurityEvent } from "./logging";

export class UnauthorizedError extends Error {
  status = 401;
  code = "UNAUTHORIZED";

  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  status = 403;
  code = "FORBIDDEN";

  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class RateLimitError extends Error {
  status = 429;
  code = "RATE_LIMITED";

  constructor(message = "Too Many Requests") {
    super(message);
    this.name = "RateLimitError";
  }
}

type RateLimitOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
};

type RequireAuthOptions = {
  requireContract?: boolean;
  rateLimit?: RateLimitOptions;
  auditEventName?: string;
};

type AuthContext = {
  uid: string;
  token: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>;
};

type RateLimitRecord = {
  userId: string;
  key: string;
  windowStart: number;
  count: number;
  updatedAt: number;
  ip?: string;
};

async function enforceRateLimit(userId: string, options: RateLimitOptions, ip?: string) {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const docId = `${userId}:${options.key}`;
  const docRef = adminDb.collection("serviceRateLimits").doc(docId);

  await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);

    if (!snapshot.exists) {
      const initialRecord: RateLimitRecord = {
        userId,
        key: options.key,
        windowStart: now,
        count: 1,
        updatedAt: now,
        ...(ip ? { ip } : {}),
      };
      transaction.set(docRef, initialRecord);
      return;
    }

    const data = snapshot.data() as RateLimitRecord;

    if (now - data.windowStart >= windowMs) {
      transaction.set(docRef, {
        userId,
        key: options.key,
        windowStart: now,
        count: 1,
        updatedAt: now,
        ...(ip ? { ip } : {}),
      });
      return;
    }

    if (data.count >= options.limit) {
      throw new RateLimitError("Rate limit exceeded");
    }

    transaction.update(docRef, {
      count: data.count + 1,
      updatedAt: now,
      ...(ip ? { ip } : {}),
    });
  });
}

async function isContractActive(userId: string): Promise<boolean> {
  const userSnapshot = await adminDb.collection("users").doc(userId).get();

  if (!userSnapshot.exists) {
    return false;
  }

  const userData = userSnapshot.data() as {
    contractEndDate?: string | Date;
    status?: string;
  };

  if (!userData) {
    return false;
  }

  const now = new Date();
  const endDateRaw = userData.contractEndDate;
  const endDate =
    endDateRaw instanceof Date
      ? endDateRaw
      : endDateRaw
        ? new Date(endDateRaw)
        : null;
  const status = userData.status;

  if (!endDate || Number.isNaN(endDate.getTime())) {
    return false;
  }

  const active = status === "active" && endDate > now;

  return active;
}

export async function requireAuthContext(request: NextRequest, options: RequireAuthOptions = {}): Promise<AuthContext> {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    await logSecurityEvent("api_missing_token", {
      path: request.nextUrl.pathname,
      method: request.method,
    });
    throw new UnauthorizedError("Missing Bearer token");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    await logSecurityEvent("api_empty_token", {
      path: request.nextUrl.pathname,
      method: request.method,
    });
    throw new UnauthorizedError("Bearer token is empty");
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    if (!uid) {
      throw new UnauthorizedError("Token does not include uid");
    }

    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      undefined;

    if (options.rateLimit) {
      await enforceRateLimit(uid, options.rateLimit, clientIp);
    }

    if (options.requireContract) {
      const active = await isContractActive(uid);
      if (!active) {
        await logSecurityEvent("api_contract_inactive", {
          path: request.nextUrl.pathname,
          method: request.method,
          uid,
        });
        throw new ForbiddenError("Contract inactive or expired");
      }
    }

    if (options.auditEventName) {
      await logAccessEvent(options.auditEventName, {
        path: request.nextUrl.pathname,
        method: request.method,
        uid,
      });
    }

    return {
      uid,
      token: decodedToken,
    };
  } catch (error) {
    if (error instanceof RateLimitError || error instanceof ForbiddenError || error instanceof UnauthorizedError) {
      throw error;
    }

    await logSecurityEvent("api_token_verification_failed", {
      path: request.nextUrl.pathname,
      method: request.method,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new UnauthorizedError("Invalid authentication token");
  }
}

export function buildErrorResponse(error: unknown) {
  if (error instanceof RateLimitError || error instanceof ForbiddenError || error instanceof UnauthorizedError) {
    return {
      status: error.status,
      body: {
        success: false,
        error: error.message,
        code: error.code,
      },
    };
  }

  const message = error instanceof Error ? error.message : "Unknown error";

  return {
    status: 500,
    body: {
      success: false,
      error: "Internal server error",
      details: message,
    },
  };
}


