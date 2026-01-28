"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import SNSLayout from "../../components/sns-layout";
import { EmptyStateCard } from "../../components/ui/empty-state-card";
import { useAuth } from "../../contexts/auth-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { canAccessFeature } from "@/lib/plan-access";
import { authFetch } from "../../utils/authFetch";
import { actionLogsApi } from "@/lib/api";
import { getLearningPhaseLabel } from "@/utils/learningPhase";
import type { AIActionLog, AIReference, SnapshotReference } from "@/types/ai";
import type {
  PatternTag,
  PatternSummary,
  PostPatternInsights,
  PatternSignal,
  LearningTimelinePoint,
  TimelineChartPoint,
  FeedbackEntry,
  LearningBadge,
  PostInsight,
  MasterContextResponse,
  LearningContextCardData,
} from "./types";
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
  History,
  MessageCircle,
  Sparkles,
  Target,
  Calendar,
  Clock3,
  Award,
  RefreshCw,
  Zap,
  Scale,
  Compass,
  Activity,
  FlaskConical,
  Users,
  Brain,
  ChevronUp,
  ChevronDown,
  Bot,
} from "lucide-react";
import {
  sentimentLabelMap,
  sentimentColorMap,
  significanceLabelMap,
  significanceColorMap,
  renderSignificanceBadge,
  formatDateTime,
} from "./utils";
import { InfoTooltip } from "./components/InfoTooltip";
import { SuccessImprovementGallery } from "./components/SuccessImprovementGallery";
import { PostPatternLearningSection } from "./components/PostPatternLearningSection";
import { PostDeepDiveSection } from "./components/PostDeepDiveSection";

type ActionLogEntry = AIActionLog;

const tagMeta: Record<
  PatternTag,
  {
    label: string;
  description: string;
    caption: string;
    headerBg: string;
    iconTint: string;
    railClass?: string;
  }
> = {
  gold: {
    label: "成功パターン",
    description: "主観評価もKPIも高かった投稿群。次の投稿づくりにそのまま活かせる黄金パターンです。",
    caption: "再現性の高い勝ちパターン",
    headerBg: "bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50",
    iconTint: "text-orange-500",
    railClass: "bg-gradient-to-b from-orange-400 to-amber-200",
  },
  gray: {
    label: "満足度は高いが伸び悩む",
    description: "利用者の手応えは良いけれど指標の伸びが控えめ。少しの改善で伸びる“惜しい”投稿群です。",
    caption: "満足度◎ / KPI微調整",
    headerBg: "bg-gradient-to-r from-blue-50 via-slate-50 to-white",
    iconTint: "text-blue-600",
  },
  red: {
    label: "改善優先",
    description: "満足度も指標も厳しかった投稿。原因を見つけて次に活かすべき改善ポイントです。",
    caption: "優先的に原因を潰すゾーン",
    headerBg: "bg-gradient-to-r from-rose-50 via-orange-50 to-white",
    iconTint: "text-rose-600",
    railClass: "bg-gradient-to-b from-rose-400 to-amber-300",
  },
  neutral: {
    label: "参考パターン",
    description: "まだデータが少ない投稿。学びを蓄積すると特徴が見えてきます。",
    caption: "データ蓄積中",
    headerBg: "bg-slate-50",
    iconTint: "text-slate-600",
  },
};

