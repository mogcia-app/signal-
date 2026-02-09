"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import SNSLayout from "../../components/sns-layout";
import { useAuth } from "../../contexts/auth-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { authFetch } from "../../utils/authFetch";
import { useProgress } from "../../contexts/progress-context";
import { handleError } from "../../utils/error-handling";
import { ERROR_MESSAGES } from "../../constants/error-messages";
import { TrendingUp, Loader2, X, Copy, Check, Save, Edit, Target } from "lucide-react";
// Client-side logging - use console.error directly
import CommentReplyAssistant from "../instagram/lab/components/CommentReplyAssistant";

// マークダウン記法を削除する関数
const removeMarkdown = (text: string): string => {
  if (!text) return text;
  return text
    .replace(/\*\*/g, "") // **太字**
    .replace(/\*/g, "") // *斜体*
    .replace(/__/g, "") // __太字__
    .replace(/_/g, "") // _斜体_
    .replace(/#{1,6}\s/g, "") // # 見出し
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // [リンクテキスト](URL)
    .replace(/`([^`]+)`/g, "$1") // `コード`
    .replace(/~~/g, "") // ~~取り消し線~~
    .trim();
};
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";
import type {
  DashboardData,
  DashboardResponse,
  AISections,
  AISectionsResponse,
} from "../../types/home";

interface MonthlyResult {
  metric: string;
  value: number;
  change: number | undefined;
  icon: string;
}


export default function HomePage() {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const router = useRouter();
  const { showProgress, setProgress, hideProgress } = useProgress();

  // 今日の日付を取得
  const today = new Date();
  const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][today.getDay()];
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日（${dayOfWeek}）`;

  // ユーザー名を取得
  const userName = userProfile?.name || user?.displayName || "ユーザー";

  // 状態管理
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [showPlanCreatedBanner, setShowPlanCreatedBanner] = useState(false);
  const [aiSections, setAiSections] = useState<AISections | null>(null);
  const [isLoadingAiSections, setIsLoadingAiSections] = useState(true);
  const [copiedTaskIndex, setCopiedTaskIndex] = useState<number | null>(null);
  const [savingTaskIndex, setSavingTaskIndex] = useState<number | null>(null);
  
  // その他KPI入力用のstate
  const [otherFollowerCount, setOtherFollowerCount] = useState<number | "">("");
  const [otherProfileVisits, setOtherProfileVisits] = useState<number | "">("");
  const [otherExternalLinkTaps, setOtherExternalLinkTaps] = useState<number | "">("");
  const [isSavingOtherKPI, setIsSavingOtherKPI] = useState(false);
  const [isLoadingOtherKPI, setIsLoadingOtherKPI] = useState(false);
  
  // AI方向性（重点方針）のstate
  const [aiDirection, setAiDirection] = useState<{
    month: string;
    mainTheme: string;
    lockedAt: string | null;
  } | null>(null);
  const [isLoadingAiDirection, setIsLoadingAiDirection] = useState(false);
  
  // 今月のKPIデータ
  const [monthlyKPIs, setMonthlyKPIs] = useState<{
    thisMonth: { likes: number; comments: number; followers: number };
    previousMonth: { likes: number; comments: number; followers: number };
    changes: { likes?: number; comments?: number; followers?: number };
    breakdown: { followerIncreaseFromPosts: number; followerIncreaseFromOther: number };
  } | null>(null);
  const [isLoadingMonthlyKPIs, setIsLoadingMonthlyKPIs] = useState(true);


  // ダッシュボードデータを取得
  const fetchDashboard = async () => {
    try {
      setIsLoadingDashboard(true);
      const response = await authFetch("/api/home/dashboard");
      if (response.ok) {
        const data = (await response.json()) as DashboardResponse;
        if (data.success && data.data) {
          setDashboardData(data.data);
        } else {
          const errorMessage = handleError(
            data.error || ERROR_MESSAGES.DASHBOARD_FETCH_FAILED,
            ERROR_MESSAGES.DASHBOARD_FETCH_FAILED
          );
          toast.error(errorMessage);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = handleError(
          errorData.error || ERROR_MESSAGES.DASHBOARD_FETCH_FAILED,
          ERROR_MESSAGES.DASHBOARD_FETCH_FAILED
        );
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("ダッシュボードデータ取得エラー:", error);
      const errorMessage = handleError(
        error,
        ERROR_MESSAGES.DASHBOARD_FETCH_FAILED
      );
      toast.error(errorMessage);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  // ダッシュボードデータとAI生成セクションを並列取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingDashboard(true);
        setIsLoadingAiSections(true);
        showProgress();
        setProgress(10);
        
        const [dashboardResponse, aiSectionsResponse] = await Promise.all([
          authFetch("/api/home/dashboard").then((res) => {
            setProgress(40);
            return res;
          }),
          authFetch("/api/home/ai-generated-sections").then((res) => {
            setProgress(70);
            return res;
          }),
        ]);

        setProgress(80);

        // ダッシュボードデータの処理
        if (dashboardResponse.ok) {
          const dashboardData = (await dashboardResponse.json()) as DashboardResponse;
          if (dashboardData.success && dashboardData.data) {
            setDashboardData(dashboardData.data);
          } else {
            const errorMessage = handleError(
              dashboardData.error || "ダッシュボードデータの取得に失敗しました",
              "ダッシュボードデータの取得に失敗しました"
            );
            toast.error(errorMessage);
          }
        } else {
          const errorData = await dashboardResponse.json().catch(() => ({}));
          const errorMessage = handleError(
            errorData.error || "ダッシュボードデータの取得に失敗しました",
            "ダッシュボードデータの取得に失敗しました"
          );
          toast.error(errorMessage);
        }

        setProgress(90);

        // AI生成セクションの処理
        if (aiSectionsResponse.ok) {
          const aiSectionsData = (await aiSectionsResponse.json()) as AISectionsResponse;
          if (aiSectionsData.success && aiSectionsData.data) {
            setAiSections(aiSectionsData.data);
          } else {
            const errorMessage = handleError(
              aiSectionsData.error || ERROR_MESSAGES.AI_SECTIONS_FETCH_FAILED,
              ERROR_MESSAGES.AI_SECTIONS_FETCH_FAILED
            );
            toast.error(errorMessage);
          }
        } else {
          const errorData = await aiSectionsResponse.json().catch(() => ({}));
          const errorMessage = handleError(
            errorData.error || ERROR_MESSAGES.AI_SECTIONS_FETCH_FAILED,
            ERROR_MESSAGES.AI_SECTIONS_FETCH_FAILED
          );
          toast.error(errorMessage);
        }

        setProgress(100);
      } catch (error) {
        console.error("データ取得エラー:", error);
        const errorMessage = handleError(
          error,
          ERROR_MESSAGES.DASHBOARD_FETCH_FAILED
        );
        toast.error(errorMessage);
        hideProgress();
      } finally {
        setIsLoadingDashboard(false);
        setIsLoadingAiSections(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回マウント時のみ実行

  // AI生成セクションを取得
  useEffect(() => {
    const fetchAiSections = async () => {
      try {
        setIsLoadingAiSections(true);
        const response = await authFetch("/api/home/ai-generated-sections");
        if (response.ok) {
          const data = (await response.json()) as AISectionsResponse;
          console.log("[Home] AI生成セクション取得成功:", data);
          if (data.success && data.data) {
            console.log("[Home] todayTasks:", data.data.todayTasks);
            data.data.todayTasks?.forEach((task, index: number) => {
              console.log(`[Home] タスク${index}: type=${task.type}, description=${task.description}, hasContent=${!!task.generatedContent}, hasHashtags=${!!task.generatedHashtags && task.generatedHashtags.length > 0}`);
            });
            setAiSections(data.data);
          } else {
            const errorMessage = handleError(
              data.error || "AI生成セクションの取得に失敗しました",
              "AI生成セクションの取得に失敗しました"
            );
            toast.error(errorMessage);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = handleError(
            errorData.error || "AI生成セクションの取得に失敗しました",
            "AI生成セクションの取得に失敗しました"
          );
          toast.error(errorMessage);
        }
      } catch (error) {
        console.error("AI生成セクション取得エラー:", error);
        const errorMessage = handleError(
          error,
          "AI生成セクションの取得に失敗しました"
        );
        toast.error(errorMessage);
      } finally {
        setIsLoadingAiSections(false);
      }
    };

    fetchAiSections();
  }, []);

  // AI方向性（重点方針）を取得（今月または来月の確定済みを取得）
  useEffect(() => {
    const fetchAiDirection = async () => {
      if (!user?.uid) return;
      
      try {
        setIsLoadingAiDirection(true);
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
        
        console.log("[Home] AI方向性取得開始:", { currentMonth, nextMonthStr, uid: user.uid });
        
        // まず来月のデータを取得（月次レポートでは来月の重点方針を設定するため）
        let response = await authFetch(`/api/ai-direction?month=${nextMonthStr}`);
        let result = null;
        
        if (response.ok) {
          result = await response.json();
          if (result.success && result.data && result.data.lockedAt) {
            console.log("[Home] 来月のAI方向性を取得:", result.data);
            setAiDirection({
              month: result.data.month,
              mainTheme: result.data.mainTheme,
              lockedAt: result.data.lockedAt,
            });
            return;
          }
        }
        
        // 来月のデータがない場合は、今月のデータを取得
        response = await authFetch(`/api/ai-direction?month=${currentMonth}`);
        if (response.ok) {
          result = await response.json();
          if (result.success && result.data && result.data.lockedAt) {
            console.log("[Home] 今月のAI方向性を取得:", result.data);
            setAiDirection({
              month: result.data.month,
              mainTheme: result.data.mainTheme,
              lockedAt: result.data.lockedAt,
            });
            return;
          }
        }
        
        // どちらもない場合は、最新のai_directionを取得（過去3ヶ月以内）
        response = await authFetch(`/api/ai-direction`);
        if (response.ok) {
          result = await response.json();
          console.log("[Home] 最新のAI方向性取得結果:", result);
          if (result.success && result.data && result.data.lockedAt) {
            console.log("[Home] 最新のAI方向性を設定:", result.data);
            setAiDirection({
              month: result.data.month,
              mainTheme: result.data.mainTheme,
              lockedAt: result.data.lockedAt,
            });
          } else {
            console.log("[Home] AI方向性が確定されていません:", result);
            setAiDirection(null);
          }
        } else {
          console.error("[Home] AI方向性取得失敗:", response.status);
          setAiDirection(null);
        }
      } catch (error) {
        console.error("AI方向性取得エラー:", error);
        setAiDirection(null);
      } finally {
        setIsLoadingAiDirection(false);
      }
    };

    fetchAiDirection();
  }, [user?.uid]);

  // その他KPIデータを取得
  const fetchOtherKPI = async () => {
    try {
      setIsLoadingOtherKPI(true);
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      
      const response = await authFetch(`/api/follower-counts?month=${month}&snsType=instagram`);
      if (response.ok) {
        const data = await response.json() as {
          success?: boolean;
          data?: {
            followers?: number;
            profileVisits?: number;
            externalLinkTaps?: number;
          };
        };
        // 入力フィールドは常に空の状態で開始（デフォルトでは数字を表示しない）
        // データは取得するが、入力フィールドには設定しない
        setOtherFollowerCount("");
        setOtherProfileVisits("");
        setOtherExternalLinkTaps("");
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = handleError(
          errorData.error || ERROR_MESSAGES.KPI_FETCH_FAILED,
          ERROR_MESSAGES.KPI_FETCH_FAILED
        );
        console.error(errorMessage);
      }
    } catch (error) {
      console.error("その他KPIデータ取得エラー:", error);
      const errorMessage = handleError(
        error,
        ERROR_MESSAGES.KPI_FETCH_FAILED
      );
      console.error(errorMessage);
    } finally {
      setIsLoadingOtherKPI(false);
    }
  };

  // その他KPIデータを保存
  const saveOtherKPI = async () => {
    if (!user?.uid) {
      toast.error("ログインが必要です");
      return;
    }

    setIsSavingOtherKPI(true);
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      
      const response = await authFetch("/api/follower-counts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          followers: Number(otherFollowerCount) || 0,
          month,
          snsType: "instagram",
          source: "manual",
          profileVisits: Number(otherProfileVisits) || 0,
          externalLinkTaps: Number(otherExternalLinkTaps) || 0,
        }),
      });

      if (response.ok) {
        toast.success("保存しました");
        // 入力フィールドをクリア
        setOtherFollowerCount("");
        setOtherProfileVisits("");
        setOtherExternalLinkTaps("");
        // 保存後に再取得して表示を更新
        await fetchOtherKPI();
        await fetchMonthlyKPIs();
        fetchDashboard(); // ダッシュボードデータを再取得
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = handleError(
          errorData.error || ERROR_MESSAGES.KPI_SAVE_FAILED,
          ERROR_MESSAGES.KPI_SAVE_FAILED
        );
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("その他KPI保存エラー:", error);
      const errorMessage = handleError(
        error,
        ERROR_MESSAGES.KPI_SAVE_FAILED
      );
      toast.error(errorMessage);
    } finally {
      setIsSavingOtherKPI(false);
    }
  };

  // 計画削除を検知してデータを再取得（ページフォーカス時）
  // 注意: 頻繁なリロードを避けるため、フォーカスイベントでの自動リロードは無効化
  // useEffect(() => {
  //   const handleFocus = () => {
  //     // ページがフォーカスされたときにデータを再取得
  //     fetchDashboard();
  //     fetchOtherKPI();
  //   };

  //   window.addEventListener("focus", handleFocus);
  //   return () => window.removeEventListener("focus", handleFocus);
  // }, []);

  // 初回ロード時にその他KPIデータを取得
  useEffect(() => {
    if (user) {
      fetchOtherKPI();
      fetchMonthlyKPIs();
    }
  }, [user]);

  // 今月のKPIデータを取得
  const fetchMonthlyKPIs = async () => {
    try {
      setIsLoadingMonthlyKPIs(true);
      const response = await authFetch("/api/home/monthly-kpis");
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setMonthlyKPIs(result.data);
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


  // 今月の成果データ（月単位のKPIデータから取得）
  const monthlyResults: MonthlyResult[] = monthlyKPIs
    ? [
        {
          metric: "いいね数",
          value: monthlyKPIs.thisMonth.likes || 0,
          change: monthlyKPIs.changes?.likes,
          icon: "🩷",
        },
        {
          metric: "コメント数",
          value: monthlyKPIs.thisMonth.comments || 0,
          change: monthlyKPIs.changes?.comments,
          icon: "💬",
        },
        {
          metric: "フォロワー数",
          value: monthlyKPIs.thisMonth.followers || 0,
          change: monthlyKPIs.changes?.followers,
          icon: "📈",
        },
      ]
    : [
        { metric: "いいね数", value: 0, change: undefined, icon: "🩷" },
        { metric: "コメント数", value: 0, change: undefined, icon: "💬" },
        { metric: "フォロワー数", value: 0, change: undefined, icon: "📈" },
      ];



  return (
    <SNSLayout customTitle="ホーム" customDescription="今日のタスクと成果を確認">
      <div className="w-full px-4 sm:px-6 md:px-8 py-6 bg-gray-50 min-h-screen">
        {/* 挨拶セクション */}
        <div className="mb-6">
          <h1 className="text-2xl font-light text-gray-900 mb-1">
            <span className="inline-block animate-fade-in-up" style={{ animationDelay: '0s' }}>こんにちは </span>
            <span className="inline-block animate-fade-in-up" style={{ animationDelay: '0.3s' }}>{userName}</span>
            <span className="inline-block animate-fade-in-up" style={{ animationDelay: '0.4s' }}>さん</span>
          </h1>
          <p className="text-sm text-gray-500 font-light animate-fade-in-up" style={{ animationDelay: '0.5s' }}>今日は {dateStr}</p>
        </div>

        <div className="space-y-6">
          {/* 重点方針バナー（今月または来月） */}
          {aiDirection && aiDirection.lockedAt && aiDirection.mainTheme && (() => {
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
            const isCurrentMonth = aiDirection.month === currentMonth;
            const monthLabel = isCurrentMonth ? "今月" : "来月";
            
            return (
              <div className="bg-white border-2 border-gray-200 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-base font-bold text-gray-900">
                        {monthLabel}の重点方針
                      </h2>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 font-medium">
                        {aiDirection.month.split("-")[0]}年{parseInt(aiDirection.month.split("-")[1])}月
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed mb-3">
                      {removeMarkdown(aiDirection.mainTheme)}
                    </p>
                    <button
                      onClick={() => router.push("/instagram/report")}
                      className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors underline"
                    >
                      月次レポートを見る →
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 計画作成直後のバナー */}
          {showPlanCreatedBanner && (
            <div className="bg-gradient-to-r from-[#FF8A15] to-orange-500  border border-orange-300 p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-light mb-2">✨ 運用プランができました！</h2>
                  <p className="text-sm font-light opacity-90 mb-4">
                    これから{dashboardData?.currentPlan?.planPeriod || "3ヶ月"}、このプランで一緒に頑張りましょう！🔥
                  </p>
                  <button
                    onClick={() => setShowPlanCreatedBanner(false)}
                    className="text-sm font-light underline hover:no-underline"
                    aria-label="今日やることを見る"
                  >
                    今日やることを見る
                  </button>
                </div>
                <button
                  onClick={() => setShowPlanCreatedBanner(false)}
                  className="text-white hover:opacity-70 transition-opacity"
                  aria-label="バナーを閉じる"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}


          {/* 計画が存在しない場合のメッセージ */}
          {!dashboardData?.currentPlan && !isLoadingDashboard && (
            <div className="bg-gradient-to-r from-[#FF8A15] to-orange-500  border border-orange-300 p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-light mb-2">📋 運用計画を作成しましょう</h2>
                  <p className="text-sm font-light opacity-90 mb-4">
                    効果的なSNS運用のため、まずは運用計画を立てましょう。目標を設定し、最適な投稿スケジュールを提案します。
                  </p>
                  <button
                    onClick={() => {
                      router.push("/instagram/plan");
                    }}
                    className="bg-white text-[#FF8A15] px-6 py-2.5  text-sm font-medium hover:bg-gray-50 transition-colors"
                    aria-label="運用計画を作成する"
                  >
                    計画を作成する →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 今月の成果 */}
          {(monthlyKPIs || isLoadingMonthlyKPIs) && (
            <div className="bg-white  border border-gray-200 p-6">
              <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
                <span>📊</span>
                今月の成果
              </h2>
              {isLoadingMonthlyKPIs ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border border-gray-200  p-4">
                      <SkeletonLoader height="1rem" width="40%" className="mb-2" />
                      <SkeletonLoader height="2rem" width="60%" className="mb-2" />
                      <SkeletonLoader height="0.75rem" width="50%" />
                    </div>
                  ))}
                </div>
              ) : monthlyResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {monthlyResults.map((result, index) => (
                  <div key={index} className="border border-gray-200  p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-light text-gray-600">{result.metric}</div>
                      <span className="text-2xl">{result.icon}</span>
                    </div>
                    <div className="text-2xl font-light text-gray-900 mb-1">
                      {result.value.toLocaleString()}
                    </div>
                    {result.change !== undefined && result.change !== 0 && (
                      <div className={`text-xs font-light flex items-center gap-1 ${
                        result.change > 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        <TrendingUp className={`w-3 h-3 ${result.change < 0 ? "rotate-180" : ""}`} />
                        {result.change > 0 ? "+" : ""}{result.change.toFixed(1)}%
                        <span className="text-gray-500">（前月比）</span>
                          </div>
                        )}
                    {result.change === undefined && (
                      <div className="text-xs font-light text-gray-400">
                        前月データなし
                      </div>
                    )}
                    {result.change === 0 && (
                      <div className="text-xs font-light text-gray-400">
                        前月と変動なし
                      </div>
                    )}
                  </div>
                ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  データがありません
                </p>
              )}
            </div>
          )}

          {/* 今日やることと明日の準備（2カラム） */}
          {(dashboardData?.currentPlan || isLoadingDashboard) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 今日やること */}
              <div className="bg-white  border border-gray-200 p-6">
                <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
                  <span>📅</span>
                  今日やること
                </h2>
              {(isLoadingAiSections || isLoadingDashboard) ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border-l-2 border-[#FF8A15] pl-4">
                      <SkeletonLoader height="1rem" width="40%" className="mb-2" />
                      <SkeletonLoader height="1rem" width="80%" className="mb-2" />
                      <SkeletonLoader height="1rem" width="60%" />
                    </div>
                  ))}
                </div>
              ) : !aiSections || aiSections.todayTasks.length === 0 ? (
                <div className="space-y-4">
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
                            {task.reason && (
                              <div className={`mb-2 p-2 border-l-2 rounded ${
                                aiSections.aiDirection?.lockedAt 
                                  ? "bg-blue-50 border-blue-400" 
                                  : "bg-gray-50 border-gray-300"
                              }`}>
                                <p className={`text-xs ${
                                  aiSections.aiDirection?.lockedAt 
                                    ? "text-blue-800" 
                                    : "text-gray-700"
                                }`}>
                                  → {task.reason}
                                  {!aiSections.aiDirection?.lockedAt && "（未確定）"}
                                </p>
                              </div>
                            )}
                            {(task.generatedContent || (task.generatedHashtags && task.generatedHashtags.length > 0)) && (
                              <div className="bg-gray-50 border border-gray-200  p-3 mb-2 relative">
                                <div className="absolute top-2 right-2 flex gap-1">
                        <button
                                    onClick={async () => {
                                      if (!user?.uid) {
                                        toast.error(ERROR_MESSAGES.AUTH_REQUIRED);
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
                                          const result = await response.json();
                                          const postId = result.id || result.post?.id;
                                          
                                          if (postId) {
                                            // 保存成功後、ラボページに遷移して編集
                                            const labPath = `/instagram/lab/${task.type}?edit=${postId}`;
                                            router.push(labPath);
                                            toast.success("投稿を保存しました。編集ページに移動します。");
                                          } else {
                                            toast.success("投稿を保存しました！投稿一覧で確認できます。");
                                          }
                                        } else {
                                          const errorData = await response.json().catch(() => ({}));
                                          const errorMessage = handleError(
                                            errorData.error || ERROR_MESSAGES.POST_SAVE_FAILED,
                                            ERROR_MESSAGES.POST_SAVE_FAILED
                                          );
                                          toast.error(errorMessage);
                                        }
                                      } catch (error) {
                                        console.error("投稿保存エラー:", error);
                                        const errorMessage = handleError(
                                          error,
                                          ERROR_MESSAGES.POST_SAVE_FAILED
                                        );
                                        toast.error(errorMessage);
                                      } finally {
                                        setSavingTaskIndex(null);
                                      }
                                    }}
                                    className="p-1.5  hover:bg-gray-200 transition-colors"
                                    title="保存して編集"
                                    disabled={savingTaskIndex === index}
                                  >
                                    {savingTaskIndex === index ? (
                                      <Loader2 className="w-4 h-4 text-orange-600 animate-spin" />
                          ) : (
                                      <Edit className="w-4 h-4 text-orange-600" />
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
                                        const errorMessage = handleError(
                                          error,
                                          ERROR_MESSAGES.POST_COPY_FAILED
                                        );
                                        toast.error(errorMessage);
                                      }
                                    }}
                                    className="p-1.5  hover:bg-gray-200 transition-colors"
                                    title="投稿文とハッシュタグをコピー"
                                    aria-label={`${task.description}の投稿文とハッシュタグをクリップボードにコピー`}
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
                                    {task.reason && (
                                      <div className={`mb-2 p-2 border-l-2 rounded ${
                                        aiSections.aiDirection?.lockedAt 
                                          ? "bg-blue-50 border-blue-400" 
                                          : "bg-gray-50 border-gray-300"
                                      }`}>
                                        <p className={`text-xs ${
                                          aiSections.aiDirection?.lockedAt 
                                            ? "text-blue-800" 
                                            : "text-gray-700"
                                        }`}>
                                          {task.reason}
                                          {!aiSections.aiDirection?.lockedAt && "（未確定）"}
                                        </p>
                                      </div>
                                    )}
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

              {/* 明日の準備 */}
              <div className="bg-white  border border-gray-200 p-6">
                <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
                  <span>🔮</span>
                  明日の準備
                </h2>
              {(isLoadingAiSections || isLoadingDashboard) ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="border-l-2 border-blue-400 pl-4">
                      <SkeletonLoader height="1rem" width="40%" className="mb-2" />
                      <SkeletonLoader height="1rem" width="80%" className="mb-2" />
                      <SkeletonLoader height="1rem" width="60%" />
                    </div>
                  ))}
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
            </div>
          )}

          {/* 今月の目標と今週の予定（2カラム） */}
          {(dashboardData?.currentPlan || isLoadingDashboard) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 今月の目標 */}
              <div className="bg-white  border border-gray-200 p-6">
                <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
                  <span>🎯</span>
                  今月の目標
                </h2>
              {(isLoadingAiSections || isLoadingDashboard) ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-2">
                      <SkeletonLoader height="1rem" width="0.5rem" />
                      <div className="flex-1">
                        <SkeletonLoader height="1rem" width="60%" className="mb-1" />
                        <SkeletonLoader height="1rem" width="80%" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !aiSections || aiSections.monthlyGoals.length === 0 ? (
                <p className="text-sm text-gray-500 font-light text-center py-4">
                  今月の目標は設定されていません
                </p>
              ) : (
                <div className="space-y-3">
                  {aiSections.monthlyGoals.map((goal, index) => {
                    // 今月の重点方針の場合は特別なスタイル
                    const isMainTheme = goal.metric === "今月の重点方針";
                    return (
                      <div key={index} className={`border-l-2 ${isMainTheme ? "border-blue-500" : "border-[#FF8A15]"} pl-4 py-2 ${isMainTheme ? "bg-blue-50" : "bg-gray-50"}`}>
                        <div className={`text-sm font-medium ${isMainTheme ? "text-blue-900" : "text-gray-900"} mb-1`}>
                          {goal.metric}
                        </div>
                        <div className={`text-sm font-light ${isMainTheme ? "text-blue-800" : "text-gray-700"}`}>
                          {goal.target}
                        </div>
                        {isMainTheme && aiSections.aiDirection && (
                          <div className="mt-2 text-xs text-blue-700">
                            優先KPI: {aiSections.aiDirection.priorityKPI}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              </div>

              {/* 今週の予定 */}
              <div className="bg-white  border border-gray-200 p-6">
                <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
                  <span>📅</span>
                  今週の予定
                </h2>
              {(isLoadingAiSections || isLoadingDashboard) ? (
                <div className="space-y-4">
                  <SkeletonLoader height="1.5rem" width="60%" className="mb-2" />
                  <SkeletonLoader height="1rem" width="100%" className="mb-1" />
                  <SkeletonLoader height="1rem" width="90%" className="mb-1" />
                  <SkeletonLoader height="1rem" width="80%" />
                </div>
              ) : !aiSections || !aiSections.weeklySchedule ? (
                <p className="text-sm text-gray-500 font-light text-center py-4">
                  今週の予定は設定されていません
                </p>
              ) : (
                <div className="space-y-4">
                  {/* 今月の方針の表示（ai_directionがある場合） */}
                  {aiSections.aiDirection ? (
                    <div className={`mb-4 p-3 border-l-4 rounded ${
                      aiSections.aiDirection.priorityKPI ? "bg-blue-50 border-blue-500" : "bg-gray-50 border-gray-300"
                    }`}>
                      <div className={`text-xs font-semibold mb-1 ${
                        aiSections.aiDirection.priorityKPI ? "text-blue-900" : "text-gray-700"
                      }`}>
                        【今月の方針】
                      </div>
                      <div className={`text-sm font-medium mb-2 ${
                        aiSections.aiDirection.priorityKPI ? "text-blue-800" : "text-gray-800"
                      }`}>
                        {aiSections.aiDirection.mainTheme || "未設定"}
                      </div>
                      {aiSections.aiDirection.priorityKPI && (
                        <div className="text-xs text-blue-700">
                          優先KPI: {aiSections.aiDirection.priorityKPI}
                        </div>
                      )}
                    </div>
                  ) : null}
                  
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
            </div>
          )}

          {/* その他KPI入力とコメント返信アシスト（2カラム） */}
          {(dashboardData?.currentPlan || isLoadingDashboard) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* その他KPI入力 */}
              <div className="bg-white  border border-gray-200 p-6">
                <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
                  <span>📝</span>
                  投稿に紐づかない数値入力
                </h2>
                {dashboardData?.currentPlan ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        その他フォロワー増加数
                      </label>
                      <input
                        type="number"
                        value={otherFollowerCount}
                        onChange={(e) => setOtherFollowerCount(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="増加数を入力"
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15]"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        投稿に紐づかないフォロワー増加数を入力（既存の値に加算されます）
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        その他のプロフィール閲覧数
                      </label>
                      <input
                        type="number"
                        value={otherProfileVisits}
                        onChange={(e) => setOtherProfileVisits(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="0"
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15]"
                      />
                      <p className="text-xs text-gray-500 mt-1">投稿に紐づかないプロフィール閲覧数を入力（既存の値に加算されます）</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        その他の外部リンクタップ数
                      </label>
                      <input
                        type="number"
                        value={otherExternalLinkTaps}
                        onChange={(e) => setOtherExternalLinkTaps(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="0"
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15]"
                      />
                      <p className="text-xs text-gray-500 mt-1">投稿に紐づかない外部リンクタップ数を入力（既存の値に加算されます）</p>
                    </div>
                    <button
                      onClick={saveOtherKPI}
                      disabled={isSavingOtherKPI}
                      className="w-full py-2 px-4 bg-[#FF8A15] text-white text-sm font-medium hover:bg-[#e67a0f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                      aria-label="KPIデータを保存"
                    >
                      {isSavingOtherKPI ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          保存中...
                        </>
                      ) : (
                        "保存"
                      )}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    計画が作成されていません
                  </p>
                )}
              </div>

              {/* コメント返信アシスト */}
              <div className="bg-white  border border-gray-200">
                <CommentReplyAssistant postType="feed" />
              </div>
            </div>
          )}

          {/* コメント返信アシスト（計画がない場合のみ表示） */}
          {!dashboardData?.currentPlan && !isLoadingDashboard && (
            <div className="bg-white  border border-gray-200">
              <CommentReplyAssistant postType="feed" />
            </div>
          )}

        </div>
      </div>
    </SNSLayout>
  );
}
