"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../contexts/auth-context";
import { useUserProfile } from "../hooks/useUserProfile";
import { canAccessFeature } from "../lib/plan-access";
import { ReactNode, useState, useEffect } from "react";
import { Menu, X, User, Sparkles } from "lucide-react";

interface SNSLayoutProps {
  children: ReactNode;
  customTitle?: string;
  customDescription?: string;
  isOnboarding?: boolean;
  contentClassName?: string;
  hideMobileNav?: boolean; // モックアップ用: モバイルナビゲーションボタンを非表示
}

export default function SNSLayout({
  children,
  customTitle,
  customDescription,
  contentClassName,
  hideMobileNav = false,
}: SNSLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { user, signOut } = useAuth();
  const { userProfile } = useUserProfile();

  // URLパラメータでモックアップモードを検出
  const isMockupMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mockup") === "true";
  const shouldHideNav = hideMobileNav || isMockupMode;

  // パスが変更されたらサイドバーを閉じる（スマホ用）
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // サイドバーが開いているときはbodyのスクロールを無効化
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  return (
    <div className="app-soft-zoom min-h-screen bg-white flex flex-col lg:flex-row">
      {/* ハンバーガーメニューボタン（スマホのみ表示） */}
      {!shouldHideNav && (
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
          aria-label="メニューを開く"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {/* オーバーレイ（スマホのみ、サイドバーが開いているとき表示） */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* サイドバー */}
      <div
        className={`fixed lg:static inset-y-0 left-0 w-64 bg-white shadow-lg flex-shrink-0 z-40 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } overflow-y-auto`}
      >
        {/* ロゴ・ブランディング */}
        <div className="px-4 sm:px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <div className="text-2xl font-bold text-black">
              Signal<span style={{ color: "#FF8A15" }}>.</span>
            </div>
          </div>
          {/* 閉じるボタン（スマホのみ表示） */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1 text-gray-600 hover:text-gray-900"
            aria-label="メニューを閉じる"
          >
            <X size={20} />
          </button>
        </div>

        {/* ユーザー情報 */}
        <div className="block px-4 sm:px-6 py-3 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
              <span className="text-lg font-medium">
                {userProfile?.name?.charAt(0).toUpperCase() ||
                  user?.email?.charAt(0).toUpperCase() ||
                  "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-sm font-semibold text-black truncate"
                dangerouslySetInnerHTML={{
                  __html: String(userProfile?.name || user?.email || "ユーザー").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
                }}
              />
            </div>
          </div>
        </div>

        {/* ナビゲーションメニュー */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">メニュー</h3>
          <nav className="space-y-1">
            {/*<Link 
              href="/instagram"
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg ${
                pathname === '/instagram' 
                  ? 'bg-orange-100 text-orange-800 font-medium' 
                  : 'text-black hover:bg-gray-100'
              }`}
            >
              <span>🏠</span>
              <span>ダッシュボード</span>
            </Link>*/}
            <Link
              href="/home"
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-none ${
                pathname === "/home"
                  ? "bg-orange-100 text-orange-800 font-medium"
                  : "text-black hover:bg-gray-100"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-none flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${
                  pathname === "/home" ? "bg-orange-200 text-orange-900" : "bg-gray-200 text-gray-700"
                }`}
              >
                P
              </span>
              <span>ダッシュボード</span>
            </Link>
            {/* {canAccessFeature(userProfile, "canAccessPlan") && (
              <Link
                href="/instagram/plan"
                className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg ${
                  pathname === "/instagram/plan"
                    ? "bg-orange-100 text-orange-800 font-medium"
                    : "text-black hover:bg-gray-100"
                }`}
              >
                <Calendar size={18} className="flex-shrink-0" />
                <span>運用計画</span>
              </Link>
            )} */}
            {/* <Link
              href="/instagram/diagnosis"
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg ${
                pathname === "/instagram/diagnosis"
                  ? "bg-orange-100 text-orange-800 font-medium"
                  : "text-black hover:bg-gray-100"
              }`}
            >
              <Activity size={18} className="flex-shrink-0" />
              <span>アカウント診断</span>
            </Link> */}

            {/* <Link
              href="/instagram/lab"
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg ${
                pathname.startsWith("/instagram/lab")
                  ? "bg-orange-100 text-orange-800 font-medium"
                  : "text-black hover:bg-gray-100"
              }`}
            >
              <FlaskConical size={18} className="flex-shrink-0" />
              <span>投稿ラボ</span>
            </Link> */}

            {canAccessFeature(userProfile, "canAccessPosts") && (
              <Link
                href="/instagram/posts"
                className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-none ${
                  pathname === "/instagram/posts"
                    ? "bg-orange-100 text-orange-800 font-medium"
                    : "text-black hover:bg-gray-100"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-none flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${
                    pathname === "/instagram/posts" ? "bg-orange-200 text-orange-900" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  D
                </span>
                <span>投稿一覧</span>
              </Link>
            )}
            {/* {canAccessFeature(userProfile, "canAccessAnalytics") && (
              <Link
                href="/analytics/feed"
                className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg ${
                  pathname === "/analytics/feed"
                    ? "bg-orange-100 text-orange-800 font-medium"
                    : "text-black hover:bg-gray-100"
                }`}
              >
                <span>📊</span>
                <span>投稿分析</span>
              </Link>
            )} */}
            {canAccessFeature(userProfile, "canAccessKPI") && (
              <Link
                href="/instagram/kpi"
                className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-none ${
                  pathname === "/instagram/kpi"
                    ? "bg-orange-100 text-orange-800 font-medium"
                    : "text-black hover:bg-gray-100"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-none flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${
                    pathname === "/instagram/kpi" ? "bg-orange-200 text-orange-900" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  C
                </span>
                <span>KPIコンソール</span>
              </Link>
            )}
            {canAccessFeature(userProfile, "canAccessReport") && (
              <Link
                href="/instagram/report"
                className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-none ${
                  pathname === "/instagram/report"
                    ? "bg-orange-100 text-orange-800 font-medium"
                    : "text-black hover:bg-gray-100"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-none flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${
                    pathname === "/instagram/report" ? "bg-orange-200 text-orange-900" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  A
                </span>
                <span>月次レポート</span>
              </Link>
            )}
            {canAccessFeature(userProfile, "canAccessLearning") && (
              <Link
                href="/learning"
                className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-none ${
                  pathname.startsWith("/learning")
                    ? "bg-orange-100 text-orange-800 font-medium"
                    : "text-black hover:bg-gray-100"
                }`}
              >
                <Sparkles size={18} className="flex-shrink-0" />
                <span>学習ダッシュボード</span>
              </Link>
            )}
            <Link
              href="/onboarding"
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-none ${
                pathname === "/onboarding"
                  ? "bg-orange-100 text-orange-800 font-medium"
                  : "text-black hover:bg-gray-100"
              }`}
            >
              <User size={18} className="flex-shrink-0" />
              <span>マイアカウント</span>
            </Link>
          </nav>
        </div>

        {/* Instagram情報 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center text-white text-lg">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-black">Instagram</div>
            </div>
          </div>
        </div>

        

        {/* ユーザー情報 */}
        {/* <div className="p-4 mt-auto">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-black">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-black truncate">
                {userProfile?.name || user?.email}
              </div>
              <div className="text-xs text-black">
                {userProfile?.usageType === 'team' ? 'チーム利用' : '個人利用'}
              </div>
            </div>
          </div>
        </div> */}

        {/* 会員サイトボタン */}
        <div className="px-4 pb-2 mt-4">
          <Link
            href="https://signal-portal.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
          >
            <span>会員サイト</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
        </div>

        {/* ログアウトボタン */}
        <div className="px-4 pb-4">
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-3 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center justify-center space-x-2 border-2 border-gray-300 hover:border-gray-400 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>ログアウト</span>
          </button>
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex-1 lg:ml-0">
        {/* タイトルセクション */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 lg:pt-3 pt-16">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center text-white">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-base font-semibold text-black truncate">
                {customTitle || "Instagram Dashboard"}
              </h1>
              <p className="text-xs text-black truncate">
                {customDescription || "写真・動画投稿プラットフォーム"}
              </p>
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <main className={`px-4 sm:px-6 py-4 sm:py-6 ${contentClassName ?? ""}`}>{children}</main>
      </div>
    </div>
  );
}
