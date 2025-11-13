"use client";

import Link from "next/link";
import { useAuth } from "../contexts/auth-context";
import { useState, useEffect } from "react";

interface CommonHeaderProps {
  unreadCount?: number;
}

export default function CommonHeader({ unreadCount = 0 }: CommonHeaderProps) {
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  // スクロール時のヘッダースタイル変更
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200"
          : "bg-white shadow-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ロゴ */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <div className="text-2xl font-bold text-black">
                Signal<span className="text-orange-500">.</span>
              </div>
            </Link>
          </div>

          {/* 共通メニュー */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/guide"
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
            >
              <span className="text-lg">📖</span>
              <span>使い方ガイド</span>
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
            >
              <span className="text-lg">👤</span>
              <span>マイアカウント</span>
            </Link>

            <Link
              href="/terms"
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
            >
              <span className="text-lg">📄</span>
              <span>利用規約</span>
            </Link>
          </nav>

          {/* ユーザー情報 */}
          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-700">{user.email}</div>
                <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>

          {/* モバイルメニューボタン */}
          <div className="md:hidden">
            <button className="text-gray-700 hover:text-orange-600 p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* モバイルメニュー */}
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/guide"
              className="flex items-center space-x-3 px-3 py-2 text-base font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
            >
              <span className="text-lg">📖</span>
              <span>使い方ガイド</span>
            </Link>

            <Link
              href="/my-account"
              className="flex items-center space-x-3 px-3 py-2 text-base font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
            >
              <span className="text-lg">👤</span>
              <span>マイアカウント</span>
            </Link>

            <Link
              href="/terms"
              className="flex items-center space-x-3 px-3 py-2 text-base font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
            >
              <span className="text-lg">📄</span>
              <span>利用規約</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
