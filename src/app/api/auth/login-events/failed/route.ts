import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";

const COLLECTION = "loginEventLogs";

type FailedBody = {
  email?: unknown;
  errorCode?: unknown;
  source?: unknown;
  currentPath?: unknown;
};

type RateLimitRecord = {
  key: string;
  windowStart: number;
  count: number;
  updatedAt: number;
  ip?: string;
};

const normalizeString = (value: unknown, maxLength = 200): string => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, maxLength);
};

const getClientIp = (request: NextRequest): string | null => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  const realIp = request.headers.get("x-real-ip");
  return realIp?.trim() || null;
};

async function enforceRateLimit(ip: string | null) {
  const db = getAdminDb();
  const key = "auth-login-failed-event";
  const limit = 120;
  const windowMs = 60 * 1000;
  const now = Date.now();
  const docId = `${key}:${ip || "unknown"}`;
  const docRef = db.collection("serviceRateLimits").doc(docId);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);
    if (!snapshot.exists) {
      const initialRecord: RateLimitRecord = {
        key,
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
        key,
        windowStart: now,
        count: 1,
        updatedAt: now,
        ...(ip ? { ip } : {}),
      });
      return;
    }

    if (data.count >= limit) {
      throw new Error("Too many requests");
    }

    transaction.update(docRef, {
      count: data.count + 1,
      updatedAt: now,
      ...(ip ? { ip } : {}),
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    await enforceRateLimit(ip);

    const body = (await request.json().catch(() => null)) as FailedBody | null;
    const email = normalizeString(body?.email, 320).toLowerCase() || null;
    const errorCode = normalizeString(body?.errorCode, 160) || "unknown";
    const source = normalizeString(body?.source, 120) || "/login";
    const currentPath = normalizeString(body?.currentPath, 500) || null;

    const db = getAdminDb();
    let actorUid: string | null = null;
    let actorName: string | null = null;

    if (email) {
      const userSnapshot = await db.collection("users").where("email", "==", email).limit(1).get();
      const userDoc = userSnapshot.docs[0];
      if (userDoc) {
        const userData = userDoc.data() as { name?: unknown };
        actorUid = userDoc.id;
        actorName = normalizeString(userData?.name, 160) || null;
      }
    }

    await db.collection(COLLECTION).add({
      eventType: "auth.login.failed",
      outcome: "failed",
      actorUid,
      actorName,
      actorEmail: email,
      source,
      currentPath,
      errorCode,
      ip,
      userAgent: request.headers.get("user-agent") ?? null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Too many requests") {
      return NextResponse.json(
        { success: false, error: "Too many requests", code: "RATE_LIMITED" },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}

