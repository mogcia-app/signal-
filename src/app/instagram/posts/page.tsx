'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import SNSLayout from '../../../components/sns-layout';
import { postsApi } from '../../../lib/api';
import { useAuth } from '../../../contexts/auth-context';
import { Image as ImageIcon, Heart, MessageCircle, Share, Eye as EyeIcon, Calendar, Clock, Trash2 } from 'lucide-react';

// コンポーネントのインポート
import PostCard from './components/PostCard';
import PostStats from './components/PostStats';

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
  sentiment?: 'satisfied' | 'dissatisfied' | null;
  memo?: string;
  followerIncrease?: number;
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

export default function InstagramPostsPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'analyzed' | 'created'>('all');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  
  const [scheduledPosts, setScheduledPosts] = useState<Array<{
    day: string;
    date: string;
    type: string;
    title: string;
    time: string;
    status: string;
  }>>([]);
  
  const [unanalyzedPosts, setUnanalyzedPosts] = useState<Array<{
    id: string;
    title: string;
    type: string;
    imageUrl: string | null;
    createdAt: string;
    status: string;
  }>>([]);

  // 投稿一覧を取得
  const fetchPosts = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      const { auth } = await import('../../../lib/firebase');
      const token = await auth.currentUser?.getIdToken();
      
      const params: Record<string, string> = {
        userId: user.uid
      };
      
      const searchParams = new URLSearchParams(params);
      console.log('Fetching posts from:', `/api/posts?${searchParams.toString()}`);
      const response = await fetch(`/api/posts?${searchParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid,
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const result = await response.json();
      const postsData = result.posts || [];
      
      // リアルタイムの日時取得でソート
      const now = new Date();
      const sortedPosts = postsData.sort((a: PostData, b: PostData) => {
        // 作成済み（created）を最優先
        if (a.status === 'created' && b.status !== 'created') return -1;
        if (b.status === 'created' && a.status !== 'created') return 1;
        
        // 同じステータスの場合は、作成日時で降順（新しい順）
        const aCreatedAt = a.createdAt instanceof Date ? a.createdAt : 
                          typeof a.createdAt === 'string' ? new Date(a.createdAt) :
                          a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const bCreatedAt = b.createdAt instanceof Date ? b.createdAt : 
                          typeof b.createdAt === 'string' ? new Date(b.createdAt) :
                          b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        
        return bCreatedAt.getTime() - aCreatedAt.getTime();
      });
      
      setPosts(sortedPosts);
    } catch (error) {
      console.error('投稿取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // 分析データを取得
  const fetchAnalytics = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const idToken = await user.getIdToken();
      
      const response = await fetch(`/api/analytics?userId=${user.uid}`, {
        headers: {
          'x-user-id': user.uid,
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setAnalyticsData(result.analytics || []);
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
    }
  }, [user]);

  // 投稿データを処理してセクション別に分類
  const processPostsData = useCallback(() => {
    if (!posts.length) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 今週の投稿予定
    const scheduledPostsData = posts
      .filter((post: PostData) => {
        if (post.status !== 'created') return false;
        if (!post.scheduledDate) return false;
        
        try {
          let scheduledDate: Date;
          
          if (post.scheduledDate && typeof post.scheduledDate === 'object' && 'toDate' in post.scheduledDate) {
            scheduledDate = (post.scheduledDate as { toDate(): Date }).toDate();
          }
          else if (post.scheduledDate && typeof post.scheduledDate === 'object' && 'type' in post.scheduledDate && (post.scheduledDate as { type: string }).type === 'firestore/timestamp/1.0') {
              const timestamp = post.scheduledDate as unknown as { seconds: number; nanoseconds: number };
              scheduledDate = new Date(timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1000000));
          }
          else {
            scheduledDate = post.scheduledDate instanceof Date ? post.scheduledDate : new Date(post.scheduledDate as string);
          }
          
          return scheduledDate >= today;
        } catch (error) {
          console.error('投稿予定の日付変換エラー:', error, post);
          return false;
        }
      })
      .slice(0, 5)
      .map((post: PostData) => {
        try {
          let scheduledDate: Date;
          
          if (post.scheduledDate && typeof post.scheduledDate === 'object' && 'toDate' in post.scheduledDate) {
            scheduledDate = (post.scheduledDate as { toDate(): Date }).toDate();
          }
          else if (post.scheduledDate && typeof post.scheduledDate === 'object' && 'type' in post.scheduledDate && (post.scheduledDate as { type: string }).type === 'firestore/timestamp/1.0') {
              const timestamp = post.scheduledDate as unknown as { seconds: number; nanoseconds: number };
              scheduledDate = new Date(timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1000000));
          }
          else {
            scheduledDate = post.scheduledDate instanceof Date ? post.scheduledDate : new Date(post.scheduledDate as string);
          }
          
          const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
          
          return {
            day: dayNames[scheduledDate.getDay()],
            date: `${scheduledDate.getMonth() + 1}/${scheduledDate.getDate()}`,
            type: post.postType === 'reel' ? 'リール' : post.postType === 'feed' ? 'フィード' : 'ストーリー',
            title: post.title,
            time: post.scheduledTime || '未設定',
            status: '分析未設定'
          };
        } catch (error) {
          console.error('投稿予定の日付変換エラー:', error, post);
          return null;
        }
      })
      .filter((post): post is NonNullable<typeof post> => post !== null);
    setScheduledPosts(scheduledPostsData);

    // 未分析投稿
    const unanalyzedPostsData = posts
      .filter((post: PostData) => {
        if (post.status !== 'created') return false;
        if (!post.scheduledDate) return false;
        
        try {
          let scheduledDate: Date;
          
          if (post.scheduledDate && typeof post.scheduledDate === 'object' && 'toDate' in post.scheduledDate) {
            scheduledDate = (post.scheduledDate as { toDate(): Date }).toDate();
          }
          else if (post.scheduledDate && typeof post.scheduledDate === 'object' && 'type' in post.scheduledDate && (post.scheduledDate as { type: string }).type === 'firestore/timestamp/1.0') {
              const timestamp = post.scheduledDate as unknown as { seconds: number; nanoseconds: number };
              scheduledDate = new Date(timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1000000));
          }
          else {
            scheduledDate = post.scheduledDate instanceof Date ? post.scheduledDate : new Date(post.scheduledDate as string);
          }
          
          return scheduledDate < today;
        } catch (error) {
          console.error('未分析投稿の日付変換エラー:', error, post);
          return false;
        }
      })
      .slice(0, 5)
      .map((post: PostData) => {
        try {
          let createdAt: Date;
          
          if (post.createdAt && typeof post.createdAt === 'object' && 'toDate' in post.createdAt) {
            createdAt = (post.createdAt as { toDate(): Date }).toDate();
          }
          else if (post.createdAt && typeof post.createdAt === 'object' && 'type' in post.createdAt && (post.createdAt as { type: string }).type === 'firestore/timestamp/1.0') {
              const timestamp = post.createdAt as unknown as { seconds: number; nanoseconds: number };
              createdAt = new Date(timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1000000));
          }
          else {
            createdAt = post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt as string);
          }
          
          // デバッグログを追加
          console.log('未分析投稿タイプデバッグ:', {
            postId: post.id,
            postType: post.postType,
            title: post.title
          });
          
          return {
            id: post.id,
            title: post.title,
            type: post.postType, // 英語のまま保持
            imageUrl: post.imageUrl || null,
            createdAt: createdAt.toLocaleDateString('ja-JP'),
            status: '分析未設定'
          };
        } catch (error) {
          console.error('未分析投稿の日付変換エラー:', error, post);
          return null;
        }
      })
      .filter((post): post is NonNullable<typeof post> => post !== null);
    setUnanalyzedPosts(unanalyzedPostsData);
  }, [posts]);

  useEffect(() => {
    if (user?.uid) {
      fetchPosts();
      fetchAnalytics();
    }
  }, [user?.uid, fetchPosts, fetchAnalytics]);

  // リアルタイムソート更新（30秒ごと）
  useEffect(() => {
    // 投稿がない場合は何もしない
    if (posts.length === 0) return;
    
    const interval = setInterval(() => {
      setPosts(prevPosts => {
        // 投稿が存在しない場合はソートしない
        if (prevPosts.length === 0) return prevPosts;
        
        return [...prevPosts].sort((a: PostData, b: PostData) => {
          // 作成済み（created）を最優先
          if (a.status === 'created' && b.status !== 'created') return -1;
          if (b.status === 'created' && a.status !== 'created') return 1;
          
          // 同じステータスの場合は、作成日時で降順（新しい順）
          const aCreatedAt = a.createdAt instanceof Date ? a.createdAt : 
                            typeof a.createdAt === 'string' ? new Date(a.createdAt) :
                            a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const bCreatedAt = b.createdAt instanceof Date ? b.createdAt : 
                            typeof b.createdAt === 'string' ? new Date(b.createdAt) :
                            b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          
          return bCreatedAt.getTime() - aCreatedAt.getTime();
        });
      });
    }, 30000); // 30秒ごと
    
    return () => {
      clearInterval(interval);
    };
  }, []); // 依存配列を空にして、マウント時のみ実行

  useEffect(() => {
    if (posts.length > 0) {
      processPostsData();
    }
  }, [posts, processPostsData]);

  // 投稿削除
  const handleDeletePost = async (postId: string) => {
    if (!confirm('この投稿を削除しますか？')) return;
    
    try {
      await postsApi.delete(postId);
      setPosts(posts.filter(post => post.id !== postId));
      alert('投稿を削除しました');
      
      // 次のアクションを即座に更新
      if (typeof window !== 'undefined' && (window as Window & { refreshNextActions?: () => void }).refreshNextActions) {
        console.log('🔄 Triggering next actions refresh after post deletion');
        (window as Window & { refreshNextActions?: () => void }).refreshNextActions!();
      }
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  // 手動入力データ削除
  const handleDeleteManualAnalytics = async (analyticsId: string) => {
    if (!confirm('この分析データを削除しますか？')) return;
    
    try {
      const idToken = await user?.getIdToken();
      
      console.log('Deleting analytics with ID:', analyticsId);
      console.log('User ID:', user?.uid);
      
      const response = await fetch(`/api/analytics/${analyticsId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user?.uid || '',
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      console.log('Delete response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Delete result:', result);
        setAnalyticsData(analyticsData.filter(a => a.id !== analyticsId));
        alert('分析データを削除しました');
        
        // 次のアクションを即座に更新
        if (typeof window !== 'undefined' && (window as Window & { refreshNextActions?: () => void }).refreshNextActions) {
          console.log('🔄 Triggering next actions refresh after analytics deletion');
          (window as Window & { refreshNextActions?: () => void }).refreshNextActions!();
        }
      } else {
        const errorText = await response.text();
        console.error('Delete error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
    } catch (error) {
      console.error('削除エラー:', error);
      alert(`削除に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };



  // 手動入力の分析データ
  const manualAnalyticsData = analyticsData.filter(a => 
    a.postId === null || a.postId === '' || a.postId === undefined
  );

  // タブの投稿数を効率的に計算
  const tabCounts = React.useMemo(() => {
    const allPostsCount = posts.length + manualAnalyticsData.length;
    
    const analyzedPostsCount = posts.filter(post => {
      const hasAnalytics = analyticsData.some(a => a.postId === post.id) || !!post.analytics;
      return hasAnalytics;
    }).length + manualAnalyticsData.length; // 手動入力データは全て分析済み
    
    const createdOnlyCount = posts.filter(post => {
      const hasAnalytics = analyticsData.some(a => a.postId === post.id) || !!post.analytics;
      return !hasAnalytics;
    }).length;
    
    return {
      all: allPostsCount,
      analyzed: analyzedPostsCount,
      created: createdOnlyCount
    };
  }, [posts, analyticsData, manualAnalyticsData]);

  // フィルタリングされた投稿を効率的に計算
  const filteredPosts = React.useMemo(() => {
    const filtered = posts.filter(post => {
      if (activeTab === 'all') return true;
      const hasAnalytics = analyticsData.some(a => a.postId === post.id) || !!post.analytics;
      const shouldShow = activeTab === 'analyzed' ? hasAnalytics : !hasAnalytics;
      
      // デバッグログ
      console.log('Post filtering:', {
        postId: post.id,
        title: post.title,
        activeTab,
        hasAnalytics,
        shouldShow
      });
      
      return shouldShow;
    });
    
    console.log('Filtered posts result:', {
      activeTab,
      totalPosts: posts.length,
      filteredCount: filtered.length,
      manualAnalyticsCount: manualAnalyticsData.length
    });
    
    return filtered;
  }, [posts, analyticsData, activeTab, manualAnalyticsData]);

  return (
    <>
      <SNSLayout 
        customTitle="投稿一覧"
        customDescription="作成した投稿の詳細表示・管理・削除・分析を行えます"
      >
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          {/* 統計表示 */}
          <PostStats
            scheduledPosts={scheduledPosts}
            unanalyzedPosts={unanalyzedPosts}
          />

          {/* 投稿一覧 */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin  h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-black mt-2">読み込み中...</p>
            </div>
          ) : (posts.length === 0 && manualAnalyticsData.length === 0) ? (
            <div className="text-center py-12">
              <div className="text-black text-6xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-black mb-2">
                投稿がありません
              </h3>
              <p className="text-black mb-4">
                まだ投稿を保存していません。投稿ラボで投稿を作成しましょう。
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => window.location.href = '/instagram/lab'}
                  className="inline-flex items-center px-4 py-2 bg-orange-500 text-white  hover:bg-orange-600 transition-colors"
                >
                  投稿を作成する
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* タブナビゲーション */}
              <div className="mb-6">
                <div className="bg-white border border-gray-200 p-1">
                  <nav className="flex space-x-1">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`py-2 px-4 font-medium text-sm transition-all duration-200 ${
                        activeTab === 'all'
                          ? 'bg-[#ff8a15] text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      すべての投稿 ({tabCounts.all})
                    </button>
                    <button
                      onClick={() => setActiveTab('analyzed')}
                      className={`py-2 px-4 font-medium text-sm transition-all duration-200 ${
                        activeTab === 'analyzed'
                          ? 'bg-[#ff8a15] text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      分析済み ({tabCounts.analyzed})
                    </button>
                    <button
                      onClick={() => setActiveTab('created')}
                      className={`py-2 px-4 font-medium text-sm transition-all duration-200 ${
                        activeTab === 'created'
                          ? 'bg-[#ff8a15] text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      作成のみ ({tabCounts.created})
                    </button>
                  </nav>
                </div>
              </div>

              {/* 手動入力の分析データを表示 */}
              {manualAnalyticsData.length > 0 && (activeTab === 'all' || activeTab === 'analyzed') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
                  {manualAnalyticsData.map((analytics, index) => (
                    <div key={`manual-${index}`} className="bg-white shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  {/* カードヘッダー */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">📊</span>
                          <h3 className="text-lg font-semibold text-black truncate">{analytics.title || '手動入力データ'}</h3>
                        </div>
                        <button
                          onClick={() => handleDeleteManualAnalytics(analytics.id)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="削除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1  text-xs font-medium bg-blue-100 text-blue-800">
                          手動入力
                        </span>
                        <span className="px-2 py-1 text-xs  bg-green-100 text-green-800 font-medium">
                          📊 分析済み
                        </span>
                        {analytics.sentiment && (
                          <span className={`px-2 py-1 text-xs font-medium ${
                            analytics.sentiment === 'satisfied' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {analytics.sentiment === 'satisfied' ? '😊 満足' : '😞 不満'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-black">
                      <span className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        {analytics.publishedAt ? new Date(analytics.publishedAt).toLocaleDateString('ja-JP') : '日付未設定'}
                      </span>
                      <span className="flex items-center">
                        <Clock size={14} className="mr-1" />
                        {analytics.publishedAt ? 
                          new Date(analytics.publishedAt).toLocaleTimeString('ja-JP', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) : 
                          '時間未設定'
                        }
                      </span>
                    </div>
                  </div>

                  {/* 投稿内容 */}
                  <div className="p-4">
                    {/* 画像プレビュー */}
                    <div className="mb-3">
                      <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
                        {analytics.thumbnail ? (
                          <Image 
                            src={analytics.thumbnail} 
                            alt="投稿画像" 
                            width={400}
                            height={400}
                            quality={90}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center text-black">
                            <ImageIcon size={24} className="mx-auto mb-1 text-black" />
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
                    {analytics.hashtags && Array.isArray(analytics.hashtags) && analytics.hashtags.length > 0 && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1">
                          {analytics.hashtags.slice(0, 3).map((hashtag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs "
                            >
                              #{hashtag}
                            </span>
                          ))}
                          {analytics.hashtags.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-black text-xs ">
                              +{analytics.hashtags.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 分析データ */}
                    <div className="mb-3">
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="flex items-center justify-center mb-1">
                            <Heart size={16} className="text-red-500" />
                          </div>
                          <div className="text-lg font-bold text-black">{(analytics.likes || 0).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="flex items-center justify-center mb-1">
                            <MessageCircle size={16} className="text-black" />
                          </div>
                          <div className="text-lg font-bold text-black">{(analytics.comments || 0).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="flex items-center justify-center mb-1">
                            <Share size={16} className="text-black" />
                          </div>
                          <div className="text-lg font-bold text-black">{(analytics.shares || 0).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="flex items-center justify-center mb-1">
                            <EyeIcon size={16} className="text-black" />
                          </div>
                          <div className="text-lg font-bold text-black">{(analytics.reach || 0).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                    </div>
                  ))}
                </div>
              )}

              {/* 投稿一覧 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredPosts.map((post) => {
                  const hasAnalytics = analyticsData.some(a => a.postId === post.id) || !!post.analytics;
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    hashtags: Array.isArray(post.hashtags) ? post.hashtags : (typeof (post.hashtags as any) === 'string' ? (post.hashtags as any).split(' ').filter((tag: string) => tag.trim() !== '').map((tag: string) => tag.replace('#', '')) : []),
                    category: undefined,
                    thumbnail: undefined,
                    audience: post.analytics.audience,
                    reachSource: post.analytics.reachSource
                  } : null;
                  
                  return (
                    <PostCard
                      key={post.id}
                      post={post}
                      hasAnalytics={hasAnalytics}
                      postAnalytics={postAnalytics}
                      onDeletePost={handleDeletePost}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </SNSLayout>
    </>
  );
}