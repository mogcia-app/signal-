'use client';

import React from 'react';
import Image from 'next/image';
import { X, Calendar, Clock, Image as ImageIcon, Heart, MessageCircle, Share, Eye as EyeIcon } from 'lucide-react';

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

interface PostDetailModalProps {
  isOpen: boolean;
  selectedPost: PostData | null;
  selectedAnalytics: AnalyticsData | null;
  onClose: () => void;
}

const PostDetailModal: React.FC<PostDetailModalProps> = ({
  isOpen,
  selectedPost,
  selectedAnalytics,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">投稿詳細</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* 投稿情報 */}
          <div className="space-y-6">
            {/* タイトル */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {selectedPost?.title || selectedAnalytics?.title || 'タイトルなし'}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <Calendar size={14} className="mr-1" />
                  {selectedPost?.scheduledDate || selectedAnalytics?.publishedAt ? 
                    (() => {
                      const dateValue = selectedPost?.scheduledDate || selectedAnalytics?.publishedAt;
                      if (dateValue instanceof Date) {
                        return dateValue.toLocaleDateString('ja-JP');
                      } else if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue) {
                        return dateValue.toDate().toLocaleDateString('ja-JP');
                      } else {
                        return new Date(dateValue || '').toLocaleDateString('ja-JP');
                      }
                    })() : 
                    '日付未設定'}
                </span>
                <span className="flex items-center">
                  <Clock size={14} className="mr-1" />
                  {selectedPost?.scheduledTime || '時間未設定'}
                </span>
              </div>
            </div>

            {/* サムネイル */}
            {(selectedPost?.imageData || selectedPost?.imageUrl || selectedAnalytics?.thumbnail) && (
              <div>
                <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
                  {(selectedPost?.imageData || selectedAnalytics?.thumbnail) ? (
                    <Image 
                      src={selectedPost?.imageData || selectedAnalytics?.thumbnail || ''} 
                      alt="投稿画像" 
                      width={500}
                      height={500}
                      quality={95}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon size={48} className="text-gray-400" />
                  )}
                </div>
              </div>
            )}

            {/* 投稿文（全文） */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">投稿内容</h4>
              <p className="text-gray-700 whitespace-pre-wrap">
                {selectedPost?.content || selectedAnalytics?.content || '投稿内容がありません'}
              </p>
            </div>

            {/* ハッシュタグ */}
            {((selectedPost?.hashtags && Array.isArray(selectedPost.hashtags) && selectedPost.hashtags.length > 0) || (selectedAnalytics?.hashtags && Array.isArray(selectedAnalytics.hashtags) && selectedAnalytics.hashtags.length > 0)) && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">ハッシュタグ</h4>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const hashtags = selectedPost?.hashtags || selectedAnalytics?.hashtags || [];
                    return Array.isArray(hashtags) ? hashtags : [];
                  })().map((hashtag: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                    >
                      #{hashtag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 分析データ */}
            {selectedAnalytics && (
              <div className="space-y-6">
                {/* 基本KPI */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">基本パフォーマンス</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Heart size={16} className="text-red-500" />
                        <span className="text-sm font-medium text-gray-700">いいね</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{selectedAnalytics.likes.toLocaleString()}</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <MessageCircle size={16} className="text-blue-500" />
                        <span className="text-sm font-medium text-gray-700">コメント</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{selectedAnalytics.comments.toLocaleString()}</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Share size={16} className="text-green-500" />
                        <span className="text-sm font-medium text-gray-700">シェア</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{selectedAnalytics.shares.toLocaleString()}</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <EyeIcon size={16} className="text-purple-500" />
                        <span className="text-sm font-medium text-gray-700">閲覧数</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{selectedAnalytics.reach.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* オーディエンス分析 */}
                {selectedAnalytics.audience && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">オーディエンス分析</h4>
                    <div className="space-y-4">
                      {/* 性別分析 */}
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h5 className="text-sm font-medium text-gray-800 mb-3">性別分析</h5>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-900">{selectedAnalytics.audience.gender.male}%</div>
                            <div className="text-sm text-gray-600">👨 男性</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-pink-900">{selectedAnalytics.audience.gender.female}%</div>
                            <div className="text-sm text-gray-600">👩 女性</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-purple-900">{selectedAnalytics.audience.gender.other}%</div>
                            <div className="text-sm text-gray-600">🏳️‍🌈 その他</div>
                          </div>
                        </div>
                      </div>

                      {/* 年齢層分析 */}
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h5 className="text-sm font-medium text-gray-800 mb-3">年齢層分析</h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">13-17歳:</span>
                            <span className="text-sm font-medium text-gray-900">{selectedAnalytics.audience.age['13-17']}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">18-24歳:</span>
                            <span className="text-sm font-medium text-gray-900">{selectedAnalytics.audience.age['18-24']}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">25-34歳:</span>
                            <span className="text-sm font-medium text-gray-900">{selectedAnalytics.audience.age['25-34']}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">35-44歳:</span>
                            <span className="text-sm font-medium text-gray-900">{selectedAnalytics.audience.age['35-44']}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">45-54歳:</span>
                            <span className="text-sm font-medium text-gray-900">{selectedAnalytics.audience.age['45-54']}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">55-64歳:</span>
                            <span className="text-sm font-medium text-gray-900">{selectedAnalytics.audience.age['55-64']}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">65+歳:</span>
                            <span className="text-sm font-medium text-gray-900">{selectedAnalytics.audience.age['65+']}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 閲覧数ソース分析 */}
                {selectedAnalytics.reachSource && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">閲覧数ソース分析</h4>
                    <div className="space-y-4">
                      {/* ソース別分析 */}
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <h5 className="text-sm font-medium text-gray-800 mb-3">ソース別分析</h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">📱 投稿:</span>
                            <span className="text-sm font-medium text-gray-900">{selectedAnalytics.reachSource.sources.posts}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">👤 プロフィール:</span>
                            <span className="text-sm font-medium text-gray-900">{selectedAnalytics.reachSource.sources.profile}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">🔍 探索:</span>
                            <span className="text-sm font-medium text-gray-900">{selectedAnalytics.reachSource.sources.explore}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">🔎 検索:</span>
                            <span className="text-sm font-medium text-gray-900">{selectedAnalytics.reachSource.sources.search}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">🌐 その他:</span>
                            <span className="text-sm font-medium text-gray-900">{selectedAnalytics.reachSource.sources.other}%</span>
                          </div>
                        </div>
                      </div>

                      {/* フォロワー分析 */}
                      <div className="p-4 bg-indigo-50 rounded-lg">
                        <h5 className="text-sm font-medium text-gray-800 mb-3">フォロワー分析</h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">👥 フォロワー内:</span>
                            <span className="text-sm font-medium text-gray-900">{selectedAnalytics.reachSource.followers.followers}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">🌐 フォロワー外:</span>
                            <span className="text-sm font-medium text-gray-900">{selectedAnalytics.reachSource.followers.nonFollowers}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* カテゴリ */}
                {selectedAnalytics.category && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">カテゴリ</h4>
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-md">
                      {selectedAnalytics.category}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetailModal;
