"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // URLクエリパラメータからuserIdを取得
        const userId = searchParams.get("userId");

        if (!userId) {
          throw new Error("User ID not found");
        }

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
          throw new Error(errorData.error || "Failed to generate token");
        }

        const { customToken } = await response.json();

        if (!customToken) {
          throw new Error("Custom token not received");
        }

        // Custom Tokenでログイン
        await signInWithCustomToken(auth, customToken);

        // ログイン成功後、投稿ラボ（フィード）へリダイレクト（全プラン共通）
        router.push("/instagram/lab/feed?login=success");
      } catch (err) {
        console.error("Auth callback error:", err);
        setError(err instanceof Error ? err.message : "認証に失敗しました");
        setLoading(false);
      }
    };

    handleCallback();
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
          <p className="text-lg font-medium text-gray-700 mb-2">ログイン中...</p>
          <p className="text-sm text-gray-500">Signal.ツールにログインしています</p>
        </div>
      </div>
    );
  }

  return null;
}
