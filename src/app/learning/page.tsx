"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import SNSLayout from "../../components/sns-layout";
import { OverviewHistorySection } from "../instagram/monthly-report/components/OverviewHistorySection";
import { EmptyStateCard } from "../../components/ui/empty-state-card";
import { useAuth } from "../../contexts/auth-context";
import { authFetch } from "../../utils/authFetch";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import type { TooltipProps } from "recharts";
import {
  Crown,
  AlertTriangle,
  History,
  TrendingUp,
  MessageCircle,
  Target,
  Calendar,
  Sparkles,
  Clock3,
  Award,
  Info,
} from "lucide-react";

type PatternTag = "gold" | "gray" | "red" | "neutral";

interface PatternSummary {
  summary: string;
  keyThemes: string[];
  cautions: string[];
  suggestedAngles: string[];
}

interface PostPatternInsights {
  summaries: Partial<Record<PatternTag, PatternSummary>>;
  topHashtags: Record<string, number>;
  signals: PatternSignal[];
}

interface PatternSignal {
  postId: string;
  title: string;
  category: string;
  hashtags: string[];
  metrics: {
    reach: number;
    saves: number;
    likes: number;
    comments: number;
    shares: number;
    savesRate: number;
    commentsRate: number;
    likesRate: number;
    reachToFollowerRatio: number;
    velocityScore: number;
    totalEngagement: number;
    earlyEngagement: number | null;
    watchTimeSeconds: number | null;
    linkClicks: number | null;
    impressions: number | null;
  };
  comparisons: {
    reachDiff: number;
    engagementRateDiff: number;
    savesRateDiff: number;
    commentsRateDiff: number;
    clusterPerformanceDiff: number;
  };
  significance: {
    reach: "higher" | "lower" | "neutral";
    engagement: "higher" | "lower" | "neutral";
    savesRate: "higher" | "lower" | "neutral";
    commentsRate: "higher" | "lower" | "neutral";
  };
  cluster: {
    id: string;
    label: string;
    centroidDistance: number;
    baselinePerformance: number;
    similarPosts: Array<{
      postId: string;
      title: string;
      performanceScore: number;
      publishedAt: string | null;
    }>;
  };
  tag: PatternTag;
  kpiScore: number;
  engagementRate: number;
  sentimentScore: number;
  sentimentLabel: "positive" | "negative" | "neutral";
  feedbackCounts: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

interface LearningTimelinePoint {
  period: string;
  label: string;
  feedbackCount: number;
  positiveRate: number;
  actionCount: number;
  appliedCount: number;
  adoptionRate: number;
  feedbackWithCommentCount: number;
}

interface TimelineChartPoint extends LearningTimelinePoint {
  positiveRatePercent: number;
  adoptionRatePercent: number;
}

interface FeedbackEntry {
  id: string;
  postId?: string | null;
  sentiment: "positive" | "negative" | "neutral";
  comment: string;
  weight: number;
  createdAt: string | null;
}

interface ActionLogEntry {
  id: string;
  actionId: string;
  title: string;
  focusArea: string;
  applied: boolean;
  resultDelta: number | null;
  feedback: string;
  updatedAt: string | null;
}

interface LearningBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: "earned" | "in_progress";
  current: number;
  target: number;
  progress: number;
}

interface PostInsight {
  summary: string;
  strengths: string[];
  improvements: string[];
  nextActions: string[];
}

interface MasterContextResponse {
  learningPhase: "initial" | "learning" | "optimized" | "master";
  ragHitRate: number;
  totalInteractions: number;
  personalizedInsights: string[];
  recommendations: string[];
  postPatterns: PostPatternInsights | null;
  timeline: LearningTimelinePoint[] | null;
  weeklyTimeline: LearningTimelinePoint[] | null;
  achievements: LearningBadge[] | null;
  postInsights?: Record<string, PostInsight>;
}

const tagMeta: Record<
  PatternTag,
  { label: string; description: string; badgeClass: string; gradient: string }
> = {
  gold: {
    label: "成功パターン",
    description: "主観評価もKPIも高かった投稿群。次の投稿づくりにそのまま活かせる黄金パターンです。",
    badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-200",
    gradient: "from-yellow-100 to-yellow-50",
  },
  gray: {
    label: "満足度は高いが伸び悩む",
    description: "利用者の手応えは良いけれど指標の伸びが控えめ。少しの改善で伸びる“惜しい”投稿群です。",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    gradient: "from-slate-100 to-slate-50",
  },
  red: {
    label: "改善優先",
    description: "満足度も指標も厳しかった投稿。原因を見つけて次に活かすべき改善ポイントです。",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    gradient: "from-red-100 to-red-50",
  },
  neutral: {
    label: "参考パターン",
    description: "まだデータが少ない投稿。学びを蓄積すると特徴が見えてきます。",
    badgeClass: "bg-gray-100 text-gray-600 border-gray-200",
    gradient: "from-gray-100 to-gray-50",
  },
};

const InfoTooltip: React.FC<{ text: string }> = ({ text }) => {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((prev) => !prev)}
        className="ml-1 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
        aria-label={text}
      >
        <Info className="h-4 w-4" />
      </button>
      {open ? (
        <span className="absolute z-20 left-1/2 top-6 -translate-x-1/2 w-56 rounded-md border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-600 shadow-lg">
          {text}
        </span>
      ) : null}
    </span>
  );
};

