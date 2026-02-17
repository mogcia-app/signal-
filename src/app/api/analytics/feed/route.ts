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
  imageUrl?: string | null;
  publishedAt: string | null;
  publishedTime: string | null;
  scheduledDate?: Date | string | admin.firestore.Timestamp | null;
  scheduledTime?: string | null;
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
      
      // publishedAt/publishedTimeがなければ、scheduledDate/scheduledTimeを使用
      let publishedAt: string | null = null;
      let publishedTime: string | null = null;
      
      // scheduledDate/scheduledTimeを取得（フォールバック用）
      const scheduledDate = data.scheduledDate?.toDate?.() || data.scheduledDate || null;
      const scheduledTime = data.scheduledTime || null;
      
      if (data.publishedAt) {
        const pubDate = data.publishedAt?.toDate?.() || data.publishedAt;
        if (pubDate instanceof Date) {
          publishedAt = pubDate.toISOString().split("T")[0]; // YYYY-MM-DD形式
        } else if (typeof pubDate === "string") {
          publishedAt = pubDate.split("T")[0]; // ISO文字列から日付部分を抽出
        } else {
          publishedAt = pubDate;
        }
        publishedTime = data.publishedTime || null;
      } else if (scheduledDate) {
        // scheduledDateをpublishedAtとして使用
        if (scheduledDate instanceof Date) {
          publishedAt = scheduledDate.toISOString().split("T")[0]; // YYYY-MM-DD形式
        } else if (typeof scheduledDate === "string") {
          publishedAt = scheduledDate.split("T")[0]; // ISO文字列から日付部分を抽出
        } else {
          publishedAt = scheduledDate;
        }
        // scheduledTimeをpublishedTimeとして使用
        publishedTime = scheduledTime;
      }
      
      postsMap.set(doc.id, {
        id: doc.id,
        title: data.title || "",
        content: data.content || "",
        hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
        postType: data.postType || "feed",
        imageUrl: data.imageUrl || null,
        publishedAt,
        publishedTime,
        scheduledDate: scheduledDate instanceof Date ? scheduledDate.toISOString().split("T")[0] : (typeof scheduledDate === "string" ? scheduledDate.split("T")[0] : scheduledDate),
        scheduledTime,
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
