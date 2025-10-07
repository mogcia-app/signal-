'use client';

import React from 'react';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

interface GrowthTrendData {
  period: string;
  likes: number;
  retweets: number;
  comments: number;
  impressions: number;
  followers: number;
}

interface GrowthTrendAnalysisProps {
  currentData: {
    totalLikes: number;
    totalRetweets: number;
    totalComments: number;
    totalImpressions: number;
    totalFollowers: number;
  };
  previousData?: {
    totalLikes: number;
    totalRetweets: number;
    totalComments: number;
    totalImpressions: number;
    totalFollowers: number;
  };
  weeklyTrend?: GrowthTrendData[];
}

export function GrowthTrendAnalysis({ currentData, previousData, weeklyTrend }: GrowthTrendAnalysisProps) {
  // 前月比の成長率を計算
  const calculateGrowthRate = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const growthRates = {
    likes: previousData ? calculateGrowthRate(currentData.totalLikes, previousData.totalLikes) : 0,
    retweets: previousData ? calculateGrowthRate(currentData.totalRetweets, previousData.totalRetweets) : 0,
    comments: previousData ? calculateGrowthRate(currentData.totalComments, previousData.totalComments) : 0,
    impressions: previousData ? calculateGrowthRate(currentData.totalImpressions, previousData.totalImpressions) : 0,
    followers: previousData ? calculateGrowthRate(currentData.totalFollowers, previousData.totalFollowers) : 0,
  };

  const getGrowthIcon = (rate: number) => {
    if (rate > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (rate < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <BarChart3 className="w-4 h-4 text-gray-500" />;
  };

  const getGrowthColor = (rate: number) => {
    if (rate > 0) return 'text-green-600 bg-green-50 border-green-200';
    if (rate < 0) return 'text-red-600 bg-red-50 border-red-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const formatGrowthRate = (rate: number) => {
    const sign = rate > 0 ? '+' : '';
    return `${sign}${rate.toFixed(1)}%`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-6">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">成長トレンド分析</h3>
      </div>

      {/* 前月比成長率 */}
      <div className="mb-8">
        <h4 className="text-sm font-medium text-gray-700 mb-4">前月比成長率</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className={`p-4 rounded-lg border ${getGrowthColor(growthRates.likes)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">いいね</span>
              {getGrowthIcon(growthRates.likes)}
            </div>
            <div className="text-2xl font-bold">{formatGrowthRate(growthRates.likes)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {currentData.totalLikes.toLocaleString()} / {previousData?.totalLikes.toLocaleString() || 0}
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${getGrowthColor(growthRates.retweets)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">リツイート</span>
              {getGrowthIcon(growthRates.retweets)}
            </div>
            <div className="text-2xl font-bold">{formatGrowthRate(growthRates.retweets)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {currentData.totalRetweets.toLocaleString()} / {previousData?.totalRetweets.toLocaleString() || 0}
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${getGrowthColor(growthRates.comments)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">コメント</span>
              {getGrowthIcon(growthRates.comments)}
            </div>
            <div className="text-2xl font-bold">{formatGrowthRate(growthRates.comments)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {currentData.totalComments.toLocaleString()} / {previousData?.totalComments.toLocaleString() || 0}
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${getGrowthColor(growthRates.impressions)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">インプレッション</span>
              {getGrowthIcon(growthRates.impressions)}
            </div>
            <div className="text-2xl font-bold">{formatGrowthRate(growthRates.impressions)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {currentData.totalImpressions.toLocaleString()} / {previousData?.totalImpressions.toLocaleString() || 0}
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${getGrowthColor(growthRates.followers)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">フォロワー</span>
              {getGrowthIcon(growthRates.followers)}
            </div>
            <div className="text-2xl font-bold">{formatGrowthRate(growthRates.followers)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {currentData.totalFollowers.toLocaleString()} / {previousData?.totalFollowers.toLocaleString() || 0}
            </div>
          </div>
        </div>
      </div>

      {/* 週次トレンド（簡易版） */}
      {weeklyTrend && weeklyTrend.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-4">週次トレンド</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {weeklyTrend.slice(0, 4).map((week, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-sm font-medium text-gray-700 mb-2">{week.period}</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>いいね</span>
                    <span className="font-medium">{week.likes.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>リツイート</span>
                    <span className="font-medium">{week.retweets.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>コメント</span>
                    <span className="font-medium">{week.comments.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>インプレッション</span>
                    <span className="font-medium">{week.impressions.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 成長予測 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-sm font-medium text-blue-900 mb-2">成長予測</h4>
        <p className="text-sm text-blue-800">
          現在の成長率を維持した場合、来月は
          <span className="font-semibold">
            {growthRates.followers > 0 ? `+${Math.round(currentData.totalFollowers * (growthRates.followers / 100))}` : '0'}
          </span>
          人のフォロワー増加が見込まれます。
        </p>
      </div>
    </div>
  );
}
