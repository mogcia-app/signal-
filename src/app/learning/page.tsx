"use client";

import { useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import SNSLayout from "../../components/sns-layout";
import { useAuth } from "../../contexts/auth-context";
import { authFetch } from "../../utils/authFetch";
import { handleError } from "../../utils/error-handling";
import { ERROR_MESSAGES } from "../../constants/error-messages";
import { clientCache, generateCacheKey } from "../../utils/cache";
import { actionLogsApi } from "@/lib/api";
import { getLearningPhaseLabel } from "@/utils/learningPhase";
import type { AIActionLog } from "@/types/ai";
import type {
  PostPatternInsights,
  FeedbackEntry,
  LearningBadge,
  PostInsight,
  MasterContextResponse,
  LearningContextCardData,
} from "./types";
import {
  Crown,
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
  Bot,
} from "lucide-react";
import { SuccessImprovementGallery } from "./components/SuccessImprovementGallery";

type ActionLogEntry = AIActionLog;


export default function LearningDashboardPage() {
  const { user } = useAuth();

  // すべてのHooksを早期リターンの前に定義
  const [isContextLoading, setIsContextLoading] = useState(false);
  const [isPartiallyLoading, setIsPartiallyLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [contextData, setContextData] = useState<MasterContextResponse | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [postInsights, setPostInsights] = useState<Record<string, PostInsight>>({});
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackEntry[]>([]);
  const [actionHistory, setActionHistory] = useState<ActionLogEntry[]>([]);
  const [actionLogPendingId, setActionLogPendingId] = useState<string | null>(null);
  const [actionLogError, setActionLogError] = useState<string | null>(null);
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
    let timeoutId: NodeJS.Timeout | null = null;
    
    const fetchDashboardData = async (retryAttempt = 0) => {
      // タイムアウトを設定（30秒）
      timeoutId = setTimeout(() => {
        if (!isCancelled) {
          console.error("[Learning Dashboard] タイムアウト: 30秒以内にレスポンスがありません");
          setIsContextLoading(false);
          setIsPartiallyLoading(false);
          setContextError("データの取得に時間がかかっています。しばらく待ってから再度お試しください。");
        }
      }, 30000);

      // キャッシュキーを生成
      const cacheKey = generateCacheKey("learning-dashboard", { userId: user.uid });

      // キャッシュから取得を試みる（初回のみ）
      const cachedData = clientCache.get<MasterContextResponse>(cacheKey);
      if (cachedData && !isCancelled && !contextData) {
        setContextData(cachedData);
        setPostInsights(cachedData?.postInsights ?? {});
        setSharedLearningContext(cachedData?.learningContext ?? null);
        setFeedbackHistory([]);
        setActionHistory([]);
        setContextError(null);
        setIsContextLoading(false);
        // バックグラウンドで最新データを取得
        setIsPartiallyLoading(true);
      }

      // 初回ロード時は全体ローディング、再取得時は部分ローディング
      const isInitialLoad = !contextData;
      if (isInitialLoad) {
        setIsContextLoading(true);
      } else {
        setIsPartiallyLoading(true);
      }
      setContextError(null);

      try {
        const params = new URLSearchParams({
          forceRefresh: "1", // 常に最新データを取得
          limit: "10",
        });

        const response = await authFetch(`/api/learning/dashboard?${params.toString()}`);

        // タイムアウトをクリア
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (!response.ok) {
          // リトライ可能なエラー（5xx系）の場合はリトライ
          if (response.status >= 500 && retryAttempt < 2) {
            console.log(`[Learning Dashboard] リトライ試行 ${retryAttempt + 1}/2`);
            setTimeout(() => {
              if (!isCancelled) {
                fetchDashboardData(retryAttempt + 1);
              }
            }, 1000 * (retryAttempt + 1)); // 指数バックオフ
            return;
          }
          throw new Error(`Learning dashboard API error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || ERROR_MESSAGES.LEARNING_DASHBOARD_FETCH_FAILED);
        }

        if (!isCancelled) {
          const data = result.data;
          
          // キャッシュに保存（5分間有効）
          clientCache.set(cacheKey, data, 5 * 60 * 1000);
          
          // マスターコンテキストデータを設定
          setContextData(data);
          setPostInsights(data?.postInsights ?? {});
          setSharedLearningContext(data?.learningContext ?? null);
          setRetryCount(0);

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
        
        // タイムアウトをクリア
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        // リトライ可能なエラーの場合はリトライ
        if (retryAttempt < 2 && !isCancelled) {
          console.log(`[Learning Dashboard] リトライ試行 ${retryAttempt + 1}/2`);
          setTimeout(() => {
            if (!isCancelled) {
              fetchDashboardData(retryAttempt + 1);
            }
          }, 1000 * (retryAttempt + 1)); // 指数バックオフ
          return;
        }
        
        if (!isCancelled) {
          const errorMessage = handleError(
            error,
            ERROR_MESSAGES.LEARNING_DASHBOARD_FETCH_FAILED
          );
          setContextError(errorMessage);
          // エラー時も既存のデータは保持
          if (!contextData) {
            setContextData(null);
            setSharedLearningContext(null);
            setFeedbackHistory([]);
            setActionHistory([]);
          }
          setRetryCount(retryAttempt + 1);
        }
      } finally {
        // タイムアウトをクリア
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (!isCancelled) {
          setIsContextLoading(false);
          setIsPartiallyLoading(false);
        }
      }
    };

    fetchDashboardData();
    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isAuthReady, user?.uid]); // contextDataを依存配列から削除して無限ループを防止

  const patternInsights = contextData?.postPatterns;


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

  // 改善パターン: 不満（dissatisfied）を選択した投稿をカウント
  const improvementPatterns = useMemo(
    () =>
      (patternInsights?.signals ?? []).filter(
        (signal) => signal.sentimentLabel === "negative" || signal.tag === "red"
      ),
    [patternInsights?.signals]
  );



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

          {/* 部分ローディング表示 */}
          {isPartiallyLoading && contextData && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded flex items-center justify-between" role="status" aria-live="polite">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <p className="text-sm text-blue-700">データを更新中...</p>
              </div>
            </div>
          )}
          
          {/* 手動更新ボタン（ローディング中でない場合のみ表示） */}
          {!isContextLoading && !isPartiallyLoading && contextData && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={async () => {
                  setIsPartiallyLoading(true);
                  setContextError(null);
                  try {
                    const params = new URLSearchParams({
                      forceRefresh: "1",
                      limit: "10",
                    });
                    const response = await authFetch(`/api/learning/dashboard?${params.toString()}`);
                    if (response.ok) {
                      const result = await response.json();
                      if (result.success && result.data) {
                        const cacheKey = generateCacheKey("learning-dashboard", { userId: user?.uid || "" });
                        clientCache.set(cacheKey, result.data, 5 * 60 * 1000);
                        setContextData(result.data);
                        setPostInsights(result.data?.postInsights ?? {});
                        setSharedLearningContext(result.data?.learningContext ?? null);
                        setRetryCount(0);
                        
                        // フィードバック履歴とアクション履歴を設定
                        const mappedFeedback: FeedbackEntry[] = Array.isArray(result.data.feedbackHistory)
                          ? result.data.feedbackHistory.map((entry: any) => ({
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
                        const mappedActions: ActionLogEntry[] = Array.isArray(result.data.actionHistory)
                          ? result.data.actionHistory.map((entry: any) => ({
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
                    } else {
                      throw new Error(`HTTP error! status: ${response.status}`);
                    }
                  } catch (error) {
                    console.error("データ更新エラー:", error);
                    const errorMessage = handleError(error, ERROR_MESSAGES.LEARNING_DASHBOARD_FETCH_FAILED);
                    setContextError(errorMessage);
                  } finally {
                    setIsPartiallyLoading(false);
                  }
                }}
                disabled={isPartiallyLoading}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:ring-offset-2 flex items-center gap-2"
                aria-label="データを更新する"
              >
                <RefreshCw className={`h-4 w-4 ${isPartiallyLoading ? "animate-spin" : ""}`} />
                データを更新
              </button>
            </div>
          )}
          
          {/* エラー表示 */}
          {contextError && (
            <div className="bg-red-50 border border-red-200 p-4 mb-6" role="alert" aria-live="polite">
              <div className="flex items-start justify-between">
                <p className="text-sm text-red-700 flex-1">{contextError}</p>
                {retryCount > 0 && (
                  <button
                    onClick={() => {
                      const fetchDashboardData = async (retryAttempt = 0) => {
                        // 簡易的な再取得関数
                        setIsContextLoading(true);
                        setContextError(null);
                        try {
                          const params = new URLSearchParams({
                            forceRefresh: "1",
                            limit: "10",
                          });
                          const response = await authFetch(`/api/learning/dashboard?${params.toString()}`);
                          if (response.ok) {
                            const result = await response.json();
                            if (result.success && result.data) {
                              setContextData(result.data);
                              setPostInsights(result.data?.postInsights ?? {});
                              setSharedLearningContext(result.data?.learningContext ?? null);
                              setRetryCount(0);
                            }
                          }
                        } catch (error) {
                          const errorMessage = handleError(error, ERROR_MESSAGES.LEARNING_DASHBOARD_FETCH_FAILED);
                          setContextError(errorMessage);
                        } finally {
                          setIsContextLoading(false);
                        }
                      };
                      fetchDashboardData();
                    }}
                    className="ml-4 px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    aria-label="データを再取得する"
                  >
                    再試行
                  </button>
                )}
              </div>
            </div>
          )}

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
                <div 
                  className="relative h-2 bg-gray-100 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={(() => {
                    const total = contextData.totalInteractions || 0;
                    if (total >= 12) {
                      return Math.min(100, 75 + ((total - 12) / 8) * 25);
                    } else if (total >= 8) {
                      return 50 + ((total - 8) / 4) * 25;
                    } else if (total >= 4) {
                      return 25 + ((total - 4) / 4) * 25;
                    } else {
                      return (total / 4) * 25;
                    }
                  })()}
                  aria-label={`学習フェーズ: ${getLearningPhaseLabel(contextData.learningPhase)}、進捗: ${(() => {
                    const total = contextData.totalInteractions || 0;
                    let percent = 0;
                    if (total >= 12) {
                      percent = Math.min(100, 75 + ((total - 12) / 8) * 25);
                    } else if (total >= 8) {
                      percent = 50 + ((total - 8) / 4) * 25;
                    } else if (total >= 4) {
                      percent = 25 + ((total - 4) / 4) * 25;
                    } else {
                      percent = (total / 4) * 25;
                    }
                    return `${Math.round(percent)}%`;
                  })()}`}
                >
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
              {(goldSignals.length > 0 || improvementPatterns.length > 0 || achievements.length > 0) && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="mb-5">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">
                      このAIは、あなただけのために育っています
                    </h3>
                    <p className="text-sm text-gray-500">
                      あなたの投稿から学んだ、あなた専用の成功パターンと改善パターンです
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="text-xs text-gray-500 mb-2 font-medium">成功パターン</div>
                      <div className="text-2xl font-semibold text-gray-900">
                        {goldSignals.length}
                        <span className="text-sm text-gray-500 ml-1">件</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="text-xs text-gray-500 mb-2 font-medium">改善パターン</div>
                      <div className="text-2xl font-semibold text-gray-900">
                        {improvementPatterns.length}
                        <span className="text-sm text-gray-500 ml-1">件</span>
                      </div>
                    </div>
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
                AIバッジ
              </h2>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              AIを育てるためのバッジを確認できます。
            </p>
          </div>

          {isContextLoading && achievements.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-700">
              <div className="w-5 h-5 border-2 border-[#ff8a15] border-t-transparent rounded-full animate-spin mr-2" />
              <span className="text-sm">バッジ情報を取得しています...</span>
            </div>
          ) : (
            <>
              {/* バッジ一覧 */}
              {(() => {
                // 除外するバッジID
                const excludedBadgeIds = [
                  "action-driver",      // アクションドライバー
                  "abtest-closer",      // 検証完走
                  "action-impact",      // 成果インパクト
                  "action-loop",        // アクションループ
                  "audience-resonance", // オーディエンス共鳴
                ];
                const filteredAchievements = achievements.filter(
                  (badge) => !excludedBadgeIds.includes(badge.id)
                );

                if (filteredAchievements.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">バッジがまだありません</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAchievements.map((badge) => {
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
                              <div 
                                className="h-2 w-full bg-white border border-gray-200"
                                role="progressbar"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={progressPercent}
                                aria-label={`${badge.title}の進捗: ${progressPercent}%`}
                              >
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
                );
              })()}
            </>
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

