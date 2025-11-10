import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";

interface AnalyticsData {
  id: string;
  userId: string;
  postId?: string;
  likes: number;
  comments: number;
  shares: number;
  reposts: number;
  reach: number;
  saves: number;
  followerIncrease: number;
  engagementRate: number;
  publishedAt: Date | { toDate: () => Date };
  publishedTime: string;
  createdAt: Date | { toDate: () => Date };
  // 投稿情報
  title?: string;
  content?: string;
  hashtags?: string[] | string; // 配列または文字列の両方に対応
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

interface PostData {
  id: string;
  title: string;
  content: string;
  hashtags: string[] | string; // 配列または文字列の両方に対応
  postType: "feed" | "reel" | "story";
  scheduledDate?: string;
  scheduledTime?: string;
  status: "draft" | "scheduled" | "published";
  createdAt: Date | { toDate: () => Date };
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  reach?: number;
  engagementRate?: number;
}

// 週の開始日と終了日を取得する関数
function getWeekRange(weekString: string): { start: Date; end: Date } {
  try {
    console.log("📅 getWeekRange呼び出し:", weekString);

    if (!weekString || !weekString.includes("-W")) {
      throw new Error(`Invalid week string format: ${weekString}`);
    }

    const [year, week] = weekString.split("-W");

    if (!year || !week || isNaN(parseInt(year)) || isNaN(parseInt(week))) {
      throw new Error(`Invalid year or week: year=${year}, week=${week}`);
    }

    const startOfYear = new Date(parseInt(year), 0, 1);
    const startOfWeek = new Date(
      startOfYear.getTime() + (parseInt(week) - 1) * 7 * 24 * 60 * 60 * 1000
    );
    const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);

    console.log("📅 getWeekRange結果:", { start: startOfWeek, end: endOfWeek });

    return { start: startOfWeek, end: endOfWeek };
  } catch (error) {
    console.error("❌ getWeekRangeエラー:", error);
    console.error("❌ weekString:", weekString);
    throw error;
  }
}

// 前期間のデータを取得
function getPreviousPeriod(period: "weekly" | "monthly", currentDate: string): string {
  try {
    console.log("📅 getPreviousPeriod呼び出し:", { period, currentDate });

    if (period === "monthly") {
      // 月次形式 (2025-10) を完全な日付に変換
      const fullDate = currentDate + "-01";
      console.log("📅 月次日付変換:", { currentDate, fullDate });

      const current = new Date(fullDate);
      if (isNaN(current.getTime())) {
        throw new Error(`Invalid date format: ${fullDate}`);
      }

      current.setMonth(current.getMonth() - 1);
      const result = current.toISOString().slice(0, 7);
      console.log("📅 getPreviousPeriod結果(monthly):", result);
      return result;
    } else {
      const [year, week] = currentDate.split("-W");

      if (!year || !week || isNaN(parseInt(year)) || isNaN(parseInt(week))) {
        throw new Error(`Invalid year or week: year=${year}, week=${week}`);
      }

      const currentWeek = parseInt(week);
      const previousWeek = currentWeek > 1 ? currentWeek - 1 : 52;
      const previousYear = currentWeek > 1 ? year : (parseInt(year) - 1).toString();
      const result = `${previousYear}-W${previousWeek.toString().padStart(2, "0")}`;
      console.log("📅 getPreviousPeriod結果(weekly):", result);
      return result;
    }
  } catch (error) {
    console.error("❌ getPreviousPeriodエラー:", error);
    console.error("❌ パラメータ:", { period, currentDate });
    throw error;
  }
}

