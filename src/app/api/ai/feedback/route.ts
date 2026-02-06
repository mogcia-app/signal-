import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebase-admin";
import * as admin from "firebase-admin";

export async function POST(request: NextRequest) {
  try {
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

    if (!userId || !postId) {
      return NextResponse.json(
        { success: false, error: "userId, postId は必須です" },
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
      userId,
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
    return NextResponse.json(
      { success: false, error: "投稿フィードバックの保存に失敗しました" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limitParam = searchParams.get("limit");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId が必要です" }, { status: 400 });
    }

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
    return NextResponse.json(
      { success: false, error: "投稿フィードバックの取得に失敗しました" },
      { status: 500 }
    );
  }
}

