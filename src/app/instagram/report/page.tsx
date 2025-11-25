"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import SNSLayout from "../../../components/sns-layout";
import { ReportHeader } from "./components/ReportHeader";
import { PerformanceScore } from "./components/PerformanceScore";
import { MonthlyReview } from "./components/MonthlyReview";
import { MonthlyActionPlans } from "./components/MonthlyActionPlans";
import { RiskDetection } from "./components/RiskDetection";
import { PostDeepDive } from "./components/PostDeepDive";
import { AILearningReferences } from "./components/AILearningReferences";
import { FeedbackSentiment } from "./components/FeedbackSentiment";
import { useAuth } from "../../../contexts/auth-context";
import { authFetch } from "../../../utils/authFetch";

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
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM形式
  );
  const [performanceScore, setPerformanceScore] = useState<PerformanceScoreData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 月の表示名を取得
  const getMonthDisplayName = (monthStr: string) => {
    const date = new Date(monthStr + "-01");
    return date.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
  };

  // パフォーマンス評価スコアを取得
  const fetchPerformanceScore = useCallback(
    async (date: string) => {
      if (!isAuthReady) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await authFetch(`/api/analytics/performance-score?date=${date}`);

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setPerformanceScore(result.data);
          } else {
            setError("データの取得に失敗しました");
            setPerformanceScore(null);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.error || "データの取得に失敗しました");
          setPerformanceScore(null);
        }
      } catch (err) {
        console.error("パフォーマンス評価スコア取得エラー:", err);
        setError("データの取得中にエラーが発生しました");
        setPerformanceScore(null);
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthReady]
  );

  // 月が変更された時、または認証が準備できた時にデータを取得
  useEffect(() => {
    if (isAuthReady && selectedMonth) {
      fetchPerformanceScore(selectedMonth);
    }
  }, [isAuthReady, selectedMonth, fetchPerformanceScore]);

  return (
    <SNSLayout customTitle="月次レポート" customDescription="月次のパフォーマンス分析とレポート">
      <div className="w-full p-3 sm:p-4 bg-white min-h-screen max-w-7xl mx-auto">
        {/* ヘッダー */}
        <ReportHeader
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          getMonthDisplayName={getMonthDisplayName}
        />

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
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
          <PerformanceScore
            score={0}
            rating="C"
            label="読み込み中"
            color="gray"
            breakdown={{ engagement: 0, growth: 0, quality: 0, consistency: 0 }}
            kpis={{ totalLikes: 0, totalReach: 0, totalSaves: 0, totalComments: 0, totalFollowerIncrease: 0 }}
            metrics={{ postCount: 0, analyzedCount: 0, hasPlan: false }}
            isLoading={true}
          />
        )}

        {/* 今月の振り返り */}
        <MonthlyReview 
          selectedMonth={selectedMonth} 
          kpis={performanceScore?.kpis || null}
        />

        {/* 次のアクションプラン */}
        <MonthlyActionPlans 
          selectedMonth={selectedMonth} 
          kpis={performanceScore?.kpis || null}
        />

        {/* リスク・異常検知 */}
        <RiskDetection 
          selectedMonth={selectedMonth} 
          kpis={performanceScore?.kpis || null}
        />

        {/* フィードバック感情トラッキング */}
        <FeedbackSentiment selectedMonth={selectedMonth} />

        {/* 投稿ディープダイブ */}
        <PostDeepDive selectedMonth={selectedMonth} />

        {/* AI学習リファレンス */}
        <AILearningReferences selectedMonth={selectedMonth} />
      </div>
    </SNSLayout>
  );
}

