/**
 * リール投稿ラボページの状態管理ストア
 * Zustandを使用して状態を一元管理
 */

import { create } from "zustand";
import { authFetch } from "@/utils/authFetch";
import type { PlanData } from "@/hooks/usePlanData";
import { parseFirestoreDate } from "@/app/api/ai/monthly-analysis/utils/date-utils";
import { handleError } from "@/utils/error-handling";
import { notify } from "@/lib/ui/notifications";
import type {
  GeneratedSchedule,
  ScheduleSaveResponse,
} from "@/app/instagram/lab/types/schedule";

// ビジネス情報APIレスポンスの型定義
interface BusinessInfoResponse {
  success?: boolean;
  businessInfo?: {
    companySize?: string;
    businessType?: string;
    description?: string;
    catchphrase?: string;
    targetMarket?: string[];
    goals?: string[];
    challenges?: string[];
    features?: string[];
    industry?: string;
    productsOrServices?: string[];
    snsAISettings?: Record<string, unknown>;
  };
  error?: string;
}

// スケジュール生成APIレスポンスの型定義
interface ScheduleGenerationResponse {
  success: boolean;
  schedule: GeneratedSchedule;
  error?: string;
}

// 動画構成の型定義
interface VideoStructure {
  introduction: string; // 起
  development: string; // 承
  twist: string; // 転
  conclusion: string; // 結
}

// フィードバック履歴の型定義
interface FeedbackHistory {
  category: string;
  timestamp: number;
}

interface ReelLabStore {
  // 投稿データ関連
  postContent: string;
  postTitle: string;
  selectedHashtags: string[];
  postImage: string | null;
  scheduledDate: string;
  scheduledTime: string;
  editingPostId: string | null;

  // スケジュール関連
  monthlyPosts: number;
  dailyPosts: number;
  generatedSchedule: GeneratedSchedule;
  scheduleFeedback: string | null;
  isGeneratingSchedule: boolean;
  scheduleError: string;
  saveMessage: string;
  isSavingSchedule: boolean;
  showScheduleAdminWarning: boolean;
  scheduleFeedbackHistory: FeedbackHistory[];

  // 動画構成関連
  videoStructure: VideoStructure;
  videoFlow: string;

  // UI状態
  isMounted: boolean;

  // セッター
  setPostContent: (content: string) => void;
  setPostTitle: (title: string) => void;
  setSelectedHashtags: (hashtags: string[]) => void;
  setPostImage: (image: string | null) => void;
  setScheduledDate: (date: string) => void;
  setScheduledTime: (time: string) => void;
  setEditingPostId: (id: string | null) => void;
  setMonthlyPosts: (posts: number) => void;
  setDailyPosts: (posts: number) => void;
  setGeneratedSchedule: (schedule: GeneratedSchedule) => void;
  setScheduleFeedback: (feedback: string | null) => void;
  setIsGeneratingSchedule: (generating: boolean) => void;
  setScheduleError: (error: string) => void;
  setSaveMessage: (message: string) => void;
  setIsSavingSchedule: (saving: boolean) => void;
  setShowScheduleAdminWarning: (show: boolean) => void;
  setVideoStructure: (structure: VideoStructure) => void;
  setVideoFlow: (flow: string) => void;
  setIsMounted: (mounted: boolean) => void;

  // データ取得・操作関数
  fetchPostData: (postId: string, isAuthReady: boolean) => Promise<void>;
  generateSchedule: (isAuthReady: boolean) => Promise<void>;
  saveSchedule: (isAuthReady: boolean) => Promise<void>;
  loadSavedSchedule: (isAuthReady: boolean) => Promise<void>;
  generateVideoStructure: (prompt: string, isAuthReady: boolean, planData: PlanData | null) => Promise<void>;

  // リセット
  reset: () => void;
  resetPost: () => void;
}

const initialState = {
  postContent: "",
  postTitle: "",
  selectedHashtags: [] as string[],
  postImage: null as string | null,
  scheduledDate: "",
  scheduledTime: "",
  editingPostId: null as string | null,
  monthlyPosts: 8,
  dailyPosts: 1,
  generatedSchedule: [] as GeneratedSchedule,
  scheduleFeedback: null as string | null,
  isGeneratingSchedule: false,
  scheduleError: "",
  saveMessage: "",
  isSavingSchedule: false,
  showScheduleAdminWarning: false,
  scheduleFeedbackHistory: [] as FeedbackHistory[],
  videoStructure: {
    introduction: "",
    development: "",
    twist: "",
    conclusion: "",
  } as VideoStructure,
  videoFlow: "",
  isMounted: false,
};

