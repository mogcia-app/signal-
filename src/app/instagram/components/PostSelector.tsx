'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Search, Hash, FileText, Video, Camera, Bookmark, X } from 'lucide-react';
import { Post } from './types';

interface PostSelectorProps {
  posts: Post[];
  selectedPostId: string;
  onPostSelect: (postId: string) => void;
  isLoading: boolean;
}

const PostSelector: React.FC<PostSelectorProps> = ({
  posts,
  selectedPostId,
  onPostSelect,
  isLoading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);

  // 検索フィルタリング
  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.hashtags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 検索実行
  const handleSearch = () => {
    if (searchTerm.trim()) {
      setShowResults(true);
    }
  };

  // 検索クリア
  const handleClear = () => {
    setSearchTerm('');
    setShowResults(false);
  };

  // 投稿選択
  const handlePostSelect = (postId: string) => {
    onPostSelect(postId);
    setShowResults(false);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'image': return <Camera className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'carousel': return <FileText className="w-4 h-4" />;
      case 'story': return <Bookmark className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'image': return '画像';
      case 'video': return '動画';
      case 'carousel': return 'カルーセル';
      case 'story': return 'ストーリー';
      default: return 'その他';
    }
  };

  return (
    <div>
      {/* 検索バーのみ */}
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="タイトル、内容、ハッシュタグで検索..."
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={!searchTerm.trim() || isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          <Search className="w-4 h-4 mr-2" />
          検索
        </button>
        {showResults && (
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center"
          >
            <X className="w-4 h-4 mr-2" />
            クリア
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">投稿を読み込み中...</span>
        </div>
      ) : showResults ? (
        filteredPosts.length === 0 ? (
          <div className="text-center py-8">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">検索結果が見つかりません</p>
            <p className="text-sm text-gray-500">別のキーワードで検索してください</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 mb-3">
              {filteredPosts.length}件の投稿が見つかりました
            </div>
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                  selectedPostId === post.id
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => handlePostSelect(post.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {post.thumbnail ? (
                      <Image
                        src={post.thumbnail}
                        alt={post.title}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        {getCategoryIcon(post.category)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {post.title || '無題の投稿'}
                      </h3>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {getCategoryLabel(post.category)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {post.content}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Hash className="w-3 h-3" />
                        <span>{post.hashtags.length}個のハッシュタグ</span>
                      </div>
                      <span>
                        {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('ja-JP') : '日付不明'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : posts.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">投稿がありません</p>
          <p className="text-sm text-gray-500">まず投稿を作成してください</p>
        </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">投稿を検索してください</p>
            </div>
          )}
    </div>
  );
};

export default PostSelector;
