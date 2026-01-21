"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { useUserProfile } from "@/hooks/useUserProfile";
import { canAccessFeature } from "@/lib/plan-access";
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
  const router = useRouter();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const isAuthReady = useMemo(() => Boolean(user), [user]);

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
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // BFF APIから全データを取得
  const fetchReportData = useCallback(
    async (date: string, regenerate = false) => {
      if (!isAuthReady) return;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ date });
        if (regenerate) {
          params.append("regenerate", "true");
        }

        const response = await authFetch(`/api/analytics/report-complete?${params.toString()}`);

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
            setReportData(result.data);
            if (result.data.performanceScore) {
              setPerformanceScore(result.data.performanceScore);
            }
          } else {
            console.error("[ReportPage] BFF APIデータが不正:", result);
            setError("データの取得に失敗しました");
            setPerformanceScore(null);
            setReportData(null);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("[ReportPage] BFF API エラー:", {
            status: response.status,
            error: errorData,
          });
          setError(errorData.error || "データの取得に失敗しました");
          setPerformanceScore(null);
          setReportData(null);
        }
      } catch (err) {
        console.error("[ReportPage] レポートデータ取得エラー:", err);
        setError("データの取得中にエラーが発生しました");
        setPerformanceScore(null);
        setReportData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthReady]
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
          <div className="bg-white border border-red-200 p-4 mb-6">
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
        <FeedbackSentiment 
          selectedMonth={selectedMonth} 
          reportData={reportData}
        />

        {/* 投稿ディープダイブ */}
        <PostDeepDive 
          selectedMonth={selectedMonth} 
          reportData={reportData}
        />

        {/* AI学習リファレンス */}
        <AILearningReferences 
          selectedMonth={selectedMonth} 
          reportData={reportData}
        />
      </div>
    </SNSLayout>
  );
}