// スケジュール設定を分析してフィードバックを生成
const analyzeScheduleSettings = (
  monthlyPosts: number,
  dailyPosts: number
): { feedback: string | null; category: string } => {
  if (monthlyPosts < 4) {
    return {
      feedback: `投稿頻度が低すぎるようです（月${monthlyPosts}回）。週1回（月4回）以上に設定すると、より効果的なスケジュールが生成されます。継続的な投稿がフォロワー獲得には重要です。`,
      category: "low_frequency",
    };
  }
  if (dailyPosts > 3) {
    return {
      feedback: `1日の投稿回数が多すぎるようです（${dailyPosts}回）。1日1-2回程度が推奨です。投稿の質を保つためにも、無理のない頻度に設定してください。`,
      category: "too_many_daily",
    };
  }
  return { feedback: null, category: "" };
};

// フィードバック履歴を更新し、管理者警告をチェック
const updateFeedbackHistory = (
  history: FeedbackHistory[],
  category: string,
  feedback: string | null
): { history: FeedbackHistory[]; showWarning: boolean } => {
  if (!feedback) {
    return { history: [], showWarning: false };
  }

  const now = Date.now();
  const newHistory = [...history, { category, timestamp: now }];

  // 3分以内の同じカテゴリのフィードバックをカウント
  const recentSameCategory = newHistory.filter(
    (f) => f.category === category && (now - f.timestamp) < 180000
  );

  return {
    history: newHistory,
    showWarning: recentSameCategory.length >= 3,
  };
};

