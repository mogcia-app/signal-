import { randomUUID } from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/repositories/collections";
import { upsertInstagramAccount } from "@/lib/server/instagram-scheduler";

const META_API_VERSION = "v25.0";
const STATE_TTL_MS = 10 * 60 * 1000;
const META_OAUTH_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
].join(",");

type OAuthStateRecord = {
  uid: string;
  redirectPath: string;
  createdAt: number;
};

type OAuthTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: {
    message?: string;
    code?: number;
  };
};

type MetaPageRecord = {
  id?: string;
  name?: string;
  access_token?: string;
  instagram_business_account?: {
    id?: string;
    username?: string;
  };
};

type MetaAccountsResponse = {
  data?: MetaPageRecord[];
  error?: {
    message?: string;
    code?: number;
  };
};

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`MISSING_${name}`);
  }
  return value;
}

export async function createInstagramOAuthState(params: {
  uid: string;
  redirectPath?: string;
}): Promise<string> {
  const state = randomUUID();
  const payload: OAuthStateRecord = {
    uid: params.uid,
    redirectPath: params.redirectPath || "/instagram/account",
    createdAt: Date.now(),
  };

  await adminDb.collection(COLLECTIONS.INSTAGRAM_OAUTH_STATES).doc(state).set(payload);
  return state;
}

export function buildInstagramOAuthLoginUrl(params: {
  origin: string;
  state: string;
}): string {
  const appId = getRequiredEnv("META_APP_ID");
  const redirectUri = `${params.origin}/api/auth/meta/callback`;

  const query = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state: params.state,
    scope: META_OAUTH_SCOPES,
    response_type: "code",
  });

  return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${query.toString()}`;
}

async function exchangeCodeForAccessToken(params: {
  origin: string;
  code: string;
}): Promise<{ accessToken: string; expiresIn: number | null }> {
  const appId = getRequiredEnv("META_APP_ID");
  const appSecret = getRequiredEnv("META_APP_SECRET");
  const redirectUri = `${params.origin}/api/auth/meta/callback`;

  const query = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code: params.code,
  });

  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?${query.toString()}`,
    { cache: "no-store" },
  );
  const payload = (await response.json().catch(() => null)) as OAuthTokenResponse | null;

  if (!response.ok || payload?.error || !payload?.access_token) {
    throw new Error(payload?.error?.message || "Failed to exchange Meta OAuth code");
  }

  return {
    accessToken: payload.access_token,
    expiresIn: typeof payload.expires_in === "number" ? payload.expires_in : null,
  };
}

async function fetchInstagramPageAccount(userAccessToken: string): Promise<{
  instagramUserId: string;
  pageAccessToken: string;
}> {
  const query = new URLSearchParams({
    fields: "id,name,access_token,instagram_business_account{id,username}",
    access_token: userAccessToken,
  });

  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/me/accounts?${query.toString()}`,
    { cache: "no-store" },
  );
  const payload = (await response.json().catch(() => null)) as MetaAccountsResponse | null;

  if (!response.ok || payload?.error) {
    throw new Error(payload?.error?.message || "Failed to fetch Meta pages");
  }

  const connectedPage = (payload?.data || []).find(
    (page) => page.access_token && page.instagram_business_account?.id,
  );

  if (!connectedPage?.access_token || !connectedPage.instagram_business_account?.id) {
    throw new Error("Instagram Business Account linked Page was not found");
  }

  return {
    instagramUserId: connectedPage.instagram_business_account.id,
    pageAccessToken: connectedPage.access_token,
  };
}

export async function consumeInstagramOAuthCallback(params: {
  origin: string;
  code: string;
  state: string;
}): Promise<{ redirectPath: string }> {
  const stateRef = adminDb.collection(COLLECTIONS.INSTAGRAM_OAUTH_STATES).doc(params.state);
  const stateDoc = await stateRef.get();

  if (!stateDoc.exists) {
    throw new Error("Invalid OAuth state");
  }

  const stateData = stateDoc.data() as OAuthStateRecord;
  if (!stateData?.uid || !stateData?.createdAt || Date.now() - stateData.createdAt > STATE_TTL_MS) {
    await stateRef.delete().catch(() => {});
    throw new Error("Expired OAuth state");
  }

  const token = await exchangeCodeForAccessToken({
    origin: params.origin,
    code: params.code,
  });
  const pageAccount = await fetchInstagramPageAccount(token.accessToken);
  const tokenExpireAt =
    typeof token.expiresIn === "number" ? new Date(Date.now() + token.expiresIn * 1000) : null;

  await upsertInstagramAccount({
    clientId: stateData.uid,
    instagramUserId: pageAccount.instagramUserId,
    pageAccessToken: pageAccount.pageAccessToken,
    tokenExpireAt,
  });

  await stateRef.delete().catch(() => {});

  return {
    redirectPath: stateData.redirectPath || "/instagram/account",
  };
}
