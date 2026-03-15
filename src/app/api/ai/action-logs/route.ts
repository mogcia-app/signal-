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
    throw new ForbiddenError("他のユーザーのアクションログにはアクセスできません");
  }

  return candidate;
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: false,
      rateLimit: { key: "ai-action-logs-write", limit: 30, windowSeconds: 60 },
      auditEventName: "ai_action_logs_write",
    });

    const body = await request.json();
    const {
      userId,
      actionId,
      title,
      focusArea,
      applied,
      resultDelta,
      feedback,
    }: {
      userId?: string;
      actionId?: string;
      title?: string;
      focusArea?: string;
      applied?: boolean;
      resultDelta?: number;
      feedback?: string;
    } = body || {};
    const resolvedUserId = resolveRequestedUserId(userId, uid);

    if (!actionId) {
      return NextResponse.json(
        { success: false, error: "actionId は必須です" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const docRef = db.collection("ai_action_logs").doc(`${resolvedUserId}_${actionId}`);
    await docRef.set(
      {
        userId: resolvedUserId,
        actionId,
        title: title || "",
        focusArea: focusArea || "",
        applied: Boolean(applied),
        resultDelta: typeof resultDelta === "number" ? resultDelta : null,
        feedback: feedback || "",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("アクションログ保存エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: false,
      rateLimit: { key: "ai-action-logs-read", limit: 60, windowSeconds: 60 },
      auditEventName: "ai_action_logs_read",
    });

    const { searchParams } = new URL(request.url);
    const userId = resolveRequestedUserId(searchParams.get("userId"), uid);
    const period = searchParams.get("period");
    const limitParam = searchParams.get("limit");

    const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 100);

    const db = getAdminDb();
    const baseQuery = db
      .collection("ai_action_logs")
      .where("userId", "==", userId)
      .orderBy("updatedAt", "desc")
      .limit(limit * 2);

    const snapshot = await baseQuery.get();

    let logs = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        actionId: data.actionId,
        title: data.title,
        focusArea: data.focusArea,
        applied: data.applied,
        resultDelta: data.resultDelta,
        feedback: data.feedback,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    if (period) {
      logs = logs.filter((log) => log.focusArea === period);
    }

    logs = logs.slice(0, limit);

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error("アクションログ取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
