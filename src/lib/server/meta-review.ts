import {
  getInstagramAccountForClient,
  type InstagramAccountRecord,
} from "@/lib/server/instagram-scheduler";

const GRAPH_API_VERSION = "v25.0";

type GraphApiErrorPayload = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
};

type GraphApiError = Error & {
  code?: string;
  status?: number;
  graphCode?: number;
  graphSubcode?: number;
};

type GraphApiResponse<T> = T & {
  error?: GraphApiErrorPayload;
};

type PageConnectionResponse = {
  id?: string;
  name?: string;
  instagram_business_account?: {
    id?: string;
    username?: string;
  };
};

type MediaFieldsResponse = {
  id?: string;
  like_count?: number;
  comments_count?: number;
};

type MediaInsightsResponse = {
  data?: Array<{
    name?: string;
    values?: Array<{
      value?: number | string | boolean | null | Record<string, unknown>;
    }>;
  }>;
};

type MediaInsightValue = number | string | boolean | null | Record<string, unknown> | undefined;

function parseGraphError(
  payload: { error?: GraphApiErrorPayload } | null,
  fallbackStatus: number,
): GraphApiError {
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
}

async function fetchGraphJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams(params);
  const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}${path}?${query.toString()}`, {
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as GraphApiResponse<T> | null;
  if (!response.ok || payload?.error) {
    throw parseGraphError(payload, response.status);
  }

  return payload as T;
}

function assertReviewAccount(account: InstagramAccountRecord | null): InstagramAccountRecord {
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
  return account;
}

function getNumericMetricValue(value: MediaInsightValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}

export async function getReviewInstagramAccount(clientId: string): Promise<InstagramAccountRecord> {
  const account = await getInstagramAccountForClient(clientId);
  return assertReviewAccount(account);
}

export async function getMetaReviewConnectionStatus(clientId: string): Promise<{
  pageConnected: boolean;
  instagramConnected: boolean;
  pageId: string | null;
  instagramAccountId: string | null;
  note: string;
}> {
  const account = await getReviewInstagramAccount(clientId);
  const payload = await fetchGraphJson<PageConnectionResponse>("/me", {
    fields: "id,name,instagram_business_account{id,username}",
    access_token: account.page_access_token,
  });

  const pageId = typeof payload.id === "string" ? payload.id : null;
  const instagramAccountId =
    typeof payload.instagram_business_account?.id === "string"
      ? payload.instagram_business_account.id
      : null;
  const instagramConnected = instagramAccountId === account.instagram_user_id;

  return {
    pageConnected: Boolean(pageId),
    instagramConnected,
    pageId,
    instagramAccountId,
    note: instagramConnected
      ? "Connected page token can access the linked Instagram Business account."
      : "Page token is valid, but the linked Instagram Business account does not match the saved account.",
  };
}

export async function getMetaReviewInsights(params: {
  clientId: string;
  mediaId: string;
}): Promise<{
  mediaId: string;
  metrics: Array<{ name: string; value: number }>;
  note: string;
}> {
  const account = await getReviewInstagramAccount(params.clientId);
  const [media, insights] = await Promise.all([
    fetchGraphJson<MediaFieldsResponse>(`/${params.mediaId}`, {
      fields: "id,like_count,comments_count",
      access_token: account.page_access_token,
    }),
    fetchGraphJson<MediaInsightsResponse>(`/${params.mediaId}/insights`, {
      metric: "impressions,reach,saved",
      access_token: account.page_access_token,
    }),
  ]);

  const insightMap = new Map<string, number>();
  for (const metric of insights.data || []) {
    const name = typeof metric.name === "string" ? metric.name : "";
    const value = getNumericMetricValue(metric.values?.[0]?.value);
    if (name && value !== null) {
      insightMap.set(name, value);
    }
  }

  const metrics = [
    { name: "impressions", value: insightMap.get("impressions") ?? 0 },
    { name: "reach", value: insightMap.get("reach") ?? 0 },
    { name: "likes", value: typeof media.like_count === "number" ? media.like_count : 0 },
    { name: "comments", value: typeof media.comments_count === "number" ? media.comments_count : 0 },
    { name: "saved", value: insightMap.get("saved") ?? 0 },
  ];

  return {
    mediaId: media.id || params.mediaId,
    metrics,
    note: "Metrics fetched from the Instagram Graph API for the requested media.",
  };
}
