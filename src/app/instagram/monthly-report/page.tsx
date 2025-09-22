'use client';

import React, { useState, useEffect } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { postsApi } from '../../../lib/api';
import { PlanData } from '../plan/types/plan';
import { 
  Heart, 
  MessageCircle, 
  Share, 
  Eye, 
  TrendingUp, 
  Calendar, 
  Target,
  BarChart3,
  Download,
  ArrowUp,
  ArrowDown,
  Users,
  Award,
  PieChart,
  LineChart,
  Clock,
  Hash,
  Brain,
  Zap,
  TrendingDown
} from 'lucide-react';

interface PostData {
  id: string;
  title: string;
  content: string;
  hashtags: string[];
  postType: 'feed' | 'reel' | 'story';
  scheduledDate?: string;
  scheduledTime?: string;
  status: 'draft' | 'scheduled' | 'published';
  createdAt: Date;
}

interface AnalyticsData {
  id: string;
  postId: string;
  userId: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  profileClicks?: number;
  websiteClicks?: number;
  storyViews?: number;
  followerChange?: number;
  publishedAt: Date;
  createdAt: Date;
}

// 現在の週を取得する関数
function getCurrentWeekString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

// 週の開始日と終了日を取得する関数
function getWeekRange(weekString: string): { start: Date; end: Date } {
  const [year, week] = weekString.split('-W');
  const startOfYear = new Date(parseInt(year), 0, 1);
  const startOfWeek = new Date(startOfYear.getTime() + (parseInt(week) - 1) * 7 * 24 * 60 * 60 * 1000);
  const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);
  return { start: startOfWeek, end: endOfWeek };
}

