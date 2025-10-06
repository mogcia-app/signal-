'use client';

import React from 'react';
import { BarChart3, Heart, MessageCircle, Share, Eye, Save, UserPlus, Users, Target } from 'lucide-react';
import { AnalyticsData } from './types';

interface AnalyticsStatsProps {
  analyticsData: AnalyticsData[];
  isLoading: boolean;
}

const AnalyticsStats: React.FC<AnalyticsStatsProps> = ({
  analyticsData,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">統計を計算中...</span>
        </div>
      </div>
    );
  }

  if (analyticsData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">統計データ</h3>
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">データを入力すると統計が表示されます</p>
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
  const totalFollowerIncrease = analyticsData.reduce((sum, data) => sum + (Number(data.followerIncrease) || 0), 0);
  const avgEngagementRate = analyticsData.length > 0 
    ? analyticsData.reduce((sum, data) => sum + (Number(data.engagementRate) || 0), 0) / analyticsData.length 
    : 0;

  // オーディエンス分析統計
  const audienceData = analyticsData.filter(data => data.audience);
  const avgAudienceStats = audienceData.length > 0 ? {
    gender: {
      male: audienceData.reduce((sum, data) => sum + (Number(data.audience?.gender.male) || 0), 0) / audienceData.length,
      female: audienceData.reduce((sum, data) => sum + (Number(data.audience?.gender.female) || 0), 0) / audienceData.length,
      other: audienceData.reduce((sum, data) => sum + (Number(data.audience?.gender.other) || 0), 0) / audienceData.length,
    },
    age: {
      '13-17': audienceData.reduce((sum, data) => sum + (Number(data.audience?.age['13-17']) || 0), 0) / audienceData.length,
      '18-24': audienceData.reduce((sum, data) => sum + (Number(data.audience?.age['18-24']) || 0), 0) / audienceData.length,
      '25-34': audienceData.reduce((sum, data) => sum + (Number(data.audience?.age['25-34']) || 0), 0) / audienceData.length,
      '35-44': audienceData.reduce((sum, data) => sum + (Number(data.audience?.age['35-44']) || 0), 0) / audienceData.length,
      '45-54': audienceData.reduce((sum, data) => sum + (Number(data.audience?.age['45-54']) || 0), 0) / audienceData.length,
      '55-64': audienceData.reduce((sum, data) => sum + (Number(data.audience?.age['55-64']) || 0), 0) / audienceData.length,
      '65+': audienceData.reduce((sum, data) => sum + (Number(data.audience?.age['65+']) || 0), 0) / audienceData.length,
    }
  } : null;

  // 閲覧数ソース分析統計
  const reachSourceData = analyticsData.filter(data => data.reachSource);
  const avgReachSourceStats = reachSourceData.length > 0 ? {
    sources: {
      posts: reachSourceData.reduce((sum, data) => sum + (Number(data.reachSource?.sources.posts) || 0), 0) / reachSourceData.length,
      profile: reachSourceData.reduce((sum, data) => sum + (Number(data.reachSource?.sources.profile) || 0), 0) / reachSourceData.length,
      explore: reachSourceData.reduce((sum, data) => sum + (Number(data.reachSource?.sources.explore) || 0), 0) / reachSourceData.length,
      search: reachSourceData.reduce((sum, data) => sum + (Number(data.reachSource?.sources.search) || 0), 0) / reachSourceData.length,
      other: reachSourceData.reduce((sum, data) => sum + (Number(data.reachSource?.sources.other) || 0), 0) / reachSourceData.length,
    },
    followers: {
      followers: reachSourceData.reduce((sum, data) => sum + (Number(data.reachSource?.followers.followers) || 0), 0) / reachSourceData.length,
      nonFollowers: reachSourceData.reduce((sum, data) => sum + (Number(data.reachSource?.followers.nonFollowers) || 0), 0) / reachSourceData.length,
    }
  } : null;

  return (
    <div className="space-y-6">
      {/* 基本統計 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">投稿分析統計</h2>
            <p className="text-sm text-gray-600">全投稿の合計・平均データ</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Heart className="w-5 h-5 text-red-500" />
              <span className="text-2xl font-bold text-gray-700">{isNaN(totalLikes) ? '0' : totalLikes.toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-600">総いいね数</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold text-gray-700">{isNaN(totalComments) ? '0' : totalComments.toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-600">総コメント数</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Share className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold text-gray-700">{isNaN(totalShares) ? '0' : totalShares.toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-600">総シェア数</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-5 h-5 text-purple-500" />
              <span className="text-2xl font-bold text-gray-700">{isNaN(totalReach) ? '0' : totalReach.toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-600">総閲覧数</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Save className="w-5 h-5 text-yellow-500" />
              <span className="text-2xl font-bold text-gray-700">{isNaN(totalSaves) ? '0' : totalSaves.toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-600">総保存数</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <UserPlus className="w-5 h-5 text-indigo-500" />
              <span className="text-2xl font-bold text-gray-700">{isNaN(totalFollowerIncrease) ? '0' : totalFollowerIncrease.toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-600">総フォロワー増加数</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg col-span-2">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold text-gray-700">{isNaN(avgEngagementRate) ? '0.00' : avgEngagementRate.toFixed(2)}%</span>
            </div>
            <p className="text-sm text-gray-600">平均エンゲージメント率</p>
          </div>
        </div>
      </div>

      {/* オーディエンス分析統計 */}
      {avgAudienceStats && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center mr-3">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">オーディエンス分析統計</h2>
              <p className="text-sm text-gray-600">平均的なフォロワー構成</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">性別分析</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">👨 男性</span>
                  <span className="font-medium">{isNaN(avgAudienceStats.gender.male) ? '0.0' : avgAudienceStats.gender.male.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">👩 女性</span>
                  <span className="font-medium">{isNaN(avgAudienceStats.gender.female) ? '0.0' : avgAudienceStats.gender.female.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">🏳️‍🌈 その他</span>
                  <span className="font-medium">{isNaN(avgAudienceStats.gender.other) ? '0.0' : avgAudienceStats.gender.other.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">年齢層分析</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">18-24歳</span>
                  <span className="font-medium">{isNaN(avgAudienceStats.age['18-24']) ? '0.0' : avgAudienceStats.age['18-24'].toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">25-34歳</span>
                  <span className="font-medium">{isNaN(avgAudienceStats.age['25-34']) ? '0.0' : avgAudienceStats.age['25-34'].toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">35-44歳</span>
                  <span className="font-medium">{isNaN(avgAudienceStats.age['35-44']) ? '0.0' : avgAudienceStats.age['35-44'].toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 閲覧数ソース分析統計 */}
      {avgReachSourceStats && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center mr-3">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">閲覧数ソース分析統計</h2>
              <p className="text-sm text-gray-600">平均的な閲覧数流入元</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">閲覧数ソース</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">📱 投稿</span>
                  <span className="font-medium">{avgReachSourceStats.sources.posts.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">👤 プロフィール</span>
                  <span className="font-medium">{avgReachSourceStats.sources.profile.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">🔍 検索</span>
                  <span className="font-medium">{avgReachSourceStats.sources.search.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">🌟 探索</span>
                  <span className="font-medium">{avgReachSourceStats.sources.explore.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">フォロワー構成</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">👥 フォロワー内</span>
                  <span className="font-medium">{avgReachSourceStats.followers.followers.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">🌐 フォロワー外</span>
                  <span className="font-medium">{avgReachSourceStats.followers.nonFollowers.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsStats;
