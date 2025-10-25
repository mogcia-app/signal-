'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { useAuth } from '../../../contexts/auth-context';
import { usePlanData } from '../../../hooks/usePlanData';
import { CurrentPlanCard } from '../../../components/CurrentPlanCard';
import { checkUserDataCount } from '../../../lib/monthly-report-notifications';
import { BarChart3 } from 'lucide-react';

// コンポーネントのインポート
import { ReportHeader } from './components/ReportHeader';
import { PerformanceRating } from './components/PerformanceRating';
import { MetricsCards } from './components/MetricsCards';
import { DetailedStats } from './components/DetailedStats';
import { VisualizationSection } from './components/VisualizationSection';
import { AdvancedAnalysis } from './components/AdvancedAnalysis';
import { AIPredictionAnalysis } from './components/AIPredictionAnalysis';


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
  const { planData } = usePlanData('instagram');
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
  const [dailyScores, setDailyScores] = useState<Record<string, unknown> | null>(null);
  const [previousPeriodData, setPreviousPeriodData] = useState<Record<string, unknown> | null>(null);
  const [monthlyReview, setMonthlyReview] = useState<Record<string, unknown> | null>(null);
  
  // BFFサマリーデータ
  const [reportSummary, setReportSummary] = useState<{
    period: 'weekly' | 'monthly';
    date: string;
    totals: {
      totalLikes: number;
      totalComments: number;
      totalShares: number;
      totalReposts: number;
      totalReach: number;
      totalSaves: number;
      totalFollowerIncrease: number;
      avgEngagementRate: number;
      totalPosts: number;
    };
    previousTotals: {
      totalLikes: number;
      totalComments: number;
      totalShares: number;
      totalReposts: number;
      totalReach: number;
      totalSaves: number;
      totalFollowerIncrease: number;
      avgEngagementRate: number;
      totalPosts: number;
    };
    changes: {
      likesChange: number;
      commentsChange: number;
      sharesChange: number;
      repostsChange: number;
      reachChange: number;
      savesChange: number;
      followerChange: number;
      engagementRateChange: number;
      postsChange: number;
    };
    audienceAnalysis: {
      gender: { male: number; female: number; other: number };
      age: { '18-24': number; '25-34': number; '35-44': number; '45-54': number };
    };
    reachSourceAnalysis: {
      sources: { posts: number; profile: number; explore: number; search: number };
      followers: { followers: number; nonFollowers: number };
    };
    hashtagStats: { hashtag: string; count: number }[];
    timeSlotAnalysis: {
      label: string;
      range: number[];
      color: string;
      postsInRange: number;
      avgEngagement: number;
    }[];
    bestTimeSlot: {
      label: string;
      range: number[];
      color: string;
      postsInRange: number;
      avgEngagement: number;
    };
    postTypeStats: {
      type: string;
      count: number;
      label: string;
      color: string;
      bg: string;
      percentage: number;
    }[];
  } | null>(null);

  // BFFサマリーデータを取得
  const fetchReportSummary = useCallback(async (period: 'weekly' | 'monthly', date: string, signal?: AbortSignal) => {
    if (!user?.uid) return;
    
    try {
      const idToken = await user.getIdToken();
      
      // 週次と月次で異なるAPIエンドポイントを使用
      const apiEndpoint = period === 'weekly' 
        ? `/api/analytics/weekly-report-summary?userId=${user.uid}&week=${date}`
        : `/api/analytics/monthly-report-summary?userId=${user.uid}&period=${period}&date=${date}`;
      
      const response = await fetch(apiEndpoint, {
        headers: {
          'x-user-id': user.uid,
          'Authorization': `Bearer ${idToken}`
        },
        signal
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('📊 BFFサマリーデータ取得完了:', result.data);
        setReportSummary(result.data);
      } else {
        console.error('BFFサマリーデータ取得エラー:', response.status, response.statusText);
        setReportSummary(null);
      }
    } catch (error) {
      console.error('BFFサマリーデータ取得エラー:', error);
      setReportSummary(null);
    }
  }, [user]);

  // 日別スコアデータを取得
  const fetchDailyScores = useCallback(async (days: number = 30) => {
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
  }, [user]);

  // 前期間のデータを取得（比較用）
  const fetchPreviousPeriodData = useCallback(async (period: 'weekly' | 'monthly', currentDate: string) => {
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
  }, [user]);

  // 月次レビューを取得（月が変わった時のみ）
  const fetchMonthlyReview = useCallback(async () => {
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
        const errorData = await response.json().catch(() => ({}));
        console.error('Monthly review API error:', response.status, response.statusText, errorData);
        setMonthlyReview(null);
      }
    } catch (error) {
      console.error('Monthly review fetch error:', error);
      setMonthlyReview(null);
    }
  }, [user, accountScore, previousPeriodData]);


  // BFF APIからデータを取得
  const fetchAccountScore = useCallback(async () => {
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
      setAccountScore({
        score: 0,
        rating: 'C',
        label: 'データ読み込みエラー',
        color: 'gray',
        breakdown: {}
      });
    }
  }, [user, activeTab, selectedMonth, selectedWeek]);



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

  // データ初期化と期間変更時のデータ再取得（統合）
  useEffect(() => {
    if (user?.uid) {
      const abortController = new AbortController();
      
      const fetchPeriodData = async () => {
        try {
          setIsLoading(true);
          const period = activeTab;
          const date = activeTab === 'weekly' ? selectedWeek : selectedMonth;
          
          await Promise.all([
            fetchReportSummary(period, date, abortController.signal),
            fetchAccountScore(),
            fetchDailyScores(activeTab === 'weekly' ? 7 : 30),
            fetchPreviousPeriodData(period, date)
          ]);
          
          // 月次レビューは他のデータが揃ってから取得
          const timeoutId = setTimeout(() => {
            if (!abortController.signal.aborted) {
              fetchMonthlyReview();
            }
          }, 1000);
          
          return () => clearTimeout(timeoutId);
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            // アボートエラーは無視
            return;
          }
          console.error('期間データ取得エラー:', error);
        } finally {
          if (!abortController.signal.aborted) {
            setIsLoading(false);
          }
        }
      };

      fetchPeriodData();
      
      return () => {
        abortController.abort();
      };
    }
  }, [activeTab, selectedMonth, selectedWeek, user?.uid]);

  // BFFデータから統計値を取得（フォールバック用のデフォルト値）
  const currentTotals = reportSummary?.totals || {
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalReposts: 0,
    totalReach: 0,
    totalSaves: 0,
    totalFollowerIncrease: 0,
    avgEngagementRate: 0,
    totalPosts: 0
  };

  const previousTotals = reportSummary?.previousTotals || {
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalReposts: 0,
    totalReach: 0,
    totalSaves: 0,
    totalFollowerIncrease: 0,
    avgEngagementRate: 0,
    totalPosts: 0
  };

  const changes = reportSummary?.changes || {
    likesChange: 0,
    commentsChange: 0,
    sharesChange: 0,
    repostsChange: 0,
    reachChange: 0,
    savesChange: 0,
    followerChange: 0,
    engagementRateChange: 0,
    postsChange: 0
  };

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

  // パフォーマンス評価（APIデータから）
  const performanceRating = accountScore ? {
    rating: String(accountScore.rating || 'C'),
    color: `text-${accountScore.color}-600`,
    bg: `bg-${accountScore.color}-100`,
    label: String(accountScore.label || 'データ読み込み中')
  } : { rating: 'C', color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'データ読み込み中' };

  // アクセス制御画面（削除）

  return (
    <SNSLayout 
      customTitle="月次レポート"
      customDescription="月次のパフォーマンス分析とレポート"
    >
      <div className="max-w-7xl mx-auto p-6 bg-white min-h-screen">
        {/* ヘッダー */}
        <ReportHeader
          activeTab={activeTab}
          selectedWeek={selectedWeek}
          selectedMonth={selectedMonth}
          onTabChange={setActiveTab}
          onWeekChange={setSelectedWeek}
          onMonthChange={setSelectedMonth}
          getWeekDisplayName={getWeekDisplayName}
          getMonthDisplayName={getMonthDisplayName}
        />

        {/* パフォーマンス評価 */}
        <PerformanceRating
          activeTab={activeTab}
          selectedMonth={selectedMonth}
          selectedWeek={selectedWeek}
          getMonthDisplayName={getMonthDisplayName}
          getWeekDisplayName={getWeekDisplayName}
          performanceRating={performanceRating}
          accountScore={accountScore}
        />

        {/* 運用計画連携 */}
        <CurrentPlanCard 
          planData={planData}
          snsType="instagram"
        />

        {/* 主要指標 */}
        <MetricsCards
          activeTab={activeTab}
          currentTotals={{
            totalLikes: currentTotals.totalLikes,
            totalComments: currentTotals.totalComments,
            totalShares: currentTotals.totalShares,
            totalReach: currentTotals.totalReach,
            totalFollowerChange: currentTotals.totalFollowerIncrease,
            totalPosts: currentTotals.totalPosts
          }}
          previousTotals={{
            totalLikes: previousTotals.totalLikes,
            totalComments: previousTotals.totalComments,
            totalShares: previousTotals.totalShares,
            totalReach: previousTotals.totalReach,
            totalFollowerChange: previousTotals.totalFollowerIncrease,
            totalPosts: previousTotals.totalPosts
          }}
          changes={{
            likesChange: changes.likesChange,
            commentsChange: changes.commentsChange,
            sharesChange: changes.sharesChange,
            reachChange: changes.reachChange,
            followerChange: changes.followerChange,
            postsChange: changes.postsChange
          }}
        />

        {/* AI分析 */}
        <AIPredictionAnalysis
          activeTab={activeTab}
          currentTotals={{
            totalFollowerChange: currentTotals.totalFollowerIncrease,
            totalPosts: currentTotals.totalPosts,
            totalLikes: currentTotals.totalLikes,
            totalComments: currentTotals.totalComments,
            totalShares: currentTotals.totalShares,
            totalReach: currentTotals.totalReach
          }}
          accountScore={accountScore}
          previousPeriodData={previousPeriodData}
          monthlyReview={monthlyReview}
          performanceRating={performanceRating}
          selectedMonth={selectedMonth}
          selectedWeek={selectedWeek}
        />

        {/* 詳細統計 */}
        <DetailedStats
          accountScore={accountScore}
          performanceRating={performanceRating}
          previousPeriodData={previousPeriodData}
          activeTab={activeTab}
          reportSummary={reportSummary ? {
            ...reportSummary,
            totals: {
              ...reportSummary.totals,
              totalFollowerChange: reportSummary.totals.totalFollowerIncrease
            },
            previousTotals: {
              ...reportSummary.previousTotals,
              totalFollowerChange: reportSummary.previousTotals.totalFollowerIncrease
            }
          } : null}
          getWeekDisplayName={getWeekDisplayName}
          getMonthDisplayName={getMonthDisplayName}
          selectedWeek={selectedWeek}
          selectedMonth={selectedMonth}
        />

        {/* 視覚化セクション */}
        <VisualizationSection
          dailyScores={dailyScores}
          activeTab={activeTab}
          reportSummary={reportSummary}
        />

        {/* 高度な分析セクション */}
        <AdvancedAnalysis
          activeTab={activeTab}
          reportSummary={reportSummary}
        />



      </div>
    </SNSLayout>
  );
}