export const useReelLabStore = create<ReelLabStore>((set, get) => ({
  ...initialState,

  // セッター
  setPostContent: (content) => set({ postContent: content }),
  setPostTitle: (title) => set({ postTitle: title }),
  setSelectedHashtags: (hashtags) => set({ selectedHashtags: hashtags }),
  setPostImage: (image) => set({ postImage: image }),
  setScheduledDate: (date) => set({ scheduledDate: date }),
  setScheduledTime: (time) => set({ scheduledTime: time }),
  setEditingPostId: (id) => set({ editingPostId: id }),
  setMonthlyPosts: (posts) => set({ monthlyPosts: posts }),
  setDailyPosts: (posts) => set({ dailyPosts: posts }),
  setGeneratedSchedule: (schedule) => set({ generatedSchedule: schedule }),
  setScheduleFeedback: (feedback) => set({ scheduleFeedback: feedback }),
  setIsGeneratingSchedule: (generating) => set({ isGeneratingSchedule: generating }),
  setScheduleError: (error) => set({ scheduleError: error }),
  setSaveMessage: (message) => set({ saveMessage: message }),
  setIsSavingSchedule: (saving) => set({ isSavingSchedule: saving }),
  setShowScheduleAdminWarning: (show) => set({ showScheduleAdminWarning: show }),
  setVideoStructure: (structure) => set({ videoStructure: structure }),
  setVideoFlow: (flow) => set({ videoFlow: flow }),
  setIsMounted: (mounted) => set({ isMounted: mounted }),

  // 投稿データを取得
  fetchPostData: async (postId: string, isAuthReady: boolean) => {
    if (!isAuthReady) return;

    try {
      const response = await authFetch("/api/posts");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.posts && Array.isArray(result.posts)) {
        const post = result.posts.find((p: { id: string }) => p.id === postId);

        if (post) {
          // ハッシュタグを配列に変換
          const hashtags = Array.isArray(post.hashtags)
            ? post.hashtags
            : typeof post.hashtags === "string"
              ? post.hashtags
                  .split(" ")
                  .filter((tag: string) => tag.trim() !== "")
                  .map((tag: string) => tag.replace("#", ""))
              : [];

          // スケジュール情報を設定
          let scheduledDate = "";
          if (post.scheduledDate) {
            const date = parseFirestoreDate(post.scheduledDate);
            if (date) {
              scheduledDate = date.toISOString().split("T")[0];
            }
          }

          // 画像データを設定
          const image = post.imageData || post.imageUrl || null;

          set({
            postTitle: post.title || "",
            postContent: post.content || "",
            selectedHashtags: hashtags,
            scheduledDate,
            scheduledTime: post.scheduledTime || "",
            postImage: image,
            editingPostId: postId,
          });
        }
      }
    } catch (error) {
      console.error("投稿データ取得エラー:", error);
    }
  },

  // スケジュール生成
  generateSchedule: async (isAuthReady: boolean) => {
    if (!isAuthReady) return;

    const { monthlyPosts, dailyPosts, scheduleFeedback } = get();

    // スケジュール設定を分析
    const analysis = analyzeScheduleSettings(monthlyPosts, dailyPosts);
    set({ scheduleFeedback: analysis.feedback });

    // 連続フィードバックの追跡
    const { history, showWarning } = updateFeedbackHistory(
      get().scheduleFeedbackHistory,
      analysis.category,
      analysis.feedback
    );
    set({
      scheduleFeedbackHistory: history,
      showScheduleAdminWarning: showWarning,
    });

    set({ isGeneratingSchedule: true, scheduleError: "" });

    try {
      // ビジネス情報を取得
      const businessResponse = await authFetch("/api/user/business-info");

      if (!businessResponse.ok) {
        throw new Error("ビジネス情報の取得に失敗しました");
      }

      const businessData = await businessResponse.json() as BusinessInfoResponse;

      // スケジュール生成APIを呼び出し
      const scheduleResponse = await authFetch("/api/instagram/reel-schedule", {
        method: "POST",
        body: JSON.stringify({
          monthlyPosts,
          dailyPosts,
          businessInfo: businessData.businessInfo,
        }),
      });

      if (!scheduleResponse.ok) {
        throw new Error("スケジュール生成に失敗しました");
      }

      const scheduleData = await scheduleResponse.json() as ScheduleGenerationResponse;
      set({ generatedSchedule: scheduleData.schedule || [] });

      // 成功した場合は、同じカテゴリのフィードバックが続かなかった場合は履歴をクリア
      if (!scheduleFeedback) {
        set({
          scheduleFeedbackHistory: [],
          showScheduleAdminWarning: false,
        });
      }
    } catch (error) {
      console.error("スケジュール生成エラー:", error);
      const errorMessage = handleError(error, "スケジュール生成に失敗しました");
      set({ scheduleError: errorMessage });
    } finally {
      set({ isGeneratingSchedule: false });
    }
  },

  // スケジュール保存
  saveSchedule: async (isAuthReady: boolean) => {
    if (!isAuthReady) {
      set({ saveMessage: "スケジュールが生成されていません" });
      return;
    }

    const { generatedSchedule, monthlyPosts, dailyPosts } = get();

    if (generatedSchedule.length === 0) {
      set({ saveMessage: "スケジュールが生成されていません" });
      return;
    }

    set({ isSavingSchedule: true, saveMessage: "" });

    try {
      // ビジネス情報を取得
      const businessResponse = await authFetch("/api/user/business-info");

      if (!businessResponse.ok) {
        throw new Error("ビジネス情報の取得に失敗しました");
      }

      const businessData = await businessResponse.json() as BusinessInfoResponse;

      // スケジュール保存APIを呼び出し
      const saveResponse = await authFetch("/api/instagram/schedule-save", {
        method: "POST",
        body: JSON.stringify({
          scheduleType: "reel",
          scheduleData: generatedSchedule,
          monthlyPosts,
          dailyPosts,
          businessInfo: businessData.businessInfo,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("スケジュール保存に失敗しました");
      }

      await saveResponse.json();
      set({ saveMessage: "✅ スケジュールが保存されました！" });
    } catch (error) {
      console.error("スケジュール保存エラー:", error);
      const errorMessage = handleError(error, "スケジュール保存に失敗しました");
      set({ saveMessage: `❌ ${errorMessage}` });
    } finally {
      set({ isSavingSchedule: false });
    }
  },

  // 保存されたスケジュールを読み込む
  loadSavedSchedule: async (isAuthReady: boolean) => {
    if (!isAuthReady) return;

    try {
      const response = await authFetch(`/api/instagram/schedule-save?scheduleType=reel`);

      if (response.ok) {
        const result = await response.json() as ScheduleSaveResponse;
        if (result.success && result.schedule) {
          set({
            generatedSchedule: result.schedule.schedule || [],
            monthlyPosts: result.schedule.monthlyPosts || 8,
            dailyPosts: result.schedule.dailyPosts || 1,
          });
          notify({ type: "success", message: "保存されたスケジュールを読み込みました" });
        }
      }
    } catch (error) {
      console.error("スケジュール読み込みエラー:", error);
    }
  },

  // 動画構成生成
  generateVideoStructure: async (prompt: string, isAuthReady: boolean, planData: PlanData | null) => {
    if (!isAuthReady || !prompt.trim()) return;

    try {
      const response = await authFetch("/api/instagram/reel-structure", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          businessInfo: planData,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        set({
          videoStructure:
            result.structure || {
              introduction: "",
              development: "",
              twist: "",
              conclusion: "",
            },
          videoFlow: result.flow || "",
        });
      }
    } catch (error) {
      console.error("動画構成生成エラー:", error);
    }
  },

  // リセット
  reset: () => set(initialState),
  resetPost: () =>
    set({
      postContent: "",
      postTitle: "",
      selectedHashtags: [],
      postImage: null,
      scheduledDate: "",
      scheduledTime: "",
      editingPostId: null,
      videoStructure: {
        introduction: "",
        development: "",
        twist: "",
        conclusion: "",
      },
      videoFlow: "",
    }),
}));

