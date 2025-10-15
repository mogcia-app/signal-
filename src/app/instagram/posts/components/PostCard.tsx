'use client';

import React from 'react';
import Image from 'next/image';
import { Edit, Trash2, Eye, Calendar, Clock, Image as ImageIcon, Heart, MessageCircle, Share, Eye as EyeIcon } from 'lucide-react';

interface PostData {
  id: string;
  userId: string;
  title: string;
  content: string;
  hashtags: string[];
  postType: 'feed' | 'reel' | 'story';
  scheduledDate?: Date | { toDate(): Date; seconds: number; nanoseconds: number; type?: string } | string;
  scheduledTime?: string;
  status: 'draft' | 'created' | 'scheduled' | 'published';
  imageUrl?: string | null;
  imageData?: string | null;
  createdAt: Date | { toDate(): Date; seconds: number; nanoseconds: number; type?: string } | string;
  updatedAt: Date;
  isAIGenerated?: boolean;
  analytics?: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
    reach: number;
    engagementRate: number;
    publishedAt: Date;
    audience?: {
      gender: {
        male: number;
        female: number;
        other: number;
      };
      age: {
        '13-17': number;
        '18-24': number;
        '25-34': number;
        '35-44': number;
        '45-54': number;
        '55-64': number;
        '65+': number;
      };
    };
    reachSource?: {
      sources: {
        posts: number;
        profile: number;
        explore: number;
        search: number;
        other: number;
      };
      followers: {
        followers: number;
        nonFollowers: number;
      };
    };
  };
}

interface AnalyticsData {
  id: string;
  postId?: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagementRate: number;
  publishedAt: Date;
  title?: string;
  content?: string;
  hashtags?: string[];
  category?: string;
  thumbnail?: string;
  audience?: {
    gender: {
      male: number;
      female: number;
      other: number;
    };
    age: {
      '13-17': number;
      '18-24': number;
      '25-34': number;
      '35-44': number;
      '45-54': number;
      '55-64': number;
      '65+': number;
    };
  };
  reachSource?: {
    sources: {
      posts: number;
      profile: number;
      explore: number;
      search: number;
      other: number;
    };
    followers: {
      followers: number;
      nonFollowers: number;
    };
  };
}

interface PostCardProps {
  post: PostData;
  hasAnalytics: boolean;
  postAnalytics: AnalyticsData | null;
  onShowDetail: (post: PostData | null, analytics: AnalyticsData | null) => void;
  onDeletePost: (postId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  hasAnalytics,
  postAnalytics,
  onShowDetail,
  onDeletePost
}) => {
  // ステータス表示の色分け
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'created': return 'bg-purple-100 text-purple-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'published': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ステータス表示の日本語
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return '下書き';
      case 'created': return '作成済み';
      case 'scheduled': return '予約投稿';
      case 'published': return '公開済み';
      default: return status;
    }
  };

  // 投稿タイプ表示の絵文字
  const getPostTypeIcon = (postType: string) => {
    switch (postType) {
      case 'feed': return '📸';
      case 'reel': return '🎬';
      case 'story': return '📱';
      default: return '📝';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* カードヘッダー */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getPostTypeIcon(post.postType)}</span>
            <h3 className="text-lg font-semibold text-gray-900 truncate">{post.title || 'タイトルなし'}</h3>
          </div>
          <div className="flex items-center space-x-2">
            {post.isAIGenerated && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 flex items-center">
                <span className="mr-1">🤖</span>
                AI生成
              </span>
            )}
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(post.status)}`}>
              {getStatusLabel(post.status)}
            </span>
            {hasAnalytics && (
              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">
                📊 分析済み
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span className="flex items-center">
            <Calendar size={14} className="mr-1" />
            {post.scheduledDate ? 
              (post.scheduledDate instanceof Date ? 
                post.scheduledDate.toLocaleDateString('ja-JP') : 
                (post.scheduledDate && typeof post.scheduledDate === 'object' && 'toDate' in post.scheduledDate) ?
                  post.scheduledDate.toDate().toLocaleDateString('ja-JP') :
                  String(post.scheduledDate)
              ) : '日付未設定'}
          </span>
          <span className="flex items-center">
            <Clock size={14} className="mr-1" />
            {post.scheduledTime || '時間未設定'}
          </span>
        </div>
      </div>

      {/* 投稿内容 */}
      <div className="p-4">
        {/* 画像プレビュー */}
        <div className="mb-3">
          <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
            {(post.imageData || post.imageUrl) ? (
              post.imageData ? (
                <Image 
                  src={post.imageData} 
                  alt="投稿画像" 
                  width={300}
                  height={300}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon size={24} className="text-gray-400" />
              )
            ) : (
              <div className="text-center text-gray-500">
                <ImageIcon size={24} className="mx-auto mb-1 text-gray-400" />
                <div className="text-xs">サムネがありません</div>
              </div>
            )}
          </div>
        </div>

        {/* 投稿文 */}
        <div className="mb-3">
          <p className="text-gray-700 text-sm">
            {(() => {
              const content = post.content || '投稿内容がありません';
              const firstSentence = content.split(/[。！？]/)[0];
              return firstSentence + (content.includes('。') || content.includes('！') || content.includes('？') ? '...' : '');
            })()}
          </p>
        </div>

        {/* ハッシュタグ */}
        {post.hashtags.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {post.hashtags.slice(0, 3).map((hashtag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
                >
                  #{hashtag}
                </span>
              ))}
              {post.hashtags.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                  +{post.hashtags.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 分析データ（分析済みの場合のみ） */}
        {hasAnalytics && postAnalytics && (
          <div className="mb-3">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center mb-1">
                  <Heart size={16} className="text-red-500" />
                </div>
                <div className="text-lg font-bold text-gray-900">{postAnalytics.likes.toLocaleString()}</div>
              </div>
              <div>
                <div className="flex items-center justify-center mb-1">
                  <MessageCircle size={16} className="text-gray-500" />
                </div>
                <div className="text-lg font-bold text-gray-900">{postAnalytics.comments.toLocaleString()}</div>
              </div>
              <div>
                <div className="flex items-center justify-center mb-1">
                  <Share size={16} className="text-gray-500" />
                </div>
                <div className="text-lg font-bold text-gray-900">{postAnalytics.shares.toLocaleString()}</div>
              </div>
              <div>
                <div className="flex items-center justify-center mb-1">
                  <EyeIcon size={16} className="text-gray-500" />
                </div>
                <div className="text-lg font-bold text-gray-900">{postAnalytics.reach.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-end space-x-2">
          {hasAnalytics ? (
            <button
              onClick={() => onShowDetail(post, postAnalytics)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="詳細を見る"
            >
              →
            </button>
          ) : (
            <>
              <button
                onClick={() => alert('投稿詳細を表示')}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="詳細表示"
              >
                <Eye size={14} />
              </button>
              <a
                href={`/instagram/lab?edit=${post.id}`}
                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                title="投稿ラボで編集"
              >
                <Edit size={14} />
              </a>
              <a
                href={`/instagram/analytics?postId=${post.id}`}
                className="p-2 text-gray-400 hover:text-[#ff8a15] hover:bg-orange-50 rounded-md transition-colors"
                title="分析ページで投稿データを入力"
              >
                📊
              </a>
              <button
                onClick={() => onDeletePost(post.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="削除"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostCard;
