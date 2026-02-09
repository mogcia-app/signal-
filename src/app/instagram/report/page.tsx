"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import SNSLayout from "../../../components/sns-layout";
import { ReportHeader } from "./components/ReportHeader";
import { PerformanceScore } from "./components/PerformanceScore";
import { MonthlyReview } from "./components/MonthlyReview";
import { MonthlyActionPlans } from "./components/MonthlyActionPlans";
import { RiskDetection } from "./components/RiskDetection";
import { PostSummaryInsights } from "./components/PostSummaryInsights";
import { PostDeepDive } from "./components/PostDeepDive";
import { AILearningReferences } from "./components/AILearningReferences";
import { FeedbackSentiment } from "./components/FeedbackSentiment";
import { useAuth } from "../../../contexts/auth-context";
import { authFetch } from "../../../utils/authFetch";
import { useProgress } from "../../../contexts/progress-context";
import { handleError } from "../../../utils/error-handling";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import { clientCache, generateCacheKey } from "../../../utils/cache";
import { SkeletonCard } from "../../../components/ui/SkeletonLoader";
import type { ReportData } from "../../../types/report";

interface PerformanceScoreData {
  score: number;
  rating: "S" | "A" | "B" | "C" | "D" | "F";
  label: string;
  color: string;
  breakdown: {
    engagement: number;
    growth: number;
    quality: number;
    consistency: number;
  };
  kpis: {
    totalLikes: number;
    totalReach: number;
    totalSaves: number;
    totalComments: number;
    totalFollowerIncrease: number;
  };
  metrics: {
    postCount: number;
    analyzedCount: number;
    hasPlan: boolean;
  };
}

