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
      
      // デバッグログ: すべてのanalyticsデータのfollowerIncreaseを確認（0でも出力）
      console.log("[Posts With Analytics] フォロワー増加数取得デバッグ:", {
        analyticsId: doc.id,
        postId: data.postId || null,
        rawFollowerIncrease: data.followerIncrease,
        rawDataType: typeof data.followerIncrease,
        allDataKeys: Object.keys(data),
        hasFollowerIncrease: 'followerIncrease' in data,
        fullData: JSON.stringify(data, null, 2).substring(0, 500), // 最初の500文字のみ
      });
      
      // followerIncreaseを明示的に取得（数値に変換）
      const followerIncrease = typeof data.followerIncrease === 'number' 
        ? data.followerIncrease 
        : typeof data.followerIncrease === 'string' 
          ? Number.parseInt(data.followerIncrease, 10) || 0
          : 0;
      
      return {
        id: doc.id,
        postId: data.postId || null,
        likes: data.likes || 0,
        comments: data.comments || 0,
        shares: data.shares || 0,
        reach: data.reach || 0,
        saves: data.saves || 0,
        ...data, // 先にスプレッド
        followerIncrease, // 最後に明示的に設定（上書きを防ぐ）
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        publishedAt: data.publishedAt?.toDate?.() || data.publishedAt,
      } as AnalyticsData;
    });
    
    // デバッグログ: 全体の集計
    const totalFollowerIncrease = analyticsData.reduce((sum, a) => sum + (a.followerIncrease || 0), 0);
    console.log("[Posts With Analytics] フォロワー増加数集計デバッグ:", {
      totalAnalyticsCount: analyticsData.length,
      totalFollowerIncrease,
      analyticsWithFollowerIncrease: analyticsData.filter(a => (a.followerIncrease || 0) > 0).length,
    });

    // 投稿を分析済み/未分析に分類
    const analyzedPostIds = new Set(
      analyticsData
        .map((analytics) => analytics.postId)
        .filter((postId): postId is string => Boolean(postId))
    );

    // 投稿をソート（投稿日時降順：最新が上）
    // 優先順位: publishedAt > scheduledDate > createdAt
    const sortedPosts = [...posts].sort((a, b) => {
      const getDate = (post: PostData): number => {
        // 1. publishedAt（実際に投稿した日時）を優先
        const analyticsForPost = analyticsData.find((a) => a.postId === post.id);
        if (analyticsForPost?.publishedAt) {
          if (analyticsForPost.publishedAt instanceof Date) {
            return analyticsForPost.publishedAt.getTime();
          }
          if (analyticsForPost.publishedAt && typeof analyticsForPost.publishedAt === "object" && "toDate" in analyticsForPost.publishedAt) {
            return (analyticsForPost.publishedAt as { toDate(): Date }).toDate().getTime();
          }
          if (typeof analyticsForPost.publishedAt === "string") {
            const date = new Date(analyticsForPost.publishedAt);
            if (!isNaN(date.getTime())) {
              return date.getTime();
            }
          }
        }
        
        // 2. scheduledDate（投稿予定日）を次に優先
        if (post.scheduledDate) {
          if (post.scheduledDate instanceof Date) {
            return post.scheduledDate.getTime();
          }
          if (post.scheduledDate && typeof post.scheduledDate === "object" && "toDate" in post.scheduledDate) {
            return (post.scheduledDate as { toDate(): Date }).toDate().getTime();
          }
          if (typeof post.scheduledDate === "string") {
            const date = new Date(post.scheduledDate);
            if (!isNaN(date.getTime())) {
              return date.getTime();
            }
          }
        }
        
        // 3. createdAt（作成日時）をフォールバック
        if (post.createdAt instanceof Date) {
          return post.createdAt.getTime();
        }
        if (post.createdAt && typeof post.createdAt === "object" && "toDate" in post.createdAt) {
          return (post.createdAt as { toDate(): Date }).toDate().getTime();
        }
        if (typeof post.createdAt === "string") {
          const date = new Date(post.createdAt);
          return isNaN(date.getTime()) ? 0 : date.getTime();
        }
        return 0;
      };

      const aTime = getDate(a);
      const bTime = getDate(b);
      return bTime - aTime; // 降順（新しい順）
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
          
          // 日付が今週の範囲内かチェック
          if (scheduledDate < today || scheduledDate >= nextWeek) {
            return false;
          }

          // 時間も考慮して、過去の時間の投稿を除外
          if (post.scheduledTime) {
            const [hours, minutes] = post.scheduledTime.split(':').map(Number);
            if (!isNaN(hours) && !isNaN(minutes)) {
              const scheduledDateTime = new Date(scheduledDate);
              scheduledDateTime.setHours(hours, minutes, 0, 0);
              
              // 現在時刻より過去の場合は除外
              if (scheduledDateTime < now) {
                return false;
              }
            }
          } else {
            // 時間が設定されていない場合、日付が今日より過去の場合は除外
            const scheduledDateOnly = new Date(scheduledDate);
            scheduledDateOnly.setHours(0, 0, 0, 0);
            const todayOnly = new Date(now);
            todayOnly.setHours(0, 0, 0, 0);
            
            if (scheduledDateOnly < todayOnly) {
              return false;
            }
          }

          return true;
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