// データを期間でフィルタリング
function filterDataByPeriod(
  data: AnalyticsData[],
  period: "weekly" | "monthly",
  date: string
): AnalyticsData[] {
  try {
    console.log("🔍 filterDataByPeriod呼び出し:", { dataLength: data.length, period, date });

    return data.filter((item) => {
      try {
        const itemDate =
          item.publishedAt instanceof Date
            ? item.publishedAt
            : item.publishedAt &&
                typeof item.publishedAt === "object" &&
                "toDate" in item.publishedAt
              ? item.publishedAt.toDate()
              : new Date(item.publishedAt);

        if (isNaN(itemDate.getTime())) {
          console.warn("⚠️ 無効な日付をスキップ:", item.publishedAt);
          return false;
        }

        if (period === "monthly") {
          const itemMonth = itemDate.toISOString().slice(0, 7);
          const matches = itemMonth === date;
          if (matches) {
            console.log("📅 月次マッチ:", { itemMonth, targetDate: date });
          }
          return matches;
        } else if (period === "weekly") {
          const weekRange = getWeekRange(date);
          const matches = itemDate >= weekRange.start && itemDate <= weekRange.end;
          if (matches) {
            console.log("📅 週次マッチ:", { itemDate, weekRange });
          }
          return matches;
        }

        return true;
      } catch (error) {
        console.error("❌ フィルタリングエラー:", error, "item:", item);
        return false;
      }
    });
  } catch (error) {
    console.error("❌ filterDataByPeriod全体エラー:", error);
    return [];
  }
}

// 統計値を計算
function calculateTotals(analytics: AnalyticsData[]) {
  return {
    totalLikes: analytics.reduce((sum, data) => sum + data.likes, 0),
    totalComments: analytics.reduce((sum, data) => sum + data.comments, 0),
    totalShares: analytics.reduce((sum, data) => sum + data.shares, 0),
    totalReposts: analytics.reduce((sum, data) => sum + (data.reposts || 0), 0),
    totalReach: analytics.reduce((sum, data) => sum + data.reach, 0),
    totalSaves: analytics.reduce((sum, data) => sum + (data.saves || 0), 0),
    totalFollowerIncrease: analytics.reduce((sum, data) => sum + (data.followerIncrease || 0), 0),
    avgEngagementRate:
      analytics.length > 0
        ? analytics.reduce((sum, data) => sum + (data.engagementRate || 0), 0) / analytics.length
        : 0,
    totalPosts: 0, // 投稿数は別途計算するため0で初期化
  };
}

// 変化率を計算
function calculateChange(current: number, previous: number): number {
  if (previous === 0) {return current > 0 ? 100 : 0;}
  return ((current - previous) / previous) * 100;
}

// オーディエンス分析を計算
function calculateAudienceAnalysis(analytics: AnalyticsData[]) {
  const audienceData = analytics.filter((data) => data.audience);
  if (audienceData.length === 0) {
    return {
      gender: { male: 0, female: 0, other: 0 },
      age: { "18-24": 0, "25-34": 0, "35-44": 0, "45-54": 0 },
    };
  }

  const avgGender = {
    male:
      audienceData.reduce((sum, data) => sum + (data.audience?.gender.male || 0), 0) /
      audienceData.length,
    female:
      audienceData.reduce((sum, data) => sum + (data.audience?.gender.female || 0), 0) /
      audienceData.length,
    other:
      audienceData.reduce((sum, data) => sum + (data.audience?.gender.other || 0), 0) /
      audienceData.length,
  };

  const avgAge = {
    "18-24":
      audienceData.reduce((sum, data) => sum + (data.audience?.age["18-24"] || 0), 0) /
      audienceData.length,
    "25-34":
      audienceData.reduce((sum, data) => sum + (data.audience?.age["25-34"] || 0), 0) /
      audienceData.length,
    "35-44":
      audienceData.reduce((sum, data) => sum + (data.audience?.age["35-44"] || 0), 0) /
      audienceData.length,
    "45-54":
      audienceData.reduce((sum, data) => sum + (data.audience?.age["45-54"] || 0), 0) /
      audienceData.length,
  };

  return { gender: avgGender, age: avgAge };
}

// 閲覧ソース分析を計算
function calculateReachSourceAnalysis(analytics: AnalyticsData[]) {
  const reachSourceData = analytics.filter((data) => data.reachSource);
  if (reachSourceData.length === 0) {
    return {
      sources: { posts: 0, profile: 0, explore: 0, search: 0 },
      followers: { followers: 0, nonFollowers: 0 },
    };
  }

  const avgSources = {
    posts:
      reachSourceData.reduce((sum, data) => sum + (data.reachSource?.sources.posts || 0), 0) /
      reachSourceData.length,
    profile:
      reachSourceData.reduce((sum, data) => sum + (data.reachSource?.sources.profile || 0), 0) /
      reachSourceData.length,
    explore:
      reachSourceData.reduce((sum, data) => sum + (data.reachSource?.sources.explore || 0), 0) /
      reachSourceData.length,
    search:
      reachSourceData.reduce((sum, data) => sum + (data.reachSource?.sources.search || 0), 0) /
      reachSourceData.length,
  };

  const avgFollowers = {
    followers:
      reachSourceData.reduce((sum, data) => sum + (data.reachSource?.followers.followers || 0), 0) /
      reachSourceData.length,
    nonFollowers:
      reachSourceData.reduce(
        (sum, data) => sum + (data.reachSource?.followers.nonFollowers || 0),
        0
      ) / reachSourceData.length,
  };

  return { sources: avgSources, followers: avgFollowers };
}

