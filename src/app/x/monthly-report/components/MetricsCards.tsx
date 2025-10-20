import React from 'react';
import { MessageCircle, Users, Eye, Heart, Repeat2, MousePointer, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricsCardsProps {
  totals: {
    totalPosts: number;
    totalFollowers: number;
    totalImpressions: number;
    totalLikes: number;
    totalRetweets: number;
    totalEngagements: number;
    totalComments: number;
    totalSaves: number;
  };
  engagement: {
    engagementRate: number;
    likeRate: number;
    retweetRate: number;
    replyRate: number;
  };
  changes?: {
    postsChange: number;
    followerChange: number;
    impressionsChange: number;
    likesChange: number;
    retweetsChange: number;
    engagementsChange: number;
  };
}

export function MetricsCards({ totals, engagement, changes }: MetricsCardsProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const formatPercentage = (num: number) => {
    return num.toFixed(1);
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return null;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-black';
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* 投稿数 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MessageCircle className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold text-black">{formatNumber(totals.totalPosts)}</p>
            <p className="text-sm text-black">投稿数</p>
            {changes && (
              <div className="flex items-center space-x-1 mt-1">
                {getChangeIcon(changes.postsChange)}
                <span className={`text-xs ${getChangeColor(changes.postsChange)}`}>
                  {changes.postsChange > 0 ? '+' : ''}{changes.postsChange}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* フォロワー数 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Users className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold text-black">{formatNumber(totals.totalFollowers)}</p>
            <p className="text-sm text-black">フォロワー</p>
            {changes && (
              <div className="flex items-center space-x-1 mt-1">
                {getChangeIcon(changes.followerChange)}
                <span className={`text-xs ${getChangeColor(changes.followerChange)}`}>
                  {changes.followerChange > 0 ? '+' : ''}{changes.followerChange}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* インプレッション */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Eye className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold text-black">{formatNumber(totals.totalImpressions)}</p>
            <p className="text-sm text-black">インプレッション</p>
            {changes && (
              <div className="flex items-center space-x-1 mt-1">
                {getChangeIcon(changes.impressionsChange)}
                <span className={`text-xs ${getChangeColor(changes.impressionsChange)}`}>
                  {changes.impressionsChange > 0 ? '+' : ''}{changes.impressionsChange}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* いいね率 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <Heart className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold text-black">{formatPercentage(engagement.likeRate)}%</p>
            <p className="text-sm text-black">いいね率</p>
            <p className="text-xs text-black mt-1">
              {formatNumber(totals.totalLikes)} いいね
            </p>
          </div>
        </div>
      </div>

      {/* リツイート率 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Repeat2 className="h-5 w-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold text-black">{formatPercentage(engagement.retweetRate)}%</p>
            <p className="text-sm text-black">リツイート率</p>
            <p className="text-xs text-black mt-1">
              {formatNumber(totals.totalRetweets)} リツイート
            </p>
          </div>
        </div>
      </div>

      {/* エンゲージメント率 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <MousePointer className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold text-black">{formatPercentage(engagement.engagementRate)}%</p>
            <p className="text-sm text-black">エンゲージメント率</p>
            <p className="text-xs text-black mt-1">
              {formatNumber(totals.totalEngagements)} エンゲージメント
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