export default function LearningDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { userProfile, loading: profileLoading } = useUserProfile();

  // すべてのHooksを早期リターンの前に定義
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
  const [actionLogPendingId, setActionLogPendingId] = useState<string | null>(null);
  const [actionLogError, setActionLogError] = useState<string | null>(null);
  const [sharedLearningContext, setSharedLearningContext] = useState<LearningContextCardData | null>(
    null
  );
  const [showAdvancedSections, setShowAdvancedSections] = useState(false);
  const [showOtherBadges, setShowOtherBadges] = useState(false);

  const isAuthReady = useMemo(() => Boolean(user?.uid), [user?.uid]);

  const actionLogMap = useMemo(() => {
    const map = new Map<string, ActionLogEntry>();
    actionHistory.forEach((entry) => {
      map.set(entry.actionId, entry);
    });
    return map;
  }, [actionHistory]);

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

  const handleActionLogToggle = useCallback(
    async ({
      actionId,
      title,
      focusArea,
      applied,
    }: {
      actionId: string;
      title: string;
      focusArea: string;
      applied: boolean;
    }) => {
      if (!user?.uid) {
        setActionLogError("アクションを更新するにはログインしてください。");
        return;
      }
      setActionLogPendingId(actionId);
      setActionLogError(null);
      try {
        await actionLogsApi.upsert({
          userId: user.uid,
          actionId,
          title,
          focusArea,
          applied,
        });
        const existing = actionLogMap.get(actionId);
        const updated: ActionLogEntry = {
          id: existing?.id ?? `${user.uid}_${actionId}`,
          actionId,
          title,
          focusArea,
          applied,
          resultDelta: existing?.resultDelta ?? null,
          feedback: existing?.feedback ?? "",
          createdAt: existing?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setActionHistory((prev) => {
          const others = prev.filter((entry) => entry.actionId !== actionId);
          return [updated, ...others];
        });
      } catch (error) {
        console.error("Action log toggle error:", error);
        setActionLogError("アクションの更新に失敗しました。時間をおいて再度お試しください。");
      } finally {
        setActionLogPendingId(null);
      }
    },
    [user?.uid, actionLogMap]
  );

  useEffect(() => {
    if (!isAuthReady || !user?.uid) {
      return;
    }

    let isCancelled = false;
    const fetchDashboardData = async () => {
      setIsContextLoading(true);
      setContextError(null);

      try {
        const params = new URLSearchParams({
          forceRefresh: "1", // 常に最新データを取得
          limit: "10",
        });

        const response = await authFetch(`/api/learning/dashboard?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Learning dashboard API error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "学習ダッシュボードデータの取得に失敗しました");
        }

        if (!isCancelled) {
          const data = result.data;
          
          // マスターコンテキストデータを設定
          setContextData(data);
          setPostInsights(data?.postInsights ?? {});
          setSharedLearningContext(data?.learningContext ?? null);

          // フィードバック履歴とアクション履歴を設定
          const mappedFeedback: FeedbackEntry[] = Array.isArray(data.feedbackHistory)
            ? data.feedbackHistory.map((entry: any) => ({
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
          const mappedActions: ActionLogEntry[] = Array.isArray(data.actionHistory)
            ? data.actionHistory.map((entry: any) => ({
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
        console.error("学習ダッシュボードデータ取得エラー:", error);
        if (!isCancelled) {
          const errorMessage =
            error instanceof Error ? error.message : "学習ダッシュボードデータの取得に失敗しました";
          setContextError(errorMessage);
          setContextData(null);
          setSharedLearningContext(null);
          setFeedbackHistory([]);
          setActionHistory([]);
        }
      } finally {
        if (!isCancelled) {
          setIsContextLoading(false);
        }
      }
    };

    fetchDashboardData();
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
    repeat: <RefreshCw className="h-5 w-5 text-slate-700" />,
    zap: <Zap className="h-5 w-5 text-orange-500" />,
    scale: <Scale className="h-5 w-5 text-slate-600" />,
    compass: <Compass className="h-5 w-5 text-blue-500" />,
    activity: <Activity className="h-5 w-5 text-rose-500" />,
    flask: <FlaskConical className="h-5 w-5 text-indigo-500" />,
    users: <Users className="h-5 w-5 text-fuchsia-500" />,
    brain: <Brain className="h-5 w-5 text-emerald-600" />,
    default: <Award className="h-5 w-5 text-slate-500" />,
  };

  const formatAchievementValue = (badge: LearningBadge) => {
    const currentValue =
      typeof badge.current === "number" ? Number(badge.current.toFixed(1)) : badge.current;
    switch (badge.id) {
      case "action-driver":
      case "rag-pilot":
        return `${Math.round(badge.current)}% / ${badge.target}%`;
      case "consistency-builder":
        return `${badge.current}ヶ月 / ${badge.target}ヶ月`;
      case "weekly-insight":
      case "feedback-streak":
        return `${badge.current}週 / ${badge.target}週`;
      case "action-impact":
      case "feedback-balance":
        return `${currentValue}pt / ${badge.target}pt`;
      default:
        return `${currentValue}件 / ${badge.target}件`;
    }
  };

  // フィードバック多様性バッジの詳細説明を生成
  const getFeedbackBalanceDetail = (badge: LearningBadge) => {
    // 最新のタイムラインポイントからフィードバック情報を取得
    const latestPoint = displayedTimeline.length > 0 ? displayedTimeline[displayedTimeline.length - 1] : null;
    if (latestPoint) {
      const positiveCount = Math.round(latestPoint.positiveRatePercent * latestPoint.feedbackCount / 100);
      const negativeCount = latestPoint.feedbackCount - positiveCount;
      return `最新${resolvedTimelineMode === "weekly" ? "週" : "月"}: ポジティブ${positiveCount}件 / ネガティブ${negativeCount}件（両方の最小値がポイントになります）`;
    }
    return null;
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

const goldSampleSignals = useMemo(() => {
  if (!patternInsights?.signals) {
    return [];
  }
  return patternInsights.signals
    .filter((signal) => signal.tag === "gold")
    .slice(0, 3);
  }, [patternInsights]);

  const topHashtagEntries = useMemo(() => {
    if (!patternInsights?.topHashtags) {
      return [];
    }
    return Object.entries(patternInsights.topHashtags).slice(0, 12);
  }, [patternInsights]);

  return (
    <SNSLayout customTitle="学習ダッシュボード" customDescription="AIがあなたの投稿から学習し、どんどん賢くなっていきます">
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 bg-white min-h-screen">
        <div className="space-y-6">
        {/* AIの成長状況セクション（最上部） */}
        <section className="border border-gray-100 bg-white p-8 rounded-lg shadow-sm">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#FF8A15] rounded flex items-center justify-center flex-shrink-0">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
                AIがあなたから学習中
              </h2>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              AIがあなたの投稿から学習し、どんどん賢くなっていきます
            </p>
          </div>

          {contextData ? (
            <div className="space-y-6">
              {/* 学習フェーズのプログレスバー */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">学習フェーズ</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {getLearningPhaseLabel(contextData.learningPhase)}
                  </span>
                </div>
                <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-gray-400 transition-all duration-700 ease-out"
                    style={{
                      width: `${
                        (() => {
                          const total = contextData.totalInteractions || 0;
                          // バックエンドのロジックに合わせて:
                          // initial: 0-3件 → 0-25%
                          // learning: 4-7件 → 25-50%
                          // optimized: 8-11件 → 50-75%
                          // master: 12件以上 → 75-100%
                          if (total >= 12) {
                            // 12件以上は75%から100%まで（12件で75%、20件で100%を想定）
                            return Math.min(100, 75 + ((total - 12) / 8) * 25);
                          } else if (total >= 8) {
                            // 8-11件: 50%から75%まで
                            return 50 + ((total - 8) / 4) * 25;
                          } else if (total >= 4) {
                            // 4-7件: 25%から50%まで
                            return 25 + ((total - 4) / 4) * 25;
                          } else {
                            // 0-3件: 0%から25%まで
                            return (total / 4) * 25;
                          }
                        })()
                      }%`,
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] text-gray-400">
                    <span>初期</span>
                    <span>成長期</span>
                    <span>成熟期</span>
                    <span>マスター期</span>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  {contextData.learningPhase === "initial" && (
                    <>あと{Math.max(0, 4 - (contextData.totalInteractions || 0))}件分析すると、成長期に進みます（現在: {contextData.totalInteractions || 0}件 / 4件）</>
                  )}
                  {contextData.learningPhase === "learning" && (
                    <>あと{Math.max(0, 8 - (contextData.totalInteractions || 0))}件分析すると、成熟期に進みます（現在: {contextData.totalInteractions || 0}件 / 8件）</>
                  )}
                  {contextData.learningPhase === "optimized" && (
                    <>あと{Math.max(0, 12 - (contextData.totalInteractions || 0))}件分析すると、マスター期に進みます（現在: {contextData.totalInteractions || 0}件 / 12件）</>
                  )}
                  {contextData.learningPhase === "master" && (
                    <>マスター期に到達しました。AIの提案が最高精度になっています。</>
                  )}
                </div>
              </div>

              {/* 統計情報 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-5">
                  <div className="text-xs text-gray-500 mb-2 font-medium">分析した投稿数</div>
                  <div className="text-3xl font-semibold text-gray-900 mb-2">
                    {contextData.totalInteractions || 0}
                    <span className="text-lg text-gray-500 ml-1">件</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    AIが学習した投稿の数
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-5">
                  <div className="text-xs text-gray-500 mb-2 font-medium">AIの記憶精度</div>
                  <div className="text-3xl font-semibold text-gray-900 mb-2">
                    {Math.round((contextData.ragHitRate || 0) * 100)}
                    <span className="text-lg text-gray-500 ml-1">%</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    過去の成功パターンを覚えている割合
                  </div>
                </div>
              </div>

              {/* あなた専用のAI - */}
              {(goldSignals.length > 0 || redSignals.length > 0 || achievements.length > 0) && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="mb-5">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">
                      このAIは、あなただけのために育っています
                    </h3>
                    <p className="text-sm text-gray-500">
                      あなたの投稿から学んだ、あなた専用の成功パターンと改善ポイントです
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {goldSignals.length > 0 && (
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="text-xs text-gray-500 mb-2 font-medium">成功パターン</div>
                        <div className="text-2xl font-semibold text-gray-900">
                          {goldSignals.length}
                          <span className="text-sm text-gray-500 ml-1">件</span>
                        </div>
                      </div>
                    )}
                    {redSignals.length > 0 && (
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="text-xs text-gray-500 mb-2 font-medium">改善ポイント</div>
                        <div className="text-2xl font-semibold text-gray-900">
                          {redSignals.length}
                          <span className="text-sm text-gray-500 ml-1">件</span>
                        </div>
                      </div>
                    )}
                    {achievements.length > 0 && (
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="text-xs text-gray-500 mb-2 font-medium">達成バッジ</div>
                        <div className="text-2xl font-semibold text-gray-900">
                          {achievements.filter((b) => (b.progress || 0) >= 100).length}
                          <span className="text-sm text-gray-500 ml-1">件</span>
                        </div>
                      </div>
                    )}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="text-xs text-gray-500 mb-2 font-medium">学習データ</div>
                      <div className="text-2xl font-semibold text-gray-900">
                        {contextData.totalInteractions || 0}
                        <span className="text-sm text-gray-500 ml-1">件</span>
                      </div>
                    </div>
                  </div>
                  {contextData.learningPhase !== "master" && (
                    <div className="mt-5 pt-5 border-t border-gray-200">
                      <p className="text-xs text-gray-600 text-center">
                        <span className="font-medium">もっと使うほど、AIがあなたに最適化されます</span>
                        <br className="mt-1" />
                        <span className="text-gray-500">
                          {contextData.learningPhase === "initial" && "あと" + Math.max(0, 4 - (contextData.totalInteractions || 0)) + "件で成長期に"}
                          {contextData.learningPhase === "learning" && "あと" + Math.max(0, 8 - (contextData.totalInteractions || 0)) + "件で成熟期に"}
                          {contextData.learningPhase === "optimized" && "あと" + Math.max(0, 12 - (contextData.totalInteractions || 0)) + "件でマスター期に"}
                          {"到達します"}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* AIの学習が進むと */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                <div className="text-sm font-semibold text-gray-900 mb-3">
                  AIの学習が進むと
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="text-gray-400 mr-2">•</span>
                    <span>より正確な提案ができるようになります</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gray-400 mr-2">•</span>
                    <span>あなたの成功パターンを自動で見つけます</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gray-400 mr-2">•</span>
                    <span>失敗を減らすアドバイスができます</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="w-5 h-5 border-2 border-[#ff8a15] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-sm">AIの学習状況を取得中...</span>
            </div>
          )}
        </section>

        {/* LearningReferenceCard コンポーネントは削除されました */}

        {/* 学習目標（3つのバッジ） */}
        <section className="border border-gray-100 bg-white p-8 mb-6 rounded-lg shadow-sm">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#FF8A15] rounded flex items-center justify-center flex-shrink-0">
                <Target className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
                AIを育てる3つのコツ
              </h2>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              この3つを続けるだけで、AIがあなた専用にどんどん賢くなります。
            </p>
          </div>

          {isContextLoading && achievements.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-700">
              <div className="w-5 h-5 border-2 border-[#ff8a15] border-t-transparent rounded-full animate-spin mr-2" />
              <span className="text-sm">バッジ情報を取得しています...</span>
            </div>
          ) : (
            <>
              {/* 優先バッジ（3つ） */}
              <div className="space-y-4 mb-6">
                {(() => {
                  // 優先バッジのIDリスト
                  const priorityBadgeIds = ["feedback-creator", "gold-master", "continuous-learning"];
                  
                  // バッジが存在しない場合でも、デフォルトのバッジ情報を表示
                  const priorityBadges = priorityBadgeIds.map((id) => {
                    const existingBadge = achievements.find((b) => b.id === id);
                    if (existingBadge) {
                      return existingBadge;
                    }
                    // バッジが存在しない場合は、デフォルトのバッジ情報を作成
                    const defaultBadges: Record<string, Partial<LearningBadge>> = {
                      "feedback-creator": {
                        id: "feedback-creator",
                        title: "気づきクリエイター",
                        description: "コメント付きフィードバックを10件蓄積",
                        icon: "message",
                        status: "in_progress",
                        progress: 0,
                        current: 0,
                        target: 10,
                        shortcuts: [{ label: "フィードバックを入力する", href: "/analytics/feed" }],
                      },
                      "gold-master": {
                        id: "gold-master",
                        title: "ゴールド投稿10件",
                        description: "成功パターンとして抽出されたゴールド投稿を10件以上蓄積",
                        icon: "crown",
                        status: "in_progress",
                        progress: 0,
                        current: 0,
                        target: 10,
                        shortcuts: [{ label: "投稿ラボで投稿を作成", href: "/instagram/lab/feed" }],
                      },
                      "continuous-learning": {
                        id: "continuous-learning",
                        title: "継続学習トラック",
                        description: "直近4ヶ月分の学習データが蓄積",
                        icon: "calendar",
                        status: "in_progress",
                        progress: 0,
                        current: 0,
                        target: 4,
                        shortcuts: [],
                      },
                    };
                    return defaultBadges[id] as LearningBadge;
                  });

                  return priorityBadges.map((badge, index) => {
                    const icon = badgeIconMap[badge.icon] ?? badgeIconMap.default;
                    const progressPercent = Math.round(Math.min(1, badge.progress) * 100);
                    const remaining = Math.max(0, badge.target - badge.current);
                    const badgeNumber = index + 1;

                    // バッジタイトルの翻訳
                    const badgeTitleMap: Record<string, string> = {
                      "feedback-creator": "気づきクリエイター",
                      "gold-master": "ゴールド投稿10件",
                      "continuous-learning": "継続学習トラック",
                    };

                    // バッジ説明の翻訳（コツとして表現）
                    const badgeDescriptionMap: Record<string, string> = {
                      "feedback-creator": "投稿に「良かった」「改善したい」とコメントを残すと、AIが何が良かったか・悪かったかを学習します",
                      "gold-master": "投稿を続けると、AIが成功パターンを見つけられます",
                      "continuous-learning": "継続的に使うと、AIがあなた専用に最適化されます",
                    };

                    return (
                      <div
                        key={badge.id}
                        className={`border border-gray-200 rounded-lg p-6 transition-all ${
                          badge.status === "earned"
                            ? "bg-gray-50 border-gray-300"
                            : "bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start gap-5">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-600 font-semibold text-sm">{badgeNumber}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="text-base font-semibold text-gray-900 leading-tight">
                                {badgeTitleMap[badge.id] || badge.title}
                              </h3>
                              {badge.status === "earned" && (
                                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex-shrink-0 ml-2">
                                  達成
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed mb-5">
                              {badgeDescriptionMap[badge.id] || badge.description}
                            </p>
                            <div className="mb-5">
                              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-700 ease-out ${
                                    badge.status === "earned" ? "bg-emerald-500" : "bg-gray-400"
                                  }`}
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                              <div className="mt-3 flex items-center justify-between text-xs">
                                <span className="text-gray-500 font-medium">
                                  {formatAchievementValue(badge)}
                                </span>
                                {badge.status !== "earned" && remaining > 0 && (
                                  <span className="text-gray-400">
                                    あと{remaining}{badge.id === "continuous-learning" ? "ヶ月" : "件"}
                                    {badge.id === "continuous-learning" && "（自動）"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* その他のバッジ（折りたたみ可能） */}
              {(() => {
                const priorityBadgeIds = ["feedback-creator", "gold-master", "continuous-learning"];
                const otherBadges = achievements.filter((b) => !priorityBadgeIds.includes(b.id));

                if (otherBadges.length === 0) return null;

                return (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowOtherBadges(!showOtherBadges)}
                      className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors py-2"
                    >
                      {showOtherBadges ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          <span>その他のバッジを閉じる</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          <span>その他のバッジを見る（{otherBadges.length}個）</span>
                        </>
                      )}
                    </button>
                    {showOtherBadges && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {otherBadges.map((badge) => {
                          const icon = badgeIconMap[badge.icon] ?? badgeIconMap.default;
                          const progressPercent = Math.round(Math.min(1, badge.progress) * 100);

                          return (
                            <div
                              key={badge.id}
                              className={`border p-4 ${
                                badge.status === "earned"
                                  ? "border-emerald-200 bg-emerald-50"
                                  : "border-gray-200 bg-gray-50"
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
                                      {badge.status === "earned" ? "達成！" : `${progressPercent}%`}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600 mt-1">{badge.description}</p>
                                  <div className="mt-3">
                                    <div className="h-2 w-full bg-white border border-gray-200">
                                      <div
                                        className={`h-[6px] ${
                                          badge.status === "earned" ? "bg-emerald-500" : "bg-slate-500"
                                        }`}
                                        style={{ width: `${progressPercent}%` }}
                                      />
                                    </div>
                                    <div className="mt-1 text-[11px] text-gray-500">
                                      {formatAchievementValue(badge)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </section>

        {/* 上級者向けセクション（折りたたみ可能） */}
        <section className="border border-gray-100 bg-white p-8 mb-6 rounded-lg shadow-sm">
          <button
            type="button"
            onClick={() => setShowAdvancedSections(!showAdvancedSections)}
            className="w-full flex items-center justify-between mb-6 py-2 hover:opacity-70 transition-opacity"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF8A15] rounded flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
                その他の分析（上級者向け）
              </h2>
            </div>
            {showAdvancedSections ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showAdvancedSections && (
            <div className="space-y-6">
              {/* 学習進捗タイムライン */}
              <div>
                <div className="flex items-start sm:items-center justify-between gap-4 mb-4 flex-col sm:flex-row">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-[#ff8a15] flex items-center justify-center flex-shrink-0">
                        <History className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">学習進捗タイムライン</h3>
                      <InfoTooltip text="月次・週次のフィードバック量やAI提案の採用率を追跡し、学習の定着度を確認できます。" />
                    </div>
                    <p className="mt-2 text-sm text-gray-700">
                      月次・週次のフィードバック量とAI提案の採用率を可視化しています。AIとの学習曲線を一緒に追いかけましょう。
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTimelineMode("monthly")}
                      className={`px-3 py-1 text-xs font-medium border transition-colors ${
                        resolvedTimelineMode === "monthly"
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      月次
                    </button>
                    <button
                      onClick={() => setTimelineMode("weekly")}
                      disabled={!hasWeeklyTimeline}
                      className={`px-3 py-1 text-xs font-medium border transition-colors ${
                        resolvedTimelineMode === "weekly"
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
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
            <div className="flex items-center justify-center py-10 text-gray-700">
              <div className="w-5 h-5 border-2 border-[#ff8a15] border-t-transparent rounded-full animate-spin mr-2" />
              <span className="text-sm">タイムラインを読み込んでいます...</span>
            </div>
          ) : contextError ? (
            <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {contextError}
            </div>
          ) : displayedTimeline.length === 0 ? (
            <EmptyStateCard
              icon={Clock3}
              title="学習タイムラインは準備中です"
              description={timelineEmptyDescription}
              actions={[
                { label: "投稿を分析する", href: "/analytics/feed" },
                { label: "AI提案を実行", href: "/instagram/report" },
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
                  <div className="border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-700 mb-1">
                      最新{resolvedTimelineMode === "weekly" ? "週" : "月"}のフィードバック
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {latestTimelinePoint.feedbackCount}
                      <span className="text-sm font-normal text-gray-700 ml-1">件</span>
                    </p>
                    <p className="text-xs text-gray-700 mt-2">
                      コメント付き {latestTimelinePoint.feedbackWithCommentCount}件 / ポジティブ率{" "}
                      {latestTimelinePoint.positiveRatePercent.toFixed(1)}%
                    </p>
                  </div>
                  <div className="border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-gray-700">AI提案の採用状況</p>
                      <InfoTooltip text="月次レポートや投稿ディープダイブセクションで「実行した」にチェックを入れると、ここに採用として記録されます。" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {latestTimelinePoint.appliedCount}
                      <span className="text-sm font-normal text-gray-700 ml-1">件採用</span>
                    </p>
                    <p className="text-xs text-gray-700 mt-2">
                      採用率 {latestTimelinePoint.adoptionRatePercent.toFixed(1)}% 
                      {latestTimelinePoint.actionCount > 0 && (
                        <span className="ml-1">({latestTimelinePoint.actionCount}件中)</span>
                      )}
                    </p>
                    {latestTimelinePoint.appliedCount === 0 && latestTimelinePoint.actionCount === 0 && (
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200">
                        <p className="text-[10px] text-blue-800 mb-1">
                          💡 採用を記録するには
                        </p>
                        <ul className="text-[10px] text-blue-700 space-y-0.5 list-disc list-inside">
                          <li>月次レポートのアクションプランで「実行した」にチェック</li>
                          <li>投稿ディープダイブの「次のアクション」でチェック</li>
                        </ul>
                        <Link
                          href="/instagram/report"
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold mt-1 inline-block"
                        >
                          月次レポートを見る →
                        </Link>
                      </div>
                    )}
                    {latestTimelinePoint.appliedCount > 0 && (
                      <Link
                        href="#history-section"
                        className="text-[10px] text-gray-600 hover:text-gray-800 mt-2 inline-block"
                      >
                        採用された提案の詳細を見る →
                      </Link>
                    )}
                  </div>
                  <div className="border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-700 mb-1">対象期間</p>
                    <p className="text-2xl font-bold text-gray-900">{latestTimelinePoint.label}</p>
                    <p className="text-xs text-gray-700 mt-2">
                      フィードバックとアクションを重ねるほど、AI提案があなたに最適化されます。
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}
              </div>

              {/* 投稿パターン学習 */}
              <PostPatternLearningSection
                patternInsights={patternInsights}
                patternCounts={patternCounts}
                goldSampleSignals={goldSampleSignals}
                topHashtagEntries={topHashtagEntries}
                isLoading={isContextLoading}
                error={contextError}
                tagMeta={tagMeta}
              />

              {/* 投稿ディープダイブ */}
              <PostDeepDiveSection
                signals={patternInsights?.signals ?? []}
                postInsights={postInsights}
                actionLogMap={actionLogMap}
                handleActionLogToggle={handleActionLogToggle}
                onGenerateInsight={handleGenerateInsight}
                generatingInsightId={generatingInsightId}
                actionLogPendingId={actionLogPendingId}
                actionLogError={actionLogError}
                isLoading={isContextLoading}
                error={contextError}
              />

            </div>
          )}
        </section>

        {/* 成功 & 改善投稿ギャラリー（メインセクション） */}
        <SuccessImprovementGallery
          goldSignals={goldSignals}
          redSignals={redSignals}
          patternInsights={patternInsights}
          isLoading={isContextLoading}
          error={contextError}
        />
      </div>
      </div>
    </SNSLayout>
  );
}

