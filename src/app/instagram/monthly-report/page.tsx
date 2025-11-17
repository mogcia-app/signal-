"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import SNSLayout from "../../../components/sns-layout";
import { useAuth } from "../../../contexts/auth-context";
import { usePlanData } from "../../../hooks/usePlanData";
import type { AIActionLog, AIReference } from "@/types/ai";
import type { ABTestResultTag } from "@/types/ab-test";
import { actionLogsApi } from "@/lib/api";

// コンポーネントのインポート
import { ReportHeader } from "./components/ReportHeader";
import { PerformanceRating } from "./components/PerformanceRating";
import { MetricsCards } from "./components/MetricsCards";
import { DetailedStats } from "./components/DetailedStats";
import { VisualizationSection } from "./components/VisualizationSection";
import { AdvancedAnalysis } from "./components/AdvancedAnalysis";
import {
  AIPredictionAnalysis,
  AIAnalysisAlert,
  AIAnalysisPostTypeHighlight,
} from "./components/AIPredictionAnalysis";
import { RiskAlerts } from "./components/risk-alerts";
import { PostTypeInsights } from "./components/PostTypeInsights";
import { authFetch } from "../../../utils/authFetch";
import { ContentPerformanceSection } from "./components/content-performance-section";
import { AudienceBreakdownSection } from "./components/audience-breakdown-section";
import {
  NextMonthFocusActions,
  type NextMonthFocusAction,
} from "./components/next-month-focus-actions";
import { PostDeepDiveSection } from "@/app/instagram/monthly-report/components/post-deep-dive-section";
import { LearningReferenceCard } from "@/app/instagram/monthly-report/components/learning-reference-card";
import { KPIDrilldownSection } from "./components/kpi-drilldown-section";
import type { KPIBreakdown } from "./components/kpi-drilldown-section";
import {
  FeedbackSentimentCard,
  type FeedbackSentimentSummary,
} from "./components/feedback-sentiment-card";
import { TimeSlotHeatmap } from "./components/time-slot-heatmap";

type SnapshotReference = {
  id: string;
  status: "gold" | "negative" | "normal";
  score?: number;
  postId?: string | null;
  summary?: string;
  metrics?: {
    engagementRate?: number;
    saveRate?: number;
    reach?: number;
    saves?: number;
  };
  textFeatures?: Record<string, unknown>;
};

type AudienceSummary = {
  gender?: { male?: number; female?: number; other?: number };
  age?: { "18-24"?: number; "25-34"?: number; "35-44"?: number; "45-54"?: number };
};

type AnalyticsSummary = {
  likes?: number;
  comments?: number;
  shares?: number;
  reach?: number;
  saves?: number;
  followerIncrease?: number;
  engagementRate?: number;
} | null;

type FeedPerformanceStats = {
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalReposts: number;
  totalSaves: number;
  totalReach: number;
  totalFollowerIncrease: number;
  totalInteractionCount: number;
  avgReachFollowerPercent: number;
  avgInteractionFollowerPercent: number;
  totalPosts?: number;
  reachSources: {
    profile: number;
    feed: number;
    explore: number;
    search: number;
    other: number;
  };
  totalReachedAccounts: number;
  totalProfileVisits: number;
  audienceBreakdown?: {
    gender?: { male: number; female: number; other: number };
    age?: { "18-24": number; "25-34": number; "35-44": number; "45-54": number };
  };
};

type ReelPerformanceStats = {
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalReposts: number;
  totalSaves: number;
  totalReach: number;
  totalFollowerIncrease: number;
  totalInteractionCount: number;
  avgReachFollowerPercent: number;
  avgInteractionFollowerPercent: number;
  totalPosts?: number;
  reachSources: {
    profile: number;
    reel: number;
    explore: number;
    search: number;
    other: number;
  };
  totalReachedAccounts: number;
  totalPlayTimeSeconds: number;
  avgPlayTimeSeconds: number;
  avgSkipRate: number;
  avgNormalSkipRate: number;
  audienceBreakdown?: {
    gender?: { male: number; female: number; other: number };
    age?: { "18-24": number; "25-34": number; "35-44": number; "45-54": number };
  };
};

type ReportPost = {
  id: string;
  title: string;
  postType: "feed" | "reel" | "story";
  content?: string;
  hashtags?: string[] | string;
  createdAt?: string | Date | { toDate: () => Date };
  snapshotReferences?: SnapshotReference[];
  analyticsSummary?: AnalyticsSummary;
  audienceSummary?: AudienceSummary;
  abTestResults?: ABTestResultTag[];
};

type PatternHighlights = {
  gold?: SnapshotReference[];
  negative?: SnapshotReference[];
};

