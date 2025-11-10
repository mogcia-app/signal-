import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "instagram-goal-progress", limit: 30, windowSeconds: 60 },
      auditEventName: "instagram_goal_progress_access",
    });

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // 目標設定を取得
    const goalDoc = await adminDb.collection("goalSettings").doc(uid).get();
    const goalSettings = goalDoc.exists ? goalDoc.data() : null;

    // 今週の投稿数を取得
    const weeklyPostsQuery = await adminDb
      .collection("posts")
      .where("userId", "==", uid)
      .where("status", "==", "published")
      .where("createdAt", ">=", startOfWeek)
      .get();

    const postsThisWeek = weeklyPostsQuery.size;
    const weeklyGoal = goalSettings?.weeklyPostGoal || 5;

    // フォロワー成長目標の計算
    const analyticsQuery = await adminDb
      .collection("analytics")
      .where("userId", "==", uid)
      .orderBy("publishedAt", "desc")
      .limit(7)
      .get();

    let totalFollowerGrowth = 0;
    let postsWithGrowth = 0;

    analyticsQuery.forEach((doc) => {
      const data = doc.data();
      if (data.followerIncrease) {
        totalFollowerGrowth += parseInt(data.followerIncrease) || 0;
        postsWithGrowth++;
      }
    });

    const avgFollowerGrowth = postsWithGrowth > 0 ? totalFollowerGrowth / postsWithGrowth : 0;
    const followerGoal = goalSettings?.followerGoal || 10; // 週間10人増加目標

    // 進捗率の計算
    const weeklyPostProgress = Math.min((postsThisWeek / weeklyGoal) * 100, 100);
    const followerGrowthProgress = Math.min(
      Math.max((avgFollowerGrowth / followerGoal) * 100, 0),
      100
    );

    // 目標達成状況の評価
    const weeklyPostStatus =
      weeklyPostProgress >= 100
        ? "達成"
        : weeklyPostProgress >= 80
          ? "順調"
          : weeklyPostProgress >= 50
            ? "普通"
            : "要改善";

    const followerGrowthStatus =
      followerGrowthProgress >= 100
        ? "達成"
        : followerGrowthProgress >= 80
          ? "順調"
          : followerGrowthProgress >= 50
            ? "普通"
            : "要改善";

    const goalProgress = {
      weeklyPosts: {
        current: postsThisWeek,
        goal: weeklyGoal,
        progress: weeklyPostProgress,
        status: weeklyPostStatus,
        label: "週間投稿目標",
      },
      followerGrowth: {
        current: avgFollowerGrowth,
        goal: followerGoal,
        progress: followerGrowthProgress,
        status: followerGrowthStatus,
        label: "フォロワー成長目標",
      },
      overall: {
        weeklyPostAchieved: weeklyPostProgress >= 100,
        followerGrowthAchieved: followerGrowthProgress >= 100,
        totalGoals: 2,
        achievedGoals:
          (weeklyPostProgress >= 100 ? 1 : 0) + (followerGrowthProgress >= 100 ? 1 : 0),
      },
    };

    console.log("🎯 Goal progress calculated:", {
      userId: uid,
      weeklyPosts: `${postsThisWeek}/${weeklyGoal} (${weeklyPostProgress.toFixed(1)}%)`,
      followerGrowth: `${avgFollowerGrowth.toFixed(1)}/${followerGoal} (${followerGrowthProgress.toFixed(1)}%)`,
      overallAchievement: `${goalProgress.overall.achievedGoals}/${goalProgress.overall.totalGoals}`,
    });

    return NextResponse.json({
      success: true,
      data: goalProgress,
    });
  } catch (error) {
    console.error("Goal progress fetch error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
