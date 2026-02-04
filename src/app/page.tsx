"use client";

import { useAuth } from "../contexts/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function HomeContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // 既にログインしている場合は/homeにリダイレクト
        router.push("/home");
      } else {
        // 未ログインの場合
        const userId = searchParams.get("userId");
        
        if (userId) {
          // ポータルサイトからのアクセス（userIdパラメータあり）
          // 認証コールバックページにリダイレクトして自動ログイン
          router.push(`/auth/callback?userId=${encodeURIComponent(userId)}`);
        } else {
          // 直接アクセスの場合はポータルサイトにリダイレクト
          window.location.href = "https://signal-portal.vercel.app/";
        }
      }
    }
  }, [user, loading, router, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-2 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-2 border-[#FF8A15] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-sm font-medium text-gray-700">読み込み中...</p>
        </div>
      </div>
    );
  }

  return null;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 border-2 border-gray-200 rounded-full"></div>
              <div className="absolute inset-0 border-2 border-[#FF8A15] border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-sm font-medium text-gray-700">読み込み中...</p>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
