import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebase-admin";
import {
  buildErrorResponse,
  ForbiddenError,
  requireAuthContext,
} from "../../../../lib/server/auth-context";
import type { AIGenerationResponse } from "@/types/ai";

interface OverviewHistoryEntry {
  id: string;
  userId: string;
  period: "weekly" | "monthly";
  date: string;
  overview: {
    summary: string;
    highlights: Array<{ label: string; value: string; change: string; context?: string }>;
    watchouts: string[];
  };
  actionPlans: Array<{
    id: string;
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    focusArea: string;
    expectedImpact: string;
    recommendedActions: string[];
  }>;
  createdAt: string | null;
  updatedAt: string | null;
  generation: AIGenerationResponse | null;
}

function resolveRequestedUserId(candidate: unknown, authenticatedUid: string): string {
  if (candidate === undefined || candidate === null || candidate === "") {
    return authenticatedUid;
  }

  if (typeof candidate !== "string" || candidate !== authenticatedUid) {
    throw new ForbiddenError("他のユーザーのAI概要履歴にはアクセスできません");
  }

  return candidate;
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: false,
      rateLimit: { key: "ai-overview-history-read", limit: 30, windowSeconds: 60 },
      auditEventName: "ai_overview_history_read",
    });

    const { searchParams } = new URL(request.url);
    const userId = resolveRequestedUserId(searchParams.get("userId"), uid);
    const periodParam = searchParams.get("period");
    const limitParam = searchParams.get("limit");

    const period = periodParam === "weekly" || periodParam === "monthly" ? periodParam : "monthly";
    const limit = Math.min(Math.max(Number(limitParam) || 6, 1), 12);

    const db = getAdminDb();
    const query = db
      .collection("ai_overview_history")
      .where("userId", "==", userId)
      .where("period", "==", period)
      .orderBy("createdAt", "desc")
      .limit(limit);

    const snapshot = await query.get();

    const data: OverviewHistoryEntry[] = snapshot.docs.map((doc) => {
      const docData = doc.data();
      return {
        id: doc.id,
        userId: docData.userId,
        period: docData.period,
        date: docData.date,
        overview: {
          summary: docData.overview?.summary || "",
          highlights: Array.isArray(docData.overview?.highlights)
            ? docData.overview.highlights
            : [],
          watchouts: Array.isArray(docData.overview?.watchouts)
            ? docData.overview.watchouts
            : [],
        },
        actionPlans: Array.isArray(docData.actionPlans) ? docData.actionPlans : [],
        createdAt: docData.createdAt?.toDate
          ? docData.createdAt.toDate().toISOString()
          : null,
        updatedAt: docData.updatedAt?.toDate
          ? docData.updatedAt.toDate().toISOString()
          : null,
        generation: docData.generation ?? null,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("AI概要履歴取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
