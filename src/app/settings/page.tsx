"use client";

import { useUserProfile } from "@/hooks/useUserProfile";
import { useState } from "react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { userProfile, loading } = useUserProfile();
  const [copied, setCopied] = useState(false);

  const copySupportId = async () => {
    if (!userProfile?.supportId) {
      toast.error("サポートIDが設定されていません");
      return;
    }

    try {
      await navigator.clipboard.writeText(userProfile.supportId);
      setCopied(true);
      toast.success("サポートIDをコピーしました");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("コピーに失敗しました");
      console.error("コピーエラー:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 border-2 border-gray-200 rounded-full"></div>
          <div className="absolute inset-0 border-2 border-[#FF8A15] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <span className="ml-2">読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">設定</h1>

      <div className="space-y-6">
        {/* サポートIDセクション */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">サポートID</h2>
          
          {userProfile?.supportId ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                問い合わせの際に、このサポートIDをお知らせください。
                サポートIDは個人情報ではありません。
              </p>
              
              <div className="flex items-center gap-4">
                <code className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono break-all">
                  {userProfile.supportId}
                </code>
                <button
                  onClick={copySupportId}
                  className="px-4 py-3 bg-[#FF8A15] text-white rounded-lg hover:bg-[#e67a0f] transition-colors whitespace-nowrap"
                >
                  {copied ? "✅ コピーしました" : "📋 コピー"}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                サポートIDがまだ付与されていません。
                管理者にお問い合わせください。
              </p>
            </div>
          )}
        </section>

        {/* ユーザー情報セクション */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">ユーザー情報</h2>
          
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
              <dd className="mt-1 text-base text-gray-900">{userProfile?.email || "未設定"}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">表示名</dt>
              <dd className="mt-1 text-base text-gray-900">{userProfile?.name || "未設定"}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">プラン</dt>
              <dd className="mt-1 text-base text-gray-900">
                {(userProfile?.planTier === "basic" || userProfile?.planTier === "ume") && "ベーシック"}
                {(userProfile?.planTier === "standard" || userProfile?.planTier === "take") && "スタンダード"}
                {(userProfile?.planTier === "pro" || userProfile?.planTier === "matsu") && "プロ"}
                {!userProfile?.planTier && "未設定"}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
