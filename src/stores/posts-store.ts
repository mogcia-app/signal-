/**
 * 投稿一覧ページの状態管理ストア
 * Zustandを使用して状態を一元管理
 */

import { create } from "zustand";
import { postsApi } from "@/lib/api";
import { notify } from "@/lib/ui/notifications";
import { parseFirestoreDate } from "@/app/api/ai/monthly-analysis/utils/date-utils";
import type { AIReference, SnapshotReference } from "@/types/ai";

// Firestoreタイムスタンプ型
type FirestoreTimestamp = Date | string | { toDate?: () => Date } | null;

export interface PostData {
  id: string;
  userId: string;
  title: string;
  content: string;
  hashtags?: string[] | string | null;
  postType: "feed" | "reel" | "story";
  scheduledDate?: FirestoreTimestamp;
  scheduledTime?: string;
  status: "draft" | "created" | "scheduled" | "published";
  imageUrl?: string | null;
  imageData?: string | null;
  createdAt: FirestoreTimestamp;
  updatedAt: Date;
  isAIGenerated?: boolean;
  analytics?: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
    reach: number;
    engagementRate: number;
    publishedAt: Date;
    audience?: {
      gender: {
        male: number;
        female: number;
        other: number;
      };
      age: {
        "13-17": number;
        "18-24": number;
        "25-34": number;
        "35-44": number;
        "45-54": number;
        "55-64": number;
        "65+": number;
      };
    };
    reachSource?: {
      sources: {
        posts: number;
        profile: number;
        explore: number;
        search: number;
        other: number;
      };
      followers: {
        followers: number;
        nonFollowers: number;
      };
    };
  };
  snapshotReferences?: SnapshotReference[];
  generationReferences?: AIReference[];
}

export interface AnalyticsData {
  id: string;
  postId?: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagementRate: number;
  publishedAt: Date;
  title?: string;
  content?: string;
  hashtags?: string[];
  category?: string;
  thumbnail?: string;
  sentiment?: "satisfied" | "dissatisfied" | null;
  memo?: string;
  followerIncrease?: number;
  audience?: {
    gender: {
      male: number;
      female: number;
      other: number;
    };
    age: {
      "13-17": number;
      "18-24": number;
      "25-34": number;
      "35-44": number;
      "45-54": number;
      "55-64": number;
      "65+": number;
    };
  };
  reachSource?: {
    sources: {
      posts: number;
      profile: number;
      explore: number;
      search: number;
      other: number;
    };
    followers: {
      followers: number;
      nonFollowers: number;
    };
  };
}

interface ScheduledPost {
  day: string;
  date: string;
  type: string;
  title: string;
  time: string;
  status: string;
}

interface UnanalyzedPost {
  id: string;
  title: string;
  type: string;
  imageUrl: string | null;
  createdAt: string;
  status: string;
}

interface PostsStore {
  // データ
  posts: PostData[];
  analyticsData: AnalyticsData[];
  scheduledPosts: ScheduledPost[];
  unanalyzedPosts: UnanalyzedPost[];

  // UI状態
  loading: boolean;
  activeTab: "all" | "analyzed" | "created";
  toastMessage: { message: string; type: "success" | "error" } | null;
  deleteConfirm: {
    type: "post" | "analytics";
    id: string;
    onConfirm: () => void;
  } | null;

  // セッター
  setPosts: (posts: PostData[]) => void;
  setAnalyticsData: (data: AnalyticsData[]) => void;
  setScheduledPosts: (posts: ScheduledPost[]) => void;
  setUnanalyzedPosts: (posts: UnanalyzedPost[]) => void;
  setLoading: (loading: boolean) => void;
  setActiveTab: (tab: "all" | "analyzed" | "created") => void;
  setToastMessage: (message: { message: string; type: "success" | "error" } | null) => void;
  setDeleteConfirm: (
    confirm: {
      type: "post" | "analytics";
      id: string;
      onConfirm: () => void;
    } | null
  ) => void;

