"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import SNSLayout from "../../components/sns-layout";
import { useAuth } from "../../contexts/auth-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { authFetch } from "../../utils/authFetch";
import { TrendingUp, Loader2, X, Copy, Check, Save } from "lucide-react";
// Client-side logging - use console.error directly
import CommentReplyAssistant from "../instagram/lab/components/CommentReplyAssistant";

interface WeeklyResult {
  metric: string;
  value: number;
  change: number;
  icon: string;
}


export default function HomePage() {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();

  // 今日の日付を取得
  const today = new Date();
  const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][today.getDay()];
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日（${dayOfWeek}）`;

  // ユーザー名を取得
  const userName = userProfile?.name || user?.displayName || "ユーザー";

  // 状態管理
  const [dashboardData, setDashboardData] = useState<{
    currentPlan?: {
      planPeriod?: string;
      [key: string]: unknown;
    };
    weeklyKPIs?: {
      thisWeek: { likes: number; comments: number; followers: number };
      changes?: { likes: number; comments: number; followers: number };
    };
    [key: string]: unknown;
  } | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [showPlanCreatedBanner, setShowPlanCreatedBanner] = useState(false);
  const [aiSections, setAiSections] = useState<{
    todayTasks: Array<{ 
      time: string; 
      type: string; 
      description: string; 
      tip?: string;
      generatedContent?: string;
      generatedHashtags?: string[];
    }>;
    tomorrowPreparation: Array<{ time: string; type: string; description: string; preparation: string }>;
    monthlyGoals: Array<{ metric: string; target: string; progress?: number }>;
    weeklySchedule: {
      week: number;
      theme: string;
      actions: string[];
      tasks: Array<{ day: string; date?: string; time: string; type: string; description: string }>;
      startDate?: string;
      endDate?: string;
    } | null;
  } | null>(null);
  const [isLoadingAiSections, setIsLoadingAiSections] = useState(true);
  const [copiedTaskIndex, setCopiedTaskIndex] = useState<number | null>(null);
  const [savingTaskIndex, setSavingTaskIndex] = useState<number | null>(null);


  // ダッシュボードデータを取得
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

  useEffect(() => {
    fetchDashboard();
  }, []);

  // AI生成セクションを取得
  useEffect(() => {
    const fetchAiSections = async () => {
      try {
        setIsLoadingAiSections(true);
        const response = await authFetch("/api/home/ai-generated-sections");
        if (response.ok) {
          const data = await response.json() as {
            success?: boolean;
            data?: {
              todayTasks?: Array<{
                time: string;
                type: string;
                description: string;
                tip?: string;
                generatedContent?: string;
                generatedHashtags?: string[];
              }>;
              tomorrowPreparation?: Array<{ time: string; type: string; description: string; preparation: string }>;
              monthlyGoals?: Array<{ metric: string; target: string; progress?: number }>;
              weeklySchedule?: {
                week: number;
                theme: string;
                actions: string[];
                tasks: Array<{ day: string; date?: string; time: string; type: string; description: string }>;
                startDate?: string;
                endDate?: string;
              } | null;
            };
          };
          console.log("[Home] AI生成セクション取得成功:", data);
          if (data.success && data.data) {
            console.log("[Home] todayTasks:", data.data.todayTasks);
            data.data.todayTasks?.forEach((task, index: number) => {
              console.log(`[Home] タスク${index}: type=${task.type}, description=${task.description}, hasContent=${!!task.generatedContent}, hasHashtags=${!!task.generatedHashtags && task.generatedHashtags.length > 0}`);
            });
            setAiSections(data.data as typeof aiSections);
          }
        }
      } catch (error) {
        console.error("AI生成セクション取得エラー:", error);
      } finally {
        setIsLoadingAiSections(false);
      }
    };

    fetchAiSections();
  }, []);

  // 計画削除を検知してデータを再取得（ページフォーカス時）
  useEffect(() => {
    const handleFocus = () => {
      // ページがフォーカスされたときにデータを再取得
      fetchDashboard();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);


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

          {/* 計画が存在しない場合のメッセージ */}
          {!dashboardData?.currentPlan && !isLoadingDashboard && (
            <div className="bg-gradient-to-r from-[#FF8A15] to-orange-500 rounded-lg border border-orange-300 p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-light mb-2">📋 運用計画を作成しましょう</h2>
                  <p className="text-sm font-light opacity-90 mb-4">
                    効果的なSNS運用のため、まずは運用計画を立てましょう。目標を設定し、最適な投稿スケジュールを提案します。
                  </p>
                  <button
                    onClick={() => {
                      window.location.href = "/instagram/plan";
                    }}
                    className="bg-white text-[#FF8A15] px-6 py-2.5 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    計画を作成する →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 今週の成果 */}
          {dashboardData?.weeklyKPIs && weeklyResults.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
                <span>📊</span>
                今週の成果
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {weeklyResults.map((result, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-light text-gray-600">{result.metric}</div>
                      <span className="text-2xl">{result.icon}</span>
                    </div>
                    <div className="text-2xl font-light text-gray-900 mb-1">
                      {result.value.toLocaleString()}
                    </div>
                    {result.change !== 0 && (
                      <div className={`text-xs font-light flex items-center gap-1 ${
                        result.change > 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        <TrendingUp className={`w-3 h-3 ${result.change < 0 ? "rotate-180" : ""}`} />
                        {result.change > 0 ? "+" : ""}{result.change.toLocaleString()}
                        <span className="text-gray-500">（先週比）</span>
                      </div>
                    )}
                    {result.change === 0 && (
                      <div className="text-xs font-light text-gray-400">
                        先週と変動なし
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 今日やること */}
          {dashboardData?.currentPlan && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
                <span>📅</span>
                今日やること
              </h2>
              {isLoadingAiSections ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[#FF8A15] mb-2" />
                  <p className="text-xs text-gray-500 font-light">AIが計画を生成中...</p>
                </div>
              ) : !aiSections || aiSections.todayTasks.length === 0 ? (
                <div className="space-y-4">
                  {(!aiSections || aiSections.tomorrowPreparation.length === 0) && (
                    <div className="text-center py-2 mb-2">
                      <p className="text-sm text-gray-500 font-light">
                        今日はお休みですね✨
                      </p>
                    </div>
                  )}
                  <div className="border-l-2 border-[#FF8A15] pl-4">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          【分析・確認】
                        </div>
                        <p className="text-sm font-light text-gray-700 mb-2">
                          「投稿後の分析はできていますか？見直してみましょう！」
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="border-l-2 border-[#FF8A15] pl-4">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          【エンゲージメント】
                        </div>
                        <p className="text-sm font-light text-gray-700 mb-2">
                          「コメントには返信を忘れずに！」
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {aiSections.todayTasks.map((task, index) => {
                    const typeLabels: Record<string, string> = {
                      feed: "フィード投稿",
                      reel: "リール",
                      story: "ストーリーズ",
                    };
                    return (
                      <div key={index} className="border-l-2 border-[#FF8A15] pl-4">
                        <div className="flex items-start gap-2 mb-2">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 mb-1">
                              {typeLabels[task.type] || task.type}
                              {task.time && (
                                <span className="text-xs font-light text-gray-500 ml-2">
                                  ({task.time})
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-light text-gray-700 mb-2">
                              「{task.description}」
                            </p>
                            {(task.generatedContent || (task.generatedHashtags && task.generatedHashtags.length > 0)) && (
                              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-2 relative">
                                <div className="absolute top-2 right-2 flex gap-1">
                                  <button
                                    onClick={async () => {
                                      if (!user?.uid) {
                                        toast.error("ログインが必要です");
                                        return;
                                      }

                                      setSavingTaskIndex(index);
                                      try {
                                        const postData = {
                                          userId: user.uid,
                                          title: task.description || "投稿",
                                          content: task.generatedContent || "",
                                          hashtags: task.generatedHashtags || [],
                                          postType: task.type as "feed" | "reel" | "story",
                                          status: "draft",
                                          scheduledDate: new Date().toISOString().split("T")[0],
                                          scheduledTime: task.time || new Date().toTimeString().slice(0, 5),
                                        };

                                        const response = await authFetch("/api/posts", {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify(postData),
                                        });

                                        if (response.ok) {
                                          toast.success("投稿を保存しました！投稿一覧で確認できます。");
                                        } else {
                                          const errorData = await response.json();
                                          toast.error(errorData.error || "投稿の保存に失敗しました");
                                        }
                                      } catch (error) {
                                        console.error("投稿保存エラー:", error);
                                        toast.error("投稿の保存に失敗しました");
                                      } finally {
                                        setSavingTaskIndex(null);
                                      }
                                    }}
                                    className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                                    title="投稿一覧に保存"
                                    disabled={savingTaskIndex === index}
                                  >
                                    {savingTaskIndex === index ? (
                                      <Loader2 className="w-4 h-4 text-orange-600 animate-spin" />
                                    ) : (
                                      <Save className="w-4 h-4 text-orange-600" />
                                    )}
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const content = task.generatedContent || "";
                                      const hashtags = task.generatedHashtags?.map(tag => `#${tag}`).join(" ") || "";
                                      const copyText = `${content}${hashtags ? `\n\n${hashtags}` : ""}`;
                                      
                                      try {
                                        await navigator.clipboard.writeText(copyText);
                                        setCopiedTaskIndex(index);
                                        setTimeout(() => setCopiedTaskIndex(null), 2000);
                                        toast.success("コピーしました");
                                      } catch (error) {
                                        console.error("コピーに失敗しました:", error);
                                        toast.error("コピーに失敗しました");
                                      }
                                    }}
                                    className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                                    title="投稿文とハッシュタグをコピー"
                                  >
                                    {copiedTaskIndex === index ? (
                                      <Check className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <Copy className="w-4 h-4 text-gray-600" />
                                    )}
                                  </button>
                                </div>
                                {task.generatedContent && (
                                  <div className="mb-2 pr-20">
                                    <div className="text-xs font-medium text-gray-700 mb-1">📝 生成された投稿文:</div>
                                    <pre className="text-xs font-light text-gray-800 whitespace-pre-wrap font-sans">
                                      {task.generatedContent}
                                    </pre>
                                  </div>
                                )}
                                {task.generatedHashtags && task.generatedHashtags.length > 0 && (
                                  <div className="pr-20">
                                    <div className="text-xs font-medium text-gray-700 mb-1">🏷️ ハッシュタグ:</div>
                                    <div className="flex flex-wrap gap-1">
                                      {task.generatedHashtags.map((tag, tagIndex) => (
                                        <span key={tagIndex} className="text-xs text-[#FF8A15] font-light">
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {task.tip && (
                              <p className="text-xs text-gray-500 font-light">
                                → {task.tip}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 明日の準備 */}
          {dashboardData?.currentPlan && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
                <span>🔮</span>
                明日の準備
              </h2>
              {isLoadingAiSections ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-400 mb-2" />
                  <p className="text-xs text-gray-500 font-light">AIが準備タスクを生成中...</p>
                </div>
              ) : !aiSections || aiSections.tomorrowPreparation.length === 0 ? (
                <div className="space-y-4">
                  <div className="border-l-2 border-blue-400 pl-4">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          【分析・確認】
                        </div>
                        <p className="text-sm font-light text-gray-700 mb-2">
                          「投稿後の分析はできていますか？見直してみましょう！」
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="border-l-2 border-blue-400 pl-4">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          【エンゲージメント】
                        </div>
                        <p className="text-sm font-light text-gray-700 mb-2">
                          「コメントには返信を忘れずに！」
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {aiSections.tomorrowPreparation.map((prep, index) => {
                    const typeLabels: Record<string, string> = {
                      feed: "フィード投稿",
                      reel: "リール",
                      story: "ストーリーズ",
                    };
                    return (
                      <div key={index} className="border-l-2 border-blue-400 pl-4">
                        <div className="flex items-start gap-2 mb-2">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 mb-1">
                              {typeLabels[prep.type] || prep.type}
                              {prep.time && (
                                <span className="text-xs font-light text-gray-500 ml-2">
                                  ({prep.time})
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-light text-gray-700 mb-2">
                              「{prep.description}」
                            </p>
                            <p className="text-xs text-blue-600 font-light">
                              ✓ {prep.preparation}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 今月の目標 */}
          {dashboardData?.currentPlan && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
                <span>🎯</span>
                今月の目標
              </h2>
              {isLoadingAiSections ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-orange-400 mb-2" />
                  <p className="text-xs text-gray-500 font-light">データを読み込み中...</p>
                </div>
              ) : !aiSections || aiSections.monthlyGoals.length === 0 ? (
                <p className="text-sm text-gray-500 font-light text-center py-4">
                  今月の目標は設定されていません
                </p>
              ) : (
                <div className="space-y-3">
                  {aiSections.monthlyGoals.map((goal, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-gray-400">・</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {goal.metric}
                        </div>
                        <div className="text-sm font-light text-gray-700">
                          {goal.target}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 今週の予定 */}
          {dashboardData?.currentPlan && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
                <span>📅</span>
                今週の予定
              </h2>
              {isLoadingAiSections ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-400 mb-2" />
                  <p className="text-xs text-gray-500 font-light">AIが今週の予定を生成中...</p>
                </div>
              ) : !aiSections || !aiSections.weeklySchedule ? (
                <p className="text-sm text-gray-500 font-light text-center py-4">
                  今週の予定は設定されていません
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="border-l-2 border-purple-400 pl-4">
                    <div className="mb-2">
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        第{aiSections.weeklySchedule.week}週: {aiSections.weeklySchedule.theme}
                      </div>
                    </div>
                    <div className="space-y-1 mt-2">
                      {aiSections.weeklySchedule.actions.map((action, actionIndex) => (
                        <div key={actionIndex} className="text-xs font-light text-gray-700 flex items-start gap-2">
                          <span className="text-purple-400 mt-0.5">└</span>
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {aiSections.weeklySchedule.tasks && aiSections.weeklySchedule.tasks.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="text-xs font-medium text-gray-700 mb-2">📋 今週の投稿スケジュール</div>
                      <div className="space-y-2">
                        {aiSections.weeklySchedule.tasks.map((task, taskIndex) => {
                          const typeLabels: Record<string, string> = {
                            feed: "フィード投稿",
                            reel: "リール",
                            story: "ストーリーズ",
                          };
                          return (
                            <div key={taskIndex} className="text-xs font-light text-gray-700">
                              <span className="text-gray-900">{task.date || task.day}</span>
                              {task.time && <span className="text-gray-500 ml-1">({task.time})</span>}
                              <span className="text-gray-500 ml-1">-</span>
                              <span className="text-gray-700 ml-1">{typeLabels[task.type] || task.type}</span>
                              <span className="text-gray-600 ml-1">「{task.description}」</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* コメント返信アシスト */}
          <div className="bg-white rounded-lg border border-gray-200">
            <CommentReplyAssistant postType="feed" />
          </div>
        </div>
      </div>
    </SNSLayout>
  );
}
