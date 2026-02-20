"use client";

import React from "react";

interface PerformanceScoreProps {
  score: number;
  rating: "S" | "A" | "B" | "C" | "D" | "F";
  label: string;
  color: string;
  breakdown: {
    engagement: number;
    growth: number;
    quality: number;
    consistency: number;
  };
  kpis: {
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalReposts: number;
    totalSaves: number;
    totalFollowerIncrease: number;
    totalReach: number;
    engagementRate: number | null;
    engagementRateNeedsReachInput: boolean;
  };
  metrics: {
    postCount: number;
    analyzedCount: number;
    hasPlan: boolean;
  };
  isLoading?: boolean;
}

export const PerformanceScore: React.FC<PerformanceScoreProps> = ({
  score: _score,
  rating: _rating,
  label: _label,
  color: _color,
  breakdown: _breakdown,
  kpis,
  metrics,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 w-1/3 mb-3"></div>
          <div className="h-24 bg-gray-200"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 p-4 mb-4">
      <h2 className="text-base font-bold text-gray-900 mb-4">
        パフォーマンス評価
      </h2>

      {/* KPI表示 */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-gray-700 mb-2">主要KPI</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-2 md:gap-3">
          <div className="bg-white p-2 sm:p-3 border border-gray-200">
            <p className="text-xs font-medium text-gray-700 mb-0.5 sm:mb-1">いいね数</p>
            <p className="text-sm sm:text-base md:text-lg font-bold text-[#ff8a15] break-all">
              {kpis.totalLikes.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-2 sm:p-3 border border-gray-200">
            <p className="text-xs font-medium text-purple-700 mb-0.5 sm:mb-1">コメント数</p>
            <p className="text-sm sm:text-base md:text-lg font-bold text-purple-900 break-all">
              {kpis.totalComments.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-2 sm:p-3 border border-gray-200">
            <p className="text-xs font-medium text-sky-700 mb-0.5 sm:mb-1">シェア数</p>
            <p className="text-sm sm:text-base md:text-lg font-bold text-sky-900 break-all">
              {kpis.totalShares.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-2 sm:p-3 border border-gray-200">
            <p className="text-xs font-medium text-indigo-700 mb-0.5 sm:mb-1">リポスト数</p>
            <p className="text-sm sm:text-base md:text-lg font-bold text-indigo-900 break-all">
              {kpis.totalReposts.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-2 sm:p-3 border border-gray-200">
            <p className="text-xs font-medium text-green-700 mb-0.5 sm:mb-1">保存数</p>
            <p className="text-sm sm:text-base md:text-lg font-bold text-green-900 break-all">
              {kpis.totalSaves.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-2 sm:p-3 border border-gray-200">
            <p className="text-xs font-medium text-pink-700 mb-0.5 sm:mb-1">フォロワー増減</p>
            <p className={`text-sm sm:text-base md:text-lg font-bold break-all ${
              kpis.totalFollowerIncrease >= 0 ? "text-pink-900" : "text-red-600"
            }`}>
              {kpis.totalFollowerIncrease >= 0 ? "+" : ""}
              {kpis.totalFollowerIncrease.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-2 sm:p-3 border border-gray-200">
            <p className="text-xs font-medium text-amber-700 mb-0.5 sm:mb-1">エンゲージメント率</p>
            {kpis.engagementRateNeedsReachInput ? (
              <p className="text-[11px] sm:text-xs font-medium text-gray-600 leading-relaxed">
                閲覧数の入力が必要です
              </p>
            ) : (
              <p className="text-sm sm:text-base md:text-lg font-bold text-amber-900 break-all">
                {kpis.engagementRate === null ? "-" : `${kpis.engagementRate.toFixed(1)}%`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* メトリクス表示 */}
      <div className="pt-3 sm:pt-4 border-t border-gray-200">
        <h3 className="text-xs font-semibold text-gray-700 mb-2">基本情報</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2 md:gap-3">
          <div className="bg-white p-2 sm:p-3 border border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-0.5 sm:mb-1">投稿数</p>
            <p className="text-sm sm:text-base font-bold text-gray-900">{metrics.postCount}件</p>
          </div>
          <div className="bg-white p-2 sm:p-3 border border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-0.5 sm:mb-1">分析済み数</p>
            <p className="text-sm sm:text-base font-bold text-gray-900">{metrics.analyzedCount}件</p>
          </div>
          <div className="bg-white p-2 sm:p-3 border border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-0.5 sm:mb-1">運用計画</p>
            <p className="text-sm sm:text-base font-bold">
              {metrics.hasPlan ? (
                <span className="text-green-600">作成済み</span>
              ) : (
                <span className="text-gray-400">未設定</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
