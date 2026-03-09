import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";

const COLLECTION = "loginEventLogs";

type SuccessBody = {
  source?: unknown;
  currentPath?: unknown;
  nextPath?: unknown;
  sessionId?: unknown;
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

export async function POST(request: NextRequest) {
  try {
    const { uid, token } = await requireAuthContext(request, {
      rateLimit: { key: "auth-login-success-event", limit: 120, windowSeconds: 60 },
    });

    const body = (await request.json().catch(() => null)) as SuccessBody | null;
    const source = normalizeString(body?.source, 120) || "/login";
    const currentPath = normalizeString(body?.currentPath, 500) || null;
    const nextPath = normalizeString(body?.nextPath, 500) || null;
    const sessionId = normalizeString(body?.sessionId, 120) || null;

    const email =
      typeof token.email === "string" && token.email.trim().length > 0
        ? token.email.trim().toLowerCase()
        : null;

    const db = getAdminDb();
    const userDoc = await db.collection("users").doc(uid).get();
    const actorName = normalizeString(userDoc.data()?.name, 160) || null;

    await db.collection(COLLECTION).add({
      eventType: "auth.login.success",
      outcome: "success",
      actorUid: uid,
      actorName,
      actorEmail: email,
      source,
      currentPath,
      nextPath,
      sessionId,
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") ?? null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

