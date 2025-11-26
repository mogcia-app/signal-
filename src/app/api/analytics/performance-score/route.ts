import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import * as admin from "firebase-admin";

interface AnalyticsData {
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  saves?: number;
  followerIncrease?: number;
  publishedAt: Date | admin.firestore.Timestamp;
}

interface PerformanceScoreResult {
  score: number;
  rating: "S" | "A" | "B" | "C" | "D" | "F";
  label: string;
  color: string;
  breakdown: {
    engagement: number;
    growth: number;
    quality: number;
    consistency: number;
  };
  kpis: {
    totalLikes: number;
    totalReach: number;
    totalSaves: number;
    totalComments: number;
    totalFollowerIncrease: number;
  };
  metrics: {
    postCount: number;
    analyzedCount: number;
    hasPlan: boolean;
  };
}

// パフォーマンス評価スコア計算
function calculatePerformanceScore(params: {
  postCount: number;
  analyzedCount: number;
  hasPlan: boolean;
  totalLikes: number;
  totalReach: number;
  totalSaves: number;
  totalComments: number;
  analyticsData: AnalyticsData[];
}): PerformanceScoreResult {
  const { postCount, analyzedCount, hasPlan, totalLikes, totalReach, totalSaves, totalComments, analyticsData } = params;

  if (analyticsData.length === 0) {
    return {
      score: 0,
      rating: "F",
      label: "データ不足",
      color: "red",
      breakdown: {
        engagement: 0,
        growth: 0,
        quality: 0,
        consistency: 0,
      },
      kpis: {
        totalLikes: 0,
        totalReach: 0,
        totalSaves: 0,
        totalComments: 0,
        totalFollowerIncrease: 0,
      },
      metrics: {
        postCount: 0,
        analyzedCount: 0,
        hasPlan: false,
      },
    };
  }

  // エンゲージメントスコア (50%)
  const avgEngagementRate =
    analyticsData.reduce((sum, data) => {
      const likes = data.likes || 0;
      const comments = data.comments || 0;
      const shares = data.shares || 0;
      const reach = data.reach || 1;
      const engagementRate = ((likes + comments + shares) / reach) * 100;
      return sum + engagementRate;
    }, 0) / analyticsData.length;
  const engagementScore = Math.min(50, avgEngagementRate * 10);

  // 成長スコア (25%)
  const totalFollowerIncrease = analyticsData.reduce(
    (sum, data) => sum + (data.followerIncrease || 0),
    0
  );
  const growthScore = Math.min(25, totalFollowerIncrease * 0.05);

  // 投稿品質スコア (15%)
  const avgReach = analyticsData.reduce((sum, data) => sum + data.reach, 0) / analyticsData.length;
  const qualityScore = Math.min(15, avgReach / 2000);

  // 一貫性スコア (10%)
  const postsPerWeek = postCount / 4; // 月4週として計算
  const consistencyScore = Math.min(10, postsPerWeek * 3.33);

  // スコア内訳を先に計算（丸めた値）
  const breakdown = {
    engagement: Math.round(engagementScore),
    growth: Math.round(growthScore),
    quality: Math.round(qualityScore),
    consistency: Math.round(consistencyScore),
  };

  // スコア内訳の合計を総スコアとする（一致を保証）
  const totalScore = breakdown.engagement + breakdown.growth + breakdown.quality + breakdown.consistency;

  // ランク評価
  let rating: "S" | "A" | "B" | "C" | "D" | "F";
  let label: string;
  let color: string;

  if (totalScore >= 85) {
    rating = "S";
    label = "業界トップ0.1%";
    color = "purple";
  } else if (totalScore >= 70) {
    rating = "A";
    label = "優秀なクリエイター";
    color = "blue";
  } else if (totalScore >= 55) {
    rating = "B";
    label = "良好";
    color = "green";
  } else if (totalScore >= 40) {
    rating = "C";
    label = "平均";
    color = "yellow";
  } else if (totalScore >= 25) {
    rating = "D";
    label = "改善必要";
    color = "orange";
  } else {
    rating = "F";
    label = "大幅改善必要";
    color = "red";
  }

  return {
    score: totalScore,
    rating,
    label,
    color,
    breakdown,
    kpis: {
      totalLikes,
      totalReach,
      totalSaves,
      totalComments,
      totalFollowerIncrease,
    },
    metrics: {
      postCount,
      analyzedCount,
      hasPlan,
    },
  };
}

