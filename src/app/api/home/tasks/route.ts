import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAuthContext } from "@/lib/server/auth-context";
import * as admin from "firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "home-tasks", limit: 30, windowSeconds: 60 },
    });

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);

    // 月の開始日と終了日を計算
    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

    const tasks: Array<{
      id: string;
      title: string;
      description: string;
      type: "follower" | "analysis" | "post";
      priority: "high" | "medium" | "low";
      link?: string;
    }> = [];

    // 1. 未分析の投稿をチェック
    try {
      const postsSnapshot = await adminDb
        .collection("posts")
        .where("userId", "==", uid)
        .where("snsType", "==", "instagram")
        .get();

      const analyticsSnapshot = await adminDb
        .collection("analytics")
        .where("userId", "==", uid)
        .where("snsType", "==", "instagram")
        .get();

      const analyzedPostIds = new Set(
        analyticsSnapshot.docs.map((doc) => doc.data().postId).filter(Boolean)
      );

      const unanalyzedPosts = postsSnapshot.docs.filter(
        (doc) => {
          const postData = doc.data();
          const postId = doc.id;
          const publishedAt = postData.publishedAt
            ? postData.publishedAt instanceof admin.firestore.Timestamp
              ? postData.publishedAt.toDate()
              : new Date(postData.publishedAt)
            : null;

          // 今月の投稿のみをチェック
          if (publishedAt && publishedAt >= startDate && publishedAt <= endDate) {
            return !analyzedPostIds.has(postId);
          }
          return false;
        }
      );

      if (unanalyzedPosts.length > 0) {
        tasks.push({
          id: "unanalyzed-posts",
          title: `未分析の投稿が${unanalyzedPosts.length}件あります`,
          description: "投稿の分析を実行してパフォーマンスを確認しましょう",
          type: "analysis",
          priority: unanalyzedPosts.length >= 3 ? "high" : "medium",
          link: "/instagram/lab/feed",
        });
      }
    } catch (error) {
      console.error("未分析投稿チェックエラー:", error);
    }

    // 2. 投稿予定のリマインダー（今後の機能拡張用）
    // 現在は実装なし

    return NextResponse.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("タスク取得エラー:", error);
    return NextResponse.json(
      { success: false, error: "タスクの取得に失敗しました" },
      { status: 500 }
    );
  }
}

