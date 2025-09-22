'use client';

import React, { useState, useEffect } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { postsApi } from '../../../../lib/api';
import { Edit, Trash2, Eye, Calendar, Clock, Image as ImageIcon } from 'lucide-react';

interface PostData {
  id: string;
  userId: string;
  title: string;
  content: string;
  hashtags: string[];
  postType: 'feed' | 'reel' | 'story';
  scheduledDate?: string;
  scheduledTime?: string;
  status: 'draft' | 'scheduled' | 'published';
  imageUrl?: string | null;
  imageData?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function XPostsPage() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPostType, setSelectedPostType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // 投稿一覧を取得
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        userId: 'current-user' // 実際のアプリでは認証済みユーザーIDを使用
      };
      
      if (selectedStatus) params.status = selectedStatus;
      if (selectedPostType) params.postType = selectedPostType;
      
      const response = await postsApi.list(params);
      setPosts(response.posts || []);
    } catch (error) {
      console.error('投稿取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [selectedStatus, selectedPostType]);

  // 投稿削除
  const handleDeletePost = async (postId: string) => {
    if (!confirm('この投稿を削除しますか？')) return;
    
    try {
      await postsApi.delete(postId);
      setPosts(posts.filter(post => post.id !== postId));
      alert('投稿を削除しました');
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  // フィルタリング
  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchTerm || 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.hashtags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  // ステータス表示の色分け
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'published': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ステータス表示の日本語
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return '下書き';
      case 'scheduled': return '予約投稿';
      case 'published': return '公開済み';
      default: return status;
    }
  };

  // 投稿タイプ表示の絵文字
  const getPostTypeIcon = (postType: string) => {
    switch (postType) {
      case 'feed': return '🐦';
      case 'reel': return '📹';
      case 'story': return '💬';
      default: return '📝';
    }
  };

  return (
    <SNSLayout 
      currentSNS="x"
      customTitle="投稿一覧"
      customDescription="作成した投稿の管理・編集・削除を行えます"
    >
      <div className="max-w-7xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">投稿一覧</h1>
              <p className="text-gray-600 mt-1">作成した投稿を管理しましょう</p>
            </div>
            <div className="text-sm text-gray-500">
              {filteredPosts.length}件の投稿
            </div>
          </div>
        </div>

        {/* フィルター・検索 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 検索 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">検索</label>
              <input
                type="text"
                placeholder="タイトル、内容、ハッシュタグで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* ステータス */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべて</option>
                <option value="draft">下書き</option>
                <option value="scheduled">予約投稿</option>
                <option value="published">公開済み</option>
              </select>
            </div>

            {/* 投稿タイプ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">投稿タイプ</label>
              <select
                value={selectedPostType}
                onChange={(e) => setSelectedPostType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべて</option>
                <option value="feed">ツイート</option>
                <option value="reel">動画</option>
                <option value="story">スレッド</option>
              </select>
            </div>

            {/* 更新ボタン */}
            <div className="flex items-end">
              <button
                onClick={fetchPosts}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                更新
              </button>
            </div>
          </div>
        </div>

        {/* 投稿一覧 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 mt-2">読み込み中...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">投稿がありません</h3>
            <p className="text-gray-600 mb-4">まだ投稿を作成していません。</p>
            <button
              onClick={() => window.location.href = '/x/lab'}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              投稿を作成する
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <div key={post.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  {/* 投稿情報 */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-2xl">{getPostTypeIcon(post.postType)}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{post.title || 'タイトルなし'}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(post.status)}`}>
                            {getStatusLabel(post.status)}
                          </span>
                          <span className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            {post.scheduledDate || '日付未設定'}
                          </span>
                          <span className="flex items-center">
                            <Clock size={14} className="mr-1" />
                            {post.scheduledTime || '時間未設定'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 投稿内容 */}
                    <div className="mb-4">
                      <p className="text-gray-700 line-clamp-3">
                        {post.content}
                      </p>
                    </div>

                    {/* 画像プレビュー */}
                    {(post.imageData || post.imageUrl) && (
                      <div className="mb-4">
                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          <ImageIcon size={16} className="mr-1" />
                          画像付き投稿
                        </div>
                        <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                          <ImageIcon size={24} className="text-gray-400" />
                        </div>
                      </div>
                    )}

                    {/* ハッシュタグ */}
                    {post.hashtags.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1">
                          {post.hashtags.slice(0, 5).map((hashtag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
                            >
                              #{hashtag}
                            </span>
                          ))}
                          {post.hashtags.length > 5 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                              +{post.hashtags.length - 5}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 作成日時 */}
                    <div className="text-xs text-gray-400">
                      作成日: {new Date(post.createdAt).toLocaleString('ja-JP')}
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => alert('投稿詳細を表示')}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="詳細表示"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => alert('投稿を編集')}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                      title="編集"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="削除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SNSLayout>
  );
}
