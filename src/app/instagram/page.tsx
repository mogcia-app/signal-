'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useSNSSettings } from '../../hooks/useSNSSettings';
import { usePlanData } from '../../hooks/usePlanData';
import { useAuth } from '../../contexts/auth-context';
import { postsApi } from '../../lib/api';
import { AuthGuard } from '../../components/auth-guard';
import SNSLayout from '../../components/sns-layout';
import { AIChatWidget } from '../../components/ai-chat-widget';
import { Target } from 'lucide-react';
import StatsCards from './components/StatsCards';
import PostAnalysisInput from './components/PostAnalysisInput';
import AnalyticsCharts from './components/AnalyticsCharts';

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
  scheduledDate?: string;
  scheduledTime?: string;
  status: 'draft' | 'scheduled' | 'published';
  imageUrl?: string | null;
  imageData?: string | null;
  createdAt: Date;
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
}

function InstagramDashboardContent() {
  const { user } = useAuth();
  const { userProfile, loading: profileLoading, error: profileError } = useUserProfile();
  const { getSNSSettings } = useSNSSettings();
  const { planData } = usePlanData();
  const [analyticsData, setAnalyticsData] = useState<{
    likes: number;
    comments: number;
    shares: number;
    reach: number;
    engagementRate: number;
    publishedAt: Date | string;
    postId: string;
  }[]>([]);
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
  const [hashtagRanking, setHashtagRanking] = useState<{
    tag: string;
    count: number;
    engagement: number;
  }[]>([]);
  const [goalNotifications, setGoalNotifications] = useState<{
    title: string;
    current: number;
    target: number;
    unit: string;
    status: string;
  }[]>([]);

  const instagramSettings = getSNSSettings('instagram');

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
      
      // 分析データは空配列（機能削除のため）
      const analyticsData: any[] = [];
      
      console.log('Fetched posts from API:', allPosts.length, 'posts');
      console.log('Fetched analytics from collection:', analyticsData.length, 'records');
      console.log('Analytics data sample:', analyticsData.slice(0, 2));
      console.log('Posts response:', postsResponse);
      console.log('Analytics response:', analyticsResponse);
      
      setAnalyticsData(analyticsData);
      
      // 分析データから統計を計算
      const totalLikes = analyticsData.reduce((sum: number, analytics: typeof analyticsData[0]) => 
        sum + (analytics.likes || 0), 0
      );
      const totalComments = analyticsData.reduce((sum: number, analytics: typeof analyticsData[0]) => 
        sum + (analytics.comments || 0), 0
      );
      const totalSaves = analyticsData.reduce((sum: number, analytics: typeof analyticsData[0]) => 
        sum + (analytics.shares || 0), 0
      );
      const totalReach = analyticsData.reduce((sum: number, analytics: typeof analyticsData[0]) => 
        sum + (analytics.reach || 0), 0
      );

      // 今週の投稿数
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const postsThisWeek = analyticsData.filter((analytics: typeof analyticsData[0]) => 
        new Date(analytics.publishedAt) >= oneWeekAgo
      ).length;

      // 今月の投稿数
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const postsThisMonth = analyticsData.filter((analytics: typeof analyticsData[0]) => 
        new Date(analytics.publishedAt) >= oneMonthAgo
      ).length;

      // 平均エンゲージメント率
      const avgEngagement = analyticsData.length > 0 
        ? analyticsData.reduce((sum: number, analytics: typeof analyticsData[0]) => sum + (analytics.engagementRate || 0), 0) / analyticsData.length
        : 0;

      // 実際のフォロワー数を取得（ユーザープロフィールから）
      const currentFollowers = userProfile?.snsProfiles?.instagram?.followers || 0;

      setStats({
        followers: currentFollowers,
        engagement: Math.round(avgEngagement * 10) / 10,
        reach: totalReach,
        saves: totalSaves,
        likes: totalLikes,
        comments: totalComments,
        postsThisWeek,
        weeklyGoal: 5,
        followerGrowth: postsThisMonth > 0 ? 12.5 : 0,
        topPostType: 'フィード',
        monthlyFeedPosts: postsThisMonth,
        monthlyReelPosts: 0,
        monthlyStoryPosts: 0
      });

      // 最近の投稿パフォーマンスを生成（analyticsデータから）
      const recentPostsData = analyticsData
        .slice(0, 4)
        .map((analytics: typeof analyticsData[0]) => {
          const post = allPosts.find((p: PostData) => p.id === analytics.postId);
          return {
            id: analytics.postId,
            title: post?.title || 'タイトルなし',
            type: post?.postType || 'feed',
            likes: analytics.likes || 0,
            comments: analytics.comments || 0,
            saves: analytics.shares || 0,
            reach: analytics.reach || 0,
            engagementRate: analytics.engagementRate || 0,
            postedAt: new Date(analytics.publishedAt).toLocaleDateString('ja-JP'),
            imageUrl: post?.imageUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop&crop=center',
            caption: post?.content || ''
          };
        });
      setRecentPosts(recentPostsData);

      // 今週の投稿予定を生成
      const scheduledPostsData = allPosts
        .filter((post: PostData) => 
          (post.status === 'scheduled' || post.status === 'draft') && 
          post.scheduledDate
        )
        .slice(0, 5)
        .map((post: PostData) => {
          const scheduledDate = new Date(post.scheduledDate!);
          const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
          return {
            day: dayNames[scheduledDate.getDay()],
            date: `${scheduledDate.getMonth() + 1}/${scheduledDate.getDate()}`,
            type: post.postType === 'reel' ? 'リール' : post.postType === 'feed' ? 'フィード' : 'ストーリー',
            title: post.title,
            time: post.scheduledTime || '未設定',
            status: post.status
          };
        });
      setScheduledPosts(scheduledPostsData);

      // ハッシュタグランキングを生成
      const allHashtags = allPosts.flatMap((post: PostData) => post.hashtags);
      const hashtagCounts = allHashtags.reduce((acc: Record<string, number>, hashtag: string) => {
        acc[hashtag] = (acc[hashtag] || 0) + 1;
        return acc;
      }, {});
      
      const hashtagRankingData = Object.entries(hashtagCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 6)
        .map(([tag, count]) => ({
          tag: `#${tag}`,
          count: count as number,
          engagement: Math.random() * 3 + 2 // 仮のエンゲージメント率
        }));
      setHashtagRanking(hashtagRankingData);

      // 目標達成通知を生成
      const goalNotificationsData = [
        {
          title: '週間投稿目標',
          current: postsThisWeek,
          target: 5,
          unit: '件',
          status: postsThisWeek >= 5 ? 'achieved' : 'in_progress'
        },
        {
          title: 'エンゲージメント目標',
          current: Math.round(avgEngagement * 10) / 10,
          target: 5.0,
          unit: '%',
          status: Math.round(avgEngagement * 10) / 10 >= 5.0 ? 'achieved' : 'in_progress'
        },
        {
          title: 'フォロワー増加',
          current: postsThisMonth > 0 ? 12.5 : 0,
          target: 10.0,
          unit: '%',
          status: (postsThisMonth > 0 ? 12.5 : 0) >= 10.0 ? 'achieved' : 'in_progress'
        }
      ];
      setGoalNotifications(goalNotificationsData);

    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, userProfile?.snsProfiles?.instagram?.followers]);

  useEffect(() => {
    // 認証状態が確定してからデータを取得
    if (user?.uid) {
      console.log('User authenticated, fetching data for:', user.uid);
      fetchPostsAndCalculateStats();
      
      // リアルタイム更新のためのポーリング（30秒間隔）
      const interval = setInterval(() => {
        fetchPostsAndCalculateStats();
      }, 30000);
      
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
          {planData ? (
            <div className="bg-white p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Target className="h-6 w-6 mr-2 text-pink-600" />
                現在の運用計画
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">目標名</p>
                  <p className="font-semibold text-gray-900">{planData.goalName}</p>
                </div>
                <div className="bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">計画期間</p>
                  <p className="font-semibold text-gray-900">{planData.planPeriod}</p>
                </div>
                <div className="bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">目標フォロワー数</p>
                  <p className="font-semibold text-gray-900">{planData.currentFollowers + planData.followerGain}</p>
                </div>
                <div className="bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">カテゴリ</p>
                  <p className="font-semibold text-gray-900">{planData.goalCategory}</p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <a 
                  href="/instagram/plan" 
                  className="text-sm text-pink-600 hover:text-pink-700 font-medium"
                >
                  詳細を見る →
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 mb-8">
              <div className="text-center">
                <div className="text-4xl mb-4">📋</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">運用計画を作成しましょう</h2>
                <p className="text-gray-600 mb-4">Instagram運用の目標を設定して、効果的な戦略を立てましょう</p>
                <a 
                  href="/instagram/plan" 
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium text-white bg-[#ff8a15] hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                >
                  <Target className="h-5 w-5 mr-2" />
                  運用計画を作成する
                </a>
              </div>
            </div>
          )}

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

          {/* 統計カード */}
          <StatsCards stats={stats} loading={loading} />

          {/* よく使用したハッシュタグランキング */}
          <div className="bg-white mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <span className="text-2xl mr-2">#️⃣</span>
                よく使用したハッシュタグランキング
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                  <div className="col-span-3 text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
                    <p className="text-gray-600 mt-2">読み込み中...</p>
                  </div>
                ) : hashtagRanking.length === 0 ? (
                  <div className="col-span-3 text-center py-8">
                    <div className="text-gray-400 text-4xl mb-2">#️⃣</div>
                    <p className="text-gray-600">ハッシュタグデータがありません</p>
                  </div>
                ) : (
                  hashtagRanking.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center">
                      <span className="text-lg font-bold text-pink-600 mr-3">#{index + 1}</span>
                      <div>
                        <div className="font-medium text-gray-900">{item.tag}</div>
                        <div className="text-sm text-gray-500">{item.count}回使用</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-pink-600">{item.engagement}%</div>
                      <div className="text-xs text-gray-500">エンゲージメント</div>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* エンゲージメント分析グラフ */}
          <AnalyticsCharts analyticsData={analyticsData} stats={stats} loading={loading} />

          {/* 投稿分析入力 - 全幅表示 */}
          <PostAnalysisInput onDataSaved={fetchPostsAndCalculateStats} />

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
                      <div key={post.id} className="bg-gray-50 p-4 hover:shadow-md transition-shadow">
                        {/* 投稿情報 */}
                        <div className="flex items-center justify-between mb-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPostTypeColor(post.type)}`}>
                            {getPostTypeIcon(post.type)} {post.type === 'reel' ? 'リール' : post.type === 'feed' ? 'フィード' : 'ストーリー'}
                          </span>
                          <span className="text-xs text-gray-500">{post.postedAt}</span>
                        </div>
                        <h3 className="font-medium text-gray-900 mb-4 line-clamp-2">{post.title}</h3>
                        
                        {/* KPI表示 */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
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
                            <div className="text-gray-500 text-xs">エンゲージメント率</div>
                            <div className="font-semibold text-pink-600">{post.engagementRate}%</div>
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
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center">
                        <div className="text-center mr-4">
                          <div className="text-xs text-gray-500">{post.day}</div>
                          <div className="text-sm font-semibold text-gray-900">{post.date}</div>
                        </div>
                        <div>
                          <div className="flex items-center">
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
                          <div className="text-sm font-medium text-gray-900 mt-1">{post.title}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">{post.time}</div>
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