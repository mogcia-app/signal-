'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useUserProfile } from '../../hooks/useUserProfile';
import { usePlanData } from '../../hooks/usePlanData';
import { useAuth } from '../../contexts/auth-context';
import { AuthGuard } from '../../components/auth-guard';
import SNSLayout from '../../components/sns-layout';
import { CurrentPlanCard } from '../../components/CurrentPlanCard';
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

interface RecentPost {
  id: string;
  title: string;
  postType: string;
  icon: string;
  timeAgo: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  hasAnalytics: boolean;
}

interface PerformanceSummary {
  weeklyGrowth: {
    value: number;
    status: string;
    color: string;
    label: string;
  };
  engagement: {
    value: number;
    status: string;
    color: string;
    label: string;
  };
  frequency: {
    value: number;
    status: string;
    color: string;
    label: string;
  };
}

interface GoalProgress {
  weeklyPosts: {
    current: number;
    goal: number;
    progress: number;
    status: string;
    label: string;
  };
  followerGrowth: {
    current: number;
    goal: number;
    progress: number;
    status: string;
    label: string;
  };
}


function InstagramDashboardContent() {
  const { user } = useAuth();
  const { loading: profileLoading, error: profileError } = useUserProfile();
  const { planData } = usePlanData('instagram');
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

  const instagramSettings = {}; // SNS設定は不要になったため空オブジェクト

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

  // 新しいデータの状態
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary | null>(null);
  const [goalProgress, setGoalProgress] = useState<GoalProgress | null>(null);


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

  // 次のアクションを即座に更新する関数（外部から呼び出し可能）
  const refreshNextActions = useCallback(() => {
    console.log('🔄 Refreshing next actions...');
    fetchNextActions();
  }, [fetchNextActions]);

  // 最近の投稿を取得
  const fetchRecentPosts = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/instagram/recent-posts', {
        headers: {
          'x-user-id': user.uid,
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setRecentPosts(result.data.posts || []);
        }
      }
    } catch (error) {
      console.error('Recent posts fetch error:', error);
    }
  }, [user]);

  // パフォーマンスサマリーを取得
  const fetchPerformanceSummary = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/instagram/performance-summary', {
        headers: {
          'x-user-id': user.uid,
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPerformanceSummary(result.data);
        }
      }
    } catch (error) {
      console.error('Performance summary fetch error:', error);
    }
  }, [user]);

  // 目標進捗を取得
  const fetchGoalProgress = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/instagram/goal-progress', {
        headers: {
          'x-user-id': user.uid,
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setGoalProgress(result.data);
        }
      }
    } catch (error) {
      console.error('Goal progress fetch error:', error);
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

      
      // アナリティクスデータを取得
      const analyticsData = await fetchAnalyticsData();
      
      // ダッシュボード統計をAPIから取得
      await fetchDashboardStats();

      // 新しいデータを取得
      await Promise.all([
        fetchRecentPosts(),
        fetchPerformanceSummary(),
        fetchGoalProgress(),
        fetchNextActions()
      ]);

    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, [user, fetchAnalyticsData, fetchDashboardStats, fetchRecentPosts, fetchPerformanceSummary, fetchGoalProgress, fetchNextActions]);

  // グローバルにアクセス可能な更新関数を設定
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as Window & { refreshNextActions?: () => void }).refreshNextActions = refreshNextActions;
    }
  }, [refreshNextActions]);

  useEffect(() => {
    // 認証状態が確定してからデータを取得
    if (user?.uid) {
      console.log('User authenticated, fetching data for:', user.uid);
      fetchPostsAndCalculateStats();
      
      // 4日ごとに自動更新（4日 = 4 * 24 * 60 * 60 * 1000 = 345,600,000ms）
      const interval = setInterval(() => {
        fetchPostsAndCalculateStats();
      }, 345600000);
      
      return () => clearInterval(interval);
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


  return (
    <>
      <SNSLayout 
        customTitle="Instagram Dashboard"
        customDescription="あなたのInstagramアカウントの総合管理画面"
      >
        <div className="max-w-7xl mx-auto">
          {/* 計画内容の連携表示 */}
          <div className="mb-8">
            <CurrentPlanCard 
              planData={planData}
              snsType="instagram"
              actualFollowers={planData ? Number(planData.currentFollowers || 0) : 0}
            />
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

          {/* ダッシュボード統計 */}
          <div className="mb-8">
            <div className="bg-white p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                <span className="text-2xl mr-2">📊</span>
                ダッシュボード統計
              </h2>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  <p className="text-gray-600 mt-2">統計データを読み込み中...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {/* フォロワー数 */}
                    <div className="bg-white p-4 border border-orange-500">
                      <div className="mb-2">
                        <span className="text-xs text-orange-600 font-medium">フォロワー</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{stats.followers.toLocaleString()}</div>
                      <div className="text-xs text-gray-600">
                        {stats.followerGrowth > 0 ? '+' : ''}{stats.followerGrowth}%
                      </div>
                    </div>

                    {/* エンゲージメント率 */}
                    <div className="bg-white p-4 border border-orange-500">
                      <div className="mb-2">
                        <span className="text-xs text-orange-600 font-medium">エンゲージ</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{stats.engagement.toFixed(1)}%</div>
                      <div className="text-xs text-gray-600">平均率</div>
                    </div>

                    {/* リーチ数 */}
                    <div className="bg-white p-4 border border-orange-500">
                      <div className="mb-2">
                        <span className="text-xs text-orange-600 font-medium">リーチ</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{stats.reach.toLocaleString()}</div>
                      <div className="text-xs text-gray-600">総リーチ</div>
                    </div>

                    {/* いいね数 */}
                    <div className="bg-white p-4 border border-orange-500">
                      <div className="mb-2">
                        <span className="text-xs text-orange-600 font-medium">いいね</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{stats.likes.toLocaleString()}</div>
                      <div className="text-xs text-gray-600">総いいね</div>
                    </div>

                    {/* コメント数 */}
                    <div className="bg-white p-4 border border-orange-500">
                      <div className="mb-2">
                        <span className="text-xs text-orange-600 font-medium">コメント</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{stats.comments.toLocaleString()}</div>
                      <div className="text-xs text-gray-600">総コメント</div>
                    </div>

                    {/* 保存数 */}
                    <div className="bg-white p-4 border border-orange-500">
                      <div className="mb-2">
                        <span className="text-xs text-orange-600 font-medium">保存</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{stats.saves.toLocaleString()}</div>
                      <div className="text-xs text-gray-600">総保存</div>
                    </div>
                </div>
              )}
            </div>
          </div>

          {/* 投稿活動統計 */}
          <div className="mb-8">
            <div className="bg-white p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                <span className="text-2xl mr-2">📈</span>
                投稿活動統計
              </h2>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  <p className="text-gray-600 mt-2">活動データを読み込み中...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* 今週の投稿数 */}
                    <div className="bg-white p-6 border border-orange-500">
                      <div className="mb-4">
                        <span className="text-sm text-orange-600 font-medium">今週の投稿</span>
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-2">{stats.postsThisWeek}</div>
                      <div className="text-sm text-gray-600">今週の投稿数</div>
                    </div>

                    {/* 月間フィード投稿 */}
                    <div className="bg-white p-6 border border-orange-500">
                      <div className="mb-4">
                        <span className="text-sm text-orange-600 font-medium">フィード</span>
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-2">{stats.monthlyFeedPosts}</div>
                      <div className="text-sm text-gray-600">今月の投稿数</div>
                    </div>

                    {/* 月間リール投稿 */}
                    <div className="bg-white p-6 border border-orange-500">
                      <div className="mb-4">
                        <span className="text-sm text-orange-600 font-medium">リール</span>
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-2">{stats.monthlyReelPosts}</div>
                      <div className="text-sm text-gray-600">今月の投稿数</div>
                    </div>

                    {/* 月間ストーリー投稿 */}
                    <div className="bg-white p-6 border border-orange-500">
                      <div className="mb-4">
                        <span className="text-sm text-orange-600 font-medium">ストーリー</span>
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-2">{stats.monthlyStoryPosts}</div>
                      <div className="text-sm text-gray-600">今月の投稿数</div>
                    </div>
                </div>
              )}
            </div>
          </div>

          {/* クイックアクション */}
          <div className="mb-8">
            <div className="bg-white p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                <span className="text-2xl mr-2">⚡</span>
                クイックアクション
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <a
                  href="/instagram/lab/feed"
                  className="p-4 border border-orange-500 hover:bg-orange-50 transition-colors text-center"
                >
                  <div className="text-3xl mb-2">📝</div>
                  <div className="font-medium text-gray-800">フィード作成</div>
                  <div className="text-sm text-gray-600">新しい投稿を作成</div>
                </a>
                
                <a
                  href="/instagram/lab/reel"
                  className="p-4 border border-orange-500 hover:bg-orange-50 transition-colors text-center"
                >
                  <div className="text-3xl mb-2">🎬</div>
                  <div className="font-medium text-gray-800">リール作成</div>
                  <div className="text-sm text-gray-600">動画コンテンツ作成</div>
                </a>
                
                <a
                  href="/instagram/lab/story"
                  className="p-4 border border-orange-500 hover:bg-orange-50 transition-colors text-center"
                >
                  <div className="text-3xl mb-2">📱</div>
                  <div className="font-medium text-gray-800">ストーリー作成</div>
                  <div className="text-sm text-gray-600">一時的な投稿作成</div>
                </a>
                
                <a
                  href="/instagram/analytics"
                  className="p-4 border border-orange-500 hover:bg-orange-50 transition-colors text-center"
                >
                  <div className="text-3xl mb-2">📊</div>
                  <div className="font-medium text-gray-800">分析実行</div>
                  <div className="text-sm text-gray-600">投稿パフォーマンス分析</div>
                </a>
              </div>
            </div>
          </div>

          {/* 最近の投稿 */}
          <div className="mb-8">
            <div className="bg-white p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                <span className="text-2xl mr-2">📋</span>
                最近の投稿
              </h2>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  <p className="text-gray-600 mt-2">投稿データを読み込み中...</p>
                </div>
              ) : recentPosts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">📝</div>
                  <p className="text-gray-600">最近の投稿がありません</p>
                  <p className="text-sm text-gray-500 mt-1">新しい投稿を作成しましょう</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentPosts.slice(0, 3).map((post) => (
                    <div key={post.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                            <span className="text-2xl">{post.icon}</span>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-800">{post.title}</h3>
                            <p className="text-sm text-gray-600">{post.timeAgo}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {post.hasAnalytics ? (
                            <>
                              <div className="text-sm text-gray-600">いいね: {post.likes.toLocaleString()}</div>
                              <div className="text-sm text-gray-600">コメント: {post.comments.toLocaleString()}</div>
                            </>
                          ) : (
                            <div className="text-sm text-orange-600">分析待ち</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="text-center py-4">
                    <Link
                      href="/instagram/posts"
                      className="text-orange-600 hover:text-orange-700 font-medium"
                    >
                      すべての投稿を見る →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* パフォーマンスサマリー */}
          <div className="mb-8">
            <div className="bg-white p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                <span className="text-2xl mr-2">📈</span>
                パフォーマンスサマリー
              </h2>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  <p className="text-gray-600 mt-2">パフォーマンスデータを読み込み中...</p>
                </div>
              ) : performanceSummary ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 border border-orange-500">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-orange-600 font-medium">{performanceSummary.weeklyGrowth.label}</span>
                      <span className={`text-sm ${performanceSummary.weeklyGrowth.color}`}>{performanceSummary.weeklyGrowth.status}</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">+{performanceSummary.weeklyGrowth.value}</div>
                    <div className="text-sm text-gray-600">フォロワー増加</div>
                  </div>
                  
                  <div className="p-4 border border-orange-500">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-orange-600 font-medium">{performanceSummary.frequency.label}</span>
                      <span className={`text-sm ${performanceSummary.frequency.color}`}>{performanceSummary.frequency.status}</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{performanceSummary.frequency.value}</div>
                    <div className="text-sm text-gray-600">今週の投稿数</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">📈</div>
                  <p className="text-gray-600">パフォーマンスデータがありません</p>
                  <p className="text-sm text-gray-500 mt-1">投稿と分析を開始しましょう</p>
                </div>
              )}
            </div>
          </div>

          {/* 目標進捗 */}
          <div className="mb-8">
            <div className="bg-white p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                <span className="text-2xl mr-2">🎯</span>
                目標進捗
              </h2>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  <p className="text-gray-600 mt-2">目標データを読み込み中...</p>
                </div>
              ) : goalProgress ? (
                <div className="space-y-4">
                  <div className="p-4 border border-orange-500">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800">{goalProgress.weeklyPosts.label}</span>
                      <span className="text-sm text-gray-600">{goalProgress.weeklyPosts.current}/{goalProgress.weeklyPosts.goal}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full" 
                        style={{ width: `${goalProgress.weeklyPosts.progress}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {Math.round(goalProgress.weeklyPosts.progress)}% 達成 - {goalProgress.weeklyPosts.status}
                    </div>
                  </div>
                  
                  <div className="p-4 border border-orange-500">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800">{goalProgress.followerGrowth.label}</span>
                      <span className="text-sm text-gray-600">+{goalProgress.followerGrowth.current.toFixed(1)}/{goalProgress.followerGrowth.goal}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${goalProgress.followerGrowth.progress}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {Math.round(goalProgress.followerGrowth.progress)}% 達成 - {goalProgress.followerGrowth.status}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">🎯</div>
                  <p className="text-gray-600">目標データがありません</p>
                  <p className="text-sm text-gray-500 mt-1">目標を設定して進捗を追跡しましょう</p>
                </div>
              )}
            </div>
          </div>




        </div>
      </SNSLayout>

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