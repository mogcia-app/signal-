import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import * as admin from "firebase-admin";

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

    // 今月の合計を計算
    const thisMonthTotals = {
      likes: analyticsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().likes || 0), 0),
      comments: analyticsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().comments || 0), 0),
      followerIncrease: analyticsSnapshot.docs.reduce((sum, doc) => {
        const followerIncrease = Number(doc.data().followerIncrease) || 0;
        return sum + followerIncrease;
      }, 0),
    };

    // デバッグログ
    console.log("[Home Monthly KPIs] 今月のanalyticsデータ:", {
      analyticsSnapshotSize: analyticsSnapshot.docs.length,
      thisMonthTotals,
      dateStr,
    });

    // 前月の合計を計算
    const previousMonthTotals = {
      likes: previousAnalyticsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().likes || 0), 0),
      comments: previousAnalyticsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().comments || 0), 0),
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
    if (!followerCountSnapshot.empty) {
      const followerCountData = followerCountSnapshot.docs[0].data();
      followerIncreaseFromOther = followerCountData.followers || 0;
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
    if (!previousFollowerCountSnapshot.empty) {
      const previousFollowerCountData = previousFollowerCountSnapshot.docs[0].data();
      previousFollowerIncreaseFromOther = previousFollowerCountData.followers || 0;
    }

    // フォロワー数の合計（分析ページ + その他）
    const totalFollowerIncrease = thisMonthTotals.followerIncrease + followerIncreaseFromOther;
    const previousTotalFollowerIncrease = previousMonthTotals.followerIncrease + previousFollowerIncreaseFromOther;

    // デバッグログ
    console.log("[Home Monthly KPIs] フォロワー数内訳:", {
      followerIncreaseFromPosts: thisMonthTotals.followerIncrease,
      followerIncreaseFromOther,
      totalFollowerIncrease,
      previousTotalFollowerIncrease,
    });

    // 前月比を計算
    const changes = {
      likes: previousMonthTotals.likes === 0 
        ? undefined 
        : ((thisMonthTotals.likes - previousMonthTotals.likes) / previousMonthTotals.likes) * 100,
      comments: previousMonthTotals.comments === 0 
        ? undefined 
        : ((thisMonthTotals.comments - previousMonthTotals.comments) / previousMonthTotals.comments) * 100,
      followers: previousTotalFollowerIncrease === 0 
        ? undefined 
        : ((totalFollowerIncrease - previousTotalFollowerIncrease) / Math.abs(previousTotalFollowerIncrease)) * 100,
    };

    return NextResponse.json({
      success: true,
      data: {
        thisMonth: {
          likes: thisMonthTotals.likes,
          comments: thisMonthTotals.comments,
          followers: totalFollowerIncrease,
        },
        previousMonth: {
          likes: previousMonthTotals.likes,
          comments: previousMonthTotals.comments,
          followers: previousTotalFollowerIncrease,
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

