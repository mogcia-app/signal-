"use client";

import { useCallback, useState } from "react";
import { authFetch } from "@/utils/authFetch";
import { handleError } from "@/utils/error-handling";
import { ERROR_MESSAGES } from "@/constants/error-messages";
import { clientCache, generateCacheKey } from "@/utils/cache";
import type { ReportData } from "@/types/report";
import type { ReportCompleteResponse } from "@/data/contracts/report-complete-response";
import type { PerformanceScoreResult } from "@/domain/analysis/report/types";

interface UseReportPageDataInput {
  isAuthReady: boolean;
  showProgress: () => void;
  setProgress: (progress: number) => void;
  hideProgress: () => void;
}

export function useReportPageData({
  isAuthReady,
  showProgress,
  setProgress,
  hideProgress,
}: UseReportPageDataInput) {
  const [performanceScore, setPerformanceScore] = useState<PerformanceScoreResult | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPartiallyLoading, setIsPartiallyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchReportData = useCallback(
    async (date: string, regenerate = false, retryAttempt = 0) => {
      if (!isAuthReady) {
        return;
      }

      const cacheKey = generateCacheKey("report-complete", { date, regenerate });

      if (!regenerate) {
        const cached = clientCache.get<{
          performanceScore: PerformanceScoreResult | null;
          reportData: ReportData | null;
        }>(cacheKey);
        if (cached) {
          setPerformanceScore(cached.performanceScore);
          setReportData(cached.reportData);
          setError(null);
          return;
        }
      }

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
          const result = (await response.json()) as ReportCompleteResponse;
          if (result.success && result.data) {
            const dataToCache = {
              performanceScore: result.data.performanceScore || null,
              reportData: result.data,
            };
            clientCache.set(cacheKey, dataToCache, 10 * 60 * 1000);
            setReportData(result.data);
            setPerformanceScore(result.data.performanceScore || null);
            setRetryCount(0);
            setProgress(100);
          } else {
            setError(ERROR_MESSAGES.REPORT_FETCH_FAILED);
            setPerformanceScore(null);
            setReportData(null);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          if (response.status >= 500 && retryAttempt < 2) {
            setTimeout(() => {
              void fetchReportData(date, regenerate, retryAttempt + 1);
            }, 1000 * (retryAttempt + 1));
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
        if (retryAttempt < 2) {
          setTimeout(() => {
            void fetchReportData(date, regenerate, retryAttempt + 1);
          }, 1000 * (retryAttempt + 1));
          return;
        }

        const errorMessage = handleError(err, ERROR_MESSAGES.REPORT_FETCH_FAILED);
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
    [hideProgress, isAuthReady, performanceScore, reportData, setProgress, showProgress]
  );

  return {
    performanceScore,
    reportData,
    isLoading,
    isPartiallyLoading,
    error,
    retryCount,
    fetchReportData,
  };
}
