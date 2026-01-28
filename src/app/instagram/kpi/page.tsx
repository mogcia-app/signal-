"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import SNSLayout from "../../../components/sns-layout";
import { KPIHeader } from "./components/KPIHeader";
import { KPIBreakdownComponent } from "./components/KPIBreakdown";
import { HashtagAnalysis } from "./components/HashtagAnalysis";
import { ContentPerformance } from "./components/ContentPerformance";
import { AudienceBreakdownComponent } from "./components/AudienceBreakdown";
import { DailyKPITrend } from "./components/DailyKPITrend";
import { useAuth } from "../../../contexts/auth-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { canAccessFeature } from "@/lib/plan-access";
import { authFetch } from "../../../utils/authFetch";
import type { KPIBreakdown, TimeSlotEntry, FeedStats, ReelStats, AudienceBreakdown, DailyKPI } from "@/app/api/analytics/kpi-breakdown/route";

export default function InstagramKPIPage() {
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
  const [kpiData, setKpiData] = useState<{
    breakdowns: KPIBreakdown[];
    timeSlotAnalysis: TimeSlotEntry[];
    hashtagStats: Array<{ hashtag: string; count: number }>;
    feedStats: FeedStats | null;
    reelStats: ReelStats | null;
    feedAudience: AudienceBreakdown | null;
    reelAudience: AudienceBreakdown | null;
    dailyKPIs: DailyKPI[];
  } | null>(null);
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
            setKpiData({
              breakdowns: result.data.breakdowns || [],
              timeSlotAnalysis: result.data.timeSlotAnalysis || [],
              hashtagStats: result.data.hashtagStats || [],
              feedStats: result.data.feedStats || null,
              reelStats: result.data.reelStats || null,
              feedAudience: result.data.feedAudience || null,
              reelAudience: result.data.reelAudience || null,
              dailyKPIs: result.data.dailyKPIs || [],
            });
          } else {
            setError("データの取得に失敗しました");
            setKpiData(null);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.error || "データの取得に失敗しました");
          setKpiData(null);
        }
      } catch (err) {
        console.error("KPI分解データ取得エラー:", err);
        setError("データの取得中にエラーが発生しました");
        setKpiData(null);
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
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 bg-white min-h-screen">
        {/* ヘッダー */}
        <KPIHeader
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          getMonthDisplayName={getMonthDisplayName}
        />

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* KPI分解 */}
        <KPIBreakdownComponent
          breakdowns={kpiData?.breakdowns || []}
          isLoading={isLoading}
          error={error}
        />

        {/* フィード/リール統計サマリー */}
        <ContentPerformance
          feedStats={kpiData?.feedStats || null}
          reelStats={kpiData?.reelStats || null}
          isLoading={isLoading}
        />

        {/* 日別KPI推移 */}
        <DailyKPITrend dailyKPIs={kpiData?.dailyKPIs || []} isLoading={isLoading} />

        {/* 時間帯 × コンテンツタイプ */}
        {/* TimeSlotHeatmap コンポーネントは削除されました */}

        {/* ハッシュタグ分析 */}
        <div className="mt-4">
          <HashtagAnalysis hashtagStats={kpiData?.hashtagStats || []} isLoading={isLoading} />
        </div>

        {/* オーディエンス構成サマリー */}
        <AudienceBreakdownComponent
          feed={kpiData?.feedAudience || null}
          reel={kpiData?.reelAudience || null}
          isLoading={isLoading}
        />
      </div>
    </SNSLayout>
  );
}

