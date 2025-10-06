'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Users, Eye, Heart, MessageCircle, Repeat2, MousePointer, UserPlus, AtSign } from 'lucide-react';

interface OverviewData {
  impressions: number;
  profileViews: number;
  mentions: number;
  followers: number;
  following: number;
  tweets: number;
}

interface EngagementData {
  engagementRate: number;
  avgEngagementRate: number;
  retweetRate: number;
  likeRate: number;
  replyRate: number;
  clickRate: number;
}

interface AnalyticsStatsProps {
  title: string;
  data: OverviewData | EngagementData;
  type: 'overview' | 'engagement';
}

export default function AnalyticsStats({ title, data, type }: AnalyticsStatsProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatPercentage = (num: number) => {
    return num.toFixed(1) + '%';
  };

  const getTrendIcon = (value: number, threshold: number = 0) => {
    if (value > threshold) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (value < threshold) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <TrendingUp className="h-4 w-4 text-gray-400" />;
  };

  const getStatIcon = (key: string) => {
    switch (key) {
      case 'impressions':
        return <Eye className="h-5 w-5 text-blue-600" />;
      case 'profileViews':
        return <Users className="h-5 w-5 text-green-600" />;
      case 'mentions':
        return <AtSign className="h-5 w-5 text-purple-600" />;
      case 'followers':
        return <UserPlus className="h-5 w-5 text-indigo-600" />;
      case 'following':
        return <Users className="h-5 w-5 text-gray-600" />;
      case 'tweets':
        return <MessageCircle className="h-5 w-5 text-orange-600" />;
      case 'engagementRate':
        return <TrendingUp className="h-5 w-5 text-red-600" />;
      case 'avgEngagementRate':
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case 'retweetRate':
        return <Repeat2 className="h-5 w-5 text-green-600" />;
      case 'likeRate':
        return <Heart className="h-5 w-5 text-red-600" />;
      case 'replyRate':
        return <MessageCircle className="h-5 w-5 text-blue-600" />;
      case 'clickRate':
        return <MousePointer className="h-5 w-5 text-purple-600" />;
      default:
        return <TrendingUp className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatLabel = (key: string) => {
    switch (key) {
      case 'impressions':
        return 'インプレッション';
      case 'profileViews':
        return 'プロフィール閲覧数';
      case 'mentions':
        return 'メンション数';
      case 'followers':
        return 'フォロワー数';
      case 'following':
        return 'フォロー数';
      case 'tweets':
        return 'ツイート数';
      case 'engagementRate':
        return 'エンゲージメント率';
      case 'avgEngagementRate':
        return '平均エンゲージメント率';
      case 'retweetRate':
        return 'リツイート率';
      case 'likeRate':
        return 'いいね率';
      case 'replyRate':
        return '返信率';
      case 'clickRate':
        return 'クリック率';
      default:
        return key;
    }
  };

  const getStatValue = (key: string, value: number) => {
    if (type === 'engagement' || key.includes('Rate')) {
      return formatPercentage(value);
    }
    return formatNumber(value);
  };

  const getStatColor = (key: string, value: number) => {
    const colors = {
      impressions: 'text-blue-600',
      profileViews: 'text-green-600',
      mentions: 'text-purple-600',
      followers: 'text-indigo-600',
      following: 'text-gray-600',
      tweets: 'text-orange-600',
      engagementRate: value > 3 ? 'text-green-600' : value > 1 ? 'text-yellow-600' : 'text-red-600',
      avgEngagementRate: value > 3 ? 'text-green-600' : value > 1 ? 'text-yellow-600' : 'text-red-600',
      retweetRate: value > 2 ? 'text-green-600' : value > 1 ? 'text-yellow-600' : 'text-red-600',
      likeRate: value > 5 ? 'text-green-600' : value > 2 ? 'text-yellow-600' : 'text-red-600',
      replyRate: value > 2 ? 'text-green-600' : value > 1 ? 'text-yellow-600' : 'text-red-600',
      clickRate: value > 3 ? 'text-green-600' : value > 1 ? 'text-yellow-600' : 'text-red-600',
    };
    return colors[key as keyof typeof colors] || 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">{title}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStatIcon(key)}
                  <span className="text-sm font-medium text-gray-700">
                    {getStatLabel(key)}
                  </span>
                </div>
                {getTrendIcon(value, type === 'engagement' ? 2 : 0)}
              </div>
              
              <div className="flex items-center justify-between">
                <span className={`text-2xl font-bold ${getStatColor(key, value)}`}>
                  {getStatValue(key, value)}
                </span>
                
                {type === 'engagement' && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      {key === 'engagementRate' && '全体平均'}
                      {key === 'avgEngagementRate' && '投稿平均'}
                      {key === 'retweetRate' && 'リツイート/インプレッション'}
                      {key === 'likeRate' && 'いいね/インプレッション'}
                      {key === 'replyRate' && '返信/インプレッション'}
                      {key === 'clickRate' && 'クリック/インプレッション'}
                    </div>
                  </div>
                )}
              </div>
              
              {type === 'overview' && (
                <div className="mt-2 text-xs text-gray-500">
                  {key === 'impressions' && '投稿の表示回数'}
                  {key === 'profileViews' && 'プロフィールページの閲覧数'}
                  {key === 'mentions' && 'アカウントが言及された回数'}
                  {key === 'followers' && 'フォロワー数'}
                  {key === 'following' && 'フォロー数'}
                  {key === 'tweets' && '投稿したツイート数'}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {type === 'engagement' && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">エンゲージメント率の目安</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-blue-800">
              <div>
                <span className="font-medium">良好:</span> 3%以上
              </div>
              <div>
                <span className="font-medium">平均的:</span> 1-3%
              </div>
              <div>
                <span className="font-medium">改善必要:</span> 1%未満
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
