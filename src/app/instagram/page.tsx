'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useSNSSettings } from '../../hooks/useSNSSettings';
import { usePlanData } from '../../hooks/usePlanData';
import { useAuth } from '../../contexts/auth-context';
import { postsApi } from '../../lib/api';
import { AuthGuard } from '../../components/auth-guard';
import SNSLayout from '../../components/sns-layout';
import { AIChatWidget } from '../../components/ai-chat-widget';
import { PlanCard } from '../../components/PlanCard';
import { } from 'lucide-react';
// import StatsCards from './components/StatsCards'; // クイックアクションに置き換え

interface DashboardStats {
  followers: number;
  engagement: number;
  reach: number;
  saves: number;
  likes: number;
  comments: number;
  postsThisWeek: number;
  weeklyGoal: number;
  followerGrowth: number;
  topPostType: string;
  monthlyFeedPosts: number;
  monthlyReelPosts: number;
  monthlyStoryPosts: number;
}

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
  };
}

interface RecentPost {
  id: string;
  title: string;
  type: 'feed' | 'reel' | 'story';
  likes: number;
  comments: number;
  saves: number;
  reach: number;
  engagementRate: number;
  postedAt: string;
  imageUrl: string;
  caption?: string;
  hashtags?: string[];
}

function InstagramDashboardContent() {
  const { user } = useAuth();
  const { loading: profileLoading, error: profileError } = useUserProfile();
  const { getSNSSettings } = useSNSSettings();
  const { planData } = usePlanData();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    followers: 0,
    engagement: 0,
    reach: 0,
    saves: 0,
    likes: 0,
    comments: 0,
    postsThisWeek: 0,
    weeklyGoal: 5,
    followerGrowth: 0,
    topPostType: 'ー',
    monthlyFeedPosts: 0,
    monthlyReelPosts: 0,
    monthlyStoryPosts: 0
  });

  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<{
    day: string;
    date: string;
    type: string;
    title: string;
    time: string;
    status: string;
  }[]>([]);
  
  const [unanalyzedPosts, setUnanalyzedPosts] = useState<Array<{
    id: string;
    title: string;
    type: string;
    imageUrl: string | null;
    createdAt: string;
    status: string;
  }>>([]);
  const [goalNotifications, setGoalNotifications] = useState<{
    title: string;
    current: number;
    target: number;
    unit: string;
    status: string;
  }[]>([]);

  const instagramSettings = getSNSSettings('instagram');


  // 目標達成追跡を取得
  const fetchGoalTracking = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/instagram/goal-tracking', {
        headers: {
          'x-user-id': user.uid,
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setGoalNotifications(result.data.goals.slice(0, 3)); // 上位3件のみ表示
        }
      }
    } catch (error) {
      console.error('目標達成追跡取得エラー:', error);
    }
  }, [user]);

  // アナリティクスデータを取得
  const fetchAnalyticsData = useCallback(async () => {
    if (!user?.uid) return [];
    
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
        return result.data || [];
      }
    } catch (error) {
      console.error('アナリティクスデータ取得エラー:', error);
    }
    return [];
  }, [user]);

  // ダッシュボード統計を取得
  const fetchDashboardStats = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/instagram/dashboard-stats', {
        headers: {
          'x-user-id': user.uid,
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const statsData = result.data;
          setStats({
            followers: statsData.followers,
            engagement: statsData.engagement,
            reach: statsData.reach,
            saves: statsData.saves,
            likes: statsData.likes,
            comments: statsData.comments,
            postsThisWeek: statsData.postsThisWeek,
            weeklyGoal: statsData.weeklyGoal,
            followerGrowth: statsData.followerGrowth,
            topPostType: statsData.topPostType === 'feed' ? 'フィード' : statsData.topPostType === 'reel' ? 'リール' : 'ストーリー',
            monthlyFeedPosts: statsData.monthlyFeedPosts,
            monthlyReelPosts: statsData.monthlyReelPosts,
            monthlyStoryPosts: statsData.monthlyStoryPosts
          });
          console.log('✅ ダッシュボード統計を取得しました:', statsData);
        }
      }
    } catch (error) {
      console.error('ダッシュボード統計取得エラー:', error);
    }
  }, [user]);


  // 投稿データを取得して統計を計算
  const fetchPostsAndCalculateStats = useCallback(async () => {
    try {
      setLoading(true);
      
      // 認証されたユーザーのUIDを使用
      const userId = user?.uid;
      if (!userId) {
        console.error('User not authenticated');
        return;
      }

      console.log('Fetching data for authenticated user:', userId);

      // 投稿データを取得
      const postsResponse = await postsApi.list({ userId });
      const allPosts = postsResponse.posts || [];
      
      // アナリティクスデータを取得
      const analyticsData = await fetchAnalyticsData();
      
      // ダッシュボード統計をAPIから取得
      await fetchDashboardStats();

      // 最近の投稿パフォーマンスを生成（投稿一覧ページと同じロジック）
      console.log('🔍 投稿データの詳細:');
      allPosts.forEach((post: PostData, index: number) => {
        console.log(`投稿${index + 1}:`, {
          id: post.id,
          title: post.title,
          createdAt: post.createdAt,
          createdAtType: typeof post.createdAt,
          createdAtConstructor: post.createdAt?.constructor?.name,
          createdAtString: String(post.createdAt)
        });
      });
      
      const recentPostsData = allPosts
        .slice(0, 4)
        .map((post: PostData) => {
          // アナリティクスデータを取得（投稿一覧ページと同じロジック）
          const analyticsFromData = analyticsData.find((a: { postId: string | null }) => a.postId === post.id);
          const postAnalytics = analyticsFromData ? {
            likes: analyticsFromData.likes,
            comments: analyticsFromData.comments,
            shares: analyticsFromData.shares,
            reach: analyticsFromData.reach,
            engagementRate: analyticsFromData.engagementRate,
            publishedAt: analyticsFromData.publishedAt,
            thumbnail: analyticsFromData.thumbnail
          } : post.analytics ? {
            likes: post.analytics.likes,
            comments: post.analytics.comments,
            shares: post.analytics.shares,
            reach: post.analytics.reach,
            engagementRate: post.analytics.engagementRate,
            publishedAt: post.analytics.publishedAt,
            thumbnail: undefined
          } : null;

          return {
            id: post.id,
            title: post.title || 'タイトルなし',
            type: post.postType || 'feed',
            likes: postAnalytics?.likes || 0,
            comments: postAnalytics?.comments || 0,
            saves: postAnalytics?.shares || 0, // sharesをsavesとして表示
            reach: postAnalytics?.reach || 0,
            engagementRate: postAnalytics?.engagementRate || 0,
            postedAt: (() => {
              try {
                // publishedAtを優先し、なければcreatedAtを使用
                const dateToUse = postAnalytics?.publishedAt || post.createdAt;
                
                
                // Firestore Timestampオブジェクトの場合
                if (dateToUse && typeof dateToUse === 'object' && 'toDate' in dateToUse) {
                  const convertedDate = dateToUse.toDate();
                  return convertedDate.toLocaleDateString('ja-JP');
                }
                // Firestore Timestampのシリアライズされた形式の場合
                else if (dateToUse && typeof dateToUse === 'object' && 'type' in dateToUse && dateToUse.type === 'firestore/timestamp/1.0') {
                  const convertedDate = new Date(dateToUse.seconds * 1000 + Math.floor(dateToUse.nanoseconds / 1000000));
                  return convertedDate.toLocaleDateString('ja-JP');
                }
                // 通常のDateオブジェクトまたは文字列の場合
                else if (dateToUse && dateToUse !== null && dateToUse !== undefined) {
                  // 空のオブジェクト{}の場合はスキップ
                  if (typeof dateToUse === 'object' && Object.keys(dateToUse).length === 0) {
                    return '日付不明';
                  }
                  
                  const date = dateToUse instanceof Date ? dateToUse : new Date(dateToUse);
                  if (isNaN(date.getTime())) {
                    return '日付不明';
                  }
                  return date.toLocaleDateString('ja-JP');
                } else {
                  return '日付不明';
                }
              } catch (error) {
                return '日付不明';
              }
            })(),
            imageUrl: postAnalytics?.thumbnail || post.imageUrl || null,
            caption: post.content || '',
            hashtags: post.hashtags || []
          };
        });
      setRecentPosts(recentPostsData);

      // 今週の投稿予定を生成
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // 今日の0時0分0秒
      
      const scheduledPostsData = allPosts
        .filter((post: PostData) => {
          if ((post.status !== 'scheduled' && post.status !== 'draft') || !post.scheduledDate) {
            return false;
          }
          
          try {
            let scheduledDate: Date;
            
            // Firestore Timestampオブジェクトの場合
            if (post.scheduledDate && typeof post.scheduledDate === 'object' && 'toDate' in post.scheduledDate) {
              scheduledDate = (post.scheduledDate as { toDate(): Date }).toDate();
            }
            // Firestore Timestampのシリアライズされた形式の場合
            else if (post.scheduledDate && typeof post.scheduledDate === 'object' && 'type' in post.scheduledDate && (post.scheduledDate as { type: string }).type === 'firestore/timestamp/1.0') {
              const timestamp = post.scheduledDate as unknown as { seconds: number; nanoseconds: number };
              scheduledDate = new Date(timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1000000));
            }
            // 通常のDateオブジェクトまたは文字列の場合
            else {
              scheduledDate = post.scheduledDate instanceof Date ? post.scheduledDate : new Date(post.scheduledDate as string);
            }
            
            return scheduledDate >= today; // 今日以降の投稿のみ
          } catch (error) {
            console.error('投稿予定の日付変換エラー:', error, post);
            return false;
          }
        })
        .slice(0, 5)
        .map((post: PostData) => {
          try {
            let scheduledDate: Date;
            
            // Firestore Timestampオブジェクトの場合
            if (post.scheduledDate && typeof post.scheduledDate === 'object' && 'toDate' in post.scheduledDate) {
              scheduledDate = (post.scheduledDate as { toDate(): Date }).toDate();
            }
            // Firestore Timestampのシリアライズされた形式の場合
            else if (post.scheduledDate && typeof post.scheduledDate === 'object' && 'type' in post.scheduledDate && (post.scheduledDate as { type: string }).type === 'firestore/timestamp/1.0') {
              const timestamp = post.scheduledDate as unknown as { seconds: number; nanoseconds: number };
              scheduledDate = new Date(timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1000000));
            }
            // 通常のDateオブジェクトまたは文字列の場合
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
            status: post.status
          };
          } catch (error) {
            console.error('投稿予定の日付変換エラー:', error, post);
            return null;
          }
        })
        .filter((post: PostData | null): post is PostData => post !== null);
      setScheduledPosts(scheduledPostsData);

      // 未分析投稿を取得（公開済みまたは作成済みで分析データがない投稿）
      const unanalyzedPostsData = allPosts
        .filter((post: PostData) => {
          // 公開済みまたは作成済みの投稿
          if (post.status !== 'published' && post.status !== 'created') {
            return false;
          }
          
          // 分析データがない投稿
          if (analyticsData.some((analytics: { postId: string | null }) => analytics.postId === post.id)) {
            return false;
          }
          
          // 作成済みの投稿の場合、過去の投稿のみ（今日より前）
          if (post.status === 'created' && post.scheduledDate) {
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
              
              return scheduledDate < today; // 今日より前の投稿のみ
            } catch (error) {
              console.error('未分析投稿の日付変換エラー:', error, post);
              return false;
            }
          }
          
          return true; // 公開済みの投稿はすべて含める
        })
        .slice(0, 5)
        .map((post: PostData) => {
          try {
            let createdAt: Date;
            
            // Firestore Timestampオブジェクトの場合
            if (post.createdAt && typeof post.createdAt === 'object' && 'toDate' in post.createdAt) {
              createdAt = (post.createdAt as { toDate(): Date }).toDate();
            }
            // Firestore Timestampのシリアライズされた形式の場合
            else if (post.createdAt && typeof post.createdAt === 'object' && 'type' in post.createdAt && (post.createdAt as { type: string }).type === 'firestore/timestamp/1.0') {
              const timestamp = post.createdAt as unknown as { seconds: number; nanoseconds: number };
              createdAt = new Date(timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1000000));
            }
            // 通常のDateオブジェクトまたは文字列の場合
            else {
              createdAt = post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt as string);
            }
            
            return {
              id: post.id,
              title: post.title,
              type: post.postType === 'reel' ? 'リール' : post.postType === 'feed' ? 'フィード' : 'ストーリー',
              imageUrl: post.imageUrl || null,
              createdAt: createdAt.toLocaleDateString('ja-JP'),
              status: post.status
            };
          } catch (error) {
            console.error('未分析投稿の日付変換エラー:', error, post);
            return null;
          }
        })
        .filter((post: PostData | null): post is PostData => post !== null);
      setUnanalyzedPosts(unanalyzedPostsData);


      // 目標達成通知をAPIから取得
      await fetchGoalTracking();

    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, [user, fetchAnalyticsData, fetchDashboardStats, fetchGoalTracking]);

  useEffect(() => {
    // 認証状態が確定してからデータを取得
    if (user?.uid) {
      console.log('User authenticated, fetching data for:', user.uid);
      fetchPostsAndCalculateStats();
      
      // ポーリングは一時的に無効化
      // const interval = setInterval(() => {
      //   fetchPostsAndCalculateStats();
      // }, 300000);
      
      // return () => clearInterval(interval);
    } else {
      console.log('User not authenticated, skipping data fetch');
    }
  }, [user?.uid, fetchPostsAndCalculateStats]);

  // ローディング状態
  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  // エラー状態
  if (profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">エラー: {profileError}</div>
      </div>
    );
  }

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'reel': return '🎬';
      case 'feed': return '📸';
      case 'story': return '📱';
      default: return '📷';
    }
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'reel': return 'bg-purple-100 text-purple-800';
      case 'feed': return 'bg-blue-100 text-blue-800';
      case 'story': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <SNSLayout 
        currentSNS="instagram"
        customTitle="Instagram Dashboard"
        customDescription="あなたのInstagramアカウントの総合管理画面"
      >
        <div className="max-w-7xl mx-auto">
          {/* 計画内容の連携表示 */}
          <div className="mb-8">
            <PlanCard 
              planData={planData}
              variant="compact"
              showStrategies={true}
              className="mb-8"
            />
          </div>

          {/* 目標達成通知 */}
          <div className="bg-white p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-2">🎯</span>
              目標達成通知
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {loading ? (
                <div className="col-span-3 text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  <p className="text-gray-600 mt-2">読み込み中...</p>
                </div>
              ) : goalNotifications.length === 0 ? (
                <div className="col-span-3 text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">🎯</div>
                  <p className="text-gray-600">目標データがありません</p>
                </div>
              ) : (
                goalNotifications.map((goal, index) => (
                  <div key={index} className="bg-white p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{goal.title}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        goal.status === 'achieved' 
                          ? 'text-green-600 bg-green-100' 
                          : 'text-yellow-600 bg-yellow-100'
                      }`}>
                        {goal.status === 'achieved' ? '達成済み' : '進行中'}
                      </span>
                    </div>
                    <div className={`text-2xl font-bold ${
                      goal.status === 'achieved' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {goal.unit === '件' ? `${goal.current}/${goal.target}` : `${goal.current}${goal.unit}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {goal.unit === '件' ? `${Math.round((goal.current / goal.target) * 100)}% 達成` : `目標: ${goal.target}${goal.unit}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>





          {/* 分析待ちの投稿 */}
          {unanalyzedPosts.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <span className="text-2xl mr-2">📊</span>
                  分析待ちの投稿
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {unanalyzedPosts.map((post, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white hover:bg-gray-50 transition-colors rounded-none border border-gray-300">
                  <div className="flex items-center flex-1">
                    <div className="w-12 h-12 mr-3 flex-shrink-0">
                      {post.imageUrl ? (
                        <Image 
                          src={post.imageUrl} 
                          alt={post.title}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-gray-400 text-xs">📷</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mr-2 ${
                          post.type === 'reel' ? 'bg-purple-100 text-purple-800' :
                          post.type === 'feed' ? 'bg-blue-100 text-blue-800' :
                          'bg-pink-100 text-pink-800'
                        }`}>
                          {post.type === 'reel' ? '🎬' : post.type === 'feed' ? '📸' : '📱'}
                          {post.type}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          ⏳ 分析待ち
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 line-clamp-1">{post.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        <span className="mr-2">📅 {post.createdAt}</span>
                        <span className="text-gray-400">|</span>
                        <span className="ml-2">📊 分析データなし</span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-3">
                    <a 
                      href={`/instagram/analytics?postId=${post.id}`}
                      className="inline-flex items-center px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-md hover:bg-orange-600 transition-colors"
                    >
                      分析する
                    </a>
                  </div>
                </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 左カラム - 最近の投稿 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 最近の投稿 */}
              <div className="bg-white">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <span className="text-2xl mr-2">📊</span>
                    最近の投稿パフォーマンス
                  </h2>
                  <a 
                    href="/instagram/posts" 
                    className="text-sm text-pink-600 hover:text-pink-700 font-medium"
                  >
                    すべて見る →
                  </a>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {loading ? (
                      <div className="col-span-2 text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
                        <p className="text-gray-600 mt-2">読み込み中...</p>
                      </div>
                    ) : recentPosts.length === 0 ? (
                      <div className="col-span-2 text-center py-8">
                        <div className="text-gray-400 text-4xl mb-2">📊</div>
                        <p className="text-gray-600">投稿データがありません</p>
                      </div>
                    ) : (
                      recentPosts.map((post) => (
                      <div key={post.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        {/* サムネイル画像 */}
                        <div className="relative">
                          <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                            {post.imageUrl ? (
                              <Image 
                                src={post.imageUrl} 
                                alt={post.title}
                                width={400}
                                height={192}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-center text-gray-500">
                                <div className="text-4xl mb-2">📷</div>
                                <div className="text-sm">サムネがありません</div>
                              </div>
                            )}
                          </div>
                          <div className="absolute top-2 left-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPostTypeColor(post.type)}`}>
                            {getPostTypeIcon(post.type)} {post.type === 'reel' ? 'リール' : post.type === 'feed' ? 'フィード' : 'ストーリー'}
                          </span>
                          </div>
                          <div className="absolute top-2 right-2">
                            <span className="text-xs text-gray-500 bg-white bg-opacity-80 px-2 py-1 rounded">{post.postedAt}</span>
                          </div>
                        </div>
                        
                        <div className="p-4">
                          {/* タイトル */}
                          <div className="mb-2">
                            <h3 className="font-semibold text-gray-900 line-clamp-2">{post.title}</h3>
                          </div>
                          
                          {/* 投稿文（キャプション） */}
                          <div className="mb-3">
                            <p className="text-sm text-gray-700 line-clamp-3">{post.caption}</p>
                          </div>
                          
                          {/* ハッシュタグ */}
                          {post.hashtags && post.hashtags.length > 0 && (
                            <div className="mb-4">
                              <div className="flex flex-wrap gap-1">
                                {post.hashtags.slice(0, 5).map((hashtag: string, index: number) => (
                                  <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                    #{hashtag}
                                  </span>
                                ))}
                                {post.hashtags.length > 5 && (
                                  <span className="text-xs text-gray-500">+{post.hashtags.length - 5}個</span>
                                )}
                              </div>
                            </div>
                          )}
                        
                        {/* KPI表示 */}
                          <div className="grid grid-cols-4 gap-2 text-sm mb-4">
                          <div className="text-center bg-gray-50 rounded-lg p-2">
                            <div className="text-gray-500 text-xs">いいね</div>
                            <div className="font-semibold text-gray-900">{post.likes}</div>
                          </div>
                          <div className="text-center bg-gray-50 rounded-lg p-2">
                            <div className="text-gray-500 text-xs">コメント</div>
                            <div className="font-semibold text-gray-900">{post.comments}</div>
                          </div>
                          <div className="text-center bg-gray-50 rounded-lg p-2">
                            <div className="text-gray-500 text-xs">保存</div>
                            <div className="font-semibold text-gray-900">{post.saves}</div>
                          </div>
                          <div className="text-center bg-gray-50 rounded-lg p-2">
                              <div className="text-gray-500 text-xs">エンゲージ</div>
                            <div className="font-semibold text-pink-600">{post.engagementRate}%</div>
                            </div>
                          </div>
                          
                          {/* AIに聞くボタン */}
                          <div className="text-center">
                            <button 
                              onClick={() => {
                                // AIにこの投稿について聞く処理
                                const chatWidget = document.querySelector('[data-ai-chat-widget]');
                                if (chatWidget) {
                                  chatWidget.scrollIntoView({ behavior: 'smooth' });
                                }
                              }}
                              className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 text-sm font-medium"
                            >
                              <span className="mr-2">🤖</span>
                              この投稿についてAIに聞く
                            </button>
                          </div>
                        </div>
                      </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 右カラム - クイックアクションと分析 */}
            <div className="space-y-6">
              {/* 今週の投稿予定 */}
              <div className="bg-white">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <span className="text-2xl mr-2">📅</span>
                    今週の投稿予定
                  </h2>
                  <a href="/instagram/plan" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    投稿管理 →
                  </a>
                </div>
                <div className="p-6 space-y-3">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="text-gray-600 mt-2">読み込み中...</p>
                    </div>
                  ) : scheduledPosts.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-4xl mb-2">📅</div>
                      <p className="text-gray-600">今週の投稿予定はありません</p>
                    </div>
                  ) : (
                    scheduledPosts.map((post, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-lg">
                      <div className="flex items-center flex-1">
                        <div className="text-center mr-4 min-w-[50px]">
                          <div className="text-xs text-gray-500">{post.day}</div>
                          <div className="text-sm font-semibold text-gray-900">{post.date}</div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mr-2 ${
                              post.type === 'reel' ? 'bg-purple-100 text-purple-800' :
                              post.type === 'feed' ? 'bg-blue-100 text-blue-800' :
                              'bg-pink-100 text-pink-800'
                            }`}>
                              {post.type === 'reel' ? '🎬' : post.type === 'feed' ? '📸' : '📱'}
                              {post.type === 'reel' ? 'リール' : post.type === 'feed' ? 'フィード' : 'ストーリー'}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              post.status === 'scheduled' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {post.status === 'scheduled' ? '予定済み' : '下書き'}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-gray-900 line-clamp-1">{post.title}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            <span className="mr-2">⏰ {post.time}</span>
                            <span className="text-gray-400">|</span>
                            <span className="ml-2">📅 投稿予定</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </SNSLayout>

      {/* AIチャットウィジェット */}
      <AIChatWidget
        contextData={{
          stats: stats,
          recentPosts: recentPosts,
          instagramSettings: instagramSettings
        }}
      />
    </>
  );
}

export default function InstagramDashboard() {
  return (
    <AuthGuard>
      <InstagramDashboardContent />
    </AuthGuard>
  );
}