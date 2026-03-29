import { randomUUID } from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/repositories/collections";

const GRAPH_API_VERSION = "v25.0";
const MIN_SCHEDULE_DELAY_MS = 10 * 60 * 1000;

export type ScheduledPostStatus = "scheduled" | "publishing" | "published" | "failed";

export type InstagramAccountRecord = {
  id: string;
  client_id: string;
  instagram_user_id: string;
  page_access_token: string;
  token_expire_at: Date | null;
};

export type ScheduledPostRecord = {
  id: string;
  client_id: string;
  image_url: string;
  caption: string;
  creation_id: string;
  scheduled_time: Date;
  status: ScheduledPostStatus;
  created_at: Date;
  updated_at: Date;
  published_at?: Date | null;
  published_media_id?: string | null;
  last_error?: string | null;
};

type FirestoreTimestampLike = {
  toDate?: () => Date;
  seconds?: number;
  nanoseconds?: number;
};

type GraphApiResponse = {
  id?: string;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

type GraphApiError = Error & {
  code?: string;
  status?: number;
  graphCode?: number;
  graphSubcode?: number;
};

const normalizeDate = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object") {
    const ts = value as FirestoreTimestampLike;
    if (typeof ts.toDate === "function") {
      const parsed = ts.toDate();
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof ts.seconds === "number") {
      const parsed = new Date(ts.seconds * 1000 + (ts.nanoseconds ?? 0) / 1_000_000);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  return null;
};

const parseGraphError = (payload: GraphApiResponse | null, fallbackStatus: number): GraphApiError => {
  const graphError = payload?.error;
  const message = graphError?.message || `Instagram Graph API request failed (${fallbackStatus})`;
  const error = new Error(message) as GraphApiError;

  if (graphError?.code === 190) {
    error.code = "TOKEN_INVALID";
    error.status = 401;
  } else if (graphError?.code === 10 || graphError?.code === 200) {
    error.code = "PERMISSION_DENIED";
    error.status = 403;
  } else {
    error.code = "GRAPH_API_ERROR";
    error.status = fallbackStatus >= 400 && fallbackStatus < 500 ? fallbackStatus : 502;
  }
  error.graphCode = graphError?.code;
  error.graphSubcode = graphError?.error_subcode;
  return error;
};

async function callGraphApi(
  path: string,
  params: Record<string, string>,
): Promise<GraphApiResponse> {
  const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as GraphApiResponse | null;
  if (!response.ok || payload?.error) {
    throw parseGraphError(payload, response.status);
  }

  if (!payload?.id) {
    throw new Error("Instagram Graph API response did not include id");
  }

  return payload;
}

function normalizeInstagramAccount(
  id: string,
  data: FirebaseFirestore.DocumentData,
): InstagramAccountRecord {
  return {
    id,
    client_id: String(data.client_id || ""),
    instagram_user_id: String(data.instagram_user_id || ""),
    page_access_token: String(data.page_access_token || ""),
    token_expire_at: normalizeDate(data.token_expire_at),
  };
}

function normalizeScheduledPost(
  id: string,
  data: FirebaseFirestore.DocumentData,
): ScheduledPostRecord {
  return {
    id,
    client_id: String(data.client_id || ""),
    image_url: String(data.image_url || ""),
    caption: String(data.caption || ""),
    creation_id: String(data.creation_id || ""),
    scheduled_time: normalizeDate(data.scheduled_time) || new Date(0),
    status: (data.status as ScheduledPostStatus) || "scheduled",
    created_at: normalizeDate(data.created_at) || new Date(0),
    updated_at: normalizeDate(data.updated_at) || new Date(0),
    published_at: normalizeDate(data.published_at),
    published_media_id: typeof data.published_media_id === "string" ? data.published_media_id : null,
    last_error: typeof data.last_error === "string" ? data.last_error : null,
  };
}

export function parseScheduledAt(value: string, now = new Date()): Date {
  const scheduledAt = new Date(String(value || "").trim());
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("INVALID_SCHEDULED_AT");
  }
  if (scheduledAt.getTime() < now.getTime() + MIN_SCHEDULE_DELAY_MS) {
    throw new Error("SCHEDULE_TOO_SOON");
  }
  return scheduledAt;
}

export async function getInstagramAccountForClient(
  clientId: string,
): Promise<InstagramAccountRecord | null> {
  const snapshot = await adminDb
    .collection(COLLECTIONS.INSTAGRAM_ACCOUNTS)
    .where("client_id", "==", clientId)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return normalizeInstagramAccount(doc.id, doc.data());
  }

  const envUserId = process.env.INSTAGRAM_USER_ID?.trim();
  const envAccessToken = process.env.INSTAGRAM_PAGE_TOKEN?.trim();
  if (!envUserId || !envAccessToken) {
    return null;
  }

  return {
    id: "env-default",
    client_id: clientId,
    instagram_user_id: envUserId,
    page_access_token: envAccessToken,
    token_expire_at: normalizeDate(process.env.INSTAGRAM_TOKEN_EXPIRE_AT),
  };
}

