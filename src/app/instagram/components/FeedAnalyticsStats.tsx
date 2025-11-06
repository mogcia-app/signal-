"use client";

import React from "react";
import {
  BarChart3,
  Heart,
  MessageCircle,
  Share,
  Eye,
  Save,
  UserPlus,
  Users,
  TrendingUp,
  Target,
} from "lucide-react";
import { AnalyticsData } from "./types";

interface FeedAnalyticsStatsProps {
  analyticsData: AnalyticsData[];
  isLoading: boolean;
}

const FeedAnalyticsStats: React.FC<FeedAnalyticsStatsProps> = ({ analyticsData, isLoading }) => {
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
        <h3 className="text-lg font-semibold text-black mb-4">フィード統計データ</h3>
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 text-black mx-auto mb-4" />
          <p className="text-black">フィードデータを入力すると統計が表示されます</p>
        </div>
      </div>
    );
  }

  // フィード用の統計計算（フィード投稿のみ）
  const feedData = analyticsData.filter((data) => data.category === "feed");

  // 基本反応データ
  const totalLikes = feedData.reduce((sum, data) => sum + (Number(data.likes) || 0), 0);
  const totalComments = feedData.reduce((sum, data) => sum + (Number(data.comments) || 0), 0);
  const totalShares = feedData.reduce((sum, data) => sum + (Number(data.shares) || 0), 0);
  const totalReposts = feedData.reduce((sum, data) => sum + (Number(data.reposts) || 0), 0);
  const totalReach = feedData.reduce((sum, data) => sum + (Number(data.reach) || 0), 0);
  const totalSaves = feedData.reduce((sum, data) => sum + (Number(data.saves) || 0), 0);
  const totalFollowerIncrease = feedData.reduce(
    (sum, data) => sum + (Number(data.followerIncrease) || 0),
    0
  );

  // 概要データ
  const totalInteractionCount = feedData.reduce(
    (sum, data) => sum + (Number(data.interactionCount) || 0),
    0
  );
  const avgReachFollowerPercent =
    feedData.length > 0
      ? feedData.reduce((sum, data) => sum + (Number(data.reachFollowerPercent) || 0), 0) /
        feedData.length
      : 0;
  const avgInteractionFollowerPercent =
    feedData.length > 0
      ? feedData.reduce((sum, data) => sum + (Number(data.interactionFollowerPercent) || 0), 0) /
        feedData.length
      : 0;

  // 閲覧上位ソース
  const totalReachSourceProfile = feedData.reduce(
    (sum, data) => sum + (Number(data.reachSourceProfile) || 0),
    0
  );
  const totalReachSourceFeed = feedData.reduce(
    (sum, data) => sum + (Number(data.reachSourceFeed) || 0),
    0
  );
  const totalReachSourceExplore = feedData.reduce(
    (sum, data) => sum + (Number(data.reachSourceExplore) || 0),
    0
  );
  const totalReachSourceSearch = feedData.reduce(
    (sum, data) => sum + (Number(data.reachSourceSearch) || 0),
    0
  );
  const totalReachSourceOther = feedData.reduce(
    (sum, data) => sum + (Number(data.reachSourceOther) || 0),
    0
  );

  // リーチしたアカウント
  const totalReachedAccounts = feedData.reduce(
    (sum, data) => sum + (Number(data.reachedAccounts) || 0),
    0
  );

  // プロフィールのアクティビティ
  const totalProfileVisits = feedData.reduce(
    (sum, data) => sum + (Number(data.profileVisits) || 0),
    0
  );

  return (
    <div className="bg-white shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
        フィード統計データ
      </h3>

      {/* フィード反応データ */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">フィード反応データ</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {totalLikes.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">総いいね数</div>
              </div>
              <Heart className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {totalComments.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">総コメント数</div>
              </div>
              <MessageCircle className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {totalShares.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">総シェア数</div>
              </div>
              <Share className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {totalReposts.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">総リポスト数</div>
              </div>
              <Share className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {totalSaves.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">総保存数</div>
              </div>
              <Save className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {totalFollowerIncrease.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">フォロワー数</div>
              </div>
              <UserPlus className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>
        </div>
      </div>

      {/* 概要 */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">概要</h4>
        <div className="space-y-4">
          {/* 上段：閲覧数とインタラクション数 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-800">
                    {totalReach.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">総閲覧数</div>
                </div>
                <Eye className="w-8 h-8 text-[#ff8a15]" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-800">
                    {totalInteractionCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">総インタラクション数</div>
                </div>
                <TrendingUp className="w-8 h-8 text-[#ff8a15]" />
              </div>
            </div>
          </div>

          {/* 下段：フォロワー% */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-800">
                    {avgReachFollowerPercent.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">平均閲覧フォロワー%</div>
                </div>
                <Target className="w-8 h-8 text-[#ff8a15]" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-800">
                    {avgInteractionFollowerPercent.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">平均インタラクションフォロワー%</div>
                </div>
                <Target className="w-8 h-8 text-[#ff8a15]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 閲覧上位ソース */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">閲覧上位ソース</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {totalReachSourceProfile.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">プロフィール</div>
              </div>
              <Users className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {totalReachSourceFeed.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">フィード</div>
              </div>
              <Eye className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {totalReachSourceExplore.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">発見</div>
              </div>
              <TrendingUp className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {totalReachSourceSearch.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">検索</div>
              </div>
              <Target className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {totalReachSourceOther.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">その他</div>
              </div>
              <BarChart3 className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>
        </div>
      </div>

      {/* リーチしたアカウントとプロフィールアクティビティ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-800">
                {totalReachedAccounts.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">リーチしたアカウント数</div>
            </div>
            <Users className="w-8 h-8 text-[#ff8a15]" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-800">
                {totalProfileVisits.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">プロフィールアクセス数</div>
            </div>
            <Eye className="w-8 h-8 text-[#ff8a15]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedAnalyticsStats;
