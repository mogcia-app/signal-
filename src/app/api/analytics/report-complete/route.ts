import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { canAccessFeature } from "@/lib/plan-access";
import { buildAIContext } from "@/lib/ai/context";
import { ReportRepository } from "@/repositories/report-repository";
import { monthlyReviewStore } from "@/repositories/monthly-review-store";
import { buildReportComplete } from "@/domain/analysis/report/usecases/build-report-complete";
import { createReportAiClient } from "@/domain/analysis/report/usecases/create-report-ai-client";

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

    const reportData = await ReportRepository.fetchReportRepositoryData(uid, date);
    const data = await buildReportComplete({
      userId: uid,
      month: date,
      forceRegenerate,
      reportData,
      aiClient,
      monthlyReviewStore,
      fetchPostSummaries: ReportRepository.fetchPostSummaries,
      fetchAiLearningReferences,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("❌ 月次レポート統合データ取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