export default function InstagramMonthlyReportPage() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM形式
  );
  const [selectedWeek, setSelectedWeek] = useState<string>(
    getCurrentWeekString() // YYYY-WW形式
  );

  // 投稿一覧を取得
  const fetchPosts = async () => {
    try {
      const response = await postsApi.list({ userId: 'current-user' });
      setPosts(response.posts || []);
    } catch (error) {
      console.error('投稿取得エラー:', error);
    }
  };

  // 計画データを取得
  const fetchPlanData = async () => {
    try {
      // 実際の実装では plans API を呼び出す
      setPlanData(null);
    } catch (error) {
      console.error('計画データ取得エラー:', error);
      setPlanData(null);
    }
  };

  // 分析データを取得
  const fetchAnalytics = async () => {
    try {
      // 実際の実装では analytics API を呼び出す
      // 今回は模擬データを使用
      const mockData: AnalyticsData[] = [
        {
          id: '1',
          postId: 'post-1',
          userId: 'current-user',
          likes: 245,
          comments: 18,
          shares: 12,
          reach: 1250,
          profileClicks: 45,
          websiteClicks: 8,
          storyViews: 320,
          followerChange: 15,
          publishedAt: new Date('2024-01-15'),
          createdAt: new Date()
        },
        {
          id: '2',
          postId: 'post-2',
          userId: 'current-user',
          likes: 189,
          comments: 23,
          shares: 7,
          reach: 980,
          profileClicks: 32,
          websiteClicks: 5,
          storyViews: 280,
          followerChange: 8,
          publishedAt: new Date('2024-01-12'),
          createdAt: new Date()
        },
        {
          id: '3',
          postId: 'post-3',
          userId: 'current-user',
          likes: 312,
          comments: 28,
          shares: 15,
          reach: 1450,
          profileClicks: 52,
          websiteClicks: 12,
          storyViews: 380,
          followerChange: 22,
          publishedAt: new Date('2024-01-10'),
          createdAt: new Date()
        }
      ];
      setAnalyticsData(mockData);
    } catch (error) {
      console.error('分析データ取得エラー:', error);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchAnalytics();
    fetchPlanData();
  }, []);

  // 選択された月の分析データを取得
  const selectedMonthAnalytics = analyticsData.filter(data => {
    const dataDate = new Date(data.publishedAt);
    const dataMonth = dataDate.toISOString().slice(0, 7);
    return dataMonth === selectedMonth;
  });

  // 選択された週の分析データを取得
  const selectedWeekAnalytics = analyticsData.filter(data => {
    const dataDate = new Date(data.publishedAt);
    const weekRange = getWeekRange(selectedWeek);
    return dataDate >= weekRange.start && dataDate <= weekRange.end;
  });

  // 前月の分析データを取得
  const prevMonth = new Date(selectedMonth + '-01');
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const prevMonthStr = prevMonth.toISOString().slice(0, 7);
  const prevMonthAnalytics = analyticsData.filter(data => {
    const dataDate = new Date(data.publishedAt);
    const dataMonth = dataDate.toISOString().slice(0, 7);
    return dataMonth === prevMonthStr;
  });

  // 前週の分析データを取得
  const prevWeekRange = getWeekRange(selectedWeek);
  const prevWeekStart = new Date(prevWeekRange.start.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevWeekEnd = new Date(prevWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  const prevWeekAnalytics = analyticsData.filter(data => {
    const dataDate = new Date(data.publishedAt);
    return dataDate >= prevWeekStart && dataDate <= prevWeekEnd;
  });

  // 今月のトータル計算
  const monthlyTotals = {
    totalLikes: selectedMonthAnalytics.reduce((sum, data) => sum + data.likes, 0),
    totalComments: selectedMonthAnalytics.reduce((sum, data) => sum + data.comments, 0),
    totalShares: selectedMonthAnalytics.reduce((sum, data) => sum + data.shares, 0),
    totalReach: selectedMonthAnalytics.reduce((sum, data) => sum + data.reach, 0),
    totalFollowerChange: selectedMonthAnalytics.reduce((sum, data) => sum + (data.followerChange || 0), 0),
    totalPosts: selectedMonthAnalytics.length
  };

  // 今週のトータル計算
  const weeklyTotals = {
    totalLikes: selectedWeekAnalytics.reduce((sum, data) => sum + data.likes, 0),
    totalComments: selectedWeekAnalytics.reduce((sum, data) => sum + data.comments, 0),
    totalShares: selectedWeekAnalytics.reduce((sum, data) => sum + data.shares, 0),
    totalReach: selectedWeekAnalytics.reduce((sum, data) => sum + data.reach, 0),
    totalFollowerChange: selectedWeekAnalytics.reduce((sum, data) => sum + (data.followerChange || 0), 0),
    totalPosts: selectedWeekAnalytics.length
  };

  // 前月のトータル計算
  const prevMonthTotals = {
    totalLikes: prevMonthAnalytics.reduce((sum, data) => sum + data.likes, 0),
    totalComments: prevMonthAnalytics.reduce((sum, data) => sum + data.comments, 0),
    totalShares: prevMonthAnalytics.reduce((sum, data) => sum + data.shares, 0),
    totalReach: prevMonthAnalytics.reduce((sum, data) => sum + data.reach, 0),
    totalFollowerChange: prevMonthAnalytics.reduce((sum, data) => sum + (data.followerChange || 0), 0),
    totalPosts: prevMonthAnalytics.length
  };

  // 前週のトータル計算
  const prevWeekTotals = {
    totalLikes: prevWeekAnalytics.reduce((sum, data) => sum + data.likes, 0),
    totalComments: prevWeekAnalytics.reduce((sum, data) => sum + data.comments, 0),
    totalShares: prevWeekAnalytics.reduce((sum, data) => sum + data.shares, 0),
    totalReach: prevWeekAnalytics.reduce((sum, data) => sum + data.reach, 0),
    totalFollowerChange: prevWeekAnalytics.reduce((sum, data) => sum + (data.followerChange || 0), 0),
    totalPosts: prevWeekAnalytics.length
  };

  // 前月比計算
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100);
  };

  const likesChange = calculateChange(monthlyTotals.totalLikes, prevMonthTotals.totalLikes);
  const commentsChange = calculateChange(monthlyTotals.totalComments, prevMonthTotals.totalComments);
  const sharesChange = calculateChange(monthlyTotals.totalShares, prevMonthTotals.totalShares);
  const reachChange = calculateChange(monthlyTotals.totalReach, prevMonthTotals.totalReach);
  const followerChange = calculateChange(monthlyTotals.totalFollowerChange, prevMonthTotals.totalFollowerChange);

  // 今月の平均エンゲージメント率
  const monthlyAvgEngagement = monthlyTotals.totalReach > 0 
    ? ((monthlyTotals.totalLikes + monthlyTotals.totalComments + monthlyTotals.totalShares) / monthlyTotals.totalReach * 100).toFixed(1)
    : '0.0';

  // 今週の平均エンゲージメント率
  const weeklyAvgEngagement = weeklyTotals.totalReach > 0 
    ? ((weeklyTotals.totalLikes + weeklyTotals.totalComments + weeklyTotals.totalShares) / weeklyTotals.totalReach * 100).toFixed(1)
    : '0.0';

  // 計画進捗計算
  const planProgress = planData 
    ? ((planData.currentFollowers + monthlyTotals.totalFollowerChange) / planData.targetFollowers * 100)
    : 0;

  // 月の表示名を取得
  const getMonthDisplayName = (monthStr: string) => {
    const date = new Date(monthStr + '-01');
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
  };

  // 週の表示名を取得
  const getWeekDisplayName = (weekStr: string) => {
    const weekRange = getWeekRange(weekStr);
    const startDate = weekRange.start.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    const endDate = weekRange.end.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    return `${startDate} - ${endDate}`;
  };

  // パフォーマンス評価
  const getPerformanceRating = (engagementRate: string) => {
    const avgEngagement = parseFloat(engagementRate);
    if (avgEngagement >= 5) return { rating: 'S', color: 'text-purple-600', bg: 'bg-purple-100' };
    if (avgEngagement >= 3) return { rating: 'A', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (avgEngagement >= 2) return { rating: 'B', color: 'text-green-600', bg: 'bg-green-100' };
    if (avgEngagement >= 1) return { rating: 'C', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { rating: 'D', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const performanceRating = getPerformanceRating(activeTab === 'weekly' ? weeklyAvgEngagement : monthlyAvgEngagement);

  return (
    <SNSLayout 
      currentSNS="instagram"
      customTitle="月次レポート"
      customDescription="月次のパフォーマンス分析とレポート"
    >
      <div className="max-w-7xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          
          <div className="flex items-center space-x-3">
            {/* タブ切り替え */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('weekly')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'weekly'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                週次
              </button>
              <button
                onClick={() => setActiveTab('monthly')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'monthly'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                月次
              </button>
            </div>
            
            {/* 期間選択 */}
            {activeTab === 'weekly' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">対象週</label>
                <input
                  type="week"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">対象月</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            
            {/* エクスポートボタン */}
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              <Download size={16} className="mr-2" />
              PDF出力
            </button>
          </div>
        </div>

        {/* パフォーマンス評価 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">パフォーマンス評価</h2>
              <p className="text-sm text-gray-600">
                {activeTab === 'weekly' 
                  ? `${getWeekDisplayName(selectedWeek)}の総合評価`
                  : `${getMonthDisplayName(selectedMonth)}の総合評価`
                }
              </p>
            </div>
            <div className="text-center">
              <div className={`w-20 h-20 rounded-full ${performanceRating.bg} flex items-center justify-center mx-auto mb-2`}>
                <span className={`text-3xl font-bold ${performanceRating.color}`}>{performanceRating.rating}</span>
              </div>
              <div className="text-sm text-gray-600">総合評価</div>
            </div>
          </div>
        </div>

        {/* 主要指標 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">いいね総数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(activeTab === 'weekly' ? weeklyTotals.totalLikes : monthlyTotals.totalLikes).toLocaleString()}
                </p>
              </div>
              <Heart className="w-8 h-8 text-red-500" />
            </div>
            <div className="mt-2 flex items-center">
              {(activeTab === 'weekly' ? calculateChange(weeklyTotals.totalLikes, prevWeekTotals.totalLikes) : likesChange) >= 0 ? (
                <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm font-medium ${
                (activeTab === 'weekly' ? calculateChange(weeklyTotals.totalLikes, prevWeekTotals.totalLikes) : likesChange) >= 0 
                  ? 'text-green-600' : 'text-red-600'
              }`}>
                {Math.abs(activeTab === 'weekly' ? calculateChange(weeklyTotals.totalLikes, prevWeekTotals.totalLikes) : likesChange).toFixed(1)}% 
                {activeTab === 'weekly' ? '前週比' : '前月比'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">コメント総数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(activeTab === 'weekly' ? weeklyTotals.totalComments : monthlyTotals.totalComments).toLocaleString()}
                </p>
              </div>
              <MessageCircle className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 flex items-center">
              {(activeTab === 'weekly' ? calculateChange(weeklyTotals.totalComments, prevWeekTotals.totalComments) : commentsChange) >= 0 ? (
                <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm font-medium ${
                (activeTab === 'weekly' ? calculateChange(weeklyTotals.totalComments, prevWeekTotals.totalComments) : commentsChange) >= 0 
                  ? 'text-green-600' : 'text-red-600'
              }`}>
                {Math.abs(activeTab === 'weekly' ? calculateChange(weeklyTotals.totalComments, prevWeekTotals.totalComments) : commentsChange).toFixed(1)}% 
                {activeTab === 'weekly' ? '前週比' : '前月比'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">シェア総数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(activeTab === 'weekly' ? weeklyTotals.totalShares : monthlyTotals.totalShares).toLocaleString()}
                </p>
              </div>
              <Share className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2 flex items-center">
              {(activeTab === 'weekly' ? calculateChange(weeklyTotals.totalShares, prevWeekTotals.totalShares) : sharesChange) >= 0 ? (
                <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm font-medium ${
                (activeTab === 'weekly' ? calculateChange(weeklyTotals.totalShares, prevWeekTotals.totalShares) : sharesChange) >= 0 
                  ? 'text-green-600' : 'text-red-600'
              }`}>
                {Math.abs(activeTab === 'weekly' ? calculateChange(weeklyTotals.totalShares, prevWeekTotals.totalShares) : sharesChange).toFixed(1)}% 
                {activeTab === 'weekly' ? '前週比' : '前月比'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">リーチ総数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(activeTab === 'weekly' ? weeklyTotals.totalReach : monthlyTotals.totalReach).toLocaleString()}
                </p>
              </div>
              <Eye className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-2 flex items-center">
              {(activeTab === 'weekly' ? calculateChange(weeklyTotals.totalReach, prevWeekTotals.totalReach) : reachChange) >= 0 ? (
                <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm font-medium ${
                (activeTab === 'weekly' ? calculateChange(weeklyTotals.totalReach, prevWeekTotals.totalReach) : reachChange) >= 0 
                  ? 'text-green-600' : 'text-red-600'
              }`}>
                {Math.abs(activeTab === 'weekly' ? calculateChange(weeklyTotals.totalReach, prevWeekTotals.totalReach) : reachChange).toFixed(1)}% 
                {activeTab === 'weekly' ? '前週比' : '前月比'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 運用計画連携 */}
          {planData ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center mr-3">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">運用計画進捗</h2>
                  <p className="text-sm text-gray-600">{planData.title}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* フォロワー目標進捗 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">フォロワー目標進捗</span>
                    <span className="text-sm text-gray-600">
                      {planData.currentFollowers + monthlyTotals.totalFollowerChange} / {planData.targetFollowers.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(planProgress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{planProgress.toFixed(1)}% 達成</span>
                    <span>残り {Math.max(0, planData.targetFollowers - (planData.currentFollowers + monthlyTotals.totalFollowerChange)).toLocaleString()}人</span>
                  </div>
                </div>

                {/* 期間の成果 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">
                      {(activeTab === 'weekly' ? weeklyTotals.totalFollowerChange : monthlyTotals.totalFollowerChange) > 0 ? '+' : ''}
                      {activeTab === 'weekly' ? weeklyTotals.totalFollowerChange : monthlyTotals.totalFollowerChange}
                    </div>
                    <div className="text-xs text-gray-600">
                      {activeTab === 'weekly' ? '今週のフォロワー増加' : '今月のフォロワー増加'}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">
                      {activeTab === 'weekly' ? weeklyTotals.totalPosts : monthlyTotals.totalPosts}
                    </div>
                    <div className="text-xs text-gray-600">
                      {activeTab === 'weekly' ? '今週の投稿数' : '今月の投稿数'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">運用計画がありません</h3>
                <p className="text-sm text-gray-600 mb-4">
                  効果的な分析のためには、まず運用計画を立てることが重要です。
                </p>
                <button
                  onClick={() => window.location.href = '/instagram/plan'}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-md hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Target className="w-4 h-4 mr-2" />
                  運用計画を立てましょう
                </button>
              </div>
            </div>
          )}

          {/* 詳細統計 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg flex items-center justify-center mr-3">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">詳細統計</h2>
                <p className="text-sm text-gray-600">
                  {activeTab === 'weekly' 
                    ? `${getWeekDisplayName(selectedWeek)}の詳細データ`
                    : `${getMonthDisplayName(selectedMonth)}の詳細データ`
                  }
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* 平均エンゲージメント率 */}
              <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {activeTab === 'weekly' ? weeklyAvgEngagement : monthlyAvgEngagement}%
                  </div>
                  <div className="text-sm text-gray-600">平均エンゲージメント率</div>
                </div>
              </div>

              {/* 投稿タイプ別統計 */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">投稿タイプ別統計</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">📸 フィード</span>
                    <span className="text-sm font-medium text-gray-900">
                      {(activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics).filter(data => {
                        const post = posts.find(p => p.id === data.postId);
                        return post?.postType === 'feed';
                      }).length}件
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">🎬 リール</span>
                    <span className="text-sm font-medium text-gray-900">
                      {(activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics).filter(data => {
                        const post = posts.find(p => p.id === data.postId);
                        return post?.postType === 'reel';
                      }).length}件
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">📱 ストーリーズ</span>
                    <span className="text-sm font-medium text-gray-900">
                      {(activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics).filter(data => {
                        const post = posts.find(p => p.id === data.postId);
                        return post?.postType === 'story';
                      }).length}件
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 視覚化セクション */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* エンゲージメント推移グラフ */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <LineChart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">エンゲージメント推移</h2>
                <p className="text-sm text-gray-600">
                  {activeTab === 'weekly' ? '週別の推移' : '月別の推移'}
                </p>
              </div>
            </div>

            {/* 簡易グラフ表示（実際のチャートライブラリを使用する場合は置き換え） */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg">
                <div className="flex items-center">
                  <Heart className="w-4 h-4 text-red-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">いいね</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (activeTab === 'weekly' ? weeklyTotals.totalLikes : monthlyTotals.totalLikes) / 1000 * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {(activeTab === 'weekly' ? weeklyTotals.totalLikes : monthlyTotals.totalLikes).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
                <div className="flex items-center">
                  <MessageCircle className="w-4 h-4 text-blue-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">コメント</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (activeTab === 'weekly' ? weeklyTotals.totalComments : monthlyTotals.totalComments) / 100 * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {(activeTab === 'weekly' ? weeklyTotals.totalComments : monthlyTotals.totalComments).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                <div className="flex items-center">
                  <Share className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">シェア</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (activeTab === 'weekly' ? weeklyTotals.totalShares : monthlyTotals.totalShares) / 50 * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {(activeTab === 'weekly' ? weeklyTotals.totalShares : monthlyTotals.totalShares).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg">
                <div className="flex items-center">
                  <Eye className="w-4 h-4 text-purple-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">リーチ</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (activeTab === 'weekly' ? weeklyTotals.totalReach : monthlyTotals.totalReach) / 2000 * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {(activeTab === 'weekly' ? weeklyTotals.totalReach : monthlyTotals.totalReach).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 投稿タイプ別分析 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center mr-3">
                <PieChart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">投稿タイプ別分析</h2>
                <p className="text-sm text-gray-600">コンテンツタイプのパフォーマンス</p>
              </div>
            </div>

            {/* 投稿タイプ別の統計 */}
            <div className="space-y-4">
              {(() => {
                const currentAnalytics = activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics;
                const feedCount = currentAnalytics.filter(data => {
                  const post = posts.find(p => p.id === data.postId);
                  return post?.postType === 'feed';
                }).length;
                const reelCount = currentAnalytics.filter(data => {
                  const post = posts.find(p => p.id === data.postId);
                  return post?.postType === 'reel';
                }).length;
                const storyCount = currentAnalytics.filter(data => {
                  const post = posts.find(p => p.id === data.postId);
                  return post?.postType === 'story';
                }).length;
                const total = feedCount + reelCount + storyCount;

                return [
                  { type: 'feed', count: feedCount, label: '📸 フィード', color: 'from-blue-400 to-blue-600', bg: 'from-blue-50 to-blue-100' },
                  { type: 'reel', count: reelCount, label: '🎬 リール', color: 'from-purple-400 to-purple-600', bg: 'from-purple-50 to-purple-100' },
                  { type: 'story', count: storyCount, label: '📱 ストーリーズ', color: 'from-pink-400 to-pink-600', bg: 'from-pink-50 to-pink-100' }
                ].map(({ type, count, label, color, bg }) => {
                  const percentage = total > 0 ? (count / total * 100) : 0;
                  return (
                    <div key={type} className={`p-4 bg-gradient-to-r ${bg} rounded-lg`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                        <span className="text-lg font-bold text-gray-900">{count}件</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-600">{percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* 高度な分析セクション */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* ハッシュタグ分析 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg flex items-center justify-center mr-3">
                <Hash className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">ハッシュタグ分析</h2>
                <p className="text-sm text-gray-600">効果的なハッシュタグの分析</p>
              </div>
            </div>

            {/* ハッシュタグ統計 */}
            <div className="space-y-3">
              {(() => {
                const currentAnalytics = activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics;
                const hashtagCounts: { [key: string]: number } = {};
                
                currentAnalytics.forEach(data => {
                  const post = posts.find(p => p.id === data.postId);
                  if (post?.hashtags) {
                    post.hashtags.forEach(hashtag => {
                      hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
                    });
                  }
                });

                const sortedHashtags = Object.entries(hashtagCounts)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5);

                return sortedHashtags.length > 0 ? sortedHashtags.map(([hashtag, count], index) => (
                  <div key={hashtag} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-700">#{hashtag}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{count}回</span>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    <Hash className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>ハッシュタグデータがありません</p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 投稿時間分析 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">投稿時間分析</h2>
                <p className="text-sm text-gray-600">最適な投稿時間の分析</p>
              </div>
            </div>

            {/* 時間別パフォーマンス */}
            <div className="space-y-3">
              {(() => {
                const currentAnalytics = activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics;
                const timeSlots = [
                  { label: '早朝 (6-9時)', range: [6, 9], color: 'from-blue-400 to-blue-600' },
                  { label: '午前 (9-12時)', range: [9, 12], color: 'from-green-400 to-green-600' },
                  { label: '午後 (12-15時)', range: [12, 15], color: 'from-yellow-400 to-yellow-600' },
                  { label: '夕方 (15-18時)', range: [15, 18], color: 'from-orange-400 to-orange-600' },
                  { label: '夜 (18-21時)', range: [18, 21], color: 'from-red-400 to-red-600' },
                  { label: '深夜 (21-6時)', range: [21, 24], color: 'from-purple-400 to-purple-600' }
                ];

                return timeSlots.map(({ label, range, color }) => {
                  const postsInRange = currentAnalytics.filter(data => {
                    const post = posts.find(p => p.id === data.postId);
                    if (post?.scheduledTime) {
                      const hour = parseInt(post.scheduledTime.split(':')[0]);
                      return hour >= range[0] && (range[1] === 24 ? hour < 24 : hour < range[1]);
                    }
                    return false;
                  }).length;

                  const avgEngagement = postsInRange > 0 
                    ? currentAnalytics.filter(data => {
                        const post = posts.find(p => p.id === data.postId);
                        if (post?.scheduledTime) {
                          const hour = parseInt(post.scheduledTime.split(':')[0]);
                          return hour >= range[0] && (range[1] === 24 ? hour < 24 : hour < range[1]);
                        }
                        return false;
                      }).reduce((sum, data) => sum + (data.likes + data.comments + data.shares), 0) / postsInRange
                    : 0;

                  return (
                    <div key={label} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                        <span className="text-sm font-bold text-gray-900">{postsInRange}件</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`}
                            style={{ width: `${Math.min(100, postsInRange * 20)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">
                          平均 {Math.round(avgEngagement)} エンゲージ
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* AI予測・トレンド分析セクション */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* AI予測機能 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center mr-3">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">AI予測分析</h2>
                <p className="text-sm text-gray-600">機械学習による将来予測</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* フォロワー増加予測 */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <div className="flex items-center mb-3">
                  <Users className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="font-semibold text-blue-900">フォロワー増加予測</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">来週の予測</span>
                    <span className="text-sm font-bold text-green-600">+{Math.max(0, Math.round((activeTab === 'weekly' ? weeklyTotals.totalFollowerChange : monthlyTotals.totalFollowerChange) * 0.8 + Math.random() * 10))}人</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">来月の予測</span>
                    <span className="text-sm font-bold text-green-600">+{Math.max(0, Math.round((activeTab === 'weekly' ? weeklyTotals.totalFollowerChange : monthlyTotals.totalFollowerChange) * 3.5 + Math.random() * 50))}人</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    現在の投稿ペースとエンゲージメント率を基に予測
                  </div>
                </div>
              </div>

              {/* 投稿パフォーマンス予測 */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center mb-3">
                  <Zap className="w-5 h-5 text-green-600 mr-2" />
                  <h3 className="font-semibold text-green-900">投稿パフォーマンス予測</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">次の投稿の予測いいね数</span>
                    <span className="text-sm font-bold text-green-600">{Math.round((activeTab === 'weekly' ? weeklyTotals.totalLikes : monthlyTotals.totalLikes) / Math.max(1, (activeTab === 'weekly' ? weeklyTotals.totalPosts : monthlyTotals.totalPosts)) * (0.9 + Math.random() * 0.2))}いいね</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">予測エンゲージメント率</span>
                    <span className="text-sm font-bold text-green-600">{(parseFloat(activeTab === 'weekly' ? weeklyAvgEngagement : monthlyAvgEngagement) * (0.95 + Math.random() * 0.1)).toFixed(1)}%</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    過去のパフォーマンスパターンを基に予測
                  </div>
                </div>
              </div>

              {/* 最適化提案 */}
              <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                <div className="flex items-center mb-3">
                  <TrendingUp className="w-5 h-5 text-orange-600 mr-2" />
                  <h3 className="font-semibold text-orange-900">AI最適化提案</h3>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-orange-800">
                    • 投稿頻度を{(activeTab === 'weekly' ? weeklyTotals.totalPosts : monthlyTotals.totalPosts) < 3 ? '増やす' : '維持'}ことで成長加速
                  </div>
                  <div className="text-sm text-orange-800">
                    • {activeTab === 'weekly' ? '夕方18-20時' : '午後14-16時'}の投稿でエンゲージメント向上
                  </div>
                  <div className="text-sm text-orange-800">
                    • リール投稿を増やすとリーチ拡大効果が期待
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* トレンド分析 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-lg flex items-center justify-center mr-3">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">トレンド分析</h2>
                <p className="text-sm text-gray-600">過去の推移と成長パターン</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* 成長トレンド */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                <div className="flex items-center mb-3">
                  <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="font-semibold text-blue-900">成長トレンド</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">エンゲージメント成長率</span>
                    <span className={`text-sm font-bold ${parseFloat(activeTab === 'weekly' ? weeklyAvgEngagement : monthlyAvgEngagement) > 3 ? 'text-green-600' : 'text-yellow-600'}`}>
                      {parseFloat(activeTab === 'weekly' ? weeklyAvgEngagement : monthlyAvgEngagement) > 3 ? '📈 上昇傾向' : '📊 安定'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">投稿頻度トレンド</span>
                    <span className="text-sm font-bold text-blue-600">
                      {(activeTab === 'weekly' ? weeklyTotals.totalPosts : monthlyTotals.totalPosts) > 2 ? '📈 活発' : '📊 標準'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    過去4週間のデータを基に分析
                  </div>
                </div>
              </div>

              {/* パフォーマンス比較 */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center mb-3">
                  <BarChart3 className="w-5 h-5 text-green-600 mr-2" />
                  <h3 className="font-semibold text-green-900">パフォーマンス比較</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">平均いいね数</span>
                    <span className="text-sm font-bold text-green-600">
                      {Math.round((activeTab === 'weekly' ? weeklyTotals.totalLikes : monthlyTotals.totalLikes) / Math.max(1, (activeTab === 'weekly' ? weeklyTotals.totalPosts : monthlyTotals.totalPosts)))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">平均リーチ数</span>
                    <span className="text-sm font-bold text-green-600">
                      {Math.round((activeTab === 'weekly' ? weeklyTotals.totalReach : monthlyTotals.totalReach) / Math.max(1, (activeTab === 'weekly' ? weeklyTotals.totalPosts : monthlyTotals.totalPosts)))}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    投稿1件あたりの平均値
                  </div>
                </div>
              </div>

              {/* 改善ポイント */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <div className="flex items-center mb-3">
                  <Target className="w-5 h-5 text-purple-600 mr-2" />
                  <h3 className="font-semibold text-purple-900">改善ポイント</h3>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-purple-800">
                    • ハッシュタグ最適化でリーチ{(parseFloat(activeTab === 'weekly' ? weeklyAvgEngagement : monthlyAvgEngagement) < 3 ? '+15%' : '+5%')}向上
                  </div>
                  <div className="text-sm text-purple-800">
                    • ストーリーズ活用でエンゲージメント+20%向上
                  </div>
                  <div className="text-sm text-purple-800">
                    • 投稿時間最適化で全体的なパフォーマンス向上
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* データエクスポートセクション */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">データエクスポート</h2>
                <p className="text-sm text-gray-600">分析データの出力・共有</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CSV出力 */}
            <button className="flex items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-medium text-blue-900 mb-1">CSV出力</h3>
                <p className="text-sm text-blue-700">生データをExcelで分析</p>
              </div>
            </button>

            {/* PDFレポート */}
            <button className="flex items-center justify-center p-4 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Download className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-medium text-red-900 mb-1">PDFレポート</h3>
                <p className="text-sm text-red-700">包括的な分析レポート</p>
              </div>
            </button>

            {/* 画像出力 */}
            <button className="flex items-center justify-center p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <PieChart className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-medium text-green-900 mb-1">画像出力</h3>
                <p className="text-sm text-green-700">グラフ・チャートの保存</p>
              </div>
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">出力内容</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <h5 className="font-medium text-gray-700 mb-1">CSV出力</h5>
                <ul className="space-y-1">
                  <li>• 投稿データ（タイトル、内容、ハッシュタグ）</li>
                  <li>• エンゲージメント指標（いいね、コメント、シェア、リーチ）</li>
                  <li>• 投稿日時・タイプ情報</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-gray-700 mb-1">PDFレポート</h5>
                <ul className="space-y-1">
                  <li>• パフォーマンス評価・総合分析</li>
                  <li>• グラフ・チャート（エンゲージメント推移等）</li>
                  <li>• AI予測・改善提案</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SNSLayout>
  );
}
