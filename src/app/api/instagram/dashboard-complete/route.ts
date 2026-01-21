import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import * as admin from "firebase-admin";

interface PostData {
  id: string;
  userId: string;
  title?: string;
  content?: string;
  hashtags?: string[] | string;
  postType: "feed" | "reel" | "story";
  status?: "draft" | "created" | "scheduled" | "published";
  scheduledDate?: Date | string | admin.firestore.Timestamp | null;
  scheduledTime?: string | null;
  imageUrl?: string | null;
  imageData?: string | null;
  createdAt: Date | string | admin.firestore.Timestamp;
  updatedAt?: Date | string | admin.firestore.Timestamp;
  publishedAt?: Date | string | admin.firestore.Timestamp;
  [key: string]: unknown;
}

interface AnalyticsData {
  id: string;
  userId: string;
  postId?: string | null;
  likes?: number;
  comments?: number;
  shares?: number;
  reach?: number;
  saves?: number;
  followerIncrease?: number;
  engagementRate?: number;
  publishedAt?: Date | string | admin.firestore.Timestamp;
  publishedTime?: string;
  createdAt?: Date | string | admin.firestore.Timestamp;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "instagram-dashboard-complete", limit: 60, windowSeconds: 60 },
      auditEventName: "instagram_dashboard_complete_access",
    });

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // 今週の開始日と終了日を計算
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // 今月の開始日と終了日を計算
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 並列でデータを取得
    const [postsSnapshot, analyticsSnapshot, goalDoc, followerCountsSnapshot] = await Promise.all([
      adminDb.collection("posts").where("userId", "==", uid).get(),
      adminDb.collection("analytics").where("userId", "==", uid).get(),
      adminDb.collection("goalSettings").doc(uid).get(),
      adminDb.collection("follower_counts")
        .where("userId", "==", uid)
        .orderBy("date", "desc")
        .limit(2)
        .get(),
    ]);

    const posts: PostData[] = postsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        status: (data.status || "created") as PostData["status"],
        postType: (data.postType || "feed") as PostData["postType"],
        title: data.title || "",
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        scheduledDate: data.scheduledDate?.toDate?.() || data.scheduledDate,
      } as PostData;
    });

    const analytics: AnalyticsData[] = analyticsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        postId: data.postId || null,
        likes: data.likes || 0,
        comments: data.comments || 0,
        shares: data.shares || 0,
        saves: data.saves || 0,
        reach: data.reach || 0,
        followerIncrease: data.followerIncrease || 0,
        ...data,
        publishedAt: data.publishedAt?.toDate?.() || data.publishedAt,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      } as AnalyticsData;
    });

    const goalSettings = goalDoc.exists ? goalDoc.data() : null;
    const followerCounts = followerCountsSnapshot.docs.map((doc) => doc.data());

    // 分析データをマップ化
    const analyticsMap = new Map();
    analytics.forEach((analytics) => {
      if (analytics.postId) {
        analyticsMap.set(analytics.postId, analytics);
      }
    });

    // ===== 1. ダッシュボード統計 =====
    const publishedPosts = posts.filter((p) => p.status === "published");
    const postsThisWeek = publishedPosts.filter((p) => {
      const createdAt = p.createdAt instanceof Date 
        ? p.createdAt 
        : (p.createdAt as admin.firestore.Timestamp)?.toDate 
          ? (p.createdAt as admin.firestore.Timestamp).toDate() 
          : new Date(p.createdAt as string);
      return createdAt >= startOfWeek;
    }).length;

    const monthlyFeedPosts = publishedPosts.filter((p) => {
      const createdAt = p.createdAt instanceof Date 
        ? p.createdAt 
        : (p.createdAt as admin.firestore.Timestamp)?.toDate 
          ? (p.createdAt as admin.firestore.Timestamp).toDate() 
          : new Date(p.createdAt as string);
      return createdAt >= startOfMonth && p.postType === "feed";
    }).length;

    const monthlyReelPosts = publishedPosts.filter((p) => {
      const createdAt = p.createdAt instanceof Date 
        ? p.createdAt 
        : (p.createdAt as admin.firestore.Timestamp)?.toDate 
          ? (p.createdAt as admin.firestore.Timestamp).toDate() 
          : new Date(p.createdAt as string);
      return createdAt >= startOfMonth && p.postType === "reel";
    }).length;

    const monthlyStoryPosts = publishedPosts.filter((p) => {
      const createdAt = p.createdAt instanceof Date 
        ? p.createdAt 
        : (p.createdAt as admin.firestore.Timestamp)?.toDate 
          ? (p.createdAt as admin.firestore.Timestamp).toDate() 
          : new Date(p.createdAt as string);
      return createdAt >= startOfMonth && p.postType === "story";
    }).length;

    // 統計を計算
    let totalLikes = 0;
    let totalComments = 0;
    let totalSaves = 0;
    let totalReach = 0;
    let totalFollowerGrowth = 0;
    let totalEngagement = 0;
    let analyticsCount = 0;

    analytics.forEach((analytics) => {
      totalLikes += analytics.likes || 0;
      totalComments += analytics.comments || 0;
      totalSaves += analytics.saves || 0;
      totalReach += analytics.reach || 0;
      totalFollowerGrowth += typeof analytics.followerIncrease === 'number' ? analytics.followerIncrease : 0;
      totalEngagement +=
        (analytics.likes || 0) + (analytics.comments || 0) + (analytics.shares || 0) + (analytics.saves || 0);
      analyticsCount++;
    });

    // 現在のフォロワー数を取得
    let currentFollowers = 0;
    if (followerCounts.length > 0) {
      currentFollowers = followerCounts[0].count || 0;
    } else {
      // 分析データから計算
      const analyticsWithFollowers = analytics.filter((a) => a.followerIncrease !== undefined);
      if (analyticsWithFollowers.length > 0) {
        // 最初の投稿時点のフォロワー数を推定
        const firstAnalytics = analyticsWithFollowers[analyticsWithFollowers.length - 1];
        const initialFollowersValue = typeof firstAnalytics.initialFollowers === 'number' ? firstAnalytics.initialFollowers : 0;
        const followerIncreaseValue = typeof firstAnalytics.followerIncrease === 'number' ? firstAnalytics.followerIncrease : 0;
        const initialFollowers = initialFollowersValue - followerIncreaseValue;
        currentFollowers = initialFollowers + totalFollowerGrowth;
      }
    }

    const avgEngagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;
    const engagement = analyticsCount > 0 ? avgEngagementRate : 0;
    const followerGrowth = currentFollowers > 0 ? (totalFollowerGrowth / currentFollowers) * 100 : 0;

    // 最も多い投稿タイプを計算
    const postTypeCounts: { [key: string]: number } = { feed: 0, reel: 0, story: 0 };
    publishedPosts.forEach((post) => {
      const postType = post.postType || "feed";
      postTypeCounts[postType] = (postTypeCounts[postType] || 0) + 1;
    });
    const topPostType =
      postTypeCounts.reel >= postTypeCounts.feed && postTypeCounts.reel >= postTypeCounts.story
        ? "reel"
        : postTypeCounts.feed >= postTypeCounts.story
          ? "feed"
          : "story";

    // ベストパフォーマンス投稿を計算
    let bestPerformingPost: { title: string; engagement: number; postType: string } | null = null;
    let maxEngagement = 0;
    analytics.forEach((analytics) => {
      const engagement =
        (analytics.likes || 0) + (analytics.comments || 0) + (analytics.shares || 0) + (analytics.saves || 0);
      if (engagement > maxEngagement) {
        const post = posts.find((p) => p.id === analytics.postId);
        if (post) {
          maxEngagement = engagement;
          bestPerformingPost = {
            title: post.title || "タイトルなし",
            engagement,
            postType: post.postType || "feed",
          };
        }
      }
    });

    const dashboardStats = {
      followers: currentFollowers,
      engagement,
      reach: totalReach,
      saves: totalSaves,
      likes: totalLikes,
      comments: totalComments,
      postsThisWeek,
      weeklyGoal: goalSettings?.weeklyPostGoal || 5,
      followerGrowth,
      topPostType:
        topPostType === "feed" ? "フィード" : topPostType === "reel" ? "リール" : "ストーリー",
      monthlyFeedPosts,
      monthlyReelPosts,
      monthlyStoryPosts,
      totalPosts: publishedPosts.length,
      avgEngagementRate,
      bestPerformingPost,
    };

    // ===== 2. 最近の投稿 =====
    const recentPostsData = publishedPosts
      .filter((post) => {
        const createdAt = post.createdAt instanceof Date 
          ? post.createdAt 
          : (post.createdAt as admin.firestore.Timestamp)?.toDate 
            ? (post.createdAt as admin.firestore.Timestamp).toDate() 
            : new Date(post.createdAt as string);
        return createdAt >= thirtyDaysAgo;
      })
      .sort((a, b) => {
        const aCreatedAt = a.createdAt instanceof Date 
          ? a.createdAt 
          : (a.createdAt as admin.firestore.Timestamp)?.toDate 
            ? (a.createdAt as admin.firestore.Timestamp).toDate() 
            : new Date(a.createdAt as string);
        const bCreatedAt = b.createdAt instanceof Date 
          ? b.createdAt 
          : (b.createdAt as admin.firestore.Timestamp)?.toDate 
            ? (b.createdAt as admin.firestore.Timestamp).toDate() 
            : new Date(b.createdAt as string);
        return bCreatedAt.getTime() - aCreatedAt.getTime();
      })
      .slice(0, 10)
      .map((post) => {
        const analytics = analyticsMap.get(post.id);
        const getPostTypeInfo = (postType: string) => {
          switch (postType) {
            case "feed":
              return { icon: "📝", name: "フィード投稿" };
            case "reel":
              return { icon: "🎬", name: "リール投稿" };
            case "story":
              return { icon: "📱", name: "ストーリー投稿" };
            default:
              return { icon: "📝", name: "投稿" };
          }
        };

        const typeInfo = getPostTypeInfo(post.postType || "feed");
        const createdAt = post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt);
        const timeAgo = getTimeAgo(createdAt);

        return {
          id: post.id,
          title: post.title || typeInfo.name,
          postType: post.postType || "feed",
          icon: typeInfo.icon,
          timeAgo,
          likes: analytics?.likes || 0,
          comments: analytics?.comments || 0,
          shares: analytics?.shares || 0,
          reach: analytics?.reach || 0,
          hasAnalytics: !!analytics,
        };
      });

    // ===== 3. パフォーマンスサマリー =====
    const weeklyAnalytics = analytics.filter((analytics) => {
      if (!analytics.publishedAt) return false;
      const publishedAt = analytics.publishedAt instanceof Date 
        ? analytics.publishedAt 
        : (analytics.publishedAt as admin.firestore.Timestamp)?.toDate 
          ? (analytics.publishedAt as admin.firestore.Timestamp).toDate() 
          : new Date(analytics.publishedAt as string);
      return publishedAt >= oneWeekAgo;
    });

    let weeklyFollowerGrowth = 0;
    let weeklyEngagement = 0;
    let weeklyReach = 0;

    weeklyAnalytics.forEach((analytics) => {
      weeklyFollowerGrowth += typeof analytics.followerIncrease === 'number' ? analytics.followerIncrease : 0;
      weeklyEngagement +=
        (typeof analytics.likes === 'number' ? analytics.likes : 0) + 
        (typeof analytics.comments === 'number' ? analytics.comments : 0) + 
        (typeof analytics.shares === 'number' ? analytics.shares : 0) + 
        (typeof analytics.saves === 'number' ? analytics.saves : 0);
      weeklyReach += typeof analytics.reach === 'number' ? analytics.reach : 0;
    });

    const avgWeeklyEngagementRate = weeklyReach > 0 ? (weeklyEngagement / weeklyReach) * 100 : 0;
    const postsThisMonth = publishedPosts.filter((p) => {
      const createdAt = p.createdAt instanceof Date 
        ? p.createdAt 
        : (p.createdAt as admin.firestore.Timestamp)?.toDate 
          ? (p.createdAt as admin.firestore.Timestamp).toDate() 
          : new Date(p.createdAt as string);
      return createdAt >= oneMonthAgo;
    }).length;

    // 投稿頻度の評価
    let frequencyStatus = "低い";
    let frequencyColor = "text-red-600";
    if (postsThisWeek >= 5) {
      frequencyStatus = "活発";
      frequencyColor = "text-green-600";
    } else if (postsThisWeek >= 3) {
      frequencyStatus = "普通";
      frequencyColor = "text-orange-600";
    }

    // エンゲージメントの評価
    let engagementStatus = "低い";
    let engagementColor = "text-red-600";
    if (avgWeeklyEngagementRate >= 5) {
      engagementStatus = "良好";
      engagementColor = "text-green-600";
    } else if (avgWeeklyEngagementRate >= 3) {
      engagementStatus = "普通";
      engagementColor = "text-orange-600";
    }

    // 成長の評価
    let growthStatus = "減少";
    let growthColor = "text-red-600";
    if (weeklyFollowerGrowth > 10) {
      growthStatus = "順調";
      growthColor = "text-green-600";
    } else if (weeklyFollowerGrowth > 0) {
      growthStatus = "微増";
      growthColor = "text-orange-600";
    }

    const performanceSummary = {
      weeklyGrowth: {
        value: weeklyFollowerGrowth,
        status: growthStatus,
        color: growthColor,
        label: "今週の成長",
      },
      engagement: {
        value: avgWeeklyEngagementRate,
        status: engagementStatus,
        color: engagementColor,
        label: "エンゲージメント",
      },
      frequency: {
        value: postsThisWeek,
        status: frequencyStatus,
        color: frequencyColor,
        label: "投稿頻度",
      },
      stats: {
        postsThisWeek,
        postsThisMonth,
        weeklyEngagement,
        weeklyReach,
      },
    };

    // ===== 4. 目標進捗 =====
    const weeklyGoal = goalSettings?.weeklyPostGoal || 5;
    const followerGoal = goalSettings?.followerGoal || 10;

    // 今週の投稿数は既に計算済み
    const weeklyPostProgress = Math.min((postsThisWeek / weeklyGoal) * 100, 100);

    // フォロワー成長の計算
    const recentAnalytics = analytics
      .filter((a) => a.publishedAt)
      .sort((a, b) => {
        if (!a.publishedAt || !b.publishedAt) return 0;
        const aPublishedAt = a.publishedAt instanceof Date 
          ? a.publishedAt 
          : (a.publishedAt as admin.firestore.Timestamp)?.toDate 
            ? (a.publishedAt as admin.firestore.Timestamp).toDate() 
            : new Date(a.publishedAt as string);
        const bPublishedAt = b.publishedAt instanceof Date 
          ? b.publishedAt 
          : (b.publishedAt as admin.firestore.Timestamp)?.toDate 
            ? (b.publishedAt as admin.firestore.Timestamp).toDate() 
            : new Date(b.publishedAt as string);
        return bPublishedAt.getTime() - aPublishedAt.getTime();
      })
      .slice(0, 7);

    let recentTotalFollowerGrowth = 0;
    let postsWithGrowth = 0;

    recentAnalytics.forEach((analytics) => {
      if (analytics.followerIncrease) {
        recentTotalFollowerGrowth += typeof analytics.followerIncrease === 'number' ? analytics.followerIncrease : 0;
        postsWithGrowth++;
      }
    });

    const avgFollowerGrowth = postsWithGrowth > 0 ? recentTotalFollowerGrowth / postsWithGrowth : 0;
    const followerGrowthProgress = Math.min(Math.max((avgFollowerGrowth / followerGoal) * 100, 0), 100);

    // 目標達成状況の評価
    const weeklyPostStatus =
      weeklyPostProgress >= 100
        ? "達成"
        : weeklyPostProgress >= 80
          ? "順調"
          : weeklyPostProgress >= 50
            ? "普通"
            : "要改善";

    const followerGrowthStatus =
      followerGrowthProgress >= 100
        ? "達成"
        : followerGrowthProgress >= 80
          ? "順調"
          : followerGrowthProgress >= 50
            ? "普通"
            : "要改善";

    const goalProgress = {
      weeklyPosts: {
        current: postsThisWeek,
        goal: weeklyGoal,
        progress: weeklyPostProgress,
        status: weeklyPostStatus,
        label: "週間投稿目標",
      },
      followerGrowth: {
        current: avgFollowerGrowth,
        goal: followerGoal,
        progress: followerGrowthProgress,
        status: followerGrowthStatus,
        label: "フォロワー成長目標",
      },
    };

    // ===== 5. 次のアクション =====
    const actions = [];

    // 1. 分析待ちの投稿チェック
    const analyzedPostIds = new Set(analytics.map((a) => a.postId).filter(Boolean));
    const unanalyzedPosts = publishedPosts.filter((post) => !analyzedPostIds.has(post.id));

    if (unanalyzedPosts.length > 0) {
      actions.push({
        id: "unanalyzed_posts",
        type: "analysis",
        priority: "high",
        title: `分析待ちの投稿${unanalyzedPosts.length}件あります`,
        description: "投稿のパフォーマンスを分析して改善点を見つけましょう",
        actionText: "分析する",
        actionUrl: "/instagram/analytics",
        icon: "📊",
        color: "red",
      });
    }

    // 2. 目標達成度チェック
    if (goalSettings) {
      const weeklyRemaining = weeklyGoal - postsThisWeek;
      if (weeklyRemaining > 0) {
        actions.push({
          id: "weekly_goal",
          type: "goal",
          priority: "medium",
          title: `週間投稿目標まであと${weeklyRemaining}件`,
          description: "目標達成に向けて投稿を作成しましょう",
          actionText: "投稿を作成",
          actionUrl: "/instagram/lab",
          icon: "📝",
          color: "orange",
        });
      }

      // フォロワー増加目標
      const monthlyAnalytics = analytics.filter((a) => {
        if (!a.publishedAt) return false;
        const publishedAt = a.publishedAt instanceof Date 
          ? a.publishedAt 
          : (a.publishedAt as admin.firestore.Timestamp)?.toDate 
            ? (a.publishedAt as admin.firestore.Timestamp).toDate() 
            : new Date(a.publishedAt as string);
        return publishedAt >= startOfMonth;
      });

      let totalFollowerIncrease = 0;
      monthlyAnalytics.forEach((a) => {
        totalFollowerIncrease += typeof a.followerIncrease === 'number' ? a.followerIncrease : 0;
      });

      const followerRemaining = followerGoal - totalFollowerIncrease;
      if (followerRemaining > 0) {
        actions.push({
          id: "follower_goal",
          type: "goal",
          priority: "medium",
          title: `フォロワー増加目標まであと${followerRemaining}人`,
          description: "エンゲージメントを向上させてフォロワーを増やしましょう",
          actionText: "戦略を見る",
          actionUrl: "/instagram/plan",
          icon: "👥",
          color: "blue",
        });
      }
    }

    // 3. 投稿頻度チェック
    const recentPostCount = publishedPosts.filter((p) => {
      const createdAt = p.createdAt instanceof Date 
        ? p.createdAt 
        : (p.createdAt as admin.firestore.Timestamp)?.toDate 
          ? (p.createdAt as admin.firestore.Timestamp).toDate() 
          : new Date(p.createdAt as string);
      return createdAt >= oneWeekAgo;
    }).length;

    if (recentPostCount === 0) {
      actions.push({
        id: "low_activity",
        type: "engagement",
        priority: "high",
        title: "最近の投稿がありません",
        description: "定期的な投稿でフォロワーとのエンゲージメントを維持しましょう",
        actionText: "投稿を作成",
        actionUrl: "/instagram/lab",
        icon: "📱",
        color: "red",
      });
    } else if (recentPostCount < 3) {
      actions.push({
        id: "low_frequency",
        type: "engagement",
        priority: "medium",
        title: "投稿頻度が低いです",
        description: "より多くの投稿でフォロワーの関心を維持しましょう",
        actionText: "投稿計画を見る",
        actionUrl: "/instagram/plan",
        icon: "📅",
        color: "orange",
      });
    }

    // 4. エンゲージメント率チェック
    if (analytics.length > 0 && avgEngagementRate < 3) {
      actions.push({
        id: "low_engagement",
        type: "engagement",
        priority: "high",
        title: "エンゲージメント率が低いです",
        description: `現在のエンゲージメント率: ${avgEngagementRate.toFixed(1)}%。コンテンツの質を向上させましょう`,
        actionText: "改善策を見る",
        actionUrl: "/instagram/plan",
        icon: "📈",
        color: "red",
      });
    } else if (analytics.length > 0 && avgEngagementRate < 5) {
      actions.push({
        id: "medium_engagement",
        type: "engagement",
        priority: "medium",
        title: "エンゲージメント率を向上させましょう",
        description: `現在のエンゲージメント率: ${avgEngagementRate.toFixed(1)}%。さらなる改善の余地があります`,
        actionText: "戦略を確認",
        actionUrl: "/instagram/plan",
        icon: "📊",
        color: "orange",
      });
    }

    // 優先度順にソート（high > medium > low）
    const priorityOrder: { [key: string]: number } = { high: 3, medium: 2, low: 1 };
    actions.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    // 最大5件まで返す
    const limitedActions = actions.slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        dashboardStats,
        recentPosts: recentPostsData,
        performanceSummary,
        goalProgress,
        nextActions: limitedActions,
      },
    });
  } catch (error) {
    console.error("❌ Instagram dashboard complete error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// 時間差を計算する関数
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "たった今";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}分前`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}時間前`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}日前`;
  } else {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months}ヶ月前`;
  }
}

