"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import SNSLayout from "../../../components/sns-layout";
import { postsApi } from "../../../lib/api";
import { useAuth } from "../../../contexts/auth-context";
import { notify } from "../../../lib/ui/notifications";
import { useAiUsageSummary } from "@/hooks/useAiUsageSummary";
import {
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Share,
  Bookmark,
  Calendar,
  Clock,
  Trash2,
  CheckCircle,
  X,
  Bot,
} from "lucide-react";
import type { AIReference, SnapshotReference } from "@/types/ai";

// コンポーネントのインポート
import PostCard from "./components/PostCard";
import { SkeletonPostCard } from "../../../components/ui/SkeletonLoader";

interface PostData {
  id: string;
  userId: string;
  title: string;
  content: string;
  hashtags?: string[] | string | null;
  postType: "feed" | "reel" | "story";
  scheduledDate?:
    | Date
    | { toDate(): Date; seconds: number; nanoseconds: number; type?: string }
    | string;
  scheduledTime?: string;
  status: "draft" | "created" | "scheduled" | "published";
  imageUrl?: string | null;
  createdAt:
    | Date
    | { toDate(): Date; seconds: number; nanoseconds: number; type?: string }
    | string;
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

const normalizeHashtags = (hashtags: PostData["hashtags"]): string[] => {
  if (Array.isArray(hashtags)) {
    return hashtags
      .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
      .map((tag) => tag.replace(/^#+/, "").trim());
  }

  if (typeof hashtags === "string") {
    return hashtags
      .split(" ")
      .map((tag) => tag.replace(/^#+/, "").trim())
      .filter((tag) => tag.length > 0);
  }

  return [];
};

const normalizePostId = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
};

interface AnalyticsData {
  id: string;
  postId?: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  engagementRate: number;
  publishedAt: Date;
  title?: string;
  content?: string;
  hashtags?: string[];
  category?: string;
  thumbnail?: string;
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

interface AdvisorMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

interface AdvisorPostOption {
  id: string;
  title: string;
  postType: "feed" | "reel";
  dateLabel: string;
  sortAt: number;
}

const formatPostTypeLabel = (postType: "feed" | "reel" | "story"): string => {
  if (postType === "reel") {
    return "リール";
  }
  if (postType === "story") {
    return "ストーリーズ";
  }
  return "フィード";
};

const toTimestamp = (value: unknown): number => {
  if (!value) {
    return 0;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? 0 : value.getTime();
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }
  if (typeof value === "object" && value && "toDate" in value) {
    const converted = (value as { toDate?: () => Date }).toDate?.();
    return converted && !Number.isNaN(converted.getTime()) ? converted.getTime() : 0;
  }
  return 0;
};

const formatDateLabel = (timestamp: number): string => {
  if (!timestamp) {
    return "日時未設定";
  }
  return new Date(timestamp).toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ADVISOR_SECTION_HEADINGS = new Set(["根拠データ", "解釈", "次の1アクション"]);

export default function InstagramPostsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const { usage: aiUsageSummary, refreshUsage, setUsage: setAiUsageSummary } = useAiUsageSummary(Boolean(user));
  const aiUsageLabel =
    aiUsageSummary?.remaining === null
      ? "今月のAI残回数: 無制限"
      : `今月のAI残回数: ${Math.max(aiUsageSummary?.remaining || 0, 0)}回`;

  const applyUsageFromApi = (value: unknown) => {
    if (!value || typeof value !== "object") {return;}
    const row = value as { month?: unknown; limit?: unknown; used?: unknown; remaining?: unknown; breakdown?: unknown };
    const month = String(row.month || "").trim();
    if (!month) {return;}
    setAiUsageSummary({
      month,
      limit: row.limit === null ? null : Number(row.limit || 0),
      used: Number(row.used || 0),
      remaining: row.remaining === null ? null : Number(row.remaining || 0),
      breakdown: row.breakdown && typeof row.breakdown === "object" ? (row.breakdown as Record<string, number>) : {},
    });
  };

  // URLパラメータから初期タブを取得
  const getInitialTab = (): "all" | "feed" | "reel" | "story" => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "all" || tabParam === "feed" || tabParam === "reel" || tabParam === "story") {
      return tabParam;
    }
    return "all";
  };

  // すべてのHooksを早期リターンの前に定義
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "feed" | "reel" | "story">(getInitialTab());
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'post' | 'analytics'; id: string; onConfirm: () => void } | null>(null);
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorPostFilter, setAdvisorPostFilter] = useState("");
  const [selectedAdvisorPostId, setSelectedAdvisorPostId] = useState("");
  const [isAdvisorSelectorOpen, setIsAdvisorSelectorOpen] = useState(true);
  const [advisorMessages, setAdvisorMessages] = useState<AdvisorMessage[]>([
    {
      id: "initial",
      role: "assistant",
      text: "分析チャットです。先に投稿を選ぶと、保存済み分析データだけを使って回答します。",
    },
  ]);
  const [advisorSuggestedQuestions, setAdvisorSuggestedQuestions] = useState<string[]>([
    "なぜ伸びた？",
    "何を直せばいい？",
    "次回何を変える？",
  ]);

  // BFF APIから投稿一覧と分析データを取得
  const fetchPosts = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/posts/with-analytics`, {
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        // BFF APIから取得したデータを設定
        setPosts(result.data.posts || []);
        setAnalyticsData(result.data.analytics || []);
        
        // 手動入力の分析データも設定（BFF APIから取得済み）
        // manualAnalyticsDataはanalyticsDataからフィルタリングして取得
      }
    } catch (error) {
      console.error("投稿取得エラー:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // BFF APIから既に計算済みのデータを使用するため、processPostsDataは削除済み

  useEffect(() => {
    if (user?.uid) {
      fetchPosts();
    }
  }, [user?.uid, fetchPosts]);

  useEffect(() => {
    const handleAnalyticsUpdated = () => {
      if (user?.uid) {
        void fetchPosts();
      }
    };
    window.addEventListener("posts-analytics-updated", handleAnalyticsUpdated);
    return () => {
      window.removeEventListener("posts-analytics-updated", handleAnalyticsUpdated);
    };
  }, [fetchPosts, user?.uid]);

  // URLパラメータとタブ状態を同期
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "all" || tabParam === "feed" || tabParam === "reel" || tabParam === "story") {
      if (activeTab !== tabParam) {
        setActiveTab(tabParam);
      }
    }
  }, [searchParams, activeTab]);

  // タブ変更時にURLパラメータを更新
  const handleTabChange = useCallback((tab: "all" | "feed" | "reel" | "story") => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // リアルタイムソート更新（30秒ごと）
  useEffect(() => {
    const interval = setInterval(() => {
      setPosts((prevPosts) => {
        // 投稿が存在しない場合はソートしない
        if (prevPosts.length === 0) {return prevPosts;}

        return [...prevPosts].sort((a: PostData, b: PostData) => {
          // 投稿予定日を最優先に、降順（新しい順）
          // 優先順位: scheduledDate > publishedAt > createdAt
          const getDate = (post: PostData): Date => {
            // 1. scheduledDate（投稿予定日）を最優先
            if (post.scheduledDate) {
              if (post.scheduledDate instanceof Date) {
                return post.scheduledDate;
              }
              if (typeof post.scheduledDate === "string") {
                const date = new Date(post.scheduledDate);
                if (!isNaN(date.getTime())) {
                  return date;
                }
              }
            }

            // 2. publishedAt（実際に投稿した日時）を次に優先
            const analytics = analyticsData.find((ad) => ad.postId === post.id);
            if (analytics?.publishedAt) {
              if (analytics.publishedAt instanceof Date) {
                return analytics.publishedAt;
              }
              if (typeof analytics.publishedAt === "string") {
                const date = new Date(analytics.publishedAt);
                if (!isNaN(date.getTime())) {
                  return date;
                }
              }
            }

            // 3. createdAt（作成日時）をフォールバック
            if (post.createdAt instanceof Date) {
              return post.createdAt;
            }
            if (typeof post.createdAt === "string") {
              return new Date(post.createdAt);
            }
            if (post.createdAt?.toDate) {
              return post.createdAt.toDate();
            }
            return new Date(0);
          };

          const aDate = getDate(a);
          const bDate = getDate(b);

          return bDate.getTime() - aDate.getTime();
        });
      });
    }, 30000); // 30秒ごと

    return () => {
      clearInterval(interval);
    };
  }, [analyticsData]); // analyticsDataを依存配列に追加


  // 投稿削除
  const handleDeletePost = async (postId: string) => {
    setDeleteConfirm({
      type: 'post',
      id: postId,
      onConfirm: async () => {
        try {
          await postsApi.delete(postId);
          setPosts(posts.filter((post) => post.id !== postId));
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
        } finally {
          setDeleteConfirm(null);
        }
      }
    });
  };

  // 手動入力データ削除
  const handleDeleteManualAnalytics = async (analyticsId: string) => {
    setDeleteConfirm({
      type: 'analytics',
      id: analyticsId,
      onConfirm: async () => {
        try {
          console.log("Deleting analytics with ID:", analyticsId);
          console.log("User ID:", user?.uid);

          const response = await fetch(`/api/analytics/${analyticsId}`, {
            method: "DELETE",
          });

          console.log("Delete response status:", response.status);

          if (response.ok) {
            const result = await response.json();
            console.log("Delete result:", result);
            setAnalyticsData(analyticsData.filter((a) => a.id !== analyticsId));
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
          setToastMessage({ message: `削除に失敗しました: ${errorMessage}`, type: 'error' });
          setTimeout(() => setToastMessage(null), 5000);
        } finally {
          setDeleteConfirm(null);
        }
      }
    });
  };

  // 手動入力の分析データ
  const manualAnalyticsData = analyticsData.filter(
    (a) => a.postId === null || a.postId === "" || a.postId === undefined
  );

  // タブの投稿数を計算（BFF APIから取得したデータを使用）
  const tabCounts = React.useMemo(() => {
    // BFF APIから既に計算済みのデータを使用するため、ここでは簡易的に計算
    // 実際の値はBFF APIから取得するが、フロントエンドでも再計算する
    const manualAnalyticsData = analyticsData.filter(
      (a) => a.postId === null || a.postId === "" || a.postId === undefined
    );

    const allPostsCount = posts.length + manualAnalyticsData.length;

    const feedCount =
      posts.filter((post) => post.postType === "feed").length +
      manualAnalyticsData.filter((a) => a.category === "feed").length;
    const reelCount =
      posts.filter((post) => post.postType === "reel").length +
      manualAnalyticsData.filter((a) => a.category === "reel").length;
    const storyCount = posts.filter((post) => post.postType === "story").length;

    return {
      all: allPostsCount,
      feed: feedCount,
      reel: reelCount,
      story: storyCount,
    };
  }, [posts, analyticsData]);

  // フィルタリングされた投稿を効率的に計算
  const filteredPosts = React.useMemo(() => {
    const filtered = posts.filter((post) => {
      if (activeTab === "all") {return true;}
      const shouldShow = post.postType === activeTab;

      // デバッグログ
      console.log("Post filtering:", {
        postId: post.id,
        title: post.title,
        activeTab,
        shouldShow,
      });

      return shouldShow;
    });

    console.log("Filtered posts result:", {
      activeTab,
      totalPosts: posts.length,
      filteredCount: filtered.length,
      manualAnalyticsCount: manualAnalyticsData.length,
    });

    return filtered;
  }, [posts, activeTab, manualAnalyticsData]);

  const advisorPostOptions = React.useMemo<AdvisorPostOption[]>(() => {
    const mapped = posts
      .filter((post) => post.postType === "feed" || post.postType === "reel")
      .map((post) => {
        const postKey = normalizePostId(post.id);
        const linkedAnalytics = analyticsData.find((a) => normalizePostId(a.postId) === postKey);
        if (!linkedAnalytics) {
          return null;
        }

        const scheduledAt = toTimestamp(post.scheduledDate);
        const analyticsPublishedAt = toTimestamp(linkedAnalytics.publishedAt);
        const createdAt = toTimestamp(post.createdAt);
        const sortAt = scheduledAt || analyticsPublishedAt || createdAt;

        return {
          id: post.id,
          title: (post.title || "タイトル未設定").trim() || "タイトル未設定",
          postType: post.postType === "reel" ? "reel" : "feed",
          dateLabel: formatDateLabel(sortAt),
          sortAt,
        } satisfies AdvisorPostOption;
      })
      .filter((option): option is AdvisorPostOption => Boolean(option))
      .sort((a, b) => b.sortAt - a.sortAt);

    return mapped;
  }, [posts, analyticsData]);

  const filteredAdvisorPostOptions = React.useMemo(() => {
    const keyword = advisorPostFilter.trim().toLowerCase();
    if (!keyword) {
      return advisorPostOptions;
    }
    return advisorPostOptions.filter((option) => {
      const haystack = `${option.title} ${formatPostTypeLabel(option.postType)} ${option.dateLabel}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [advisorPostFilter, advisorPostOptions]);

