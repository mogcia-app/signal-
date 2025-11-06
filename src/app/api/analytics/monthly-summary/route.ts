import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cache, generateCacheKey } from "../../../../lib/cache";

interface AnalyticsData {
  id: string;
  postId: string | null;
  userId: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  profileClicks?: number;
  websiteClicks?: number;
  storyViews?: number;
  followerChange?: number;
  publishedAt: Date;
  publishedTime?: string;
  createdAt: Date;
  title?: string;
  content?: string;
  hashtags?: string[];
  category?: string;
  thumbnail?: string;
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

// 月次集計データ生成（サーバー側でロジック隠蔽）
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "monthly"; // weekly or monthly
    const date = searchParams.get("date"); // YYYY-MM or YYYY-WW

    if (!userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // キャッシュキー生成
    const cacheKey = generateCacheKey("monthly-summary", { userId, period, date });

    // キャッシュから取得を試行
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // 分析データを取得
    const analyticsRef = collection(db, "analytics");
    const q = query(analyticsRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    const allAnalyticsData = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        publishedAt: data.publishedAt?.toDate
          ? data.publishedAt.toDate()
          : new Date(data.publishedAt),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      } as AnalyticsData;
    });

    // 期間別フィルタリング
    let filteredData = allAnalyticsData;

    if (period === "monthly" && date) {
      filteredData = allAnalyticsData.filter((data) => {
        const dataDate = new Date(data.publishedAt);
        const dataMonth = dataDate.toISOString().slice(0, 7);
        return dataMonth === date;
      });
    } else if (period === "weekly" && date) {
      // 週の範囲を計算
      const [year, week] = date.split("-W");
      const startOfYear = new Date(parseInt(year), 0, 1);
      const startOfWeek = new Date(
        startOfYear.getTime() + (parseInt(week) - 1) * 7 * 24 * 60 * 60 * 1000
      );
      const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);

      filteredData = allAnalyticsData.filter((data) => {
        const dataDate = new Date(data.publishedAt);
        return dataDate >= startOfWeek && dataDate <= endOfWeek;
      });
    }

    // 集計データ計算
    const totals = {
      totalLikes: filteredData.reduce((sum, data) => sum + data.likes, 0),
      totalComments: filteredData.reduce((sum, data) => sum + data.comments, 0),
      totalShares: filteredData.reduce((sum, data) => sum + data.shares, 0),
      totalReach: filteredData.reduce((sum, data) => sum + data.reach, 0),
      totalFollowerChange: filteredData.reduce((sum, data) => sum + (data.followerChange || 0), 0),
      totalPosts: filteredData.length,
    };

    // 投稿タイプ別統計
    const postTypeStats = {
      feed: filteredData.filter((data) => {
        if (!data.postId) {return data.category === "feed";}
        // 投稿データから取得する場合は別途処理が必要
        return data.category === "feed";
      }).length,
      reel: filteredData.filter((data) => {
        if (!data.postId) {return data.category === "reel";}
        return data.category === "reel";
      }).length,
      story: filteredData.filter((data) => {
        if (!data.postId) {return data.category === "story";}
        return data.category === "story";
      }).length,
    };

    // ハッシュタグ分析
    const hashtagCounts: { [key: string]: number } = {};
    filteredData.forEach((data) => {
      if (data.hashtags && Array.isArray(data.hashtags)) {
        data.hashtags.forEach((hashtag) => {
          hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
        });
      }
    });

    const topHashtags = Object.entries(hashtagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([hashtag, count]) => ({ hashtag, count }));

    // 投稿時間分析
    const timeSlotData = [
      { label: "早朝 (6-9時)", range: [6, 9] },
      { label: "午前 (9-12時)", range: [9, 12] },
      { label: "午後 (12-15時)", range: [12, 15] },
      { label: "夕方 (15-18時)", range: [15, 18] },
      { label: "夜 (18-21時)", range: [18, 21] },
      { label: "深夜 (21-6時)", range: [21, 24] },
    ].map(({ label, range }) => {
      const postsInRange = filteredData.filter((data) => {
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
          ? postsInRange.reduce(
              (sum, data) => sum + (data.likes + data.comments + data.shares),
              0
            ) / postsInRange.length
          : 0;

      return {
        label,
        range,
        postsInRange: postsInRange.length,
        avgEngagement: Math.round(avgEngagement),
      };
    });

    // オーディエンス分析
    const audienceData = filteredData.filter((data) => data.audience);
    const audienceStats = {
      gender: {
        male:
          audienceData.length > 0
            ? audienceData.reduce((sum, data) => sum + (data.audience?.gender?.male || 0), 0) /
              audienceData.length
            : 0,
        female:
          audienceData.length > 0
            ? audienceData.reduce((sum, data) => sum + (data.audience?.gender?.female || 0), 0) /
              audienceData.length
            : 0,
        other:
          audienceData.length > 0
            ? audienceData.reduce((sum, data) => sum + (data.audience?.gender?.other || 0), 0) /
              audienceData.length
            : 0,
      },
      age: {
        "18-24":
          audienceData.length > 0
            ? audienceData.reduce((sum, data) => sum + (data.audience?.age?.["18-24"] || 0), 0) /
              audienceData.length
            : 0,
        "25-34":
          audienceData.length > 0
            ? audienceData.reduce((sum, data) => sum + (data.audience?.age?.["25-34"] || 0), 0) /
              audienceData.length
            : 0,
        "35-44":
          audienceData.length > 0
            ? audienceData.reduce((sum, data) => sum + (data.audience?.age?.["35-44"] || 0), 0) /
              audienceData.length
            : 0,
        "45-54":
          audienceData.length > 0
            ? audienceData.reduce((sum, data) => sum + (data.audience?.age?.["45-54"] || 0), 0) /
              audienceData.length
            : 0,
      },
    };

    const result = {
      period,
      date,
      totals,
      postTypeStats,
      topHashtags,
      timeSlotData,
      audienceStats,
      dataCount: filteredData.length,
      generatedAt: new Date().toISOString(),
    };

    // キャッシュに保存（15分間）
    cache.set(cacheKey, result, 15 * 60 * 1000);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Monthly summary calculation error:", error);
    return NextResponse.json(
      {
        error: "集計データの生成に失敗しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
