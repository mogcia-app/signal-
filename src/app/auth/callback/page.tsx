"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AlertCircle, CheckCircle } from "lucide-react";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("初期化中...");
  const hasRedirected = useRef(false);

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

        // サーバーサイドでCustom Tokenを生成するAPIを呼び出す
        const response = await fetch("/api/auth/generate-custom-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || `HTTP ${response.status}: Failed to generate token`;
          console.error("[AuthCallback] トークン生成エラー:", errorMessage);
          throw new Error(errorMessage);
        }

        const { customToken } = await response.json();

        if (!customToken) {
          throw new Error("Custom token not received");
        }

        console.log("[AuthCallback] トークン生成成功。ログイン処理を開始します。");

        setStatus("ログイン中...");

        // Custom Tokenでログイン
        await signInWithCustomToken(auth, customToken);

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
              router.push("/instagram/lab/feed?login=success");
            }, 500);
          } else if (!user && !hasRedirected.current) {
            // ユーザーがnullの場合は、まだ認証処理中の可能性があるため待機
            // AuthGuardによるリダイレクトを防ぐため、ここでは何もしない
            console.log("[AuthCallback] 認証状態: null（処理中）");
          }
        });
      } catch (err) {
        console.error("[AuthCallback] 認証エラー:", err);
        setError(err instanceof Error ? err.message : "認証に失敗しました");
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">認証エラー</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={() => router.push("/login")}
              className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              ログインページに戻る
            </button>
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
