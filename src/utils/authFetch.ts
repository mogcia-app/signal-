/**
 * 認証付きfetch
 * Firebase AuthのIDトークンを自動付与
 *
 * Phase 2: authFetch導入により、全APIリクエストに認証トークンを自動付与
 * Phase 3: middleware再有効化の準備
 */

import { getAuth, onAuthStateChanged, type Unsubscribe, type User } from "firebase/auth";

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

const waitForUser = async (auth: ReturnType<typeof getAuth>, timeoutMs = 7000) =>
  new Promise<User | null>((resolve) => {
    let resolved = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    let unsubscribe: Unsubscribe | undefined;

    const finish = (user: User | null) => {
      if (resolved) {
        return;
      }
      resolved = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (unsubscribe) {
        unsubscribe();
      }
      resolve(user);
    };

    timeoutId = setTimeout(() => finish(null), timeoutMs);
    unsubscribe = onAuthStateChanged(auth, (user) => {
      finish(user);
    });
  });

const resolveCurrentUser = async (auth: ReturnType<typeof getAuth>) => {
  if (typeof auth.authStateReady === "function") {
    await auth.authStateReady();
    if (auth.currentUser) {
      return auth.currentUser;
    }
  }

  if (auth.currentUser) {
    return auth.currentUser;
  }

  return waitForUser(auth);
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
  console.debug("[authFetch] currentUser exists?", Boolean(auth.currentUser), "url:", input.toString());
  const user = await resolveCurrentUser(auth);
  console.debug("[authFetch] resolved user exists?", Boolean(user), "url:", input.toString());
  const token = user ? await user.getIdToken() : null;
  console.debug("[authFetch] token length", token?.length ?? 0, "url:", input.toString());

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
