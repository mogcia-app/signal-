import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import * as admin from "firebase-admin";

interface PostData {
  id: string;
  userId: string;
  title?: string;
  content?: string;
  hashtags?: string[] | string;
  postType: "feed" | "reel" | "story";
  status: "draft" | "created" | "scheduled" | "published";
  scheduledDate?: Date | string | null;
  scheduledTime?: string | null;
  imageUrl?: string | null;
  imageData?: string | null;
  createdAt: Date | string | admin.firestore.Timestamp;
  updatedAt: Date | string | admin.firestore.Timestamp;
  [key: string]: unknown;
}

interface AnalyticsData {
  id: string;
  userId: string;
  postId: string | null;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  saves: number;
  followerIncrease?: number;
  engagementRate?: number;
  publishedAt?: Date | string | admin.firestore.Timestamp;
  publishedTime?: string;
  createdAt: Date | string | admin.firestore.Timestamp;
  title?: string;
  content?: string;
  hashtags?: string[] | string;
  thumbnail?: string;
  category?: "feed" | "reel" | "story";
  [key: string]: unknown;
}

/**
 * 投稿一覧ページ用のBFF API
 * 投稿データと分析データを結合し、分類・フィルタリング済みのデータを返す
 */
export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "posts-with-analytics", limit: 60, windowSeconds: 60 },
      auditEventName: "posts_with_analytics_access",
    });

    // 投稿データと分析データを並列取得
    const [postsSnapshot, analyticsSnapshot] = await Promise.all([
      adminDb.collection("posts").where("userId", "==", uid).get(),
      adminDb.collection("analytics").where("userId", "==", uid).get(),
    ]);

    // 投稿データを処理
    const posts: PostData[] = postsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        status: (data.status || "created") as PostData["status"],
        postType: (data.postType || "feed") as PostData["postType"],
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        scheduledDate: data.scheduledDate?.toDate?.() || data.scheduledDate,
      } as PostData;
    });

    // 分析データを処理
    const analyticsData: AnalyticsData[] = analyticsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        postId: data.postId || null,
        likes: data.likes || 0,
        comments: data.comments || 0,
        shares: data.shares || 0,
        reach: data.reach || 0,
        saves: data.saves || 0,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        publishedAt: data.publishedAt?.toDate?.() || data.publishedAt,
      } as AnalyticsData;
    });

    // 投稿を分析済み/未分析に分類
    const analyzedPostIds = new Set(
      analyticsData
        .map((analytics) => analytics.postId)
        .filter((postId): postId is string => Boolean(postId))
    );

    // 投稿をソート（createdステータスを最優先、その後作成日時降順）
    const sortedPosts = [...posts].sort((a, b) => {
      // createdステータスを最優先
      if (a.status === "created" && b.status !== "created") return -1;
      if (b.status === "created" && a.status !== "created") return 1;

      // 同じステータスの場合は作成日時で降順
      const aCreatedAt = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt as string);
      const bCreatedAt = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt as string);
      return bCreatedAt.getTime() - aCreatedAt.getTime();
    });

    // 分析済み投稿と未分析投稿を分類
    interface PostWithAnalytics extends PostData {
      hasAnalytics: boolean;
      analyticsFromData: AnalyticsData | null;
    }

    const postsWithAnalytics: PostWithAnalytics[] = sortedPosts.map((post) => {
      const hasAnalytics = analyzedPostIds.has(post.id) || !!(post as PostData & { analytics?: unknown }).analytics;
      const analyticsFromData = analyticsData.find((a) => a.postId === post.id);

      return {
        ...post,
        hasAnalytics,
        analyticsFromData: analyticsFromData || null,
      } as PostWithAnalytics;
    });

    // タブカウントを計算
    const manualAnalyticsData = analyticsData.filter(
      (a) => !a.postId || a.postId === "" || a.postId === undefined
    );

    const allPostsCount = posts.length + manualAnalyticsData.length;
    const analyzedPostsCount =
      posts.filter((post) => {
        const hasAnalytics = analyzedPostIds.has(post.id) || !!(post as PostData & { analytics?: unknown }).analytics;
        return hasAnalytics;
      }).length + manualAnalyticsData.length;

    const createdOnlyCount = posts.filter((post) => {
      const hasAnalytics = analyzedPostIds.has(post.id) || !!(post as PostData & { analytics?: unknown }).analytics;
      return !hasAnalytics;
    }).length;

    // 今週の投稿予定を計算
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const scheduledPosts = sortedPosts
      .filter((post) => {
        if (post.status !== "created") return false;
        if (!post.scheduledDate) return false;

        try {
          const scheduledDate = post.scheduledDate instanceof Date
            ? post.scheduledDate
            : new Date(post.scheduledDate as string);
          return scheduledDate >= today && scheduledDate < nextWeek;
        } catch (error) {
          console.error("投稿予定の日付変換エラー:", error, post);
          return false;
        }
      })
      .slice(0, 5)
      .map((post) => {
        try {
          const scheduledDate = post.scheduledDate instanceof Date
            ? post.scheduledDate
            : new Date(post.scheduledDate as string);

          const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

          return {
            day: dayNames[scheduledDate.getDay()],
            date: `${scheduledDate.getMonth() + 1}/${scheduledDate.getDate()}`,
            type: post.postType === "reel" ? "リール" : post.postType === "feed" ? "フィード" : "ストーリー",
            title: post.title,
            time: post.scheduledTime || "未設定",
            status: "分析未設定",
          };
        } catch (error) {
          console.error("投稿予定の日付変換エラー:", error, post);
          return null;
        }
      })
      .filter((post): post is NonNullable<typeof post> => post !== null);

    // 未分析投稿を計算
    const unanalyzedPosts = sortedPosts
      .filter((post) => {
        if (post.status !== "created") return false;
        if (!post.scheduledDate) return false;
        if (post.id && analyzedPostIds.has(post.id)) return false;

        try {
          const scheduledDate = post.scheduledDate instanceof Date
            ? post.scheduledDate
            : new Date(post.scheduledDate as string);
          return scheduledDate < today;
        } catch (error) {
          console.error("未分析投稿の日付変換エラー:", error, post);
          return false;
        }
      })
      .slice(0, 5)
      .map((post) => {
        try {
          const createdAt = post.createdAt instanceof Date
            ? post.createdAt
            : new Date(post.createdAt as string);

          return {
            id: post.id,
            title: post.title,
            type: post.postType,
            imageUrl: post.imageUrl || null,
            createdAt: createdAt.toLocaleDateString("ja-JP"),
            status: "分析未設定",
          };
        } catch (error) {
          console.error("未分析投稿の日付変換エラー:", error, post);
          return null;
        }
      })
      .filter((post): post is NonNullable<typeof post> => post !== null);

    // 手動入力の分析データを処理
    const manualAnalytics = manualAnalyticsData.map((analytics) => ({
      id: analytics.id,
      postId: analytics.postId,
      likes: analytics.likes || 0,
      comments: analytics.comments || 0,
      shares: analytics.shares || 0,
      reach: analytics.reach || 0,
      engagementRate: analytics.engagementRate || 0,
      publishedAt: analytics.publishedAt,
      title: analytics.title,
      content: analytics.content,
      hashtags: analytics.hashtags,
      category: analytics.category,
      thumbnail: analytics.thumbnail,
      sentiment: analytics.sentiment,
      memo: analytics.memo,
      audience: analytics.audience,
      reachSource: analytics.reachSource,
    }));

    return NextResponse.json({
      success: true,
      data: {
        posts: postsWithAnalytics,
        analytics: analyticsData,
        manualAnalytics,
        tabCounts: {
          all: allPostsCount,
          analyzed: analyzedPostsCount,
          created: createdOnlyCount,
        },
        scheduledPosts,
        unanalyzedPosts,
      },
    });
  } catch (error) {
    console.error("❌ 投稿一覧データ取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

