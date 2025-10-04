'use client';

import React, { useState, useEffect } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { AIChatWidget } from '../../../components/ai-chat-widget';
import { useAuth } from '../../../contexts/auth-context';
import { usePlanData } from '../../../hooks/usePlanData';
import { PlanCard } from '../../../components/PlanCard';
import { checkUserDataCount } from '../../../lib/monthly-report-notifications';
import { BarChart3 } from 'lucide-react';

// コンポーネントのインポート
import { ReportHeader } from './components/ReportHeader';
import { PerformanceRating } from './components/PerformanceRating';
import { MetricsCards } from './components/MetricsCards';
import { DetailedStats } from './components/DetailedStats';
import { VisualizationSection } from './components/VisualizationSection';
import { AudienceAnalysis } from './components/AudienceAnalysis';
import { AdvancedAnalysis } from './components/AdvancedAnalysis';
import { AIPredictionAnalysis } from './components/AIPredictionAnalysis';
import { DataExport } from './components/DataExport';


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
  const { planData } = usePlanData();
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
      totalReach: number;
      totalFollowerChange: number;
      totalPosts: number;
    };
    previousTotals: {
      totalLikes: number;
      totalComments: number;
      totalShares: number;
      totalReach: number;
      totalFollowerChange: number;
      totalPosts: number;
    };
    changes: {
      likesChange: number;
      commentsChange: number;
      sharesChange: number;
      reachChange: number;
      followerChange: number;
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
  const fetchReportSummary = async (period: 'weekly' | 'monthly', date: string) => {
    if (!user?.uid) return;
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/analytics/monthly-report-summary?userId=${user.uid}&period=${period}&date=${date}`, {
        headers: {
          'x-user-id': user.uid,
          'Authorization': `Bearer ${idToken}`
        }
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
  };

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
        
        // BFFサマリーデータを取得
        const period = activeTab;
        const date = activeTab === 'weekly' ? selectedWeek : selectedMonth;
        await fetchReportSummary(period, date);
        
      } catch (error) {
        console.error('データ初期化エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [user?.uid, activeTab, selectedWeek, selectedMonth, fetchReportSummary]);

  // 期間変更時のデータ再取得
  useEffect(() => {
    if (user?.uid) {
      const fetchPeriodData = async () => {
        try {
          setIsLoading(true);
          const period = activeTab;
          const date = activeTab === 'weekly' ? selectedWeek : selectedMonth;
          
          await Promise.all([
            fetchReportSummary(period, date),
            fetchAccountScore(),
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
  }, [activeTab, selectedMonth, selectedWeek, user?.uid, fetchReportSummary, fetchAccountScore, fetchDailyScores, fetchPreviousPeriodData, fetchMonthlyReview]);

  // BFFデータから統計値を取得（フォールバック用のデフォルト値）
  const currentTotals = reportSummary?.totals || {
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalReach: 0,
    totalFollowerChange: 0,
    totalPosts: 0
  };

  const previousTotals = reportSummary?.previousTotals || {
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalReach: 0,
    totalFollowerChange: 0,
    totalPosts: 0
  };

  const changes = reportSummary?.changes || {
    likesChange: 0,
    commentsChange: 0,
    sharesChange: 0,
    reachChange: 0,
    followerChange: 0,
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
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                <BarChart3 className="w-12 h-12 text-white animate-pulse" />
              </div>
              <div className="absolute inset-0 w-24 h-24 mx-auto">
                <div className="w-full h-full border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">データを読み込み中...</h2>
            <p className="text-gray-600 mb-6">魅力的な分析レポートを準備しています</p>
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
                <div className="w-5 h-5 text-blue-600 mr-2">⏰</div>
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
        <ReportHeader
          activeTab={activeTab}
          selectedWeek={selectedWeek}
          selectedMonth={selectedMonth}
          onTabChange={setActiveTab}
          onWeekChange={setSelectedWeek}
          onMonthChange={setSelectedMonth}
          onExportPDF={exportToPDF}
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

        {/* 主要指標 */}
        <MetricsCards
          activeTab={activeTab}
          currentTotals={currentTotals}
          previousTotals={previousTotals}
          changes={changes}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 運用計画連携 */}
          <PlanCard 
            planData={planData}
            variant="progress"
            showProgress={true}
            showStrategies={true}
          />

          {/* 期間の成果 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">期間の成果</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {currentTotals.totalFollowerChange > 0 ? '+' : ''}
                  {currentTotals.totalFollowerChange}
                </div>
                <div className="text-xs text-gray-600">
                  {activeTab === 'weekly' ? '今週のフォロワー増加' : '今月のフォロワー増加'}
                </div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {currentTotals.totalPosts}
                </div>
                <div className="text-xs text-gray-600">
                  {activeTab === 'weekly' ? '今週の投稿数' : '今月の投稿数'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 詳細統計 */}
        <DetailedStats
          accountScore={accountScore}
          performanceRating={performanceRating}
          previousPeriodData={previousPeriodData}
          activeTab={activeTab}
          reportSummary={reportSummary}
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

        {/* オーディエンス分析セクション */}
        <AudienceAnalysis
          activeTab={activeTab}
          reportSummary={reportSummary}
          getWeekDisplayName={getWeekDisplayName}
          getMonthDisplayName={getMonthDisplayName}
          selectedWeek={selectedWeek}
          selectedMonth={selectedMonth}
        />

        {/* 高度な分析セクション */}
        <AdvancedAnalysis
          activeTab={activeTab}
          reportSummary={reportSummary}
        />

        {/* AI予測・トレンド分析セクション */}
        <AIPredictionAnalysis
          activeTab={activeTab}
          currentTotals={currentTotals}
          accountScore={accountScore}
          previousPeriodData={previousPeriodData}
          monthlyReview={monthlyReview}
          performanceRating={performanceRating}
        />

        {/* データエクスポートセクション */}
        <DataExport
          isLoading={isLoading}
          onExportCSV={exportToCSV}
          onExportPDF={exportToPDF}
        />

        {/* AIチャットウィジェット */}
        <AIChatWidget 
          contextData={{
            planData: planData as unknown as Record<string, unknown>,
            monthlyStats: {
              totalPosts: currentTotals.totalPosts,
              totalLikes: currentTotals.totalLikes,
              totalComments: currentTotals.totalComments,
              totalShares: currentTotals.totalShares,
              avgEngagement: accountScore?.score || 0
            },
            reportSummary: reportSummary
          }}
        />
      </div>
    </SNSLayout>
  );
}