import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";

function normalizePublishedAt(input: unknown): Date | null {
  if (!input) {
    return null;
  }

  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }

  if (typeof input === "object" && input !== null) {
    const maybeTimestamp = input as { toDate?: () => Date };
    if (typeof maybeTimestamp.toDate === "function") {
      const date = maybeTimestamp.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
}

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

    const snapshot = await adminDb.collection("analytics").where("userId", "==", userId).get();
    const updates: Array<{ id: string; publishedAt: string; publishedTime: string }> = [];

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const publishedAt = normalizePublishedAt(data.publishedAt);

      if (!data.publishedTime && publishedAt) {
        const hours = publishedAt.getHours().toString().padStart(2, "0");
        const minutes = publishedAt.getMinutes().toString().padStart(2, "0");
        const publishedTime = `${hours}:${minutes}`;

        await adminDb.collection("analytics").doc(docSnapshot.id).update({
          publishedTime,
        });

        updates.push({
          id: docSnapshot.id,
          publishedAt: publishedAt.toISOString(),
          publishedTime,
        });
      }
    }

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
