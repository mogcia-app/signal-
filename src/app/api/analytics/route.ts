import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../lib/server/auth-context";
import { assertFeatureEnabled } from "@/lib/server/feature-guard";

// 目標達成度チェック関数
async function checkGoalAchievement(userId: string) {
  try {
    // 目標設定を取得
    const goalDoc = await adminDb.collection("goalSettings").doc(userId).get();
    if (!goalDoc.exists) {
      console.log("No goal settings found for user:", userId);
      return;
    }

    const goalSettings = goalDoc.data();
    if (!goalSettings) {
      console.log("No goal settings data found for user:", userId);
      return;
    }

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 今週の投稿数を取得
    const weeklyPostsQuery = await adminDb.collection("posts").where("userId", "==", userId).get();

    const weeklyPostCount = weeklyPostsQuery.docs.filter((doc) => {
      const data = doc.data();
      let createdAt = data.createdAt;
      if (createdAt && createdAt.toDate) {
        createdAt = createdAt.toDate();
      } else if (createdAt && typeof createdAt === "string") {
        createdAt = new Date(createdAt);
      }
      return createdAt && createdAt >= startOfWeek;
    }).length;

    // 今月の投稿数を取得
    const monthlyPostsQuery = await adminDb.collection("posts").where("userId", "==", userId).get();

    const monthlyPostCount = monthlyPostsQuery.docs.filter((doc) => {
      const data = doc.data();
      let createdAt = data.createdAt;
      if (createdAt && createdAt.toDate) {
        createdAt = createdAt.toDate();
      } else if (createdAt && typeof createdAt === "string") {
        createdAt = new Date(createdAt);
      }
      return createdAt && createdAt >= startOfMonth;
    }).length;

    // 今月のフォロワー増加数を取得
    const analyticsQuery = await adminDb
      .collection("analytics")
      .where("userId", "==", userId)
      .get();

    let totalFollowerIncrease = 0;
    analyticsQuery.forEach((doc) => {
      const data = doc.data();
      if (data.followerIncrease) {
        // publishedAtが今月以降かチェック
        let publishedAt = data.publishedAt;
        if (publishedAt && publishedAt.toDate) {
          publishedAt = publishedAt.toDate();
        } else if (publishedAt && typeof publishedAt === "string") {
          publishedAt = new Date(publishedAt);
        }

        if (publishedAt && publishedAt >= startOfMonth) {
          totalFollowerIncrease += parseInt(data.followerIncrease) || 0;
        }
      }
    });

    // 目標達成通知を保存
    const achievements = [];

    if (weeklyPostCount >= goalSettings.weeklyPostGoal) {
      achievements.push({
        type: "weekly_posts",
        title: "週間投稿目標",
        message: `🎉 週間投稿目標達成！${weeklyPostCount}/${goalSettings.weeklyPostGoal}件`,
        achievedAt: new Date(),
      });
    }

    if (totalFollowerIncrease >= goalSettings.followerGoal) {
      achievements.push({
        type: "follower_increase",
        title: "フォロワー増加目標",
        message: `🎉 フォロワー増加目標達成！${totalFollowerIncrease}/${goalSettings.followerGoal}人`,
        achievedAt: new Date(),
      });
    }

    if (monthlyPostCount >= goalSettings.monthlyPostGoal) {
      achievements.push({
        type: "monthly_posts",
        title: "月間投稿目標",
        message: `🎉 月間投稿目標達成！${monthlyPostCount}/${goalSettings.monthlyPostGoal}件`,
        achievedAt: new Date(),
      });
    }

    // 達成通知を保存
    if (achievements.length > 0) {
      for (const achievement of achievements) {
        await adminDb.collection("goalAchievements").add({
          userId,
          ...achievement,
          createdAt: new Date(),
        });
      }
      console.log("Goal achievements saved:", achievements.length);
    }
  } catch (error) {
    console.error("Goal achievement check error:", error);
    throw error;
  }
}

