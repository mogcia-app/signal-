"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AlertCircle, CheckCircle } from "lucide-react";

// ネットワーク接続をチェックする関数
const checkNetworkConnection = (): boolean => {
  if (typeof window === "undefined") {return true;}
  return navigator.onLine;
};

// 指数バックオフでリトライする関数
const retryWithBackoff = async <T,>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000,
  operationName = "操作",
  onRetry?: (attempt: number, delay: number) => void
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // ネットワーク接続を確認
      if (!checkNetworkConnection()) {
        throw new Error("ネットワーク接続がありません。インターネット接続を確認してください。");
      }

      const result = await fn();
      if (attempt > 0) {
        console.log(`[AuthCallback] ${operationName}が成功しました（リトライ ${attempt}回目）`);
      }
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      const errorCode = (error as { code?: string })?.code;
      const errorMessage = lastError.message;
      
      // ネットワークエラーまたは接続エラーの場合のみリトライ
      const isNetworkError = 
        errorCode === "auth/network-request-failed" ||
        errorMessage.includes("network") ||
        errorMessage.includes("ERR_CONNECTION_CLOSED") ||
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("ネットワーク接続");

      if (!isNetworkError || attempt >= maxRetries) {
        // リトライ不要なエラー、または最大リトライ回数に達した場合
        throw lastError;
      }

      // 指数バックオフでリトライ
      const delay = initialDelay * Math.pow(2, attempt);
      console.warn(
        `[AuthCallback] ${operationName}が失敗しました。${delay}ms後にリトライします（試行 ${attempt + 1}/${maxRetries + 1}）`,
        error
      );
      
      // リトライコールバックを呼び出す
      if (onRetry) {
        onRetry(attempt + 1, delay);
      }
      
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error(`${operationName}がすべてのリトライ後に失敗しました`);
};

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("初期化中...");
  const [isOnline, setIsOnline] = useState(true);
  const hasRedirected = useRef(false);
  const retryCountRef = useRef(0);

  // ネットワーク状態の監視
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log("[AuthCallback] ネットワーク接続が復旧しました");
    };
    const handleOffline = () => {
      setIsOnline(false);
      console.warn("[AuthCallback] ネットワーク接続が切断されました");
    };

    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let unsubscribe: (() => void) | null = null;

    const handleCallback = async () => {
      try {
        // URLクエリパラメータからuserIdを取得
        const userId = searchParams.get("userId");

        if (!userId) {
          throw new Error("User ID not found");
        }

        console.log("[AuthCallback] 認証処理を開始します。userId:", userId);

        setStatus("認証トークンを生成中...");

        // サーバーサイドでCustom Tokenを生成するAPIを呼び出す（リトライ付き）
        const response = await retryWithBackoff(
          async () => {
            const res = await fetch("/api/auth/generate-custom-token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ userId }),
            });

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              const errorMessage = errorData.error || `HTTP ${res.status}: Failed to generate token`;
              throw new Error(errorMessage);
            }

            return res;
          },
          3, // 最大3回リトライ
          1000, // 初期遅延1秒
          "トークン生成",
          (attempt, delay) => {
            setStatus(`ネットワークエラー。${Math.ceil(delay / 1000)}秒後に再試行します（${attempt}/3）...`);
          }
        );

        const { customToken } = await response.json();

        if (!customToken) {
          throw new Error("Custom token not received");
        }

        console.log("[AuthCallback] トークン生成成功。ログイン処理を開始します。");

        setStatus("ログイン中...");

        // Custom Tokenでログイン（リトライ付き）
        await retryWithBackoff(
          async () => {
            await signInWithCustomToken(auth, customToken);
          },
          3, // 最大3回リトライ
          1000, // 初期遅延1秒
          "ログイン",
          (attempt, delay) => {
            setStatus(`ネットワークエラー。${Math.ceil(delay / 1000)}秒後に再試行します（${attempt}/3）...`);
          }
        );

        console.log("[AuthCallback] signInWithCustomToken完了。認証状態の変更を待機中...");

        // 認証状態の変更を待つ（onAuthStateChangedが発火するまで待機）
        // タイムアウトを設定（10秒）
        timeoutId = setTimeout(() => {
          if (!hasRedirected.current) {
            console.error("[AuthCallback] 認証状態の変更がタイムアウトしました");
            setError("認証処理がタイムアウトしました。もう一度お試しください。");
            setLoading(false);
            if (unsubscribe) {
              unsubscribe();
            }
          }
        }, 10000);

        // onAuthStateChangedで認証状態の変更を監視
        unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
          if (user && !hasRedirected.current) {
            console.log("[AuthCallback] 認証成功。ユーザーID:", user.uid);
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            if (unsubscribe) {
              unsubscribe();
            }
            hasRedirected.current = true;
            setStatus("リダイレクト中...");
            
            // 少し遅延を入れてからリダイレクト（認証状態が完全に反映されるまで待つ）
            setTimeout(() => {
              router.push("/dashboard");
            }, 500);
          } else if (!user && !hasRedirected.current) {
            // ユーザーがnullの場合は、まだ認証処理中の可能性があるため待機
            // AuthGuardによるリダイレクトを防ぐため、ここでは何もしない
            console.log("[AuthCallback] 認証状態: null（処理中）");
          }
        });
      } catch (err) {
        console.error("[AuthCallback] 認証エラー:", err);
        
        // エラーメッセージをユーザーフレンドリーに変換
        let errorMessage = "認証に失敗しました";
        const errorCode = (err as { code?: string })?.code;
        const errMessage = err instanceof Error ? err.message : String(err);
        
        if (errorCode === "auth/network-request-failed" || errMessage.includes("ERR_CONNECTION_CLOSED") || errMessage.includes("network")) {
          errorMessage = "ネットワークエラーが発生しました。インターネット接続を確認し、しばらく待ってから再度お試しください。";
        } else if (errMessage.includes("User ID not found")) {
          errorMessage = "ユーザーIDが見つかりませんでした。URLを確認してください。";
        } else if (errMessage.includes("Invalid user ID")) {
          errorMessage = "無効なユーザーIDです。";
        } else if (errMessage.includes("not active")) {
          errorMessage = "アカウントがアクティブではありません。管理者にお問い合わせください。";
        } else if (errMessage.includes("ネットワーク接続がありません")) {
          errorMessage = "インターネット接続がありません。接続を確認してください。";
        } else if (errMessage) {
          errorMessage = errMessage;
        }
        
        setError(errorMessage);
        setLoading(false);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (unsubscribe) {
          unsubscribe();
        }
      }
    };

    handleCallback();

    // クリーンアップ関数
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [router, searchParams]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setStatus("再試行中...");
    retryCountRef.current += 1;
    // コンポーネントを再マウントするために、useEffectを再実行させる
    // searchParamsが変わらないので、強制的に再実行するためにkeyを変更する必要があるが、
    // 代わりにwindow.location.reload()を使うか、状態をリセットする
    window.location.reload();
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">認証エラー</h2>
            {!isOnline && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">⚠️ オフライン状態です</p>
              </div>
            )}
            <p className="text-red-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                disabled={!isOnline}
                className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isOnline ? "もう一度試す" : "オフライン中（接続を確認してください）"}
              </button>
              <button
                onClick={() => router.push("/login")}
                className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                ログインページに戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-50">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <p className="text-lg font-medium text-gray-700 mb-2">{status}</p>
          <p className="text-sm text-gray-500">Signal.ツールにログインしています</p>
        </div>
      </div>
    );
  }

  return null;
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-50">
          <div className="text-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto" />
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-orange-500" />
              </div>
            </div>
            <p className="text-lg font-medium text-gray-700 mb-2">読み込み中...</p>
            <p className="text-sm text-gray-500">Signal.ツールにログインしています</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
