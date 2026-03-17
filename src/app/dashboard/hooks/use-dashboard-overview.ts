"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { authFetch } from "@/utils/authFetch";
import { handleError } from "@/utils/error-handling";
import { ERROR_MESSAGES } from "@/constants/error-messages";
import type { DashboardData, DashboardResponse } from "@/types/home";
import type {
  AiDirectionData,
  HomeUnanalyzedPost,
  MonthlyKpisData,
  MonthlyResult,
  TomorrowPreparationItem,
} from "../types";

interface UseDashboardOverviewParams {
  userId?: string;
}

export function useDashboardOverview({ userId }: UseDashboardOverviewParams) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [aiDirection, setAiDirection] = useState<AiDirectionData | null>(null);
  const [, setIsLoadingAiDirection] = useState(false);
  const [monthlyKPIs, setMonthlyKPIs] = useState<MonthlyKpisData | null>(null);
  const [isLoadingMonthlyKPIs, setIsLoadingMonthlyKPIs] = useState(true);
  const [homeUnanalyzedPosts, setHomeUnanalyzedPosts] = useState<HomeUnanalyzedPost[]>([]);
  const [tomorrowPreparations, setTomorrowPreparations] = useState<TomorrowPreparationItem[]>([]);
  const [isLoadingHomeUnanalyzedPosts, setIsLoadingHomeUnanalyzedPosts] = useState(false);
  const [isLoadingTodayTasks, setIsLoadingTodayTasks] = useState(false);

  const fetchDashboard = async () => {
    try {
      setIsLoadingDashboard(true);
      const response = await authFetch("/api/home/dashboard");
      if (response.ok) {
        const data = (await response.json()) as DashboardResponse;
        if (data.success && data.data) {
          setDashboardData(data.data);
        } else {
          toast.error(
            handleError(
              data.error || ERROR_MESSAGES.DASHBOARD_FETCH_FAILED,
              ERROR_MESSAGES.DASHBOARD_FETCH_FAILED
            )
          );
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(
          handleError(
            errorData.error || ERROR_MESSAGES.DASHBOARD_FETCH_FAILED,
            ERROR_MESSAGES.DASHBOARD_FETCH_FAILED
          )
        );
      }
    } catch (error) {
      console.error("ダッシュボードデータ取得エラー:", error);
      toast.error(handleError(error, ERROR_MESSAGES.DASHBOARD_FETCH_FAILED));
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const fetchMonthlyKPIs = async () => {
    try {
      setIsLoadingMonthlyKPIs(true);
      const response = await authFetch("/api/home/monthly-kpis");
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setMonthlyKPIs(result.data as MonthlyKpisData);
        }
      } else {
        console.error("今月のKPIデータ取得エラー:", response.status);
      }
    } catch (error) {
      console.error("今月のKPIデータ取得エラー:", error);
    } finally {
      setIsLoadingMonthlyKPIs(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingDashboard(true);
        const dashboardResponse = await authFetch("/api/home/dashboard");
        if (dashboardResponse.ok) {
          const nextDashboardData = (await dashboardResponse.json()) as DashboardResponse;
          if (nextDashboardData.success && nextDashboardData.data) {
            setDashboardData(nextDashboardData.data);
          } else {
            toast.error(
              handleError(
                nextDashboardData.error || "ダッシュボードデータの取得に失敗しました",
                "ダッシュボードデータの取得に失敗しました"
              )
            );
          }
        } else {
          const errorData = await dashboardResponse.json().catch(() => ({}));
          toast.error(
            handleError(
              errorData.error || "ダッシュボードデータの取得に失敗しました",
              "ダッシュボードデータの取得に失敗しました"
            )
          );
        }
      } catch (error) {
        console.error("データ取得エラー:", error);
        toast.error(handleError(error, ERROR_MESSAGES.DASHBOARD_FETCH_FAILED));
      } finally {
        setIsLoadingDashboard(false);
      }
    };

    void fetchData();
  }, []);

  useEffect(() => {
    const fetchAiDirection = async () => {
      if (!userId) {return;}

      try {
        setIsLoadingAiDirection(true);
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

        let response = await authFetch(`/api/ai-direction?month=${nextMonthStr}`);
        let result = null;

        if (response.ok) {
          result = await response.json();
          if (result.success && result.data && result.data.lockedAt) {
            setAiDirection({
              month: result.data.month,
              mainTheme: result.data.mainTheme,
              lockedAt: result.data.lockedAt,
            });
            return;
          }
        }

        response = await authFetch(`/api/ai-direction?month=${currentMonth}`);
        if (response.ok) {
          result = await response.json();
          if (result.success && result.data && result.data.lockedAt) {
            setAiDirection({
              month: result.data.month,
              mainTheme: result.data.mainTheme,
              lockedAt: result.data.lockedAt,
            });
            return;
          }
        }

        response = await authFetch("/api/ai-direction");
        if (response.ok) {
          result = await response.json();
          if (result.success && result.data && result.data.lockedAt) {
            setAiDirection({
              month: result.data.month,
              mainTheme: result.data.mainTheme,
              lockedAt: result.data.lockedAt,
            });
          } else {
            setAiDirection(null);
          }
        } else {
          setAiDirection(null);
        }
      } catch (error) {
        console.error("AI方向性取得エラー:", error);
        setAiDirection(null);
      } finally {
        setIsLoadingAiDirection(false);
      }
    };

    void fetchAiDirection();
  }, [userId]);

  useEffect(() => {
    const fetchTodayTasks = async () => {
      if (!userId) {return;}

      try {
        setIsLoadingTodayTasks(true);
        const response = await authFetch("/api/home/today-tasks");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setTomorrowPreparations(data.data.tomorrowPreparations || []);
          }
        }
      } catch (error) {
        console.error("明日の準備取得エラー:", error);
      } finally {
        setIsLoadingTodayTasks(false);
      }
    };

    void fetchTodayTasks();
  }, [userId]);

  useEffect(() => {
    const fetchHomeUnanalyzedPosts = async () => {
      if (!userId) {return;}

      try {
        setIsLoadingHomeUnanalyzedPosts(true);
        const response = await authFetch("/api/posts/with-analytics", {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setHomeUnanalyzedPosts([]);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result?.success && result?.data) {
          setHomeUnanalyzedPosts((result.data.unanalyzedPosts || []) as HomeUnanalyzedPost[]);
        } else {
          setHomeUnanalyzedPosts([]);
        }
      } catch (error) {
        console.error("分析待ち投稿取得エラー:", error);
        setHomeUnanalyzedPosts([]);
      } finally {
        setIsLoadingHomeUnanalyzedPosts(false);
      }
    };

    void fetchHomeUnanalyzedPosts();
  }, [userId]);

  useEffect(() => {
    const handleAnalyticsUpdated = async () => {
      if (!userId) {return;}
      try {
        const response = await authFetch("/api/posts/with-analytics", {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setHomeUnanalyzedPosts([]);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result?.success && result?.data) {
          setHomeUnanalyzedPosts((result.data.unanalyzedPosts || []) as HomeUnanalyzedPost[]);
        } else {
          setHomeUnanalyzedPosts([]);
        }
      } catch (error) {
        console.error("分析待ち投稿更新エラー:", error);
      }
    };

    window.addEventListener("posts-analytics-updated", handleAnalyticsUpdated);
    return () => {
      window.removeEventListener("posts-analytics-updated", handleAnalyticsUpdated);
    };
  }, [userId]);

  useEffect(() => {
    if (userId) {
      void fetchMonthlyKPIs();
    }
  }, [userId]);

  const monthlyResults: MonthlyResult[] = monthlyKPIs
    ? [
        { metric: "いいね数", value: monthlyKPIs.thisMonth.likes || 0, change: monthlyKPIs.changes?.likes, icon: "🩷" },
        { metric: "コメント数", value: monthlyKPIs.thisMonth.comments || 0, change: monthlyKPIs.changes?.comments, icon: "💬" },
        { metric: "シェア数", value: Number(monthlyKPIs.thisMonth.shares || 0), change: monthlyKPIs.changes?.shares, icon: "📤" },
        { metric: "リポスト数", value: Number(monthlyKPIs.thisMonth.reposts || 0), change: monthlyKPIs.changes?.reposts, icon: "🔁" },
        { metric: "保存数", value: Number(monthlyKPIs.thisMonth.saves || 0), change: monthlyKPIs.changes?.saves, icon: "💾" },
        { metric: "フォロワー増加数", value: Number(monthlyKPIs.thisMonth.followerIncrease || 0), change: monthlyKPIs.changes?.followerIncrease, icon: "📈" },
      ]
    : [
        { metric: "いいね数", value: 0, change: undefined, icon: "🩷" },
        { metric: "コメント数", value: 0, change: undefined, icon: "💬" },
        { metric: "シェア数", value: 0, change: undefined, icon: "📤" },
        { metric: "リポスト数", value: 0, change: undefined, icon: "🔁" },
        { metric: "保存数", value: 0, change: undefined, icon: "💾" },
        { metric: "フォロワー増加数", value: 0, change: undefined, icon: "📈" },
      ];

  const clearOverviewLists = () => {
    setHomeUnanalyzedPosts([]);
    setTomorrowPreparations([]);
  };

  return {
    dashboardData,
    isLoadingDashboard,
    aiDirection,
    monthlyKPIs,
    monthlyResults,
    isLoadingMonthlyKPIs,
    homeUnanalyzedPosts,
    tomorrowPreparations,
    isLoadingHomeUnanalyzedPosts,
    isLoadingTodayTasks,
    clearOverviewLists,
    fetchDashboard,
    fetchMonthlyKPIs,
  };
}
