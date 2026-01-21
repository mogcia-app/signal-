import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import * as admin from "firebase-admin";

interface PostData {
  id: string;
  title: string;
  content: string;
  hashtags: string[];
  postType: "feed" | "reel" | "story";
  publishedAt: string | null;
  publishedTime: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-feed", limit: 60, windowSeconds: 60 },
      auditEventName: "analytics_feed_access",
    });

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");

    // 並列でデータを取得
    const [postsSnapshot, analyticsSnapshot] = await Promise.all([
      adminDb.collection("posts").where("userId", "==", uid).get(),
      adminDb.collection("analytics").where("userId", "==", uid).orderBy("publishedAt", "desc").get(),
    ]);

    // 投稿データをマップ化
    const postsMap = new Map<string, PostData>();
    postsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      postsMap.set(doc.id, {
        id: doc.id,
        title: data.title || "",
        content: data.content || "",
        hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
        postType: data.postType || "feed",
        publishedAt: data.publishedAt?.toDate?.()?.toISOString() || data.publishedAt,
        publishedTime: data.publishedTime || null,
      });
    });

    // 分析データを処理
    const analyticsData = analyticsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        postId: data.postId || null,
        ...data,
        publishedAt: data.publishedAt?.toDate?.()?.toISOString() ?? data.publishedAt,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
      };
    });

    // postIdが指定されている場合、その投稿データを返す
    if (postId) {
      const post = postsMap.get(postId);
      if (post) {
        // その投稿に関連する分析データを取得
        const relatedAnalytics = analyticsData.filter((a) => a.postId === postId);
        return NextResponse.json({
          success: true,
          data: {
            post,
            analytics: relatedAnalytics,
          },
        });
      } else {
        return NextResponse.json({
          success: true,
          data: {
            post: null,
            analytics: [],
          },
        });
      }
    }

    // postIdが指定されていない場合、すべての投稿と分析データを返す
    return NextResponse.json({
      success: true,
      data: {
        posts: Array.from(postsMap.values()),
        analytics: analyticsData,
      },
    });
  } catch (error) {
    console.error("❌ Analytics feed error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