export default function LearningDashboardPage() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isContextLoading, setIsContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [contextData, setContextData] = useState<MasterContextResponse | null>(null);
  const [postInsights, setPostInsights] = useState<Record<string, PostInsight>>({});
  const [generatingInsightId, setGeneratingInsightId] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [timelineMode, setTimelineMode] = useState<"monthly" | "weekly">("monthly");
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackEntry[]>([]);
  const [actionHistory, setActionHistory] = useState<ActionLogEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const isAuthReady = useMemo(() => Boolean(user?.uid), [user?.uid]);

  const renderTimelineTooltip = (props: TooltipProps<number, string>) => {
    const { active, payload, label } = props as TooltipProps<number, string> & {
      payload?: Array<{ payload: TimelineChartPoint }>;
      label?: string | number;
    };
    if (!active || !payload || payload.length === 0) {
      return null;
    }
    const timelinePoint = payload[0]?.payload as TimelineChartPoint | undefined;
    if (!timelinePoint) {
      return null;
    }
    return (
      <div className="rounded-none border border-gray-200 bg-white px-3 py-2 shadow-sm text-xs text-gray-700">
        <p className="font-semibold text-gray-900 mb-1">{label}</p>
        <p>フィードバック: {timelinePoint.feedbackCount}件</p>
        <p>コメント付き: {timelinePoint.feedbackWithCommentCount}件</p>
        <p>ポジティブ率: {timelinePoint.positiveRatePercent.toFixed(1)}%</p>
        <p>提案採用: {timelinePoint.appliedCount}件</p>
        <p>採用率: {timelinePoint.adoptionRatePercent.toFixed(1)}%</p>
      </div>
    );
  };

  const formatDateTime = (value: string | null) => {
    if (!value) {
      return "日時未設定";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "日時未設定";
    }
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderSignificanceBadge = (
    label: string,
    value: number,
    significance: "higher" | "lower" | "neutral"
  ) => (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-600">{label}</span>
      <span className={`font-semibold ${significanceColorMap[significance]}`}>
        {value > 0 ? "+" : ""}
        {Math.round(value * 100)}%
        <span className="ml-1 text-[10px] font-normal">{significanceLabelMap[significance]}</span>
      </span>
    </div>
  );

  const handleGenerateInsight = async (signal: PatternSignal) => {
    if (!user?.uid) {
      return;
    }
    setInsightError(null);
    setGeneratingInsightId(signal.postId);
    try {
      const response = await authFetch("/api/ai/post-insight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          postId: signal.postId,
        }),
      });

      if (!response.ok) {
        throw new Error(`投稿AIサマリーAPIエラー: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "投稿AIサマリーの生成に失敗しました");
      }

      setPostInsights((prev) => ({
        ...prev,
        [signal.postId]: result.data,
      }));
    } catch (error) {
      console.error("投稿AIサマリー生成エラー:", error);
      setInsightError(error instanceof Error ? error.message : "投稿AIサマリーの生成に失敗しました");
    } finally {
      setGeneratingInsightId(null);
    }
  };

  useEffect(() => {
    if (!isAuthReady || !user?.uid) {
      return;
    }

    let isCancelled = false;
    const fetchMasterContext = async () => {
      setIsContextLoading(true);
      setContextError(null);

      try {
        const params = new URLSearchParams({
          userId: user.uid,
        });
        if (refreshKey > 0) {
          params.set("forceRefresh", "1");
        }

        const response = await authFetch(`/api/ai/master-context?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Master context API error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "マスターコンテキストの取得に失敗しました");
        }

        if (!isCancelled) {
          setContextData(result.data);
          setPostInsights(result.data?.postInsights ?? {});
        }
      } catch (error) {
        console.error("マスターコンテキスト取得エラー:", error);
        if (!isCancelled) {
          setContextError(
            error instanceof Error ? error.message : "マスターコンテキストの取得に失敗しました"
          );
          setContextData(null);
        }
      } finally {
        if (!isCancelled) {
          setIsContextLoading(false);
        }
      }
    };

    fetchMasterContext();
    return () => {
      isCancelled = true;
    };
  }, [isAuthReady, user?.uid, refreshKey]);

  useEffect(() => {
    if (!isAuthReady || !user?.uid) {
      return;
    }

    let isCancelled = false;
    const fetchHistories = async () => {
      setIsHistoryLoading(true);
      setHistoryError(null);
      try {
        const params = new URLSearchParams({
          userId: user.uid,
          limit: "10",
        });
        if (refreshKey > 0) {
          params.set("forceRefresh", "1");
        }

        const [feedbackRes, actionRes] = await Promise.all([
          authFetch(`/api/ai/feedback?${params.toString()}`),
          authFetch(`/api/ai/action-logs?${params.toString()}`),
        ]);

        if (!feedbackRes.ok) {
          throw new Error(`Feedback history error: ${feedbackRes.status}`);
        }
        if (!actionRes.ok) {
          throw new Error(`Action history error: ${actionRes.status}`);
        }

        const feedbackJson = await feedbackRes.json();
        const actionJson = await actionRes.json();

        if (!feedbackJson.success) {
          throw new Error(feedbackJson.error || "フィードバック履歴の取得に失敗しました");
        }
        if (!actionJson.success) {
          throw new Error(actionJson.error || "アクション履歴の取得に失敗しました");
        }

        if (!isCancelled) {
          const mappedFeedback: FeedbackEntry[] = Array.isArray(feedbackJson.data)
            ? feedbackJson.data.map((entry: any) => ({
                id: String(entry.id ?? ""),
                postId: entry.postId ?? null,
                sentiment:
                  entry.sentiment === "positive" || entry.sentiment === "negative"
                    ? entry.sentiment
                    : "neutral",
                comment: entry.comment ?? "",
                weight: typeof entry.weight === "number" ? entry.weight : 1,
                createdAt: typeof entry.createdAt === "string" ? entry.createdAt : null,
              }))
            : [];
          const mappedActions: ActionLogEntry[] = Array.isArray(actionJson.data)
            ? actionJson.data.map((entry: any) => ({
                id: String(entry.id ?? ""),
                actionId: String(entry.actionId ?? ""),
                title: entry.title ?? "未設定",
                focusArea: entry.focusArea ?? "全体",
                applied: Boolean(entry.applied),
                resultDelta:
                  typeof entry.resultDelta === "number" ? Number(entry.resultDelta) : null,
                feedback: entry.feedback ?? "",
                updatedAt:
                  typeof entry.updatedAt === "string"
                    ? entry.updatedAt
                    : typeof entry.createdAt === "string"
                      ? entry.createdAt
                      : null,
              }))
            : [];
          setFeedbackHistory(mappedFeedback);
          setActionHistory(mappedActions);
        }
      } catch (error) {
        console.error("学習履歴取得エラー:", error);
        if (!isCancelled) {
          setHistoryError(error instanceof Error ? error.message : "履歴の取得に失敗しました");
        }
      } finally {
        if (!isCancelled) {
          setIsHistoryLoading(false);
        }
      }
    };

    fetchHistories();
    return () => {
      isCancelled = true;
    };
  }, [isAuthReady, user?.uid, refreshKey]);

  const patternInsights = contextData?.postPatterns;

  const monthlyTimeline: TimelineChartPoint[] = useMemo(() => {
    if (!contextData?.timeline || contextData.timeline.length === 0) {
      return [];
    }
    return contextData.timeline.map((point) => {
      const positiveRatePercent = Math.round((point.positiveRate || 0) * 1000) / 10;
      const adoptionRatePercent = Math.round((point.adoptionRate || 0) * 1000) / 10;
      return {
        ...point,
        positiveRatePercent,
        adoptionRatePercent,
      } as TimelineChartPoint;
    });
  }, [contextData?.timeline]);

  const weeklyTimeline: TimelineChartPoint[] = useMemo(() => {
    if (!contextData?.weeklyTimeline || contextData.weeklyTimeline.length === 0) {
      return [];
    }
    return contextData.weeklyTimeline.map((point) => {
      const positiveRatePercent = Math.round((point.positiveRate || 0) * 1000) / 10;
      const adoptionRatePercent = Math.round((point.adoptionRate || 0) * 1000) / 10;
      return {
        ...point,
        positiveRatePercent,
        adoptionRatePercent,
      } as TimelineChartPoint;
    });
  }, [contextData?.weeklyTimeline]);

  const hasWeeklyTimeline = weeklyTimeline.length > 0;
  const resolvedTimelineMode =
    timelineMode === "weekly" && !hasWeeklyTimeline ? "monthly" : timelineMode;
  const displayedTimeline =
    resolvedTimelineMode === "weekly" ? weeklyTimeline : monthlyTimeline;
  const latestTimelinePoint =
    displayedTimeline.length > 0 ? displayedTimeline[displayedTimeline.length - 1] : null;
  const timelineEmptyDescription =
    resolvedTimelineMode === "weekly"
      ? "週次データがまだありません。フィードバックやアクションログが週次で蓄積されると可視化されます。"
      : "まだ学習タイムラインを描画するためのデータが不足しています。投稿へのフィードバックや提案の実行ログを重ねていきましょう。";

  const achievements = contextData?.achievements ?? [];

  const badgeIconMap: Record<string, ReactNode> = {
    crown: <Crown className="h-5 w-5 text-amber-500" />,
    message: <MessageCircle className="h-5 w-5 text-sky-500" />,
    sparkle: <Sparkles className="h-5 w-5 text-purple-500" />,
    target: <Target className="h-5 w-5 text-emerald-500" />,
    calendar: <Calendar className="h-5 w-5 text-slate-600" />,
    clock: <Clock3 className="h-5 w-5 text-indigo-500" />,
    default: <Award className="h-5 w-5 text-slate-500" />,
  };

  const formatAchievementValue = (badge: LearningBadge) => {
    switch (badge.id) {
      case "action-driver":
        return `${badge.current}% / ${badge.target}%`;
      case "consistency-builder":
        return `${badge.current}ヶ月 / ${badge.target}ヶ月`;
      case "weekly-insight":
        return `${badge.current}週 / ${badge.target}週`;
      default:
        return `${badge.current}件 / ${badge.target}件`;
    }
  };

  const goldSignals = useMemo(
    () =>
      (patternInsights?.signals ?? [])
        .filter((signal) => signal.tag === "gold")
        .slice(0, 3),
    [patternInsights?.signals]
  );

  const redSignals = useMemo(
    () =>
      (patternInsights?.signals ?? [])
        .filter((signal) => signal.tag === "red")
        .slice(0, 3),
    [patternInsights?.signals]
  );

  const sentimentLabelMap: Record<PatternSignal["sentimentLabel"], string> = {
    positive: "ポジティブ",
    negative: "ネガティブ",
    neutral: "ニュートラル",
  };

  const sentimentColorMap: Record<PatternSignal["sentimentLabel"], string> = {
    positive: "text-emerald-600",
    negative: "text-red-600",
    neutral: "text-slate-600",
  };

  const significanceLabelMap: Record<"higher" | "lower" | "neutral", string> = {
    higher: "平均よりも高い",
    lower: "平均より低い",
    neutral: "平均付近",
  };

  const significanceColorMap: Record<"higher" | "lower" | "neutral", string> = {
    higher: "text-emerald-600",
    lower: "text-red-600",
    neutral: "text-slate-600",
  };

  const patternCounts = useMemo(() => {
    const counts: Record<PatternTag, number> = {
      gold: 0,
      gray: 0,
      red: 0,
      neutral: 0,
    };

    patternInsights?.signals.forEach((signal) => {
      counts[signal.tag] = (counts[signal.tag] || 0) + 1;
    });

    return counts;
  }, [patternInsights]);

  const topHashtagEntries = useMemo(() => {
    if (!patternInsights?.topHashtags) {
      return [];
    }
    return Object.entries(patternInsights.topHashtags).slice(0, 12);
  }, [patternInsights]);

  return (
    <SNSLayout customTitle="学習ダッシュボード" customDescription="AIと一緒に成長するための学習ログと振り返り">
      <div className="space-y-6">
        <section className="border border-gray-200 bg-white rounded-none p-6">
          <h2 className="text-lg font-semibold text-black mb-3">AIとの学習状況</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            AIが生成したサマリーや提案、あなたのフィードバックがどのように蓄積されているかを確認できます。
            今後、投稿への主観的評価や提案実行率などもここで追跡できる予定です。
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              onClick={() => setRefreshKey((prev) => prev + 1)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-none transition-colors"
            >
              最新の履歴を再取得
            </button>
            {contextData ? (
              <div className="text-xs text-gray-500">
                学習フェーズ: <span className="font-semibold text-gray-700">{contextData.learningPhase}</span> /
                RAG精度: <span className="font-semibold text-gray-700">{Math.round((contextData.ragHitRate || 0) * 100)}%</span> /
                蓄積分析: <span className="font-semibold text-gray-700">{contextData.totalInteractions}</span>件
              </div>
            ) : null}
          </div>
        </section>

        <section className="border border-gray-200 bg-white rounded-none p-6">
          <div className="flex items-start sm:items-center justify-between gap-4 mb-4 flex-col sm:flex-row">
            <div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                <h2 className="text-lg font-semibold text-black">学習バッジ</h2>
                <InfoTooltip text="ゴールド投稿数やフィードバック件数など、AIとの学習進捗に応じてアンロックされるバッジです。" />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                AIとの学習度合いや活用状況に応じてバッジがアンロックされます。進捗を確認し、次のマイルストーンを目指しましょう。
              </p>
            </div>
          </div>
          {isContextLoading && achievements.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-slate-600">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-2" />
              <span className="text-sm">バッジ情報を取得しています...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((badge) => {
                const icon = badgeIconMap[badge.icon] ?? badgeIconMap.default;
                const progressPercent = Math.round(Math.min(1, badge.progress) * 100);
                const rawRemaining = Math.max(0, badge.target - badge.current);
                const unit =
                  badge.id === "action-driver"
                    ? "%"
                    : badge.id === "consistency-builder"
                      ? "ヶ月"
                      : badge.id === "weekly-insight"
                        ? "週"
                        : "件";
                const remainingDisplay =
                  badge.id === "action-driver" ? Math.ceil(rawRemaining) : Math.max(0, Math.round(rawRemaining));
                const statusLabel =
                  badge.status === "earned" ? "達成済み" : `あと${remainingDisplay}${unit}`;

                return (
                  <div
                    key={badge.id}
                    className={`border rounded-none p-4 ${
                      badge.status === "earned" ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-800">{badge.title}</h3>
                          <span
                            className={`text-[11px] font-semibold ${
                              badge.status === "earned" ? "text-emerald-600" : "text-slate-500"
                            }`}
                          >
                            {badge.status === "earned" ? "達成！" : "進行中"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{badge.description}</p>
                        <div className="mt-3">
                          <div className="h-2 w-full bg-white border border-gray-200">
                            <div
                              className={`h-[6px] ${badge.status === "earned" ? "bg-emerald-500" : "bg-slate-500"}`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                            <span>{formatAchievementValue(badge)}</span>
                            <span>{statusLabel}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {achievements.length === 0 ? (
                <div className="border border-gray-200 bg-white rounded-none p-4 text-xs text-gray-500">
                  まだバッジはありません。投稿とフィードバックを重ねて最初のバッジを獲得しましょう。
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="border border-gray-200 bg-white rounded-none p-6">
          <div className="flex items-start sm:items-center justify-between gap-4 mb-4 flex-col sm:flex-row">
            <div>
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-slate-600" />
                <h2 className="text-lg font-semibold text-black">学習進捗タイムライン</h2>
                <InfoTooltip text="月次・週次のフィードバック量やAI提案の採用率を追跡し、学習の定着度を確認できます。" />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                月次・週次のフィードバック量とAI提案の採用率を可視化しています。AIとの学習曲線を一緒に追いかけましょう。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTimelineMode("monthly")}
                className={`px-3 py-1 text-xs font-medium border transition-colors ${
                  resolvedTimelineMode === "monthly"
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                月次
              </button>
              <button
                onClick={() => setTimelineMode("weekly")}
                disabled={!hasWeeklyTimeline}
                className={`px-3 py-1 text-xs font-medium border transition-colors ${
                  resolvedTimelineMode === "weekly"
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-600 border-gray-200 hover:bg-gray-50"
                } ${!hasWeeklyTimeline ? "opacity-50 cursor-not-allowed" : ""}`}
                title={
                  hasWeeklyTimeline
                    ? undefined
                    : "週次データが蓄積されると表示できるようになります"
                }
              >
                週次
              </button>
            </div>
          </div>

          {isContextLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-600">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-2" />
              <span className="text-sm">タイムラインを読み込んでいます...</span>
            </div>
          ) : contextError ? (
            <div className="border border-red-200 bg-red-50 rounded-none p-4 text-sm text-red-700">
              {contextError}
            </div>
          ) : displayedTimeline.length === 0 ? (
            <EmptyStateCard
              icon={Clock3}
              title="学習タイムラインは準備中です"
              description={timelineEmptyDescription}
              actions={[
                { label: "投稿を分析する", href: "/analytics/feed" },
                { label: "AI提案を実行", href: "/instagram/monthly-report" },
              ]}
            />
          ) : (
            <div className="space-y-6">
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={displayedTimeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" stroke="#475569" />
                    <YAxis
                      stroke="#475569"
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip content={renderTimelineTooltip} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="positiveRatePercent"
                      name="ポジティブ率"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="adoptionRatePercent"
                      name="提案採用率"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {latestTimelinePoint ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="border border-gray-200 bg-gray-50 rounded-none p-4">
                    <p className="text-xs text-gray-500 mb-1">
                      最新{resolvedTimelineMode === "weekly" ? "週" : "月"}のフィードバック
                    </p>
                    <p className="text-2xl font-semibold text-gray-800">
                      {latestTimelinePoint.feedbackCount}
                      <span className="text-sm font-normal text-gray-500 ml-1">件</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      コメント付き {latestTimelinePoint.feedbackWithCommentCount}件 / ポジティブ率{" "}
                      {latestTimelinePoint.positiveRatePercent.toFixed(1)}%
                    </p>
                  </div>
                  <div className="border border-gray-200 bg-gray-50 rounded-none p-4">
                    <p className="text-xs text-gray-500 mb-1">AI提案の採用状況</p>
                    <p className="text-2xl font-semibold text-gray-800">
                      {latestTimelinePoint.appliedCount}
                      <span className="text-sm font-normal text-gray-500 ml-1">件採用</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      採用率 {latestTimelinePoint.adoptionRatePercent.toFixed(1)}%
                    </p>
                  </div>
                  <div className="border border-gray-200 bg-gray-50 rounded-none p-4">
                    <p className="text-xs text-gray-500 mb-1">対象期間</p>
                    <p className="text-2xl font-semibold text-gray-800">{latestTimelinePoint.label}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      フィードバックとアクションを重ねるほど、AI提案があなたに最適化されます。
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="border border-gray-200 bg-white rounded-none p-6">
          <div className="flex items-start sm:items-center justify-between gap-4 mb-4 flex-col sm:flex-row">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                <h2 className="text-lg font-semibold text-black">成功 & 改善投稿ギャラリー</h2>
                <InfoTooltip text="ゴールド投稿（成功パターン）とレッド投稿（改善余地があるパターン）を一覧で確認できます。" />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                ゴールド（成功）とレッド（改善が必要）投稿をピックアップしました。AIが学習したポイントを振り返り、次の投稿に活かしましょう。
              </p>
            </div>
          </div>

          {isContextLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-600">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-2" />
              <span className="text-sm">投稿パターンを分析中です...</span>
            </div>
          ) : contextError ? (
            <div className="border border-red-200 bg-red-50 rounded-none p-4 text-sm text-red-700">
              {contextError}
            </div>
          ) : !patternInsights || patternInsights.signals.length === 0 ? (
            <EmptyStateCard
              icon={Sparkles}
              title="投稿パターンを蓄積していきましょう"
              description="投稿やフィードバックが集まると、成功・改善パターンをAIが自動で抽出します。まずは投稿記録とフィードバック入力を続けましょう。"
              actions={[
                { label: "投稿一覧を見る", href: "/instagram/posts" },
                { label: "フィードバックを入力", href: "/analytics/feed" },
              ]}
            />
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-gray-800">成功パターン（GOLD）</h3>
                </div>
                {goldSignals.length === 0 ? (
                  <EmptyStateCard
                    icon={Sparkles}
                    tone="info"
                    align="left"
                    title="ゴールドパターンはまだありません"
                    description="高評価と成果がそろった投稿が蓄積されると、ここに成功パターンが並びます。引き続き投稿とフィードバックを重ねていきましょう。"
                    actions={[{ label: "投稿を振り返る", href: "/instagram/posts" }]}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {goldSignals.map((signal) => {
                      const analyticsHref = signal.postId
                        ? signal.category === "reel"
                          ? `/instagram/analytics/reel?postId=${signal.postId}`
                          : `/analytics/feed?postId=${signal.postId}`
                        : "#";
                      return (
                        <div
                          key={`gold-${signal.postId}`}
                          className="border border-amber-200 bg-amber-50 rounded-none p-4"
                        >
                        <p className="text-xs font-semibold text-amber-700 mb-1">
                          {signal.category.toUpperCase()}
                        </p>
                        <h4 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-2">
                          {signal.title || "タイトル未設定"}
                        </h4>
                        <div className="space-y-1">
                          <div className="text-xs text-gray-600">
                            KPIスコア: {signal.kpiScore.toFixed(2)} / エンゲージ率: {signal.engagementRate.toFixed(2)}%
                          </div>
                          <div className="text-xs text-gray-600">
                            保存率: {(signal.metrics.savesRate * 100).toFixed(1)}% / コメント率: {(signal.metrics.commentsRate * 100).toFixed(1)}%
                          </div>
                          <div className="space-y-1 mt-2">
                            {renderSignificanceBadge("リーチ差分", signal.comparisons.reachDiff, signal.significance.reach)}
                            {renderSignificanceBadge("エンゲージ差分", signal.comparisons.engagementRateDiff, signal.significance.engagement)}
                            {renderSignificanceBadge("保存率差分", signal.comparisons.savesRateDiff, signal.significance.savesRate)}
                          </div>
                        </div>
                        <p
                          className={`text-xs font-medium ${sentimentColorMap[signal.sentimentLabel]}`}
                        >
                          {sentimentLabelMap[signal.sentimentLabel]} ({signal.sentimentScore.toFixed(2)})
                        </p>
                        {signal.hashtags.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {signal.hashtags.slice(0, 4).map((tag) => (
                              <span
                                key={`${signal.postId}-${tag}`}
                                className="px-2 py-1 text-[11px] font-medium bg-white border border-amber-200 text-amber-700 rounded-none"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {signal.postId ? (
                            <>
                              <Link
                                href={`/instagram/posts/${signal.postId}`}
                                target="_blank"
                                className="text-[11px] font-semibold text-amber-700 border border-amber-200 bg-white px-3 py-1 rounded-none hover:bg-amber-100 transition-colors"
                              >
                                投稿詳細を見る
                              </Link>
                              <Link
                                href={analyticsHref}
                                target="_blank"
                                className="text-[11px] font-semibold text-slate-700 border border-slate-300 bg-white px-3 py-1 rounded-none hover:bg-slate-100 transition-colors"
                              >
                                分析で開く
                              </Link>
                            </>
                          ) : (
                            <span className="text-[11px] text-gray-400">関連する投稿IDがありません</span>
                          )}
                        </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <h3 className="text-sm font-semibold text-gray-800">改善優先パターン（RED）</h3>
                </div>
                {redSignals.length === 0 ? (
                  <EmptyStateCard
                    icon={AlertTriangle}
                    tone="warning"
                    align="left"
                    title="改善優先パターンはまだありません"
                    description="改善すべき投稿が蓄積されると、注意すべきポイントがここに表示されます。気になる投稿にはフィードバックを残しておきましょう。"
                    actions={[{ label: "分析ページを開く", href: "/analytics/feed" }]}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {redSignals.map((signal) => {
                      const analyticsHref = signal.postId
                        ? signal.category === "reel"
                          ? `/instagram/analytics/reel?postId=${signal.postId}`
                          : `/analytics/feed?postId=${signal.postId}`
                        : "#";
                      return (
                        <div
                          key={`red-${signal.postId}`}
                          className="border border-red-200 bg-red-50 rounded-none p-4"
                        >
                        <p className="text-xs font-semibold text-red-600 mb-1">
                          {signal.category.toUpperCase()}
                        </p>
                        <h4 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-2">
                          {signal.title || "タイトル未設定"}
                        </h4>
                        <div className="space-y-1">
                          <div className="text-xs text-gray-600">
                            KPIスコア: {signal.kpiScore.toFixed(2)} / エンゲージ率: {signal.engagementRate.toFixed(2)}%
                          </div>
                          <div className="text-xs text-gray-600">
                            保存率: {(signal.metrics.savesRate * 100).toFixed(1)}% / コメント率: {(signal.metrics.commentsRate * 100).toFixed(1)}%
                          </div>
                          <div className="space-y-1 mt-2">
                            {renderSignificanceBadge("リーチ差分", signal.comparisons.reachDiff, signal.significance.reach)}
                            {renderSignificanceBadge("エンゲージ差分", signal.comparisons.engagementRateDiff, signal.significance.engagement)}
                            {renderSignificanceBadge("保存率差分", signal.comparisons.savesRateDiff, signal.significance.savesRate)}
                          </div>
                        </div>
                        <p
                          className={`text-xs font-medium ${sentimentColorMap[signal.sentimentLabel]}`}
                        >
                          {sentimentLabelMap[signal.sentimentLabel]} ({signal.sentimentScore.toFixed(2)})
                        </p>
                        {signal.hashtags.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {signal.hashtags.slice(0, 4).map((tag) => (
                              <span
                                key={`${signal.postId}-${tag}`}
                                className="px-2 py-1 text-[11px] font-medium bg-white border border-red-200 text-red-600 rounded-none"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {signal.postId ? (
                            <>
                              <Link
                                href={`/instagram/posts/${signal.postId}`}
                                target="_blank"
                                className="text-[11px] font-semibold text-red-600 border border-red-200 bg-white px-3 py-1 rounded-none hover:bg-red-100 transition-colors"
                              >
                                投稿詳細を見る
                              </Link>
                              <Link
                                href={analyticsHref}
                                target="_blank"
                                className="text-[11px] font-semibold text-slate-700 border border-slate-300 bg-white px-3 py-1 rounded-none hover:bg-slate-100 transition-colors"
                              >
                                分析で開く
                              </Link>
                            </>
                          ) : (
                            <span className="text-[11px] text-gray-400">関連する投稿IDがありません</span>
                          )}
                        </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="border border-gray-200 bg-white rounded-none p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-black">投稿パターン学習</h2>
              <p className="text-sm text-gray-600">
                KPIと満足度の両面から自動抽出した投稿パターンです。成功パターンを再現しつつ、惜しい投稿の改善点を確認できます。
              </p>
            </div>
          </div>

          {isContextLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-600">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-2" />
              <span className="text-sm">投稿パターンを学習中です...</span>
            </div>
          ) : contextError ? (
            <div className="border border-red-200 bg-red-50 rounded-none p-4 text-sm text-red-700">
              {contextError}
            </div>
          ) : !patternInsights || Object.keys(patternInsights.summaries || {}).length === 0 ? (
            <EmptyStateCard
              icon={Target}
              tone="info"
              title="投稿パターンの抽出はこれから"
              description="投稿結果とフィードバックが十分に蓄積されると、AIが成功・惜しい・改善のパターンを自動で整理します。まずは記録を重ねていきましょう。"
              actions={[{ label: "投稿一覧を見る", href: "/instagram/posts" }]}
            />
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["gold", "gray", "red"] as PatternTag[]).map((tag) => {
                  const summary = patternInsights.summaries?.[tag];
                  const count = patternCounts[tag] || 0;
                  if (!summary && count === 0) {
                    return null;
                  }
                  const meta = tagMeta[tag];
                  return (
                    <div
                      key={tag}
                      className={`border border-gray-200 rounded-none p-4 bg-gradient-to-br ${meta.gradient}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-semibold px-2 py-1 border ${meta.badgeClass}`}>
                          {meta.label}
                        </span>
                        <span className="text-xs text-gray-500">件数: {count}</span>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">
                        {summary?.summary?.trim() || meta.description}
                      </p>
                      {summary?.keyThemes?.length ? (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">共通点</p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {summary.keyThemes.slice(0, 3).map((theme, idx) => (
                              <li key={`${tag}-theme-${idx}`}>・{theme}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {summary?.suggestedAngles?.length ? (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">次に活かす視点</p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {summary.suggestedAngles.slice(0, 2).map((angle, idx) => (
                              <li key={`${tag}-angle-${idx}`}>・{angle}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {summary?.cautions?.length && tag !== "gold" ? (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">注意点</p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {summary.cautions.slice(0, 2).map((item, idx) => (
                              <li key={`${tag}-caution-${idx}`}>・{item}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {topHashtagEntries.length ? (
                <div className="border border-dashed border-gray-300 rounded-none p-4 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-600 mb-2">
                    よく使われたハッシュタグ（重み順）
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {topHashtagEntries.map(([tag, weight]) => (
                      <span
                        key={`hashtag-${tag}`}
                        className="px-3 py-1 text-xs font-medium bg-white border border-gray-200 rounded-none text-gray-700"
                      >
                        #{tag} <span className="text-[11px] text-gray-500">×{weight.toFixed(2)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="border border-gray-200 bg-white rounded-none p-6">
          <div className="flex items-start sm:items-center justify-between gap-4 mb-4 flex-col sm:flex-row">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-slate-600" />
                <h2 className="text-lg font-semibold text-black">投稿ディープダイブ</h2>
                <InfoTooltip text="各投稿の詳細な指標と次の改善アクションを表示します。" />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                投稿ごとの指標やクラスタ比較を深掘りし、AIが導き出した強み・改善点・次の一手を確認できます。
              </p>
            </div>
          </div>

          {isContextLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-600">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-2" />
              <span className="text-sm">投稿ディープダイブを読み込んでいます...</span>
            </div>
          ) : contextError ? (
            <div className="border border-red-200 bg-red-50 rounded-none p-4 text-sm text-red-700">
              {contextError}
            </div>
          ) : !patternInsights || patternInsights.signals.length === 0 ? (
            <EmptyStateCard
              icon={History}
              tone="info"
              title="投稿ディープダイブはまだ準備中"
              description="投稿の分析データとフィードバックが増えると、ここにディープダイブカードが生成されます。まずはレポートや分析画面から記録を増やしてみましょう。"
              actions={[{ label: "分析ページを開く", href: "/analytics/feed" }]}
            />
          ) : (
            <div className="space-y-4">
              {patternInsights.signals.slice(0, 10).map((signal) => {
                const analyticsHref = signal.postId
                  ? signal.category === "reel"
                    ? `/instagram/analytics/reel?postId=${signal.postId}`
                    : `/analytics/feed?postId=${signal.postId}`
                  : "#";
                const insight = postInsights[signal.postId];
                const significance = signal.significance ?? {
                  reach: "neutral",
                  engagement: "neutral",
                  savesRate: "neutral",
                  commentsRate: "neutral",
                };
                const metrics = {
                  savesRate: signal.metrics?.savesRate ?? 0,
                  commentsRate: signal.metrics?.commentsRate ?? 0,
                  totalEngagement: signal.metrics?.totalEngagement ?? 0,
                };
                const comparisons = {
                  reachDiff: signal.comparisons?.reachDiff ?? 0,
                  engagementRateDiff: signal.comparisons?.engagementRateDiff ?? 0,
                  savesRateDiff: signal.comparisons?.savesRateDiff ?? 0,
                  commentsRateDiff: signal.comparisons?.commentsRateDiff ?? 0,
                  clusterPerformanceDiff: signal.comparisons?.clusterPerformanceDiff ?? 0,
                };
                const cluster = {
                  label: signal.cluster?.label ?? "分析中",
                  baselinePerformance: signal.cluster?.baselinePerformance ?? 0,
                  similarPosts: Array.isArray(signal.cluster?.similarPosts)
                    ? signal.cluster?.similarPosts ?? []
                    : [],
                };

                return (
                  <div
                    key={`deep-${signal.postId}`}
                    className="border border-gray-200 bg-white rounded-none p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">{signal.category.toUpperCase()}</p>
                        <h3 className="text-sm font-semibold text-gray-800 mb-2">
                          {signal.title || "タイトル未設定"}
                        </h3>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                          <span>KPI: {signal.kpiScore.toFixed(2)}</span>
                          <span>エンゲージ率: {signal.engagementRate.toFixed(2)}%</span>
                          <span>保存率: {(metrics.savesRate * 100).toFixed(1)}%</span>
                          <span>コメント率: {(metrics.commentsRate * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="text-right space-y-1 text-xs text-gray-500">
                        <div>
                          クラスタ: <span className="font-semibold text-gray-700">{cluster.label}</span>
                        </div>
                        <div>
                          同クラスタ比較: {Math.round(comparisons.clusterPerformanceDiff * 100)}%
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                          {signal.postId ? (
                            <>
                              <Link
                                href={`/instagram/posts/${signal.postId}`}
                                target="_blank"
                                className="text-[11px] font-semibold text-slate-700 border border-slate-300 bg-white px-3 py-1 rounded-none hover:bg-slate-100 transition-colors"
                              >
                                投稿詳細を見る
                              </Link>
                              <Link
                                href={analyticsHref}
                                target="_blank"
                                className="text-[11px] font-semibold text-slate-700 border border-slate-300 bg-white px-3 py-1 rounded-none hover:bg-slate-100 transition-colors"
                              >
                                分析で開く
                              </Link>
                            </>
                          ) : (
                            <span className="text-[11px] text-gray-400">関連する投稿IDがありません</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs text-gray-600">
                      <div className="border border-dashed border-gray-200 rounded-none p-3 bg-gray-50">
                        <p className="font-semibold text-gray-700 mb-2">指標の強み</p>
                        {renderSignificanceBadge("リーチ差分", comparisons.reachDiff, significance.reach)}
                        {renderSignificanceBadge(
                          "エンゲージ差分",
                          comparisons.engagementRateDiff,
                          significance.engagement
                        )}
                        {renderSignificanceBadge(
                          "保存率差分",
                          comparisons.savesRateDiff,
                          significance.savesRate
                        )}
                      </div>
                      <div className="border border-dashed border-gray-200 rounded-none p-3 bg-gray-50">
                        <p className="font-semibold text-gray-700 mb-2">クラスタと類似投稿</p>
                        <p className="mb-1">
                          ベースライン: {cluster.baselinePerformance.toFixed(2)} / 現在: {metrics.totalEngagement}
                        </p>
                        {cluster.similarPosts.length ? (
                          <ul className="space-y-1 list-disc list-inside">
                            {cluster.similarPosts.map((similar) => (
                              <li key={`${signal.postId}-similar-${similar.postId}`}>
                                {similar.title} ({similar.performanceScore.toFixed(2)})
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500">類似投稿はまだありません。</p>
                        )}
                      </div>
                      <div className="border border-dashed border-gray-200 rounded-none p-3 bg-gray-50">
                        <p className="font-semibold text-gray-700 mb-2">AIサマリー</p>
                        <p className="text-gray-600 mb-2">
                          {insight?.summary ?? "AI要約を生成するには、まずフィードバックと分析データを蓄積してください。"}
                        </p>
                        {insight?.strengths?.length ? (
                          <div className="mb-2">
                            <p className="font-semibold text-gray-700">強み</p>
                            <ul className="list-disc list-inside text-gray-600">
                              {insight.strengths.map((item, idx) => (
                                <li key={`${signal.postId}-strength-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {insight?.improvements?.length ? (
                          <div className="mb-2">
                            <p className="font-semibold text-gray-700">改善ポイント</p>
                            <ul className="list-disc list-inside text-gray-600">
                              {insight.improvements.map((item, idx) => (
                                <li key={`${signal.postId}-improve-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {insight?.nextActions?.length ? (
                          <div>
                            <p className="font-semibold text-gray-700">次のアクション</p>
                            <ul className="list-disc list-inside text-gray-600">
                              {insight.nextActions.map((item, idx) => (
                                <li key={`${signal.postId}-next-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleGenerateInsight(signal)}
                            disabled={generatingInsightId === signal.postId}
                            className="text-[11px] font-semibold text-white bg-slate-700 px-3 py-1 rounded-none hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {generatingInsightId === signal.postId
                              ? "生成中..."
                              : insight
                                ? "AIサマリーを再生成"
                                : "AIサマリーを生成"}
                          </button>
                          {insight && (
                            <span className="text-[11px] text-gray-500">最終更新: リアルタイム生成</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="border border-gray-200 bg-white rounded-none p-6">
          <div className="flex items-start sm:items-center justify-between gap-4 mb-4 flex-col sm:flex-row">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-slate-600" />
                <h2 className="text-lg font-semibold text-black">フィードバック & アクション履歴</h2>
                <InfoTooltip text="最近のフィードバックやAI提案の実行ログを確認し、何が学習に反映されているかを把握できます。" />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                最新のフィードバックと、実行されたAI提案の記録です。学習ループがどのように活用されているかを振り返りましょう。
              </p>
            </div>
          </div>

          {isHistoryLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-600">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-2" />
              <span className="text-sm">履歴を取得しています...</span>
            </div>
          ) : historyError ? (
            <div className="border border-red-200 bg-red-50 rounded-none p-4 text-sm text-red-700">
              {historyError}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3">最近のフィードバック</h3>
                {feedbackHistory.length === 0 ? (
                  <EmptyStateCard
                    icon={MessageCircle}
                    align="left"
                    title="フィードバック履歴がまだありません"
                    description="投稿分析ページから「良かった」「改善したい」などのフィードバックを残すと、ここに履歴が蓄積されます。"
                    actions={[{ label: "分析ページを開く", href: "/analytics/feed" }]}
                  />
                ) : (
                  <ul className="space-y-3">
                    {feedbackHistory.map((entry) => (
                      <li
                        key={`feedback-${entry.id}`}
                        className="border border-gray-200 bg-gray-50 rounded-none p-3 text-xs text-gray-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`font-semibold ${
                              entry.sentiment === "positive"
                                ? "text-emerald-600"
                                : entry.sentiment === "negative"
                                  ? "text-red-600"
                                  : "text-slate-600"
                            }`}
                          >
                            {entry.sentiment === "positive"
                              ? "ポジティブ"
                              : entry.sentiment === "negative"
                                ? "ネガティブ"
                                : "ニュートラル"}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {formatDateTime(entry.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">
                          重み: {entry.weight.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-700 whitespace-pre-wrap">
                          {entry.comment ? entry.comment : "コメントなし"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3">アクション実行ログ</h3>
                {actionHistory.length === 0 ? (
                  <EmptyStateCard
                    icon={Target}
                    align="left"
                    title="アクション実行ログがまだありません"
                    description="AI提案カードから「実行した」ログを残すと、提案の採用状況がここに集計されます。"
                    actions={[{ label: "AI提案を見る", href: "/instagram/monthly-report" }]}
                  />
                ) : (
                  <ul className="space-y-3">
                    {actionHistory.map((entry) => (
                      <li
                        key={`action-${entry.id}`}
                        className="border border-gray-200 bg-white rounded-none p-3 text-xs text-gray-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-800">{entry.title}</span>
                          <span className="text-[11px] text-gray-500">
                            {formatDateTime(entry.updatedAt)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">フォーカス: {entry.focusArea}</p>
                        <p className="text-xs text-gray-600 mb-1">
                          採用状況:{" "}
                          <span className={entry.applied ? "text-emerald-600 font-semibold" : "text-slate-600"}>
                            {entry.applied ? "実行済み" : "検討中"}
                          </span>
                          {typeof entry.resultDelta === "number"
                            ? ` / 効果: ${entry.resultDelta > 0 ? "+" : ""}${entry.resultDelta.toFixed(1)}%`
                            : ""}
                        </p>
                        {entry.feedback ? (
                          <p className="text-xs text-gray-700 whitespace-pre-wrap">
                            メモ: {entry.feedback}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>

        <OverviewHistorySection period="monthly" refreshKey={refreshKey} hasRequested={true} />

        <OverviewHistorySection period="weekly" refreshKey={refreshKey} hasRequested={true} />
      </div>
    </SNSLayout>
  );
}

