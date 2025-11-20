"use client";

import React from "react";
import { Info } from "lucide-react";

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
    totalReach: number;
    totalSaves: number;
    totalComments: number;
    totalFollowerIncrease: number;
  };
  metrics: {
    postCount: number;
    analyzedCount: number;
    hasPlan: boolean;
  };
  isLoading?: boolean;
}

const ratingColors: Record<string, { bg: string; text: string; border: string }> = {
  S: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" },
  A: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
  B: { bg: "bg-green-100", text: "text-green-700", border: "border-green-300" },
  C: { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300" },
  D: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" },
  F: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" },
};

export const PerformanceScore: React.FC<PerformanceScoreProps> = ({
  score,
  rating,
  label,
  color,
  breakdown,
  kpis,
  metrics,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const ratingStyle = ratingColors[rating] || ratingColors.C;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        パフォーマンス評価
      </h2>

      {/* スコア表示 */}
      <div className="mb-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4">
          {/* 評価バッジ */}
          <div className="flex-shrink-0">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full ${ratingStyle.bg} ${ratingStyle.border} border-2 flex items-center justify-center mx-auto shadow-sm`}
            >
              <span className={`text-2xl sm:text-3xl font-bold ${ratingStyle.text}`}>{rating}</span>
            </div>
            <div className={`text-center mt-2 text-sm font-semibold ${ratingStyle.text}`}>{label}</div>
            <div className="text-center mt-0.5 text-xs text-gray-600 font-medium">スコア: {score}点</div>
          </div>

          {/* スコア内訳 */}
          <div className="flex-1 w-full sm:w-auto">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">スコア内訳</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {/* エンゲージメント */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200 shadow-sm relative">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-medium text-gray-700">エンゲージメント</p>
                <div className="relative group">
                  <Info className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 w-56 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                    <div className="font-semibold mb-1">エンゲージメントスコア</div>
                    <div className="text-gray-300">
                      いいね、コメント、シェアの合計をリーチ数で割ったエンゲージメント率に基づいて評価します。最大50点。
                    </div>
                    <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{breakdown.engagement}</p>
              <p className="text-xs text-gray-500 mt-0.5">/ 50点</p>
              </div>

              {/* 成長 */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200 shadow-sm relative">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-medium text-gray-700">成長</p>
                <div className="relative group">
                  <Info className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 w-56 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                    <div className="font-semibold mb-1">成長スコア</div>
                    <div className="text-gray-300">
                      期間内の全投稿によるフォロワー増加数の合計に基づいて評価します。最大25点。
                    </div>
                    <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{breakdown.growth}</p>
              <p className="text-xs text-gray-500 mt-0.5">/ 25点</p>
              </div>

              {/* 品質 */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200 shadow-sm relative">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-medium text-gray-700">品質</p>
                <div className="relative group">
                  <Info className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 w-56 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                    <div className="font-semibold mb-1">品質スコア</div>
                    <div className="text-gray-300">
                      期間内の全投稿の平均リーチ数に基づいて評価します。最大15点。
                    </div>
                    <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{breakdown.quality}</p>
              <p className="text-xs text-gray-500 mt-0.5">/ 15点</p>
              </div>

              {/* 一貫性 */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200 shadow-sm relative">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-medium text-gray-700">一貫性</p>
                <div className="relative group">
                  <Info className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 w-56 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                    <div className="font-semibold mb-1">一貫性スコア</div>
                    <div className="text-gray-300">
                      週間投稿数（月間投稿数 ÷ 4）に基づいて評価します。最大10点。
                    </div>
                    <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{breakdown.consistency}</p>
              <p className="text-xs text-gray-500 mt-0.5">/ 10点</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI表示 */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-gray-700 mb-2">主要KPI</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200 shadow-sm">
            <p className="text-xs font-medium text-orange-700 mb-1">いいね数</p>
            <p className="text-base sm:text-lg font-bold text-orange-900">
              {kpis.totalLikes.toLocaleString()}
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200 shadow-sm">
            <p className="text-xs font-medium text-blue-700 mb-1">リーチ数</p>
            <p className="text-base sm:text-lg font-bold text-blue-900">
              {kpis.totalReach.toLocaleString()}
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200 shadow-sm">
            <p className="text-xs font-medium text-green-700 mb-1">保存数</p>
            <p className="text-base sm:text-lg font-bold text-green-900">
              {kpis.totalSaves.toLocaleString()}
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200 shadow-sm">
            <p className="text-xs font-medium text-purple-700 mb-1">コメント数</p>
            <p className="text-base sm:text-lg font-bold text-purple-900">
              {kpis.totalComments.toLocaleString()}
            </p>
          </div>
          <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-3 border border-pink-200 shadow-sm">
            <p className="text-xs font-medium text-pink-700 mb-1">フォロワー増減</p>
            <p className={`text-base sm:text-lg font-bold ${
              kpis.totalFollowerIncrease >= 0 ? "text-pink-900" : "text-red-600"
            }`}>
              {kpis.totalFollowerIncrease >= 0 ? "+" : ""}
              {kpis.totalFollowerIncrease.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* メトリクス表示 */}
      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-xs font-semibold text-gray-700 mb-2">基本情報</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-1">投稿数</p>
            <p className="text-base font-bold text-gray-900">{metrics.postCount}件</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-1">分析済み数</p>
            <p className="text-base font-bold text-gray-900">{metrics.analyzedCount}件</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-1">運用計画</p>
            <p className="text-base font-bold">
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

