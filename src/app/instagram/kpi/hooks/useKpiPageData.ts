"use client";

import { useCallback, useState } from "react";
import { authFetch } from "@/utils/authFetch";
import { handleError } from "@/utils/error-handling";
import { ERROR_MESSAGES } from "@/constants/error-messages";
import { clientCache, generateCacheKey } from "@/utils/cache";
import type { KPIDashboard } from "@/domain/analysis/kpi/types";
import type { KPIBreakdownResponse } from "@/data/contracts/kpi-breakdown-response";

interface UseKpiPageDataInput {
  isAuthReady: boolean;
}

export function useKpiPageData({ isAuthReady }: UseKpiPageDataInput) {
  const [kpiData, setKpiData] = useState<KPIDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPartiallyLoading, setIsPartiallyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchKPIBreakdown = useCallback(
    async (date: string, retryAttempt = 0) => {
      if (!isAuthReady) {
        return;
      }

      const cacheKey = generateCacheKey("kpi-breakdown", { date });
      const cachedData = clientCache.get<KPIDashboard>(cacheKey);

      if (cachedData) {
        setKpiData(cachedData);
        setError(null);
        setIsLoading(false);
        return;
      }

      const isInitialLoad = !kpiData;
      if (isInitialLoad) {
        setIsLoading(true);
      } else {
        setIsPartiallyLoading(true);
      }
      setError(null);

      try {
        const response = await authFetch(`/api/analytics/kpi-breakdown?date=${date}`);

        if (response.ok) {
          const result = (await response.json()) as KPIBreakdownResponse;
          if (result.success && result.data) {
            setKpiData(result.data);
            clientCache.set(cacheKey, result.data, 5 * 60 * 1000);
            setRetryCount(0);
          } else {
            setError(ERROR_MESSAGES.KPI_FETCH_FAILED);
            setKpiData(null);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));

          if (response.status >= 500 && retryAttempt < 2) {
            setTimeout(() => {
              void fetchKPIBreakdown(date, retryAttempt + 1);
            }, 1000 * (retryAttempt + 1));
            return;
          }

          const errorMessage = handleError(
            errorData.error || ERROR_MESSAGES.KPI_FETCH_FAILED,
            ERROR_MESSAGES.KPI_FETCH_FAILED
          );
          setError(errorMessage);
          setKpiData(null);
          setRetryCount(retryAttempt + 1);
        }
      } catch (err) {
        if (retryAttempt < 2) {
          setTimeout(() => {
            void fetchKPIBreakdown(date, retryAttempt + 1);
          }, 1000 * (retryAttempt + 1));
          return;
        }

        const errorMessage = handleError(err, ERROR_MESSAGES.KPI_FETCH_FAILED);
        setError(errorMessage);
        setKpiData(null);
        setRetryCount(retryAttempt + 1);
      } finally {
        setIsLoading(false);
        setIsPartiallyLoading(false);
      }
    },
    [isAuthReady, kpiData]
  );

  return {
    kpiData,
    isLoading,
    isPartiallyLoading,
    error,
    retryCount,
    fetchKPIBreakdown,
  };
}
