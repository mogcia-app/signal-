"use client";

import React, { useEffect, useMemo } from "react";
import SNSLayout from "../../../components/sns-layout";
import { KPIHeader } from "./components/KPIHeader";
import { KPIBreakdownComponent } from "./components/KPIBreakdown";
import { HashtagAnalysis } from "./components/HashtagAnalysis";
import { ContentPerformance } from "./components/ContentPerformance";
import { AudienceBreakdownComponent } from "./components/AudienceBreakdown";
import { DailyKPITrend } from "./components/DailyKPITrend";
import { PostingTimeKPIAnalysis } from "./components/PostingTimeKPIAnalysis";
import { useAuth } from "../../../contexts/auth-context";
import { useKpiPageData } from "./hooks/useKpiPageData";
import { useBillingCycleMonth } from "@/hooks/useBillingCycleMonth";

export default function KPIPageClient() {
  const { user } = useAuth();
  const isAuthReady = useMemo(() => Boolean(user), [user]);
  const { selectedMonth, setSelectedMonth, selectedPeriodLabel, isCycleResolved } = useBillingCycleMonth(isAuthReady);
  const {
    kpiData,
    isLoading,
    isPartiallyLoading,
    error,
    retryCount,
    fetchKPIBreakdown,
  } = useKpiPageData({ isAuthReady });

  useEffect(() => {
    if (isAuthReady && isCycleResolved && selectedMonth) {
      void fetchKPIBreakdown(selectedMonth);
    }
  }, [fetchKPIBreakdown, isAuthReady, isCycleResolved, selectedMonth]);

  return (
    <SNSLayout customTitle="KPIコンソール" customDescription="主要KPIを要素ごとに分解し、何が伸びたか／落ちたかを素早く把握できます">
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 bg-gray-50 min-h-screen py-6">
        <div className="mb-6">
          <KPIHeader
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            periodLabel={selectedPeriodLabel}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 mb-6 rounded-lg" role="alert" aria-live="polite">
            <div className="flex items-start justify-between">
              <p className="text-sm text-red-700 flex-1">{error}</p>
              {retryCount > 0 && (
                <button
                  onClick={() => void fetchKPIBreakdown(selectedMonth, 0)}
                  className="ml-4 px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  aria-label="データを再取得する"
                >
                  再試行
                </button>
              )}
            </div>
          </div>
        )}

        {isPartiallyLoading && kpiData && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg" role="status" aria-live="polite">
            <p className="text-sm text-blue-700">データを更新中...</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="lg:col-span-2 xl:col-span-3">
            <KPIBreakdownComponent
              breakdowns={kpiData?.breakdowns || []}
              isLoading={isLoading}
              error={error}
            />
          </div>

          <div className="lg:col-span-2 xl:col-span-3">
            <ContentPerformance
              feedStats={kpiData?.feedStats || null}
              reelStats={kpiData?.reelStats || null}
              isLoading={isLoading}
            />
          </div>

          <div className="lg:col-span-2 xl:col-span-3">
            <PostingTimeKPIAnalysis
              timeSlotKPIAnalysis={kpiData?.timeSlotKPIAnalysis || []}
              isLoading={isLoading}
            />
          </div>

          <div className="lg:col-span-2 xl:col-span-3">
            <DailyKPITrend dailyKPIs={kpiData?.dailyKPIs || []} isLoading={isLoading} />
          </div>

          <div className="lg:col-span-2 xl:col-span-3">
            <AudienceBreakdownComponent
              feed={kpiData?.feedAudience || null}
              reel={kpiData?.reelAudience || null}
              isLoading={isLoading}
            />
          </div>

          <div className="lg:col-span-2 xl:col-span-3">
            <HashtagAnalysis hashtagStats={kpiData?.hashtagStats || []} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </SNSLayout>
  );
}