// 月の範囲を計算
function getMonthRange(date: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = date.split("-").map(Number);
  const start = new Date(Date.UTC(yearStr, monthStr - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(yearStr, monthStr, 0, 23, 59, 59, 999));
  return { start, end };
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-performance-score", limit: 30, windowSeconds: 60 },
      auditEventName: "analytics_performance_score_access",
    });

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // YYYY-MM形式

    if (!date || !/^\d{4}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "date parameter is required (format: YYYY-MM)" },
        { status: 400 }
      );
    }

    // 月の範囲を計算
    const { start, end } = getMonthRange(date);
    const startTimestamp = admin.firestore.Timestamp.fromDate(start);
    const endTimestamp = admin.firestore.Timestamp.fromDate(end);

    // 必要なデータを取得（並列）
    const [postsSnapshot, analyticsSnapshot, plansSnapshot] = await Promise.all([
      // 期間内の投稿を取得（投稿日でフィルタリング）
      adminDb
        .collection("posts")
        .where("userId", "==", uid)
        .where("createdAt", ">=", startTimestamp)
        .where("createdAt", "<=", endTimestamp)
        .get(),

      // 期間内の分析データを取得（期間フィルタリングをクエリで実行）
      adminDb
        .collection("analytics")
        .where("userId", "==", uid)
        .where("publishedAt", ">=", startTimestamp)
        .where("publishedAt", "<=", endTimestamp)
        .get(),

      // 計画の有無
      adminDb
        .collection("plans")
        .where("userId", "==", uid)
        .where("snsType", "==", "instagram")
        .where("status", "==", "active")
        .limit(1)
        .get(),
    ]);

    // 期間内の投稿IDを取得
    const postIdsInPeriod = new Set(
      postsSnapshot.docs.map((doc) => doc.id)
    );
    const postCount = postIdsInPeriod.size;

    // 期間内の投稿に対応する分析データを抽出（postIdで紐付け）
    const analyticsByPostId = new Map<string, AnalyticsData>();

    analyticsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const postId = data.postId;

      // postIdが期間内の投稿に含まれている場合のみ使用
      if (postId && postIdsInPeriod.has(postId)) {
        // publishedAtの型を統一（Timestamp → Date）
        const publishedAt = data.publishedAt
          ? data.publishedAt instanceof admin.firestore.Timestamp
            ? data.publishedAt.toDate()
            : data.publishedAt instanceof Date
              ? data.publishedAt
              : new Date(data.publishedAt)
          : new Date();

        const analyticsItem: AnalyticsData = {
          likes: data.likes || 0,
          comments: data.comments || 0,
          shares: data.shares || 0,
          reach: data.reach || 0,
          saves: data.saves || 0,
          followerIncrease: data.followerIncrease || 0,
          publishedAt,
        };

        // 同じ投稿に複数の分析データがある場合、最新のものを使用
        const existing = analyticsByPostId.get(postId);
        if (!existing || publishedAt > existing.publishedAt) {
          analyticsByPostId.set(postId, analyticsItem);
        }
      }
    });

    // Mapから配列に変換
    const validAnalyticsData = Array.from(analyticsByPostId.values());
    const analyzedCount = validAnalyticsData.length;

    // KPIを集計（期間内の投稿に対応する分析データのみ）
    const totalLikes = validAnalyticsData.reduce((sum, data) => sum + data.likes, 0);
    const totalReach = validAnalyticsData.reduce((sum, data) => sum + data.reach, 0);
    const totalSaves = validAnalyticsData.reduce((sum, data) => sum + (data.saves || 0), 0);
    const totalComments = validAnalyticsData.reduce((sum, data) => sum + data.comments, 0);

    // フォロワー増加数の計算（kpi-breakdownと同じロジック）
    // 1. analyticsのfollowerIncreaseの合計を計算
    const followerIncreaseFromPosts = validAnalyticsData.reduce(
      (sum, data) => sum + (data.followerIncrease || 0),
      0
    );

    // 2. 前月を計算
    const [yearStr, monthStr] = date.split("-").map(Number);
    const prevMonth = new Date(yearStr, monthStr - 2, 1);
    const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

    // 3. 当月と前月のデータを取得
    const [currentMonthSnapshot, prevMonthSnapshot, userDoc] = await Promise.all([
      // 当月のデータ
      adminDb
        .collection("follower_counts")
        .where("userId", "==", uid)
        .where("snsType", "==", "instagram")
        .where("month", "==", date)
        .limit(1)
        .get(),
      // 前月のデータ
      adminDb
        .collection("follower_counts")
        .where("userId", "==", uid)
        .where("snsType", "==", "instagram")
        .where("month", "==", prevMonthStr)
        .limit(1)
        .get(),
      // ユーザー情報（initialFollowers取得用）
      adminDb.collection("users").doc(uid).get(),
    ]);

    // 4. homeで入力された値（その他からの増加数）を取得
    let followerIncreaseFromOther = 0;
    if (!currentMonthSnapshot.empty) {
      const currentData = currentMonthSnapshot.docs[0].data();
      followerIncreaseFromOther = currentData.followers || 0;
    }

    // 5. 初回ログイン月の判定（前月のデータが存在しない場合）
    const isFirstMonth = prevMonthSnapshot.empty;

    // 6. initialFollowersを取得
    let initialFollowers = 0;
        if (userDoc.exists) {
          const userData = userDoc.data();
      initialFollowers = userData?.businessInfo?.initialFollowers || 0;
        }

    // 7. 合計増加数の計算
    // 初回ログイン月：ツール利用開始時のフォロワー数 + 投稿からの増加数 + その他からの増加数
    // 2ヶ月目以降：投稿からの増加数 + その他からの増加数
    let totalFollowerIncrease: number;
    if (isFirstMonth && initialFollowers > 0) {
      totalFollowerIncrease = initialFollowers + followerIncreaseFromPosts + followerIncreaseFromOther;
    } else {
      totalFollowerIncrease = followerIncreaseFromPosts + followerIncreaseFromOther;
    }

    // スコアを計算
    const result = calculatePerformanceScore({
      postCount,
      analyzedCount,
      hasPlan: !plansSnapshot.empty,
      totalLikes,
      totalReach,
      totalSaves,
      totalComments,
      analyticsData: validAnalyticsData,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ パフォーマンス評価スコア取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(
      {
        ...body,
        error: "パフォーマンス評価スコアの取得に失敗しました",
      },
      { status }
    );
  }
}

