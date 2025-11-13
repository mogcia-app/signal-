import React, { useState, useCallback, useMemo } from "react";
import { Brain, Loader2, Lightbulb, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../../../contexts/auth-context";
import { authFetch } from "../../../../utils/authFetch";

interface AIPredictionAnalysisProps {
  activeTab: "weekly" | "monthly";
  monthlyReview: Record<string, unknown> | null;
  selectedMonth?: string;
  selectedWeek?: string;
  onPdcaMetricsUpdate?: (metrics: AIAnalysisResult["pdcaMetrics"] | null) => void;
  onAlertsUpdate?: (alerts: AIAnalysisAlert[] | null) => void;
  onPostTypeHighlightsUpdate?: (
    highlights: AIAnalysisResult["postTypeHighlights"] | null
  ) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  onOverviewUpdated?: () => void;
}

export type AIAnalysisAlert = {
  id: string;
  metric: string;
  message: string;
  severity: "info" | "warning" | "critical";
  change?: number;
  value?: number;
};

export type AIAnalysisPostTypeHighlight = {
  id: string;
  type: string;
  label: string;
  status: "strong" | "neutral" | "weak";
  percentage: number;
  count: number;
  message: string;
};

export type AIAnalysisActionPlan = {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  focusArea: string;
  expectedImpact: string;
  recommendedActions: string[];
};

type PlanCheckpointStatus = "met" | "partial" | "missed" | "no_data";
type PlanReflectionStatus = "on_track" | "at_risk" | "off_track" | "no_plan";

interface PlanCheckpoint {
  label: string;
  target: string;
  actual: string;
  status: PlanCheckpointStatus;
}

interface PlanReflection {
  summary: string;
  status: PlanReflectionStatus;
  checkpoints: PlanCheckpoint[];
  nextSteps: string[];
}

interface AIPdcaMetrics {
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
}

const priorityStyles: Record<
  AIAnalysisActionPlan["priority"],
  { badge: string; text: string; label: string }
> = {
  high: {
    badge: "bg-red-100 text-red-700 border border-red-200",
    text: "text-red-700",
    label: "優先度: 高",
  },
  medium: {
    badge: "bg-amber-100 text-amber-700 border border-amber-200",
    text: "text-amber-700",
    label: "優先度: 中",
  },
  low: {
    badge: "bg-blue-100 text-blue-700 border border-blue-200",
    text: "text-blue-700",
    label: "優先度: 低",
  },
};

const planStatusMeta: Record<
  PlanReflectionStatus,
  { label: string; badge: string; description: string }
> = {
  on_track: {
    label: "計画順調",
    badge: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    description: "計画と実績が概ね一致しています。",
  },
  at_risk: {
    label: "要調整",
    badge: "bg-amber-100 text-amber-700 border border-amber-200",
    description: "一部未達やリスクが見られます。",
  },
  off_track: {
    label: "未達成",
    badge: "bg-red-100 text-red-700 border border-red-200",
    description: "計画から大きく乖離しています。",
  },
  no_plan: {
    label: "計画未設定",
    badge: "bg-slate-100 text-slate-600 border border-slate-200",
    description: "運用計画が未設定です。",
  },
};

const checkpointStatusLabels: Record<PlanCheckpointStatus, string> = {
  met: "達成",
  partial: "一部達成",
  missed: "未達",
  no_data: "未設定",
};

const checkpointStatusBadges: Record<PlanCheckpointStatus, string> = {
  met: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  partial: "bg-amber-100 text-amber-700 border border-amber-200",
  missed: "bg-red-100 text-red-700 border border-red-200",
  no_data: "bg-slate-100 text-slate-600 border border-slate-200",
};

interface AIAnalysisResult {
  predictions: {
    followerGrowth: { weekly: number; monthly: number };
    engagementRate: number;
    optimalPostingTime: string;
  };
  confidence: {
    score: number;
    dataPointCount: number;
    historicalHitRate: number;
  };
  pdcaMetrics: AIPdcaMetrics | null;
  alerts: AIAnalysisAlert[];
  postTypeHighlights: AIAnalysisPostTypeHighlight[];
  actionPlans: AIAnalysisActionPlan[];
  overview: {
    summary: string;
    highlights: Array<{
      label: string;
      value: string;
      change: string;
      context?: string;
    }>;
    watchouts: string[];
    planReflection?: PlanReflection | null;
  };
  insights: string[];
  recommendations: string[];
  summary: string;
  masterContext: {
    learningPhase: string;
    ragHitRate: number;
    totalInteractions: number;
    isOptimized: boolean;
  } | null;
  metadata: {
    period: string;
    date: string;
    dataPoints: number;
    confidenceScore?: number;
    historicalHitRate?: number;
    analysisTimestamp: string;
  };
}

export const AIPredictionAnalysis: React.FC<AIPredictionAnalysisProps> = ({
  activeTab,
  monthlyReview,
  selectedMonth,
  selectedWeek,
  onPdcaMetricsUpdate,
  onAlertsUpdate,
  onPostTypeHighlightsUpdate,
  onLoadingChange,
  onOverviewUpdated,
}) => {
  const { user } = useAuth();
  const isAuthReady = useMemo(() => Boolean(user), [user]);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isActionPlanExpanded, setIsActionPlanExpanded] = useState(false);
  // AI分析を実行
  const fetchAIAnalysis = useCallback(
    async (expandOnComplete: boolean = true) => {
    if (!isAuthReady || !user?.uid) {return;}

    setIsLoading(true);
    onLoadingChange?.(true);
    onPdcaMetricsUpdate?.(null);
    setError(null);
    setIsActionPlanExpanded(false);

    try {
      const period = activeTab;
      const date = activeTab === "weekly" ? selectedWeek : selectedMonth;

      if (!date) {
        throw new Error("日付が指定されていません");
      }

      console.log("🤖 AI分析開始:", { period, date });

      const params = new URLSearchParams({
        period,
        date,
        userId: user.uid,
      });

      const response = await authFetch(`/api/ai/monthly-analysis?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`AI分析API エラー: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setAnalysisResult(result.data);
        onPdcaMetricsUpdate?.(result.data?.pdcaMetrics ?? null);
        onAlertsUpdate?.(result.data?.alerts ?? null);
        onPostTypeHighlightsUpdate?.(result.data?.postTypeHighlights ?? null);
        onLoadingChange?.(false);
        onOverviewUpdated?.();
        if (expandOnComplete) {
          setIsExpanded(true);
        }
        console.log("✅ AI分析完了:", result.data);
      } else {
        onPdcaMetricsUpdate?.(null);
        onAlertsUpdate?.(null);
        onPostTypeHighlightsUpdate?.(null);
        onLoadingChange?.(false);
        throw new Error(result.error || "AI分析に失敗しました");
      }
    } catch (error) {
      console.error("❌ AI分析エラー:", error);
      setError(error instanceof Error ? error.message : "AI分析に失敗しました");
      onPdcaMetricsUpdate?.(null);
      onAlertsUpdate?.(null);
      onPostTypeHighlightsUpdate?.(null);
      onLoadingChange?.(false);
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
    },
    [
      isAuthReady,
      activeTab,
      selectedMonth,
      selectedWeek,
      user?.uid,
      onPdcaMetricsUpdate,
      onAlertsUpdate,
      onPostTypeHighlightsUpdate,
      onLoadingChange,
      onOverviewUpdated,
    ]
  );

  // AI分析実行ボタンのハンドラー
  const handleRunAnalysis = () => {
    setIsExpanded(true);
    fetchAIAnalysis(true);
  };

  // 分析結果を閉じる
  const handleCloseAnalysis = () => {
    setIsExpanded(false);
  };

  const sortedActionPlans = useMemo(() => {
    if (!analysisResult?.actionPlans || analysisResult.actionPlans.length === 0) {
      return [] as AIAnalysisActionPlan[];
    }
    const order: Record<AIAnalysisActionPlan["priority"], number> = {
      high: 0,
      medium: 1,
      low: 2,
    };
    return [...analysisResult.actionPlans].sort((a, b) => {
      if (order[a.priority] === order[b.priority]) {
        return a.focusArea.localeCompare(b.focusArea);
      }
      return order[a.priority] - order[b.priority];
    });
  }, [analysisResult?.actionPlans]);

  const planReflection = analysisResult?.overview?.planReflection ?? null;

  const hasAnalysisData = useMemo(() => {
    if (!analysisResult) {
      return false;
    }
    const dataPoints = analysisResult.metadata?.dataPoints ?? 0;
    if (dataPoints > 0) {
      return true;
    }
    if (analysisResult.overview?.summary && analysisResult.overview.summary.trim().length > 0) {
      return true;
    }
    if (analysisResult.overview?.highlights?.length) {
      return true;
    }
    if (analysisResult.overview?.watchouts?.length) {
      return true;
    }
    if (analysisResult.overview?.planReflection) {
      return true;
    }
    if (analysisResult.actionPlans?.length) {
      return true;
    }
    return false;
  }, [analysisResult]);

  return (
    <div className="mt-6 h-full">
      {/* AI予測分析 - 開閉式 */}
      <div className="bg-white rounded-none shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
        {/* ヘッダー部分 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-none flex items-center justify-center mr-3">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-black">AIまとめ</h2>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {!isExpanded ? (
                <button
                  onClick={handleRunAnalysis}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-none hover:from-orange-600 hover:to-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>分析中...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4" />
                      <span>AI分析を実行</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleCloseAnalysis}
                  className="flex items-center space-x-2 px-4 py-2 text-black hover:text-black hover:bg-gray-100 rounded-none transition-colors"
                >
                  <span>閉じる</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 分析結果部分 */}
        {isExpanded && (
          <div className="p-6 flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-orange-600 mr-2" />
                <span className="text-black">AI分析を実行中...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-none p-4">
                <div className="flex items-center">
                  <div className="w-5 h-5 text-red-600 mr-2">⚠️</div>
                  <span className="text-sm text-red-800">{error}</span>
                </div>
                <button
                  onClick={() => fetchAIAnalysis(true)}
                  className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                >
                  再試行
                </button>
              </div>
            ) : analysisResult ? (
              <div className="space-y-6">
                <div className="border border-gray-200 bg-gray-50 rounded-none p-6">
                  <h3 className="text-base font-semibold text-black mb-2">
                    今月のまとめ
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {hasAnalysisData && analysisResult.overview?.summary?.trim().length
                      ? analysisResult.overview.summary
                      : "投稿データが不足しているため、詳細なまとめを生成できませんでした。投稿とフィードバックを蓄積して再度AI分析を実行してください。"}
                  </p>
                </div>

                <div className="border border-gray-200 rounded-none p-6">
                  <h3 className="text-base font-semibold text-black mb-4">
                    先月との比較ハイライト
                  </h3>
                  {hasAnalysisData && analysisResult.overview?.highlights?.length ? (
                    <ul className="space-y-3">
                      {analysisResult.overview.highlights.map((highlight, index) => {
                        const isPositive = highlight.change.trim().startsWith("+");
                        const changeColor = isPositive ? "text-emerald-600" : "text-red-600";
                        return (
                          <li
                            key={`${highlight.label}-${index}`}
                            className="flex items-center justify-between border border-dashed border-gray-200 rounded-none p-3 bg-white"
                          >
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{highlight.label}</p>
                              {highlight.context && (
                                <p className="text-xs text-gray-500">{highlight.context}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-700">{highlight.value}</p>
                              <p className={`text-xs font-semibold ${changeColor}`}>{highlight.change}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">
                      投稿データがまだ十分ではありません。投稿・フィードバックを蓄積すると、主要指標の増減ハイライトが表示されます。
                    </p>
                  )}
                </div>

                <div className="border border-gray-200 rounded-none p-6 bg-white">
                  <h3 className="text-base font-semibold text-black mb-3">AI注目ポイント</h3>
                  {hasAnalysisData && analysisResult.overview?.watchouts?.length ? (
                    <>
                      <ul className="space-y-2">
                        {analysisResult.overview.watchouts.map((item, index) => (
                          <li key={index} className="text-sm text-gray-700 leading-relaxed">
                            {item}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-gray-500 mt-3">
                        詳細は下部の各セクションで確認できます。
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">
                      投稿データがまだありません。投稿が蓄積されるとAIがリスクや好調ポイントを表示します。
                    </p>
                  )}
                </div>

                <div className="border border-gray-200 rounded-none p-6 bg-white">
                  <h3 className="text-base font-semibold text-black mb-3">運用計画の振り返り</h3>
                  {planReflection ? (
                    <>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-none ${planStatusMeta[planReflection.status]?.badge ?? planStatusMeta.at_risk.badge}`}
                        >
                          {planStatusMeta[planReflection.status]?.label ?? planStatusMeta.at_risk.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {planStatusMeta[planReflection.status]?.description ?? ""}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed mt-3">
                        {planReflection.summary && planReflection.summary.trim().length > 0
                          ? planReflection.summary
                          : planReflection.status === "no_plan"
                            ? "運用計画が未設定のため、振り返りはまだ表示できません。"
                            : "AIによる振り返りを生成できませんでした。計画と実績を手動で確認してください。"}
                      </p>
                      {planReflection.checkpoints?.length ? (
                        <div className="mt-4">
                          <h4 className="text-xs font-semibold text-gray-600 mb-2">チェックポイント</h4>
                          <ul className="space-y-2">
                            {planReflection.checkpoints.map((checkpoint, index) => (
                              <li
                                key={`${checkpoint.label}-${index}`}
                                className="border border-dashed border-gray-200 rounded-none p-3 bg-gray-50 text-sm text-gray-700"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-semibold text-gray-800">{checkpoint.label}</span>
                                  <span
                                    className={`px-2 py-0.5 text-[11px] font-semibold rounded-none ${checkpointStatusBadges[checkpoint.status]}`}
                                  >
                                    {checkpointStatusLabels[checkpoint.status] ?? "未設定"}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                                  <div className="bg-white border border-gray-200 rounded-none p-2">
                                    <p className="font-semibold text-gray-700 mb-1">計画</p>
                                    <p>{checkpoint.target}</p>
                                  </div>
                                  <div className="bg-white border border-gray-200 rounded-none p-2">
                                    <p className="font-semibold text-gray-700 mb-1">実績</p>
                                    <p>{checkpoint.actual}</p>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {planReflection.nextSteps?.length ? (
                        <div className="mt-4">
                          <h4 className="text-xs font-semibold text-gray-600 mb-2">来月のアクション提案</h4>
                          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                            {planReflection.nextSteps.map((step, index) => (
                              <li key={`plan-next-${index}`}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">
                      投稿とフィードバックが蓄積されると、運用計画に対する振り返りが表示されます。
                    </p>
                  )}
                </div>

                <div className="border border-gray-200 rounded-none p-6 bg-white">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-orange-500" />
                        <h3 className="text-base font-semibold text-black">次のアクションプラン</h3>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        AIが総合分析を踏まえて優先度順に推奨アクションを整理しました。実行に時間がかかるものからチェックしてみましょう。
                      </p>
                    </div>
                    {sortedActionPlans.length > 0 ? (
                      <button
                        onClick={() => setIsActionPlanExpanded((prev) => !prev)}
                        className="self-start md:self-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 rounded-none transition-colors"
                      >
                        {isActionPlanExpanded ? "閉じる" : "AI推奨アクションを見る"}
                      </button>
                    ) : null}
                  </div>

                  {sortedActionPlans.length === 0 ? (
                    <div className="mt-4 border border-dashed border-gray-300 rounded-none p-4 bg-gray-50 text-sm text-gray-600">
                      {hasAnalysisData
                        ? "アクションプランを生成できませんでした。投稿データやフィードバックを増やした上で、再度AI分析を実行してみてください。"
                        : "投稿データがまだありません。投稿とフィードバックを蓄積するとAIがアクションプランを提案します。"}
                    </div>
                  ) : null}

                  {isActionPlanExpanded && sortedActionPlans.length > 0 ? (
                    <div className="mt-6 space-y-4">
                      {sortedActionPlans.map((plan) => {
                        const style = priorityStyles[plan.priority];
                        return (
                          <div key={plan.id} className="border border-gray-200 rounded-none p-5 bg-gray-50">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <Lightbulb className="w-5 h-5 text-orange-500" />
                                <div>
                                  <div className="text-sm font-semibold text-gray-800">{plan.title}</div>
                                  <div className="text-xs text-gray-500">{plan.focusArea}</div>
                                </div>
                              </div>
                              <span className={`px-3 py-1 text-xs font-semibold rounded-none ${style.badge}`}>
                                {style.label}
                              </span>
                            </div>

                            <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{plan.description}</p>

                            <div className="flex items-center space-x-2 mb-3">
                              <ArrowUpRight className={`w-4 h-4 ${style.text}`} />
                              <span className={`text-xs font-medium ${style.text}`}>{plan.expectedImpact}</span>
                            </div>

                            <div className="border border-dashed border-gray-300 rounded-none p-3 bg-white">
                              <p className="text-xs text-gray-500 mb-2">推奨アクション</p>
                              <ul className="space-y-2">
                                {plan.recommendedActions.map((action, index) => (
                                  <li key={`${plan.id}-action-${index}`} className="flex items-start space-x-2 text-sm text-gray-700">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                                    <span>{action}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

              </div>
            ) : (
              <div className="text-center py-8 text-black">
                <Brain className="w-16 h-16 mx-auto mb-4 text-black" />
                <p className="text-lg">AI分析を開始してください</p>
                <p className="text-sm mt-2">「AI分析を実行」ボタンをクリックして分析を開始します</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
