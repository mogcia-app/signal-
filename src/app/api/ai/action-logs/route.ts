import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebase-admin";
import * as admin from "firebase-admin";

export async function POST(request: NextRequest) {
  try {
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

    if (!userId || !actionId) {
      return NextResponse.json(
        { success: false, error: "userId, actionId は必須です" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const docRef = db.collection("ai_action_logs").doc(`${userId}_${actionId}`);
    await docRef.set(
      {
        userId,
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
    return NextResponse.json(
      { success: false, error: "アクションログの保存に失敗しました" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const period = searchParams.get("period");
    const limitParam = searchParams.get("limit");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId が必要です" }, { status: 400 });
    }

    const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 100);

    const db = getAdminDb();
    let query = db
      .collection("ai_action_logs")
      .where("userId", "==", userId)
      .orderBy("updatedAt", "desc")
      .limit(limit);

    if (period) {
      query = query.where("focusArea", "==", period);
    }

    const snapshot = await query.get();

    const logs = snapshot.docs.map((doc) => {
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

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error("アクションログ取得エラー:", error);
    return NextResponse.json(
      { success: false, error: "アクションログの取得に失敗しました" },
      { status: 500 }
    );
  }
}