export async function listInstagramAccounts(limit = 50): Promise<InstagramAccountRecord[]> {
  const snapshot = await adminDb
    .collection(COLLECTIONS.INSTAGRAM_ACCOUNTS)
    .limit(Math.max(1, Math.min(limit, 200)))
    .get();

  return snapshot.docs
    .map((doc) => normalizeInstagramAccount(doc.id, doc.data()))
    .sort((a, b) => a.client_id.localeCompare(b.client_id));
}

export async function upsertInstagramAccount(params: {
  clientId: string;
  instagramUserId: string;
  pageAccessToken: string;
  tokenExpireAt: Date | null;
}): Promise<InstagramAccountRecord> {
  const collection = adminDb.collection(COLLECTIONS.INSTAGRAM_ACCOUNTS);
  const existing = await collection.where("client_id", "==", params.clientId).limit(1).get();
  const targetRef = existing.empty ? collection.doc(randomUUID()) : existing.docs[0].ref;

  const payload = {
    client_id: params.clientId,
    instagram_user_id: params.instagramUserId,
    page_access_token: params.pageAccessToken,
    token_expire_at: params.tokenExpireAt,
    updated_at: new Date(),
  };

  await targetRef.set(payload, { merge: true });
  const saved = await targetRef.get();
  return normalizeInstagramAccount(saved.id, saved.data() || payload);
}

export async function listScheduledPostsForClient(clientId: string): Promise<ScheduledPostRecord[]> {
  const snapshot = await adminDb
    .collection(COLLECTIONS.SCHEDULED_POSTS)
    .where("client_id", "==", clientId)
    .get();

  return snapshot.docs
    .map((doc) => normalizeScheduledPost(doc.id, doc.data()))
    .sort((a, b) => b.scheduled_time.getTime() - a.scheduled_time.getTime());
}

export async function createScheduledPost(params: {
  clientId: string;
  imageUrl: string;
  caption: string;
  scheduledAt: Date;
}): Promise<ScheduledPostRecord> {
  const account = await getInstagramAccountForClient(params.clientId);
  if (!account) {
    throw new Error("INSTAGRAM_ACCOUNT_NOT_FOUND");
  }
  if (!account.instagram_user_id || !account.page_access_token) {
    throw new Error("INSTAGRAM_ACCOUNT_INCOMPLETE");
  }
  if (account.token_expire_at && account.token_expire_at.getTime() <= Date.now()) {
    const error = new Error("TOKEN_EXPIRED");
    error.name = "TOKEN_EXPIRED";
    throw error;
  }

  const graphResponse = await callGraphApi(`/${account.instagram_user_id}/media`, {
    image_url: params.imageUrl,
    caption: params.caption,
    access_token: account.page_access_token,
  });

  const now = new Date();
  const id = randomUUID();
  const record: ScheduledPostRecord = {
    id,
    client_id: params.clientId,
    image_url: params.imageUrl,
    caption: params.caption,
    creation_id: String(graphResponse.id),
    scheduled_time: params.scheduledAt,
    status: "scheduled",
    created_at: now,
    updated_at: now,
    published_at: null,
    published_media_id: null,
    last_error: null,
  };

  await adminDb.collection(COLLECTIONS.SCHEDULED_POSTS).doc(id).set(record);
  return record;
}

export async function publishDueScheduledPosts(now = new Date()): Promise<{
  attempted: number;
  published: number;
  failed: number;
}> {
  const snapshot = await adminDb
    .collection(COLLECTIONS.SCHEDULED_POSTS)
    .where("status", "==", "scheduled")
    .get();

  const duePosts = snapshot.docs
    .map((doc) => ({ ref: doc.ref, record: normalizeScheduledPost(doc.id, doc.data()) }))
    .filter(({ record }) => record.scheduled_time.getTime() <= now.getTime());

  let published = 0;
  let failed = 0;

  for (const { ref, record } of duePosts) {
    try {
      await ref.update({
        status: "publishing",
        updated_at: new Date(),
        last_error: null,
      });

      const account = await getInstagramAccountForClient(record.client_id);
      if (!account) {
        throw new Error("INSTAGRAM_ACCOUNT_NOT_FOUND");
      }
      if (account.token_expire_at && account.token_expire_at.getTime() <= Date.now()) {
        throw new Error("TOKEN_EXPIRED");
      }

      const response = await callGraphApi(`/${account.instagram_user_id}/media_publish`, {
        creation_id: record.creation_id,
        access_token: account.page_access_token,
      });

      await ref.update({
        status: "published",
        updated_at: new Date(),
        published_at: new Date(),
        published_media_id: String(response.id),
        last_error: null,
      });
      published += 1;
    } catch (error) {
      failed += 1;
      await ref.update({
        status: "failed",
        updated_at: new Date(),
        last_error: error instanceof Error ? error.message : "Unknown publish error",
      });
    }
  }

  return {
    attempted: duePosts.length,
    published,
    failed,
  };
}