// ハッシュタグ統計を計算（postsコレクション + 手動入力分析データから取得）
function calculateHashtagStats(analytics: AnalyticsData[], posts: PostData[]) {
  const hashtagCounts: { [key: string]: number } = {};

  console.log("🔍 ハッシュタグ統計計算開始:", {
    postsCount: posts.length,
    analyticsCount: analytics.length,
  });

  // 1. postsコレクションから直接ハッシュタグを取得
  posts.forEach((post, index) => {
    console.log(`📝 Post ${index}:`, {
      postId: post.id,
      hashtags: post.hashtags,
      hasHashtags: !!post.hashtags && post.hashtags.length > 0,
    });

    if (post.hashtags) {
      let hashtagsArray: string[] = [];

      // hashtagsが配列か文字列かを判定
      if (Array.isArray(post.hashtags)) {
        hashtagsArray = post.hashtags;
      } else if (typeof post.hashtags === "string") {
        // 文字列の場合はカンマ区切りで分割
        hashtagsArray = post.hashtags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag);
      }

      console.log(`📝 Postハッシュタグ処理:`, {
        postId: post.id,
        originalHashtags: post.hashtags,
        hashtagsType: typeof post.hashtags,
        isArray: Array.isArray(post.hashtags),
        processedHashtags: hashtagsArray,
      });

      if (hashtagsArray.length > 0) {
        hashtagsArray.forEach((hashtag) => {
          hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
        });
      }
    }
  });

  // 2. 手動入力の分析データからもハッシュタグを取得（postIdがnullの場合）
  analytics.forEach((data, index) => {
    console.log(`📊 Analytics ${index}:`, {
      postId: data.postId,
      hashtags: data.hashtags,
      hasAnalyticsHashtags: !!data.hashtags && data.hashtags.length > 0,
      isManualInput: data.postId === null,
    });

    // postIdがnull（手動入力）の場合、分析データからハッシュタグを取得
    if (data.postId === null && data.hashtags) {
      let hashtagsArray: string[] = [];

      // hashtagsが配列か文字列かを判定
      if (Array.isArray(data.hashtags)) {
        hashtagsArray = data.hashtags;
      } else if (typeof data.hashtags === "string") {
        // 文字列の場合はカンマ区切りで分割
        hashtagsArray = data.hashtags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag);
      }

      console.log(`📊 手動入力ハッシュタグ処理:`, {
        postId: data.postId,
        originalHashtags: data.hashtags,
        hashtagsType: typeof data.hashtags,
        isArray: Array.isArray(data.hashtags),
        processedHashtags: hashtagsArray,
      });

      if (hashtagsArray.length > 0) {
        hashtagsArray.forEach((hashtag) => {
          hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
        });
      }
    }
  });

  console.log("📊 ハッシュタグ集計結果:", hashtagCounts);

  const result = Object.entries(hashtagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10) // 上位10件
    .map(([hashtag, count]) => ({ hashtag, count }));

  console.log("📊 最終ハッシュタグ結果:", result);

  return result;
}

