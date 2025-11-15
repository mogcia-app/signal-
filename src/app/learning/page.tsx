"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import SNSLayout from "../../components/sns-layout";
import { LearningReferenceCard } from "../instagram/monthly-report/components/learning-reference-card";
import { EmptyStateCard } from "../../components/ui/empty-state-card";
import { useAuth } from "../../contexts/auth-context";
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
import { HistorySection } from "./components/HistorySection";

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
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [sharedLearningContext, setSharedLearningContext] = useState<LearningContextCardData | null>(
    null
  );

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
          setSharedLearningContext(result.data?.learningContext ?? null);
        }
      } catch (error) {
        console.error("マスターコンテキスト取得エラー:", error);
        if (!isCancelled) {
          setContextError(
            error instanceof Error ? error.message : "マスターコンテキストの取得に失敗しました"
          );
          setContextData(null);
          setSharedLearningContext(null);
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
                学習フェーズ:{" "}
                <span className="font-semibold text-gray-700">
                  {getLearningPhaseLabel(contextData.learningPhase)}
                </span>{" "}
                /
                RAG精度: <span className="font-semibold text-gray-700">{Math.round((contextData.ragHitRate || 0) * 100)}%</span> /
                蓄積分析: <span className="font-semibold text-gray-700">{contextData.totalInteractions}</span>件
              </div>
            ) : null}
          </div>
        </section>

        <LearningReferenceCard learningContext={sharedLearningContext} />

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
                const statusLabel =
                  badge.status === "earned" ? "達成済み" : `進行中（${progressPercent}%）`;

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
                        {badge.condition && (
                          <p className="text-[11px] text-slate-500 mt-2">{badge.condition}</p>
                        )}
                        {badge.shortcuts && badge.shortcuts.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {badge.shortcuts.map((shortcut) => (
                              <Link
                                key={`${badge.id}-${shortcut.label}`}
                                href={shortcut.href}
                                className="text-[11px] font-semibold text-slate-700 border border-slate-300 bg-white px-2.5 py-1 rounded-none hover:bg-slate-100 transition-colors"
                              >
                                {shortcut.label}
                              </Link>
                            ))}
                          </div>
                        )}
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

        <SuccessImprovementGallery
          goldSignals={goldSignals}
          redSignals={redSignals}
          patternInsights={patternInsights}
          isLoading={isContextLoading}
          error={contextError}
        />

        <PostPatternLearningSection
          patternInsights={patternInsights}
          patternCounts={patternCounts}
          goldSampleSignals={goldSampleSignals}
          topHashtagEntries={topHashtagEntries}
          isLoading={isContextLoading}
          error={contextError}
          tagMeta={tagMeta}
        />

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

        <HistorySection
          feedbackHistory={feedbackHistory}
          actionHistory={actionHistory}
          isLoading={isHistoryLoading}
          error={historyError}
        />

      </div>
    </SNSLayout>
  );
}

