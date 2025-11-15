import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebase-admin";
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const periodParam = searchParams.get("period");
    const limitParam = searchParams.get("limit");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const period = periodParam === "weekly" || periodParam === "monthly" ? periodParam : "monthly";
    const limit = Math.min(Math.max(Number(limitParam) || 6, 1), 12);

    const db = getAdminDb();
    let query = db
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
    return NextResponse.json(
      {
        success: false,
        error: "履歴の取得に失敗しました",
      },
      { status: 500 }
    );
  }
}

