"use client";

import React from "react";
import {
  Heart,
  MessageCircle,
  Share,
  Save,
  Eye,
  Users,
  TrendingUp,
  Clock,
  Loader2,
} from "lucide-react";
import type { FeedStats, ReelStats } from "@/app/api/analytics/kpi-breakdown/route";

interface ContentPerformanceProps {
  feedStats: FeedStats | null;
  reelStats: ReelStats | null;
  isLoading?: boolean;
}

const formatNumber = (value: number) =>
  typeof value === "number" ? value.toLocaleString() : "-";

const formatPercent = (value: number) =>
  typeof value === "number" ? `${value.toFixed(1)}%` : "-";

const formatSeconds = (seconds: number) => {
  if (!seconds || seconds <= 0) {
    return "-";
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m || h) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
};

const StatGrid: React.FC<{
  items: Array<{ label: string; value: string; icon: React.ReactNode }>;
}> = ({ items }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-2 md:gap-3">
    {items.map((item) => (
      <div
        key={item.label}
        className="bg-white border border-gray-200 rounded-lg p-2 sm:p-2.5 md:p-3 flex items-center justify-between"
      >
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-gray-500 truncate">{item.label}</p>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-gray-900 break-all">{item.value}</p>
        </div>
        <div className="flex-shrink-0 ml-1 sm:ml-2">{item.icon}</div>
      </div>
    ))}
  </div>
);

