"use client";

import React from "react";
import { BarChart3, Heart, MessageCircle, Share, Eye, Save, UserPlus } from "lucide-react";
import { AnalyticsData } from "./types";

interface AnalyticsStatsProps {
  analyticsData: AnalyticsData[];
  isLoading: boolean;
}

const AnalyticsStats: React.FC<AnalyticsStatsProps> = ({ analyticsData, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff8a15]"></div>
          <span className="ml-2 text-black">統計を計算中...</span>
        </div>
      </div>
    );
  }

  if (analyticsData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-black mb-4">統計データ</h3>
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 text-black mx-auto mb-4" />
          <p className="text-black">データを入力すると統計が表示されます</p>
        </div>
      </div>
    );
  }

  // 統計計算（数値変換を確実にする）
  const totalLikes = analyticsData.reduce((sum, data) => sum + (Number(data.likes) || 0), 0);
  const totalComments = analyticsData.reduce((sum, data) => sum + (Number(data.comments) || 0), 0);
  const totalShares = analyticsData.reduce((sum, data) => sum + (Number(data.shares) || 0), 0);
  const totalReach = analyticsData.reduce((sum, data) => sum + (Number(data.reach) || 0), 0);
  const totalSaves = analyticsData.reduce((sum, data) => sum + (Number(data.saves) || 0), 0);
  const totalFollowerIncrease = analyticsData.reduce(
    (sum, data) => sum + (Number(data.followerIncrease) || 0),
    0
  );
  const avgEngagementRate =
    analyticsData.length > 0
      ? analyticsData.reduce((sum, data) => sum + (Number(data.engagementRate) || 0), 0) /
        analyticsData.length
      : 0;

  return (
    <div className="space-y-6">
      {/* 基本統計 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-[#ff8a15] to-orange-600 rounded-lg flex items-center justify-center mr-3">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-black">投稿分析統計</h2>
            <p className="text-sm text-black">全投稿の合計・平均データ</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Heart className="w-5 h-5 text-red-500" />
              <span className="text-2xl font-bold text-gray-700">
                {isNaN(totalLikes) ? "0" : totalLikes.toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-black">総いいね数</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold text-gray-700">
                {isNaN(totalComments) ? "0" : totalComments.toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-black">総コメント数</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Share className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold text-gray-700">
                {isNaN(totalShares) ? "0" : totalShares.toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-black">総シェア数</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-5 h-5 text-purple-500" />
              <span className="text-2xl font-bold text-gray-700">
                {isNaN(totalReach) ? "0" : totalReach.toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-black">総閲覧数</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Save className="w-5 h-5 text-yellow-500" />
              <span className="text-2xl font-bold text-gray-700">
                {isNaN(totalSaves) ? "0" : totalSaves.toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-black">総保存数</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <UserPlus className="w-5 h-5 text-indigo-500" />
              <span className="text-2xl font-bold text-gray-700">
                {isNaN(totalFollowerIncrease) ? "0" : totalFollowerIncrease.toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-black">総フォロワー増加数</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsStats;
