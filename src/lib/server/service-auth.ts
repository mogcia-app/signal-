import { adminAuth } from "../firebase-admin";

type CachedIdToken = {
  token: string;
  expiresAt: number;
};

const TOKEN_SAFETY_MARGIN_MS = 60 * 1000;
const tokenCache = new Map<string, CachedIdToken>();

function getServiceUid(overrideUid?: string): string {
  const uid = overrideUid ?? process.env.FIREBASE_SERVICE_UID ?? "";
  if (!uid) {
    throw new Error(
      "FIREBASE_SERVICE_UID is not configured. Set this environment variable to the UID used for server-side requests.",
    );
  }
  return uid;
}

async function exchangeCustomTokenForIdToken(customToken: string, apiKey: string) {
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: customToken,
      returnSecureToken: true,
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to exchange custom token for ID token: ${response.status} ${response.statusText} ${
        errorPayload.error?.message ?? ""
      }`.trim(),
    );
  }

  return response.json() as Promise<{ idToken: string; expiresIn: string }>;
}

export async function getServerIdToken(options?: { serviceUid?: string }) {
  const uid = getServiceUid(options?.serviceUid);
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not configured.");
  }

  const cachedToken = tokenCache.get(uid);
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - TOKEN_SAFETY_MARGIN_MS > now) {
    return cachedToken.token;
  }

  const customToken = await adminAuth.createCustomToken(uid);
  const { idToken, expiresIn } = await exchangeCustomTokenForIdToken(customToken, apiKey);

  const expiresInMs = Number.parseInt(expiresIn, 10) * 1000;
  tokenCache.set(uid, {
    token: idToken,
    expiresAt: now + expiresInMs,
  });

  return idToken;
}

export async function authFetchServer(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options?: { serviceUid?: string },
) {
  const idToken = await getServerIdToken(options);

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${idToken}`);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const fetchImpl = typeof fetch === "function" ? fetch : undefined;
  if (!fetchImpl) {
    throw new Error("Global fetch implementation is not available in this runtime.");
  }

  return fetchImpl(input, {
    ...init,
    headers,
  });
}