  // データ取得・操作関数
  fetchPosts: (userId: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  deleteManualAnalytics: (analyticsId: string) => Promise<void>;

  // 計算プロパティ
  getManualAnalyticsData: () => AnalyticsData[];
  getTabCounts: () => { all: number; analyzed: number; created: number };
  getFilteredPosts: () => PostData[];

  // リセット
  reset: () => void;
}

const initialState = {
  posts: [] as PostData[],
  analyticsData: [] as AnalyticsData[],
  scheduledPosts: [] as ScheduledPost[],
  unanalyzedPosts: [] as UnanalyzedPost[],
  loading: true,
  activeTab: "all" as const,
  toastMessage: null as { message: string; type: "success" | "error" } | null,
  deleteConfirm: null as {
    type: "post" | "analytics";
    id: string;
    onConfirm: () => void;
  } | null,
};

// 日付を取得するヘルパー関数（タイムスタンプを数値に変換）
const getDateTimestamp = (date: FirestoreTimestamp): number => {
  const parsed = parseFirestoreDate(date);
  return parsed ? parsed.getTime() : 0;
};

export const usePostsStore = create<PostsStore>((set, get) => ({
  ...initialState,

  // セッター
  setPosts: (posts) => set({ posts }),
  setAnalyticsData: (data) => set({ analyticsData: data }),
  setScheduledPosts: (posts) => set({ scheduledPosts: posts }),
  setUnanalyzedPosts: (posts) => set({ unanalyzedPosts: posts }),
  setLoading: (loading) => set({ loading }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setToastMessage: (message) => set({ toastMessage: message }),
  setDeleteConfirm: (confirm) => set({ deleteConfirm: confirm }),

  // 手動入力の分析データを取得
  getManualAnalyticsData: () => {
    const { analyticsData } = get();
    return analyticsData.filter(
      (a) => a.postId === null || a.postId === "" || a.postId === undefined
    );
  },

  // タブの投稿数を計算
  getTabCounts: () => {
    const { posts, analyticsData } = get();
    const manualAnalyticsData = get().getManualAnalyticsData();

    const allPostsCount = posts.length + manualAnalyticsData.length;

    const analyzedPostsCount =
      posts.filter((post) => {
        const hasAnalytics =
          analyticsData.some((a) => a.postId === post.id) || !!post.analytics;
        return hasAnalytics;
      }).length + manualAnalyticsData.length;

    const createdOnlyCount = posts.filter((post) => {
      const hasAnalytics =
        analyticsData.some((a) => a.postId === post.id) || !!post.analytics;
      return !hasAnalytics;
    }).length;

    return {
      all: allPostsCount,
      analyzed: analyzedPostsCount,
      created: createdOnlyCount,
    };
  },

  // フィルタリングされた投稿を取得
  getFilteredPosts: () => {
    const { posts, analyticsData, activeTab } = get();
    const filtered = posts.filter((post) => {
      if (activeTab === "all") return true;
      const hasAnalytics =
        analyticsData.some((a) => a.postId === post.id) || !!post.analytics;
      return activeTab === "analyzed" ? hasAnalytics : !hasAnalytics;
    });

    // 日付で降順ソート（最新が上）
    return [...filtered].sort((a, b) => {
      const aTime = getDateTimestamp(a.createdAt);
      const bTime = getDateTimestamp(b.createdAt);
      return bTime - aTime; // 降順（新しい順）
    });
  },

  // 投稿一覧と分析データを取得
  fetchPosts: async (userId: string) => {
    if (!userId) {
      set({ loading: false });
      return;
    }

    try {
      set({ loading: true });

      const response = await fetch(`/api/posts/with-analytics`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        const fetchedPosts = result.data.posts || [];

        // 日付で降順ソート（最新が上）
        const sortedPosts = [...fetchedPosts].sort((a, b) => {
          const aTime = getDateTimestamp(a.createdAt);
          const bTime = getDateTimestamp(b.createdAt);
          return bTime - aTime;
        });

        set({
          posts: sortedPosts,
          analyticsData: result.data.analytics || [],
          scheduledPosts: result.data.scheduledPosts || [],
          unanalyzedPosts: result.data.unanalyzedPosts || [],
        });
      }
    } catch (error) {
      console.error("投稿取得エラー:", error);
    } finally {
      set({ loading: false });
    }
  },

  // 投稿削除
  deletePost: async (postId: string) => {
    try {
      await postsApi.delete(postId);
      const { posts } = get();
      set({ posts: posts.filter((post) => post.id !== postId) });
      notify({ type: "success", message: "投稿を削除しました" });

      // 次のアクションを即座に更新
      if (
        typeof window !== "undefined" &&
        (window as Window & { refreshNextActions?: () => void }).refreshNextActions
      ) {
        console.log("🔄 Triggering next actions refresh after post deletion");
        (window as Window & { refreshNextActions?: () => void }).refreshNextActions!();
      }
    } catch (error) {
      console.error("削除エラー:", error);
      notify({ type: "error", message: "削除に失敗しました" });
      throw error;
    }
  },

  // 手動入力データ削除
  deleteManualAnalytics: async (analyticsId: string) => {
    try {
      const response = await fetch(`/api/analytics/${analyticsId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const { analyticsData } = get();
        set({
          analyticsData: analyticsData.filter((a) => a.id !== analyticsId),
        });
        notify({ type: "success", message: "分析データを削除しました" });

        // 次のアクションを即座に更新
        if (
          typeof window !== "undefined" &&
          (window as Window & { refreshNextActions?: () => void }).refreshNextActions
        ) {
          console.log("🔄 Triggering next actions refresh after analytics deletion");
          (window as Window & { refreshNextActions?: () => void }).refreshNextActions!();
        }
      } else {
        const errorText = await response.text();
        console.error("Delete error response:", errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
    } catch (error) {
      console.error("削除エラー:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      set({
        toastMessage: { message: `削除に失敗しました: ${errorMessage}`, type: "error" },
      });
      setTimeout(() => set({ toastMessage: null }), 5000);
      throw error;
    }
  },

  // リセット
  reset: () => set(initialState),
}));

