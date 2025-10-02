'use client';

import React, { useState, useEffect } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { AIChatWidget } from '../../../components/ai-chat-widget';
import { postsApi } from '../../../lib/api';
import { useAuth } from '../../../contexts/auth-context';
import { Edit, Trash2, Eye, Calendar, Clock, Image as ImageIcon, Heart, MessageCircle, Share, Eye as EyeIcon, X } from 'lucide-react';

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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  const [selectedAnalytics, setSelectedAnalytics] = useState<{
    id: string;
    postId?: string | null;
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
  } | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
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
    console.log('fetchPosts called, user:', user);
    console.log('user?.uid:', user?.uid);
    
    if (!user?.uid) {
      console.log('No user uid, setting loading to false');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Firebase認証トークンを取得
      const { auth } = await import('../../../lib/firebase');
      const token = await auth.currentUser?.getIdToken();
      
      const params: Record<string, string> = {
        userId: user.uid
      };
      
      if (selectedStatus) params.status = selectedStatus;
      if (selectedPostType) params.postType = selectedPostType;
      
      const searchParams = new URLSearchParams(params);
      console.log('Fetching posts from /api/posts with params:', searchParams.toString());
      
      const response = await fetch(`/api/posts?${searchParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid,
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Posts fetched successfully:', result);
      console.log('Posts count:', result.posts?.length || 0);
      console.log('Posts data:', result.posts);
      setPosts(result.posts || []);
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
    console.log('=== POSTS PAGE useEffect ===');
    console.log('user:', user);
    console.log('user?.uid:', user?.uid);
    console.log('selectedStatus:', selectedStatus);
    console.log('selectedPostType:', selectedPostType);
    
    if (user?.uid) {
      console.log('User authenticated, calling fetchPosts and fetchAnalytics');
      fetchPosts();
      fetchAnalytics();
    } else {
      console.log('No user, skipping fetchPosts and fetchAnalytics');
    }
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

  // 詳細表示
  const handleShowDetail = (post: PostData | null, analytics: typeof selectedAnalytics) => {
    setSelectedPost(post);
    setSelectedAnalytics(analytics);
    setShowDetailModal(true);
  };

  // モーダルを閉じる
  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedPost(null);
    setSelectedAnalytics(null);
  };

  // フィルタリング（拡張版）
  const filteredPosts = posts.filter(post => {
    // 検索によるフィルタリング
    const matchesSearch = !searchTerm || 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.hashtags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // ステータスによるフィルタリング
    const matchesStatus = !selectedStatus || (() => {
      if (selectedStatus === 'analyzed') {
        return analyticsData.some(a => a.postId === post.id) || post.analytics;
      } else if (selectedStatus === 'created') {
        return post.status === 'created' || post.status === 'draft';
      }
      return true;
    })();
    
    // 日付によるフィルタリング
    const matchesDate = (() => {
      if (!dateFrom && !dateTo) return true;
      
      const postDate = new Date(post.createdAt);
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo) : null;
      
      if (fromDate && toDate) {
        return postDate >= fromDate && postDate <= toDate;
      } else if (fromDate) {
        return postDate >= fromDate;
      } else if (toDate) {
        return postDate <= toDate;
      }
      return true;
    })();
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // 手動入力の分析データ
  const manualAnalyticsData = analyticsData.filter(a => 
    a.postId === null || a.postId === '' || a.postId === undefined
  );

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

        {/* フィルター・検索 */}
        <div className="bg-white rounded-none shadow-sm border border-gray-200 p-6 mb-6">
          <div className="space-y-4">
            {/* 検索バー */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="タイトル、内容、ハッシュタグで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* フィルター */}
            <div className="space-y-4">
              {/* フィルターヘッダー */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <svg className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">フィルター</span>
                    {(selectedStatus || selectedPostType || dateFrom || dateTo) && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {[selectedStatus, selectedPostType, dateFrom, dateTo].filter(Boolean).length}
                      </span>
                    )}
                  </button>
                  
                  {/* アクティブフィルター表示 */}
                  <div className="flex items-center space-x-2">
                    {selectedStatus && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                        {selectedStatus === 'created' ? '作成済み' : selectedStatus === 'analyzed' ? '分析済み' : selectedStatus}
                      </span>
                    )}
                    {selectedPostType && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {selectedPostType === 'feed' ? '📸フィード' : selectedPostType === 'reel' ? '🎬リール' : selectedPostType === 'story' ? '📱ストーリーズ' : selectedPostType}
                      </span>
                    )}
                    {(dateFrom || dateTo) && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                        📅 日付指定
                      </span>
                    )}
                  </div>
                </div>

                {/* 更新ボタン */}
                <button
                  onClick={fetchPosts}
                  className="px-4 py-2 bg-gradient-to-r from-slate-600 to-gray-700 text-white rounded-lg hover:from-slate-700 hover:to-gray-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center space-x-2"
                >
                  <span>🔄</span>
                  <span>更新</span>
                </button>
              </div>

              {/* フィルター詳細（開閉式） */}
              {showFilters && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  {/* ステータス・タイプフィルター */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ステータスフィルター */}
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-gray-700">ステータス</span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: '', label: 'すべて' },
                          { value: 'created', label: '作成済み' },
                          { value: 'analyzed', label: '分析済み' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setSelectedStatus(option.value)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                              selectedStatus === option.value 
                                ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 投稿タイプフィルター */}
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-gray-700">タイプ</span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: '', label: 'すべて', icon: '📝' },
                          { value: 'feed', label: 'フィード', icon: '📸' },
                          { value: 'reel', label: 'リール', icon: '🎬' },
                          { value: 'story', label: 'ストーリーズ', icon: '📱' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setSelectedPostType(option.value)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                              selectedPostType === option.value 
                                ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <span>{option.icon}</span>
                            <span>{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 日付フィルター */}
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-gray-700">公開日</span>
                    <div className="flex items-center space-x-3">
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="開始日"
                      />
                      <span className="text-gray-400">〜</span>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="終了日"
                      />
                      {(dateFrom || dateTo) && (
                        <button
                          onClick={() => {
                            setDateFrom('');
                            setDateTo('');
                          }}
                          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          ✕ クリア
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 検索結果表示 */}
            {searchTerm && (
              <div className="text-sm text-gray-600">
                「{searchTerm}」の検索結果: {filteredPosts.length}件
              </div>
            )}
          </div>
        </div>

        {/* 投稿一覧 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 mt-2">読み込み中...</p>
          </div>
        ) : (filteredPosts.length === 0 && manualAnalyticsData.length === 0) ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              投稿がありません
            </h3>
            <p className="text-gray-600 mb-4">
              まだ投稿を保存していません。投稿ラボで投稿を作成しましょう。
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => window.location.href = '/instagram/lab'}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                投稿を作成する
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 手動入力の分析データを表示 */}
            {manualAnalyticsData.map((analytics, index) => (
              <div key={`manual-${index}`} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* カードヘッダー */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">📊</span>
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{analytics.title || '手動入力データ'}</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        手動入力
                      </span>
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">
                        📊 分析済み
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Calendar size={14} className="mr-1" />
                      {analytics.publishedAt ? new Date(analytics.publishedAt).toLocaleDateString('ja-JP') : '日付未設定'}
                    </span>
                    <span className="flex items-center">
                      <Clock size={14} className="mr-1" />
                      時間未設定
                    </span>
                  </div>
                </div>

                {/* 投稿内容 */}
                <div className="p-4">
                  {/* 画像プレビュー */}
                  <div className="mb-3">
                    <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
                      {analytics.thumbnail ? (
                        <img 
                          src={analytics.thumbnail} 
                          alt="投稿画像" 
                          className="w-full h-full object-cover"
                        />
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
                        const content = analytics.content || '投稿内容がありません';
                        const firstSentence = content.split(/[。！？]/)[0];
                        return firstSentence + (content.includes('。') || content.includes('！') || content.includes('？') ? '...' : '');
                      })()}
                    </p>
                  </div>

                  {/* ハッシュタグ */}
                  {analytics.hashtags && analytics.hashtags.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1">
                        {analytics.hashtags.slice(0, 3).map((hashtag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
                          >
                            #{hashtag}
                          </span>
                        ))}
                        {analytics.hashtags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                            +{analytics.hashtags.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 分析データ（分析済みなので常に表示） */}
                  <div className="mb-3">
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="flex items-center justify-center mb-1">
                          <Heart size={16} className="text-red-500" />
                        </div>
                        <div className="text-lg font-bold text-gray-900">{analytics.likes.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center mb-1">
                          <MessageCircle size={16} className="text-gray-500" />
                        </div>
                        <div className="text-lg font-bold text-gray-900">{analytics.comments.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center mb-1">
                          <Share size={16} className="text-gray-500" />
                        </div>
                        <div className="text-lg font-bold text-gray-900">{analytics.shares.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center mb-1">
                          <EyeIcon size={16} className="text-gray-500" />
                        </div>
                        <div className="text-lg font-bold text-gray-900">{analytics.reach.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* アクションボタン */}
                <div className="px-4 pb-4">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleShowDetail(null, analytics)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="詳細を見る"
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* 通常の投稿一覧 */}
            {filteredPosts.map((post) => {
              const hasAnalytics = analyticsData.some(a => a.postId === post.id) || post.analytics;
              const analyticsFromData = analyticsData.find(a => a.postId === post.id);
              const postAnalytics = analyticsFromData ? {
                id: analyticsFromData.id,
                postId: analyticsFromData.postId,
                likes: analyticsFromData.likes,
                comments: analyticsFromData.comments,
                shares: analyticsFromData.shares,
                reach: analyticsFromData.reach,
                engagementRate: analyticsFromData.engagementRate,
                publishedAt: analyticsFromData.publishedAt,
                title: analyticsFromData.title,
                content: analyticsFromData.content,
                hashtags: analyticsFromData.hashtags,
                category: analyticsFromData.category,
                thumbnail: analyticsFromData.thumbnail,
                audience: analyticsFromData.audience,
                reachSource: analyticsFromData.reachSource
              } : post.analytics ? {
                id: post.id,
                postId: post.id,
                likes: post.analytics.likes,
                comments: post.analytics.comments,
                shares: post.analytics.shares,
                reach: post.analytics.reach,
                engagementRate: post.analytics.engagementRate,
                publishedAt: post.analytics.publishedAt,
                title: post.title,
                content: post.content,
                hashtags: post.hashtags,
                category: undefined,
                thumbnail: undefined,
                audience: post.analytics.audience,
                reachSource: post.analytics.reachSource
              } : null;
              
              return (
                <div key={post.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  {/* カードヘッダー */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getPostTypeIcon(post.postType)}</span>
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{post.title || 'タイトルなし'}</h3>
                      </div>
                      <div className="flex items-center space-x-2">
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
                        {post.scheduledDate || '日付未設定'}
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
                            <img 
                              src={post.imageData} 
                              alt="投稿画像" 
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
                    {hasAnalytics && (
                      <div className="mb-3">
                        <div className="grid grid-cols-4 gap-4 text-center">
                          <div>
                            <div className="flex items-center justify-center mb-1">
                              <Heart size={16} className="text-red-500" />
                            </div>
                            <div className="text-lg font-bold text-gray-900">{postAnalytics?.likes.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="flex items-center justify-center mb-1">
                              <MessageCircle size={16} className="text-gray-500" />
                            </div>
                            <div className="text-lg font-bold text-gray-900">{postAnalytics?.comments.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="flex items-center justify-center mb-1">
                              <Share size={16} className="text-gray-500" />
                            </div>
                            <div className="text-lg font-bold text-gray-900">{postAnalytics?.shares.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="flex items-center justify-center mb-1">
                              <EyeIcon size={16} className="text-gray-500" />
                            </div>
                            <div className="text-lg font-bold text-gray-900">{postAnalytics?.reach.toLocaleString()}</div>
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
                          onClick={() => handleShowDetail(post, postAnalytics)}
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
                            href="/instagram/analytics"
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="分析ページで投稿データを入力"
                          >
                            📊
                          </a>
                          <button
                            onClick={() => handleDeletePost(post.id)}
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
            })}
          </div>
        )}

        </div>
      </SNSLayout>

      {/* 詳細モーダル */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* ヘッダー */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">投稿詳細</h2>
                <button
                  onClick={handleCloseModal}
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
                        new Date(selectedPost?.scheduledDate || selectedAnalytics?.publishedAt || '').toLocaleDateString('ja-JP') : 
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
                        <img 
                          src={selectedPost?.imageData || selectedAnalytics?.thumbnail} 
                          alt="投稿画像" 
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
                {((selectedPost?.hashtags && selectedPost.hashtags.length > 0) || (selectedAnalytics?.hashtags && selectedAnalytics.hashtags.length > 0)) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">ハッシュタグ</h4>
                    <div className="flex flex-wrap gap-2">
                      {(selectedPost?.hashtags || selectedAnalytics?.hashtags || []).map((hashtag: string, index: number) => (
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
      )}

      {/* AIチャットウィジェット */}
      <AIChatWidget 
        contextData={{
          posts: posts,
          selectedStatus: selectedStatus,
          selectedPostType: selectedPostType,
          searchTerm: searchTerm
        }}
      />
    </>
  );
}