type MasterContextSummary = {
  learningPhase?: string;
  ragHitRate?: number;
  totalInteractions?: number;
  feedbackStats?: {
    total?: number;
    positiveRate?: number;
    averageWeight?: number;
  };
  actionStats?: {
    total?: number;
    adoptionRate?: number;
    averageResultDelta?: number;
  };
  achievements?: Array<{
    id: string;
    title: string;
    description: string;
    icon?: string;
    status?: string;
    progress?: number;
  }>;
} | null;

type LearningContextSummary = {
  references?: AIReference[];
  snapshotReferences?: SnapshotReference[];
  masterContext?: MasterContextSummary;
} | null;

type PersonaSegmentSummary = {
  segment: string;
  type: "gender" | "age";
  status: "gold" | "negative";
  value: number;
  delta?: number;
  postTitle: string;
  postId: string;
};

type ABTestSummary = {
  id: string;
  name: string;
  status: string;
  primaryMetric?: string;
  winnerVariantLabel?: string | null;
  summary?: string;
  completedAt?: string | null;
  variants?: Array<{
    label: string;
    metrics?: {
      impressions?: number;
      reach?: number;
      saves?: number;
      likes?: number;
      comments?: number;
      conversions?: number;
      engagementRate?: number;
      saveRate?: number;
    };
    result?: string;
    linkedPostId?: string | null;
  }>;
};

