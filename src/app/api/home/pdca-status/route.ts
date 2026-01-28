import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import { fetchPlanSummaryForPeriod } from "../../ai/monthly-analysis/infra/firestore/plan-summary";
import * as admin from "firebase-admin";

/**
 * PDCAステータスを計算する
 */
function calculatePDCAStatus(pdcaMetrics: {
  planExists: boolean;
  planScore: number;
  executionRate: number;
  feedbackCoverage: number;
  adoptionRate: number;
  plannedPosts: number;
  analyzedPosts: number;
  feedbackCount: number;
  actionCount: number;
  actionAppliedCount: number;
}): {
  plan: "completed" | "pending";
  do: "completed" | "pending";
  check: "completed" | "pending";
  action: "completed" | "in-progress" | "pending";
} {
  return {
    plan: pdcaMetrics.planExists ? "completed" : "pending",
    do: pdcaMetrics.executionRate >= 0.7 ? "completed" : "pending", // 70%以上で完了
    check: pdcaMetrics.feedbackCoverage >= 0.5 ? "completed" : "pending", // 50%以上で完了
    action: pdcaMetrics.adoptionRate >= 0.8 
      ? "completed" 
      : pdcaMetrics.adoptionRate > 0 
        ? "in-progress" 
        : "pending", // 80%以上で完了、0より大きければ進行中
  };
}

/**
 * 0-1の範囲にクランプ
 */
function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "home-pdca-status", limit: 30, windowSeconds: 60 },
      auditEventName: "home_pdca_status_access",
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // 今月の期間を計算
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startTimestamp = admin.firestore.Timestamp.fromDate(startOfMonth);
    const endTimestamp = admin.firestore.Timestamp.fromDate(endOfMonth);

    // 並列でデータを取得
    const [
      plansSnapshot,
      analyticsSnapshot,
      feedbackSnapshot,
      actionLogsSnapshot,
    ] = await Promise.all([
      // 運用計画
      adminDb
        .collection("plans")
        .where("userId", "==", uid)
        .where("snsType", "==", "instagram")
        .where("status", "==", "active")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get(),
      // 分析データ（今月）
      adminDb
        .collection("analytics")
        .where("userId", "==", uid)
        .where("publishedAt", ">=", startTimestamp)
        .where("publishedAt", "<=", endTimestamp)
        .get(),
      // フィードバック（今月）
      adminDb
        .collection("feedback")
        .where("userId", "==", uid)
        .where("createdAt", ">=", startTimestamp)
        .where("createdAt", "<=", endTimestamp)
        .get(),
      // アクションログ（今月）
      adminDb
        .collection("actionLogs")
        .where("userId", "==", uid)
        .where("createdAt", ">=", startTimestamp)
        .where("createdAt", "<=", endTimestamp)
        .get(),
    ]);

    // 運用計画の取得
    const planDoc = plansSnapshot.docs[0];
    const planData = planDoc?.data();
    
    // Plan Summaryを取得
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const planSummary = await fetchPlanSummaryForPeriod(uid, "monthly", currentMonth, "instagram");

    // 分析データの処理
    const analytics = analyticsSnapshot.docs.map((doc) => doc.data());
    const analyzedInPeriod = analytics.length;

    // フィードバックデータの処理
    const feedback = feedbackSnapshot.docs.map((doc) => doc.data());
    const feedbackCountInPeriod = feedback.length;

    // アクションログの処理
    const actionLogs = actionLogsSnapshot.docs.map((doc) => doc.data());
    const actionCountInPeriod = actionLogs.length;
    const actionAppliedCount = actionLogs.filter((log) => Boolean(log.applied)).length;

    // 計画投稿数を計算
    let plannedMonthlyPosts = 0;
    
    if (planSummary?.formData) {
      const formData = planSummary.formData;
      const simulationResult = formData.simulationResult as Record<string, unknown> | undefined;
      if (simulationResult && typeof simulationResult.monthlyPostCount === "number") {
        plannedMonthlyPosts = Math.max(0, Math.round(simulationResult.monthlyPostCount));
      } else {
        // シミュレーション結果がない場合、投稿頻度から計算
        const feedFreq = typeof formData.feedFreq === "number" ? formData.feedFreq : 0;
        const reelFreq = typeof formData.reelFreq === "number" ? formData.reelFreq : 0;
        const storyFreq = typeof formData.storyFreq === "number" ? formData.storyFreq : 0;
        const freqBasedMonthlyPosts = (feedFreq + reelFreq + storyFreq) * 4;
        if (freqBasedMonthlyPosts > 0) {
          plannedMonthlyPosts = Math.max(0, Math.round(freqBasedMonthlyPosts));
        }
      }
    }

    // PDCAメトリクスを計算
    const planExists = Boolean(planSummary);
    const planScore = planExists ? 1 : 0;
    const executionRate =
      plannedMonthlyPosts > 0
        ? clamp(analyzedInPeriod / Math.max(1, plannedMonthlyPosts))
        : analyzedInPeriod > 0
          ? 1
          : 0;
    const feedbackCoverage =
      analyzedInPeriod > 0 ? clamp(feedbackCountInPeriod / Math.max(1, analyzedInPeriod)) : 0;
    const adoptionRate =
      actionCountInPeriod > 0 ? clamp(actionAppliedCount / Math.max(1, actionCountInPeriod)) : 0;

    const loopScore = clamp((planScore + executionRate + feedbackCoverage + adoptionRate) / 4);

    const pdcaMetrics = {
      planExists,
      loopScore,
      planScore,
      executionRate,
      feedbackCoverage,
      adoptionRate,
      plannedPosts: plannedMonthlyPosts,
      analyzedPosts: analyzedInPeriod,
      feedbackCount: feedbackCountInPeriod,
      actionCount: actionCountInPeriod,
      actionAppliedCount,
    };

    // PDCAステータスを計算
    const status = calculatePDCAStatus(pdcaMetrics);

    // 今月のPDCA詳細情報を生成
    const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;
    const pdcaDetails = {
      month: monthLabel,
      plan: planExists
        ? {
            date: planData?.createdAt?.toDate?.()?.toLocaleDateString() || `${now.getMonth() + 1}/${now.getDate()}`,
            status: "completed",
            description: "AIが運用計画を生成",
            details: planSummary?.title || "運用計画",
          }
        : null,
      do: {
        status: status.do,
        description: `投稿: ${analyzedInPeriod}回`,
        planned: plannedMonthlyPosts,
        actual: analyzedInPeriod,
      },
      check: {
        status: status.check,
        description: `AIが分析完了`,
        analyzed: analyzedInPeriod,
        feedbackCount: feedbackCountInPeriod,
        details: analyzedInPeriod > 0
          ? [
              `分析済み投稿: ${analyzedInPeriod}回`,
              `フィードバック: ${feedbackCountInPeriod}件`,
            ]
          : [],
      },
      action: {
        status: status.action,
        description: status.action === "completed"
          ? "改善アクションを実行"
          : status.action === "in-progress"
            ? "改善アクションを実行中"
            : "改善アクションを提案",
        actionCount: actionCountInPeriod,
        appliedCount: actionAppliedCount,
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        status,
        metrics: pdcaMetrics,
        details: pdcaDetails,
      },
    });
  } catch (error) {
    console.error("PDCAステータス取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