  const selectedAdvisorPostOption = React.useMemo(
    () => advisorPostOptions.find((option) => option.id === selectedAdvisorPostId) || null,
    [advisorPostOptions, selectedAdvisorPostId],
  );

  const sendAdvisorMessage = useCallback(
    async (rawMessage: string) => {
      const message = rawMessage.trim();
      if (!message || advisorLoading) {
        return;
      }

      if (!selectedAdvisorPostId) {
        notify({ type: "error", message: "先に相談対象の投稿を選択してください" });
        return;
      }

      const userMessage: AdvisorMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        text: message,
      };
      setAdvisorMessages((prev) => [...prev, userMessage]);
      setAdvisorLoading(true);

      try {
        const response = await fetch("/api/instagram/posts/advisor-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            selectedPostId: selectedAdvisorPostId,
          }),
        });

        const result = (await response.json().catch(() => null)) as
          | {
              success?: boolean;
              data?: { reply?: string; suggestedQuestions?: string[] };
              error?: string;
              usage?: unknown;
            }
          | null;

        applyUsageFromApi(result?.usage);
        if (!response.ok || !result?.success || !result?.data?.reply) {
          throw new Error(result?.error || `HTTP error! status: ${response.status}`);
        }

        const assistantMessage: AdvisorMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: result.data.reply,
        };
        setAdvisorMessages((prev) => [...prev, assistantMessage]);
        setAdvisorSuggestedQuestions(
          Array.isArray(result.data.suggestedQuestions) && result.data.suggestedQuestions.length > 0
            ? result.data.suggestedQuestions.slice(0, 3)
            : ["なぜ伸びた？", "何を直せばいい？", "次回何を変える？"],
        );
      } catch (error) {
        console.error("advisor chat error:", error);
        setAdvisorMessages((prev) => [
          ...prev,
          {
            id: `assistant-error-${Date.now()}`,
            role: "assistant",
            text: "回答生成に失敗しました。少し時間を空けて再度お試しください。",
          },
        ]);
      } finally {
        setAdvisorLoading(false);
      }
    },
    [advisorLoading, selectedAdvisorPostId],
  );

  useEffect(() => {
    if (advisorPostOptions.length === 0) {
      if (selectedAdvisorPostId) {
        setSelectedAdvisorPostId("");
      }
      return;
    }

    const exists = advisorPostOptions.some((option) => option.id === selectedAdvisorPostId);
    if (!exists) {
      setSelectedAdvisorPostId(advisorPostOptions[0].id);
    }
  }, [advisorPostOptions, selectedAdvisorPostId]);

  useEffect(() => {
    if (selectedAdvisorPostId) {
      setIsAdvisorSelectorOpen(false);
    } else {
      setIsAdvisorSelectorOpen(true);
    }
  }, [selectedAdvisorPostId]);

  const renderAdvisorMessage = (message: AdvisorMessage) => {
    if (message.role === "user") {
      return <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>;
    }

    const lines = message.text.split("\n").map((line) => line.trim());
    return (
      <div className="space-y-1.5">
        {lines.map((line, index) => {
          if (!line) {
            return <div key={`line-${index}`} className="h-1.5" />;
          }
          if (ADVISOR_SECTION_HEADINGS.has(line)) {
            return (
              <p key={`line-${index}`} className="text-sm font-semibold text-gray-900">
                {line}
              </p>
            );
          }
          return (
            <p key={`line-${index}`} className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* トースト通知 */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-md ${
            toastMessage.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {toastMessage.type === 'success' ? (
              <CheckCircle size={20} className="flex-shrink-0" />
            ) : (
              <X size={20} className="flex-shrink-0" />
            )}
            <p className="font-medium flex-1">{toastMessage.message}</p>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-2 text-white hover:text-gray-200 transition-colors flex-shrink-0"
              aria-label="閉じる"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-none p-6 max-w-md w-full mx-4 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {deleteConfirm.type === 'post' ? '投稿を削除' : '分析データを削除'}
            </h3>
            <p className="text-gray-700 mb-6">
              {deleteConfirm.type === 'post' 
                ? 'この投稿を削除しますか？この操作は取り消せません。'
                : 'この分析データを削除しますか？この操作は取り消せません。'}
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-none transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => deleteConfirm.onConfirm()}
                className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-none transition-colors"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      <SNSLayout
        customTitle="投稿一覧"
        customDescription="作成した投稿の詳細表示・管理・削除・分析を行えます"
      >
        <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 bg-white min-h-screen">
          {/* 投稿一覧 */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <SkeletonPostCard key={i} />
              ))}
            </div>
          ) : posts.length === 0 && manualAnalyticsData.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-black text-6xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-black mb-2">投稿がありません</h3>
              <p className="text-black mb-4">
                まだ投稿を保存していません。投稿ラボで投稿を作成しましょう。
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => (window.location.href = "/dashboard")}
                  className="inline-flex items-center px-4 py-2 bg-orange-500 text-white  hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                  aria-label="新しい投稿を作成する"
                >
                  投稿を作成する
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* タブナビゲーション */}
              <div className="mb-6">
                <div className="bg-white border border-gray-200 p-1">
                  <nav className="flex space-x-1" role="tablist" aria-label="投稿フィルター">
                    <button
                      ref={(el) => {
                        tabButtonsRef.current[0] = el;
                      }}
                      onClick={() => handleTabChange("all")}
                      role="tab"
                      aria-selected={activeTab === "all"}
                      aria-controls="posts-all"
                      id="tab-all"
                      tabIndex={activeTab === "all" ? 0 : -1}
                      className={`py-2 px-4 font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:ring-offset-2 ${
                        activeTab === "all"
                          ? "bg-[#ff8a15] text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      すべての投稿 ({tabCounts.all})
                      <span className="sr-only">（Ctrl+1で切り替え）</span>
                    </button>
                    <button
                      ref={(el) => {
                        tabButtonsRef.current[1] = el;
                      }}
                      onClick={() => handleTabChange("feed")}
                      role="tab"
                      aria-selected={activeTab === "feed"}
                      aria-controls="posts-feed"
                      id="tab-feed"
                      tabIndex={activeTab === "feed" ? 0 : -1}
                      className={`py-2 px-4 font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:ring-offset-2 ${
                        activeTab === "feed"
                          ? "bg-[#ff8a15] text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      フィード ({tabCounts.feed})
                      <span className="sr-only">（Ctrl+2で切り替え）</span>
                    </button>
                    <button
                      ref={(el) => {
                        tabButtonsRef.current[2] = el;
                      }}
                      onClick={() => handleTabChange("reel")}
                      role="tab"
                      aria-selected={activeTab === "reel"}
                      aria-controls="posts-reel"
                      id="tab-reel"
                      tabIndex={activeTab === "reel" ? 0 : -1}
                      className={`py-2 px-4 font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:ring-offset-2 ${
                        activeTab === "reel"
                          ? "bg-[#ff8a15] text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      リール ({tabCounts.reel})
                      <span className="sr-only">（Ctrl+3で切り替え）</span>
                    </button>
                    <button
                      ref={(el) => {
                        tabButtonsRef.current[3] = el;
                      }}
                      onClick={() => handleTabChange("story")}
                      role="tab"
                      aria-selected={activeTab === "story"}
                      aria-controls="posts-story"
                      id="tab-story"
                      tabIndex={activeTab === "story" ? 0 : -1}
                      className={`py-2 px-4 font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:ring-offset-2 ${
                        activeTab === "story"
                          ? "bg-[#ff8a15] text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      ストーリーズ ({tabCounts.story})
                      <span className="sr-only">（Ctrl+4で切り替え）</span>
                    </button>
                  </nav>
                </div>
              </div>

              {/* 手動入力の分析データを表示 */}
              {manualAnalyticsData.length > 0 &&
                activeTab !== "story" &&
                (activeTab === "all" ||
                  manualAnalyticsData.some((a) => a.category === activeTab)) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
                    {manualAnalyticsData
                      .filter((analytics) => activeTab === "all" || analytics.category === activeTab)
                      .map((analytics, index) => (
                      <div
                        key={`manual-${index}`}
                        className="bg-white shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {/* カードヘッダー */}
                        <div className="p-4 border-b border-gray-100">
                          <div className="mb-2">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <span className="text-2xl flex-shrink-0">📊</span>
                                <h3 className="text-lg font-semibold text-black line-clamp-2 break-words">
                                  {(() => {
                                    const title = analytics.title || "手動入力データ";
                                    // タイトルから先頭・末尾の「##」「-」「空白」を削除
                                    const cleanedTitle =
                                      title
                                        .replace(/^[\s#-]+|[\s#-]+$/g, "")
                                        .replace(/^#+/g, "")
                                        .trim() || "手動入力データ";

                                    // 最大文字数制限（50文字）
                                    const maxLength = 50;
                                    if (cleanedTitle.length > maxLength) {
                                      return cleanedTitle.substring(0, maxLength) + "...";
                                    }
                                    return cleanedTitle;
                                  })()}
                                </h3>
                              </div>
                              <button
                                onClick={() => handleDeleteManualAnalytics(analytics.id)}
                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="削除"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-1  text-xs font-medium bg-blue-100 text-blue-800">
                                手動入力
                              </span>
                              <span className="px-2 py-1 text-xs  bg-green-100 text-green-800 font-medium">
                                分析済み
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-black">
                            <span className="flex items-center">
                              <Calendar size={14} className="mr-1" />
                              {analytics.publishedAt
                                ? new Date(analytics.publishedAt).toLocaleDateString("ja-JP")
                                : "日付未設定"}
                            </span>
                            <span className="flex items-center">
                              <Clock size={14} className="mr-1" />
                              {analytics.publishedAt
                                ? new Date(analytics.publishedAt).toLocaleTimeString("ja-JP", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "時間未設定"}
                            </span>
                          </div>
                        </div>

                        {/* 投稿内容 */}
                        <div className="p-4">
                          {/* 画像プレビュー */}
                          <div className="mb-3">
                            <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
                              {analytics.thumbnail ? (
                                <Image
                                  src={analytics.thumbnail}
                                  alt="投稿画像"
                                  width={400}
                                  height={400}
                                  quality={90}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="text-center text-black">
                                  <ImageIcon size={24} className="mx-auto mb-1 text-black" />
                                  <div className="text-xs">サムネがありません</div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 投稿文 */}
                          <div className="mb-3">
                            <p className="text-gray-700 text-sm">
                              {(() => {
                                const content = analytics.content || "投稿内容がありません";
                                // 投稿文から先頭・末尾の「##」「-」「空白」を削除
                                const cleanedContent = content
                                  .replace(/^[\s#-]+|[\s#-]+$/g, "")
                                  .replace(/^#+/g, "")
                                  .trim();
                                const firstSentence = cleanedContent.split(/[。！？]/)[0];
                                return (
                                  firstSentence +
                                  (cleanedContent.includes("。") ||
                                  cleanedContent.includes("！") ||
                                  cleanedContent.includes("？")
                                    ? "..."
                                    : "")
                                );
                              })()}
                            </p>
                          </div>

                          {/* ハッシュタグ */}
                          {analytics.hashtags &&
                            Array.isArray(analytics.hashtags) &&
                            analytics.hashtags.length > 0 && (
                              <div className="mb-3">
                                <div className="flex flex-wrap gap-1">
                                  {analytics.hashtags.slice(0, 3).map((hashtag, index) => {
                                    // ハッシュタグから先頭の#を全て削除してから表示時に#を追加
                                    const cleanHashtag = hashtag.replace(/^#+/, "").trim();
                                    return (
                                      <span
                                        key={index}
                                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs "
                                      >
                                        #{cleanHashtag}
                                      </span>
                                    );
                                  })}
                                  {analytics.hashtags.length > 3 && (
                                    <span className="px-2 py-1 bg-gray-100 text-black text-xs ">
                                      +{analytics.hashtags.length - 3}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                          {/* 分析データ */}
                          <div className="mb-3">
                            <div className="grid grid-cols-4 gap-4 text-center">
                              <div>
                                <div className="flex items-center justify-center mb-1">
                                  <Heart size={16} className="text-red-500" />
                                </div>
                                <div className="text-lg font-bold text-black">
                                  {(analytics.likes || 0).toLocaleString()}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-0.5">いいね</div>
                              </div>
                              <div>
                                <div className="flex items-center justify-center mb-1">
                                  <MessageCircle size={16} className="text-black" />
                                </div>
                                <div className="text-lg font-bold text-black">
                                  {(analytics.comments || 0).toLocaleString()}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-0.5">コメント</div>
                              </div>
                              <div>
                                <div className="flex items-center justify-center mb-1">
                                  <Share size={16} className="text-black" />
                                </div>
                                <div className="text-lg font-bold text-black">
                                  {(analytics.shares || 0).toLocaleString()}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-0.5">シェア</div>
                              </div>
                              <div>
                                <div className="flex items-center justify-center mb-1">
                                  <Bookmark size={16} className="text-black" />
                                </div>
                                <div className="text-lg font-bold text-black">
                                  {(analytics.saves || 0).toLocaleString()}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-0.5">保存</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              {/* 投稿一覧 */}
              <div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
                role="tabpanel"
                id={`posts-${activeTab}`}
                aria-labelledby={`tab-${activeTab}`}
              >
                {filteredPosts.map((post: PostData & { hasAnalytics?: boolean; analyticsFromData?: PostData["analytics"] }) => {
                  const postIdKey = normalizePostId(post.id);
                  const hasAnalytics =
                    analyticsData.some((a) => normalizePostId(a.postId) === postIdKey);
                  const analyticsFromData =
                    post.analyticsFromData ||
                    analyticsData.find((a) => normalizePostId(a.postId) === postIdKey);
                  const postAnalytics: AnalyticsData | null = analyticsFromData
                    ? {
                        id: (analyticsFromData as { id?: string })?.id || post.id,
                        postId: (analyticsFromData as { postId?: string })?.postId || post.id,
                        likes: (analyticsFromData as { likes?: number })?.likes || 0,
                        comments: (analyticsFromData as { comments?: number })?.comments || 0,
                        shares: (analyticsFromData as { shares?: number })?.shares || 0,
                        saves: (analyticsFromData as { saves?: number })?.saves || 0,
                        reach: (analyticsFromData as { reach?: number })?.reach || 0,
                        engagementRate: (analyticsFromData as { engagementRate?: number })?.engagementRate || 0,
                        followerIncrease: (analyticsFromData as { followerIncrease?: number })?.followerIncrease,
                        publishedAt: (() => {
                          const publishedAt = (analyticsFromData as { publishedAt?: Date | string })?.publishedAt;
                          if (publishedAt) {
                            return publishedAt instanceof Date ? publishedAt : new Date(publishedAt);
                          }
                          if (post.scheduledDate instanceof Date) {
                            return post.scheduledDate;
                          }
                          if (typeof post.scheduledDate === 'string') {
                            return new Date(post.scheduledDate);
                          }
                          if (post.scheduledDate && typeof post.scheduledDate === 'object' && 'toDate' in post.scheduledDate) {
                            return post.scheduledDate.toDate();
                          }
                          return new Date();
                        })(),
                        title: (analyticsFromData as { title?: string })?.title,
                        content: (analyticsFromData as { content?: string })?.content,
                        hashtags: (() => {
                          const hashtags = (analyticsFromData as { hashtags?: string[] | string })?.hashtags;
                          if (!hashtags) {
                            return undefined;
                          }
                          return Array.isArray(hashtags) ? hashtags : typeof hashtags === 'string' ? normalizeHashtags(hashtags) : undefined;
                        })(),
                        category: (analyticsFromData as { category?: string })?.category,
                        thumbnail: (analyticsFromData as { thumbnail?: string })?.thumbnail,
                        audience: (analyticsFromData as { audience?: unknown })?.audience as AnalyticsData['audience'],
                        reachSource: (analyticsFromData as { reachSource?: unknown })?.reachSource as AnalyticsData['reachSource'],
                      }
                    : null;

                  return (
                    <PostCard
                      key={post.id}
                      post={post}
                      hasAnalytics={hasAnalytics}
                      postAnalytics={postAnalytics}
                      onDeletePost={handleDeletePost}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
          {advisorOpen && (
            <section className="flex h-[min(86vh,820px)] w-[min(94vw,430px)] flex-col overflow-hidden border border-gray-200 bg-white shadow-lg lg:w-[430px]">
              <header className="flex items-center justify-between border-b border-gray-200 px-3 py-5">
                <div className="flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5 text-orange-600" />
                  <h3 className="text-xs font-semibold text-gray-800">分析チャットβ</h3>
                </div>
                <button
                  onClick={() => setAdvisorOpen(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                  aria-label="閉じる"
                >
                  閉じる
                </button>
              </header>
              <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
                <div className="flex items-center justify-between text-[11px] text-gray-600">
                  <span>{aiUsageLabel}</span>
                  <button
                    type="button"
                    onClick={() => {
                      void refreshUsage();
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    更新
                  </button>
                </div>
              </div>

              <div className="border-b border-orange-300 bg-gradient-to-r from-[#FF8A15] to-orange-500 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-white">相談する投稿を選択</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center border border-[#ffd3a8] bg-white px-2 py-1 text-[11px] font-medium text-[#c76400]">
                      対象 {filteredAdvisorPostOptions.length}件
                    </span>
                    {selectedAdvisorPostOption && (
                      <button
                        type="button"
                        onClick={() => setIsAdvisorSelectorOpen((prev) => !prev)}
                        className="border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {isAdvisorSelectorOpen ? "閉じる" : "投稿を変更"}
                      </button>
                    )}
                  </div>
                </div>

                {isAdvisorSelectorOpen && (
                  <>
                    <label className="mb-1 block text-[11px] font-medium text-gray-600">絞り込み</label>
                    <input
                      type="text"
                      value={advisorPostFilter}
                      onChange={(event) => setAdvisorPostFilter(event.target.value)}
                      placeholder="例: 新商品 / 02/18 / リール"
                      className="mb-3 w-full border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#ff8a15] focus:outline-none"
                    />

                    <label className="mb-1 block text-[11px] font-medium text-gray-600">投稿を選択</label>
                    <select
                      value={selectedAdvisorPostId}
                      onChange={(event) => {
                        setSelectedAdvisorPostId(event.target.value);
                        if (event.target.value) {
                          setIsAdvisorSelectorOpen(false);
                        }
                      }}
                      className="w-full border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#ff8a15] focus:outline-none"
                    >
                      {filteredAdvisorPostOptions.length === 0 ? (
                        <option value="">保存済み分析データがある投稿がありません</option>
                      ) : (
                        filteredAdvisorPostOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.title} / {option.dateLabel} / {formatPostTypeLabel(option.postType)}
                          </option>
                        ))
                      )}
                    </select>
                  </>
                )}

                {selectedAdvisorPostOption && (
                  <div className="mt-3 border border-[#ffd9b5] bg-white p-2.5">
                    <p className="mb-1 line-clamp-1 text-sm font-semibold text-gray-900">
                      {selectedAdvisorPostOption.title}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-gray-600">
                      <span className="inline-flex bg-[#fff5ea] px-2 py-1 text-[#c76400]">
                        {formatPostTypeLabel(selectedAdvisorPostOption.postType)}
                      </span>
                      <span>{selectedAdvisorPostOption.dateLabel}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 bg-gray-50 px-3 py-3">
                {advisorMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-end gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" && (
                      <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-orange-200 bg-white text-orange-600">
                        <Bot className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <div
                      className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-[#FF8A15] to-orange-500 text-white"
                          : "border border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      {renderAdvisorMessage(message)}
                    </div>
                  </div>
                ))}
                {advisorLoading && (
                  <div className="flex items-end gap-2 justify-start">
                    <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-orange-200 bg-white text-orange-600">
                      <Bot className="h-3.5 w-3.5" />
                    </span>
                    <div className="max-w-[88%] rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500">
                      回答中...
                    </div>
                  </div>
                )}
              </div>

              {advisorSuggestedQuestions.length > 0 && (
                <div className="border-t border-gray-200 px-3 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {advisorSuggestedQuestions.map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => {
                          void sendAdvisorMessage(question);
                        }}
                        disabled={!selectedAdvisorPostId || advisorLoading}
                        className="px-2 py-1 text-[11px] border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-60"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 px-3 py-2">
                <p className="text-[11px] text-gray-500">
                  質問は上の3ボタンから選択してください
                </p>
              </div>
            </section>
          )}

          <button
            onClick={() => setAdvisorOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FF8A15] to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg hover:opacity-95"
            aria-label="分析チャットを開く"
          >
            <Bot size={18} />
            分析チャットβ
          </button>
        </div>
      </SNSLayout>
    </>
  );
}