// 投稿時間分析を計算
function calculateTimeSlotAnalysis(analytics: AnalyticsData[]) {
  const timeSlots = [
    { label: "早朝 (6-9時)", range: [6, 9], color: "from-blue-400 to-blue-600" },
    { label: "午前 (9-12時)", range: [9, 12], color: "from-green-400 to-green-600" },
    { label: "午後 (12-15時)", range: [12, 15], color: "from-yellow-400 to-yellow-600" },
    { label: "夕方 (15-18時)", range: [15, 18], color: "from-orange-400 to-orange-600" },
    { label: "夜 (18-21時)", range: [18, 21], color: "from-red-400 to-red-600" },
    { label: "深夜 (21-6時)", range: [21, 24], color: "from-purple-400 to-purple-600" },
  ];

  return timeSlots.map(({ label, range, color }) => {
    const postsInRange = analytics.filter((data) => {
      if (data.publishedTime && data.publishedTime !== "") {
        const hour = parseInt(data.publishedTime.split(":")[0]);

        if (range[0] === 21 && range[1] === 24) {
          return hour >= 21 || hour < 6;
        }

        return hour >= range[0] && hour < range[1];
      }
      return false;
    });

    const avgEngagement =
      postsInRange.length > 0
        ? postsInRange.reduce((sum, data) => sum + (data.likes + data.comments + data.shares), 0) /
          postsInRange.length
        : 0;

    return {
      label,
      range,
      color,
      postsInRange: postsInRange.length,
      avgEngagement,
    };
  });
}

// 投稿タイプ別統計を計算
function calculatePostTypeStats(analytics: AnalyticsData[], posts: PostData[]) {
  // analyticsから投稿タイプを集計（categoryフィールドを使用）
  const feedCount = analytics.filter((data) => data.category === "feed").length;
  const reelCount = analytics.filter((data) => data.category === "reel").length;
  const storyCount = analytics.filter((data) => data.category === "story").length;

  // postsからの集計（後方互換性のため）
  const postsFeedCount = posts.filter((post) => post.postType === "feed").length;
  const postsReelCount = posts.filter((post) => post.postType === "reel").length;
  const postsStoryCount = posts.filter((post) => post.postType === "story").length;

  // analyticsとpostsの合計
  const totalFeed = feedCount + postsFeedCount;
  const totalReel = reelCount + postsReelCount;
  const totalStory = storyCount + postsStoryCount;
  const total = totalFeed + totalReel + totalStory;

  return [
    {
      type: "feed",
      count: totalFeed,
      label: "📸 フィード",
      color: "from-blue-400 to-blue-600",
      bg: "from-blue-50 to-blue-100",
    },
    {
      type: "reel",
      count: totalReel,
      label: "🎬 リール",
      color: "from-purple-400 to-purple-600",
      bg: "from-purple-50 to-purple-100",
    },
    {
      type: "story",
      count: totalStory,
      label: "📱 ストーリーズ",
      color: "from-pink-400 to-pink-600",
      bg: "from-pink-50 to-pink-100",
    },
  ].map(({ type, count, label, color, bg }) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return { type, count, label, color, bg, percentage };
  });
}

