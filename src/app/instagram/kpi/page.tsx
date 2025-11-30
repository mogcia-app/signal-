"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import SNSLayout from "../../../components/sns-layout";
import { KPIHeader } from "./components/KPIHeader";
import { KPIBreakdownComponent } from "./components/KPIBreakdown";
import { HashtagAnalysis } from "./components/HashtagAnalysis";
import { ContentPerformance } from "./components/ContentPerformance";
import { AudienceBreakdownComponent } from "./components/AudienceBreakdown";
import { DailyKPITrend } from "./components/DailyKPITrend";
import { GoalAchievementComponent } from "./components/GoalAchievement";
import { useAuth } from "../../../contexts/auth-context";
import { authFetch } from "../../../utils/authFetch";
import type { KPIBreakdown, TimeSlotEntry, FeedStats, ReelStats, AudienceBreakdown, DailyKPI, GoalAchievement } from "@/app/api/analytics/kpi-breakdown/route";

export default function InstagramKPIPage() {
  const { user } = useAuth();
  const isAuthReady = useMemo(() => Boolean(user), [user]);
  
  // 現在の月を取得する関数（ローカルタイムゾーンを使用）
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`; // YYYY-MM形式
  };
  
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [breakdowns, setBreakdowns] = useState<KPIBreakdown[]>([]);
  const [timeSlotAnalysis, setTimeSlotAnalysis] = useState<TimeSlotEntry[]>([]);
  const [hashtagStats, setHashtagStats] = useState<Array<{ hashtag: string; count: number }>>([]);
  const [feedStats, setFeedStats] = useState<FeedStats | null>(null);
  const [reelStats, setReelStats] = useState<ReelStats | null>(null);
  const [feedAudience, setFeedAudience] = useState<AudienceBreakdown | null>(null);
  const [reelAudience, setReelAudience] = useState<AudienceBreakdown | null>(null);
  const [dailyKPIs, setDailyKPIs] = useState<DailyKPI[]>([]);
  const [goalAchievements, setGoalAchievements] = useState<GoalAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 月の表示名を取得
  const getMonthDisplayName = (monthStr: string) => {
    const date = new Date(monthStr + "-01");
    return date.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
  };

  // KPI分解データを取得
  const fetchKPIBreakdown = useCallback(
    async (date: string) => {
      if (!isAuthReady) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await authFetch(`/api/analytics/kpi-breakdown?date=${date}`);

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setBreakdowns(result.data.breakdowns || []);
            setTimeSlotAnalysis(result.data.timeSlotAnalysis || []);
            setHashtagStats(result.data.hashtagStats || []);
            setFeedStats(result.data.feedStats || null);
            setReelStats(result.data.reelStats || null);
            setFeedAudience(result.data.feedAudience || null);
            setReelAudience(result.data.reelAudience || null);
            setDailyKPIs(result.data.dailyKPIs || []);
            setGoalAchievements(result.data.goalAchievements || []);
          } else {
            setError("データの取得に失敗しました");
            setBreakdowns([]);
            setTimeSlotAnalysis([]);
            setHashtagStats([]);
            setFeedStats(null);
            setReelStats(null);
            setFeedAudience(null);
            setReelAudience(null);
            setDailyKPIs([]);
            setGoalAchievements([]);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.error || "データの取得に失敗しました");
          setBreakdowns([]);
          setTimeSlotAnalysis([]);
          setHashtagStats([]);
          setFeedStats(null);
          setReelStats(null);
          setFeedAudience(null);
          setReelAudience(null);
          setDailyKPIs([]);
          setGoalAchievements([]);
        }
      } catch (err) {
        console.error("KPI分解データ取得エラー:", err);
        setError("データの取得中にエラーが発生しました");
        setBreakdowns([]);
        setTimeSlotAnalysis([]);
        setHashtagStats([]);
        setFeedStats(null);
        setReelStats(null);
        setFeedAudience(null);
        setReelAudience(null);
        setDailyKPIs([]);
        setGoalAchievements([]);
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthReady]
  );

  // 月が変更された時、または認証が準備できた時にデータを取得
  useEffect(() => {
    if (isAuthReady && selectedMonth) {
      fetchKPIBreakdown(selectedMonth);
    }
  }, [isAuthReady, selectedMonth, fetchKPIBreakdown]);

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

  return (
    <SNSLayout customTitle="KPIコンソール" customDescription="主要KPIを要素ごとに分解し、何が伸びたか／落ちたかを素早く把握できます">
      <div className="w-full px-2 sm:px-3 md:px-4 py-3 sm:py-4 bg-white min-h-screen max-w-7xl mx-auto">
        {/* ヘッダー */}
        <KPIHeader
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

        {/* KPI分解 */}
        <KPIBreakdownComponent
          breakdowns={breakdowns}
          isLoading={isLoading}
          error={error}
        />

        {/* KPI目標達成度 */}
        <GoalAchievementComponent
          goalAchievements={goalAchievements}
          isLoading={isLoading}
        />

        {/* フィード/リール統計サマリー */}
        <ContentPerformance
          feedStats={feedStats}
          reelStats={reelStats}
          isLoading={isLoading}
        />

        {/* 日別KPI推移 */}
        <DailyKPITrend dailyKPIs={dailyKPIs} isLoading={isLoading} />

        {/* 時間帯 × コンテンツタイプ */}
        {/* TimeSlotHeatmap コンポーネントは削除されました */}

        {/* ハッシュタグ分析 */}
        <div className="mt-4">
          <HashtagAnalysis hashtagStats={hashtagStats} isLoading={isLoading} />
        </div>

        {/* オーディエンス構成サマリー */}
        <AudienceBreakdownComponent
          feed={feedAudience}
          reel={reelAudience}
          isLoading={isLoading}
        />
      </div>
    </SNSLayout>
  );
}

