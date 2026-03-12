import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

const COLLECTION = "uiEventLogs";

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

export type UiEventBase = {
  sessionId?: unknown;
  currentPath?: unknown;
  clickedAt?: unknown;
};

export async function buildActorProfile(uid: string, email: string | null) {
  const userDoc = await getAdminDb().collection("users").doc(uid).get();
  const actorName = normalizeString(userDoc.data()?.name, 160) || null;
  return {
    actorUid: uid,
    actorName,
    actorEmail: email,
  };
}

export function normalizeUiEventBase(body: UiEventBase) {
  const clickedAtClient = normalizeString(body.clickedAt, 80) || null;
  return {
    sessionId: normalizeString(body.sessionId, 120) || null,
    currentPath: normalizeString(body.currentPath, 500) || null,
    clickedAtClient,
  };
}

export async function writeUiEventLog(
  request: NextRequest,
  payload: Record<string, unknown>
) {
  await getAdminDb().collection(COLLECTION).add({
    ...payload,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export { normalizeString };
