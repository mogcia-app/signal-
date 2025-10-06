'use client';

import React, { useState, useEffect } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { XChatWidget } from '../../../components/x-chat-widget';
import { useAuth } from '../../../contexts/auth-context';
import { Edit, Trash2, Eye, Calendar, Clock, Image as ImageIcon, Plus, Filter, Search, Bot, User } from 'lucide-react';

interface PostData {
  id: string;
  userId: string;
  title: string;
  content: string;
  hashtags: string[];
  postType: 'tweet' | 'thread' | 'reply';
  scheduledDate?: string;
  scheduledTime?: string;
  status: 'draft' | 'scheduled' | 'published';
  imageUrl?: string | null;
  imageData?: string | null;
  isAIGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function XPostsPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPostType, setSelectedPostType] = useState<string>('');
  const [selectedAIType, setSelectedAIType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // 投稿一覧を取得
  const fetchPosts = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/x/posts?userId=${user.uid}`);
      const data = await response.json();
      
      if (data.success) {
        setPosts(data.posts || []);
      } else {
        console.error('投稿取得エラー:', data.error);
      }
    } catch (error) {
      console.error('投稿取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // 投稿削除
  const handleDeletePost = async (postId: string) => {
    if (!confirm('この投稿を削除しますか？')) return;
    
    try {
      const response = await fetch(`/api/x/posts/${postId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setPosts(posts.filter(post => post.id !== postId));
        alert('投稿を削除しました');
      } else {
        throw new Error('削除に失敗しました');
      }
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
    
    const matchesStatus = !selectedStatus || post.status === selectedStatus;
    const matchesPostType = !selectedPostType || post.postType === selectedPostType;
    const matchesAIType = !selectedAIType || 
      (selectedAIType === 'ai' && post.isAIGenerated) ||
      (selectedAIType === 'manual' && !post.isAIGenerated);
    
    return matchesSearch && matchesStatus && matchesPostType && matchesAIType;
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
      case 'tweet': return '🐦';
      case 'thread': return '🧵';
      case 'reply': return '💬';
      default: return '📝';
    }
  };

  // 投稿タイプ表示の日本語
  const getPostTypeLabel = (postType: string) => {
    switch (postType) {
      case 'tweet': return 'ツイート';
      case 'thread': return 'スレッド';
      case 'reply': return 'リプライ';
      default: return postType;
    }
  };

  return (
    <SNSLayout 
      currentSNS="x"
      customTitle="X投稿管理"
      customDescription="作成したX投稿の管理・編集・削除を行えます"
    >
      <div className="max-w-7xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">🐦</span>
                </div>
                
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                {filteredPosts.length}件の投稿
              </div>
              <button
                onClick={() => window.location.href = '/x/lab'}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} className="mr-2" />
                新規投稿
              </button>
            </div>
          </div>
        </div>

        {/* フィルター・検索 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">フィルター・検索</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Filter size={16} className="mr-1" />
              {showFilters ? 'フィルターを閉じる' : 'フィルターを開く'}
            </button>
          </div>
          
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 検索 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">検索</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="タイトル、内容、ハッシュタグで検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                  <option value="tweet">ツイート</option>
                  <option value="thread">スレッド</option>
                  <option value="reply">リプライ</option>
                </select>
              </div>

              {/* AI生成タイプ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">作成方法</label>
                <select
                  value={selectedAIType}
                  onChange={(e) => setSelectedAIType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">すべて</option>
                  <option value="ai">AI生成</option>
                  <option value="manual">手動作成</option>
                </select>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              {filteredPosts.length}件の投稿が表示されています
            </div>
            <button
              onClick={fetchPosts}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              更新
            </button>
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
            <div className="text-gray-400 text-6xl mb-4">🐦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">投稿がありません</h3>
            <p className="text-gray-600 mb-4">まだX投稿を作成していません。</p>
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => window.location.href = '/x/lab'}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} className="mr-2" />
                投稿を作成する
              </button>
              <button
                onClick={() => window.location.href = '/x/lab'}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                <Bot size={16} className="mr-2" />
                AI生成で作成
              </button>
            </div>
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
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">{post.title || 'タイトルなし'}</h3>
                          {post.isAIGenerated ? (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium flex items-center">
                              <Bot size={12} className="mr-1" />
                              AI生成
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium flex items-center">
                              <User size={12} className="mr-1" />
                              手動作成
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(post.status)}`}>
                            {getStatusLabel(post.status)}
                          </span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {getPostTypeLabel(post.postType)}
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
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-bold">U</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-semibold text-gray-900">あなた</span>
                              <span className="text-gray-500 text-sm">@username</span>
                              <span className="text-gray-500 text-sm">·</span>
                              <span className="text-gray-500 text-sm">今</span>
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap">
                              {post.content}
                            </p>
                          </div>
                        </div>
                      </div>
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
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md hover:bg-blue-200 transition-colors cursor-pointer"
                            >
                              {hashtag.startsWith('#') ? hashtag : `#${hashtag}`}
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
                      onClick={() => {
                        // 編集用にラボページに遷移
                        window.location.href = `/x/lab?edit=${post.id}`;
                      }}
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

      {/* AIチャットウィジェット */}
      <XChatWidget />
    </SNSLayout>
  );
}
