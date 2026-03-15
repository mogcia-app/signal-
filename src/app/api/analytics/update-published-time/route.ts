import { NextRequest, NextResponse } from "next/server";
import { AnalyticsRepository } from "@/repositories/analytics-repository";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: false,
      rateLimit: { key: "analytics-update-published-time", limit: 5, windowSeconds: 60 },
      auditEventName: "analytics_update_published_time",
    });

    const body = await request.json().catch(() => ({}));
    const userId = typeof body.userId === "string" && body.userId.trim() ? body.userId : uid;

    if (userId !== uid) {
      return NextResponse.json({ error: "他のユーザーのanalyticsは更新できません" }, { status: 403 });
    }

    const updates = await AnalyticsRepository.fillMissingPublishedTime(userId);

    return NextResponse.json({
      message: `${updates.length}件のデータを更新しました`,
      updates,
    });
  } catch (error) {
    console.error("publishedTime更新エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
