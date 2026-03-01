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
 * - ネットワークエラー検出とトースト通知
 */

import { getAuth, onAuthStateChanged, type Unsubscribe, type User } from "firebase/auth";

const defaultFetch: typeof fetch | undefined =
  typeof fetch !== "undefined" ? fetch.bind(globalThis) : undefined;
const DEBUG_AUTH_FETCH_KEY = "signal_debug_auth_fetch";

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

// ネットワークエラー検出用の変数
let lastNetworkErrorTime = 0;
let networkErrorToastId: string | null = null;
const NETWORK_ERROR_THROTTLE_MS = 30000; // 30秒に1回まで

// ネットワークエラーを検出する関数
const isNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorMessage = error.message.toLowerCase();
  const errorName = error.name.toLowerCase();
  
  // Firebase認証のネットワークエラーコードも検出
  // FirebaseErrorのcodeプロパティも確認
  const firebaseNetworkErrorCodes = [
    "auth/network-request-failed",
    "auth/network-error",
    "network-request-failed",
  ];
  
  // FirebaseErrorオブジェクトの場合、codeプロパティも確認
  if (typeof error === "object" && error !== null && "code" in error) {
    const errorCode = String((error as { code?: string }).code || "").toLowerCase();
    if (firebaseNetworkErrorCodes.some(code => errorCode.includes(code.toLowerCase()))) {
      return true;
    }
  }

  return (
    errorName === "typeerror" ||
    errorMessage.includes("failed to fetch") ||
    errorMessage.includes("network") ||
    errorMessage.includes("disconnected") ||
    errorMessage.includes("err_internet_disconnected") ||
    errorMessage.includes("err_network_changed") ||
    errorMessage.includes("err_network_io_suspended") ||
    errorMessage.includes("quic") ||
    errorMessage.includes("connection closed") ||
    errorMessage.includes("network request failed") ||
    firebaseNetworkErrorCodes.some(code => errorMessage.includes(code.toLowerCase()))
  );
};

// ネットワークエラーのトースト通知を表示する関数
const showNetworkErrorToast = (): void => {
  // クライアントサイドでのみ実行
  if (typeof window === "undefined") {
    return;
  }

  // 動的インポートでreact-hot-toastを読み込む（サーバーサイドでエラーにならないように）
  import("react-hot-toast")
    .then((toastModule) => {
      const toast = toastModule.default;
      const now = Date.now();

      // スロットリング: 30秒に1回まで
      if (now - lastNetworkErrorTime < NETWORK_ERROR_THROTTLE_MS) {
        return;
      }

      lastNetworkErrorTime = now;

      // 既存のトーストがあれば削除
      if (networkErrorToastId) {
        toast.dismiss(networkErrorToastId);
      }

      // 新しいトーストを表示
      networkErrorToastId = toast(
        "ネットワークが不安定です。接続を確認してください。",
        {
          icon: "⚠️",
          duration: 5000,
          style: {
            background: "#fef3c7",
            color: "#92400e",
            border: "1px solid #fbbf24",
            borderRadius: "8px",
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: "500",
          },
          position: "top-right",
        }
      );
    })
    .catch(() => {
      // react-hot-toastが利用できない場合は何もしない
    });
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

      // ネットワークエラーの場合、トースト通知を表示
      if (isNetworkError(error)) {
        showNetworkErrorToast();
      }

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

  // すべてのリトライが失敗した場合、ネットワークエラーの場合はトースト通知を表示
  if (lastError && isNetworkError(lastError)) {
    showNetworkErrorToast();
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

const isOffline = (): boolean => {
  if (typeof navigator === "undefined") {
    return false;
  }
  return navigator.onLine === false;
};

const shouldLogAuthFetchDebug = (): boolean => {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(DEBUG_AUTH_FETCH_KEY) === "1";
  } catch {
    return false;
  }
};

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

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
  let user: User | null = null;
  let token: string | null = null;

  const getTokenWithRetry = async (targetUser: User): Promise<string | null> => {
    const maxRetries = 3;

    // そもそもオフラインの場合はトークン取得をスキップして早期復帰
    if (isOffline()) {
      showNetworkErrorToast();
      return null;
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await targetUser.getIdToken();
      } catch (tokenError) {
        if (!isNetworkError(tokenError)) {
          throw tokenError;
        }

        if (attempt === maxRetries) {
          console.error("[authFetch] getIdToken() failed after retries", tokenError);
          showNetworkErrorToast();
          return null;
        }

        const baseDelay = 400 * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * 200);
        await wait(baseDelay + jitter);

        // リトライ前にオフラインを再チェック（接続断の長期化を早期検出）
        if (isOffline()) {
          showNetworkErrorToast();
          return null;
        }
      }
    }

    return null;
  };
  
  try {
    user = await resolveCurrentUser(auth);
    
    // getIdToken()の呼び出しをtry-catchで囲み、ネットワークエラーをハンドリング
    if (user) {
      try {
        token = await getTokenWithRetry(user);
      } catch (tokenError) {
        // ネットワーク以外の認証エラーは上位へ通知
        console.error("[authFetch] getIdToken() failed with non-network error", tokenError);
        throw tokenError;
      }
    }
  } catch (authError) {
    // resolveCurrentUser()やその他の認証エラー
    if (isNetworkError(authError)) {
      console.warn("[authFetch] Authentication failed with network error", authError);
      showNetworkErrorToast();
      // ネットワークエラーの場合、トークンなしでリクエストを続行
    } else {
      // 認証エラー（ネットワーク以外）
      console.error("[authFetch] Authentication failed", authError);
      throw authError;
    }
  }

  const debugInfo = {
    url: input.toString(),
    currentUserExists: Boolean(auth.currentUser),
    resolvedUserExists: Boolean(user),
    tokenLength: token?.length ?? 0,
    hasToken: Boolean(token),
  };

  if (isApiRequest(input) && shouldLogAuthFetchDebug()) {
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
