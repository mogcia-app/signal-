'use client';

import React, { useState, useEffect } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { AIChatWidget } from '../../../components/ai-chat-widget';
import { postsApi } from '../../../lib/api';
import { useAuth } from '../../../contexts/auth-context';
import { Edit, Trash2, Eye, Calendar, Clock, Image as ImageIcon, Heart, MessageCircle, Share, Eye as EyeIcon, TrendingUp } from 'lucide-react';

interface PostData {
  id: string;
  userId: string;
  title: string;
  content: string;
  hashtags: string[];
  postType: 'feed' | 'reel' | 'story';
  scheduledDate?: string;
  scheduledTime?: string;
  status: 'draft' | 'created' | 'scheduled' | 'published';
  imageUrl?: string | null;
  imageData?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // 分析データ（投稿後）
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

export default function InstagramPostsPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPostType, setSelectedPostType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'saved' | 'published'>('saved');
  const [analyticsData, setAnalyticsData] = useState<{
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
  }[]>([]);

  // 投稿一覧を取得
  const fetchPosts = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const params: Record<string, string> = {
        userId: user.uid
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

  // 分析データを取得
  const fetchAnalytics = async () => {
    if (!user?.uid) return;
    
    try {
      // Firebase IDトークンを取得
      const idToken = await user.getIdToken();
      
      const response = await fetch(`/api/analytics?userId=${user.uid}`, {
        headers: {
          'x-user-id': user.uid,
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Analytics data fetched:', result.analytics);
        console.log('All postId values:', result.analytics?.map((a: { id: string; postId?: string | null }) => ({ id: a.id, postId: a.postId, postIdType: typeof a.postId })));
        console.log('Manual input data (postId=null):', result.analytics?.filter((a: { postId?: string | null }) => a.postId === null));
        console.log('Manual input data (postId=empty string):', result.analytics?.filter((a: { postId?: string | null }) => a.postId === ''));
        setAnalyticsData(result.analytics || []);
      } else {
        console.error('Analytics fetch error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchAnalytics();
  }, [user?.uid, selectedStatus, selectedPostType]); // eslint-disable-line react-hooks/exhaustive-deps

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
    // 分析データがあるかチェック
    const hasAnalytics = analyticsData.some(analytics => analytics.postId === post.id);
    
    // タブによるフィルタリング
    const matchesTab = activeTab === 'saved' 
      ? (post.status === 'draft' || post.status === 'created' || post.status === 'scheduled') 
      : (post.status === 'published' || hasAnalytics || analyticsData.some(a => a.postId === null)); // 分析データがある投稿も「投稿済み」として表示（手動入力データも含む）
    
    // 検索によるフィルタリング
    const matchesSearch = !searchTerm || 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.hashtags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesTab && matchesSearch;
  });

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
    <>
      <SNSLayout 
        currentSNS="instagram"
        customTitle="投稿一覧"
        customDescription="作成した投稿の管理・編集・削除を行えます"
      >
        <div className="max-w-7xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            
            <div className="text-sm text-gray-500">
              {filteredPosts.length}件の投稿
            </div>
          </div>
        </div>

        {/* タブ */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('saved')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'saved'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📝 保存済み投稿 ({posts.filter(p => p.status === 'draft' || p.status === 'created' || p.status === 'scheduled').length})
              </button>
              <button
                onClick={() => setActiveTab('published')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'published'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 過去の投稿・分析 ({posts.filter(p => p.status === 'published' || analyticsData.some(a => a.postId === p.id)).length})
              </button>
            </nav>
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
                <option value="created">作成済み</option>
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
                <option value="feed">フィード</option>
                <option value="reel">リール</option>
                <option value="story">ストーリーズ</option>
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
            <div className="text-gray-400 text-6xl mb-4">
              {activeTab === 'saved' ? '📝' : '📊'}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab === 'saved' ? '保存済み投稿がありません' : '過去の投稿がありません'}
            </h3>
            <p className="text-gray-600 mb-4">
              {activeTab === 'saved' 
                ? 'まだ投稿を保存していません。投稿ラボで投稿を作成しましょう。'
                : 'まだ投稿を公開していません。運用計画から計画を立てて、投稿を公開すると、ここに分析データが表示されます。'
              }
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => window.location.href = '/instagram/lab'}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {activeTab === 'saved' ? '投稿を作成する' : '投稿ラボへ'}
              </button>
              {activeTab === 'published' && (
                <button
                  onClick={() => window.location.href = '/instagram/plan'}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  運用計画から計画を立てる
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 手動入力の分析データ（postIdがnull）を表示 */}
            {activeTab === 'published' && (() => {
              const nullData = analyticsData.filter(a => a.postId === null);
              const emptyData = analyticsData.filter(a => a.postId === '');
              const undefinedData = analyticsData.filter(a => a.postId === undefined);
              const manualData = [...nullData, ...emptyData, ...undefinedData];
              console.log('Null data:', nullData);
              console.log('Empty string data:', emptyData);
              console.log('Undefined data:', undefinedData);
              console.log('Combined manual data to display:', manualData);
              return manualData;
            })().map((analytics, index) => (
              <div key={`manual-${index}`} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-2xl">📊</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{analytics.title || '手動入力データ'}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            手動入力
                          </span>
                          <span className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            {analytics.publishedAt ? new Date(analytics.publishedAt).toLocaleDateString('ja-JP') : '日付未設定'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 分析データ */}
                    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-800 flex items-center">
                          <TrendingUp size={16} className="mr-2 text-blue-600" />
                          投稿パフォーマンス
                        </h4>
                        <span className="text-xs text-gray-500">
                          投稿日: {analytics.publishedAt ? new Date(analytics.publishedAt).toLocaleDateString('ja-JP') : '不明'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <Heart size={14} className="text-red-500 mr-1" />
                            <span className="text-sm font-medium text-gray-700">いいね</span>
                          </div>
                          <div className="text-lg font-bold text-gray-900">{analytics.likes.toLocaleString()}</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <MessageCircle size={14} className="text-blue-500 mr-1" />
                            <span className="text-sm font-medium text-gray-700">コメント</span>
                          </div>
                          <div className="text-lg font-bold text-gray-900">{analytics.comments.toLocaleString()}</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <Share size={14} className="text-green-500 mr-1" />
                            <span className="text-sm font-medium text-gray-700">シェア</span>
                          </div>
                          <div className="text-lg font-bold text-gray-900">{analytics.shares.toLocaleString()}</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <EyeIcon size={14} className="text-purple-500 mr-1" />
                            <span className="text-sm font-medium text-gray-700">閲覧数</span>
                          </div>
                          <div className="text-lg font-bold text-gray-900">{analytics.reach.toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-gray-600">エンゲージメント率</span>
                          <span className="text-lg font-bold text-blue-600">{analytics.engagementRate}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-400">
                      作成日: {new Date().toLocaleString('ja-JP')}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => alert('詳細分析を表示')}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                      title="詳細分析"
                    >
                      📊
                    </button>
                    <button
                      onClick={() => alert('削除機能は実装予定')}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="削除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* 通常の投稿一覧 */}
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

                    {/* 分析データ（過去の投稿の場合） */}
                    {activeTab === 'published' && (() => {
                      const postAnalytics = analyticsData.find(analytics => analytics.postId === post.id);
                      return postAnalytics || post.analytics;
                    })() && (
                      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-800 flex items-center">
                            <TrendingUp size={16} className="mr-2 text-blue-600" />
                            投稿パフォーマンス
                          </h4>
                          <span className="text-xs text-gray-500">
                            投稿日: {(() => {
                              const analytics = analyticsData.find(a => a.postId === post.id) || post.analytics;
                              const publishedAt = analytics?.publishedAt;
                              return publishedAt ? new Date(publishedAt).toLocaleDateString('ja-JP') : '不明';
                            })()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-1">
                              <Heart size={14} className="text-red-500 mr-1" />
                              <span className="text-sm font-medium text-gray-700">いいね</span>
                            </div>
                            <div className="text-lg font-bold text-gray-900">{(analyticsData.find(a => a.postId === post.id) || post.analytics)?.likes.toLocaleString()}</div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-1">
                              <MessageCircle size={14} className="text-blue-500 mr-1" />
                              <span className="text-sm font-medium text-gray-700">コメント</span>
                            </div>
                            <div className="text-lg font-bold text-gray-900">{(analyticsData.find(a => a.postId === post.id) || post.analytics)?.comments.toLocaleString()}</div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-1">
                              <Share size={14} className="text-green-500 mr-1" />
                              <span className="text-sm font-medium text-gray-700">シェア</span>
                            </div>
                            <div className="text-lg font-bold text-gray-900">{(analyticsData.find(a => a.postId === post.id) || post.analytics)?.shares.toLocaleString()}</div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-1">
                              <EyeIcon size={14} className="text-purple-500 mr-1" />
                              <span className="text-sm font-medium text-gray-700">閲覧数</span>
                            </div>
                            <div className="text-lg font-bold text-gray-900">{(analyticsData.find(a => a.postId === post.id) || post.analytics)?.reach.toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-600">エンゲージメント率</span>
                            <span className="text-lg font-bold text-blue-600">{(analyticsData.find(a => a.postId === post.id) || post.analytics)?.engagementRate}%</span>
                          </div>
                          
                          {/* オーディエンス分析 */}
                          {(analyticsData.find(a => a.postId === post.id) || post.analytics)?.audience && (
                            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                              <h4 className="text-sm font-semibold text-gray-800 mb-2">オーディエンス分析</h4>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex justify-between">
                                  <span>👨 男性:</span>
                                  <span className="font-medium">{(analyticsData.find(a => a.postId === post.id) || post.analytics)?.audience?.gender.male || 0}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>👩 女性:</span>
                                  <span className="font-medium">{(analyticsData.find(a => a.postId === post.id) || post.analytics)?.audience?.gender.female || 0}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>18-24歳:</span>
                                  <span className="font-medium">{(analyticsData.find(a => a.postId === post.id) || post.analytics)?.audience?.age['18-24'] || 0}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>25-34歳:</span>
                                  <span className="font-medium">{(analyticsData.find(a => a.postId === post.id) || post.analytics)?.audience?.age['25-34'] || 0}%</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 閲覧数ソース分析 */}
                          {(analyticsData.find(a => a.postId === post.id) || post.analytics)?.reachSource && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <h4 className="text-sm font-semibold text-gray-800 mb-2">閲覧数ソース分析</h4>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex justify-between">
                                  <span>📱 投稿:</span>
                                  <span className="font-medium">{(analyticsData.find(a => a.postId === post.id) || post.analytics)?.reachSource?.sources.posts || 0}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>👤 プロフィール:</span>
                                  <span className="font-medium">{(analyticsData.find(a => a.postId === post.id) || post.analytics)?.reachSource?.sources.profile || 0}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>👥 フォロワー内:</span>
                                  <span className="font-medium">{(analyticsData.find(a => a.postId === post.id) || post.analytics)?.reachSource?.followers.followers || 0}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>🌐 フォロワー外:</span>
                                  <span className="font-medium">{(analyticsData.find(a => a.postId === post.id) || post.analytics)?.reachSource?.followers.nonFollowers || 0}%</span>
                                </div>
                              </div>
                            </div>
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
                    {activeTab === 'saved' ? (
                      <>
                        <a
                          href={`/instagram/lab?edit=${post.id}`}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                          title="投稿ラボで編集"
                        >
                          <Edit size={16} />
                        </a>
                        {post.status === 'created' && (
                          <a
                            href="/instagram/analytics"
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="分析ページで投稿データを入力"
                          >
                            📊
                          </a>
                        )}
                        <button
                          onClick={() => alert('投稿を公開')}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="投稿"
                        >
                          📤
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => alert('詳細分析を表示')}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                        title="詳細分析"
                      >
                        📊
                      </button>
                    )}
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

      {/* AIチャットウィジェット */}
      <AIChatWidget 
        contextData={{
          posts: posts,
          selectedStatus: selectedStatus,
          selectedPostType: selectedPostType,
          searchTerm: searchTerm,
          activeTab: activeTab
        }}
      />
    </>
  );
}
