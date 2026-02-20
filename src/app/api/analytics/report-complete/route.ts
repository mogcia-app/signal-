import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { canAccessFeature } from "@/lib/plan-access";
import { buildAIContext } from "@/lib/ai/context";
import { ReportRepository } from "@/repositories/report-repository";
import { monthlyReviewStore } from "@/repositories/monthly-review-store";
import { buildReportComplete } from "@/domain/analysis/report/usecases/build-report-complete";
import { createReportAiClient } from "@/domain/analysis/report/usecases/create-report-ai-client";
import { logImplicitAiAction } from "@/lib/ai/implicit-action-log";
import { AiUsageLimitError, assertAiOutputAvailable, consumeAiOutput } from "@/lib/server/ai-usage-limit";

const aiClient = createReportAiClient(process.env.OPENAI_API_KEY);

async function fetchAiLearningReferences(userId: string) {
  const aiContextBundle = await buildAIContext(userId, {
    includeUserProfile: true,
    includePlan: true,
    includeSnapshots: true,
    includeMasterContext: true,
    includeActionLogs: false,
    includeAbTests: false,
    snapshotLimit: 10,
  });

  const seenPostIds = new Set<string>();
  const filteredSnapshotRefs = aiContextBundle.snapshotReferences
    .filter((ref) => {
      const postId = ref.postId;
      if (!postId) {
        return true;
      }
      if (seenPostIds.has(postId)) {
        return false;
      }
      seenPostIds.add(postId);
      return true;
    })
    .slice(0, 3);

  return {
    masterContext: aiContextBundle.masterContext || null,
    references: aiContextBundle.references || [],
    snapshotReferences: filteredSnapshotRefs,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-report-complete", limit: 60, windowSeconds: 60 },
      auditEventName: "analytics_report_complete_access",
    });

    const userProfile = await getUserProfile(uid);
    if (!canAccessFeature(userProfile, "canAccessReport")) {
      return NextResponse.json(
        { success: false, error: "月次レポート機能は、現在のプランではご利用いただけません。" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 7);
    const forceRegenerate = searchParams.get("regenerate") === "true";

    if (!/^\d{4}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: "date parameter must be in YYYY-MM format" },
        { status: 400 }
      );
    }

    if (forceRegenerate) {
      await assertAiOutputAvailable({
        uid,
        userProfile,
      });
    }

    const reportData = await ReportRepository.fetchReportRepositoryData(uid, date);
    const data = await buildReportComplete({
      userId: uid,
      month: date,
      forceRegenerate,
      allowAiGeneration: forceRegenerate,
      reportData,
      aiClient,
      monthlyReviewStore,
      fetchPostSummaries: ReportRepository.fetchPostSummaries,
      fetchAiLearningReferences,
    });

    const usage = forceRegenerate
      ? await consumeAiOutput({
          uid,
          userProfile,
          feature: "analytics_monthly_review",
        })
      : null;

    if (forceRegenerate) {
      const firstPlan = data.monthlyReview?.actionPlans?.[0];
      await logImplicitAiAction({
        uid,
        feature: "analytics_monthly_review",
        title: typeof firstPlan?.title === "string" && firstPlan.title ? firstPlan.title : "今月の振り返り生成",
        action: typeof firstPlan?.action === "string" ? firstPlan.action : "",
        metadata: {
          month: date,
          analyzedCount: data.monthlyReview?.analyzedCount || 0,
        },
      });
    }

    return NextResponse.json({ success: true, data, usage });
  } catch (error) {
    if (error instanceof AiUsageLimitError) {
      return NextResponse.json(
        {
          success: false,
          error: `今月のAI出力回数の上限に達しました（${error.month} / ${error.limit ?? "無制限"}回）。`,
          code: "ai_output_limit_exceeded",
          usage: {
            month: error.month,
            limit: error.limit,
            used: error.used,
            remaining: error.remaining,
          },
        },
        { status: 429 }
      );
    }
    console.error("❌ 月次レポート統合データ取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
