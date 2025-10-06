'use client';

import React from 'react';
import { X, Eye, Heart, MessageCircle, Repeat2, MousePointer, User, Calendar, TrendingUp } from 'lucide-react';

interface PostData {
  id: string;
  content: string;
  mediaUrls?: string[];
  timestamp: string;
  metrics: {
    impressions: number;
    engagements: number;
    retweets: number;
    likes: number;
    replies: number;
    clicks: number;
    profileClicks: number;
    linkClicks: number;
  };
}

interface PostPreviewProps {
  post: PostData;
  onClose: () => void;
}

export default function PostPreview({ post, onClose }: PostPreviewProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getEngagementRate = () => {
    return post.metrics.impressions > 0 
      ? ((post.metrics.engagements / post.metrics.impressions) * 100).toFixed(1)
      : '0.0';
  };

  const getClickThroughRate = () => {
    return post.metrics.impressions > 0 
      ? ((post.metrics.clicks / post.metrics.impressions) * 100).toFixed(1)
      : '0.0';
  };

  const getRetweetRate = () => {
    return post.metrics.impressions > 0 
      ? ((post.metrics.retweets / post.metrics.impressions) * 100).toFixed(1)
      : '0.0';
  };

  const getLikeRate = () => {
    return post.metrics.impressions > 0 
      ? ((post.metrics.likes / post.metrics.impressions) * 100).toFixed(1)
      : '0.0';
  };

  const getReplyRate = () => {
    return post.metrics.impressions > 0 
      ? ((post.metrics.replies / post.metrics.impressions) * 100).toFixed(1)
      : '0.0';
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">投稿詳細分析</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* 投稿内容 */}
        <div className="p-6 border-b">
          <div className="flex items-start space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-semibold text-gray-900">あなた</span>
                <span className="text-gray-500">@yourusername</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(post.timestamp)}</span>
              </div>
            </div>
          </div>
          
          <div className="text-gray-800 leading-relaxed mb-4">
            {post.content}
          </div>
          
          {post.mediaUrls && post.mediaUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {post.mediaUrls.map((url, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={index}
                  src={url}
                  alt={`Media ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
              ))}
            </div>
          )}
        </div>

        {/* メトリクス */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">パフォーマンス指標</h3>
          
          {/* 主要指標 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <Eye className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(post.metrics.impressions)}
              </div>
              <div className="text-sm text-blue-800">インプレッション</div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(post.metrics.engagements)}
              </div>
              <div className="text-sm text-green-800">エンゲージメント</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <MousePointer className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">
                {formatNumber(post.metrics.clicks)}
              </div>
              <div className="text-sm text-purple-800">クリック</div>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <User className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-600">
                {formatNumber(post.metrics.profileClicks)}
              </div>
              <div className="text-sm text-orange-800">プロフィールクリック</div>
            </div>
          </div>

          {/* エンゲージメント詳細 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-gray-900">いいね</span>
                </div>
                <span className="text-sm text-gray-500">{getLikeRate()}%</span>
              </div>
              <div className="text-xl font-bold text-red-600">
                {formatNumber(post.metrics.likes)}
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Repeat2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-gray-900">リツイート</span>
                </div>
                <span className="text-sm text-gray-500">{getRetweetRate()}%</span>
              </div>
              <div className="text-xl font-bold text-green-600">
                {formatNumber(post.metrics.retweets)}
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-900">返信</span>
                </div>
                <span className="text-sm text-gray-500">{getReplyRate()}%</span>
              </div>
              <div className="text-xl font-bold text-blue-600">
                {formatNumber(post.metrics.replies)}
              </div>
            </div>
          </div>

          {/* パフォーマンス指標 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">パフォーマンス指標</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">エンゲージメント率</span>
                <span className="font-semibold text-gray-900">{getEngagementRate()}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">クリック率</span>
                <span className="font-semibold text-gray-900">{getClickThroughRate()}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">リツイート率</span>
                <span className="font-semibold text-gray-900">{getRetweetRate()}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">いいね率</span>
                <span className="font-semibold text-gray-900">{getLikeRate()}%</span>
              </div>
            </div>
          </div>

          {/* リンククリック */}
          {post.metrics.linkClicks > 0 && (
            <div className="mt-4 bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">リンククリック</span>
                <span className="font-semibold text-blue-600">
                  {formatNumber(post.metrics.linkClicks)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              最終更新: {formatDate(post.timestamp)}
            </div>
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
