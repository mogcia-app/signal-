'use client';

import React from 'react';
import Image from 'next/image';
import { Search, Hash, FileText, Video, Camera, Bookmark } from 'lucide-react';
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-6">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
          <Search className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">投稿を選択</h2>
          <p className="text-sm text-gray-600">分析したい投稿を選択してください</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">投稿を読み込み中...</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">投稿がありません</p>
          <p className="text-sm text-gray-500">まず投稿を作成してください</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                selectedPostId === post.id
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => onPostSelect(post.id)}
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
      )}
    </div>
  );
};

export default PostSelector;
