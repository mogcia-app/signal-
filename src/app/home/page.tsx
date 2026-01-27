"use client";

import React, { useState, useEffect } from "react";
import SNSLayout from "../../components/sns-layout";
import { useAuth } from "../../contexts/auth-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { authFetch } from "../../utils/authFetch";
import { CheckCircle, Copy, ChevronDown, ChevronUp, TrendingUp, Calendar, Target, Loader2, X } from "lucide-react";
// Client-side logging - use console.error directly
import { PlanReviewBanner } from "./components/PlanReviewBanner";

interface TodayTask {
  id: string;
  type: "story" | "comment" | "feed" | "reel";
  title: string;
  description: string;
  recommendedTime?: string;
  content?: string;
  count?: number;
}

interface WeeklyResult {
  metric: string;
  value: number;
  change: number;
  icon: string;
}

interface PDCAStatus {
  plan: "completed" | "pending";
  do: "completed" | "pending";
  check: "completed" | "pending";
  action: "completed" | "in-progress" | "pending";
}

interface AIProposal {
  title: string;
  description: string;
  impact: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [showPDCA, setShowPDCA] = useState(false);
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);

  // 今日の日付を取得
  const today = new Date();
  const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][today.getDay()];
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日（${dayOfWeek}）`;

  // ユーザー名を取得
  const userName = userProfile?.name || user?.displayName || "ユーザー";

  // 状態管理
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [showPlanCreatedBanner, setShowPlanCreatedBanner] = useState(false);
  const [planReviewReasons, setPlanReviewReasons] = useState<any[]>([]);
  const [showPlanReviewBanner, setShowPlanReviewBanner] = useState(false);

  // 今日のタスクを取得
  useEffect(() => {
    const fetchTodayTasks = async () => {
      try {
        setIsLoadingTasks(true);
        const response = await authFetch("/api/home/today-tasks");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.tasks) {
            setTodayTasks(data.data.tasks);
          }
        }
      } catch (error) {
        console.error("今日のタスク取得エラー:", error);
      } finally {
        setIsLoadingTasks(false);
      }
    };

    fetchTodayTasks();
  }, []);

  // ダッシュボードデータを取得
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoadingDashboard(true);
        const response = await authFetch("/api/home/dashboard");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setDashboardData(data.data);
          }
        }
      } catch (error) {
        console.error("ダッシュボードデータ取得エラー:", error);
      } finally {
        setIsLoadingDashboard(false);
      }
    };

    fetchDashboard();
  }, []);

  // 計画の進捗をチェック
  useEffect(() => {
    const checkPlanProgress = async () => {
      try {
        const response = await authFetch("/api/plan/check-progress");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.needsReview) {
            setPlanReviewReasons(data.data.reasons);
            setShowPlanReviewBanner(true);
          }
        }
      } catch (error) {
        console.error("計画進捗チェックエラー:", error);
      }
    };

    // ダッシュボードデータが読み込まれたら進捗をチェック
    if (dashboardData?.currentPlan) {
      checkPlanProgress();
    }
  }, [dashboardData]);

  // 週間成果データ（ダッシュボードから取得）
  const weeklyResults: WeeklyResult[] = dashboardData?.weeklyKPIs
    ? [
        {
          metric: "いいね数",
          value: dashboardData.weeklyKPIs.thisWeek.likes || 0,
          change: dashboardData.weeklyKPIs.changes?.likes || 0,
          icon: "👍",
        },
        {
          metric: "コメント数",
          value: dashboardData.weeklyKPIs.thisWeek.comments || 0,
          change: dashboardData.weeklyKPIs.changes?.comments || 0,
          icon: "💬",
        },
        {
          metric: "フォロワー数",
          value: dashboardData.weeklyKPIs.thisWeek.followers || 0,
          change: dashboardData.weeklyKPIs.changes?.followers || 0,
          icon: "👥",
        },
      ]
    : [
        { metric: "いいね数", value: 0, change: 0, icon: "👍" },
        { metric: "コメント数", value: 0, change: 0, icon: "💬" },
        { metric: "フォロワー数", value: 0, change: 0, icon: "👥" },
      ];

  const pdcaStatus: PDCAStatus = {
    plan: "completed",
    do: "completed",
    check: "completed",
    action: "in-progress",
  };

  const aiProposal: AIProposal = {
    title: "ストーリーズの反応がいいです",
    description: "今週は毎日ストーリーを投稿してみましょう。",
    impact: "リーチが20%増える見込みです。",
  };

  // 今週の予定（ダッシュボードから取得）
  const weeklySchedule = dashboardData?.weeklySchedule
    ? dashboardData.weeklySchedule.map((item: any) => {
        const date = item.date instanceof Date ? item.date : new Date(item.date);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const dayName = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
        const time = item.scheduledTime
          ? new Date(item.scheduledTime).toLocaleTimeString("ja-JP", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";
        const typeLabel =
          item.type === "story"
            ? "ストーリーズ"
            : item.type === "reel"
              ? "リール"
              : "フィード";
        return {
          day: `${dayName}曜（${month}/${day}）`,
          tasks: [`${typeLabel}投稿${time ? `（${time}）` : ""}`],
        };
      })
    : [];

  // 今月の戦略（ダッシュボードから取得）
  const monthlyStrategy = dashboardData?.monthlyProgress
    ? {
        title: dashboardData.monthlyProgress.strategy || "ストーリーズを毎日投稿",
        progress: dashboardData.monthlyProgress.completedDays || 0,
        total: dashboardData.monthlyProgress.totalDays || 31,
        percentage: dashboardData.monthlyProgress.totalDays
          ? Math.round(
              ((dashboardData.monthlyProgress.completedDays || 0) /
                dashboardData.monthlyProgress.totalDays) *
                100
            )
          : 0,
      }
    : {
        title: "ストーリーズを毎日投稿",
        progress: 0,
        total: 31,
        percentage: 0,
      };

  const handleCopyContent = async (taskId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedTaskId(taskId);
      setTimeout(() => setCopiedTaskId(null), 2000);
    } catch (error) {
      console.error("コピーに失敗しました:", error);
    }
  };

  return (
    <SNSLayout customTitle="ホーム" customDescription="今日のタスクと成果を確認">
      <div className="w-full px-4 sm:px-6 md:px-8 py-6 bg-gray-50 min-h-screen">
        {/* 挨拶セクション */}
        <div className="mb-6">
          <h1 className="text-2xl font-light text-gray-900 mb-1">
            おはようございます、{userName}さん
          </h1>
          <p className="text-sm text-gray-500 font-light">今日は {dateStr}</p>
        </div>

        <div className="space-y-6">
          {/* 計画見直しバナー */}
          {showPlanReviewBanner && planReviewReasons.length > 0 && (
            <PlanReviewBanner
              reasons={planReviewReasons}
              onReview={() => {
                // 計画ページにリダイレクト（編集モード）
                window.location.href = "/instagram/plan?review=true";
              }}
              onDismiss={() => setShowPlanReviewBanner(false)}
            />
          )}

          {/* 計画作成直後のバナー */}
          {showPlanCreatedBanner && (
            <div className="bg-gradient-to-r from-[#FF8A15] to-orange-500 rounded-lg border border-orange-300 p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-light mb-2">✨ 運用プランができました！</h2>
                  <p className="text-sm font-light opacity-90 mb-4">
                    これから{dashboardData?.currentPlan?.planPeriod || "3ヶ月"}、このプランで一緒に頑張りましょう！🔥
                  </p>
                  <button
                    onClick={() => setShowPlanCreatedBanner(false)}
                    className="text-sm font-light underline hover:no-underline"
                  >
                    今日やることを見る
                  </button>
                </div>
                <button
                  onClick={() => setShowPlanCreatedBanner(false)}
                  className="text-white hover:opacity-70 transition-opacity"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* 今週やること（計画から） */}
          {dashboardData?.currentWeekTasks && dashboardData.currentWeekTasks.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
                <span>📅</span>
                今週やること
              </h2>
              <div className="space-y-2">
                {dashboardData.currentWeekTasks.map((task: { day: string; task: string }, index: number) => (
                  <div key={index} className="text-sm font-light text-gray-700">
                    <span className="text-gray-900">{task.day}曜:</span> {task.task}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 今月の目標（計画から） */}
          {dashboardData?.currentMonthGoals && dashboardData.currentMonthGoals.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
                <span>🎯</span>
                今月の目標
              </h2>
              <div className="space-y-2">
                {dashboardData.currentMonthGoals.map((goal: { metric?: string; target?: string; goal?: string; description?: string }, index: number) => (
                  <div key={index} className="text-sm font-light text-gray-700">
                    <div className="flex items-start gap-2">
                      <span>・</span>
                      <div className="flex-1">
                        {goal.metric && goal.target ? (
                          <div>
                            <span className="font-medium text-gray-900">{goal.metric}:</span> {goal.target}
                          </div>
                        ) : (
                          <div>{goal.goal || goal.description}</div>
                        )}
                        {goal.description && !goal.metric && (
                          <div className="text-xs text-gray-500 mt-1">{goal.description}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 一番大事なこと */}
          {dashboardData?.keyMessage && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
                <span>💡</span>
                一番大事なこと
              </h2>
              <p className="text-sm font-light text-gray-700 leading-relaxed">{dashboardData.keyMessage}</p>
            </div>
          )}

          {/* 今日やること */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-light text-gray-900 flex items-center gap-2">
                <span>📝</span>
                今日やること（3分で完了）
              </h2>
            </div>
            <div className="space-y-4">
              {isLoadingTasks ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : todayTasks.length === 0 ? (
                <p className="text-sm text-gray-500 font-light text-center py-4">
                  今日のタスクはありません
                </p>
              ) : (
                todayTasks.map((task, index) => (
                <div key={task.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <CheckCircle className="w-5 h-5 text-gray-300" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-light text-gray-700">
                          {index + 1}. {task.title}
                        </span>
                        {task.recommendedTime && (
                          <span className="text-xs text-gray-400 font-light">
                            （{task.recommendedTime}）
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 font-light mb-2">{task.description}</p>
                      {task.content && (
                        <button
                          onClick={() => handleCopyContent(task.id, task.content!)}
                          className="text-xs text-[#FF8A15] hover:text-orange-600 font-light flex items-center gap-1 transition-colors"
                        >
                          {copiedTaskId === task.id ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              コピーしました
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              投稿文をコピーする
                            </>
                          )}
                        </button>
                      )}
                      {task.count && (
                        <button className="text-xs text-[#FF8A15] hover:text-orange-600 font-light flex items-center gap-1 transition-colors">
                          <Copy className="w-3 h-3" />
                          返信案をコピーする
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>
          </div>

          {/* 今週の成果 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
              <span>📊</span>
              今週の成果（1/20〜1/26）
            </h2>
            <div className="space-y-3">
              {weeklyResults.map((result) => (
                <div key={result.metric} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{result.icon}</span>
                    <span className="text-sm font-light text-gray-700">{result.metric}:</span>
                    <span className="text-sm font-light text-gray-900">{result.value}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-600 font-light">
                    <TrendingUp className="w-3 h-3" />
                    +{result.change} vs 先週
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 font-light">
                💡 先週より調子がいいですね！このまま続けましょう。
              </p>
            </div>
          </div>

          {/* AIのPDCAサイクル */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-light text-gray-900 flex items-center gap-2">
                <span>🔄</span>
                AIのPDCAサイクル
              </h2>
              <button
                onClick={() => setShowPDCA(!showPDCA)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPDCA ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="text-xs text-gray-500 font-light mb-1">Plan</div>
                <div className={`text-sm font-light ${pdcaStatus.plan === "completed" ? "text-green-600" : "text-gray-400"}`}>
                  {pdcaStatus.plan === "completed" ? "✅" : "⏳"}
                </div>
              </div>
              <div className="text-gray-300">→</div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 font-light mb-1">Do</div>
                <div className={`text-sm font-light ${pdcaStatus.do === "completed" ? "text-green-600" : "text-gray-400"}`}>
                  {pdcaStatus.do === "completed" ? "✅" : "⏳"}
                </div>
              </div>
              <div className="text-gray-300">→</div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 font-light mb-1">Check</div>
                <div className={`text-sm font-light ${pdcaStatus.check === "completed" ? "text-green-600" : "text-gray-400"}`}>
                  {pdcaStatus.check === "completed" ? "✅" : "⏳"}
                </div>
              </div>
              <div className="text-gray-300">→</div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 font-light mb-1">Action</div>
                <div className={`text-sm font-light ${
                  pdcaStatus.action === "completed" ? "text-green-600" :
                  pdcaStatus.action === "in-progress" ? "text-orange-600" : "text-gray-400"
                }`}>
                  {pdcaStatus.action === "completed" ? "✅" :
                   pdcaStatus.action === "in-progress" ? "🔄 進行中" : "⏳"}
                </div>
              </div>
            </div>
            <button className="text-xs text-[#FF8A15] hover:text-orange-600 font-light transition-colors">
              💡 今月のPDCAを見る
            </button>
            {showPDCA && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-light text-gray-700 mb-3">📅 2026年1月のPDCAサイクル</h3>
                <div className="space-y-3 text-xs font-light text-gray-600">
                  <div>
                    <div className="font-medium text-gray-700 mb-1">Plan（1/1）</div>
                    <div className="text-green-600">✅ AIが運用計画を生成</div>
                    <div className="ml-4">→ 週3回の投稿、ストーリーズ毎日</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700 mb-1">Do（1/1〜1/31）</div>
                    <div className="text-green-600">✅ 投稿: 12回</div>
                    <div className="text-green-600 ml-4">✅ ストーリーズ: 31回</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700 mb-1">Check（1/31）</div>
                    <div className="text-green-600">✅ AIが分析完了</div>
                    <div className="ml-4">→ エンゲージメント率: 3.2%（+0.5% vs 先月）</div>
                    <div className="ml-4">→ リーチ: 1,250（+150 vs 先月）</div>
                    <div className="ml-4">→ フォロワー: +7人</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700 mb-1">Action（2/1）</div>
                    <div className="text-orange-600">🔄 AIが次の施策を提案</div>
                    <div className="ml-4">→ ストーリーズの投稿時間を11:00に変更</div>
                    <div className="ml-4">→ リール投稿を週1回追加</div>
                    <div className="ml-4">→ ハッシュタグを3つ変更</div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500 font-light">
                  💡 来月はこの施策で、さらに成長できます。
                </p>
              </div>
            )}
          </div>

          {/* Signal.のAIが分析していること */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-light text-gray-900 flex items-center gap-2">
                <span>🧠</span>
                Signal.のAIが分析していること
              </h2>
              <button
                onClick={() => setShowAIAnalysis(!showAIAnalysis)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showAIAnalysis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-sm text-gray-600 font-light mb-3">
              裏で70項目以上を分析しています
            </p>
            <button className="text-xs text-[#FF8A15] hover:text-orange-600 font-light transition-colors">
              💡 詳しく見る
            </button>
            {showAIAnalysis && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-600 font-light mb-4">
                  あなたが投稿するたびに、AIは裏で70項目以上を分析しています。
                </p>
                <div className="space-y-3 text-xs font-light text-gray-600">
                  <div>
                    <div className="text-green-600 mb-1">✅ 基本指標（8項目）</div>
                    <div className="ml-4 text-gray-500">いいね、コメント、保存、シェア、リーチ...</div>
                  </div>
                  <div>
                    <div className="text-green-600 mb-1">✅ エンゲージメント分析（12項目）</div>
                    <div className="ml-4 text-gray-500">エンゲージメント率、保存率、コメント率...</div>
                  </div>
                  <div>
                    <div className="text-green-600 mb-1">✅ オーディエンス分析（15項目）</div>
                    <div className="ml-4 text-gray-500">性別、年齢層、地域、フォロワー/非フォロワー...</div>
                  </div>
                  <div>
                    <div className="text-green-600 mb-1">✅ コンテンツ分析（20項目）</div>
                    <div className="ml-4 text-gray-500">投稿タイプ、文字数、ハッシュタグ数、投稿時間、画像の色調、顔の有無、テキストの有無...</div>
                  </div>
                  <div>
                    <div className="text-green-600 mb-1">✅ 感情分析（10項目）</div>
                    <div className="ml-4 text-gray-500">コメントのポジティブ/ネガティブ率...</div>
                  </div>
                  <div>
                    <div className="text-green-600 mb-1">✅ パターン学習（15項目以上）</div>
                    <div className="ml-4 text-gray-500">成功パターン、失敗パターン、時系列トレンド...</div>
                  </div>
                </div>
                <p className="mt-4 text-xs text-gray-500 font-light">
                  💡 これらのデータをもとに、AIが次の施策を自動で提案します。
                </p>
              </div>
            )}
          </div>

          {/* AIからの提案 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
              <span>💡</span>
              AIからの提案（今月）
            </h2>
            <div className="space-y-2">
              <p className="text-sm font-light text-gray-700">「{aiProposal.title}」</p>
              <p className="text-sm font-light text-gray-600">{aiProposal.description}</p>
              <p className="text-sm font-light text-gray-600">{aiProposal.impact}</p>
            </div>
            <button className="mt-4 text-xs text-[#FF8A15] hover:text-orange-600 font-light transition-colors">
              👉 詳細を見る
            </button>
          </div>

          {/* 今週の予定 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5" />
              今週の予定
            </h2>
            <div className="space-y-2">
              {weeklySchedule.length > 0 ? (
                weeklySchedule.map((schedule: { day: string; tasks: string[] }) => (
                  <div key={schedule.day} className="text-sm font-light text-gray-700">
                    <span className="text-gray-900">{schedule.day}:</span> {schedule.tasks.join("、")}
                  </div>
                ))
              ) : (
                <div className="text-sm font-light text-gray-500">今週の予定はありません</div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 font-light">
                💡 今週の目標: フィード3回、ストーリーズ毎日
              </p>
            </div>
          </div>

          {/* 今月の戦略（進捗） */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
              <Target className="w-5 h-5" />
              今月の戦略（進捗）
            </h2>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-light text-gray-700">戦略: {monthlyStrategy.title}</span>
                  <span className="text-sm font-light text-gray-500">
                    進捗: {monthlyStrategy.progress}/{monthlyStrategy.total}日（{monthlyStrategy.percentage}%）
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#FF8A15] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${monthlyStrategy.percentage}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-500 font-light">
              💡 あと{monthlyStrategy.total - monthlyStrategy.progress}日で目標達成！このまま続けましょう
            </p>
          </div>
        </div>
      </div>
    </SNSLayout>
  );
}
