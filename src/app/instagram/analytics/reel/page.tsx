"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "../../../../components/auth-guard";
import { useAuth } from "../../../../contexts/auth-context";
import { usePlanData } from "../../../../hooks/usePlanData";
import { CurrentPlanCard } from "../../../../components/CurrentPlanCard";
import ReelAnalyticsForm from "../../components/ReelAnalyticsForm";
import ReelAnalyticsStats from "../../components/ReelAnalyticsStats";
import SNSLayout from "../../../../components/sns-layout";
import { CheckCircle, X } from "lucide-react";

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
}

function AnalyticsReelContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { planData } = usePlanData("instagram");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [postData, setPostData] = useState<{
    id: string;
    title: string;
    content: string;
    hashtags: string[];
    postType: "feed" | "reel" | "story";
  } | null>(null);
  // 投稿データを取得する関数
  const fetchPostData = useCallback(
    async (id: string) => {
      if (!user?.uid) {return;}

      try {
        const response = await fetch(`/api/posts`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("Reel Analytics API Response:", result);

        if (result.posts && Array.isArray(result.posts)) {
          const post = result.posts.find((p: { id: string }) => p.id === id);
          console.log("Found post for reel analytics:", post);

          if (post) {
            const postData = {
              id: post.id,
              title: post.title || "",
              content: post.content || "",
              hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
              postType: post.postType || "reel",
            };

            console.log("Setting post data for reel analytics:", postData);
            setPostData(postData);
          } else {
            console.error("Post not found for reel analytics with ID:", id);
          }
        } else {
          console.error("Invalid API response structure for reel analytics:", result);
        }
      } catch (error) {
        console.error("投稿データ取得エラー:", error);
      }
    },
    [user?.uid]
  );

  // URLパラメータを監視
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get("postId");
      console.log("URL params postId:", id);
      if (id) {fetchPostData(id);}
    }
  }, [fetchPostData]);

  // postDataが取得された時にinputDataを更新
  useEffect(() => {
    if (postData) {
      setInputData((prev) => ({
        ...prev,
        title: postData.title,
        content: postData.content,
        hashtags: Array.isArray(postData.hashtags)
          ? postData.hashtags.join(" ")
          : postData.hashtags || "",
        category:
          postData.postType === "feed" ? "feed" : postData.postType === "reel" ? "reel" : "story",
      }));
    }
  }, [postData]);

  const [inputData, setInputData] = useState({
    likes: "",
    comments: "",
    shares: "",
    reposts: "",
    reach: "",
    saves: "",
    followerIncrease: "",
    publishedAt: new Date().toISOString().split("T")[0],
    publishedTime: new Date().toTimeString().slice(0, 5), // HH:MM形式
    title: "",
    content: "",
    hashtags: "",
    thumbnail: "",
    category: "reel" as "reel" | "feed" | "story",
    // フィード専用フィールド
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
    // リール専用フィールド
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
  });

  // 分析データを取得（simple API経由）
  const fetchAnalytics = useCallback(async () => {
    console.log("Fetch analytics called, user:", user);
    console.log("User UID:", user?.uid);
    if (!user?.uid) {
      console.log("User not authenticated, skipping analytics fetch");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Fetching analytics via simple API for user:", user.uid);

      // Firebase認証トークンを取得
      const response = await fetch(`/api/analytics/simple?userId=${user.uid}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Simple API fetch result:", result);

      // simple APIの結果をAnalyticsData形式に変換
      if (result.success && result.data) {
        const convertedData: AnalyticsData[] = result.data.map(
          (item: {
            id: string;
            postId?: string;
            title: string;
            content: string;
            hashtags: string[];
            category: string;
            thumbnail: string;
            publishedAt: string;
            publishedTime: string;
            likes: number;
            comments: number;
            shares: number;
            reposts: number;
            reach: number;
            saves: number;
            followerIncrease: number;
            engagementRate: number;
            reachFollowerPercent: number;
            interactionCount: number;
            interactionFollowerPercent: number;
            reachSourceProfile: number;
            reachSourceFeed: number;
            reachSourceExplore: number;
            reachSourceSearch: number;
            reachSourceOther: number;
            reachedAccounts: number;
            profileVisits: number;
            profileFollows: number;
            reelReachFollowerPercent: number;
            reelInteractionCount: number;
            reelInteractionFollowerPercent: number;
            reelReachSourceProfile: number;
            reelReachSourceReel: number;
            reelReachSourceExplore: number;
            reelReachSourceSearch: number;
            reelReachSourceOther: number;
            reelReachedAccounts: number;
            reelSkipRate: number;
            reelNormalSkipRate: number;
            reelPlayTime: number;
            reelAvgPlayTime: number;
            audience: AudienceData;
            reachSource: ReachSourceData;
            sentiment: "satisfied" | "dissatisfied" | null;
            sentimentMemo: string;
            createdAt: string;
            updatedAt: string;
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
            category: item.category || "reel",
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
            // リール専用フィールド
            reelReachFollowerPercent: item.reelReachFollowerPercent || 0,
            reelInteractionCount: item.reelInteractionCount || 0,
            reelInteractionFollowerPercent: item.reelInteractionFollowerPercent || 0,
            reelReachSourceProfile: item.reelReachSourceProfile || 0,
            reelReachSourceReel: item.reelReachSourceReel || 0,
            reelReachSourceExplore: item.reelReachSourceExplore || 0,
            reelReachSourceSearch: item.reelReachSourceSearch || 0,
            reelReachSourceOther: item.reelReachSourceOther || 0,
            reelReachedAccounts: item.reelReachedAccounts || 0,
            reelSkipRate: item.reelSkipRate || 0,
            reelNormalSkipRate: item.reelNormalSkipRate || 0,
            reelPlayTime: item.reelPlayTime || 0,
            reelAvgPlayTime: item.reelAvgPlayTime || 0,
            audience: item.audience,
            reachSource: item.reachSource,
          })
        );

        console.log("Converted analytics data:", convertedData);
        setAnalyticsData(convertedData);
      } else {
        console.log("No analytics data found");
        setAnalyticsData([]);
      }
    } catch (error) {
      console.error("Analytics fetch error:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
      setAnalyticsData([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // コンポーネントマウント時にデータを取得
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // 投稿分析データを保存（simple API経由）
  const handleSaveAnalytics = async (sentimentData?: {
    sentiment: "satisfied" | "dissatisfied" | null;
    memo: string;
  }) => {
    if (!user?.uid) {
      // ログイン画面に自動リダイレクト
      router.push("/login");
      return;
    }

    if (!inputData.likes) {
      setToastMessage({ message: "いいね数を入力してください", type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    if (!inputData.reach) {
      setToastMessage({ message: "閲覧数を入力してください", type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setIsLoading(true);
    try {
      console.log("Saving analytics data via simple API");

      // Firebase認証トークンを取得
      const response = await fetch("/api/analytics/simple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          postId: null, // 投稿とのリンクなし
          likes: parseInt(inputData.likes) || 0,
          comments: parseInt(inputData.comments) || 0,
          shares: parseInt(inputData.shares) || 0,
          reposts: parseInt(inputData.reposts) || 0,
          reach: parseInt(inputData.reach) || 0,
          saves: parseInt(inputData.saves) || 0,
          followerIncrease: parseInt(inputData.followerIncrease) || 0,
          publishedAt: inputData.publishedAt,
          publishedTime: inputData.publishedTime,
          title: inputData.title,
          content: inputData.content,
          hashtags: inputData.hashtags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag),
          thumbnail: inputData.thumbnail,
          category: inputData.category,
          // フィード専用フィールド
          reachFollowerPercent: parseFloat(inputData.reachFollowerPercent) || 0,
          interactionCount: parseInt(inputData.interactionCount) || 0,
          interactionFollowerPercent: parseFloat(inputData.interactionFollowerPercent) || 0,
          reachSourceProfile: parseInt(inputData.reachSourceProfile) || 0,
          reachSourceFeed: parseInt(inputData.reachSourceFeed) || 0,
          reachSourceExplore: parseInt(inputData.reachSourceExplore) || 0,
          reachSourceSearch: parseInt(inputData.reachSourceSearch) || 0,
          reachSourceOther: parseInt(inputData.reachSourceOther) || 0,
          reachedAccounts: parseInt(inputData.reachedAccounts) || 0,
          profileVisits: parseInt(inputData.profileVisits) || 0,
          profileFollows: parseInt(inputData.profileFollows) || 0,
          // リール専用フィールド
          reelReachFollowerPercent: parseFloat(inputData.reelReachFollowerPercent) || 0,
          reelInteractionCount: parseInt(inputData.reelInteractionCount) || 0,
          reelInteractionFollowerPercent: parseFloat(inputData.reelInteractionFollowerPercent) || 0,
          reelReachSourceProfile: parseInt(inputData.reelReachSourceProfile) || 0,
          reelReachSourceReel: parseInt(inputData.reelReachSourceReel) || 0,
          reelReachSourceExplore: parseInt(inputData.reelReachSourceExplore) || 0,
          reelReachSourceSearch: parseInt(inputData.reelReachSourceSearch) || 0,
          reelReachSourceOther: parseInt(inputData.reelReachSourceOther) || 0,
          reelReachedAccounts: parseInt(inputData.reelReachedAccounts) || 0,
          reelSkipRate: parseFloat(inputData.reelSkipRate) || 0,
          reelNormalSkipRate: parseFloat(inputData.reelNormalSkipRate) || 0,
          reelPlayTime: parseInt(inputData.reelPlayTime) || 0,
          reelAvgPlayTime: parseFloat(inputData.reelAvgPlayTime) || 0,
          audience: {
            gender: {
              male: parseFloat(inputData.audience.gender.male) || 0,
              female: parseFloat(inputData.audience.gender.female) || 0,
              other: parseFloat(inputData.audience.gender.other) || 0,
            },
            age: {
              "13-17": parseFloat(inputData.audience.age["13-17"]) || 0,
              "18-24": parseFloat(inputData.audience.age["18-24"]) || 0,
              "25-34": parseFloat(inputData.audience.age["25-34"]) || 0,
              "35-44": parseFloat(inputData.audience.age["35-44"]) || 0,
              "45-54": parseFloat(inputData.audience.age["45-54"]) || 0,
              "55-64": parseFloat(inputData.audience.age["55-64"]) || 0,
              "65+": parseFloat(inputData.audience.age["65+"]) || 0,
            },
          },
          reachSource: {
            sources: {
              posts: parseFloat(inputData.reachSource.sources.posts) || 0,
              profile: parseFloat(inputData.reachSource.sources.profile) || 0,
              explore: parseFloat(inputData.reachSource.sources.explore) || 0,
              search: parseFloat(inputData.reachSource.sources.search) || 0,
              other: parseFloat(inputData.reachSource.sources.other) || 0,
            },
            followers: {
              followers: parseFloat(inputData.reachSource.followers.followers) || 0,
              nonFollowers: parseFloat(inputData.reachSource.followers.nonFollowers) || 0,
            },
          },
          sentiment: sentimentData?.sentiment || null,
          sentimentMemo: sentimentData?.memo || "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "保存に失敗しました");
      }

      const result = await response.json();
      console.log("Analytics saved via simple API:", result);

      setToastMessage({ message: "投稿分析データを保存しました！", type: 'success' });
      setTimeout(() => setToastMessage(null), 3000);

      // データを再取得
      await fetchAnalytics();

      // 次のアクションを即座に更新
      if (
        typeof window !== "undefined" &&
        (window as Window & { refreshNextActions?: () => void }).refreshNextActions
      ) {
        console.log("🔄 Triggering next actions refresh after analytics save");
        (window as Window & { refreshNextActions?: () => void }).refreshNextActions!();
      }

      // 入力データをリセット
      setInputData({
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
        category: "reel",
        // フィード専用フィールド
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
        // リール専用フィールド
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
      });
    } catch (error) {
      console.error("保存エラー:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setToastMessage({ message: `保存に失敗しました: ${errorMessage}`, type: 'error' });
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // 統計計算（数値に変換してから計算）
  const totalFollowerIncrease =
    analyticsData?.reduce((sum, data) => sum + (Number(data.followerIncrease) || 0), 0) || 0;

  // 実際のフォロワー数計算（計画の現在フォロワー数 + フォロワー増加数の合計）
  const actualFollowers = planData ? (planData.currentFollowers || 0) + totalFollowerIncrease : 0;

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
        customTitle="リール分析"
        customDescription="Instagramリール投稿の分析データを入力・管理します"
      >
        <div className="p-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* 左カラム: 分析データ入力フォーム */}
          <div className="space-y-6">
            {/* 統合された分析データ入力フォーム */}
            <ReelAnalyticsForm
              data={inputData}
              onChange={setInputData}
              onSave={handleSaveAnalytics}
              isLoading={isLoading}
              postData={postData}
            />
          </div>

          {/* 右カラム: 運用計画・統計表示 */}
          <div className="space-y-6">
            {/* 運用計画セクション */}
            <CurrentPlanCard
              planData={planData}
              variant="detailed"
              snsType="instagram"
              actualFollowers={actualFollowers}
            />

            {/* 統計表示コンポーネント */}
            <ReelAnalyticsStats analyticsData={analyticsData} isLoading={isLoading} />
          </div>
        </div>
      </div>
      </SNSLayout>
    </>
  );
}

export default function AnalyticsReelPage() {
  return (
    <AuthGuard>
      <AnalyticsReelContent />
    </AuthGuard>
  );
}
