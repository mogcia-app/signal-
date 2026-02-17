"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "../../../components/auth-guard";
import { useAuth } from "../../../contexts/auth-context";
import FeedAnalyticsForm from "../../instagram/components/FeedAnalyticsForm";
import SNSLayout from "../../../components/sns-layout";
import { CheckCircle, RefreshCw, X } from "lucide-react";
import type { InputData as FeedInputData, CommentThread } from "../../instagram/components/types";
import { authFetch } from "../../../utils/authFetch";

// オーディエンス分析データの型定義
interface AudienceData {
  gender: {
    male: number; // 男性の割合（%）
    female: number; // 女性の割合（%）
    other: number; // その他の割合（%）
  };
  age: {
    "13-17": number; // 13-17歳の割合（%）
    "18-24": number; // 18-24歳の割合（%）
    "25-34": number; // 25-34歳の割合（%）
    "35-44": number; // 35-44歳の割合（%）
    "45-54": number; // 45-54歳の割合（%）
    "55-64": number; // 55-64歳の割合（%）
    "65+": number; // 65歳以上の割合（%）
  };
}

// 閲覧数ソース分析データの型定義
interface ReachSourceData {
  sources: {
    posts: number; // 投稿からの閲覧割合（%）
    profile: number; // プロフィールからの閲覧割合（%）
    explore: number; // 発見からの閲覧割合（%）
    search: number; // 検索からの閲覧割合（%）
    other: number; // その他の閲覧割合（%）
  };
  followers: {
    followers: number; // フォロワー内の閲覧割合（%）
    nonFollowers: number; // フォロワー外の閲覧割合（%）
  };
}

// 投稿分析データの型定義
interface AnalyticsData {
  id: string;
  userId: string;
  postId?: string; // 投稿とのリンク
  likes: number;
  comments: number;
  shares: number;
  reposts: number;
  reach: number;
  saves: number;
  followerIncrease: number;
  engagementRate: number;
  publishedAt: Date;
  publishedTime: string;
  createdAt: Date;
  // 投稿情報
  title?: string;
  content?: string;
  hashtags?: string[];
  thumbnail?: string;
  category?: "reel" | "feed" | "story";
  // フィード専用フィールド
  reachFollowerPercent?: number;
  interactionCount?: number;
  interactionFollowerPercent?: number;
  reachSourceProfile?: number;
  reachSourceFeed?: number;
  reachSourceExplore?: number;
  reachSourceSearch?: number;
  reachSourceOther?: number;
  reachedAccounts?: number;
  profileVisits?: number;
  profileFollows?: number;
  externalLinkTaps?: number;
  // リール専用フィールド
  reelReachFollowerPercent?: number;
  reelInteractionCount?: number;
  reelInteractionFollowerPercent?: number;
  reelReachSourceProfile?: number;
  reelReachSourceReel?: number;
  reelReachSourceExplore?: number;
  reelReachSourceSearch?: number;
  reelReachSourceOther?: number;
  reelReachedAccounts?: number;
  reelSkipRate?: number;
  reelNormalSkipRate?: number;
  reelPlayTime?: number;
  reelAvgPlayTime?: number;
  // オーディエンス分析
  audience?: AudienceData;
  // 閲覧数ソース分析
  reachSource?: ReachSourceData;
  commentThreads?: CommentThread[];
}

function createDefaultInputData(): FeedInputData {
  return {
    likes: "",
    comments: "",
    shares: "",
    reposts: "",
    reach: "",
    saves: "",
    followerIncrease: "",
    publishedAt: new Date().toISOString().split("T")[0],
    publishedTime: new Date().toTimeString().slice(0, 5),
    title: "",
    content: "",
    hashtags: "",
    thumbnail: "",
    category: "feed",
    reachFollowerPercent: "",
    interactionCount: "",
    interactionFollowerPercent: "",
    reachSourceProfile: "",
    reachSourceFeed: "",
    reachSourceExplore: "",
    reachSourceSearch: "",
    reachSourceOther: "",
    reachedAccounts: "",
    profileVisits: "",
    profileFollows: "",
    externalLinkTaps: "",
    reelReachFollowerPercent: "",
    reelInteractionCount: "",
    reelInteractionFollowerPercent: "",
    reelReachSourceProfile: "",
    reelReachSourceReel: "",
    reelReachSourceExplore: "",
    reelReachSourceSearch: "",
    reelReachSourceOther: "",
    reelReachedAccounts: "",
    reelSkipRate: "",
    reelNormalSkipRate: "",
    reelPlayTime: "",
    reelAvgPlayTime: "",
    audience: {
      gender: {
        male: "",
        female: "",
        other: "",
      },
      age: {
        "13-17": "",
        "18-24": "",
        "25-34": "",
        "35-44": "",
        "45-54": "",
        "55-64": "",
        "65+": "",
      },
    },
    reachSource: {
      sources: {
        posts: "",
        profile: "",
        explore: "",
        search: "",
        other: "",
      },
      followers: {
        followers: "",
        nonFollowers: "",
      },
    },
    commentThreads: [],
  };
}

function AnalyticsFeedContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [postData, setPostData] = useState<{
    id: string;
    title: string;
    content: string;
    hashtags: string[];
    postType: "feed" | "reel" | "story";
    imageUrl?: string | null;
    publishedAt?: string;
    publishedTime?: string;
  } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetConfirming, setIsResetConfirming] = useState(false);
  const [inputData, setInputData] = useState<FeedInputData>(createDefaultInputData());

  // BFF APIから投稿データと分析データを取得
  const fetchAnalyticsData = useCallback(async () => {
    if (!user?.uid) {
      return;
    }

    setIsLoading(true);
    try {
      // URLパラメータからpostIdを取得
      const urlParams = new URLSearchParams(window.location.search);
      const postId = urlParams.get("postId");

      const url = postId ? `/api/analytics/feed?postId=${postId}` : `/api/analytics/feed`;
      const response = await authFetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        // 投稿データを設定
        if (result.data.post) {
          const post = result.data.post;
          const postData = {
            id: post.id,
            title: post.title || "",
            content: post.content || "",
            hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
            postType: post.postType || "feed",
            imageUrl: post.imageUrl || null,
            publishedAt: post.publishedAt || null,
            publishedTime: post.publishedTime || null,
            scheduledDate: post.scheduledDate || null,
            scheduledTime: post.scheduledTime || null,
          };
          setPostData(postData);

          // publishedAt/publishedTimeがなければ、scheduledDate/scheduledTimeを使用
          let publishedAtValue: string | null = postData.publishedAt;
          let publishedTimeValue: string | null = postData.publishedTime;
          
          if (!publishedAtValue && postData.scheduledDate) {
            // scheduledDateをpublishedAtとして使用
            const scheduledDate = postData.scheduledDate;
            if (scheduledDate instanceof Date) {
              publishedAtValue = scheduledDate.toISOString().split("T")[0];
            } else if (typeof scheduledDate === "string") {
              publishedAtValue = scheduledDate.split("T")[0];
            }
            publishedTimeValue = postData.scheduledTime || publishedTimeValue;
          }

          // inputDataを更新
          setInputData((prev) => ({
            ...prev,
            title: postData.title,
            content: postData.content,
            hashtags: Array.isArray(postData.hashtags)
              ? postData.hashtags.map((tag: string) => tag.replace(/^#+/, "").trim()).join(" ")
              : "",
            category:
              postData.postType === "feed" ? "feed" : postData.postType === "reel" ? "reel" : "story",
            publishedAt:
              publishedAtValue ??
              prev.publishedAt ??
              new Date().toISOString().split("T")[0],
            publishedTime:
              publishedTimeValue ??
              prev.publishedTime ??
              new Date().toTimeString().slice(0, 5),
            thumbnail:
              typeof postData.imageUrl === "string" && postData.imageUrl.length > 0
                ? postData.imageUrl
                : prev.thumbnail,
          }));
        }

        // 分析データを設定
        const analytics = result.data.analytics || [];
        const convertedData: AnalyticsData[] = analytics.map((item: {
          id?: string;
          postId?: string | null;
          likes?: number;
          comments?: number;
          shares?: number;
          reposts?: number;
          reach?: number;
          saves?: number;
          followerIncrease?: number;
          engagementRate?: number;
          publishedAt?: string | Date;
          publishedTime?: string;
          createdAt?: string | Date;
          title?: string;
          content?: string;
          hashtags?: string[] | string;
          thumbnail?: string;
          category?: "feed" | "reel" | "story";
          reachFollowerPercent?: number;
          interactionCount?: number;
          interactionFollowerPercent?: number;
          reachSourceProfile?: number;
          reachSourceFeed?: number;
          reachSourceExplore?: number;
          reachSourceSearch?: number;
          reachSourceOther?: number;
          reachedAccounts?: number;
          profileVisits?: number;
          profileFollows?: number;
          externalLinkTaps?: number;
          reelReachFollowerPercent?: number;
          reelInteractionCount?: number;
          reelInteractionFollowerPercent?: number;
          reelReachSourceProfile?: number;
          reelReachSourceReel?: number;
          reelReachSourceExplore?: number;
          reelReachSourceSearch?: number;
          reelReachSourceOther?: number;
          reelReachedAccounts?: number;
          reelSkipRate?: number;
          reelNormalSkipRate?: number;
          reelPlayTime?: number;
          reelAvgPlayTime?: number;
          audience?: AudienceData;
          reachSource?: ReachSourceData;
          commentThreads?: CommentThread[];
        }) => ({
          id: item.id || "",
          userId: user.uid,
          postId: item.postId || "",
          likes: item.likes || 0,
          comments: item.comments || 0,
          shares: item.shares || 0,
          reposts: item.reposts || 0,
          reach: item.reach || 0,
          saves: item.saves || 0,
          followerIncrease: item.followerIncrease || 0,
          engagementRate: item.engagementRate || 0,
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
          publishedTime: item.publishedTime || "",
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          title: item.title || "",
          content: item.content || "",
          hashtags: item.hashtags || [],
          thumbnail: item.thumbnail || "",
          category: item.category || "feed",
          // フィード専用フィールド
          reachFollowerPercent: item.reachFollowerPercent || 0,
          interactionCount: item.interactionCount || 0,
          interactionFollowerPercent: item.interactionFollowerPercent || 0,
          reachSourceProfile: item.reachSourceProfile || 0,
          reachSourceFeed: item.reachSourceFeed || 0,
          reachSourceExplore: item.reachSourceExplore || 0,
          reachSourceSearch: item.reachSourceSearch || 0,
          reachSourceOther: item.reachSourceOther || 0,
          reachedAccounts: item.reachedAccounts || 0,
          profileVisits: item.profileVisits || 0,
          profileFollows: item.profileFollows || 0,
          externalLinkTaps: item.externalLinkTaps || 0,
          // リール専用フィールド
          reelReachFollowerPercent: item.reelReachFollowerPercent || 0,
          reelInteractionCount: item.reelInteractionCount || 0,
          reelInteractionFollowerPercent: item.reelInteractionFollowerPercent || 0,
          reelReachSourceProfile: item.reelReachSourceProfile || 0,
          reelReachSourceReel: item.reelReachSourceReel || 0,
          reelReachSourceExplore: item.reelReachSourceExplore || 0,
          reelReachSourceSearch: item.reachSourceSearch || 0,
          reelReachSourceOther: item.reelReachSourceOther || 0,
          reelReachedAccounts: item.reelReachedAccounts || 0,
          reelSkipRate: item.reelSkipRate || 0,
          reelNormalSkipRate: item.reelNormalSkipRate || 0,
          reelPlayTime: item.reelPlayTime || 0,
          reelAvgPlayTime: item.reelAvgPlayTime || 0,
          audience: item.audience || {},
          reachSource: item.reachSource || {},
          commentThreads: Array.isArray(item.commentThreads) ? item.commentThreads : [],
        }));

        setAnalyticsData(convertedData);
      }
    } catch (error) {
      console.error("Analytics fetch error:", error);
      setAnalyticsData([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // URLパラメータを監視してデータを取得
  useEffect(() => {
    if (typeof window !== "undefined" && user?.uid) {
      fetchAnalyticsData();
    }
  }, [fetchAnalyticsData, user?.uid]);

  // postDataが取得された時にinputDataを更新
  useEffect(() => {
    if (postData) {
      setInputData((prev) => ({
        ...prev,
        title: postData.title,
        content: postData.content,
        hashtags: Array.isArray(postData.hashtags)
          ? postData.hashtags.map((tag: string) => tag.replace(/^#+/, "").trim()).join(" ")
          : "",
        category:
          postData.postType === "feed" ? "feed" : postData.postType === "reel" ? "reel" : "story",
        publishedAt:
          postData.publishedAt ??
          prev.publishedAt ??
          new Date().toISOString().split("T")[0],
        publishedTime:
          postData.publishedTime ??
          prev.publishedTime ??
          new Date().toTimeString().slice(0, 5),
        thumbnail:
          typeof postData.imageUrl === "string" && postData.imageUrl.length > 0
            ? postData.imageUrl
            : prev.thumbnail,
      }));
    }
  }, [postData]);

  // 分析データが取得された時にinputDataを更新（保存済みの分析データをフォームに反映）
  useEffect(() => {
    if (analyticsData.length > 0) {
      // 最新の分析データを取得（createdAtでソート）
      const latestAnalytics = analyticsData
        .slice()
        .sort((a, b) => {
          const aTime = a.createdAt?.getTime() || 0;
          const bTime = b.createdAt?.getTime() || 0;
          return bTime - aTime; // 新しい順
        })[0];

      if (latestAnalytics) {
        setInputData((prev) => ({
          ...prev,
          likes: String(latestAnalytics.likes || 0),
          comments: String(latestAnalytics.comments || 0),
          shares: String(latestAnalytics.shares || 0),
          reposts: String(latestAnalytics.reposts || 0),
          reach: String(latestAnalytics.reach || 0),
          saves: String(latestAnalytics.saves || 0),
          followerIncrease: String(latestAnalytics.followerIncrease || 0),
          reachFollowerPercent: String(latestAnalytics.reachFollowerPercent || 0),
          interactionCount: String(latestAnalytics.interactionCount || 0),
          interactionFollowerPercent: String(latestAnalytics.interactionFollowerPercent || 0),
          reachSourceProfile: String(latestAnalytics.reachSourceProfile || 0),
          reachSourceFeed: String(latestAnalytics.reachSourceFeed || 0),
          reachSourceExplore: String(latestAnalytics.reachSourceExplore || 0),
          reachSourceSearch: String(latestAnalytics.reachSourceSearch || 0),
          reachSourceOther: String(latestAnalytics.reachSourceOther || 0),
          reachedAccounts: String(latestAnalytics.reachedAccounts || 0),
          profileVisits: String(latestAnalytics.profileVisits || 0),
          profileFollows: String(latestAnalytics.profileFollows || 0),
          externalLinkTaps: String(latestAnalytics.externalLinkTaps || 0),
          commentThreads: latestAnalytics.commentThreads || [],
          // オーディエンスデータ
          audience: latestAnalytics.audience
            ? {
                gender: {
                  male: String(latestAnalytics.audience.gender?.male || 0),
                  female: String(latestAnalytics.audience.gender?.female || 0),
                  other: String(latestAnalytics.audience.gender?.other || 0),
                },
                age: {
                  "13-17": String(latestAnalytics.audience.age?.["13-17"] || 0),
                  "18-24": String(latestAnalytics.audience.age?.["18-24"] || 0),
                  "25-34": String(latestAnalytics.audience.age?.["25-34"] || 0),
                  "35-44": String(latestAnalytics.audience.age?.["35-44"] || 0),
                  "45-54": String(latestAnalytics.audience.age?.["45-54"] || 0),
                  "55-64": String(latestAnalytics.audience.age?.["55-64"] || 0),
                  "65+": String(latestAnalytics.audience.age?.["65+"] || 0),
                },
              }
            : prev.audience,
          // リーチソースデータ
          reachSource: latestAnalytics.reachSource
            ? {
                sources: {
                  posts: String(latestAnalytics.reachSource.sources?.posts || 0),
                  profile: String(latestAnalytics.reachSource.sources?.profile || 0),
                  explore: String(latestAnalytics.reachSource.sources?.explore || 0),
                  search: String(latestAnalytics.reachSource.sources?.search || 0),
                  other: String(latestAnalytics.reachSource.sources?.other || 0),
                },
                followers: {
                  followers: String(latestAnalytics.reachSource.followers?.followers || 0),
                  nonFollowers: String(latestAnalytics.reachSource.followers?.nonFollowers || 0),
                },
              }
            : prev.reachSource,
        }));
      }
    }
  }, [analyticsData]);

  const handleResetAnalytics = useCallback(async () => {
    if (!user?.uid) {
      router.push("/login");
      return;
    }
    if (!postData?.id) {
      setToastMessage({ message: "投稿が選択されていません。投稿一覧から分析ページを開いてください。", type: "error" });
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    if (!isResetConfirming) {
      setIsResetConfirming(true);
      return;
    }

    setIsResetting(true);
    setResetError(null);

    try {
      const params = new URLSearchParams({ postId: postData.id });
      const response = await authFetch(`/api/analytics/by-post?${params.toString()}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || `Failed with status ${response.status}`);
      }

      await response.json();

      const defaultInput = createDefaultInputData();
      if (postData) {
        defaultInput.title = postData.title ?? "";
        defaultInput.content = postData.content ?? "";
        defaultInput.hashtags = Array.isArray(postData.hashtags)
          ? postData.hashtags.join(" ")
          : postData.hashtags || "";
        defaultInput.category =
          postData.postType === "feed" ? "feed" : postData.postType === "reel" ? "reel" : "story";
        defaultInput.publishedAt =
          postData.publishedAt ?? new Date().toISOString().split("T")[0];
        defaultInput.publishedTime =
          postData.publishedTime ?? new Date().toTimeString().slice(0, 5);
      }

      setInputData(defaultInput);
      setAnalyticsData((prev) => prev.filter((item) => item.postId !== postData.id));

      await fetchAnalyticsData();

      setToastMessage({ message: "分析データをリセットしました。", type: "success" });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error) {
      console.error("Analytics reset error:", error);
      const message =
        error instanceof Error ? error.message : "分析データのリセットに失敗しました。";
      setResetError(message);
      setToastMessage({ message: message, type: "error" });
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsResetting(false);
      setIsResetConfirming(false);
    }
  }, [user?.uid, postData, router, fetchAnalyticsData, isResetConfirming]);

  // 投稿分析データを保存（simple API経由）
  const handleSaveAnalytics = async (payload?: { memo: string }) => {
    if (!user?.uid) {
      // ログイン画面に自動リダイレクト
      router.push("/login");
      return;
    }

    const requiredReactionFields: Array<{ key: keyof FeedInputData; label: string }> = [
      { key: "likes", label: "いいね数" },
      { key: "comments", label: "コメント数" },
      { key: "shares", label: "シェア数" },
      { key: "reposts", label: "リポスト数" },
      { key: "saves", label: "保存数" },
      { key: "followerIncrease", label: "フォロワー増加数" },
    ];
    const missingFields = requiredReactionFields.filter(
      ({ key }) => String(inputData[key] ?? "").trim() === ""
    );
    if (missingFields.length > 0) {
      setToastMessage({
        message: `フィード反応データは必須です（未入力: ${missingFields.map((f) => f.label).join("、")}）`,
        type: "error",
      });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setIsLoading(true);
    try {
      console.log("Saving analytics data via simple API");
      const toHalfWidth = (value: string): string =>
        value.replace(/[０-９．，－]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
      const parseIntSafe = (value: unknown): number => {
        const normalized = toHalfWidth(String(value ?? "")).replace(/,/g, "").trim();
        const matched = normalized.match(/-?\d+/);
        return matched ? Number.parseInt(matched[0], 10) : 0;
      };
      const parseFloatSafe = (value: unknown): number => {
        const normalized = toHalfWidth(String(value ?? "")).replace(/,/g, "").trim();
        const matched = normalized.match(/-?\d+(?:\.\d+)?/);
        return matched ? Number.parseFloat(matched[0]) : 0;
      };

      // Firebase認証トークンを取得
      const response = await fetch("/api/analytics/simple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          postId: postData?.id ?? null,
          likes: parseIntSafe(inputData.likes),
          comments: parseIntSafe(inputData.comments),
          shares: parseIntSafe(inputData.shares),
          reposts: parseIntSafe(inputData.reposts),
          reach: parseIntSafe(inputData.reach),
          saves: parseIntSafe(inputData.saves),
          followerIncrease: parseIntSafe(inputData.followerIncrease),
          publishedAt: inputData.publishedAt,
          publishedTime: inputData.publishedTime,
          title: inputData.title,
          content: inputData.content,
          hashtags: inputData.hashtags
            .split(/[,\s]+/)
            .map((tag) => tag.replace(/^#+/, "").trim())
            .filter((tag) => tag),
          thumbnail: inputData.thumbnail,
          category: inputData.category,
          // フィード専用フィールド
          reachFollowerPercent: parseFloatSafe(inputData.reachFollowerPercent),
          interactionCount: parseIntSafe(inputData.interactionCount),
          interactionFollowerPercent: parseFloatSafe(inputData.interactionFollowerPercent),
          reachSourceProfile: parseIntSafe(inputData.reachSourceProfile),
          reachSourceFeed: parseIntSafe(inputData.reachSourceFeed),
          reachSourceExplore: parseIntSafe(inputData.reachSourceExplore),
          reachSourceSearch: parseIntSafe(inputData.reachSourceSearch),
          reachSourceOther: parseIntSafe(inputData.reachSourceOther),
          reachedAccounts: parseIntSafe(inputData.reachedAccounts),
          profileVisits: parseIntSafe(inputData.profileVisits),
          profileFollows: parseIntSafe(inputData.profileFollows),
          externalLinkTaps: parseIntSafe(inputData.externalLinkTaps),
          audience: {
            gender: {
              male: parseFloatSafe(inputData.audience.gender.male),
              female: parseFloatSafe(inputData.audience.gender.female),
              other: parseFloatSafe(inputData.audience.gender.other),
            },
            age: {
              "13-17": parseFloatSafe(inputData.audience.age["13-17"]),
              "18-24": parseFloatSafe(inputData.audience.age["18-24"]),
              "25-34": parseFloatSafe(inputData.audience.age["25-34"]),
              "35-44": parseFloatSafe(inputData.audience.age["35-44"]),
              "45-54": parseFloatSafe(inputData.audience.age["45-54"]),
              "55-64": parseFloatSafe(inputData.audience.age["55-64"]),
              "65+": parseFloatSafe(inputData.audience.age["65+"]),
            },
          },
          reachSource: {
            sources: {
              posts: parseFloatSafe(inputData.reachSource.sources.posts),
              profile: parseFloatSafe(inputData.reachSource.sources.profile),
              explore: parseFloatSafe(inputData.reachSource.sources.explore),
              search: parseFloatSafe(inputData.reachSource.sources.search),
              other: parseFloatSafe(inputData.reachSource.sources.other),
            },
            followers: {
              followers: parseFloatSafe(inputData.reachSource.followers.followers),
              nonFollowers: parseFloatSafe(inputData.reachSource.followers.nonFollowers),
            },
          },
          commentThreads: inputData.commentThreads
            .map((thread) => ({
              comment: thread.comment?.trim() || "",
              reply: thread.reply?.trim() || "",
            }))
            .filter((thread) => thread.comment || thread.reply),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "保存に失敗しました");
      }

      const result = await response.json();
      console.log("Analytics saved via simple API:", result);

      void payload;
      setToastMessage({ message: "投稿分析データを保存しました！", type: "success" });
      setTimeout(() => setToastMessage(null), 3000);

      // データを再取得
      await fetchAnalyticsData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("posts-analytics-updated"));
      }

      // 次のアクションを即座に更新
      if (
        typeof window !== "undefined" &&
        (window as Window & { refreshNextActions?: () => void }).refreshNextActions
      ) {
        console.log("🔄 Triggering next actions refresh after analytics save");
        (window as Window & { refreshNextActions?: () => void }).refreshNextActions!();
      }

      // 入力データをリセット
      setInputData(createDefaultInputData());
    } catch (error) {
      console.error("保存エラー:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setToastMessage({ message: `保存に失敗しました: ${errorMessage}`, type: 'error' });
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
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
      
      <SNSLayout
        customTitle="フィード分析"
        customDescription="Instagram投稿の分析データを入力・管理します"
      >
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 bg-white min-h-screen space-y-6">
          <div className="bg-white border border-orange-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">投稿分析データ</p>
              <p className="text-xs text-gray-500 mt-1">
                投稿に紐付く分析値を入力し、AI分析や統計に反映させます。
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetAnalytics}
              disabled={!postData?.id || isResetting}
              className="inline-flex items-center px-3 py-2 text-xs font-semibold text-red-600 border border-red-500 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isResetting ? "animate-spin" : ""}`} />
              {isResetting
                ? "リセット中..."
                : isResetConfirming
                  ? "もう一度押してリセット確定"
                  : "分析データをリセット"}
            </button>
          </div>
          {resetError ? (
            <p className="text-sm text-red-600">{resetError}</p>
          ) : null}
          {isResetConfirming && !isResetting ? (
            <button
              type="button"
              onClick={() => setIsResetConfirming(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              キャンセル
            </button>
          ) : null}

          <FeedAnalyticsForm
            data={inputData}
            onChange={setInputData}
            onSave={handleSaveAnalytics}
            isLoading={isLoading}
            postData={postData}
          />
        </div>
      </SNSLayout>
    </>
  );
}

export default function AnalyticsFeedPage() {
  return (
    <AuthGuard>
      <AnalyticsFeedContent />
    </AuthGuard>
  );
}
