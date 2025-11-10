import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "instagram-performance-summary", limit: 60, windowSeconds: 60 },
      auditEventName: "instagram_performance_summary_access",
    });

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 今週の投稿数を取得
    const weeklyPostsQuery = await adminDb
      .collection("posts")
      .where("userId", "==", uid)
      .where("status", "==", "published")
      .where("createdAt", ">=", oneWeekAgo)
      .get();

    // 今月の投稿数を取得
    const monthlyPostsQuery = await adminDb
      .collection("posts")
      .where("userId", "==", uid)
      .where("status", "==", "published")
      .where("createdAt", ">=", oneMonthAgo)
      .get();

    // 分析データを取得（過去30日）
    const analyticsQuery = await adminDb
      .collection("analytics")
      .where("userId", "==", uid)
      .get();

    // 今週の成長率計算
    const weeklyAnalytics = analyticsQuery.docs.filter((doc) => {
      const data = doc.data();
      let publishedAt = data.publishedAt;
      if (publishedAt && publishedAt.toDate) {
        publishedAt = publishedAt.toDate();
      } else if (publishedAt && typeof publishedAt === "string") {
        publishedAt = new Date(publishedAt);
      }
      return publishedAt && publishedAt >= oneWeekAgo;
    });

    let weeklyFollowerGrowth = 0;
    let weeklyEngagement = 0;
    let weeklyReach = 0;

    weeklyAnalytics.forEach((doc) => {
      const data = doc.data();
      weeklyFollowerGrowth += parseInt(data.followerIncrease) || 0;
      weeklyEngagement +=
        (data.likes || 0) + (data.comments || 0) + (data.shares || 0) + (data.saves || 0);
      weeklyReach += data.reach || 0;
    });

    const avgWeeklyEngagementRate = weeklyReach > 0 ? (weeklyEngagement / weeklyReach) * 100 : 0;

    // 投稿頻度の評価
    const postsThisWeek = weeklyPostsQuery.size;
    const postsThisMonth = monthlyPostsQuery.size;

    let frequencyStatus = "低い";
    let frequencyColor = "text-red-600";
    if (postsThisWeek >= 5) {
      frequencyStatus = "活発";
      frequencyColor = "text-green-600";
    } else if (postsThisWeek >= 3) {
      frequencyStatus = "普通";
      frequencyColor = "text-orange-600";
    }

    // エンゲージメントの評価
    let engagementStatus = "低い";
    let engagementColor = "text-red-600";
    if (avgWeeklyEngagementRate >= 5) {
      engagementStatus = "良好";
      engagementColor = "text-green-600";
    } else if (avgWeeklyEngagementRate >= 3) {
      engagementStatus = "普通";
      engagementColor = "text-orange-600";
    }

    // 成長の評価
    let growthStatus = "減少";
    let growthColor = "text-red-600";
    if (weeklyFollowerGrowth > 10) {
      growthStatus = "順調";
      growthColor = "text-green-600";
    } else if (weeklyFollowerGrowth > 0) {
      growthStatus = "微増";
      growthColor = "text-orange-600";
    }

    const performanceSummary = {
      weeklyGrowth: {
        value: weeklyFollowerGrowth,
        status: growthStatus,
        color: growthColor,
        label: "今週の成長",
      },
      engagement: {
        value: avgWeeklyEngagementRate,
        status: engagementStatus,
        color: engagementColor,
        label: "エンゲージメント",
      },
      frequency: {
        value: postsThisWeek,
        status: frequencyStatus,
        color: frequencyColor,
        label: "投稿頻度",
      },
      stats: {
        postsThisWeek,
        postsThisMonth,
        weeklyEngagement,
        weeklyReach,
      },
    };

    console.log("📈 Performance summary calculated:", {
      userId: uid,
      weeklyGrowth: weeklyFollowerGrowth,
      engagementRate: avgWeeklyEngagementRate,
      postsThisWeek,
      frequencyStatus,
      engagementStatus,
      growthStatus,
    });

    return NextResponse.json({
      success: true,
      data: performanceSummary,
    });
  } catch (error) {
    console.error("Performance summary fetch error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
