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
import { TrendingUp, Loader2, X, Copy, Check, Save, Edit, Target, Sparkles } from "lucide-react";
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
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  
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

  // 週次コンテンツ計画
  const [weeklyPlans, setWeeklyPlans] = useState<{
    currentWeek: number;
    currentWeekPlan: {
      week: number;
      targetFollowers: number;
      increase: number;
      theme: string;
      feedPosts: Array<{
        day: string;
        content: string;
        type?: string;
        title?: string;
        displayText?: string;
        date?: string;
        dayName?: string;
        time?: string;
      }>;
      storyContent: string[];
    } | null;
    allWeeklyPlans: Array<{
      week: number;
      targetFollowers: number;
      increase: number;
      theme: string;
      feedPosts: Array<{
        day: string;
        content: string;
        type?: string;
        title?: string;
        displayText?: string;
        date?: string;
        dayName?: string;
        time?: string;
      }>;
      storyContent: string[];
    }>;
    schedule: {
      weeklyFrequency: string;
      postingDays: Array<{ day: string; time: string; type?: string }>;
      storyDays: Array<{ day: string; time: string }>;
    };
  } | null>(null);
  const [isLoadingWeeklyPlans, setIsLoadingWeeklyPlans] = useState(false);

  // 今日やることと明日の準備
  const [todayTasks, setTodayTasks] = useState<Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    recommendedTime?: string;
    content?: string;
    hashtags?: string[];
    count?: number;
    reason?: string;
    priority: string;
  }>>([]);
  const [tomorrowPreparations, setTomorrowPreparations] = useState<Array<{
    type: string;
    description: string;
    content?: string;
    hashtags?: string[];
    preparation: string;
  }>>([]);
  const [isLoadingTodayTasks, setIsLoadingTodayTasks] = useState(false);
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);

  const getLabPathByTaskType = (type: string): string => {
    if (type === "feed") return "/instagram/lab/feed";
    if (type === "reel") return "/instagram/lab/reel";
    if (type === "story") return "/instagram/lab/story";
    return "/instagram/lab";
  };

  const buildLabEditUrl = (task: {
    type: string;
    description: string;
    content?: string;
    hashtags?: string[];
    recommendedTime?: string;
  }): string => {
    const path = getLabPathByTaskType(task.type);
    const params = new URLSearchParams();
    if (task.description) params.set("draftTitle", task.description);
    if (task.content) params.set("draftContent", task.content);
    if (task.hashtags && task.hashtags.length > 0) {
      params.set(
        "draftHashtags",
        task.hashtags.map((tag) => String(tag).replace(/^#+/, "")).join(",")
      );
    }
    if (task.recommendedTime && task.recommendedTime !== "推奨時間未設定") {
      params.set("draftTime", task.recommendedTime.replace("予定", "").trim());
    }
    return `${path}?${params.toString()}`;
  };

  const handleCopyTask = async (task: {
    id: string;
    type: string;
    title: string;
    description: string;
    content?: string;
    hashtags?: string[];
  }) => {
    try {
      const hashtags = (task.hashtags || []).map((tag) => `#${String(tag).replace(/^#+/, "")}`).join(" ");
      const textToCopy = [
        `投稿タイプ: ${task.type === "feed" ? "フィード" : task.type === "reel" ? "リール" : task.type === "story" ? "ストーリーズ" : task.type}`,
        task.description ? `投稿タイトル: ${task.description}` : "",
        task.content ? `投稿文:\n${task.content}` : "",
        hashtags ? `ハッシュタグ:\n${hashtags}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      await navigator.clipboard.writeText(textToCopy);
      setCopiedTaskId(task.id);
      toast.success("コピーしました");
      window.setTimeout(() => setCopiedTaskId((prev) => (prev === task.id ? null : prev)), 1500);
    } catch (error) {
      console.error("コピーエラー:", error);
      toast.error("コピーに失敗しました");
    }
  };

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

  // 計画保存後のAI生成完了通知をチェック
  useEffect(() => {
    const planSavedAt = localStorage.getItem("planSavedAt");
    if (planSavedAt) {
      // 計画保存から3秒以上経過している場合のみ通知（AI生成が完了している想定）
      const savedTime = parseInt(planSavedAt, 10);
      const elapsed = Date.now() - savedTime;
      if (elapsed >= 3000) {
        toast.success("AIが計画を生成しました");
        localStorage.removeItem("planSavedAt");
      }
    }
  }, []);

  // ダッシュボードデータとAI生成セクションを並列取得
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    const fetchData = async () => {
      // ローディングメッセージの更新を開始
      const startTime = performance.now();
      const updateLoadingMessage = () => {
        const elapsed = (performance.now() - startTime) / 1000; // 経過時間（秒）
        
        if (elapsed < 2.0) {
          setLoadingMessage("データを読み込み中...");
        } else if (elapsed < 5.0) {
          setLoadingMessage("AIが分析中...");
        } else if (elapsed < 8.0) {
          setLoadingMessage("投稿提案を生成中...");
        } else {
          setLoadingMessage("最終調整中...");
        }
      };

      // 初期メッセージ
      setLoadingMessage("データを読み込み中...");
      
      // 定期的にメッセージを更新（0.5秒ごと）
      interval = setInterval(updateLoadingMessage, 500);
      
      try {
        setIsLoadingDashboard(true);
        
        console.log("[Home] API呼び出し開始");
        const dashboardResponse = await authFetch("/api/home/dashboard");

        console.log("[Home] APIレスポンス取得:", {
          dashboardOk: dashboardResponse.ok,
          dashboardStatus: dashboardResponse.status,
        });

        // ダッシュボードデータの処理
        if (dashboardResponse.ok) {
          const dashboardData = (await dashboardResponse.json()) as DashboardResponse;
          if (dashboardData.success && dashboardData.data) {
            setDashboardData(dashboardData.data);
            
            // 計画保存フラグがある場合、AI生成完了通知を表示
            const planSavedAt = localStorage.getItem("planSavedAt");
            if (planSavedAt) {
              toast.success("AIが計画を生成しました");
              localStorage.removeItem("planSavedAt");
            }
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

        
        // ローディングメッセージをクリア
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        setLoadingMessage("");
      } catch (error) {
        console.error("データ取得エラー:", error);
        // ローディングメッセージをクリア
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        setLoadingMessage("");
        const errorMessage = handleError(
          error,
          ERROR_MESSAGES.DASHBOARD_FETCH_FAILED
        );
        toast.error(errorMessage);
      } finally {
        setIsLoadingDashboard(false);
      }
    };

    fetchData();
    
    // クリーンアップ関数
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回マウント時のみ実行

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

  // 週次コンテンツ計画を取得
  useEffect(() => {
    const fetchWeeklyPlans = async () => {
      if (!user?.uid) return;
      
      try {
        setIsLoadingWeeklyPlans(true);
        const response = await authFetch("/api/home/weekly-plans");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setWeeklyPlans(data.data);
          }
        }
      } catch (error) {
        console.error("週次計画取得エラー:", error);
      } finally {
        setIsLoadingWeeklyPlans(false);
      }
    };

    fetchWeeklyPlans();
  }, [user?.uid]);

  // 今日やることと明日の準備を取得
  useEffect(() => {
    const fetchTodayTasks = async () => {
      if (!user?.uid) return;
      
      try {
        setIsLoadingTodayTasks(true);
        const response = await authFetch("/api/home/today-tasks");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setTodayTasks(data.data.tasks || []);
            setTomorrowPreparations(data.data.tomorrowPreparations || []);
          }
        }
      } catch (error) {
        console.error("今日やること取得エラー:", error);
      } finally {
        setIsLoadingTodayTasks(false);
      }
    };

    fetchTodayTasks();
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



  // ローディング状態
  const isLoadingHome = isLoadingDashboard;

  return (
    <SNSLayout customTitle="ホーム" customDescription="今日のタスクと成果を確認">
      {/* 画面全体のローディングオーバーレイ */}
      {isLoadingHome && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center">
          <div className="flex flex-col items-center justify-center space-y-8 px-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-24 w-24 border-6 border-[#FF8A15] border-t-transparent"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={32} className="text-[#FF8A15] animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 mb-3">
                {loadingMessage || "データを読み込み中..."}
              </p>
              <p className="text-base text-gray-600">
                しばらくお待ちください
              </p>
            </div>
          </div>
        </div>
      )}

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
                    aria-label="ホームに戻る"
                  >
                    ホームに戻る
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

          {/* 今日やること / 明日の準備 */}
          {dashboardData?.currentPlan && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 p-6">
                <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
                  <span>📝</span>
                  今日やること
                </h2>
                {isLoadingTodayTasks ? (
                  <div className="space-y-3">
                    <SkeletonLoader height="1rem" width="100%" className="mb-1" />
                    <SkeletonLoader height="1rem" width="90%" className="mb-1" />
                    <SkeletonLoader height="1rem" width="80%" />
                  </div>
                ) : todayTasks.length > 0 ? (
                  <div className="space-y-3">
                    {todayTasks.map((task) => (
                      <div key={task.id} className="border-l-2 border-[#FF8A15] pl-4 py-2">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                          {task.recommendedTime && task.recommendedTime !== "推奨時間未設定" && (
                            <span className="text-xs text-gray-500 ml-2">{task.recommendedTime}</span>
                          )}
                        </div>
                        {task.content && (
                          <>
                            <p className="text-xs text-gray-500 mb-1">投稿文</p>
                            <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">{task.content}</p>
                          </>
                        )}
                        {task.hashtags && task.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {task.hashtags.map((tag, idx) => (
                              <span key={idx} className="text-xs text-[#FF8A15]">#{String(tag).replace(/^#+/, "")}</span>
                            ))}
                          </div>
                        )}
                        {(task.type === "feed" || task.type === "reel" || task.type === "story") && (
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => router.push(buildLabEditUrl(task))}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                              aria-label="Labで編集する"
                            >
                              <Edit className="w-3 h-3" />
                              編集
                            </button>
                            <button
                              onClick={() => handleCopyTask(task)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                              aria-label="投稿文をコピーする"
                            >
                              {copiedTaskId === task.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              {copiedTaskId === task.id ? "コピー済み" : "コピー"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      "コメントが来たら返信しましょう",
                      "投稿分析はできていますか？（直近3投稿の保存率・リーチ確認）",
                      "フォロー/DMの新着確認をしましょう",
                    ].map((action, index) => (
                      <div key={index} className="border-l-2 border-gray-200 pl-4 py-2">
                        <p className="text-sm text-gray-700">{action}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-200 p-6">
                <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
                  <span>🔮</span>
                  明日の準備
                </h2>
                {isLoadingTodayTasks ? (
                  <div className="space-y-3">
                    <SkeletonLoader height="1rem" width="100%" className="mb-1" />
                    <SkeletonLoader height="1rem" width="90%" className="mb-1" />
                  </div>
                ) : tomorrowPreparations.length > 0 ? (
                  <div className="space-y-3">
                    {tomorrowPreparations.map((prep, index) => (
                      <div key={index} className="border-l-2 border-gray-300 pl-4 py-2">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {prep.type === "feed" ? "フィード投稿" : prep.type === "reel" ? "リール投稿" : "ストーリーズ投稿"}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-700 mb-2 font-medium">{prep.description}</p>
                        {prep.content && (
                          <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">{prep.content}</p>
                        )}
                        {prep.hashtags && prep.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {prep.hashtags.map((tag, idx) => (
                              <span key={idx} className="text-xs text-[#FF8A15]">#{String(tag).replace(/^#+/, "")}</span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-500">{prep.preparation}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-4">
                    今週の予定から次の投稿を確認できます
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 今週の予定 */}
          {dashboardData?.currentPlan && (weeklyPlans || isLoadingWeeklyPlans) && (
            <div className="bg-white border border-gray-200 p-6">
              <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
                <span>📅</span>
                今週の予定
              </h2>
              {isLoadingWeeklyPlans ? (
                <div className="space-y-4">
                  <SkeletonLoader height="1.5rem" width="60%" className="mb-2" />
                  <SkeletonLoader height="1rem" width="100%" className="mb-1" />
                  <SkeletonLoader height="1rem" width="90%" className="mb-1" />
                  <SkeletonLoader height="1rem" width="80%" />
                </div>
              ) : weeklyPlans?.currentWeekPlan ? (
                <div className="space-y-3">
                  {weeklyPlans.currentWeekPlan.feedPosts.length > 0 && (
                    <div className="space-y-2">
                      {weeklyPlans.currentWeekPlan.feedPosts.map((post, index) => (
                        <div key={index} className="text-sm text-gray-900 border-b border-gray-100 pb-2 last:border-b-0 last:pb-0">
                          {post.displayText || `[${post.type === "feed" ? "フィード" : post.type === "reel" ? "リール" : "ストーリーズ"}] ${post.date || "--/--"}（${post.dayName || "-"})${post.time || "--:--"} ${post.title || post.content || ""}`}
                        </div>
                      ))}
                    </div>
                  )}

                  {weeklyPlans.currentWeekPlan.feedPosts.length === 0 && (
                    <div className="text-sm text-gray-500 text-center py-4">
                      今週の予定はありません
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 font-light text-center py-4">
                  今週の計画は設定されていません
                </p>
              )}
            </div>
          )}


          {/* その他KPI入力とコメント返信アシスト（常に2カラム） */}
          {!isLoadingDashboard && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* その他KPI入力（計画の有無に関係なく表示） */}
              <div className="bg-white  border border-gray-200 p-6">
                <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
                  <span>📝</span>
                  投稿に紐づかない数値入力
                </h2>
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
              </div>

              <div className="bg-white  border border-gray-200">
                <CommentReplyAssistant postType="feed" />
              </div>
            </div>
          )}

        </div>
      </div>
    </SNSLayout>
  );
}
