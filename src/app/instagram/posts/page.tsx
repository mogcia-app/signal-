'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import SNSLayout from '../../../components/sns-layout';
import { AIChatWidget } from '../../../components/ai-chat-widget';
import { postsApi } from '../../../lib/api';
import { useAuth } from '../../../contexts/auth-context';
import { Image as ImageIcon, Heart, MessageCircle, Share, Eye as EyeIcon, Calendar, Clock } from 'lucide-react';

// コンポーネントのインポート
import PostCard from './components/PostCard';
import PostDetailModal from './components/PostDetailModal';
import PostFilters from './components/PostFilters';
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
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPostType, setSelectedPostType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  const [selectedAnalytics, setSelectedAnalytics] = useState<AnalyticsData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
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
      
      if (selectedStatus) params.status = selectedStatus;
      if (selectedPostType) params.postType = selectedPostType;
      
      const searchParams = new URLSearchParams(params);
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
      setPosts(result.posts || []);
    } catch (error) {
      console.error('投稿取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, selectedStatus, selectedPostType]);

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
          
          return {
            id: post.id,
            title: post.title,
            type: post.postType === 'reel' ? 'リール' : post.postType === 'feed' ? 'フィード' : 'ストーリー',
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
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  // 詳細表示
  const handleShowDetail = (post: PostData | null, analytics: AnalyticsData | null) => {
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

  // フィルタリング
  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchTerm || 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.hashtags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = !selectedStatus || (() => {
      if (selectedStatus === 'analyzed') {
        return analyticsData.some(a => a.postId === post.id) || post.analytics;
      } else if (selectedStatus === 'created') {
        return post.status === 'created' || post.status === 'draft';
      }
      return true;
    })();
    
    const matchesDate = (() => {
      if (!dateFrom && !dateTo) return true;
      
      const postDate = post.createdAt instanceof Date ? post.createdAt : 
        (post.createdAt && typeof post.createdAt === 'object' && 'toDate' in post.createdAt) ? 
          post.createdAt.toDate() : new Date(post.createdAt);
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

  return (
    <>
      <SNSLayout 
        currentSNS="instagram"
        customTitle="投稿一覧"
        customDescription="作成した投稿の管理・編集・削除を行えます"
      >
        <div className="max-w-7xl mx-auto p-6">
          {/* フィルター・検索 */}
          <PostFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            selectedPostType={selectedPostType}
            setSelectedPostType={setSelectedPostType}
            dateFrom={dateFrom}
            setDateFrom={setDateFrom}
            dateTo={dateTo}
            setDateTo={setDateTo}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            onRefresh={fetchPosts}
            filteredPostsCount={filteredPosts.length}
          />

          {/* 統計表示 */}
          <PostStats
            scheduledPosts={scheduledPosts}
            unanalyzedPosts={unanalyzedPosts}
          />

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
                            width={300}
                            height={300}
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

                    {/* 分析データ */}
                    <div className="mb-3">
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="flex items-center justify-center mb-1">
                            <Heart size={16} className="text-red-500" />
                          </div>
                          <div className="text-lg font-bold text-gray-900">{(analytics.likes || 0).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="flex items-center justify-center mb-1">
                            <MessageCircle size={16} className="text-gray-500" />
                          </div>
                          <div className="text-lg font-bold text-gray-900">{(analytics.comments || 0).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="flex items-center justify-center mb-1">
                            <Share size={16} className="text-gray-500" />
                          </div>
                          <div className="text-lg font-bold text-gray-900">{(analytics.shares || 0).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="flex items-center justify-center mb-1">
                            <EyeIcon size={16} className="text-gray-500" />
                          </div>
                          <div className="text-lg font-bold text-gray-900">{(analytics.reach || 0).toLocaleString()}</div>
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
                  hashtags: post.hashtags,
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
                    onShowDetail={handleShowDetail}
                    onDeletePost={handleDeletePost}
                  />
                );
              })}
            </div>
          )}
        </div>
      </SNSLayout>

      {/* 詳細モーダル */}
      <PostDetailModal
        isOpen={showDetailModal}
        selectedPost={selectedPost}
        selectedAnalytics={selectedAnalytics}
        onClose={handleCloseModal}
      />

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