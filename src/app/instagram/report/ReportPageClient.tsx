"use client";

import React, { useMemo, useEffect } from "react";
import SNSLayout from "../../../components/sns-layout";
import { ReportHeader } from "./components/ReportHeader";
import { PerformanceScore } from "./components/PerformanceScore";
import { MonthlyReview } from "./components/MonthlyReview";
import { MonthlyActionPlans } from "./components/MonthlyActionPlans";
import { RiskDetection } from "./components/RiskDetection";
import { PostSummaryInsights } from "./components/PostSummaryInsights";
import { useAuth } from "../../../contexts/auth-context";
import { useProgress } from "../../../contexts/progress-context";
import { useReportPageData } from "./hooks/useReportPageData";
import { useMonthAutoUpdate } from "@/hooks/useMonthAutoUpdate";
import { getMonthDisplayName } from "@/utils/date-utils";
import { BotStatusCard } from "../../../components/bot-status-card";

export default function ReportPageClient() {
  const { user } = useAuth();
  const isAuthReady = useMemo(() => Boolean(user), [user]);
  const { showProgress, setProgress, hideProgress } = useProgress();
  const [selectedMonth, setSelectedMonth] = useMonthAutoUpdate();
  const {
    performanceScore,
    reportData,
    isLoading,
    isPartiallyLoading,
    error,
    retryCount,
    fetchReportData,
  } = useReportPageData({
    isAuthReady,
    showProgress,
    setProgress,
    hideProgress,
  });

  // 月が変更された時、または認証が準備できた時にデータを取得
  useEffect(() => {
    if (isAuthReady && selectedMonth) {
      void fetchReportData(selectedMonth);
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
          <div className="mb-6" role="status" aria-live="polite" aria-label="データを読み込み中">
            <BotStatusCard
              title="生成中..."
              subtitle="月次レポートを準備中です"
              progress={35}
            />
          </div>
        )}
        
        {/* 部分ローディング表示 */}
        {isPartiallyLoading && performanceScore && (
          <div className="mb-4" role="status" aria-live="polite">
            <BotStatusCard
              title="更新中..."
              subtitle="最新データを反映しています"
              progress={72}
              compact
            />
          </div>
        )}

        {/* 今月の振り返り */}
        <MonthlyReview 
          selectedMonth={selectedMonth} 
          kpis={performanceScore?.kpis || null}
          reportData={reportData}
          onRegenerate={() => void fetchReportData(selectedMonth, true)}
        />

        {/* 次のアクションプラン */}
        <MonthlyActionPlans 
          selectedMonth={selectedMonth} 
          kpis={performanceScore?.kpis || null}
          reportData={reportData}
          onRegenerate={() => void fetchReportData(selectedMonth, true)}
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
