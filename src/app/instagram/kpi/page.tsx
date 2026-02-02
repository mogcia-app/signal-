"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import SNSLayout from "../../../components/sns-layout";
import { KPIHeader } from "./components/KPIHeader";
import { KPIBreakdownComponent } from "./components/KPIBreakdown";
import { HashtagAnalysis } from "./components/HashtagAnalysis";
import { ContentPerformance } from "./components/ContentPerformance";
import { AudienceBreakdownComponent } from "./components/AudienceBreakdown";
import { DailyKPITrend } from "./components/DailyKPITrend";
import { useAuth } from "../../../contexts/auth-context";
import { canAccessFeature } from "@/lib/plan-access";
import { authFetch } from "../../../utils/authFetch";
import { notify } from "../../../lib/ui/notifications";
import { getCurrentMonth, getMonthDisplayName } from "../../../utils/date-utils";
import { handleError } from "../../../utils/error-handling";
import { useMonthAutoUpdate } from "../../../hooks/useMonthAutoUpdate";
import type { KPIBreakdown, TimeSlotEntry, FeedStats, ReelStats, AudienceBreakdown, DailyKPI } from "@/app/api/analytics/kpi-breakdown/route";

export default function InstagramKPIPage() {
  const { user } = useAuth();
  const isAuthReady = useMemo(() => Boolean(user), [user]);

  // 月の自動更新フックを使用
  const [selectedMonth, setSelectedMonth] = useMonthAutoUpdate();
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

  // KPI分解データを取得
  const fetchKPIBreakdown = useCallback(
    async (date: string) => {
      if (!isAuthReady) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await authFetch(`/api/analytics/kpi-breakdown?date=${date}`);

        if (!response.ok) {
          // HTTPエラーの詳細を取得
          let errorMessage = "データの取得に失敗しました";
          try {
            const errorData = await response.json() as { error?: string };
            errorMessage = errorData.error || errorMessage;
          } catch {
            // JSONパースに失敗した場合は、ステータスコードから判断
            if (response.status === 401) {
              errorMessage = "認証が必要です。再度ログインしてください。";
            } else if (response.status === 403) {
              errorMessage = "この機能にアクセスする権限がありません。";
            } else if (response.status === 404) {
              errorMessage = "データが見つかりませんでした。";
            } else if (response.status >= 500) {
              errorMessage = "サーバーエラーが発生しました。しばらくしてから再度お試しください。";
            } else {
              errorMessage = `データの取得に失敗しました（エラーコード: ${response.status}）`;
            }
          }
          
          setError(errorMessage);
          notify({ type: "error", message: errorMessage });
          setKpiData(null);
          return;
        }

        const result = await response.json() as {
          success?: boolean;
          data?: {
            breakdowns?: KPIBreakdown[];
            timeSlotAnalysis?: TimeSlotEntry[];
            hashtagStats?: Array<{ hashtag: string; count: number }>;
            feedStats?: FeedStats | null;
            reelStats?: ReelStats | null;
            feedAudience?: AudienceBreakdown | null;
            reelAudience?: AudienceBreakdown | null;
            dailyKPIs?: DailyKPI[];
          };
          error?: string;
        };

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
          setError(null); // 成功時はエラーをクリア
        } else {
          const errorMessage = result.error || "データの形式が正しくありません";
          setError(errorMessage);
          notify({ type: "error", message: errorMessage });
          setKpiData(null);
        }
      } catch (err) {
        console.error("KPI分解データ取得エラー:", err);
        const errorMessage = handleError(err, "データの取得中にエラーが発生しました");
        
        // ネットワークエラーの場合の詳細メッセージ
        if (err instanceof TypeError && err.message.includes("fetch")) {
          const networkErrorMessage = "ネットワークエラーが発生しました。インターネット接続を確認してください。";
          setError(networkErrorMessage);
          notify({ type: "error", message: networkErrorMessage });
        } else {
          setError(errorMessage);
          notify({ type: "error", message: errorMessage });
        }
        
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

