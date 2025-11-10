import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import { cache, generateCacheKey } from "../../../../lib/cache";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";

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

// 厳格なアカウントスコア計算（サーバー側でロジック隠蔽）
function calculateAccountScore(analyticsData: AnalyticsData[], postsCount: number) {
  if (analyticsData.length === 0) {return 0;}

  // エンゲージメントスコア (50%) - 超厳格
  const avgEngagementRate =
    analyticsData.reduce((sum, data) => {
      const likes = data.likes || 0;
      const comments = data.comments || 0;
      const shares = data.shares || 0;
      const reach = data.reach || 1;
      const engagementRate = ((likes + comments + shares) / reach) * 100;
      return sum + engagementRate;
    }, 0) / analyticsData.length;
  const engagementScore = Math.min(50, avgEngagementRate * 10); // 10%で50点

  // 成長スコア (25%) - フォロワー増加が厳しい
  const totalFollowerIncrease = analyticsData.reduce(
    (sum, data) => sum + (data.followerChange || 0),
    0
  );
  const growthScore = Math.min(25, totalFollowerIncrease * 0.05); // 20人増で1点

  // 投稿品質スコア (15%) - リーチ数ベース
  const avgReach = analyticsData.reduce((sum, data) => sum + data.reach, 0) / analyticsData.length;
  const qualityScore = Math.min(15, avgReach / 2000); // 2000リーチで15点

  // 一貫性スコア (10%) - 投稿頻度の安定性
  const postsPerWeek = postsCount / 4; // 月4週として計算
  const consistencyScore = Math.min(10, postsPerWeek * 3.33); // 週3回で10点

  return Math.round(engagementScore + growthScore + qualityScore + consistencyScore);
}

// 厳格なランク評価
function getPerformanceRating(accountScore: number) {
  if (accountScore >= 85) {return { rating: "S", label: "業界トップ0.1%", color: "purple" };}
  if (accountScore >= 70) {return { rating: "A", label: "優秀なクリエイター", color: "blue" };}
  if (accountScore >= 55) {return { rating: "B", label: "良好", color: "green" };}
  if (accountScore >= 40) {return { rating: "C", label: "平均", color: "yellow" };}
  if (accountScore >= 25) {return { rating: "D", label: "改善必要", color: "orange" };}
  return { rating: "F", label: "大幅改善必要", color: "red" };
}

// アカウントスコア取得
export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-account-score", limit: 30, windowSeconds: 60 },
      auditEventName: "analytics_account_score_access",
    });
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "monthly"; // weekly or monthly
    const date = searchParams.get("date"); // YYYY-MM or YYYY-WW

    // キャッシュキー生成
    const cacheKey = generateCacheKey("account-score", { userId: uid, period, date });

    // キャッシュから取得を試行
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // 分析データを取得
    const snapshot = await adminDb.collection("analytics").where("userId", "==", uid).get();

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
    let postsCount = allAnalyticsData.length;

    if (period === "monthly" && date) {
      filteredData = allAnalyticsData.filter((data) => {
        const dataDate = new Date(data.publishedAt);
        const dataMonth = dataDate.toISOString().slice(0, 7);
        return dataMonth === date;
      });
      postsCount = filteredData.length;
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
      postsCount = filteredData.length;
    }

    // アカウントスコア計算
    const accountScore = calculateAccountScore(filteredData, postsCount);
    const rating = getPerformanceRating(accountScore);

    // スコア内訳
    const breakdown = {
      engagement: Math.min(
        50,
        (filteredData.reduce((sum, data) => {
          const engagementRate = ((data.likes + data.comments + data.shares) / data.reach) * 100;
          return sum + engagementRate;
        }, 0) /
          Math.max(1, filteredData.length)) *
          10
      ),
      growth: Math.min(
        25,
        filteredData.reduce((sum, data) => sum + (data.followerChange || 0), 0) * 0.05
      ),
      quality: Math.min(
        15,
        filteredData.reduce((sum, data) => sum + data.reach, 0) /
          Math.max(1, filteredData.length) /
          2000
      ),
      consistency: Math.min(10, (postsCount / 4) * 3.33),
    };

    const result = {
      score: accountScore,
      rating: rating.rating,
      label: rating.label,
      color: rating.color,
      breakdown: breakdown,
      period: period,
      date: date,
      postsCount: postsCount,
      dataCount: filteredData.length,
    };

    // キャッシュに保存（10分間）
    cache.set(cacheKey, result, 10 * 60 * 1000);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Account score calculation error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
