import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebase-admin";
import * as admin from "firebase-admin";
import {
  buildErrorResponse,
  ForbiddenError,
  requireAuthContext,
} from "../../../../lib/server/auth-context";

function resolveRequestedUserId(candidate: unknown, authenticatedUid: string): string {
  if (candidate === undefined || candidate === null || candidate === "") {
    return authenticatedUid;
  }

  if (typeof candidate !== "string" || candidate !== authenticatedUid) {
    throw new ForbiddenError("他のユーザーの投稿フィードバックにはアクセスできません");
  }

  return candidate;
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: false,
      rateLimit: { key: "ai-feedback-write", limit: 30, windowSeconds: 60 },
      auditEventName: "ai_feedback_write",
    });

    const body = await request.json();
    const {
      userId,
      postId,
      sentiment,
      comment,
      weight,
      aiLabel,
      goalAchievementProspect,
      goalAchievementReason,
    }: {
      userId?: string;
      postId?: string;
      sentiment?: "positive" | "negative" | "neutral";
      comment?: string;
      weight?: number;
      aiLabel?: string;
      goalAchievementProspect?: "high" | "medium" | "low";
      goalAchievementReason?: string;
    } = body || {};
    const resolvedUserId = resolveRequestedUserId(userId, uid);

    if (!postId) {
      return NextResponse.json(
        { success: false, error: "postId は必須です" },
        { status: 400 }
      );
    }

    // sentimentまたはgoalAchievementProspectのいずれかが必要
    if (!sentiment && !goalAchievementProspect) {
      return NextResponse.json(
        { success: false, error: "sentiment または goalAchievementProspect のいずれかが必要です" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    await db.collection("ai_post_feedback").add({
      userId: resolvedUserId,
      postId,
      sentiment: sentiment || (goalAchievementProspect === "high" ? "positive" : goalAchievementProspect === "low" ? "negative" : "neutral"), // 後方互換性のため
      comment: comment || "",
      aiLabel: aiLabel || "",
      weight: typeof weight === "number" ? weight : 1,
      goalAchievementProspect: goalAchievementProspect || null, // 新規フィールド
      goalAchievementReason: goalAchievementReason || null, // 新規フィールド
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("投稿フィードバック保存エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: false,
      rateLimit: { key: "ai-feedback-read", limit: 60, windowSeconds: 60 },
      auditEventName: "ai_feedback_read",
    });

    const { searchParams } = new URL(request.url);
    const userId = resolveRequestedUserId(searchParams.get("userId"), uid);
    const limitParam = searchParams.get("limit");

    const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 100);

    const db = getAdminDb();
    const snapshot = await db
      .collection("ai_post_feedback")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const feedback = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        postId: data.postId,
        sentiment: data.sentiment,
        comment: data.comment,
        aiLabel: data.aiLabel,
        weight: data.weight,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ success: true, data: feedback });
  } catch (error) {
    console.error("投稿フィードバック取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
