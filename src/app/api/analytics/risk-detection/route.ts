import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import * as admin from "firebase-admin";

// 月の範囲を計算
function getMonthRange(date: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = date.split("-").map(Number);
  const start = new Date(Date.UTC(yearStr, monthStr - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(yearStr, monthStr, 0, 23, 59, 59, 999));
  return { start, end };
}

interface RiskAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  metric: string;
  message: string;
  change?: number;
  value?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-risk-detection", limit: 30, windowSeconds: 60 },
      auditEventName: "analytics_risk_detection_access",
    });

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 7); // YYYY-MM形式

    if (!/^\d{4}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "date parameter must be in YYYY-MM format" },
        { status: 400 }
      );
    }

    // KPIデータがクエリパラメータで提供されているか確認
    const providedKpis = {
      totalLikes: searchParams.get("totalLikes") ? Number.parseInt(searchParams.get("totalLikes")!, 10) : null,
      totalReach: searchParams.get("totalReach") ? Number.parseInt(searchParams.get("totalReach")!, 10) : null,
      totalSaves: searchParams.get("totalSaves") ? Number.parseInt(searchParams.get("totalSaves")!, 10) : null,
      totalComments: searchParams.get("totalComments") ? Number.parseInt(searchParams.get("totalComments")!, 10) : null,
      totalFollowerIncrease: searchParams.get("totalFollowerIncrease") ? Number.parseInt(searchParams.get("totalFollowerIncrease")!, 10) : null,
    };

    const useProvidedKpis = Object.values(providedKpis).every((v) => v !== null);

    // 月の範囲を計算
    const { start, end } = getMonthRange(date);
    const startTimestamp = admin.firestore.Timestamp.fromDate(start);
    const endTimestamp = admin.firestore.Timestamp.fromDate(end);

    // 必要なデータを取得（並列）
    const [postsSnapshot, analyticsSnapshot] = await Promise.all([
      // 期間内の投稿を取得
      adminDb
        .collection("posts")
        .where("userId", "==", uid)
        .where("createdAt", ">=", startTimestamp)
        .where("createdAt", "<=", endTimestamp)
        .get(),

      // 期間内の分析データを取得
      adminDb
        .collection("analytics")
        .where("userId", "==", uid)
        .where("publishedAt", ">=", startTimestamp)
        .where("publishedAt", "<=", endTimestamp)
        .get(),
    ]);

    const postCount = postsSnapshot.docs.length;

    // 投稿と分析データをpostIdで紐付け
    const analyticsByPostId = new Map<string, any>();
    analyticsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const postId = data.postId;
      if (postId) {
        const existing = analyticsByPostId.get(postId);
        if (!existing || (data.publishedAt && existing.publishedAt && data.publishedAt > existing.publishedAt)) {
          analyticsByPostId.set(postId, data);
        }
      }
    });

    // KPIを集計（提供されている場合はそれを使用、そうでない場合は計算）
    let totalLikes = useProvidedKpis ? providedKpis.totalLikes! : 0;
    let totalReach = useProvidedKpis ? providedKpis.totalReach! : 0;
    let totalComments = useProvidedKpis ? providedKpis.totalComments! : 0;
    let totalSaves = useProvidedKpis ? providedKpis.totalSaves! : 0;
    let totalFollowerIncrease = useProvidedKpis ? providedKpis.totalFollowerIncrease! : 0;

    if (!useProvidedKpis) {
      analyticsByPostId.forEach((data) => {
        totalLikes += data.likes || 0;
        totalReach += data.reach || 0;
        totalComments += data.comments || 0;
        totalSaves += data.saves || 0;
        totalFollowerIncrease += data.followerIncrease || 0;
      });
    }

    // 前月のデータを取得（比較用）
    const prevMonth = new Date(start);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
    const { start: prevStart, end: prevEnd } = getMonthRange(prevMonthStr);
    const prevStartTimestamp = admin.firestore.Timestamp.fromDate(prevStart);
    const prevEndTimestamp = admin.firestore.Timestamp.fromDate(prevEnd);

    const [prevPostsSnapshot, prevAnalyticsSnapshot] = await Promise.all([
      adminDb
        .collection("posts")
        .where("userId", "==", uid)
        .where("createdAt", ">=", prevStartTimestamp)
        .where("createdAt", "<=", prevEndTimestamp)
        .get(),
      adminDb
        .collection("analytics")
        .where("userId", "==", uid)
        .where("publishedAt", ">=", prevStartTimestamp)
        .where("publishedAt", "<=", prevEndTimestamp)
        .get(),
    ]);

    const prevPostCount = prevPostsSnapshot.docs.length;
    const prevAnalyticsByPostId = new Map<string, any>();
    prevAnalyticsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const postId = data.postId;
      if (postId) {
        const existing = prevAnalyticsByPostId.get(postId);
        if (!existing || (data.publishedAt && existing.publishedAt && data.publishedAt > existing.publishedAt)) {
          prevAnalyticsByPostId.set(postId, data);
        }
      }
    });

    let prevTotalLikes = 0;
    let prevTotalReach = 0;
    let prevTotalComments = 0;
    let prevTotalSaves = 0;
    let prevTotalFollowerIncrease = 0;

    prevAnalyticsByPostId.forEach((data) => {
      prevTotalLikes += data.likes || 0;
      prevTotalReach += data.reach || 0;
      prevTotalComments += data.comments || 0;
      prevTotalSaves += data.saves || 0;
      prevTotalFollowerIncrease += data.followerIncrease || 0;
    });

    // リスク検知ロジック
    const alerts: RiskAlert[] = [];

    // 1. フォロワー数の急激な減少（-10%以上）
    if (prevTotalFollowerIncrease > 0 && totalFollowerIncrease < 0) {
      const decreaseRate = (Math.abs(totalFollowerIncrease) / prevTotalFollowerIncrease) * 100;
      if (decreaseRate >= 10) {
        alerts.push({
          id: "follower-decrease",
          severity: decreaseRate >= 30 ? "critical" : "warning",
          metric: "フォロワー数",
          message: `フォロワー数が前月比で${decreaseRate.toFixed(1)}％減少しています。コンテンツの質や投稿頻度を見直す必要があります。`,
          change: -decreaseRate,
        });
      }
    }

    // 2. リーチ数の急激な減少（-30%以上）
    if (prevTotalReach > 0 && totalReach > 0) {
      const reachChange = ((totalReach - prevTotalReach) / prevTotalReach) * 100;
      if (reachChange <= -30) {
        alerts.push({
          id: "reach-decrease",
          severity: reachChange <= -50 ? "critical" : "warning",
          metric: "リーチ数",
          message: `リーチ数が前月比で${Math.abs(reachChange).toFixed(1)}％減少しています。投稿タイミングやハッシュタグの見直しを検討してください。`,
          change: reachChange,
        });
      }
    }

    // 3. エンゲージメント率の急激な低下
    if (prevTotalReach > 0 && totalReach > 0) {
      const prevEngagementRate = ((prevTotalLikes + prevTotalComments) / prevTotalReach) * 100;
      const currentEngagementRate = ((totalLikes + totalComments) / totalReach) * 100;
      const engagementChange = currentEngagementRate - prevEngagementRate;
      
      if (engagementChange <= -2 && prevEngagementRate > 0) {
        alerts.push({
          id: "engagement-decrease",
          severity: engagementChange <= -5 ? "critical" : "warning",
          metric: "エンゲージメント率",
          message: `エンゲージメント率が前月比で${Math.abs(engagementChange).toFixed(1)}ポイント低下しています。コンテンツの質やフォロワーとの関係性を見直す必要があります。`,
          change: engagementChange,
        });
      }
    }

    // 4. 投稿頻度の急激な減少（-50%以上）
    if (prevPostCount > 0 && postCount > 0) {
      const postCountChange = ((postCount - prevPostCount) / prevPostCount) * 100;
      if (postCountChange <= -50) {
        alerts.push({
          id: "post-frequency-decrease",
          severity: "warning",
          metric: "投稿頻度",
          message: `投稿数が前月比で${Math.abs(postCountChange).toFixed(1)}％減少しています。安定した投稿頻度を維持することが重要です。`,
          change: postCountChange,
        });
      }
    }

    // 5. 投稿がない場合
    if (postCount === 0 && prevPostCount > 0) {
      alerts.push({
        id: "no-posts",
        severity: "critical",
        metric: "投稿数",
        message: "今月は投稿がありません。継続的な投稿がアカウント成長の鍵です。",
        value: 0,
      });
    }

    // 6. 分析データがない場合
    if (analyticsByPostId.size === 0 && postCount > 0) {
      alerts.push({
        id: "no-analytics",
        severity: "info",
        metric: "分析データ",
        message: "投稿はありますが、分析データがありません。投稿の分析を実行してください。",
        value: 0,
      });
    }

    // 7. リーチ数が極端に低い場合（投稿があるのにリーチが100未満）
    if (postCount > 0 && totalReach > 0 && totalReach < 100) {
      alerts.push({
        id: "low-reach",
        severity: "warning",
        metric: "リーチ数",
        message: `投稿数${postCount}件に対してリーチ数が${totalReach}と低いです。ハッシュタグの見直しや投稿タイミングの最適化を検討してください。`,
        value: totalReach,
      });
    }

    // 8. エンゲージメント率が極端に低い場合（1%未満）
    if (totalReach > 0) {
      const engagementRate = ((totalLikes + totalComments) / totalReach) * 100;
      if (engagementRate < 1 && totalReach >= 100) {
        alerts.push({
          id: "low-engagement",
          severity: "warning",
          metric: "エンゲージメント率",
          message: `エンゲージメント率が${engagementRate.toFixed(2)}％と低いです。コンテンツの質やフォロワーとの関係性を見直す必要があります。`,
          value: engagementRate,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        month: date,
      },
    });
  } catch (error) {
    console.error("❌ リスク検知取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(
      {
        ...body,
        error: "リスク検知の取得に失敗しました",
      },
      { status }
    );
  }
}

