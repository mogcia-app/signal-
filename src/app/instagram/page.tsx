'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUserProfile } from '../../hooks/useUserProfile';
import { usePlanData } from '../../hooks/usePlanData';
import { useAuth } from '../../contexts/auth-context';
import { AuthGuard } from '../../components/auth-guard';
import SNSLayout from '../../components/sns-layout';
import { CurrentPlanCard } from '../../components/CurrentPlanCard';
import PostPreview from './components/PostPreview';
import AnalyticsForm from './components/AnalyticsForm';
import AnalyticsStats from './components/AnalyticsStats';
import { AnalyticsData } from './components/types';
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


function InstagramDashboardContent() {
  const { user } = useAuth();
  const { loading: profileLoading, error: profileError } = useUserProfile();
  const { planData } = usePlanData('instagram');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [inputData, setInputData] = useState({
    likes: '',
    comments: '',
    shares: '',
    reposts: '',
    reach: '',
    saves: '',
    followerIncrease: '',
    publishedAt: new Date().toISOString().split('T')[0],
    publishedTime: new Date().toTimeString().slice(0, 5),
    title: '',
    content: '',
    hashtags: '',
    thumbnail: '',
    category: 'feed' as 'reel' | 'feed' | 'story',
    // フィード専用フィールド
    reachFollowerPercent: '',
    interactionCount: '',
    interactionFollowerPercent: '',
    reachSourceProfile: '',
    reachSourceFeed: '',
    reachSourceExplore: '',
    reachSourceSearch: '',
    reachSourceOther: '',
    reachedAccounts: '',
    profileVisits: '',
    profileFollows: '',
    // リール専用フィールド
    reelReachFollowerPercent: '',
    reelInteractionCount: '',
    reelInteractionFollowerPercent: '',
    reelReachSourceProfile: '',
    reelReachSourceReel: '',
    reelReachSourceExplore: '',
    reelReachSourceSearch: '',
    reelReachSourceOther: '',
    reelReachedAccounts: '',
    reelSkipRate: '',
    reelNormalSkipRate: '',
    reelPlayTime: '',
    reelAvgPlayTime: '',
    audience: {
      gender: {
        male: '',
        female: '',
        other: ''
      },
      age: {
        '13-17': '',
        '18-24': '',
        '25-34': '',
        '35-44': '',
        '45-54': '',
        '55-64': '',
        '65+': ''
      }
    },
    reachSource: {
      sources: {
        posts: '',
        profile: '',
        explore: '',
        search: '',
        other: ''
      },
      followers: {
        followers: '',
        nonFollowers: ''
      }
    }
  });
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

  const [goalNotifications, setGoalNotifications] = useState<{
    title: string;
    current: number;
    target: number;
    unit: string;
    status: string;
  }[]>([]);

  const instagramSettings = {}; // SNS設定は不要になったため空オブジェクト

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

  // 投稿分析データを保存
  const handleSaveAnalytics = async (sentimentData?: { sentiment: 'satisfied' | 'dissatisfied' | null; memo: string }) => {
    if (!user?.uid) {
      alert('ログインが必要です');
      return;
    }

    if (!inputData.likes) {
      alert('いいね数を入力してください');
      return;
    }
    if (!inputData.reach) {
      alert('閲覧数を入力してください');
      return;
    }

    setIsAnalyticsLoading(true);
    try {
      const idToken = await user.getIdToken();
      
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
          'x-user-id': user.uid,
        },
        body: JSON.stringify({
          userId: user.uid,
          postId: null,
          likes: inputData.likes,
          comments: inputData.comments,
          shares: inputData.shares,
          reach: inputData.reach,
          saves: inputData.saves,
          followerIncrease: inputData.followerIncrease,
          publishedAt: inputData.publishedAt,
          publishedTime: inputData.publishedTime,
          title: inputData.title,
          content: inputData.content,
          hashtags: inputData.hashtags,
          thumbnail: inputData.thumbnail,
          category: inputData.category,
          audience: inputData.audience,
          reachSource: inputData.reachSource,
          sentiment: sentimentData?.sentiment || null,
          sentimentMemo: sentimentData?.memo || ''
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました');
      }

      const result = await response.json();
      console.log('Analytics saved:', result);

      alert('投稿分析データを保存しました！');
      
      // データを再取得
      await fetchAnalytics();

      // 入力データをリセット
      setInputData({
        likes: '',
        comments: '',
        shares: '',
        reposts: '',
        reach: '',
        saves: '',
        followerIncrease: '',
        publishedAt: new Date().toISOString().split('T')[0],
        publishedTime: new Date().toTimeString().slice(0, 5),
        title: '',
        content: '',
        hashtags: '',
        thumbnail: '',
        category: 'feed',
        // フィード専用フィールド
        reachFollowerPercent: '',
        interactionCount: '',
        interactionFollowerPercent: '',
        reachSourceProfile: '',
        reachSourceFeed: '',
        reachSourceExplore: '',
        reachSourceSearch: '',
        reachSourceOther: '',
        reachedAccounts: '',
        profileVisits: '',
        profileFollows: '',
        // リール専用フィールド
        reelReachFollowerPercent: '',
        reelInteractionCount: '',
        reelInteractionFollowerPercent: '',
        reelReachSourceProfile: '',
        reelReachSourceReel: '',
        reelReachSourceExplore: '',
        reelReachSourceSearch: '',
        reelReachSourceOther: '',
        reelReachedAccounts: '',
        reelSkipRate: '',
        reelNormalSkipRate: '',
        reelPlayTime: '',
        reelAvgPlayTime: '',
        audience: {
          gender: {
            male: '',
            female: '',
            other: ''
          },
          age: {
            '13-17': '',
            '18-24': '',
            '25-34': '',
            '35-44': '',
            '45-54': '',
            '55-64': '',
            '65+': ''
          }
        },
        reachSource: {
          sources: {
            posts: '',
            profile: '',
            explore: '',
            search: '',
            other: ''
          },
          followers: {
            followers: '',
            nonFollowers: ''
          }
        }
      });

    } catch (error) {
      console.error('保存エラー:', error);
      alert(`保存に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

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

      
      // アナリティクスデータを取得
      const analyticsData = await fetchAnalyticsData();
      
      // ダッシュボード統計をAPIから取得
      await fetchDashboardStats();



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

          {/* 投稿分析統計 */}
          <div className="mb-8">
            <AnalyticsStats
              analyticsData={analyticsData}
              isLoading={isAnalyticsLoading}
            />
          </div>

          {/* フォロワー増加入力セクション */}
          <div className="bg-white p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <span className="text-2xl mr-2">👥</span>
              フォロワー増加入力
            </h2>
            
            <div className="max-w-md">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  フォロワー増加数
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    value={inputData.followerIncrease}
                    onChange={(e) => setInputData(prev => ({ ...prev, followerIncrease: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="例: 50"
                    min="0"
                  />
                  <span className="text-sm text-gray-600">人</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  今週のフォロワー増加数を入力してください
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    if (!inputData.followerIncrease) {
                      alert('フォロワー増加数を入力してください');
                      return;
                    }
                    handleSaveAnalytics();
                  }}
                  disabled={isAnalyticsLoading}
                  className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {isAnalyticsLoading ? '保存中...' : 'フォロワー増加を記録'}
                </button>
                
                <button
                  onClick={() => setInputData(prev => ({ ...prev, followerIncrease: '' }))}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  クリア
                </button>
              </div>
            </div>
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

          {/* 投稿分析セクション */}
          <div className="bg-white p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <span className="text-2xl mr-2">📊</span>
              投稿分析
            </h2>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* 左カラム: 分析データ入力フォーム */}
              <div className="space-y-6">
                {/* 統合された分析データ入力フォーム */}
                <AnalyticsForm
                  data={inputData}
                  onChange={setInputData}
                  onSave={handleSaveAnalytics}
                  isLoading={isAnalyticsLoading}
                />
              </div>

              {/* 右カラム: 投稿プレビュー */}
              <div className="space-y-6">
                {/* 投稿プレビューセクション */}
                <PostPreview
                  selectedPost={null}
                  inputData={{
                    title: inputData.title,
                    content: inputData.content,
                    hashtags: inputData.hashtags,
                    category: inputData.category,
                    thumbnail: inputData.thumbnail,
                    publishedAt: inputData.publishedAt,
                    publishedTime: inputData.publishedTime
                  }}
                />
              </div>
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