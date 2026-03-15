import { NextRequest, NextResponse } from "next/server";
import { buildAIContext } from "@/lib/ai/context";
import {
  buildErrorResponse,
  ForbiddenError,
  requireAuthContext,
} from "@/lib/server/auth-context";

// infra層: Firestoreアクセス
import { getReportSummary } from "./infra/firestore/report-summary";
import { fetchPlanSummaryForPeriod } from "./infra/firestore/plan-summary";
import { getMasterContext } from "./infra/firestore/master-context";

// domain層: AI・計画関連
import { generateFallbackActionPlans } from "./domain/planning/action-plans";
import { generateAIActionPlans } from "./domain/ai/action-plans";
import {
  generateAIOverview,
  generateFallbackOverview,
  saveOverviewHistoryEntry,
} from "./domain/ai/overview";
import { callOpenAI } from "./domain/ai/client";

// サービス層: AI分析のオーケストレーション
import { performAIAnalysis as performAIAnalysisService } from "./services/analysis-service";

// 型定義はservicesで使用

function resolveRequestedUserId(candidate: unknown, authenticatedUid: string): string {
  if (candidate === undefined || candidate === null || candidate === "") {
    return authenticatedUid;
  }

  if (typeof candidate !== "string" || candidate !== authenticatedUid) {
    throw new ForbiddenError("他のユーザーのAI分析にはアクセスできません");
  }

  return candidate;
}

export async function GET(request: NextRequest) {
  try {
    console.log("🤖 AI分析API開始");
    const { uid } = await requireAuthContext(request, {
      requireContract: false,
      rateLimit: { key: "ai-monthly-analysis-read", limit: 15, windowSeconds: 60 },
      auditEventName: "ai_monthly_analysis_read",
    });

    const { searchParams } = new URL(request.url);
    const userId = resolveRequestedUserId(searchParams.get("userId"), uid);
    const period = searchParams.get("period") as "weekly" | "monthly";
    const date = searchParams.get("date");

    if (!period || !date) {
      return NextResponse.json(
        { error: "period, date パラメータが必要です" },
        { status: 400 }
      );
    }

    console.log("🤖 AI分析パラメータ:", { userId, period, date });

    const aiContext = await buildAIContext(userId, { snapshotLimit: 5, includeMasterContext: true });

    // 1. マスターコンテキストを取得（RAGシステム）
    console.log("🔍 マスターコンテキスト取得中...");
    const masterContext = await getMasterContext(userId, { forceRefresh: true });
    console.log("✅ マスターコンテキスト取得完了:", masterContext?.learningPhase);

    // 2. レポートサマリーを取得
    console.log("📊 レポートサマリー取得中...");
    const reportSummary = await getReportSummary(userId, period, date);
    console.log("✅ レポートサマリー取得完了:", reportSummary ? "データあり" : "データなし");

    // 2.5 運用計画の取得
    console.log("🗂️ 運用計画取得中...");
    const planSummary = await fetchPlanSummaryForPeriod(userId, period, date, "instagram");
    console.log("✅ 運用計画取得:", planSummary ? planSummary.title : "なし");

    // 3. AI分析を実行
    console.log("🧠 AI分析実行中...");
    const analysisResult = await performAIAnalysisService(
      reportSummary,
      masterContext,
      period,
      date,
      planSummary,
      userId,
      aiContext,
      generateAIOverview as (params: unknown) => Promise<import("./types").AnalysisOverview | null>,
      generateFallbackOverview as (params: unknown) => import("./types").AnalysisOverview,
      generateAIActionPlans as (params: unknown) => Promise<import("./types").ActionPlan[]>,
      generateFallbackActionPlans,
      callOpenAI,
      saveOverviewHistoryEntry as (params: unknown) => Promise<void>
    );
    console.log("✅ AI分析完了");

    // 4. 結果を返す
    const result = {
      success: true,
      data: {
        ...analysisResult,
        masterContext: masterContext
          ? {
              learningPhase: masterContext.learningPhase,
              ragHitRate: masterContext.ragHitRate,
              totalInteractions: masterContext.totalInteractions,
              isOptimized:
                masterContext.learningPhase === "optimized" ||
                masterContext.learningPhase === "master",
            }
          : null,
        metadata: {
          period,
          date,
          dataPoints: analysisResult.confidence.dataPointCount,
          confidenceScore: analysisResult.confidence.score,
          historicalHitRate: analysisResult.confidence.historicalHitRate,
          analysisTimestamp: new Date().toISOString(),
        },
      },
    };

    console.log("🎉 AI分析API完了");
    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ AI分析APIエラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