export async function GET(request: NextRequest) {
  try {
    console.log("🚀 月次レポートサマリーAPI開始");

    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-monthly-report-summary", limit: 30, windowSeconds: 60 },
      auditEventName: "analytics_monthly_report_summary_access",
    });

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") as "weekly" | "monthly" | null;
    const date = searchParams.get("date");

    console.log("🔍 パラメータ確認:", { period, date });

    if (!period || !date) {
      console.log("❌ パラメータ不足");
      return NextResponse.json(
        { error: "period, date パラメータが必要です" },
        { status: 400 }
      );
    }

    console.log("📊 月次レポートサマリー取得開始:", { userId: uid, period, date });

    // Firebase接続確認
    console.log("🔍 Firebase接続確認中...");
    if (!adminDb) {
      console.error("❌ Firebase接続エラー: adminDb is null");
      return NextResponse.json({ error: "Firebase接続エラー" }, { status: 500 });
    }
    console.log("✅ Firebase接続OK");

    // 分析データを取得（投稿一覧ページと同じロジック）
    console.log("🔍 分析データ取得開始...");
    const analyticsSnapshot = await adminDb
      .collection("analytics")
      .where("userId", "==", uid)
      .get();
    console.log("✅ 分析データ取得完了:", analyticsSnapshot.docs.length, "件");
    const analytics: AnalyticsData[] = analyticsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId || "",
        postId: data.postId,
        likes: data.likes || 0,
        comments: data.comments || 0,
        shares: data.shares || 0,
        reposts: data.reposts || 0,
        reach: data.reach || 0,
        saves: data.saves || 0,
        followerIncrease: data.followerIncrease || 0,
        engagementRate: data.engagementRate || 0,
        publishedAt: data.publishedAt?.toDate
          ? data.publishedAt.toDate()
          : new Date(data.publishedAt || Date.now()),
        publishedTime: data.publishedTime || "",
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate()
          : new Date(data.createdAt || Date.now()),
        // 投稿情報
        title: data.title,
        content: data.content,
        hashtags: data.hashtags,
        thumbnail: data.thumbnail,
        category: data.category,
        // フィード専用フィールド
        reachFollowerPercent: data.reachFollowerPercent,
        interactionCount: data.interactionCount,
        interactionFollowerPercent: data.interactionFollowerPercent,
        reachSourceProfile: data.reachSourceProfile,
        reachSourceFeed: data.reachSourceFeed,
        reachSourceExplore: data.reachSourceExplore,
        reachSourceSearch: data.reachSourceSearch,
        reachSourceOther: data.reachSourceOther,
        reachedAccounts: data.reachedAccounts,
        profileVisits: data.profileVisits,
        profileFollows: data.profileFollows,
        // リール専用フィールド
        reelReachFollowerPercent: data.reelReachFollowerPercent,
        reelInteractionCount: data.reelInteractionCount,
        reelInteractionFollowerPercent: data.reelInteractionFollowerPercent,
        reelReachSourceProfile: data.reelReachSourceProfile,
        reelReachSourceReel: data.reelReachSourceReel,
        reelReachSourceExplore: data.reelReachSourceExplore,
        reelReachSourceSearch: data.reelReachSourceSearch,
        reelReachSourceOther: data.reelReachSourceOther,
        reelReachedAccounts: data.reelReachedAccounts,
        reelSkipRate: data.reelSkipRate,
        reelNormalSkipRate: data.reelNormalSkipRate,
        reelPlayTime: data.reelPlayTime,
        reelAvgPlayTime: data.reelAvgPlayTime,
        // オーディエンス分析
        audience: data.audience,
        reachSource: data.reachSource,
      };
    });

    // 投稿データを取得（投稿一覧ページと同じロジック）
    console.log("🔍 投稿データ取得開始...");
    const postsSnapshot = await adminDb.collection("posts").where("userId", "==", uid).get();
    console.log("✅ 投稿データ取得完了:", postsSnapshot.docs.length, "件");
    const posts: PostData[] = postsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || "",
        content: data.content || "",
        hashtags: data.hashtags || [],
        postType: data.postType || "feed",
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime,
        status: data.status || "draft",
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate()
          : new Date(data.createdAt || Date.now()),
        likes: data.likes,
        comments: data.comments,
        shares: data.shares,
        views: data.views,
        reach: data.reach,
        engagementRate: data.engagementRate,
      };
    });

    console.log("📊 データ取得完了:", {
      analyticsCount: analytics.length,
      postsCount: posts.length,
    });

    // 現在期間のデータをフィルタリング（投稿一覧ページと同じロジック）
    const currentAnalytics = filterDataByPeriod(analytics, period, date);

    // 投稿データは期間フィルタリングを別途実装
    const currentPosts = posts.filter((post) => {
      const postDate =
        post.createdAt instanceof Date
          ? post.createdAt
          : post.createdAt && typeof post.createdAt === "object" && "toDate" in post.createdAt
            ? post.createdAt.toDate()
            : new Date(post.createdAt);

      if (period === "monthly") {
        const postMonth = postDate.toISOString().slice(0, 7);
        return postMonth === date;
      } else if (period === "weekly") {
        const weekRange = getWeekRange(date);
        return postDate >= weekRange.start && postDate <= weekRange.end;
      }
      return true;
    });

    // 前期間のデータを取得
    const previousPeriod = getPreviousPeriod(period, date);
    const previousAnalytics = filterDataByPeriod(analytics, period, previousPeriod);
    const previousPosts = posts.filter((post) => {
      const postDate =
        post.createdAt instanceof Date
          ? post.createdAt
          : post.createdAt && typeof post.createdAt === "object" && "toDate" in post.createdAt
            ? post.createdAt.toDate()
            : new Date(post.createdAt);

      if (period === "monthly") {
        const postMonth = postDate.toISOString().slice(0, 7);
        return postMonth === previousPeriod;
      } else if (period === "weekly") {
        const weekRange = getWeekRange(previousPeriod);
        return postDate >= weekRange.start && postDate <= weekRange.end;
      }
      return true;
    });

    console.log("📊 期間別データ:", {
      currentAnalytics: currentAnalytics.length,
      currentPosts: currentPosts.length,
      previousAnalytics: previousAnalytics.length,
      previousPosts: previousPosts.length,
    });

    // 統計値を計算（投稿一覧ページと同じロジック）
    const currentTotals = calculateTotals(currentAnalytics);
    const previousTotals = calculateTotals(previousAnalytics);

    console.log("📊 calculateTotals結果（投稿数上書き前）:", {
      currentTotalsPosts: currentTotals.totalPosts,
      previousTotalsPosts: previousTotals.totalPosts,
      currentAnalyticsLength: currentAnalytics.length,
      previousAnalyticsLength: previousAnalytics.length,
    });

    // 投稿数も正確に計算
    currentTotals.totalPosts = currentPosts.length;
    previousTotals.totalPosts = previousPosts.length;

    console.log("📊 投稿数上書き後:", {
      currentTotalsPosts: currentTotals.totalPosts,
      previousTotalsPosts: previousTotals.totalPosts,
      currentPostsLength: currentPosts.length,
      previousPostsLength: previousPosts.length,
    });

    // 変化率を計算
    const changes = {
      likesChange: calculateChange(currentTotals.totalLikes, previousTotals.totalLikes),
      commentsChange: calculateChange(currentTotals.totalComments, previousTotals.totalComments),
      sharesChange: calculateChange(currentTotals.totalShares, previousTotals.totalShares),
      repostsChange: calculateChange(currentTotals.totalReposts, previousTotals.totalReposts),
      reachChange: calculateChange(currentTotals.totalReach, previousTotals.totalReach),
      savesChange: calculateChange(currentTotals.totalSaves, previousTotals.totalSaves),
      followerChange: calculateChange(
        currentTotals.totalFollowerIncrease,
        previousTotals.totalFollowerIncrease
      ),
      engagementRateChange: calculateChange(
        currentTotals.avgEngagementRate,
        previousTotals.avgEngagementRate
      ),
      postsChange: calculateChange(currentTotals.totalPosts, previousTotals.totalPosts),
    };

    // 詳細分析を計算（投稿一覧ページと同じロジック）
    const audienceAnalysis = calculateAudienceAnalysis(currentAnalytics);
    const reachSourceAnalysis = calculateReachSourceAnalysis(currentAnalytics);
    const hashtagStats = calculateHashtagStats(currentAnalytics, currentPosts);
    const timeSlotAnalysis = calculateTimeSlotAnalysis(currentAnalytics);
    const postTypeStats = calculatePostTypeStats(currentAnalytics, currentPosts);

    console.log("📊 投稿タイプ別統計:", postTypeStats);

    // 最適な投稿時間を特定
    const bestTimeSlot = timeSlotAnalysis.reduce((best, current) => {
      if (current.postsInRange > 0 && current.avgEngagement > best.avgEngagement) {
        return current;
      }
      return best;
    }, timeSlotAnalysis[0]);

    const summary = {
      period,
      date,
      totals: currentTotals,
      previousTotals,
      changes,
      audienceAnalysis,
      reachSourceAnalysis,
      hashtagStats,
      timeSlotAnalysis,
      bestTimeSlot,
      postTypeStats,
      // 新しいフィールドを追加
      avgEngagementRate: currentTotals.avgEngagementRate,
      totalSaves: currentTotals.totalSaves,
      totalReposts: currentTotals.totalReposts,
      totalFollowerIncrease: currentTotals.totalFollowerIncrease,
    };

    console.log("📊 月次レポートサマリー計算完了");

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("❌ 月次レポートサマリー取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(
      {
        ...body,
        error: "月次レポートサマリーの取得に失敗しました",
        details: body.details ?? (body.error !== "月次レポートサマリーの取得に失敗しました" ? body.error : undefined),
        code: body.code ?? "analytics_monthly_report_summary_error",
      },
      { status }
    );
  }
}