// 分析データの型定義
interface AnalyticsData {
  id?: string;
  userId: string;
  postId?: string | null;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  saves: number;
  followerIncrease: number;
  publishedAt: string;
  publishedTime: string;
  title: string;
  content: string;
  hashtags: string;
  thumbnail: string;
  category: string;
  engagementRate: number;
  audience: {
    gender: {
      male: string;
      female: string;
      other: string;
    };
    age: {
      "13-17": string;
      "18-24": string;
      "25-34": string;
      "35-44": string;
      "45-54": string;
      "55-64": string;
      "65+": string;
    };
  };
  reachSource: {
    sources: {
      posts: string;
      profile: string;
      explore: string;
      search: string;
      other: string;
    };
    followers: {
      followers: string;
      nonFollowers: string;
    };
  };
  sentiment?: "satisfied" | "dissatisfied" | null;
  sentimentMemo?: string;
  createdAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-list", limit: 60, windowSeconds: 60 },
      auditEventName: "analytics_list",
    });
    const { searchParams } = new URL(request.url);
    const snsType = searchParams.get("snsType") ?? "instagram";

    console.log("Fetching analytics for uid:", uid, "snsType:", snsType);

    // 本番環境でFirebase設定がない場合は空の配列を返す
    if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      console.log("Firebase API key not found in production, returning empty analytics");
      return NextResponse.json({
        analytics: [],
        total: 0,
      });
    }

    let query = adminDb.collection("analytics").where("userId", "==", uid);
    if (snsType) {
      query = query.where("snsType", "==", snsType);
    }

    const snapshot = await query.get();

    const analytics = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
        };
      })
      .sort((a, b) => {
        const aTime =
          a.createdAt instanceof Date
            ? a.createdAt.getTime()
            : new Date(a.createdAt as string).getTime();
        const bTime =
          b.createdAt instanceof Date
            ? b.createdAt.getTime()
            : new Date(b.createdAt as string).getTime();
        return bTime - aTime; // 降順
      });

    console.log("Fetched analytics from collection:", analytics.length, "records");

    return NextResponse.json({
      success: true,
      data: analytics,
      analytics, // 互換性のため残す
      total: snapshot.size,
    });
  } catch (error) {
    console.error("Analytics fetch error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(
      {
        ...body,
        error: "Failed to fetch analytics data",
        details: body.details ?? (body.error !== "Failed to fetch analytics data" ? body.error : undefined),
        code: body.code ?? "analytics_list_error",
      },
      { status },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-create", limit: 20, windowSeconds: 60 },
      auditEventName: "analytics_create",
    });
    await assertFeatureEnabled("analytics.write");

    const body = await request.json();
    const {
      userId,
      postId,
      likes,
      comments,
      shares,
      reach,
      saves,
      followerIncrease,
      publishedAt,
      publishedTime,
      title,
      content,
      hashtags,
      thumbnail,
      category,
      audience,
      reachSource,
      sentiment,
      sentimentMemo,
    } = body;

    if (userId && userId !== uid) {
      return NextResponse.json({ error: "別ユーザーの分析データは保存できません" }, { status: 403 });
    }
    const resolvedUserId = uid;

    // バリデーション
    if (!likes || !reach) {
      return NextResponse.json({ error: "必須フィールドが不足しています" }, { status: 400 });
    }

    // エンゲージメント率を計算
    const totalEngagement = Number(likes) + Number(comments) + Number(shares);
    const engagementRate = Number(reach) > 0 ? (totalEngagement / Number(reach)) * 100 : 0;

    const analyticsData: Omit<AnalyticsData, "id"> = {
      userId: resolvedUserId,
      postId: postId || null,
      likes: Number(likes),
      comments: Number(comments),
      shares: Number(shares),
      reach: Number(reach),
      saves: Number(saves),
      followerIncrease: Number(followerIncrease),
      publishedAt: `${publishedAt}T${publishedTime}`,
      publishedTime,
      title: title || "",
      content: content || "",
      hashtags: hashtags
        ? hashtags
            .split(" ")
            .filter((tag: string) => tag.trim() !== "")
            .map((tag: string) => tag.replace("#", ""))
        : [],
      thumbnail: thumbnail || "",
      category: category || "feed",
      engagementRate,
      audience: audience || {
        gender: { male: "", female: "", other: "" },
        age: {
          "13-17": "",
          "18-24": "",
          "25-34": "",
          "35-44": "",
          "45-54": "",
          "55-64": "",
          "65+": "",
        },
      },
      reachSource: reachSource || {
        sources: { posts: "", profile: "", explore: "", search: "", other: "" },
        followers: { followers: "", nonFollowers: "" },
      },
      sentiment: sentiment || null,
      sentimentMemo: sentimentMemo || "",
      createdAt: new Date(),
    };

    console.log("Saving analytics data:", analyticsData);

    const docRef = await adminDb.collection("analytics").add(analyticsData);

    console.log("Analytics saved successfully:", {
      id: docRef.id,
      userId: analyticsData.userId,
      engagementRate: analyticsData.engagementRate,
    });

    // 目標達成度をチェック
    try {
      await checkGoalAchievement(resolvedUserId);
    } catch (error) {
      console.error("Goal achievement check error:", error);
      // 目標チェックに失敗してもanalytics保存は成功しているので続行
    }

    // 投稿にanalyticsデータをリンク（postIdがある場合）
    if (postId) {
      try {
        await adminDb
          .collection("posts")
          .doc(postId)
          .update({
            analytics: {
              likes: analyticsData.likes,
              comments: analyticsData.comments,
              shares: analyticsData.shares,
              reach: analyticsData.reach,
              engagementRate: analyticsData.engagementRate,
              publishedAt: analyticsData.publishedAt,
            },
            status: "published",
            updatedAt: new Date(),
          });
        console.log("Post analytics updated successfully for postId:", postId);
      } catch (error) {
        console.error("Failed to update post analytics:", error);
        // 投稿の更新に失敗してもanalytics保存は成功しているので続行
      }
    }

    return NextResponse.json({
      id: docRef.id,
      message: "Analytics data saved successfully",
      engagementRate: analyticsData.engagementRate,
      data: { ...analyticsData, id: docRef.id },
    });
  } catch (error) {
    console.error("Analytics save error:", error);
    return NextResponse.json({ error: "Failed to save analytics data" }, { status: 500 });
  }
}