export default function InstagramMonthlyReportPage() {
  const { user } = useAuth();
  const isAuthReady = useMemo(() => Boolean(user), [user]);
  const [activeView, setActiveView] = useState<"ai" | "metrics">("ai");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM形式
  );
  const { planData } = usePlanData("instagram", { effectiveMonth: selectedMonth });
  const planContextMeta = useMemo(() => {
    const form = planData?.formData as Record<string, unknown> | undefined;
    return {
      targetAudience: (form?.targetAudience as string) || planData?.targetAudience || null,
      brandConcept: (form?.brandConcept as string) || null,
      tone: (form?.tone as string) || null,
    };
  }, [planData]);
  // BFF API連携の状態
  const [accountScore, setAccountScore] = useState<Record<string, unknown> | null>(null);
  const [dailyScores, setDailyScores] = useState<Record<string, unknown> | null>(null);
  const [previousPeriodData, setPreviousPeriodData] = useState<Record<string, unknown> | null>(
    null
  );
  const [monthlyReview, setMonthlyReview] = useState<Record<string, unknown> | null>(null);
  const [pdcaMetrics, setPdcaMetrics] = useState<{
    planExists: boolean;
    loopScore: number;
    planScore: number;
    executionRate: number;
    feedbackCoverage: number;
    adoptionRate: number;
    plannedPosts: number;
    analyzedPosts: number;
    feedbackCount: number;
    actionCount: number;
    actionAppliedCount: number;
  } | null>(null);
  const [aiAlerts, setAiAlerts] = useState<AIAnalysisAlert[]>([]);
  const [postTypeHighlights, setPostTypeHighlights] = useState<AIAnalysisPostTypeHighlight[]>([]);
  // 履歴セクションは削除
  const [actionLogs, setActionLogs] = useState<AIActionLog[]>([]);
  const [actionLogsLoading, setActionLogsLoading] = useState(false);
  const [actionLogsError, setActionLogsError] = useState<string | null>(null);
  const focusAreaForNextMonth = useMemo(() => `next-month-${selectedMonth}`, [selectedMonth]);

  const handleActionLogUpdate = useCallback((log: AIActionLog) => {
    setActionLogs((prev) => {
      const remaining = prev.filter((item) => item.actionId !== log.actionId);
      const updated = [log, ...remaining];
      
      // pdcaMetricsを再計算（改善反映率を更新）
      if (pdcaMetrics) {
        // 既存のログを確認して、appliedの変更を検出
        const oldLog = prev.find((item) => item.actionId === log.actionId);
        const wasApplied = oldLog?.applied ?? false;
        const isApplied = log.applied ?? false;
        const isNewLog = !oldLog; // 新規作成されたログかどうか
        
        // 新規作成されたログでappliedがtrueの場合、actionCountも増やす
        let newActionCount = pdcaMetrics.actionCount;
        if (isNewLog && isApplied) {
          newActionCount += 1;
        }
        
        // appliedの状態が変わった場合のみ更新
        if (wasApplied !== isApplied || isNewLog) {
          let newActionAppliedCount = pdcaMetrics.actionAppliedCount;
          if (isApplied && !wasApplied) {
            // チェックをオンにした場合
            newActionAppliedCount += 1;
          } else if (!isApplied && wasApplied) {
            // チェックをオフにした場合
            newActionAppliedCount = Math.max(0, newActionAppliedCount - 1);
          }
          
          const adoptionRate = newActionCount > 0 
            ? Math.min(1, Math.max(0, newActionAppliedCount / newActionCount))
            : 0;
          
          // loopScoreも再計算
          const loopScore = Math.min(1, Math.max(0, (
            pdcaMetrics.planScore + 
            pdcaMetrics.executionRate + 
            pdcaMetrics.feedbackCoverage + 
            adoptionRate
          ) / 4));
          
          setPdcaMetrics({
            ...pdcaMetrics,
            actionCount: newActionCount,
            actionAppliedCount: newActionAppliedCount,
            adoptionRate,
            loopScore,
          });
        }
      }
      
      return updated;
    });
  }, [pdcaMetrics]);

  // BFFサマリーデータ
  const [reportSummary, setReportSummary] = useState<{
    period: "monthly";
    date: string;
    totals: {
      totalLikes: number;
      totalComments: number;
      totalShares: number;
      totalReposts: number;
      totalReach: number;
      totalSaves: number;
      totalFollowerIncrease: number;
      avgEngagementRate: number;
      totalPosts: number;
    };
    previousTotals: {
      totalLikes: number;
      totalComments: number;
      totalShares: number;
      totalReposts: number;
      totalReach: number;
      totalSaves: number;
      totalFollowerIncrease: number;
      avgEngagementRate: number;
      totalPosts: number;
    };
    changes: {
      likesChange: number;
      commentsChange: number;
      sharesChange: number;
      repostsChange: number;
      reachChange: number;
      savesChange: number;
      followerChange: number;
      engagementRateChange: number;
      postsChange: number;
    };
    audienceAnalysis: {
      gender: { male: number; female: number; other: number };
      age: { "18-24": number; "25-34": number; "35-44": number; "45-54": number };
    };
    reachSourceAnalysis: {
      sources: { posts: number; profile: number; explore: number; search: number };
      followers: { followers: number; nonFollowers: number };
    };
    hashtagStats: { hashtag: string; count: number }[];
    timeSlotAnalysis: {
      label: string;
      range: number[];
      color: string;
      postsInRange: number;
      avgEngagement: number;
      postTypes?: Array<{
        type: "feed" | "reel" | "story";
        count: number;
        avgEngagement: number;
      }>;
    }[];
    bestTimeSlot: {
      label: string;
      range: number[];
      color: string;
      postsInRange: number;
      avgEngagement: number;
    };
    postTypeStats: {
      type: string;
      count: number;
      label: string;
      color: string;
      bg: string;
      percentage: number;
    }[];
    contentPerformance?: {
      feed: FeedPerformanceStats | null;
      reel: ReelPerformanceStats | null;
    };
    posts?: ReportPost[];
    patternHighlights?: PatternHighlights;
    learningContext?: LearningContextSummary;
    postDeepDive?: ReportPost[];
    nextMonthFocusActions?: NextMonthFocusAction[];
    abTestSummaries?: ABTestSummary[];
    personaHighlights?: PersonaSegmentSummary[];
    kpiBreakdowns?: KPIBreakdown[];
    feedbackSentiment?: FeedbackSentimentSummary;
  } | null>(null);

  const planHighlights = useMemo(() => {
    if (!planData) {
      return [];
    }
    const form = planData.formData as Record<string, unknown> | undefined;
    const strategies = Array.isArray(planData.strategies) ? planData.strategies : [];
    const postThemes = Array.isArray(planData.postCategories) ? planData.postCategories : [];
    const targetAudience =
      (form?.targetAudience as string) || planData.targetAudience || "フォロワー";

    const focusItems = strategies.slice(0, 3).map((s) => ({
      type: "focus" as const,
      label: s,
      comment: `「${s}」は今月の優先テーマです。${targetAudience}が具体的なイメージを持てるように、ビフォー/アフターや現場の一言を添えた投稿を1–2本から試してみましょう。`,
    }));

    const contentItems = postThemes.slice(0, 3).map((t) => ({
      type: "content" as const,
      label: t,
      comment: `「${t}」の投稿は、今月のターゲットと相性が良い領域です。写真やリールで「一場面＋ひと言コメント」をセットにすると、保存したくなる情報量と温度感を両立できます。`,
    }));

    return [...focusItems, ...contentItems];
  }, [planData]);

  const planSummaryText = useMemo(() => {
    if (!planData) {
      return null;
    }
    const form = planData.formData as Record<string, unknown> | undefined;
    const targetAudience =
      (form?.targetAudience as string) || planData.targetAudience || "";
    const goalCategoryKey =
      (form?.goalCategory as string) || (planData as any).category || "follower";
    const goalLabelMap: Record<string, string> = {
      follower: "フォロワー獲得",
      engagement: "エンゲージメント強化",
      like: "いいね増加",
      save: "保存率向上",
      reach: "リーチ拡大",
      impressions: "インプレッション増加",
      branding: "ブランド認知",
      profile: "プロフィール誘導",
    };
    const goalLabel = goalLabelMap[goalCategoryKey] || "アカウント成長";

    const followerKpi = reportSummary?.kpiBreakdowns?.find(
      (k) => k.key === "followers"
    );
    const followerDelta =
      typeof followerKpi?.value === "number" ? followerKpi.value : undefined;

    const plannedPosts = pdcaMetrics?.plannedPosts;
    const analyzedPosts = pdcaMetrics?.analyzedPosts;

    const parts: string[] = [];
    if (targetAudience && targetAudience !== "未設定") {
      parts.push(`今月は「${targetAudience}」に向けて、${goalLabel}を狙ったInstagram運用を行う計画です。`);
    } else {
      parts.push(`今月は${goalLabel}にフォーカスしたInstagram運用を行う計画です。`);
    }

    if (typeof followerDelta === "number") {
      parts.push(`フォロワーは今月おおよそ+${followerDelta}人を目安に伸ばす想定です。`);
    }

    if (typeof plannedPosts === "number" && typeof analyzedPosts === "number") {
      const remaining = Math.max(0, plannedPosts - analyzedPosts);
      parts.push(
        `投稿シミュレーション上は約${plannedPosts}本を目安にしており、そのうち${analyzedPosts}本が分析済みです（残り${remaining}本）。`
      );
    }

    return parts.join(" ");
  }, [planData, reportSummary, pdcaMetrics]);

  // BFFサマリーデータを取得
  const fetchReportSummary = useCallback(
    async (date: string, signal?: AbortSignal) => {
      if (!isAuthReady) {return;}

      try {
        const response = await authFetch(
          `/api/analytics/monthly-report-summary?period=monthly&date=${date}`,
          {
          signal,
          }
        );

        if (response.ok) {
          const result = await response.json();
          console.log("📊 BFFサマリーデータ取得完了:", result.data);
          setReportSummary(result.data);
        } else {
          console.error("BFFサマリーデータ取得エラー:", response.status, response.statusText);
          setReportSummary(null);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("BFFサマリーデータ取得エラー:", error);
        setReportSummary(null);
      }
    },
    [isAuthReady]
  );

  // 日別スコアデータを取得
  const fetchDailyScores = useCallback(
    async (days: number = 30) => {
      if (!isAuthReady) {return;}
      try {
        const response = await authFetch(`/api/analytics/daily-scores?days=${days}`);
        if (response.ok) {
          const data = await response.json();
          setDailyScores(data);
        } else {
          console.error("Daily scores API error:", response.status, response.statusText);
          setDailyScores(null);
        }
      } catch (error) {
        console.error("Daily scores fetch error:", error);
        setDailyScores(null);
      }
    },
    [isAuthReady]
  );

  // 前期間のデータを取得（比較用）
  const fetchPreviousPeriodData = useCallback(
    async (currentDate: string) => {
      if (!isAuthReady) {return;}
      try {
          const current = new Date(currentDate + "-01");
          current.setMonth(current.getMonth() - 1);
        const previousDate = current.toISOString().slice(0, 7);

        const response = await authFetch(
          `/api/analytics/account-score?period=monthly&date=${previousDate}`,
        );
        if (response.ok) {
          const data = await response.json();
          setPreviousPeriodData(data);
        } else {
          console.error("Previous period data API error:", response.status, response.statusText);
          setPreviousPeriodData(null);
        }
      } catch (error) {
        console.error("Previous period data fetch error:", error);
        setPreviousPeriodData(null);
      }
    },
    [isAuthReady]
  );

  // 月次レビューを取得（月が変わった時のみ）
  const fetchMonthlyReview = useCallback(async () => {
    if (!isAuthReady || !accountScore) {return;}
    try {
      const currentScore = accountScore.score || 0;
      const previousScore = previousPeriodData?.score || 0;
      const performanceRating = accountScore.rating || "C";

      // 現在の月をキーに含めて、月が変わった時だけ新しいレビューを取得
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const reviewCacheKey = `monthly-review-${currentMonth}-${currentScore}-${previousScore}-${performanceRating}`;

      // ローカルストレージで月次レビューをキャッシュ
      const cachedReview = localStorage.getItem(reviewCacheKey);
      if (cachedReview) {
        setMonthlyReview(JSON.parse(cachedReview));
        return;
      }

      const response = await authFetch(
        `/api/analytics/monthly-review?currentScore=${currentScore}&previousScore=${previousScore}&performanceRating=${performanceRating}`,
      );
      if (response.ok) {
        const data = await response.json();
        setMonthlyReview(data);
        // ローカルストレージに保存（月が変わるまで有効）
        localStorage.setItem(reviewCacheKey, JSON.stringify(data));
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Monthly review API error:", response.status, response.statusText, errorData);
        setMonthlyReview(null);
      }
    } catch (error) {
      console.error("Monthly review fetch error:", error);
      setMonthlyReview(null);
    }
  }, [isAuthReady, accountScore, previousPeriodData]);

  const fetchMonthlyReviewRef = useRef(fetchMonthlyReview);

  useEffect(() => {
    fetchMonthlyReviewRef.current = fetchMonthlyReview;
  }, [fetchMonthlyReview]);

  // BFF APIからデータを取得
  const fetchAccountScore = useCallback(async () => {
    if (!isAuthReady) {return;}

    try {
      const response = await authFetch(
        `/api/analytics/account-score?period=monthly&date=${selectedMonth}`
      );

      if (response.ok) {
        const data = await response.json();
        setAccountScore(data);
      } else {
        console.error("Account score API error:", response.status, response.statusText);
        setAccountScore({
          score: 0,
          rating: "C",
          label: "データ読み込みエラー",
          color: "gray",
          breakdown: {},
        });
      }
    } catch (error) {
      console.error("Account score fetch error:", error);
      setAccountScore({
        score: 0,
        rating: "C",
        label: "データ読み込みエラー",
        color: "gray",
        breakdown: {},
      });
    }
  }, [isAuthReady, selectedMonth]);

  // データ件数チェック
  // データ初期化と期間変更時のデータ再取得（統合）
  useEffect(() => {
    if (isAuthReady) {
      const abortController = new AbortController();

      const fetchPeriodData = async () => {
        try {
          await Promise.all([
            fetchReportSummary(selectedMonth, abortController.signal),
            fetchAccountScore(),
            fetchDailyScores(30),
            fetchPreviousPeriodData(selectedMonth),
          ]);

          // 月次レビューは他のデータが揃ってから取得
          const timeoutId = setTimeout(() => {
            if (!abortController.signal.aborted) {
              fetchMonthlyReviewRef.current?.();
            }
          }, 1000);

          return () => clearTimeout(timeoutId);
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            // アボートエラーは無視
            return;
          }
          console.error("期間データ取得エラー:", error);
        } finally {
          // no-op
        }
      };

      fetchPeriodData();

      return () => {
        abortController.abort();
      };
    }
  }, [selectedMonth, isAuthReady, fetchReportSummary, fetchAccountScore, fetchDailyScores, fetchPreviousPeriodData]);

  useEffect(() => {
    if (!isAuthReady || !user?.uid || activeView !== "ai") {
      return;
    }
    let cancelled = false;
    const loadActionLogs = async () => {
      setActionLogsLoading(true);
      setActionLogsError(null);
      try {
        const result = await actionLogsApi.list(user.uid, {
          limit: 50,
          focusArea: focusAreaForNextMonth,
        });
        if (!cancelled) {
          if (result?.success) {
            const logs: AIActionLog[] = Array.isArray(result.data)
              ? result.data.map((entry: unknown) => {
                  const e = entry as {
                    id?: unknown;
                    actionId?: unknown;
                    title?: unknown;
                    focusArea?: unknown;
                    applied?: unknown;
                    resultDelta?: unknown;
                    feedback?: unknown;
                    createdAt?: unknown;
                    updatedAt?: unknown;
                  };
                  return {
                    id: String(e.id ?? `${user.uid}_${(e.actionId as string | undefined) ?? "unknown"}`),
                    actionId: String(e.actionId ?? ""),
                    title: (e.title as string) ?? "",
                    focusArea: (e.focusArea as string) ?? focusAreaForNextMonth,
                    applied: Boolean(e.applied),
                    resultDelta: typeof e.resultDelta === "number" ? Number(e.resultDelta) : null,
                    feedback: (e.feedback as string) ?? "",
                    createdAt: typeof e.createdAt === "string" ? (e.createdAt as string) : null,
                    updatedAt: typeof e.updatedAt === "string" ? (e.updatedAt as string) : null,
                  };
                })
              : [];
            setActionLogs(logs);
          } else {
            setActionLogsError(
              typeof result?.error === "string" ? result.error : "アクション状況の取得に失敗しました"
            );
          }
        }
      } catch (error) {
        console.error("actionLogs fetch error:", error);
        if (!cancelled) {
          setActionLogsError("アクション状況の取得に失敗しました");
        }
      } finally {
        if (!cancelled) {
          setActionLogsLoading(false);
        }
      }
    };
    loadActionLogs();
    return () => {
      cancelled = true;
    };
  }, [isAuthReady, user?.uid, focusAreaForNextMonth, activeView]);

  // BFFデータから統計値を取得（フォールバック用のデフォルト値）
  const currentTotals = reportSummary?.totals || {
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalReposts: 0,
    totalReach: 0,
    totalSaves: 0,
    totalFollowerIncrease: 0,
    avgEngagementRate: 0,
    totalPosts: 0,
  };

  const previousTotals = reportSummary?.previousTotals || {
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalReposts: 0,
    totalReach: 0,
    totalSaves: 0,
    totalFollowerIncrease: 0,
    avgEngagementRate: 0,
    totalPosts: 0,
  };

  const changes = reportSummary?.changes || {
    likesChange: 0,
    commentsChange: 0,
    sharesChange: 0,
    repostsChange: 0,
    reachChange: 0,
    savesChange: 0,
    followerChange: 0,
    engagementRateChange: 0,
    postsChange: 0,
  };

  // 統一 totalPosts（AI補完やサマリー派生値を考慮）
  const unifiedTotalPosts = useMemo(() => {
    const totalsCount = reportSummary?.totals?.totalPosts ?? 0;
    const deepDiveCount = Array.isArray(reportSummary?.postDeepDive) ? reportSummary?.postDeepDive.length : 0;
    const postsCount = Array.isArray(reportSummary?.posts) ? reportSummary?.posts.length : 0;
    const feedCount = reportSummary?.contentPerformance?.feed?.totalPosts ?? 0;
    const reelCount = reportSummary?.contentPerformance?.reel?.totalPosts ?? 0;
    return Math.max(totalsCount, deepDiveCount, postsCount, feedCount, reelCount);
  }, [reportSummary]);

  // 運用計画の投稿シミュレーション進捗（Planカードと同等の情報を運用計画の振り返りにも表示）
  const planSimulationSummary = useMemo(() => {
    if (!planData || !reportSummary) {
      return null;
    }

    // PlanGoalsSection と同じロジックで必要本数・実績・分析済みを算出し、
    // 「運用計画の振り返り」カード側と数字を完全に揃える
    const formData = planData.formData as Record<string, unknown> | undefined;
    const simulationResult = planData.simulationResult as
      | (Record<string, unknown> & { monthlyPostCount?: unknown })
      | null
      | undefined;

    const safeNumberLocal = (value: unknown, fallback = 0) => {
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
      return fallback;
    };

    const simulationMonthlyPosts = safeNumberLocal(simulationResult?.monthlyPostCount, 0);
    const feedFreq = safeNumberLocal(formData?.feedFreq, 0);
    const reelFreq = safeNumberLocal(formData?.reelFreq, 0);
    const storyFreq = safeNumberLocal(formData?.storyFreq, 0);
    const freqBasedMonthlyPosts = (feedFreq + reelFreq + storyFreq) * 4;
    const requiredPerMonth = Math.max(
      0,
      Math.round(simulationMonthlyPosts || freqBasedMonthlyPosts || 0),
    );

    if (requiredPerMonth === 0) {
      return null;
    }

    // 実績・分析済み・未登録も PlanGoalsSection と同じロジックを再利用する
    const reportPosts: Array<{
      analyticsSummary?: {
        likes?: number;
        comments?: number;
        shares?: number;
        reach?: number;
        saves?: number;
        followerIncrease?: number;
        engagementRate?: number;
      } | null;
    }> = Array.isArray(reportSummary.postDeepDive)
      ? (reportSummary.postDeepDive as Array<{
          analyticsSummary?: {
            likes?: number;
            comments?: number;
            shares?: number;
            reach?: number;
            saves?: number;
            followerIncrease?: number;
            engagementRate?: number;
          } | null;
        }>)
      : Array.isArray(reportSummary.posts)
        ? (reportSummary.posts as Array<{
            analyticsSummary?: {
              likes?: number;
              comments?: number;
              shares?: number;
              reach?: number;
              saves?: number;
              followerIncrease?: number;
              engagementRate?: number;
            } | null;
          }>)
        : [];

    const trackedPostsRaw =
      typeof reportSummary.totals?.totalPosts === "number"
        ? reportSummary.totals.totalPosts || 0
        : reportPosts.length;
    const actualPosts = Math.max(0, Math.round(trackedPostsRaw));

    const analyzedPosts = reportPosts.filter((post) => {
      const summary = post.analyticsSummary;
      if (!summary) {
        return false;
      }
      return Object.values(summary).some(
        (value) => typeof value === "number" && Number.isFinite(value),
      );
    }).length;

    const unregisteredPosts = Math.max(0, actualPosts - analyzedPosts);
    const remainingToGoal = Math.max(0, requiredPerMonth - actualPosts);

    return {
      requiredPerMonth,
      actualPosts,
      analyzedPosts,
      unregisteredPosts,
      remainingToGoal,
    };
  }, [planData, unifiedTotalPosts, pdcaMetrics]);

  // 月の表示名を取得
  const getMonthDisplayName = (monthStr: string) => {
    const date = new Date(monthStr + "-01");
    return date.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
  };

  // パフォーマンス評価（APIデータから）
  const performanceRating = accountScore
    ? {
        rating: String(accountScore.rating || "C"),
        color: `text-${accountScore.color}-600`,
        bg: `bg-${accountScore.color}-100`,
        label: String(accountScore.label || "データ読み込み中"),
      }
    : { rating: "C", color: "text-yellow-600", bg: "bg-yellow-100", label: "データ読み込み中" };

  // アクセス制御画面（削除）

  return (
    <SNSLayout customTitle="月次レポート" customDescription="月次のパフォーマンス分析とレポート">
      <div className="max-w-7xl mx-auto p-6 bg-white min-h-screen">
        {/* ヘッダー */}
        <ReportHeader
          selectedMonth={selectedMonth}
          activeView={activeView}
          onViewChange={setActiveView}
          onMonthChange={setSelectedMonth}
          getMonthDisplayName={getMonthDisplayName}
        />

        {/* パフォーマンス評価 */}
        <PerformanceRating
          selectedMonth={selectedMonth}
          getMonthDisplayName={getMonthDisplayName}
          performanceRating={performanceRating}
          accountScore={accountScore}
          pdcaMetrics={pdcaMetrics}
        />

        {activeView === "ai" ? (
          <>
            <AIPredictionAnalysis
              monthlyReview={monthlyReview}
              selectedMonth={selectedMonth}
              planSummaryText={planSummaryText}
              planSimulationSummary={planSimulationSummary}
              planHighlights={planHighlights}
              onPdcaMetricsUpdate={(metrics) => {
                setPdcaMetrics(metrics ?? null);
              }}
              onAlertsUpdate={(alerts) => setAiAlerts(alerts ?? [])}
              onPostTypeHighlightsUpdate={(highlights) =>
                setPostTypeHighlights(highlights ?? [])
              }
              onLoadingChange={undefined}
              onOverviewUpdated={undefined}
            />

            <RiskAlerts alerts={aiAlerts} />
            <PostTypeInsights highlights={postTypeHighlights} unifiedTotalPosts={unifiedTotalPosts} />
            <NextMonthFocusActions
              actions={reportSummary?.nextMonthFocusActions}
              userId={user?.uid ?? undefined}
              periodKey={selectedMonth}
              existingLogs={actionLogs}
              isLoading={actionLogsLoading}
              errorMessage={actionLogsError}
              onActionLogged={handleActionLogUpdate}
              planContext={planContextMeta}
            />
            <PostDeepDiveSection
              posts={reportSummary?.postDeepDive ?? reportSummary?.posts}
              patternHighlights={reportSummary?.patternHighlights}
              unifiedTotalPosts={unifiedTotalPosts}
            />
            {reportSummary?.abTestSummaries && reportSummary.abTestSummaries.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-none p-6 shadow-sm mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">A/Bテスト結果サマリー</p>
                    <p className="text-xs text-slate-500">
                      今月完了したテストの勝者と指標差分を表示します。
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  {reportSummary.abTestSummaries.map((test) => (
                    <div key={test.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/70">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{test.name}</p>
                          <p className="text-[11px] text-slate-500">
                            KPI: {test.primaryMetric || "未設定"}
                            {test.completedAt
                              ? ` / 完了: ${new Date(test.completedAt).toLocaleDateString("ja-JP")}`
                              : ""}
                          </p>
                        </div>
                        <span
                          className={`text-[11px] px-2 py-1 rounded-full border ${
                            test.status === "completed"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {test.status === "completed" ? "完了" : "実施中"}
                        </span>
                      </div>
                      {test.summary ? (
                        <p className="text-xs text-slate-600 mb-3">{test.summary}</p>
                      ) : null}
                      {test.variants && test.variants.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          {test.variants.map((variant, index) => (
                            <div
                              key={`${test.id}-variant-${index}`}
                              className={`rounded-md border p-3 ${
                                variant.result === "win"
                                  ? "border-emerald-200 bg-emerald-50/70"
                                  : variant.result === "lose"
                                    ? "border-slate-200 bg-white"
                                    : "border-slate-200 bg-white"
                              }`}
                            >
                              <p className="font-semibold text-slate-900">{variant.label}</p>
                              <p className="text-[11px] text-slate-500 mb-2">
                                {variant.result === "win"
                                  ? "勝者"
                                  : variant.result === "lose"
                                    ? "敗者"
                                    : "結果待ち"}
                              </p>
                              {variant.metrics ? (
                                <div className="space-y-1 text-[11px] text-slate-600">
                                  {variant.metrics.engagementRate !== undefined && (
                                    <p>ER: {variant.metrics.engagementRate?.toFixed?.(1) ?? "-"}%</p>
                                  )}
                                  {variant.metrics.saveRate !== undefined && (
                                    <p>保存率: {variant.metrics.saveRate?.toFixed?.(1) ?? "-"}%</p>
                                  )}
                                  {variant.metrics.reach !== undefined && (
                                    <p>リーチ: {variant.metrics.reach?.toLocaleString?.() ?? "-"}</p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-400">指標データ未入力</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <LearningReferenceCard learningContext={reportSummary?.learningContext} />
            {reportSummary?.personaHighlights && reportSummary.personaHighlights.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-none p-6 shadow-sm mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">ペルソナ別反応パターン</p>
                    <p className="text-xs text-slate-500">
                      今月反応が良かったセグメントと参照投稿を表示します。
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {reportSummary.personaHighlights.slice(0, 6).map((persona) => (
                    <div
                      key={`${persona.type}-${persona.segment}-${persona.postId}`}
                      className="border border-slate-200 rounded-md p-4 bg-slate-50/70"
                    >
                      <p className="text-xs text-slate-500 mb-1">
                        {persona.type === "gender" ? "性別" : "年代"}・投稿: {persona.postTitle}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {persona.segment} ({persona.value?.toFixed(1)}%)
                      </p>
                      {typeof persona.delta === "number" && (
                        <p
                          className={`text-[11px] font-semibold ${
                            persona.delta > 0 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          差分: {persona.delta > 0 ? "+" : ""}
                          {persona.delta.toFixed(1)}pt
                        </p>
                      )}
                      <p className="text-[11px] mt-1 text-slate-500">
                        {persona.status === "gold" ? "成功パターン" : "改善パターン"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <FeedbackSentimentCard summary={reportSummary?.feedbackSentiment} />
          </>
        ) : (
          <>
        <MetricsCards
          currentTotals={{
            totalLikes: currentTotals.totalLikes,
            totalComments: currentTotals.totalComments,
            totalShares: currentTotals.totalShares,
            totalReach: currentTotals.totalReach,
            totalFollowerChange: currentTotals.totalFollowerIncrease,
            totalPosts: currentTotals.totalPosts,
          }}
          previousTotals={{
            totalLikes: previousTotals.totalLikes,
            totalComments: previousTotals.totalComments,
            totalShares: previousTotals.totalShares,
            totalReach: previousTotals.totalReach,
            totalFollowerChange: previousTotals.totalFollowerIncrease,
            totalPosts: previousTotals.totalPosts,
          }}
          changes={{
            likesChange: changes.likesChange,
            commentsChange: changes.commentsChange,
            sharesChange: changes.sharesChange,
            reachChange: changes.reachChange,
            followerChange: changes.followerChange,
            postsChange: changes.postsChange,
          }}
        />

            <KPIDrilldownSection breakdowns={reportSummary?.kpiBreakdowns} />

        <DetailedStats
          accountScore={accountScore}
          performanceRating={performanceRating}
          previousPeriodData={previousPeriodData}
          reportSummary={
            reportSummary
              ? {
                  ...reportSummary,
                  totals: {
                    ...reportSummary.totals,
                    totalFollowerChange: reportSummary.totals.totalFollowerIncrease,
                  },
                  previousTotals: {
                    ...reportSummary.previousTotals,
                    totalFollowerChange: reportSummary.previousTotals.totalFollowerIncrease,
                  },
                }
              : null
          }
          getMonthDisplayName={getMonthDisplayName}
          selectedMonth={selectedMonth}
        />

            <VisualizationSection dailyScores={dailyScores} reportSummary={reportSummary} />
            {reportSummary?.timeSlotAnalysis && (
              <div className="mt-6">
                <TimeSlotHeatmap data={reportSummary.timeSlotAnalysis} />
              </div>
            )}

            <AdvancedAnalysis reportSummary={reportSummary} />

            <ContentPerformanceSection
              feedStats={reportSummary?.contentPerformance?.feed}
              reelStats={reportSummary?.contentPerformance?.reel}
            />
        <AudienceBreakdownSection
          feed={reportSummary?.contentPerformance?.feed?.audienceBreakdown}
          reel={reportSummary?.contentPerformance?.reel?.audienceBreakdown}
        />
          </>
        )}
      </div>
    </SNSLayout>
  );
}
