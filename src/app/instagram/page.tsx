'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useUserProfile } from '../../hooks/useUserProfile';
import { usePlanData } from '../../hooks/usePlanData';
import { useAuth } from '../../contexts/auth-context';
import { postsApi } from '../../lib/api';
import { AuthGuard } from '../../components/auth-guard';
import SNSLayout from '../../components/sns-layout';
import { AIChatWidget } from '../../components/ai-chat-widget';
import { CurrentPlanCard } from '../../components/CurrentPlanCard';
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
  const { planData } = usePlanData('instagram');
  const [analyticsData, setAnalyticsData] = useState<Array<{
    followerIncrease?: number;
    [key: string]: unknown;
  }>>([]);
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

  // 分析データを取得
  const fetchAnalytics = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/analytics?userId=${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'x-user-id': user.uid,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setAnalyticsData(result.analytics || []);
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
    }
  }, [user]);

  // 目標設定の状態
  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [goalSettings, setGoalSettings] = useState({
    weeklyPostGoal: 5,
    followerGoal: 10,
    monthlyPostGoal: 20
  });
  const [isSavingGoals, setIsSavingGoals] = useState(false);

  // 次のアクションの状態
  const [nextActions, setNextActions] = useState<Array<{
    id: string;
    type: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    actionText: string;
    actionUrl: string;
    icon: string;
    color: string;
  }>>([]);

  const instagramSettings = {}; // SNS設定は不要になったため空オブジェクト

  // 目標設定を保存
  const saveGoalSettings = async () => {
    if (!user?.uid) return;
    
    try {
      setIsSavingGoals(true);
      const idToken = await user.getIdToken();
      
      const response = await fetch('/api/instagram/goal-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid,
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(goalSettings)
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setShowGoalSettings(false);
          // 目標達成追跡を再取得
          await fetchGoalTracking();
          alert('目標設定を保存しました！');
        }
      }
    } catch (error) {
      console.error('目標設定保存エラー:', error);
      alert('目標設定の保存に失敗しました');
    } finally {
      setIsSavingGoals(false);
    }
  };

  // 目標設定を読み込み
  const fetchGoalSettings = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/instagram/goal-settings', {
        headers: {
          'x-user-id': user.uid,
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setGoalSettings({
            weeklyPostGoal: result.data.weeklyPostGoal || 5,
            followerGoal: result.data.followerGoal || 10,
            monthlyPostGoal: result.data.monthlyPostGoal || 20
          });
        }
      }
    } catch (error) {
      console.error('目標設定取得エラー:', error);
    }
  }, [user]);

  // 次のアクションを取得
  const fetchNextActions = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/instagram/next-actions', {
        headers: {
          'x-user-id': user.uid,
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setNextActions(result.data.actions || []);
        }
      }
    } catch (error) {
      console.error('Next actions fetch error:', error);
    }
  }, [user]);

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
      
      // 投稿データと手動入力データを組み合わせて表示
      const combinedData = [
        // 投稿データ（analyticsDataとマッチするもの）
        ...allPosts
          .filter((post: PostData) => analyticsData.some((a: { postId: string | null }) => a.postId === post.id))
          .slice(0, 4)
          .map((post: PostData) => {
            const analyticsFromData = analyticsData.find((a: { postId: string | null }) => a.postId === post.id);
            return {
              id: post.id,
              title: post.title || 'タイトルなし',
              type: post.postType || 'feed',
              likes: analyticsFromData?.likes || 0,
              comments: analyticsFromData?.comments || 0,
              saves: analyticsFromData?.shares || 0,
              reach: analyticsFromData?.reach || 0,
              engagementRate: analyticsFromData?.engagementRate || 0,
              postedAt: (() => {
                try {
                  const dateToUse = analyticsFromData?.publishedAt || post.createdAt;
                  if (dateToUse && typeof dateToUse === 'object' && 'toDate' in dateToUse) {
                    return dateToUse.toDate().toLocaleDateString('ja-JP');
                  } else if (dateToUse) {
                    return new Date(dateToUse).toLocaleDateString('ja-JP');
                  }
                  return '日付不明';
                } catch (error) {
                  console.error('日付変換エラー:', error, post);
                  return '日付不明';
                }
              })(),
              imageUrl: analyticsFromData?.thumbnail || post.imageData || post.imageUrl || null
            };
          }),
        // 手動入力データ（postIdがnullのもの）
        ...analyticsData
          .filter((a: { postId: string | null }) => a.postId === null)
          .slice(0, 4 - allPosts.filter((post: PostData) => analyticsData.some((a: { postId: string | null }) => a.postId === post.id)).length)
          .map((analytics: any, index: number) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
            id: `manual-${index}`,
            title: analytics.title || '手動入力データ',
            type: 'feed',
            likes: analytics.likes || 0,
            comments: analytics.comments || 0,
            saves: analytics.shares || 0,
            reach: analytics.reach || 0,
            engagementRate: analytics.engagementRate || 0,
            postedAt: (() => {
              try {
                if (analytics.publishedAt) {
                  return new Date(analytics.publishedAt).toLocaleDateString('ja-JP');
                }
                return '日付不明';
              } catch (error) {
                console.error('手動入力データの日付変換エラー:', error, analytics);
                return '日付不明';
              }
            })(),
            imageUrl: analytics.thumbnail || null
          }))
      ];

      const recentPostsData = combinedData.slice(0, 4);
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

      // 次のアクションを取得
      await fetchNextActions();

    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, [user, fetchAnalyticsData, fetchDashboardStats, fetchGoalTracking, fetchNextActions]);

  useEffect(() => {
    // 認証状態が確定してからデータを取得
    if (user?.uid) {
      console.log('User authenticated, fetching data for:', user.uid);
      fetchPostsAndCalculateStats();
      fetchGoalSettings(); // 目標設定を読み込み
      fetchAnalytics(); // analyticsデータを取得
      
      // ポーリングは一時的に無効化
      // const interval = setInterval(() => {
      //   fetchPostsAndCalculateStats();
      // }, 300000);
      
      // return () => clearInterval(interval);
    } else {
      console.log('User not authenticated, skipping data fetch');
    }
  }, [user?.uid, fetchPostsAndCalculateStats, fetchGoalSettings, fetchAnalytics]);

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
      case 'reel': return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      );
      case 'feed': return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      );
      case 'story': return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      );
      default: return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      );
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
        customTitle="Instagram Dashboard"
        customDescription="あなたのInstagramアカウントの総合管理画面"
      >
        <div className="max-w-7xl mx-auto">
          {/* 計画内容の連携表示 */}
          <div className="mb-8">
            {(() => {
              // フォロワー増加数を計算
              const totalFollowerIncrease = analyticsData?.reduce((sum, data) => sum + (Number(data.followerIncrease) || 0), 0) || 0;
              const actualFollowers = planData ? Number(planData.currentFollowers || 0) + totalFollowerIncrease : 0;
              
              return (
                <CurrentPlanCard 
                  planData={planData}
                  snsType="instagram"
                  actualFollowers={actualFollowers}
                />
              );
            })()}
          </div>

          {/* 次のアクション */}
          <div className="bg-white p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-2">🎯</span>
              次のアクション
            </h2>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  <p className="text-black mt-2">読み込み中...</p>
                </div>
              ) : nextActions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-black text-4xl mb-2">✅</div>
                  <p className="text-black">すべて完了しています！</p>
                  <p className="text-sm text-black mt-1">素晴らしい運用を続けましょう</p>
                </div>
              ) : (
                nextActions.map((action, index) => (
                  <div key={action.id} className={`p-4 border-l-4 ${
                    action.priority === 'high' ? 'border-red-500 bg-red-50' :
                    action.priority === 'medium' ? 'border-orange-500 bg-orange-50' :
                    'border-blue-500 bg-blue-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{action.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-800">{action.title}</h3>
                          <p className="text-sm text-black">{action.description}</p>
                        </div>
                      </div>
                      <a
                        href={action.actionUrl}
                        className="px-4 py-2 bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
                      >
                        {action.actionText}
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 目標設定・達成通知 */}
          <div className="bg-white p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <span className="text-2xl mr-2">🎯</span>
                目標設定・達成状況
              </h2>
              <button
                onClick={() => setShowGoalSettings(!showGoalSettings)}
                className="px-4 py-2 bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
              >
                {showGoalSettings ? 'キャンセル' : '目標設定'}
              </button>
            </div>

                  {/* 目標設定フォーム */}
                  {showGoalSettings && (
                    <div className="bg-white border border-gray-200 p-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">目標を設定してください</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">週間投稿目標</label>
                    <input
                      type="number"
                      value={goalSettings.weeklyPostGoal}
                      onChange={(e) => setGoalSettings(prev => ({ ...prev, weeklyPostGoal: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      min="1"
                      max="50"
                    />
                    <p className="text-xs text-black mt-1">週に何回投稿するか</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">フォロワー増加目標</label>
                    <input
                      type="number"
                      value={goalSettings.followerGoal}
                      onChange={(e) => setGoalSettings(prev => ({ ...prev, followerGoal: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      min="1"
                      max="1000"
                    />
                    <p className="text-xs text-black mt-1">月に何人増やすか</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">月間投稿目標</label>
                    <input
                      type="number"
                      value={goalSettings.monthlyPostGoal}
                      onChange={(e) => setGoalSettings(prev => ({ ...prev, monthlyPostGoal: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      min="1"
                      max="200"
                    />
                    <p className="text-xs text-black mt-1">月に何回投稿するか</p>
                  </div>
                </div>
                <div className="flex justify-end mt-4 space-x-3">
                  <button
                    onClick={() => setShowGoalSettings(false)}
                    className="px-4 py-2 text-black border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={saveGoalSettings}
                    disabled={isSavingGoals}
                    className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 transition-colors"
                  >
                    {isSavingGoals ? '保存中...' : '目標を保存'}
                  </button>
                </div>
              </div>
            )}

            {/* 目標達成状況表示 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {loading ? (
                <div className="col-span-3 text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  <p className="text-black mt-2">読み込み中...</p>
                </div>
              ) : goalNotifications.length === 0 ? (
                <div className="col-span-3 text-center py-8">
                  <div className="text-black text-4xl mb-2">🎯</div>
                  <p className="text-black">目標を設定してください</p>
                  <button
                    onClick={() => setShowGoalSettings(true)}
                    className="mt-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
                  >
                    目標を設定する
                  </button>
                </div>
              ) : (
                goalNotifications.map((goal, index) => (
                  <div key={index} className="bg-white p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{goal.title}</span>
                      <span className={`text-xs px-2 py-1 ${
                        goal.status === 'achieved' 
                          ? 'text-green-600 bg-green-100' 
                          : 'text-orange-600 bg-orange-100'
                      }`}>
                        {goal.status === 'achieved' ? '🎉 達成済み' : '進行中'}
                      </span>
                    </div>
                    <div className={`text-2xl font-bold ${
                      goal.status === 'achieved' ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {goal.unit === '件' ? `${goal.current}/${goal.target}` : `${goal.current}${goal.unit}`}
                    </div>
                    <div className="text-xs text-black">
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
                          <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
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
                      <div className="text-sm font-medium text-black line-clamp-1">{post.title}</div>
                      <div className="text-xs text-black mt-1">
                        <span className="mr-2">📅 {post.createdAt}</span>
                        <span className="text-black">|</span>
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
                        <p className="text-black mt-2">読み込み中...</p>
                      </div>
                    ) : recentPosts.length === 0 ? (
                      <div className="col-span-2 text-center py-8">
                        <div className="text-black text-4xl mb-2">📊</div>
                        <p className="text-black">投稿データがありません</p>
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
                              <div className="text-center text-black">
                                <svg className="w-12 h-12 mx-auto mb-2 text-black" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                </svg>
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
                            <span className="text-xs text-black bg-white bg-opacity-80 px-2 py-1 rounded">{post.postedAt}</span>
                          </div>
                        </div>
                        
                        <div className="p-4">
                          {/* タイトル */}
                          <div className="mb-2">
                            <h3 className="font-semibold text-black line-clamp-2">{post.title}</h3>
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
                                  <span className="text-xs text-black">+{post.hashtags.length - 5}個</span>
                                )}
                              </div>
                            </div>
                          )}
                        
                        {/* KPI表示 */}
                          <div className="grid grid-cols-3 gap-2 text-sm mb-4">
                          <div className="text-center bg-gray-50 rounded-lg p-2">
                            <div className="text-black text-xs">いいね</div>
                            <div className="font-semibold text-black">{post.likes}</div>
                          </div>
                          <div className="text-center bg-gray-50 rounded-lg p-2">
                            <div className="text-black text-xs">コメント</div>
                            <div className="font-semibold text-black">{post.comments}</div>
                          </div>
                          <div className="text-center bg-gray-50 rounded-lg p-2">
                            <div className="text-black text-xs">保存</div>
                            <div className="font-semibold text-black">{post.saves}</div>
                          </div>
                          </div>
                          
                          {/* AIに聞くボタン */}
                          <div className="text-center">
                            <button 
                              onClick={async () => {
                                try {
                                  // AIチャットウィジェットを開く
                                  const chatButton = document.querySelector('[data-ai-chat-button]') as HTMLButtonElement;
                                  if (chatButton) {
                                    chatButton.click();
                                    
                                    // 少し待ってから投稿データを含む質問を送信
                                    setTimeout(async () => {
                                      const question = `この投稿のパフォーマンスについて分析してください：
                                      
📊 投稿データ：
- いいね数: ${post.likes}
- コメント数: ${post.comments}
- リーチ数: ${post.reach}
- 保存数: ${post.saves}
- エンゲージメント率: ${post.engagementRate}%

📝 投稿内容：
- タイトル: ${post.title}
- キャプション: ${post.caption || 'なし'}
- ハッシュタグ: ${post.hashtags?.join(' ') || 'なし'}
- 投稿タイプ: ${post.type}

この投稿のパフォーマンスを分析し、改善点や成功要因を教えてください。`;

                                      // AIチャットウィジェットの入力欄に質問を設定
                                      const textarea = document.querySelector('[data-ai-chat-widget] textarea') as HTMLTextAreaElement;
                                      const sendButton = document.querySelector('[data-ai-chat-widget] button[type="button"]') as HTMLButtonElement;
                                      
                                      if (textarea && sendButton) {
                                        textarea.value = question;
                                        textarea.dispatchEvent(new Event('input', { bubbles: true }));
                                        sendButton.click();
                                      }
                                    }, 500);
                                  }
                                } catch (error) {
                                  console.error('AIチャット起動エラー:', error);
                                }
                              }}
                              className="inline-flex items-center px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all duration-200 text-sm font-medium"
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
                  <a href="/instagram/lab" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    投稿管理 →
                  </a>
                </div>
                <div className="p-6 space-y-3">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="text-black mt-2">読み込み中...</p>
                    </div>
                  ) : scheduledPosts.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-black text-4xl mb-2">📅</div>
                      <p className="text-black">今週の投稿予定はありません</p>
                    </div>
                  ) : (
                    scheduledPosts.map((post, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-lg">
                      <div className="flex items-center flex-1">
                        <div className="text-center mr-4 min-w-[50px]">
                          <div className="text-xs text-black">{post.day}</div>
                          <div className="text-sm font-semibold text-black">{post.date}</div>
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
                          <div className="text-sm font-medium text-black line-clamp-1">{post.title}</div>
                          <div className="text-xs text-black mt-1">
                            <span className="mr-2">⏰ {post.time}</span>
                            <span className="text-black">|</span>
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