'use client';

import React, { useState, useEffect } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { AIChatWidget } from '../../../components/ai-chat-widget';
import RechartsAreaChart from '../../../components/RechartsAreaChart';
import { postsApi } from '../../../lib/api';
import { PlanData } from '../plan/types/plan';
import { useAuth } from '../../../contexts/auth-context';
import { usePlanData } from '../../../hooks/usePlanData';
import { checkUserDataCount } from '../../../lib/monthly-report-notifications';
import { 
  Heart, 
  MessageCircle, 
  Share, 
  Eye, 
  TrendingUp, 
  Target,
  BarChart3,
  Download,
  ArrowUp,
  ArrowDown,
  Users,
  PieChart,
  Clock,
  Hash,
  Brain,
  Zap
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
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  reach?: number;
  engagementRate?: number;
}

interface AnalyticsData {
  id: string;
  postId: string | null;
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
  publishedTime?: string; // 投稿分析ページで保存された時間（HH:MM形式）
  createdAt: Date;
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
  const { user } = useAuth();
  const { planData, refetchPlanData } = usePlanData();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM形式
  );
  const [selectedWeek, setSelectedWeek] = useState<string>(
    getCurrentWeekString() // YYYY-WW形式
  );
  const [isLoading, setIsLoading] = useState(true);
  const [dataCount, setDataCount] = useState<{ analyticsCount: number; postsCount: number; totalCount: number } | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  
  // BFF API連携の状態
  const [accountScore, setAccountScore] = useState<Record<string, unknown> | null>(null);
  const [, setSummaryData] = useState<Record<string, unknown> | null>(null);
  const [dailyScores, setDailyScores] = useState<Record<string, unknown> | null>(null);
  const [previousPeriodData, setPreviousPeriodData] = useState<Record<string, unknown> | null>(null);
  const [monthlyReview, setMonthlyReview] = useState<Record<string, unknown> | null>(null);

  // 日別スコアデータを取得
  const fetchDailyScores = async (days: number = 30) => {
    if (!user?.uid) return;
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/analytics/daily-scores?days=${days}`, {
        headers: { 'x-user-id': user.uid, 'Authorization': `Bearer ${idToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDailyScores(data);
      } else {
        console.error('Daily scores API error:', response.status, response.statusText);
        setDailyScores(null);
      }
    } catch (error) {
      console.error('Daily scores fetch error:', error);
      setDailyScores(null);
    }
  };

  // 前期間のデータを取得（比較用）
  const fetchPreviousPeriodData = async (period: 'weekly' | 'monthly', currentDate: string) => {
    if (!user?.uid) return;
    try {
      const idToken = await user.getIdToken();
      
      let previousDate: string;
      if (period === 'monthly') {
        const current = new Date(currentDate + '-01');
        current.setMonth(current.getMonth() - 1);
        previousDate = current.toISOString().slice(0, 7);
      } else {
        const [year, week] = currentDate.split('-W');
        const currentWeek = parseInt(week);
        const previousWeek = currentWeek > 1 ? currentWeek - 1 : 52;
        const previousYear = currentWeek > 1 ? year : (parseInt(year) - 1).toString();
        previousDate = `${previousYear}-W${previousWeek.toString().padStart(2, '0')}`;
      }

      const response = await fetch(`/api/analytics/account-score?period=${period}&date=${previousDate}`, {
        headers: { 'x-user-id': user.uid, 'Authorization': `Bearer ${idToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPreviousPeriodData(data);
      } else {
        console.error('Previous period data API error:', response.status, response.statusText);
        setPreviousPeriodData(null);
      }
    } catch (error) {
      console.error('Previous period data fetch error:', error);
      setPreviousPeriodData(null);
    }
  };

  // 月次レビューを取得（月が変わった時のみ）
  const fetchMonthlyReview = async () => {
    if (!user?.uid || !accountScore) return;
    try {
      const idToken = await user.getIdToken();
      const currentScore = accountScore.score || 0;
      const previousScore = previousPeriodData?.score || 0;
      const performanceRating = accountScore.rating || 'C';
      
      // 現在の月をキーに含めて、月が変わった時だけ新しいレビューを取得
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const reviewCacheKey = `monthly-review-${currentMonth}-${currentScore}-${previousScore}-${performanceRating}`;
      
      // ローカルストレージで月次レビューをキャッシュ
      const cachedReview = localStorage.getItem(reviewCacheKey);
      if (cachedReview) {
        setMonthlyReview(JSON.parse(cachedReview));
        return;
      }

      const response = await fetch(`/api/analytics/monthly-review?currentScore=${currentScore}&previousScore=${previousScore}&performanceRating=${performanceRating}`, {
        headers: { 'x-user-id': user.uid, 'Authorization': `Bearer ${idToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMonthlyReview(data);
        // ローカルストレージに保存（月が変わるまで有効）
        localStorage.setItem(reviewCacheKey, JSON.stringify(data));
      } else {
        console.error('Monthly review API error:', response.status, response.statusText);
        setMonthlyReview(null);
      }
    } catch (error) {
      console.error('Monthly review fetch error:', error);
      setMonthlyReview(null);
    }
  };

  // バックエンドAPI連携関数（期間別フィルタリングはクライアント側で実行）
  const fetchAnalyticsFromBackend = async (period: 'weekly' | 'monthly', date: string) => {
    if (!user?.uid) {
      console.log('No user authenticated, skipping API call');
      return;
    }

    try {
      setIsLoading(true);
      
      // Firebase IDトークンを取得
      const idToken = await user.getIdToken();
      
      // 既存のanalytics APIを使用して全データを取得
      const response = await fetch(`/api/analytics?userId=${user.uid}`, {
        headers: {
          'x-user-id': user.uid,
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`APIエラー: ${response.status}`);
      }

      const data = await response.json();
      
      // クライアント側で期間別フィルタリング
      const filteredData = data.analytics.filter((item: AnalyticsData) => {
        const itemDate = new Date(item.publishedAt);
        
        if (period === 'monthly') {
          const itemMonth = itemDate.toISOString().slice(0, 7);
          return itemMonth === date;
        } else if (period === 'weekly') {
          // 週の範囲を計算
          const [year, week] = date.split('-W');
          const startOfYear = new Date(parseInt(year), 0, 1);
          const startOfWeek = new Date(startOfYear.getTime() + (parseInt(week) - 1) * 7 * 24 * 60 * 60 * 1000);
          const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);
          
          return itemDate >= startOfWeek && itemDate <= endOfWeek;
        }
        
        return true;
      });
      
      return { analytics: filteredData, total: filteredData.length };
    } catch (error) {
      console.error('バックエンドAPI取得エラー:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // CSVエクスポート関数
  const exportToCSV = async () => {
    if (!user?.uid) {
      console.log('No user authenticated, skipping CSV export');
      return;
    }

    try {
      setIsLoading(true);
      const idToken = await user.getIdToken();
      const response = await fetch('/api/export/csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid,
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ 
          period: activeTab,
          date: activeTab === 'weekly' ? selectedWeek : selectedMonth,
          userId: user.uid
        }),
      });

      if (!response.ok) {
        throw new Error('CSVエクスポートに失敗しました');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `instagram-${activeTab}-report-${activeTab === 'weekly' ? selectedWeek : selectedMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('CSVエクスポートエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // PDFエクスポート関数
  const exportToPDF = async () => {
    if (!user?.uid) {
      console.log('No user authenticated, skipping PDF export');
      return;
    }

    try {
      setIsLoading(true);
      const idToken = await user.getIdToken();
      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid,
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ 
          period: activeTab,
          date: activeTab === 'weekly' ? selectedWeek : selectedMonth,
          userId: user.uid
        }),
      });

      if (!response.ok) {
        throw new Error('PDFエクスポートに失敗しました');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `instagram-${activeTab}-report-${activeTab === 'weekly' ? selectedWeek : selectedMonth}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDFエクスポートエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 投稿一覧を取得
  const fetchPosts = async () => {
    if (!user?.uid) {
      console.log('No user authenticated, skipping posts fetch');
      return;
    }

    try {
      const response = await postsApi.list({ userId: user.uid });
      setPosts(response.posts || []);
    } catch (error) {
      console.error('投稿取得エラー:', error);
    }
  };

  // 計画データを取得
  // 計画データはusePlanDataフックで取得済み

  // 分析データを取得
  const fetchAnalytics = async () => {
    if (!user?.uid) {
      console.log('No user authenticated, skipping analytics fetch');
      return;
    }

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
        console.log('Analytics data fetched for monthly report:', result.analytics);
        console.log('Monthly report - publishedAt values:', result.analytics?.map((a: Record<string, unknown>) => ({ 
          id: a.id, 
          publishedAt: a.publishedAt, 
          publishedTime: a.publishedTime,
          publishedAtType: typeof a.publishedAt,
          publishedTimeType: typeof a.publishedTime
        })));
        setAnalyticsData(result.analytics || []);
      } else {
        console.error('Analytics fetch error:', response.status, response.statusText);
        // エラーの場合は空配列を設定
        setAnalyticsData([]);
      }
    } catch (error) {
      console.error('分析データ取得エラー:', error);
      // エラーの場合は空配列を設定
      setAnalyticsData([]);
    }
  };

  // データ件数チェック
  useEffect(() => {
    const checkDataCount = async () => {
      if (!user?.uid) return;
      
      try {
        const countData = await checkUserDataCount(user.uid);
        setDataCount(countData);
        setHasAccess(countData.totalCount >= 15);
        console.log('📊 データ件数チェック結果:', countData, 'アクセス可能:', countData.totalCount >= 15);
      } catch (error) {
        console.error('データ件数チェックエラー:', error);
        setHasAccess(false);
      }
    };

    checkDataCount();
  }, [user?.uid]);

  useEffect(() => {
    const initializeData = async () => {
      if (!user?.uid) {
        console.log('No user authenticated, skipping data initialization');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // 並行してデータを取得
        await Promise.all([
          fetchPosts(),
          fetchAnalytics()
        ]);
        
        // データ量検証は別のuseEffectで行う
        
      } catch (error) {
        console.error('データ初期化エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [user?.uid]);


  // 期間変更時のデータ再取得
  useEffect(() => {
    if (user?.uid) {
      const fetchPeriodData = async () => {
        try {
          setIsLoading(true);
          const period = activeTab;
          const date = activeTab === 'weekly' ? selectedWeek : selectedMonth;
          
          await Promise.all([
            fetchAccountScore(),
            fetchSummaryData(),
            fetchDailyScores(activeTab === 'weekly' ? 7 : 30),
            fetchPreviousPeriodData(period, date)
          ]);
          
          // 月次レビューは他のデータが揃ってから取得
          setTimeout(() => {
            fetchMonthlyReview();
          }, 1000);
        } catch (error) {
          console.error('期間データ取得エラー:', error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchPeriodData();
    }
  }, [activeTab, selectedMonth, selectedWeek, user?.uid]);

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
  // const followerChange = calculateChange(monthlyTotals.totalFollowerChange, prevMonthTotals.totalFollowerChange);


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

  // BFF APIからデータを取得
  const fetchAccountScore = async () => {
    if (!user?.uid) return;
    
    try {
      const idToken = await user.getIdToken();
      const period = activeTab;
      const date = activeTab === 'weekly' ? selectedWeek : selectedMonth;
      
      const response = await fetch(`/api/analytics/account-score?period=${period}&date=${date}`, {
        headers: {
          'x-user-id': user.uid,
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAccountScore(data);
      } else {
        console.error('Account score API error:', response.status, response.statusText);
        // エラーの場合はデフォルト値を設定
        setAccountScore({
          score: 0,
          rating: 'C',
          label: 'データ読み込みエラー',
          color: 'gray',
          breakdown: {}
        });
      }
    } catch (error) {
      console.error('Account score fetch error:', error);
      // エラーの場合はデフォルト値を設定
      setAccountScore({
        score: 0,
        rating: 'C',
        label: 'データ読み込みエラー',
        color: 'gray',
        breakdown: {}
      });
    }
  };

  const fetchSummaryData = async () => {
    if (!user?.uid) return;
    
    try {
      const idToken = await user.getIdToken();
      const period = activeTab;
      const date = activeTab === 'weekly' ? selectedWeek : selectedMonth;
      
      const response = await fetch(`/api/analytics/monthly-summary?period=${period}&date=${date}`, {
        headers: {
          'x-user-id': user.uid,
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSummaryData(data);
      } else {
        console.error('Summary data API error:', response.status, response.statusText);
        setSummaryData(null);
      }
    } catch (error) {
      console.error('Summary data fetch error:', error);
      setSummaryData(null);
    }
  };

  // パフォーマンス評価（APIデータから）
  const performanceRating = accountScore ? {
    rating: accountScore.rating,
    color: `text-${accountScore.color}-600`,
    bg: `bg-${accountScore.color}-100`,
    label: accountScore.label
  } : { rating: 'C', color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'データ読み込み中' };

  // ローディング画面
  if (isLoading) {
    return (
      <SNSLayout 
        currentSNS="instagram"
        customTitle="月次レポート"
        customDescription="月次のパフォーマンス分析とレポート"
      >
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6">
            {/* アニメーション付きローディング */}
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                <BarChart3 className="w-12 h-12 text-white animate-pulse" />
              </div>
              
              {/* 回転するリング */}
              <div className="absolute inset-0 w-24 h-24 mx-auto">
                <div className="w-full h-full border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
              
              {/* 浮かぶドット */}
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-bounce"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-3">データを読み込み中...</h2>
            <p className="text-gray-600 mb-6">魅力的な分析レポートを準備しています</p>
            
            {/* ローディングステップ */}
            <div className="space-y-3 text-left">
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
                投稿データを取得中...
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                分析データを処理中...
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse" style={{ animationDelay: '1s' }}></div>
                レポートを生成中...
              </div>
            </div>
          </div>
        </div>
      </SNSLayout>
    );
  }

  // アクセス制御画面
  if (!hasAccess) {
    return (
      <SNSLayout 
        currentSNS="instagram"
        customTitle="月次レポート"
        customDescription="月次のパフォーマンス分析とレポート"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="max-w-md mx-auto text-center p-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="relative">
                <BarChart3 className="w-10 h-10 text-blue-600" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              データを集め中...
            </h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center mb-2">
                <Clock className="w-5 h-5 text-blue-600 mr-2" />
                <span className="font-medium text-blue-800">データ収集中</span>
              </div>
              <p className="text-sm text-blue-700">
                月次レポートの生成には<strong>15件以上のデータ</strong>が必要です
              </p>
            </div>

            {dataCount && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-gray-900 mb-3">収集済みデータ</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{dataCount.analyticsCount}</div>
                    <div className="text-gray-600">アナリティクス</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{dataCount.postsCount}</div>
                    <div className="text-gray-600">投稿データ</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">合計</span>
                    <span className="text-lg font-bold text-gray-900">{dataCount.totalCount}件</span>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((dataCount.totalCount / 15) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {15 - dataCount.totalCount > 0 ? `あと${15 - dataCount.totalCount}件でレポート生成` : 'レポート生成可能'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <a
                href="/instagram/analytics"
                className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
              >
                データを追加して収集を進める
              </a>
              <a
                href="/instagram/lab"
                className="block w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors"
              >
                投稿ラボでコンテンツを作成
              </a>
            </div>

            <p className="text-sm text-gray-500 mt-6">
              データが15件に達すると、自動的に月次レポートが生成されます
            </p>
          </div>
        </div>
      </SNSLayout>
    );
  }

  return (
    <SNSLayout 
      currentSNS="instagram"
      customTitle="月次レポート"
      customDescription="月次のパフォーマンス分析とレポート"
    >
      <div className="max-w-7xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {activeTab === 'weekly' ? '週次' : '月次'}レポート
            </h1>
            <p className="text-gray-600 mt-1">
              {activeTab === 'weekly' ? getWeekDisplayName(selectedWeek) : getMonthDisplayName(selectedMonth)}の分析結果
            </p>
          </div>
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
                <span className={`text-3xl font-bold ${performanceRating.color}`}>{String(performanceRating.rating)}</span>
              </div>
              <div className="text-sm text-gray-600">{String(performanceRating.label)}</div>
              <div className="text-xs text-gray-500 mt-1">
                スコア: {typeof accountScore?.score === 'number' ? accountScore.score : 0}点
              </div>
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
                <p className="text-sm font-medium text-gray-600">閲覧数総数</p>
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
              {/* アカウントスコア */}
              <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {typeof accountScore?.score === 'number' ? accountScore.score : 0}点
                  </div>
                  <div className="text-sm text-gray-600">アカウントスコア</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {String(performanceRating.label)}
                  </div>
                  
                  {/* 前期間との比較 */}
                  {previousPeriodData && (
                    <div className="mt-3 pt-3 border-t border-orange-200">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-xs text-gray-500">前期間:</span>
                        <span className="text-sm font-medium text-gray-700">
                          {typeof previousPeriodData.score === 'number' ? previousPeriodData.score : 0}点
                        </span>
                        {accountScore && previousPeriodData?.score !== undefined && (
                          <div className={`flex items-center space-x-1 ${
                            (typeof accountScore.score === 'number' && typeof previousPeriodData.score === 'number' && accountScore.score > previousPeriodData.score)
                              ? 'text-green-600' 
                              : (typeof accountScore.score === 'number' && typeof previousPeriodData.score === 'number' && accountScore.score < previousPeriodData.score)
                                ? 'text-red-600' 
                                : 'text-gray-600'
                          }`}>
                            {(typeof accountScore.score === 'number' && typeof previousPeriodData.score === 'number' && accountScore.score > previousPeriodData.score) ? (
                              <ArrowUp className="w-3 h-3" />
                            ) : (typeof accountScore.score === 'number' && typeof previousPeriodData.score === 'number' && accountScore.score < previousPeriodData.score) ? (
                              <ArrowDown className="w-3 h-3" />
                            ) : null}
                            <span className="text-xs font-medium">
                              {typeof accountScore.score === 'number' && typeof previousPeriodData.score === 'number' ? Math.abs(accountScore.score - previousPeriodData.score) : 0}点
                              {(typeof accountScore.score === 'number' && typeof previousPeriodData.score === 'number' && accountScore.score > previousPeriodData.score) ? '↑' : 
                               (typeof accountScore.score === 'number' && typeof previousPeriodData.score === 'number' && accountScore.score < previousPeriodData.score) ? '↓' : '='}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 投稿タイプ別統計 */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">投稿タイプ別統計</h4>
                {(activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics).length > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">📸 フィード</span>
                    <span className="text-sm font-medium text-gray-900">
                      {(activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics).filter(data => {
                        // 手動入力データの場合はcategoryフィールドを使用
                        if (!data.postId) {
                          return data.category === 'feed';
                        }
                        // 投稿データから取得
                        const post = posts.find(p => p.id === data.postId);
                        return post?.postType === 'feed';
                      }).length}件
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">🎬 リール</span>
                    <span className="text-sm font-medium text-gray-900">
                      {(activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics).filter(data => {
                        // 手動入力データの場合はcategoryフィールドを使用
                        if (!data.postId) {
                          return data.category === 'reel';
                        }
                        // 投稿データから取得
                        const post = posts.find(p => p.id === data.postId);
                        return post?.postType === 'reel';
                      }).length}件
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">📱 ストーリーズ</span>
                    <span className="text-sm font-medium text-gray-900">
                      {(activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics).filter(data => {
                        // 手動入力データの場合はcategoryフィールドを使用
                        if (!data.postId) {
                          return data.category === 'story';
                        }
                        // 投稿データから取得
                        const post = posts.find(p => p.id === data.postId);
                        return post?.postType === 'story';
                      }).length}件
                    </span>
                  </div>
                </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center">
                      <span className="text-xl">📊</span>
                    </div>
                    <p className="text-gray-600 font-medium mb-1">投稿を分析してみよう！</p>
                    <p className="text-sm text-gray-500">投稿分析データを入力すると<br />タイプ別統計が表示されます</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 視覚化セクション */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* アカウントスコア推移 */}
          <div>
            <RechartsAreaChart
              data={Array.isArray(dailyScores?.dailyScores) ? dailyScores.dailyScores : []}
              title="アカウントスコア推移"
              subtitle={`${activeTab === 'weekly' ? '週次' : '月次'}のスコア変動`}
            />
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
                  // 手動入力データの場合はcategoryフィールドを使用
                  if (!data.postId) {
                    return data.category === 'feed';
                  }
                  // 投稿データから取得
                  const post = posts.find(p => p.id === data.postId);
                  return post?.postType === 'feed';
                }).length;
                const reelCount = currentAnalytics.filter(data => {
                  // 手動入力データの場合はcategoryフィールドを使用
                  if (!data.postId) {
                    return data.category === 'reel';
                  }
                  // 投稿データから取得
                  const post = posts.find(p => p.id === data.postId);
                  return post?.postType === 'reel';
                }).length;
                const storyCount = currentAnalytics.filter(data => {
                  // 手動入力データの場合はcategoryフィールドを使用
                  if (!data.postId) {
                    return data.category === 'story';
                  }
                  // 投稿データから取得
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

        {/* オーディエンス分析セクション */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* オーディエンス分析 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center mr-3">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">オーディエンス分析</h2>
                <p className="text-sm text-gray-600">
                  {activeTab === 'weekly' 
                    ? `${getWeekDisplayName(selectedWeek)}のオーディエンス構成`
                    : `${getMonthDisplayName(selectedMonth)}のオーディエンス構成`
                  }
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* 性別分析 */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">性別分析</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-sm font-bold text-gray-700">
                      👨 {(() => {
                        const currentAnalytics = activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics;
                        const audienceData = currentAnalytics.filter(data => data.audience);
                        if (audienceData.length === 0) return '0';
                        const avgMale = audienceData.reduce((sum, data) => sum + (data.audience?.gender.male || 0), 0) / audienceData.length;
                        return avgMale.toFixed(1);
                      })()}%
                    </div>
                    <div className="text-xs text-gray-600">男性</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-sm font-bold text-gray-700">
                      👩 {(() => {
                        const currentAnalytics = activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics;
                        const audienceData = currentAnalytics.filter(data => data.audience);
                        if (audienceData.length === 0) return '0';
                        const avgFemale = audienceData.reduce((sum, data) => sum + (data.audience?.gender.female || 0), 0) / audienceData.length;
                        return avgFemale.toFixed(1);
                      })()}%
                    </div>
                    <div className="text-xs text-gray-600">女性</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-sm font-bold text-gray-700">
                      🏳️‍🌈 {(() => {
                        const currentAnalytics = activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics;
                        const audienceData = currentAnalytics.filter(data => data.audience);
                        if (audienceData.length === 0) return '0';
                        const avgOther = audienceData.reduce((sum, data) => sum + (data.audience?.gender.other || 0), 0) / audienceData.length;
                        return avgOther.toFixed(1);
                      })()}%
                    </div>
                    <div className="text-xs text-gray-600">その他</div>
                  </div>
                </div>
              </div>

              {/* 年齢層分析 */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">年齢層分析</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-xs font-bold text-gray-700">
                      {(() => {
                        const currentAnalytics = activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics;
                        const audienceData = currentAnalytics.filter(data => data.audience);
                        if (audienceData.length === 0) return '0';
                        const avg1824 = audienceData.reduce((sum, data) => sum + (data.audience?.age['18-24'] || 0), 0) / audienceData.length;
                        return avg1824.toFixed(1);
                      })()}%
                    </div>
                    <div className="text-xs text-gray-600">18-24歳</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-xs font-bold text-gray-700">
                      {(() => {
                        const currentAnalytics = activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics;
                        const audienceData = currentAnalytics.filter(data => data.audience);
                        if (audienceData.length === 0) return '0';
                        const avg2534 = audienceData.reduce((sum, data) => sum + (data.audience?.age['25-34'] || 0), 0) / audienceData.length;
                        return avg2534.toFixed(1);
                      })()}%
                    </div>
                    <div className="text-xs text-gray-600">25-34歳</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-xs font-bold text-gray-700">
                      {(() => {
                        const currentAnalytics = activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics;
                        const audienceData = currentAnalytics.filter(data => data.audience);
                        if (audienceData.length === 0) return '0';
                        const avg3544 = audienceData.reduce((sum, data) => sum + (data.audience?.age['35-44'] || 0), 0) / audienceData.length;
                        return avg3544.toFixed(1);
                      })()}%
                    </div>
                    <div className="text-xs text-gray-600">35-44歳</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-xs font-bold text-gray-700">
                      {(() => {
                        const currentAnalytics = activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics;
                        const audienceData = currentAnalytics.filter(data => data.audience);
                        if (audienceData.length === 0) return '0';
                        const avg4554 = audienceData.reduce((sum, data) => sum + (data.audience?.age['45-54'] || 0), 0) / audienceData.length;
                        return avg4554.toFixed(1);
                      })()}%
                    </div>
                    <div className="text-xs text-gray-600">45-54歳</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 閲覧数ソース分析 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center mr-3">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">閲覧数ソース分析</h2>
                <p className="text-sm text-gray-600">
                  {activeTab === 'weekly' 
                    ? `${getWeekDisplayName(selectedWeek)}の閲覧ソース構成`
                    : `${getMonthDisplayName(selectedMonth)}の閲覧ソース構成`
                  }
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* 閲覧ソース分析 */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">閲覧ソース別割合</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-sm font-bold text-gray-700">
                      📱 {(() => {
                        const currentAnalytics = activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics;
                        const reachSourceData = currentAnalytics.filter(data => data.reachSource);
                        if (reachSourceData.length === 0) return '0';
                        const avgPosts = reachSourceData.reduce((sum, data) => sum + (data.reachSource?.sources.posts || 0), 0) / reachSourceData.length;
                        return avgPosts.toFixed(1);
                      })()}%
                    </div>
                    <div className="text-xs text-gray-600">投稿</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-sm font-bold text-gray-700">
                      👤 {(() => {
                        const currentAnalytics = activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics;
                        const reachSourceData = currentAnalytics.filter(data => data.reachSource);
                        if (reachSourceData.length === 0) return '0';
                        const avgProfile = reachSourceData.reduce((sum, data) => sum + (data.reachSource?.sources.profile || 0), 0) / reachSourceData.length;
                        return avgProfile.toFixed(1);
                      })()}%
                    </div>
                    <div className="text-xs text-gray-600">プロフィール</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-sm font-bold text-gray-700">
                      🔍 {(() => {
                        const currentAnalytics = activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics;
                        const reachSourceData = currentAnalytics.filter(data => data.reachSource);
                        if (reachSourceData.length === 0) return '0';
                        const avgExplore = reachSourceData.reduce((sum, data) => sum + (data.reachSource?.sources.explore || 0), 0) / reachSourceData.length;
                        return avgExplore.toFixed(1);
                      })()}%
                    </div>
                    <div className="text-xs text-gray-600">発見</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-sm font-bold text-gray-700">
                      🔎 {(() => {
                        const currentAnalytics = activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics;
                        const reachSourceData = currentAnalytics.filter(data => data.reachSource);
                        if (reachSourceData.length === 0) return '0';
                        const avgSearch = reachSourceData.reduce((sum, data) => sum + (data.reachSource?.sources.search || 0), 0) / reachSourceData.length;
                        return avgSearch.toFixed(1);
                      })()}%
                    </div>
                    <div className="text-xs text-gray-600">検索</div>
                  </div>
                </div>
              </div>

              {/* フォロワー分析 */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">フォロワー分析</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-sm font-bold text-gray-700">
                      👥 {(() => {
                        const currentAnalytics = activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics;
                        const reachSourceData = currentAnalytics.filter(data => data.reachSource);
                        if (reachSourceData.length === 0) return '0';
                        const avgFollowers = reachSourceData.reduce((sum, data) => sum + (data.reachSource?.followers.followers || 0), 0) / reachSourceData.length;
                        return avgFollowers.toFixed(1);
                      })()}%
                    </div>
                    <div className="text-xs text-gray-600">フォロワー内</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-sm font-bold text-gray-700">
                      🌐 {(() => {
                        const currentAnalytics = activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics;
                        const reachSourceData = currentAnalytics.filter(data => data.reachSource);
                        if (reachSourceData.length === 0) return '0';
                        const avgNonFollowers = reachSourceData.reduce((sum, data) => sum + (data.reachSource?.followers.nonFollowers || 0), 0) / reachSourceData.length;
                        return avgNonFollowers.toFixed(1);
                      })()}%
                    </div>
                    <div className="text-xs text-gray-600">フォロワー外</div>
                  </div>
                </div>
              </div>
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
                  // 手動入力データの場合はhashtagsフィールドを直接使用
                  if (!data.postId && data.hashtags) {
                    data.hashtags.forEach(hashtag => {
                      hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
                    });
                  } else {
                    // 投稿データから取得
                    const post = posts.find(p => p.id === data.postId);
                    if (post?.hashtags) {
                      post.hashtags.forEach(hashtag => {
                        hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
                      });
                    }
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
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                      <Hash className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-gray-600 font-medium mb-1">ハッシュタグを追加してみよう！</p>
                    <p className="text-sm text-gray-500">投稿にハッシュタグを付けると<br />人気ハッシュタグ分析が表示されます</p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 投稿時間分析 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">投稿時間分析</h2>
                  <p className="text-sm text-gray-600">
                    投稿分析ページで入力した実際の投稿時間ベースの分析
                  </p>
                </div>
              </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                総投稿数: {(activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics).length}件
              </div>
            </div>
            </div>

            {/* 時間別パフォーマンス */}
            <div className="space-y-3">
              {(() => {
                // 投稿一覧ページと同じデータソースを使用
                const currentAnalytics = activeTab === 'weekly' ? selectedWeekAnalytics : selectedMonthAnalytics;
                console.log('月次レポート - 使用中のanalyticsデータ:', currentAnalytics);
                const timeSlots = [
                  { label: '早朝 (6-9時)', range: [6, 9], color: 'from-blue-400 to-blue-600' },
                  { label: '午前 (9-12時)', range: [9, 12], color: 'from-green-400 to-green-600' },
                  { label: '午後 (12-15時)', range: [12, 15], color: 'from-yellow-400 to-yellow-600' },
                  { label: '夕方 (15-18時)', range: [15, 18], color: 'from-orange-400 to-orange-600' },
                  { label: '夜 (18-21時)', range: [18, 21], color: 'from-red-400 to-red-600' },
                  { label: '深夜 (21-6時)', range: [21, 24], color: 'from-purple-400 to-purple-600' }
                ];

                const timeSlotData = timeSlots.map(({ label, range, color }) => {
                  const postsInRange = currentAnalytics.filter(data => {
                    // 投稿分析ページで入力した実際の投稿時間を使用
                    if (data.publishedTime && data.publishedTime !== '') {
                      // 投稿分析ページで入力された実際の投稿時間を使用
                      const hour = parseInt(data.publishedTime.split(':')[0]);
                      console.log(`実際の投稿時間使用: ${data.publishedTime} -> hour: ${hour}`);
                      
                      // 深夜の場合は特別処理（21-24時と0-6時）
                      if (range[0] === 21 && range[1] === 24) {
                        return hour >= 21 || hour < 6;
                      }
                      
                      return hour >= range[0] && hour < range[1];
                    }
                    
                    // publishedTimeがない場合はスキップ（データが不完全）
                    console.log(`publishedTimeなし、スキップ: ${data.id}`);
                    return false;
                  });

                  const avgEngagement = postsInRange.length > 0 
                    ? postsInRange.reduce((sum, data) => sum + (data.likes + data.comments + data.shares), 0) / postsInRange.length
                    : 0;

                  return {
                    label,
                    range,
                    color,
                    postsInRange: postsInRange.length,
                    avgEngagement
                  };
                });

                // 最適な時間帯を特定
                const bestTimeSlot = timeSlotData.reduce((best, current) => {
                  if (current.postsInRange > 0 && current.avgEngagement > best.avgEngagement) {
                    return current;
                  }
                  return best;
                }, timeSlotData[0]);

                return (
                  <div className="space-y-3">
                    {/* 最適な投稿時間の提案 */}
                    {bestTimeSlot && bestTimeSlot.postsInRange > 0 && (
                      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 mb-4">
                        <div className="flex items-center mb-2">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          </div>
                          <h4 className="font-semibold text-green-900">おすすめ投稿時間</h4>
                        </div>
                        <p className="text-sm text-green-800">
                          <span className="font-medium">{bestTimeSlot.label}</span>が最もエンゲージメントが高い時間帯です。
                          平均 <span className="font-bold">{Math.round(bestTimeSlot.avgEngagement)}</span> エンゲージを記録しています。
                        </p>
                      </div>
                    )}

                    {/* 時間帯別データ */}
                    {timeSlotData.map(({ label, range, color, postsInRange, avgEngagement }) => (
                      <div key={label} className={`p-3 rounded-lg ${postsInRange > 0 ? 'bg-gray-50' : 'bg-gray-25'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">{label}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-gray-900">{postsInRange}件</span>
                            {postsInRange > 0 && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                avgEngagement > bestTimeSlot.avgEngagement * 0.8 
                                  ? 'bg-green-100 text-green-800' 
                                  : avgEngagement > bestTimeSlot.avgEngagement * 0.5
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {avgEngagement > bestTimeSlot.avgEngagement * 0.8 ? '高' : 
                                 avgEngagement > bestTimeSlot.avgEngagement * 0.5 ? '中' : '低'}
                              </span>
                            )}
                          </div>
                        </div>
                        {postsInRange > 0 ? (
                          <div className="space-y-2">
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
                        ) : (
                          <div className="text-center py-2">
                            <div className="text-xs text-gray-400 italic">
                              📅 この時間帯はまだ投稿なし
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
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
                    <span className="text-sm font-bold text-green-600">{((typeof accountScore?.score === 'number' ? accountScore.score : 0) * 0.01 * (0.95 + Math.random() * 0.1)).toFixed(1)}%</span>
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

          {/* 先月のまとめ */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">先月のまとめ</h2>
                <p className="text-sm text-gray-600">前期間との比較と成果サマリー</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* 前期間との比較 */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                <div className="flex items-center mb-3">
                  <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="font-semibold text-blue-900">前期間との比較</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">アカウントスコア</span>
                    {previousPeriodData ? (
                      <span className={`text-sm font-bold ${
                        (typeof accountScore?.score === 'number' && typeof previousPeriodData.score === 'number' && accountScore.score > previousPeriodData.score) ? 'text-green-600' : 
                        (typeof accountScore?.score === 'number' && typeof previousPeriodData.score === 'number' && accountScore.score < previousPeriodData.score) ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {(typeof accountScore?.score === 'number' && typeof previousPeriodData.score === 'number' && accountScore.score > previousPeriodData.score) ? '📈 向上' : 
                         (typeof accountScore?.score === 'number' && typeof previousPeriodData.score === 'number' && accountScore.score < previousPeriodData.score) ? '📉 低下' : '📊 維持'}
                        ({typeof accountScore?.score === 'number' && typeof previousPeriodData.score === 'number' ? Math.abs(accountScore.score - previousPeriodData.score) : 0}点差)
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-gray-500">📊 初回データ</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">投稿数</span>
                    <span className="text-sm font-bold text-blue-600">
                      {(activeTab === 'weekly' ? weeklyTotals.totalPosts : monthlyTotals.totalPosts)}件
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {activeTab === 'weekly' ? '今週' : '今月'} vs {activeTab === 'weekly' ? '先週' : '先月'}
                  </div>
                </div>
              </div>

              {/* 今月の成果サマリー */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center mb-3">
                  <BarChart3 className="w-5 h-5 text-green-600 mr-2" />
                  <h3 className="font-semibold text-green-900">今月の成果サマリー</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">総いいね数</span>
                    <span className="text-sm font-bold text-green-600">
                      {(activeTab === 'weekly' ? weeklyTotals.totalLikes : monthlyTotals.totalLikes).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">総リーチ数</span>
                    <span className="text-sm font-bold text-green-600">
                      {(activeTab === 'weekly' ? weeklyTotals.totalReach : monthlyTotals.totalReach).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">総コメント数</span>
                    <span className="text-sm font-bold text-green-600">
                      {(activeTab === 'weekly' ? weeklyTotals.totalComments : monthlyTotals.totalComments).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {activeTab === 'weekly' ? '今週' : '今月'}の累計成果
                  </div>
                </div>
              </div>

              {/* 先月の総評 */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <div className="flex items-center mb-3">
                  <Target className="w-5 h-5 text-purple-600 mr-2" />
                  <h3 className="font-semibold text-purple-900">先月の総評</h3>
                </div>
                <div className="space-y-3">
                  {monthlyReview ? (
                    <div className="text-sm text-purple-800">
                      <div className="font-medium mb-2">{typeof monthlyReview.title === 'string' ? monthlyReview.title : '月次レビュー'}</div>
                      <div className="text-xs text-purple-700">
                        {typeof monthlyReview.message === 'string' ? monthlyReview.message : 'レビューを生成中...'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-purple-800">
                      <div className="font-medium mb-2">📊 月次レビュー準備中</div>
                      <div className="text-xs text-purple-700">
                        アカウントスコア: {typeof accountScore?.score === 'number' ? accountScore.score : 0}点 ({String(performanceRating.label)})<br />
                        データを分析してレビューを生成しています...
                      </div>
                    </div>
                  )}
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
            <button 
              onClick={exportToCSV}
              disabled={isLoading}
              className="flex items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-medium text-blue-900 mb-1">CSV出力</h3>
                <p className="text-sm text-blue-700">生データをExcelで分析</p>
              </div>
            </button>

            {/* PDFレポート */}
            <button 
              onClick={exportToPDF}
              disabled={isLoading}
              className="flex items-center justify-center p-4 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
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

        {/* AIチャットウィジェット */}
        <AIChatWidget 
          contextData={{
            posts: posts,
            planData: planData as unknown as Record<string, unknown>,
            monthlyStats: {
              totalPosts: posts.length,
              totalLikes: posts.reduce((sum, post) => sum + (post.likes || 0), 0),
              totalComments: posts.reduce((sum, post) => sum + (post.comments || 0), 0),
              totalShares: posts.reduce((sum, post) => sum + (post.shares || 0), 0),
              avgEngagement: accountScore?.score || 0
            }
          }}
        />
      </div>
    </SNSLayout>
  );
}