export const ContentPerformance: React.FC<ContentPerformanceProps> = ({
  feedStats,
  reelStats,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
          <span className="text-sm text-gray-700">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (!feedStats && !reelStats) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">フィードまたはリールの分析データがありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4">
      {/* フィード統計サマリー */}
      {feedStats ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0 shadow-sm">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">フィード統計サマリー</h2>
              <p className="text-xs text-gray-600 mt-0.5">フィード投稿の総合統計</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
            <StatGrid
              items={[
                {
                  label: "総いいね",
                  value: formatNumber(feedStats.totalLikes),
                  icon: <Heart className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-500" />,
                },
                {
                  label: "総コメント",
                  value: formatNumber(feedStats.totalComments),
                  icon: <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-500" />,
                },
                {
                  label: "総シェア",
                  value: formatNumber(feedStats.totalShares),
                  icon: <Share className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-500" />,
                },
                {
                  label: "総リーチ",
                  value: formatNumber(feedStats.totalReach),
                  icon: <Eye className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-500" />,
                },
                {
                  label: "総保存",
                  value: formatNumber(feedStats.totalSaves),
                  icon: <Save className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-500" />,
                },
                {
                  label: "フォロワー増加",
                  value: formatNumber(feedStats.totalFollowerIncrease),
                  icon: <Users className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-500" />,
                },
              ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs text-gray-500 mb-1">総インタラクション数</p>
                <p className="text-lg sm:text-xl font-semibold text-gray-900 break-all">
                  {formatNumber(feedStats.totalInteractionCount)}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-2 sm:mt-3">平均閲覧フォロワー%</p>
                <p className="text-sm sm:text-base font-semibold text-gray-900">
                  {formatPercent(feedStats.avgReachFollowerPercent)}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs text-gray-500 mb-1">平均インタラクションフォロワー%</p>
                <p className="text-lg sm:text-xl font-semibold text-gray-900">
                  {formatPercent(feedStats.avgInteractionFollowerPercent)}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-2 sm:mt-3">プロフィールアクセス</p>
                <p className="text-sm sm:text-base font-semibold text-gray-900 break-all">
                  {formatNumber(feedStats.totalProfileVisits)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">閲覧ソース内訳</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { label: "プロフィール", value: feedStats.reachSources.profile },
                  { label: "フィード", value: feedStats.reachSources.feed },
                  { label: "発見", value: feedStats.reachSources.explore },
                  { label: "検索", value: feedStats.reachSources.search },
                  { label: "その他", value: feedStats.reachSources.other },
                ].map((source) => (
                  <div key={source.label} className="bg-white border border-gray-200 rounded-lg p-1.5 sm:p-2">
                    <p className="text-[10px] sm:text-xs text-gray-500">{source.label}</p>
                    <p className="text-sm sm:text-base font-semibold text-gray-900 break-all">
                      {formatNumber(source.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-3 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-gray-500">リーチしたアカウント</p>
                <p className="text-lg sm:text-xl font-semibold text-gray-900 break-all">
                  {formatNumber(feedStats.totalReachedAccounts)}
                </p>
              </div>
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0 ml-2" />
            </div>
          </div>
        </div>
      ) : null}

      {/* リール統計サマリー */}
      {reelStats ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0 shadow-sm">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">リール統計サマリー</h2>
              <p className="text-xs text-gray-600 mt-0.5">リール投稿の総合統計</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
            <StatGrid
              items={[
                {
                  label: "総いいね",
                  value: formatNumber(reelStats.totalLikes),
                  icon: <Heart className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-purple-500" />,
                },
                {
                  label: "総コメント",
                  value: formatNumber(reelStats.totalComments),
                  icon: <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-purple-500" />,
                },
                {
                  label: "総シェア",
                  value: formatNumber(reelStats.totalShares),
                  icon: <Share className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-purple-500" />,
                },
                {
                  label: "総リーチ",
                  value: formatNumber(reelStats.totalReach),
                  icon: <Eye className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-purple-500" />,
                },
                {
                  label: "総保存",
                  value: formatNumber(reelStats.totalSaves),
                  icon: <Save className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-purple-500" />,
                },
                {
                  label: "フォロワー増加",
                  value: formatNumber(reelStats.totalFollowerIncrease),
                  icon: <Users className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-purple-500" />,
                },
              ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs text-gray-500 mb-1">総インタラクション数</p>
                <p className="text-lg sm:text-xl font-semibold text-gray-900 break-all">
                  {formatNumber(reelStats.totalInteractionCount)}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-2 sm:mt-3">平均閲覧フォロワー%</p>
                <p className="text-sm sm:text-base font-semibold text-gray-900">
                  {formatPercent(reelStats.avgReachFollowerPercent)}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs text-gray-500 mb-1">平均インタラクションフォロワー%</p>
                <p className="text-lg sm:text-xl font-semibold text-gray-900">
                  {formatPercent(reelStats.avgInteractionFollowerPercent)}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-2 sm:mt-3">平均再生時間</p>
                <p className="text-sm sm:text-base font-semibold text-gray-900">
                  {formatSeconds(reelStats.avgPlayTimeSeconds)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs text-gray-500">合計再生時間</p>
                <p className="text-lg sm:text-xl font-semibold text-gray-900">
                  {formatSeconds(reelStats.totalPlayTimeSeconds)}
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs text-gray-500">平均スキップ率</p>
                <p className="text-lg sm:text-xl font-semibold text-gray-900">
                  {formatPercent(reelStats.avgSkipRate)}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-2">ノーマルスキップ率</p>
                <p className="text-sm sm:text-base font-semibold text-gray-900">
                  {formatPercent(reelStats.avgNormalSkipRate)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">閲覧ソース内訳</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { label: "プロフィール", value: reelStats.reachSources.profile },
                  { label: "リール", value: reelStats.reachSources.reel },
                  { label: "発見", value: reelStats.reachSources.explore },
                  { label: "検索", value: reelStats.reachSources.search },
                  { label: "その他", value: reelStats.reachSources.other },
                ].map((source) => (
                  <div key={source.label} className="bg-white border border-gray-200 rounded-lg p-1.5 sm:p-2">
                    <p className="text-[10px] sm:text-xs text-gray-500">{source.label}</p>
                    <p className="text-sm sm:text-base font-semibold text-gray-900 break-all">
                      {formatNumber(source.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-3 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-gray-500">リーチしたアカウント</p>
                <p className="text-lg sm:text-xl font-semibold text-gray-900 break-all">
                  {formatNumber(reelStats.totalReachedAccounts)}
                </p>
              </div>
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 flex-shrink-0 ml-2" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

