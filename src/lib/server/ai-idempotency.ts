import * as crypto from "crypto";
import * as admin from "firebase-admin";
import type { AiOutputFeature } from "@/lib/server/ai-usage-limit";
import { adminDb } from "@/lib/firebase-admin";

type RequestStatus = "in_progress" | "completed" | "failed";

interface RequestPayload {
  status: number;
  body: unknown;
}

interface RequestDoc {
  uid: string;
  feature: AiOutputFeature;
  requestHash: string;
  requestKeyPreview: string;
  status: RequestStatus;
  lockedUntil?: admin.firestore.Timestamp;
  expiresAt?: admin.firestore.Timestamp;
  payload?: RequestPayload;
  createdAt?: unknown;
  updatedAt?: unknown;
}

const COLLECTION = "ai_request_idempotency";

const toMillis = (value: unknown): number => {
  if (!value) {return 0;}
  if (value instanceof Date) {return value.getTime();}
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    const ts = value as { toMillis?: () => number };
    return Number(ts.toMillis?.() || 0);
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const ts = value as { toDate?: () => Date };
    return ts.toDate?.()?.getTime() || 0;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }
  return 0;
};

const stableStringify = (value: unknown): string => {
  if (value === null || value === undefined) {return "null";}
  if (typeof value !== "object") {return JSON.stringify(value);}
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const body = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",");
  return `{${body}}`;
};

export const buildAiRequestKey = (input: unknown): string => {
  const raw = stableStringify(input);
  return crypto.createHash("sha256").update(raw).digest("hex");
};

const buildDocId = (uid: string, feature: AiOutputFeature, requestKey: string): string => {
  const requestHash = buildAiRequestKey({ uid, feature, requestKey });
  return `${uid}_${feature}_${requestHash.slice(0, 32)}`;
};

export async function acquireAiRequestLock(params: {
  uid: string;
  feature: AiOutputFeature;
  requestKey: string;
  inProgressLeaseSeconds?: number;
  completedTtlSeconds?: number;
}): Promise<
  | { state: "acquired" }
  | { state: "in_progress"; retryAfterSeconds: number }
  | { state: "completed"; payload: RequestPayload }
> {
  const { uid, feature, requestKey, inProgressLeaseSeconds = 25, completedTtlSeconds = 90 } = params;
  const nowMs = Date.now();
  const docRef = adminDb.collection(COLLECTION).doc(buildDocId(uid, feature, requestKey));
  const requestHash = buildAiRequestKey(requestKey);
  const requestKeyPreview = String(requestKey).slice(0, 120);

  const result = await adminDb.runTransaction(async (tx) => {
    const snapshot = await tx.get(docRef);
    const current = (snapshot.data() || {}) as Partial<RequestDoc>;
    const status = current.status;
    const lockedUntilMs = toMillis(current.lockedUntil);
    const expiresAtMs = toMillis(current.expiresAt);

    if (status === "completed" && current.payload && expiresAtMs > nowMs) {
      return { state: "completed", payload: current.payload } as const;
    }

    if (status === "in_progress" && lockedUntilMs > nowMs) {
      const retryAfterSeconds = Math.max(1, Math.ceil((lockedUntilMs - nowMs) / 1000));
      return { state: "in_progress", retryAfterSeconds } as const;
    }

    tx.set(
      docRef,
      {
        uid,
        feature,
        requestHash,
        requestKeyPreview,
        status: "in_progress",
        lockedUntil: admin.firestore.Timestamp.fromMillis(nowMs + inProgressLeaseSeconds * 1000),
        expiresAt: admin.firestore.Timestamp.fromMillis(
          nowMs + Math.max(inProgressLeaseSeconds, completedTtlSeconds) * 1000
        ),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: snapshot.exists
          ? current.createdAt || admin.firestore.FieldValue.serverTimestamp()
          : admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return { state: "acquired" } as const;
  });

  return result;
}

export async function completeAiRequestLock(params: {
  uid: string;
  feature: AiOutputFeature;
  requestKey: string;
  payload: RequestPayload;
  completedTtlSeconds?: number;
}): Promise<void> {
  const { uid, feature, requestKey, payload, completedTtlSeconds = 120 } = params;
  const nowMs = Date.now();
  const docRef = adminDb.collection(COLLECTION).doc(buildDocId(uid, feature, requestKey));
  await docRef.set(
    {
      status: "completed",
      payload,
      lockedUntil: admin.firestore.FieldValue.delete(),
      expiresAt: admin.firestore.Timestamp.fromMillis(nowMs + completedTtlSeconds * 1000),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function failAiRequestLock(params: {
  uid: string;
  feature: AiOutputFeature;
  requestKey: string;
  failedTtlSeconds?: number;
}): Promise<void> {
  const { uid, feature, requestKey, failedTtlSeconds = 15 } = params;
  const nowMs = Date.now();
  const docRef = adminDb.collection(COLLECTION).doc(buildDocId(uid, feature, requestKey));
  await docRef.set(
    {
      status: "failed",
      lockedUntil: admin.firestore.FieldValue.delete(),
      expiresAt: admin.firestore.Timestamp.fromMillis(nowMs + failedTtlSeconds * 1000),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
