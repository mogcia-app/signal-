/**
 * ストーリー投稿ラボページの状態管理ストア
 * Zustandを使用して状態を一元管理
 */

import { create } from "zustand";
import { authFetch } from "@/utils/authFetch";
import { parseFirestoreDate } from "@/app/api/ai/monthly-analysis/utils/date-utils";
import { handleError } from "@/utils/error-handling";
import { notify } from "@/lib/ui/notifications";
import type {
  GeneratedSchedule,
  ScheduleGenerationResponse,
  ScheduleSaveResponse,
} from "@/app/instagram/lab/types/schedule";
import type { AIHintSuggestion } from "@/app/instagram/lab/components/PostEditor";

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

// AIヒント生成APIレスポンスの型定義
interface AISuggestionsResponse {
  suggestions?: AIHintSuggestion["content"];
  rationale?: string;
  error?: string;
}

// フィードバック履歴の型定義
interface FeedbackHistory {
  category: string;
  timestamp: number;
}

interface StoryLabStore {
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

  // AIヒント関連
  imageVideoSuggestions: AIHintSuggestion | null;
  isGeneratingSuggestions: boolean;
  suggestionsFeedback: string | null;
  showSuggestionsAdminWarning: boolean;
  suggestionsFeedbackHistory: FeedbackHistory[];

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
  setImageVideoSuggestions: (suggestions: AIHintSuggestion | null) => void;
  setIsGeneratingSuggestions: (generating: boolean) => void;
  setSuggestionsFeedback: (feedback: string | null) => void;
  setShowSuggestionsAdminWarning: (show: boolean) => void;
  setIsMounted: (mounted: boolean) => void;

  // データ取得・操作関数
  fetchPostData: (postId: string, isAuthReady: boolean) => Promise<void>;
  generateSchedule: (isAuthReady: boolean) => Promise<void>;
  saveSchedule: (isAuthReady: boolean) => Promise<void>;
  loadSavedSchedule: (isAuthReady: boolean) => Promise<void>;
  generateImageVideoSuggestions: (content: string, isAuthReady: boolean) => Promise<void>;

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
  imageVideoSuggestions: null as AIHintSuggestion | null,
  isGeneratingSuggestions: false,
  suggestionsFeedback: null as string | null,
  showSuggestionsAdminWarning: false,
  suggestionsFeedbackHistory: [] as FeedbackHistory[],
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

// コンテンツを分析してフィードバックを生成
const analyzeContent = (content: string): { feedback: string | null; category: string } => {
  const trimmed = content.trim();
  const length = trimmed.length;

  if (length === 0) {
    return {
      feedback: "投稿文が入力されていません。AIヒントを生成するには、まず投稿文を作成してください。",
      category: "no_content",
    };
  }

  if (length < 20) {
    return {
      feedback: `投稿文が短すぎるようです（${length}文字）。もう少し詳しい内容（商品の特徴、イベントの詳細、伝えたいメッセージなど）を含めると、より具体的で効果的な画像・動画の提案が生成されます。`,
      category: "too_short",
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

export const useStoryLabStore = create<StoryLabStore>((set, get) => ({
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
  setImageVideoSuggestions: (suggestions) => set({ imageVideoSuggestions: suggestions }),
  setIsGeneratingSuggestions: (generating) => set({ isGeneratingSuggestions: generating }),
  setSuggestionsFeedback: (feedback) => set({ suggestionsFeedback: feedback }),
  setShowSuggestionsAdminWarning: (show) => set({ showSuggestionsAdminWarning: show }),
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
      const scheduleResponse = await authFetch("/api/instagram/story-schedule", {
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
          scheduleType: "story",
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
      const response = await authFetch(`/api/instagram/schedule-save?scheduleType=story`);

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

  // AIヒント生成
  generateImageVideoSuggestions: async (content: string, isAuthReady: boolean) => {
    if (!isAuthReady) return;

    // コンテンツを分析
    const analysis = analyzeContent(content);
    set({ suggestionsFeedback: analysis.feedback });

    // 連続フィードバックの追跡
    const { history, showWarning } = updateFeedbackHistory(
      get().suggestionsFeedbackHistory,
      analysis.category,
      analysis.feedback
    );
    set({
      suggestionsFeedbackHistory: history,
      showSuggestionsAdminWarning: showWarning,
    });

    set({ isGeneratingSuggestions: true });

    try {
      // ビジネス情報を取得
      const businessResponse = await authFetch("/api/user/business-info");

      if (!businessResponse.ok) {
        throw new Error("ビジネス情報の取得に失敗しました");
      }

      const businessData = await businessResponse.json() as BusinessInfoResponse;

      // AIヒントを生成
      const suggestionsResponse = await authFetch("/api/instagram/story-suggestions", {
        method: "POST",
        body: JSON.stringify({
          content,
          businessInfo: businessData.businessInfo,
        }),
      });

      if (!suggestionsResponse.ok) {
        throw new Error("AIヒントの生成に失敗しました");
      }

      const suggestionsData = await suggestionsResponse.json() as AISuggestionsResponse;

      if (suggestionsData.suggestions) {
        set({
          imageVideoSuggestions: {
            content: suggestionsData.suggestions,
            rationale:
              typeof suggestionsData.rationale === "string" &&
              suggestionsData.rationale.trim().length > 0
                ? suggestionsData.rationale
                : undefined,
          },
        });

        // 成功した場合は、同じカテゴリのフィードバックが続かなかった場合は履歴をクリア
        if (!get().suggestionsFeedback) {
          set({
            suggestionsFeedbackHistory: [],
            showSuggestionsAdminWarning: false,
          });
        }
      }
    } catch (error) {
      console.error("AIヒント生成エラー:", error);
    } finally {
      set({ isGeneratingSuggestions: false });
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
    }),
}));

