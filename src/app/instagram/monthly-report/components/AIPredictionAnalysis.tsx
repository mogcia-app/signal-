import React, { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { Brain, Loader2, Lightbulb, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../../../contexts/auth-context";
import { authFetch } from "../../../../utils/authFetch";
import type { AIGenerationResponse } from "@/types/ai";


interface PlanHighlightItem {
  type: "focus" | "content";
  label: string;
  comment: string;
}

interface PlanSimulationSummary {
  requiredPerMonth: number;
  actualPosts: number;
  analyzedPosts: number;
  unregisteredPosts: number;
  remainingToGoal: number;
}

interface AIPredictionAnalysisProps {
  monthlyReview: Record<string, unknown> | null;
  selectedMonth: string;
  /** 今月の目標サマリー（運用計画から生成された安定テキスト） */
  planSummaryText?: string | null;
  /** 運用計画から生成された具体的なフォーカス/投稿内容のハイライト */
  planHighlights?: PlanHighlightItem[];
  /** Plan＆KPIコンソールから計算された投稿シミュレーション進捗サマリー */
  planSimulationSummary?: PlanSimulationSummary | null;
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
  planStrategyReview?: string; // 計画の「取り組みたいこと」「投稿したい内容」に対する総評
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

const LAB_DEFAULT_LINK = "/instagram/lab/feed?from=monthly-report";
const LEARNING_LINK = "/learning";

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
  summary: string;
  generation?: AIGenerationResponse | null;
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
  monthlyReview,
  selectedMonth,
  planSummaryText,
  planHighlights,
  planSimulationSummary,
  onPdcaMetricsUpdate,
  onAlertsUpdate,
  onPostTypeHighlightsUpdate,
  onLoadingChange,
  onOverviewUpdated,
}) => {
  const { user } = useAuth();
  const isAuthReady = useMemo(() => Boolean(user), [user]);
  
  // ローカルストレージから分析結果を復元
  const getStoredAnalysisResult = useCallback((month: string) => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(`monthly-analysis-result-${month}`);
      if (stored) {
        return JSON.parse(stored) as AIAnalysisResult;
      }
    } catch {
      // パースエラーは無視
    }
    return null;
  }, []);

  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(() =>
    getStoredAnalysisResult(selectedMonth)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ローカルストレージから展開状態を復元
  const getStoredExpandedState = useCallback((month: string) => {
    if (typeof window === "undefined") return false;
    try {
      const stored = localStorage.getItem(`monthly-reflection-expanded-${month}`);
      return stored === "true";
    } catch {
      return false;
    }
  }, []);

  const [isExpanded, setIsExpanded] = useState(() => getStoredExpandedState(selectedMonth));
  const [isActionPlanExpanded, setIsActionPlanExpanded] = useState(false);

  // 実行済みアクションプランをローカルストレージから復元
  const getStoredCompletedActionPlans = useCallback((month: string) => {
    if (typeof window === "undefined") return new Set<string>();
    try {
      const stored = localStorage.getItem(`completed-action-plans-${month}`);
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        return new Set(ids);
      }
    } catch {
      // パースエラーは無視
    }
    return new Set<string>();
  }, []);

  const [completedActionPlans, setCompletedActionPlans] = useState<Set<string>>(() =>
    getStoredCompletedActionPlans(selectedMonth)
  );

  // 実行済みアクションプランをローカルストレージに保存
  const toggleActionPlanCompleted = useCallback(
    (planId: string) => {
      setCompletedActionPlans((prev) => {
        const next = new Set(prev);
        if (next.has(planId)) {
          next.delete(planId);
        } else {
          next.add(planId);
        }
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(
              `completed-action-plans-${selectedMonth}`,
              JSON.stringify(Array.from(next))
            );
          } catch {
            // ストレージエラーは無視
          }
        }
        return next;
      });
    },
    [selectedMonth]
  );

  // 月が変わったら実行済みアクションプランを復元
  useEffect(() => {
    const stored = getStoredCompletedActionPlans(selectedMonth);
    setCompletedActionPlans(stored);
  }, [selectedMonth, getStoredCompletedActionPlans]);

  // 展開状態をローカルストレージに保存
  const setExpandedWithStorage = useCallback((expanded: boolean) => {
    setIsExpanded(expanded);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`monthly-reflection-expanded-${selectedMonth}`, String(expanded));
      } catch {
        // ストレージエラーは無視
      }
    }
  }, [selectedMonth]);

  // 月が変わったら展開状態と分析結果を復元
  useEffect(() => {
    const storedExpanded = getStoredExpandedState(selectedMonth);
    setIsExpanded(storedExpanded);
    const storedResult = getStoredAnalysisResult(selectedMonth);
    if (storedResult) {
      setAnalysisResult(storedResult);
      // 復元した分析結果のコールバックも実行
      onPdcaMetricsUpdate?.(storedResult?.pdcaMetrics ?? null);
      onAlertsUpdate?.(storedResult?.alerts ?? null);
      onPostTypeHighlightsUpdate?.(storedResult?.postTypeHighlights ?? null);
    } else {
      setAnalysisResult(null);
    }
  }, [selectedMonth, getStoredExpandedState, getStoredAnalysisResult, onPdcaMetricsUpdate, onAlertsUpdate, onPostTypeHighlightsUpdate]);
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
      const period = "monthly";
      const date = selectedMonth;

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
        // APIレスポンスにHTMLタグが含まれているかチェック
        const checkForHtmlTags = (obj: unknown, path = ""): string[] => {
          const htmlTagPaths: string[] = [];
          if (!obj || typeof obj !== "object") return htmlTagPaths;
          
          for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (typeof value === "string" && /<[^>]*>/.test(value)) {
              htmlTagPaths.push(currentPath);
              console.warn(`[AI分析API] HTMLタグ検出: ${currentPath}`, value.substring(0, 200));
            } else if (Array.isArray(value)) {
              value.forEach((item, index) => {
                if (typeof item === "string" && /<[^>]*>/.test(item)) {
                  htmlTagPaths.push(`${currentPath}[${index}]`);
                  console.warn(`[AI分析API] HTMLタグ検出: ${currentPath}[${index}]`, item.substring(0, 200));
                } else if (typeof item === "object" && item !== null) {
                  htmlTagPaths.push(...checkForHtmlTags(item, `${currentPath}[${index}]`));
                }
              });
            } else if (typeof value === "object" && value !== null) {
              htmlTagPaths.push(...checkForHtmlTags(value, currentPath));
            }
          }
          return htmlTagPaths;
        };
        
        const htmlTagPaths = checkForHtmlTags(result.data, "aiAnalysis");
        if (htmlTagPaths.length > 0) {
          console.error(`[警告] AI分析APIレスポンスに${htmlTagPaths.length}個のHTMLタグが含まれています:`, htmlTagPaths);
        }
        
        setAnalysisResult(result.data);
        // 分析結果をローカルストレージに保存
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(
              `monthly-analysis-result-${selectedMonth}`,
              JSON.stringify(result.data)
            );
          } catch {
            // ストレージエラーは無視
          }
        }
        onPdcaMetricsUpdate?.(result.data?.pdcaMetrics ?? null);
        onAlertsUpdate?.(result.data?.alerts ?? null);
        onPostTypeHighlightsUpdate?.(result.data?.postTypeHighlights ?? null);
        onLoadingChange?.(false);
        onOverviewUpdated?.();
        if (expandOnComplete) {
          setExpandedWithStorage(true);
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
      selectedMonth,
      user?.uid,
      onPdcaMetricsUpdate,
      onAlertsUpdate,
      onPostTypeHighlightsUpdate,
      onLoadingChange,
      onOverviewUpdated,
      setExpandedWithStorage,
    ]
  );

  // AI分析実行ボタンのハンドラー
  const handleRunAnalysis = () => {
    setExpandedWithStorage(true);
    fetchAIAnalysis(true);
  };

  // 分析結果を閉じる
  const handleCloseAnalysis = () => {
    setExpandedWithStorage(false);
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
                <h2 className="text-lg font-semibold text-black">今月の振り返り</h2>
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
                      <span>今月の振り返りを見る</span>
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
                {/* 今月のまとめカードは表示しない */}

                <div className="border border-gray-200 rounded-none p-6 bg-white">
                  <h3 className="text-base font-semibold text-black mb-1">運用計画の振り返り</h3>
                  {planSimulationSummary && planSimulationSummary.requiredPerMonth > 0 && (
                    <div className="mt-2 mb-3 border border-dashed border-slate-200 bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold text-slate-700 mb-2">
                        投稿シミュレーション進捗
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                        <div>
                          <p className="text-[10px] text-slate-500">Planで必要</p>
                          <p className="font-semibold">
                            {planSimulationSummary.requiredPerMonth}件 / 月
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">今月の投稿実績</p>
                          <p className="font-semibold">
                            {planSimulationSummary.actualPosts}件
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">分析入力済み</p>
                          <p className="font-semibold">
                            {planSimulationSummary.analyzedPosts}件
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">未登録</p>
                          <p className="font-semibold">
                            {planSimulationSummary.unregisteredPosts}件
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-600">
                        あと {planSimulationSummary.remainingToGoal}件でシミュレーション目標に到達。
                        分析データ化済みは {planSimulationSummary.analyzedPosts}件です。
                      </p>
                    </div>
                  )}
                  {planReflection?.planStrategyReview && planReflection.planStrategyReview.trim().length > 0 && (
                    <div className="mt-3 mb-2 border border-dashed border-slate-200 rounded-none p-4 bg-slate-50">
                      <p className="text-[11px] font-semibold text-slate-700 mb-2">計画の総評</p>
                      <div
                        className="text-sm text-slate-800 leading-relaxed whitespace-pre-line"
                        dangerouslySetInnerHTML={{
                          __html: String(planReflection.planStrategyReview || ""),
                        }}
                      />
                    </div>
                  )}
                </div>

                {sortedActionPlans.length > 0 ? (
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
                      <button
                        onClick={() => setIsActionPlanExpanded((prev) => !prev)}
                        className="self-start md:self-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 rounded-none transition-colors"
                      >
                        {isActionPlanExpanded ? "閉じる" : "AI推奨アクションを見る"}
                      </button>
                    </div>

                    {isActionPlanExpanded ? (
                      <div className="mt-6 space-y-4">
                        {sortedActionPlans.map((plan) => {
                          const style = priorityStyles[plan.priority];
                          const isCompleted = completedActionPlans.has(plan.id);
                          return (
                            <div
                              key={plan.id}
                              className={`border border-gray-200 rounded-none p-5 ${
                                isCompleted ? "bg-gray-100 opacity-75" : "bg-gray-50"
                              }`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-3 flex-1">
                                  <button
                                    type="button"
                                    onClick={() => toggleActionPlanCompleted(plan.id)}
                                    className="flex-shrink-0 mt-0.5"
                                    aria-label={isCompleted ? "実行済みを解除" : "実行済みにする"}
                                  >
                                    {isCompleted ? (
                                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    ) : (
                                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full hover:border-emerald-500 transition-colors" />
                                    )}
                                  </button>
                                  <Lightbulb className={`w-5 h-5 ${isCompleted ? "text-gray-400" : "text-orange-500"}`} />
                                  <div className="flex-1">
                                    <div
                                      className={`text-sm font-semibold ${
                                        isCompleted ? "text-gray-500 line-through" : "text-gray-800"
                                      }`}
                                    >
                                      <span
                                        dangerouslySetInnerHTML={{
                                          __html: String(plan.title || ""),
                                        }}
                                      />
                                    </div>
                                    <div
                                      className="text-xs text-gray-500"
                                      dangerouslySetInnerHTML={{
                                        __html: String(plan.focusArea || ""),
                                      }}
                                    />
                                  </div>
                                </div>
                                <span
                                  className={`px-3 py-1 text-xs font-semibold rounded-none ${style.badge}`}
                                  dangerouslySetInnerHTML={{
                                    __html: String(style.label || ""),
                                  }}
                                />
                              </div>

                              <p
                                className={`text-sm mb-3 whitespace-pre-wrap ${
                                  isCompleted ? "text-gray-500" : "text-gray-700"
                                }`}
                              >
                                <span
                                  dangerouslySetInnerHTML={{
                                    __html: String(plan.description || ""),
                                  }}
                                />
                              </p>

                              <div className="flex items-center space-x-2 mb-3">
                                <ArrowUpRight className={`w-4 h-4 ${isCompleted ? "text-gray-400" : style.text}`} />
                                <span
                                  className={`text-xs font-medium ${isCompleted ? "text-gray-500" : style.text}`}
                                >
                                  <span
                                    dangerouslySetInnerHTML={{
                                      __html: String(plan.expectedImpact || ""),
                                    }}
                                  />
                                </span>
                              </div>

                              <div className="border border-dashed border-gray-300 rounded-none p-3 bg-white">
                                <p className="text-xs text-gray-500 mb-2">推奨アクション</p>
                                <ul className="space-y-2">
                                  {plan.recommendedActions.map((action, index) => (
                                    <li key={`${plan.id}-action-${index}`} className="flex items-start space-x-2 text-sm text-gray-700">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                                      <span
                                        dangerouslySetInnerHTML={{
                                          __html: String(action || ""),
                                        }}
                                      />
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
                ) : null}

              </div>
            ) : (
              <div className="text-center py-8 text-black">
                <Brain className="w-16 h-16 mx-auto mb-4 text-black" />
                <p className="text-lg">今月の振り返りを表示できます</p>
                <p className="text-sm mt-2">「今月の振り返りを見る」ボタンをクリックして内容を確認してください</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
