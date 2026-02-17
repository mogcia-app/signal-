import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import * as admin from "firebase-admin";
import { KpiDashboardRepository } from "@/repositories/kpi-dashboard-repository";
import { aggregateKpiInput } from "@/domain/analysis/kpi/usecases/aggregate-kpi-input";

/**
 * 今月のKPIデータを取得（/kpi-breakdownと同じロジックを使用）
 * - いいね数、コメント数、フォロワー数（分析ページ + その他）を月単位で計算
 * - 前月比を計算
 */
export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "home-monthly-kpis", limit: 60, windowSeconds: 60 },
      auditEventName: "home_monthly_kpis_get",
    });

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // YYYY-MM形式（オプション、指定がない場合は今月）

    // 日付を決定
    const now = new Date();
    let targetDate: Date;
    if (date) {
      const [year, month] = date.split("-").map(Number);
      targetDate = new Date(year, month - 1, 1);
    } else {
      targetDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`;

    // 今月の開始日と終了日
    const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
    const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
    const endTimestamp = admin.firestore.Timestamp.fromDate(endDate);

    // 前月の開始日と終了日
    const previousStartDate = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
    const previousEndDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0, 23, 59, 59, 999);
    const previousStartTimestamp = admin.firestore.Timestamp.fromDate(previousStartDate);
    const previousEndTimestamp = admin.firestore.Timestamp.fromDate(previousEndDate);

    // 今月のanalyticsデータを取得
    const analyticsSnapshot = await adminDb
      .collection("analytics")
      .where("userId", "==", uid)
      .where("snsType", "==", "instagram")
      .where("publishedAt", ">=", startTimestamp)
      .where("publishedAt", "<=", endTimestamp)
      .get();

    // 前月のanalyticsデータを取得
    const previousAnalyticsSnapshot = await adminDb
      .collection("analytics")
      .where("userId", "==", uid)
      .where("snsType", "==", "instagram")
      .where("publishedAt", ">=", previousStartTimestamp)
      .where("publishedAt", "<=", previousEndTimestamp)
      .get();

    const frequencyToWeeklyCount = (value: unknown): number => {
      const normalized = String(value || "").trim();
      if (normalized === "none" || normalized === "投稿しない") {return 0;}
      if (normalized === "weekly-1-2" || normalized === "週1-2回" || normalized === "週に1〜2回") {return 2;}
      if (normalized === "weekly-3-4" || normalized === "週3-4回" || normalized === "週に3〜4回") {return 4;}
      if (normalized === "daily" || normalized === "毎日") {return 7;}
      const asNum = Number(normalized);
      if (Number.isFinite(asNum)) {
        if (asNum <= 0) {return 0;}
        if (asNum <= 2) {return 2;}
        if (asNum <= 4) {return 4;}
        return 7;
      }
      return 0;
    };

    // 今月の合計を計算
    const thisMonthTotals = {
      likes: analyticsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().likes || 0), 0),
      comments: analyticsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().comments || 0), 0),
      shares: analyticsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().shares || 0), 0),
      reposts: analyticsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().reposts || 0), 0),
      saves: analyticsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().saves || 0), 0),
      reach: analyticsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().reach || 0), 0),
      postCount: analyticsSnapshot.docs.length,
      followerIncrease: analyticsSnapshot.docs.reduce((sum, doc) => {
        const followerIncrease = Number(doc.data().followerIncrease) || 0;
        return sum + followerIncrease;
      }, 0),
    };

    // デバッグログ: 詳細なフォロワー増加数の確認
    const followerIncreaseDetails = analyticsSnapshot.docs
      .filter(doc => (doc.data().followerIncrease || 0) > 0)
      .map(doc => ({
        analyticsId: doc.id,
        postId: doc.data().postId || null,
        followerIncrease: doc.data().followerIncrease || 0,
        publishedAt: doc.data().publishedAt,
      }));
    
    console.log("[Home Monthly KPIs] フォロワー増加数デバッグ:", {
      analyticsSnapshotSize: analyticsSnapshot.docs.length,
      thisMonthTotals,
      followerIncreaseFromPosts: thisMonthTotals.followerIncrease,
      followerIncreaseDetails,
      dateStr,
      userId: uid,
    });

    // 前月の合計を計算
    const previousMonthTotals = {
      likes: previousAnalyticsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().likes || 0), 0),
      comments: previousAnalyticsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().comments || 0), 0),
      shares: previousAnalyticsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().shares || 0), 0),
      reposts: previousAnalyticsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().reposts || 0), 0),
      saves: previousAnalyticsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().saves || 0), 0),
      reach: previousAnalyticsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().reach || 0), 0),
      postCount: previousAnalyticsSnapshot.docs.length,
      followerIncrease: previousAnalyticsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().followerIncrease || 0), 0),
    };

    // follower_countsから「その他からの増加数」を取得
    const followerCountSnapshot = await adminDb
      .collection("follower_counts")
      .where("userId", "==", uid)
      .where("snsType", "==", "instagram")
      .where("month", "==", dateStr)
      .limit(1)
      .get();

    let followerIncreaseFromOther = 0;
    let profileVisits = 0;
    if (!followerCountSnapshot.empty) {
      const followerCountData = followerCountSnapshot.docs[0].data();
      followerIncreaseFromOther = followerCountData.followers || 0;
      profileVisits = Number(followerCountData.profileVisits || 0);
    }

    // 前月のfollower_countsを取得
    const previousMonthStr = `${previousStartDate.getFullYear()}-${String(previousStartDate.getMonth() + 1).padStart(2, "0")}`;
    const previousFollowerCountSnapshot = await adminDb
      .collection("follower_counts")
      .where("userId", "==", uid)
      .where("snsType", "==", "instagram")
      .where("month", "==", previousMonthStr)
      .limit(1)
      .get();

    let previousFollowerIncreaseFromOther = 0;
    let previousProfileVisits = 0;
    if (!previousFollowerCountSnapshot.empty) {
      const previousFollowerCountData = previousFollowerCountSnapshot.docs[0].data();
      previousFollowerIncreaseFromOther = previousFollowerCountData.followers || 0;
      previousProfileVisits = Number(previousFollowerCountData.profileVisits || 0);
    }

    let plannedMonthlyPosts = 0;
    try {
      const userDoc = await adminDb.collection("users").doc(uid).get();
      const activePlanId = userDoc.exists ? (userDoc.data()?.activePlanId as string | undefined) : undefined;
      if (activePlanId) {
        const planDoc = await adminDb.collection("plans").doc(activePlanId).get();
        if (planDoc.exists) {
          const formData = (planDoc.data()?.formData || {}) as Record<string, unknown>;
          const weeklyFeed = frequencyToWeeklyCount(formData.weeklyPosts);
          const weeklyReel = frequencyToWeeklyCount(formData.reelCapability);
          const weeklyStory = frequencyToWeeklyCount(formData.storyFrequency);
          plannedMonthlyPosts = (weeklyFeed + weeklyReel + weeklyStory) * 4;
        }
      }
    } catch (error) {
      console.warn("[Home Monthly KPIs] 計画取得エラー:", error);
      plannedMonthlyPosts = 0;
    }

    // フォロワー増加数はKPI集計と同じロジック（SSOT）を利用する
    // Home と KPI ページの値不一致を避けるため、ここだけは共通 usecase に統一する。
    // ただし集計取得に失敗した場合はホーム画面を壊さないためフォールバックする。
    let totalFollowerIncrease = thisMonthTotals.followerIncrease + followerIncreaseFromOther;
    let previousTotalFollowerIncrease =
      previousMonthTotals.followerIncrease + previousFollowerIncreaseFromOther;
    try {
      const kpiRawData = await KpiDashboardRepository.fetchKpiRawData(uid, dateStr);
      const kpiAggregated = aggregateKpiInput(kpiRawData);
      totalFollowerIncrease = Number(kpiAggregated.totals.totalFollowerIncrease || totalFollowerIncrease);
      previousTotalFollowerIncrease = Number(
        kpiAggregated.previousTotals.totalFollowerIncrease || previousTotalFollowerIncrease
      );
    } catch (kpiAggregateError) {
      console.warn("[Home Monthly KPIs] KPI集計フォールバックを使用:", kpiAggregateError);
    }
    const saveRate = thisMonthTotals.reach > 0 ? (thisMonthTotals.saves / thisMonthTotals.reach) * 100 : 0;
    const previousSaveRate =
      previousMonthTotals.reach > 0 ? (previousMonthTotals.saves / previousMonthTotals.reach) * 100 : 0;
    const profileTransitionRate = thisMonthTotals.reach > 0 ? (profileVisits / thisMonthTotals.reach) * 100 : 0;
    const previousProfileTransitionRate =
      previousMonthTotals.reach > 0 ? (previousProfileVisits / previousMonthTotals.reach) * 100 : 0;
    const postExecutionRate =
      plannedMonthlyPosts > 0 ? Math.min(999, (thisMonthTotals.postCount / plannedMonthlyPosts) * 100) : 0;
    const previousPlannedMonthlyPosts = plannedMonthlyPosts;
    const previousPostExecutionRate =
      previousPlannedMonthlyPosts > 0
        ? Math.min(999, (previousMonthTotals.postCount / previousPlannedMonthlyPosts) * 100)
        : 0;
    
    // デバッグログ: 最終的なフォロワー増加数の計算
    console.log("[Home Monthly KPIs] フォロワー増加数最終計算デバッグ:", {
      followerIncreaseFromPosts: thisMonthTotals.followerIncrease,
      followerIncreaseFromOther,
      totalFollowerIncrease,
      previousTotalFollowerIncrease,
      dateStr,
      userId: uid,
    });

    // 初月かどうかを判定（前月のanalyticsデータが存在しない場合、初月と判断）
    const isFirstMonth = previousAnalyticsSnapshot.empty;

    // デバッグログ
    console.log("[Home Monthly KPIs] フォロワー数内訳:", {
      followerIncreaseFromPosts: thisMonthTotals.followerIncrease,
      followerIncreaseFromOther,
      totalFollowerIncrease,
      previousTotalFollowerIncrease,
      isFirstMonth,
      previousAnalyticsCount: previousAnalyticsSnapshot.docs.length,
    });

    // 前月比を計算（初月の場合はundefined）
    const changes = {
      likes: isFirstMonth || previousMonthTotals.likes === 0 
        ? undefined 
        : ((thisMonthTotals.likes - previousMonthTotals.likes) / previousMonthTotals.likes) * 100,
      comments: isFirstMonth || previousMonthTotals.comments === 0 
        ? undefined 
        : ((thisMonthTotals.comments - previousMonthTotals.comments) / previousMonthTotals.comments) * 100,
      shares: isFirstMonth || previousMonthTotals.shares === 0
        ? undefined
        : ((thisMonthTotals.shares - previousMonthTotals.shares) / previousMonthTotals.shares) * 100,
      reposts: isFirstMonth || previousMonthTotals.reposts === 0
        ? undefined
        : ((thisMonthTotals.reposts - previousMonthTotals.reposts) / previousMonthTotals.reposts) * 100,
      saves: isFirstMonth || previousMonthTotals.saves === 0
        ? undefined
        : ((thisMonthTotals.saves - previousMonthTotals.saves) / previousMonthTotals.saves) * 100,
      followerIncrease: isFirstMonth || previousTotalFollowerIncrease === 0
        ? undefined
        : ((totalFollowerIncrease - previousTotalFollowerIncrease) / Math.abs(previousTotalFollowerIncrease)) * 100,
      followers: isFirstMonth || previousTotalFollowerIncrease === 0 
        ? undefined 
        : ((totalFollowerIncrease - previousTotalFollowerIncrease) / Math.abs(previousTotalFollowerIncrease)) * 100,
      postExecutionRate: isFirstMonth || previousPostExecutionRate === 0
        ? undefined
        : ((postExecutionRate - previousPostExecutionRate) / Math.abs(previousPostExecutionRate)) * 100,
      saveRate: isFirstMonth || previousSaveRate === 0
        ? undefined
        : ((saveRate - previousSaveRate) / Math.abs(previousSaveRate)) * 100,
      profileTransitionRate: isFirstMonth || previousProfileTransitionRate === 0
        ? undefined
        : ((profileTransitionRate - previousProfileTransitionRate) / Math.abs(previousProfileTransitionRate)) * 100,
    };

    return NextResponse.json({
      success: true,
      data: {
        thisMonth: {
          likes: thisMonthTotals.likes,
          comments: thisMonthTotals.comments,
          shares: thisMonthTotals.shares,
          reposts: thisMonthTotals.reposts,
          saves: thisMonthTotals.saves,
          followerIncrease: totalFollowerIncrease,
          followers: totalFollowerIncrease,
          postExecutionRate,
          saveRate,
          profileTransitionRate,
        },
        previousMonth: {
          likes: previousMonthTotals.likes,
          comments: previousMonthTotals.comments,
          shares: previousMonthTotals.shares,
          reposts: previousMonthTotals.reposts,
          saves: previousMonthTotals.saves,
          followerIncrease: previousTotalFollowerIncrease,
          followers: previousTotalFollowerIncrease,
          postExecutionRate: previousPostExecutionRate,
          saveRate: previousSaveRate,
          profileTransitionRate: previousProfileTransitionRate,
        },
        changes,
        breakdown: {
          followerIncreaseFromPosts: thisMonthTotals.followerIncrease,
          followerIncreaseFromOther,
        },
      },
    });
  } catch (error) {
    console.error("Home monthly KPIs error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
