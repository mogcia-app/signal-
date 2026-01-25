import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import * as admin from "firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "home-dashboard", limit: 60, windowSeconds: 60 },
      auditEventName: "home_dashboard_access",
    });

    const { searchParams } = new URL(request.url);
    const currentMonth = searchParams.get("month");
    
    if (!currentMonth) {
      return NextResponse.json(
        { success: false, error: "month parameter is required" },
        { status: 400 }
      );
    }

    // 先月を計算
    const [year, month] = currentMonth.split("-").map(Number);
    const lastMonthDate = new Date(year, month - 2, 1);
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

    // 並列でデータを取得
    const [
      followerCountsSnapshot,
      monthlyReviewSnapshot,
      actionLogsSnapshot,
      kpiBreakdownSnapshot,
    ] = await Promise.all([
      // フォロワー数取得
      adminDb
        .collection("follower_counts")
        .where("userId", "==", uid)
        .where("month", "==", currentMonth)
        .where("snsType", "==", "instagram")
        .limit(1)
        .get(),
      // 月次レビュー（アクションプラン用）
      adminDb
        .collection("monthly_reviews")
        .where("userId", "==", uid)
        .where("month", "==", lastMonth)
        .limit(1)
        .get(),
      // アクションログ取得
      adminDb
        .collection("ai_action_logs")
        .where("userId", "==", uid)
        .limit(100)
        .get(),
      // KPI分解データ（簡易版 - breakdownsのみ）
      adminDb
        .collection("analytics")
        .where("userId", "==", uid)
        .get(),
    ]);

    // ===== 1. フォロワー数データ =====
    const followerCountData = followerCountsSnapshot.empty
      ? null
      : {
          followers: followerCountsSnapshot.docs[0].data().followers || 0,
          profileVisits: followerCountsSnapshot.docs[0].data().profileVisits,
          externalLinkTaps: followerCountsSnapshot.docs[0].data().externalLinkTaps,
          updatedAt: followerCountsSnapshot.docs[0].data().updatedAt?.toDate?.()?.toISOString() || 
                     followerCountsSnapshot.docs[0].data().updatedAt,
        };

    // ===== 2. アクションプラン（先月の月次レビューから） =====
    let actionPlans: Array<{ title: string; description: string; action: string }> = [];
    
    // 月次レビューからアクションプランを取得
    if (!monthlyReviewSnapshot.empty) {
      const reviewData = monthlyReviewSnapshot.docs[0].data();
      if (reviewData.actionPlans && Array.isArray(reviewData.actionPlans)) {
        actionPlans = reviewData.actionPlans;
      }
    }

    // ===== 3. アクションログ =====
    const actionLogs = actionLogsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        actionId: data.actionId || doc.id,
        title: data.title || "",
        focusArea: data.focusArea || "",
        applied: Boolean(data.applied),
        resultDelta: typeof data.resultDelta === "number" ? data.resultDelta : null,
        feedback: data.feedback || "",
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      };
    });

    // アクションログマップを作成（actionIdをキーに）
    const actionLogMap = new Map<string, { applied: boolean }>();
    actionLogs.forEach((log) => {
      if (log.actionId) {
        actionLogMap.set(log.actionId, { applied: log.applied });
      }
    });

    // ===== 4. KPIサマリー（breakdownsのみ） =====
    // 現在の月の範囲を計算
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
    const endTimestamp = admin.firestore.Timestamp.fromDate(endDate);

    // 期間内の分析データをフィルタリング
    const analyticsInMonth = kpiBreakdownSnapshot.docs
      .filter((doc) => {
        const data = doc.data();
        const publishedAt = data.publishedAt?.toDate?.() || new Date(data.publishedAt);
        const publishedAtTimestamp = admin.firestore.Timestamp.fromDate(publishedAt);
        return publishedAtTimestamp >= startTimestamp && publishedAtTimestamp <= endTimestamp;
      })
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          postId: data.postId,
          likes: data.likes || 0,
          comments: data.comments || 0,
          shares: data.shares || 0,
          saves: data.saves || 0,
          reach: data.reach || 0,
          followerIncrease: parseInt(data.followerIncrease) || 0,
          publishedAt: data.publishedAt?.toDate?.() || new Date(data.publishedAt),
        };
      });

    // KPI分解データを計算（常に全てのKPI項目を返す）
    const kpiBreakdowns: Array<{
      key: string;
      label: string;
      value: number;
      unit?: string;
      changePct?: number;
    }> = [];

    // リーチ
    const totalReach = analyticsInMonth.reduce((sum, a) => sum + a.reach, 0);
    kpiBreakdowns.push({
      key: "reach",
      label: "リーチ",
      value: totalReach,
      unit: "count",
    });

    // いいね
    const totalLikes = analyticsInMonth.reduce((sum, a) => sum + a.likes, 0);
    kpiBreakdowns.push({
      key: "likes",
      label: "いいね",
      value: totalLikes,
      unit: "count",
    });

    // コメント
    const totalComments = analyticsInMonth.reduce((sum, a) => sum + (a.comments || 0), 0);
    kpiBreakdowns.push({
      key: "comments",
      label: "コメント",
      value: totalComments,
      unit: "count",
    });

    // 保存
    const totalSaves = analyticsInMonth.reduce((sum, a) => sum + a.saves, 0);
    kpiBreakdowns.push({
      key: "saves",
      label: "保存",
      value: totalSaves,
      unit: "count",
    });

    // フォロワー増加
    const totalFollowerIncrease = analyticsInMonth.reduce((sum, a) => sum + a.followerIncrease, 0);
    kpiBreakdowns.push({
      key: "followers",
      label: "フォロワー増加",
      value: totalFollowerIncrease,
      unit: "count",
    });

    // エンゲージメント
    const totalEngagement = analyticsInMonth.reduce(
      (sum, a) => sum + a.likes + a.comments + a.shares + a.saves,
      0
    );
    const avgEngagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;
    kpiBreakdowns.push({
      key: "engagement",
      label: "エンゲージメント率",
      value: avgEngagementRate,
      unit: "percent",
    });

    // プロフィールアクセス数
    const profileVisits = followerCountData?.profileVisits || 0;
    kpiBreakdowns.push({
      key: "profileVisits",
      label: "プロフィールアクセス",
      value: profileVisits,
      unit: "count",
    });

    // 外部リンクタップ数
    const externalLinkTaps = followerCountData?.externalLinkTaps || 0;
    kpiBreakdowns.push({
      key: "externalLinkTaps",
      label: "外部リンクタップ",
      value: externalLinkTaps,
      unit: "count",
    });

    return NextResponse.json({
      success: true,
      data: {
        followerCount: followerCountData,
        actionPlans,
        actionLogs,
        actionLogMap: Object.fromEntries(actionLogMap),
        kpiBreakdowns,
      },
    });
  } catch (error) {
    console.error("❌ Home dashboard error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

