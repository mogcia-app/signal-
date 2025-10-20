import React from 'react';
import { Trophy, Heart, Repeat2, MessageCircle, Eye, MousePointer } from 'lucide-react';

interface TopPost {
  id: string;
  title?: string;
  content?: string;
  hashtags?: string;
  likes: number;
  retweets: number;
  comments: number;
  saves: number;
  impressions: number;
  engagements: number;
  createdAt: string;
}

interface TopPostsProps {
  topPosts: TopPost[];
}

export function TopPosts({ topPosts }: TopPostsProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (!topPosts || topPosts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Trophy className="h-6 w-6 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold text-black">トップ投稿</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-black">投稿データがありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-yellow-100 rounded-lg">
          <Trophy className="h-6 w-6 text-yellow-600" />
        </div>
        <h3 className="text-lg font-semibold text-black">トップ投稿</h3>
        <span className="text-sm text-black">（エンゲージメント順）</span>
      </div>

      <div className="space-y-4">
        {topPosts.map((post, index) => (
          <div key={post.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-yellow-100 text-yellow-800' :
                  index === 1 ? 'bg-gray-100 text-gray-800' :
                  index === 2 ? 'bg-orange-100 text-orange-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {index + 1}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {post.title || '投稿'}
                </span>
              </div>
              <span className="text-xs text-black">
                {formatDate(post.createdAt)}
              </span>
            </div>

            {post.content && (
              <p className="text-sm text-black mb-3">
                {truncateText(post.content, 100)}
              </p>
            )}

            {post.hashtags && (
              <p className="text-xs text-blue-600 mb-3">
                {post.hashtags}
              </p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="flex items-center space-x-2">
                <Heart className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-gray-700">{formatNumber(post.likes)}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Repeat2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700">{formatNumber(post.retweets)}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">{formatNumber(post.comments)}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-700">{formatNumber(post.impressions)}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <MousePointer className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium text-gray-700">{formatNumber(post.engagements)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
