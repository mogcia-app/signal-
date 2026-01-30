/**
 * 認証付きfetch
 * Firebase AuthのIDトークンを自動付与
 *
 * Phase 2: authFetch導入により、全APIリクエストに認証トークンを自動付与
 * Phase 3: middleware再有効化の準備
 *
 * 追加機能:
 * - リトライ＆バックオフ（429エラー対応）
 * - リクエスト間隔制御
 * - アカウント停止時の早期検出
 */

import { getAuth, onAuthStateChanged, type Unsubscribe, type User } from "firebase/auth";

const defaultFetch: typeof fetch | undefined =
  typeof fetch !== "undefined" ? fetch.bind(globalThis) : undefined;

type FetchImpl = typeof fetch;

// requestQueue removed (unused)
// サーバー側のレート制限に合わせて、200ms間隔（1秒に5回）に設定
// サーバー側は主に30-60回/60秒（1-2回/秒）なので、余裕を持たせて200ms
const MIN_REQUEST_INTERVAL = 200; // 最小リクエスト間隔（ミリ秒）= 1秒に5回まで
let lastRequestTime = 0;

// リクエスト間隔を制御する関数
const waitForRequestInterval = async (): Promise<void> => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
};

// 指数バックオフでリトライする関数
const retryWithBackoff = async (
  fn: () => Promise<Response>,
  maxRetries = 3,
  initialDelay = 1000,
): Promise<Response> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fn();

      // 429エラーの場合、Retry-Afterヘッダーを確認
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const delay = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : initialDelay * Math.pow(2, attempt);

        if (attempt < maxRetries) {
          console.warn(
            `[authFetch] Rate limit (429) detected. Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      // 403エラー（アカウント停止など）の場合、リトライしない
      if (response.status === 403) {
        // bodyを読み込むためにcloneする（元のResponseはそのまま返すため）
        const clonedResponse = response.clone();
        const errorData = await clonedResponse.json().catch(() => ({}));
        if (errorData.error?.includes("契約") || errorData.error?.includes("停止")) {
          console.error("[authFetch] Account suspended or contract invalid. Stopping retries.");
          return response;
        }
      }

      // 成功またはリトライ不要なエラー
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 最後の試行でない場合、バックオフしてリトライ
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(
          `[authFetch] Request failed. Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
          error,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // すべてのリトライが失敗した場合
  throw lastError || new Error("Request failed after all retries");
};

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

    const timeoutId = setTimeout(() => finish(null), timeoutMs);
    const unsubscribe: Unsubscribe | undefined = onAuthStateChanged(auth, (user) => {
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
): Promise<Response> => {
  if (!fetchImpl) {
    throw new Error("Fetch implementation is not available in this environment.");
  }

  // リクエスト間隔を制御（APIリクエストのみ）
  if (isApiRequest(input)) {
    await waitForRequestInterval();
  }

  const auth = getAuth();
  const user = await resolveCurrentUser(auth);
  const token = user ? await user.getIdToken() : null;

  const debugInfo = {
    url: input.toString(),
    currentUserExists: Boolean(auth.currentUser),
    resolvedUserExists: Boolean(user),
    tokenLength: token?.length ?? 0,
  };

  if (process.env.NODE_ENV === "development" && isApiRequest(input)) {
    console.debug("[authFetch]", debugInfo);
  }

  if (typeof window !== "undefined") {
    (window as typeof window & { __AUTH_FETCH_LOGS__?: typeof debugInfo[] }).__AUTH_FETCH_LOGS__ ??= [];
    (window as typeof window & { __AUTH_FETCH_LOGS__?: typeof debugInfo[] }).__AUTH_FETCH_LOGS__!.push(debugInfo);
  }

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // APIリクエストの場合、リトライ＆バックオフを適用
  if (isApiRequest(input)) {
    return retryWithBackoff(
      () => fetchImpl(input, { ...options, headers }),
      3, // 最大3回リトライ
      1000, // 初期遅延1秒
    );
  }

  // APIリクエスト以外は通常のfetch
  return fetchImpl(input, { ...options, headers });
};
