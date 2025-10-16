'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Search, Filter, Calendar, Clock, Eye } from 'lucide-react';

interface PostSelectorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  posts: any[];
  selectedPostId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPostSelect: (post: any) => void;
  onPostIdSelect: (postId: string) => void;
  isLoading?: boolean;
}

const PostSelector: React.FC<PostSelectorProps> = ({
  posts,
  selectedPostId,
  onPostSelect,
  onPostIdSelect,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPostType, setSelectedPostType] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // フィルタリング
  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchTerm || 
      (post.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (post.content?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (post.hashtags?.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase())) || false);
    
    const matchesStatus = !selectedStatus || post.status === selectedStatus;
    const matchesPostType = !selectedPostType || post.postType === selectedPostType || post.type === selectedPostType || post.category === selectedPostType;
    
    return matchesSearch && matchesStatus && matchesPostType;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePostSelect = (post: any) => {
    onPostSelect(post);
    onPostIdSelect(post.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-orange-100 text-orange-800';
      case 'created': return 'bg-orange-100 text-orange-800';
      case 'scheduled': return 'bg-orange-100 text-orange-800';
      case 'draft': return 'bg-orange-100 text-orange-800';
      default: return 'bg-orange-100 text-orange-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published': return '公開済み';
      case 'created': return '作成済み';
      case 'scheduled': return '予約済み';
      case 'draft': return '下書き';
      default: return status;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getPostTypeLabel = (post: any) => {
    const type = post.postType || post.type || post.category;
    switch (type) {
      case 'feed': return 'フィード';
      case 'reel': return 'リール';
      case 'story': return 'ストーリー';
      default: return type || 'フィード';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">投稿を選択</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors"
          >
            <Filter size={16} />
            <span>フィルター</span>
          </button>
        </div>

        {/* 検索バー */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="タイトル、内容、ハッシュタグで検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <span className="text-lg">×</span>
            </button>
          )}
        </div>

        {/* フィルター */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] text-sm"
              >
                <option value="">全て</option>
                <option value="published">公開済み</option>
                <option value="created">作成済み</option>
                <option value="scheduled">予約済み</option>
                <option value="draft">下書き</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">投稿タイプ</label>
              <select
                value={selectedPostType}
                onChange={(e) => setSelectedPostType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] text-sm"
              >
                <option value="">全て</option>
                <option value="feed">フィード</option>
                <option value="reel">リール</option>
                <option value="story">ストーリー</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 投稿一覧 */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#ff8a15] mx-auto"></div>
            <p className="text-gray-600 mt-2 text-sm">読み込み中...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-4xl mb-2">📝</div>
            <p className="text-gray-600 text-sm">投稿が見つかりません</p>
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {filteredPosts.map((post) => {
              const isSelected = selectedPostId === post.id;
              const hasAnalytics = !!post.analytics;
              
              return (
                <div
                  key={post.id}
                  onClick={() => handlePostSelect(post)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                    isSelected 
                      ? 'border-[#ff8a15] bg-orange-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* 画像プレビュー */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                        {post.imageUrl || post.imageData ? (
                          <Image
                            src={post.imageUrl || post.imageData || ''}
                            alt="投稿画像"
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                        <div className="text-gray-400 text-lg">
                          {(post.postType || post.type || post.category) === 'reel' ? '🎬' : (post.postType || post.type || post.category) === 'story' ? '📸' : '📷'}
                        </div>
                        )}
                      </div>
                    </div>

                    {/* 投稿情報 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {post.title || 'タイトルなし'}
                        </h4>
                        <div className="flex items-center space-x-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(post.status)}`}>
                            {getStatusLabel(post.status)}
                          </span>
                          {hasAnalytics && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800 font-medium">
                              📊
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                        {post.content || '内容なし'}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <span className="flex items-center">
                            <span className="mr-1">{getPostTypeLabel(post)}</span>
                          </span>
                          <span className="flex items-center">
                            <Calendar size={12} className="mr-1" />
                            {post.createdAt ? (
                              post.createdAt instanceof Date ? 
                                post.createdAt.toLocaleDateString('ja-JP') :
                                (typeof post.createdAt === 'object' && post.createdAt && 'toDate' in post.createdAt) ?
                                  post.createdAt.toDate().toLocaleDateString('ja-JP') :
                                  new Date(post.createdAt as string).toLocaleDateString('ja-JP')
                            ) : '日付不明'}
                          </span>
                          {post.scheduledTime && (
                            <span className="flex items-center">
                              <Clock size={12} className="mr-1" />
                              {post.scheduledTime}
                            </span>
                          )}
                        </div>
                        
                        {hasAnalytics && (
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Eye size={12} className="mr-1" />
                              {post.analytics?.views?.toLocaleString() || 0}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* ハッシュタグ */}
                      {post.hashtags && post.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {post.hashtags.slice(0, 3).map((tag: string, index: number) => (
                            <span key={index} className="text-xs text-[#ff8a15]">
                              #{tag}
                            </span>
                          ))}
                          {post.hashtags.length > 3 && (
                            <span className="text-xs text-gray-400">
                              +{post.hashtags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 選択解除ボタン */}
      {selectedPostId && (
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => {
              onPostSelect(null);
              onPostIdSelect('');
            }}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors"
          >
            選択を解除
          </button>
        </div>
      )}
    </div>
  );
};

export default PostSelector;