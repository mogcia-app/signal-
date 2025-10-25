'use client';

import React from 'react';
import { BarChart3, Heart, MessageCircle, Share, Eye, Save, Play, Users, TrendingUp, Target, Clock } from 'lucide-react';
import { AnalyticsData } from './types';

interface ReelAnalyticsStatsProps {
  analyticsData: AnalyticsData[];
  isLoading: boolean;
}

const ReelAnalyticsStats: React.FC<ReelAnalyticsStatsProps> = ({
  analyticsData,
  isLoading
}) => {
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
        <h3 className="text-lg font-semibold text-black mb-4">リール統計データ</h3>
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 text-black mx-auto mb-4" />
          <p className="text-black">リールデータを入力すると統計が表示されます</p>
        </div>
      </div>
    );
  }

  // リール用の統計計算（リール投稿のみ）
  const reelData = analyticsData.filter(data => data.category === 'reel');
  
  const totalLikes = reelData.reduce((sum, data) => sum + (Number(data.likes) || 0), 0);
  const totalComments = reelData.reduce((sum, data) => sum + (Number(data.comments) || 0), 0);
  const totalShares = reelData.reduce((sum, data) => sum + (Number(data.shares) || 0), 0);
  const totalReposts = reelData.reduce((sum, data) => sum + (Number(data.reposts) || 0), 0);
  const totalSaves = reelData.reduce((sum, data) => sum + (Number(data.saves) || 0), 0);
  const totalReach = reelData.reduce((sum, data) => sum + (Number(data.reach) || 0), 0);
  
  // リール専用フィールドの統計
  const totalReelInteractionCount = reelData.reduce((sum, data) => sum + (Number(data.reelInteractionCount) || 0), 0);
  const avgReelReachFollowerPercent = reelData.length > 0 ? 
    reelData.reduce((sum, data) => sum + (Number(data.reelReachFollowerPercent) || 0), 0) / reelData.length : 0;
  const avgReelInteractionFollowerPercent = reelData.length > 0 ? 
    reelData.reduce((sum, data) => sum + (Number(data.reelInteractionFollowerPercent) || 0), 0) / reelData.length : 0;
  
  const totalReelReachSourceProfile = reelData.reduce((sum, data) => sum + (Number(data.reelReachSourceProfile) || 0), 0);
  const totalReelReachSourceReel = reelData.reduce((sum, data) => sum + (Number(data.reelReachSourceReel) || 0), 0);
  const totalReelReachSourceExplore = reelData.reduce((sum, data) => sum + (Number(data.reelReachSourceExplore) || 0), 0);
  const totalReelReachSourceSearch = reelData.reduce((sum, data) => sum + (Number(data.reelReachSourceSearch) || 0), 0);
  const totalReelReachSourceOther = reelData.reduce((sum, data) => sum + (Number(data.reelReachSourceOther) || 0), 0);
  
  const totalReelReachedAccounts = reelData.reduce((sum, data) => sum + (Number(data.reelReachedAccounts) || 0), 0);
  
  const avgReelSkipRate = reelData.length > 0 ? 
    reelData.reduce((sum, data) => sum + (Number(data.reelSkipRate) || 0), 0) / reelData.length : 0;
  const avgReelNormalSkipRate = reelData.length > 0 ? 
    reelData.reduce((sum, data) => sum + (Number(data.reelNormalSkipRate) || 0), 0) / reelData.length : 0;
  
  const totalReelPlayTime = reelData.reduce((sum, data) => sum + (Number(data.reelPlayTime) || 0), 0);
  const avgReelPlayTime = reelData.length > 0 ? 
    reelData.reduce((sum, data) => sum + (Number(data.reelAvgPlayTime) || 0), 0) / reelData.length : 0;

  return (
    <div className="bg-white border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
        リール統計データ
      </h3>
      
      {/* リール反応データ */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">リール反応データ</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{totalLikes.toLocaleString()}</div>
                <div className="text-sm text-gray-600">総いいね数</div>
              </div>
              <Heart className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{totalComments.toLocaleString()}</div>
                <div className="text-sm text-gray-600">総コメント数</div>
              </div>
              <MessageCircle className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{totalShares.toLocaleString()}</div>
                <div className="text-sm text-gray-600">総シェア数</div>
              </div>
              <Share className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{totalReposts.toLocaleString()}</div>
                <div className="text-sm text-gray-600">総リポスト数</div>
              </div>
              <Share className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{totalSaves.toLocaleString()}</div>
                <div className="text-sm text-gray-600">総保存数</div>
              </div>
              <Save className="w-8 h-8 text-[#ff8a15]" />
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
                  <div className="text-2xl font-bold text-gray-800">{totalReach.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">総閲覧数</div>
                </div>
                <Eye className="w-8 h-8 text-[#ff8a15]" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-800">{totalReelInteractionCount.toLocaleString()}</div>
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
                  <div className="text-2xl font-bold text-gray-800">{avgReelReachFollowerPercent.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">平均閲覧フォロワー%</div>
                </div>
                <Target className="w-8 h-8 text-[#ff8a15]" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-800">{avgReelInteractionFollowerPercent.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">平均インタラクションフォロワー%</div>
                </div>
                <Target className="w-8 h-8 text-[#ff8a15]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 閲覧数の上位ソース */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">閲覧数の上位ソース</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{totalReelReachSourceProfile.toLocaleString()}</div>
                <div className="text-sm text-gray-600">プロフィール</div>
              </div>
              <Users className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{totalReelReachSourceReel.toLocaleString()}</div>
                <div className="text-sm text-gray-600">リール</div>
              </div>
              <Play className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{totalReelReachSourceExplore.toLocaleString()}</div>
                <div className="text-sm text-gray-600">発見</div>
              </div>
              <TrendingUp className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{totalReelReachSourceSearch.toLocaleString()}</div>
                <div className="text-sm text-gray-600">検索</div>
              </div>
              <Target className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{totalReelReachSourceOther.toLocaleString()}</div>
                <div className="text-sm text-gray-600">その他</div>
              </div>
              <BarChart3 className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>
        </div>
      </div>

      {/* リーチしたアカウント */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">リーチしたアカウント</h4>
        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-800">{totalReelReachedAccounts.toLocaleString()}</div>
              <div className="text-sm text-gray-600">リーチしたアカウント数</div>
            </div>
            <Users className="w-8 h-8 text-[#ff8a15]" />
          </div>
        </div>
      </div>

      {/* スキップ率 */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">スキップ率</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{avgReelSkipRate.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">リールのスキップ率</div>
              </div>
              <TrendingUp className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{avgReelNormalSkipRate.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">通常のスキップ率</div>
              </div>
              <BarChart3 className="w-8 h-8 text-[#ff8a15]" />
            </div>
          </div>
        </div>
      </div>

      {/* 再生時間 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-800">{totalReelPlayTime.toLocaleString()}</div>
              <div className="text-sm text-gray-600">総再生時間</div>
            </div>
            <Clock className="w-8 h-8 text-[#ff8a15]" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-800">{avgReelPlayTime.toFixed(1)}</div>
              <div className="text-sm text-gray-600">平均再生時間</div>
            </div>
            <Clock className="w-8 h-8 text-[#ff8a15]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReelAnalyticsStats;
