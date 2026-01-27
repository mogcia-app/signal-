import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import { logger } from "../../../../lib/logger";

/**
 * 計画の進捗をチェックし、変更が必要かどうかを判定するAPI
 * 
 * トリガー:
 * 1. 目標達成が遅れている（期間の50%経過で目標の50%未達成）
 * 2. 投稿頻度が低い（計画の50%以下）
 * 3. エンゲージメントが低下（先週比-20%以上）
 */
export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "plan-check-progress", limit: 60, windowSeconds: 60 },
      auditEventName: "plan_check_progress",
    });

    // 1. アクティブな計画を取得
    const plansSnapshot = await adminDb
      .collection("plans")
      .where("userId", "==", uid)
      .where("snsType", "==", "instagram")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (plansSnapshot.empty) {
      return NextResponse.json({
        success: true,
        data: {
          needsReview: false,
          reasons: [],
        },
      });
    }

    const planDoc = plansSnapshot.docs[0];
    const planData = planDoc.data();
    const planId = planDoc.id;

    const createdAt = planData.createdAt?.toDate?.() || new Date(planData.createdAt);
    let endDate = planData.endDate?.toDate?.() || planData.endDate;
    const now = new Date();

    // endDateが存在しない場合、formDataから計算
    if (!endDate && planData.formData) {
      const formData = planData.formData;
      const startDate = formData.startDate ? new Date(formData.startDate) : createdAt;
      const planPeriod = formData.planPeriod || "1ヶ月";
      
      endDate = new Date(startDate);
      const periodMonths = planPeriod === "1ヶ月" ? 1 :
                          planPeriod === "3ヶ月" ? 3 :
                          planPeriod === "6ヶ月" ? 6 :
                          planPeriod === "1年" ? 12 : 1;
      endDate.setMonth(endDate.getMonth() + periodMonths);
    }

    // endDateがまだ存在しない場合は早期リターン
    if (!endDate) {
      return NextResponse.json({
        success: true,
        data: {
          needsReview: false,
          reasons: [],
        },
      });
    }

    // 計画期間の計算
    const totalDays = Math.ceil((endDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const progressPercent = (elapsedDays / totalDays) * 100;

    const formData = planData.formData || {};
    const simulationResult = planData.simulationResult || {};
    const targetFollowers = parseInt(formData.targetFollowers || "0", 10);
    const currentFollowers = parseInt(formData.currentFollowers || "0", 10);
    const followerGain = targetFollowers - currentFollowers;

    const reasons: Array<{
      type: "slow-progress" | "low-posting" | "low-engagement";
      severity: "warning" | "critical";
      message: string;
      recommendation: string;
    }> = [];

    // トリガー1: 目標達成が遅れている
    if (progressPercent >= 50) {
      // 過去30日間のフォロワー増加を取得
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const analyticsSnapshot = await adminDb
        .collection("analytics")
        .where("userId", "==", uid)
        .where("publishedAt", ">=", thirtyDaysAgo)
        .orderBy("publishedAt", "desc")
        .limit(100)
        .get();

      let actualFollowerGain = 0;
      if (!analyticsSnapshot.empty) {
        const recentAnalytics = analyticsSnapshot.docs.map((doc) => doc.data());
        const oldestFollowerCount = recentAnalytics[recentAnalytics.length - 1]?.followers || currentFollowers;
        const newestFollowerCount = recentAnalytics[0]?.followers || currentFollowers;
        actualFollowerGain = newestFollowerCount - oldestFollowerCount;
      }

      const expectedGain = Math.round(followerGain * (progressPercent / 100));
      const actualProgress = (actualFollowerGain / followerGain) * 100;

      if (actualProgress < 50) {
        reasons.push({
          type: "slow-progress",
          severity: actualProgress < 30 ? "critical" : "warning",
          message: `期間の${Math.round(progressPercent)}%経過しましたが、目標達成は${Math.round(actualProgress)}%です。このままだと目標に届かない可能性があります。`,
          recommendation: "計画を見直して、より現実的な目標に調整することをおすすめします。",
        });
      }
    }

    // トリガー2: 投稿頻度が低い
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const postsSnapshot = await adminDb
      .collection("posts")
      .where("userId", "==", uid)
      .where("publishedAt", ">=", last7Days)
      .get();

    const actualPostCount = postsSnapshot.size;
    
    // 計画から推奨投稿頻度を取得
    const recommendedPosting = simulationResult.recommendedPosting || {};
    const weeklyFeedPosts = parseInt(recommendedPosting.feed?.replace(/週|回/g, "") || "3", 10);
    const weeklyReelPosts = parseInt(recommendedPosting.reels?.replace(/週|回/g, "") || "1", 10);
    const weeklyStoryPosts = parseInt(recommendedPosting.stories?.replace(/週|回/g, "") || "7", 10);
    const recommendedWeeklyPosts = weeklyFeedPosts + weeklyReelPosts + weeklyStoryPosts;

    if (actualPostCount < recommendedWeeklyPosts * 0.5) {
      reasons.push({
        type: "low-posting",
        severity: actualPostCount < recommendedWeeklyPosts * 0.3 ? "critical" : "warning",
        message: `今週の投稿数: ${actualPostCount}回（計画: 週${recommendedWeeklyPosts}回）。投稿頻度が計画より低いです。`,
        recommendation: "計画を見直して、無理のない投稿頻度に調整することをおすすめします。",
      });
    }

    // トリガー3: エンゲージメントが低下
    const last14Days = new Date();
    last14Days.setDate(last14Days.getDate() - 14);

    const analyticsSnapshot = await adminDb
      .collection("analytics")
      .where("userId", "==", uid)
      .where("publishedAt", ">=", last14Days)
      .orderBy("publishedAt", "desc")
      .get();

    if (analyticsSnapshot.size >= 4) {
      const analytics = analyticsSnapshot.docs.map((doc) => doc.data());
      const thisWeekAnalytics = analytics.slice(0, Math.ceil(analytics.length / 2));
      const lastWeekAnalytics = analytics.slice(Math.ceil(analytics.length / 2));

      const thisWeekEngagement = thisWeekAnalytics.reduce((sum, a) => {
        const likes = a.likes || 0;
        const comments = a.comments || 0;
        const followers = a.followers || 1;
        return sum + ((likes + comments) / followers) * 100;
      }, 0) / thisWeekAnalytics.length;

      const lastWeekEngagement = lastWeekAnalytics.reduce((sum, a) => {
        const likes = a.likes || 0;
        const comments = a.comments || 0;
        const followers = a.followers || 1;
        return sum + ((likes + comments) / followers) * 100;
      }, 0) / lastWeekAnalytics.length;

      const engagementChange = ((thisWeekEngagement - lastWeekEngagement) / lastWeekEngagement) * 100;

      if (engagementChange < -20) {
        reasons.push({
          type: "low-engagement",
          severity: engagementChange < -40 ? "critical" : "warning",
          message: `今週のエンゲージメント率: ${thisWeekEngagement.toFixed(2)}%（先週比: ${engagementChange.toFixed(1)}%）。エンゲージメントが下がっています。`,
          recommendation: "投稿内容を見直し、ターゲットに合った内容に変更することをおすすめします。",
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        needsReview: reasons.length > 0,
        reasons,
        planId,
        progressPercent: Math.round(progressPercent),
      },
    });
  } catch (error) {
    logger.error("計画進捗チェックエラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

