"use client";

import React from "react";
import Link from "next/link";
import { Target, ArrowRight, Loader2 } from "lucide-react";

interface MonthlyGoalsCardProps {
  targetFollowers?: number;
  currentFollowers?: number;
  targetPosts?: number;
  actualPosts?: number;
  isLoading?: boolean;
}

export const MonthlyGoalsCard: React.FC<MonthlyGoalsCardProps> = ({
  targetFollowers,
  currentFollowers,
  targetPosts,
  actualPosts,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
          <span className="text-sm text-gray-500">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (!targetFollowers && !targetPosts) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center border border-orange-100">
              <Target className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">今月の目標</h2>
              <p className="text-xs text-gray-500 mt-0.5">計画ページで目標を設定しましょう</p>
            </div>
          </div>
          <Link
            href="/instagram/plan"
            className="text-xs text-gray-600 hover:text-orange-600 font-medium flex items-center gap-1 transition-colors"
          >
            計画を作成
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">目標が設定されていません</p>
        </div>
      </div>
    );
  }

  // フォロワー目標の達成率
  const followerProgress =
    targetFollowers && currentFollowers
      ? Math.min(100, Math.round((currentFollowers / targetFollowers) * 100))
      : 0;
  // 目標に達するために必要な増加数（目標を超えている場合は0）
  const followerIncrease = targetFollowers && currentFollowers 
    ? Math.max(0, targetFollowers - currentFollowers)
    : 0;

  // 投稿目標の達成率
  const postsProgress =
    targetPosts && actualPosts ? Math.min(100, Math.round((actualPosts / targetPosts) * 100)) : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <Target className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">今月の目標</h2>
            <p className="text-xs text-gray-500 mt-0.5">計画ページで設定した目標の進捗</p>
          </div>
        </div>
        <Link
          href="/instagram/plan"
          className="text-xs text-gray-600 hover:text-orange-600 font-medium flex items-center gap-1 transition-colors"
        >
          計画を編集
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-5">
        {/* フォロワー目標 */}
        {targetFollowers && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-medium text-gray-500">フォロワー数</span>
              <span className="text-sm font-semibold text-gray-900">
                {currentFollowers?.toLocaleString() || 0} / {targetFollowers.toLocaleString()}人
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2 overflow-hidden">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ 
                  width: `${Math.min(100, followerProgress)}%`,
                  background: followerProgress >= 100 
                    ? "linear-gradient(to right, #f97316, #ea580c)"
                    : `linear-gradient(to right, #fed7aa ${Math.max(0, followerProgress - 20)}%, #fb923c ${followerProgress}%, #ea580c)`
                }}
              />
            </div>
            <p className="text-xs text-gray-400">
              {followerProgress >= 100 
                ? "🎉 目標達成！" 
                : `あと ${followerIncrease.toLocaleString()}人で目標達成`}
            </p>
          </div>
        )}

        {/* 投稿目標 */}
        {targetPosts && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-medium text-gray-500">投稿数</span>
              <span className="text-sm font-semibold text-gray-900">
                {actualPosts || 0} / {targetPosts}件
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2 overflow-hidden">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ 
                  width: `${Math.min(100, postsProgress)}%`,
                  background: postsProgress >= 100 
                    ? "linear-gradient(to right, #f97316, #ea580c)"
                    : `linear-gradient(to right, #fed7aa ${Math.max(0, postsProgress - 20)}%, #fb923c ${postsProgress}%, #ea580c)`
                }}
              />
            </div>
            <p className="text-xs text-gray-400">
              あと {targetPosts - (actualPosts || 0) > 0 ? targetPosts - (actualPosts || 0) : 0}件で目標達成
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