export default function InstagramReportPage() {
  const { user } = useAuth();
  const isAuthReady = useMemo(() => Boolean(user), [user]);
  const { showProgress, setProgress, hideProgress } = useProgress();

  // 現在の月を取得する関数（ローカルタイムゾーンを使用）
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`; // YYYY-MM形式
  };
  
  // すべてのHooksを早期リターンの前に定義
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [performanceScore, setPerformanceScore] = useState<PerformanceScoreData | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPartiallyLoading, setIsPartiallyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // 月が変わったら自動的に現在の月に更新（過去の月を選択している場合はスキップ）
  useEffect(() => {
    const checkMonthChange = () => {
      const currentMonth = getCurrentMonth();
      // 選択された月が現在の月より古い（過去）場合は、自動更新をスキップ
      // 過去の月のデータを見ている場合は、そのまま維持する
      if (selectedMonth < currentMonth) {
        return;
      }
      // 選択された月が現在の月と同じか未来の場合は、現在の月に更新
      if (selectedMonth !== currentMonth) {
        setSelectedMonth(currentMonth);
      }
    };

    // 初回チェック
    checkMonthChange();

    // ページがフォーカスされた時にチェック
    const handleFocus = () => {
      checkMonthChange();
    };
    window.addEventListener("focus", handleFocus);

    // ページが表示されている時（visibilitychange）にもチェック
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkMonthChange();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 5分ごとにチェック（月が変わるのは1日0時なので、より頻繁にチェック）
    const interval = setInterval(checkMonthChange, 5 * 60 * 1000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [selectedMonth]);

  // 月の表示名を取得
  const getMonthDisplayName = (monthStr: string) => {
    const date = new Date(monthStr + "-01");
    return date.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
  };

  // BFF APIから全データを取得（キャッシュ付き、リトライ機能付き）
  const fetchReportData = useCallback(
    async (date: string, regenerate = false, retryAttempt = 0) => {
      if (!isAuthReady) return;

      // キャッシュキーを生成
      const cacheKey = generateCacheKey("report-complete", { date, regenerate });

      // 再生成でない場合はキャッシュから取得を試みる
      if (!regenerate) {
        const cached = clientCache.get<{ performanceScore: PerformanceScoreData | null; reportData: Record<string, unknown> | null }>(cacheKey);
        if (cached) {
          setPerformanceScore(cached.performanceScore);
          setReportData(cached.reportData);
          setError(null);
          return;
        }
      }

      // 初回ロード時は全体ローディング、再取得時は部分ローディング
      const isInitialLoad = !performanceScore && !reportData;
      if (isInitialLoad) {
        setIsLoading(true);
        showProgress();
        setProgress(10);
      } else {
        setIsPartiallyLoading(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams({ date });
        if (regenerate) {
          params.append("regenerate", "true");
        }

        setProgress(30);
        const response = await authFetch(`/api/analytics/report-complete?${params.toString()}`);
        setProgress(60);

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            console.log("[ReportPage] BFF APIデータ取得完了:", {
              hasPerformanceScore: !!result.data.performanceScore,
              hasRiskAlerts: !!result.data.riskAlerts,
              hasFeedbackSentiment: !!result.data.feedbackSentiment,
              hasPostDeepDive: !!result.data.postDeepDive,
              hasAILearningReferences: !!result.data.aiLearningReferences,
              hasPostSummaries: !!result.data.postSummaries,
              hasMonthlyReview: !!result.data.monthlyReview,
            });
            
            const dataToCache = {
              performanceScore: result.data.performanceScore || null,
              reportData: result.data,
            };
            
            // キャッシュに保存（10分間有効）
            clientCache.set(cacheKey, dataToCache, 10 * 60 * 1000);
            
            setReportData(result.data);
            if (result.data.performanceScore) {
              setPerformanceScore(result.data.performanceScore);
            }
            setRetryCount(0);
            setProgress(100);
          } else {
            console.error("[ReportPage] BFF APIデータが不正:", result);
            setError(ERROR_MESSAGES.REPORT_FETCH_FAILED);
            setPerformanceScore(null);
            setReportData(null);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("[ReportPage] BFF API エラー:", {
            status: response.status,
            error: errorData,
          });
          
          // リトライ可能なエラー（5xx系）の場合はリトライ
          if (response.status >= 500 && retryAttempt < 2) {
            console.log(`[ReportPage] リトライ試行 ${retryAttempt + 1}/2`);
            setTimeout(() => {
              fetchReportData(date, regenerate, retryAttempt + 1);
            }, 1000 * (retryAttempt + 1)); // 指数バックオフ
            return;
          }
          
          const errorMessage = handleError(
            errorData.error || ERROR_MESSAGES.REPORT_FETCH_FAILED,
            ERROR_MESSAGES.REPORT_FETCH_FAILED
          );
          setError(errorMessage);
          setPerformanceScore(null);
          setReportData(null);
          setRetryCount(retryAttempt + 1);
        }
      } catch (err) {
        console.error("[ReportPage] レポートデータ取得エラー:", err);
        
        // リトライ可能なエラーの場合はリトライ
        if (retryAttempt < 2) {
          console.log(`[ReportPage] リトライ試行 ${retryAttempt + 1}/2`);
          setTimeout(() => {
            fetchReportData(date, regenerate, retryAttempt + 1);
          }, 1000 * (retryAttempt + 1)); // 指数バックオフ
          return;
        }
        
        const errorMessage = handleError(
          err,
          ERROR_MESSAGES.REPORT_FETCH_FAILED
        );
        setError(errorMessage);
        setPerformanceScore(null);
        setReportData(null);
        setRetryCount(retryAttempt + 1);
        hideProgress();
      } finally {
        setIsLoading(false);
        setIsPartiallyLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAuthReady, performanceScore, reportData] // showProgress, setProgress, hideProgressはuseCallbackでメモ化されているため依存配列に含めない
  );

  // 月が変更された時、または認証が準備できた時にデータを取得
  useEffect(() => {
    if (isAuthReady && selectedMonth) {
      fetchReportData(selectedMonth);
    }
  }, [isAuthReady, selectedMonth, fetchReportData]);

  return (
    <SNSLayout customTitle="月次レポート" customDescription="月次のパフォーマンス分析とレポート">
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 bg-white min-h-screen">
        {/* ヘッダー */}
        <ReportHeader
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          getMonthDisplayName={getMonthDisplayName}
        />

        {/* エラー表示 */}
        {error && (
          <div className="bg-white border border-red-200 p-4 mb-6" role="alert" aria-live="polite">
            <div className="flex items-start justify-between">
              <p className="text-sm text-red-700 flex-1">{error}</p>
              {retryCount > 0 && (
                <button
                  onClick={() => fetchReportData(selectedMonth, false, 0)}
                  className="ml-4 px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  aria-label="データを再取得する"
                >
                  再試行
                </button>
              )}
            </div>
          </div>
        )}

        {/* パフォーマンス評価 */}
        {performanceScore && (
          <PerformanceScore
            score={performanceScore.score}
            rating={performanceScore.rating}
            label={performanceScore.label}
            color={performanceScore.color}
            breakdown={performanceScore.breakdown}
            kpis={performanceScore.kpis}
            metrics={performanceScore.metrics}
            isLoading={isLoading}
          />
        )}

        {/* ローディング表示 */}
        {isLoading && !performanceScore && (
          <div className="space-y-6" role="status" aria-live="polite" aria-label="データを読み込み中">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}
        
        {/* 部分ローディング表示 */}
        {isPartiallyLoading && performanceScore && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded" role="status" aria-live="polite">
            <p className="text-sm text-blue-700">データを更新中...</p>
          </div>
        )}

        {/* 今月の振り返り */}
        <MonthlyReview 
          selectedMonth={selectedMonth} 
          kpis={performanceScore?.kpis || null}
          reportData={reportData}
          onRegenerate={() => fetchReportData(selectedMonth, true)}
        />

        {/* 次のアクションプラン */}
        <MonthlyActionPlans 
          selectedMonth={selectedMonth} 
          kpis={performanceScore?.kpis || null}
          reportData={reportData}
          onRegenerate={() => fetchReportData(selectedMonth, true)}
        />

        {/* リスク・異常検知 */}
        <RiskDetection 
          selectedMonth={selectedMonth} 
          kpis={performanceScore?.kpis || null}
          reportData={reportData}
        />

        {/* 今月の投稿別強み・改善・施策まとめ */}
        <PostSummaryInsights 
          selectedMonth={selectedMonth} 
          reportData={reportData}
        />

        {/* フィードバック感情トラッキング */}
        {/* <FeedbackSentiment 
          selectedMonth={selectedMonth} 
          reportData={reportData}
        /> */}

        {/* 投稿ディープダイブ */}
        {/* <PostDeepDive 
          selectedMonth={selectedMonth} 
          reportData={reportData}
        /> */}

        {/* AI学習リファレンス */}
        {/* <AILearningReferences 
          selectedMonth={selectedMonth} 
          reportData={reportData}
        /> */}
      </div>
    </SNSLayout>
  );
}

