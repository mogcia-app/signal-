/**
 * 認証付きfetch
 * Firebase AuthのIDトークンを自動付与
 *
 * Phase 2: authFetch導入により、全APIリクエストに認証トークンを自動付与
 * Phase 3: middleware再有効化の準備
 */

import { getAuth } from "firebase/auth";

const defaultFetch: typeof fetch | undefined =
  typeof fetch !== "undefined" ? fetch.bind(globalThis) : undefined;

type FetchImpl = typeof fetch;

const isApiRequest = (input: RequestInfo | URL): boolean => {
  if (typeof input === "string") {
    return input.startsWith("/api");
  }

  if (input instanceof URL) {
    return input.pathname.startsWith("/api");
  }

  if (input instanceof Request) {
    return input.url.startsWith("/api");
  }

  return false;
};

export const authFetch = async (
  input: RequestInfo | URL,
  options: RequestInit = {},
  fetchImpl: FetchImpl | undefined = defaultFetch,
) => {
  if (!fetchImpl) {
    throw new Error("Fetch implementation is not available in this environment.");
  }

  const auth = getAuth();
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (process.env.NODE_ENV === "development" && isApiRequest(input)) {
    console.debug("[authFetch] token attached:", Boolean(token), "url:", input.toString());
  }

  return fetchImpl(input, { ...options, headers });
};
