import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebase-admin";
import { requireAuthContext } from "../../../../lib/server/auth-context";

interface PostSummaryRecord {
  userId: string;
  postId: string;
  category: string;
  postTitle?: string;
  summary: string;
  insights: string[];
  recommendedActions: string[];
  generatedAt?: string;
  postHashtags?: string[];
  postPublishedAt?: string | null;
  metricsSnapshot?: {
    totals?: Record<string, number>;
    averages?: Record<string, number>;
    feedbackStats?: { total: number; satisfied: number; dissatisfied: number };
    postCount?: number;
  };
  updatedAt?: unknown;
}

export async function GET(request: NextRequest) {
  const { uid } = await requireAuthContext(request);
  const { searchParams } = new URL(request.url);

  const userId = searchParams.get("userId") ?? uid;
  const postId = searchParams.get("postId");

  if (userId !== uid) {
    return NextResponse.json({ success: false, error: "権限がありません" }, { status: 403 });
  }

  try {
    const db = getAdminDb();

    if (postId) {
      const docId = `${userId}_${postId}`;
      const doc = await db.collection("ai_post_summaries").doc(docId).get();
      if (!doc.exists) {
        return NextResponse.json({ success: true, data: null });
      }

      const data = doc.data() as PostSummaryRecord;
      return NextResponse.json({ success: true, data });
    }

    const snapshot = await db
      .collection("ai_post_summaries")
      .where("userId", "==", userId)
      .orderBy("generatedAt", "desc")
      .limit(20)
      .get();

    const summaries = snapshot.docs.map((doc) => doc.data() as PostSummaryRecord);

    return NextResponse.json({
      success: true,
      data: summaries,
    });
  } catch (error) {
    console.error("投稿AIサマリー取得エラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "投稿AIサマリーの取得に失敗しました",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const { uid } = await requireAuthContext(request);
  const body = await request.json();

  const { userId, postId, summary, insights, recommendedActions, category, postTitle, postHashtags, postPublishedAt } = body;

  if (userId !== uid) {
    return NextResponse.json({ success: false, error: "権限がありません" }, { status: 403 });
  }

  if (!userId || !postId || !summary) {
    return NextResponse.json(
      { success: false, error: "userId, postId, summary は必須です" },
      { status: 400 }
    );
  }

  try {
    const db = getAdminDb();
    const docId = `${userId}_${postId}`;
    const now = new Date().toISOString();

    const summaryData: PostSummaryRecord = {
      userId,
      postId,
      category: category || "feed",
      postTitle: postTitle || undefined,
      summary,
      insights: Array.isArray(insights) ? insights : [],
      recommendedActions: Array.isArray(recommendedActions) ? recommendedActions : [],
      generatedAt: now,
      postHashtags: Array.isArray(postHashtags) ? postHashtags : undefined,
      postPublishedAt: postPublishedAt || null,
      updatedAt: now,
    };

    await db.collection("ai_post_summaries").doc(docId).set(summaryData, { merge: true });

    return NextResponse.json({
      success: true,
      data: summaryData,
    });
  } catch (error) {
    console.error("投稿AIサマリー保存エラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "投稿AIサマリーの保存に失敗しました",
      },
      { status: 500 },
    );
  }
}

