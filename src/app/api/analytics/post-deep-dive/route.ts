import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import * as admin from "firebase-admin";

// 月の範囲を計算
function getMonthRange(date: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = date.split("-").map(Number);
  const start = new Date(Date.UTC(yearStr, monthStr - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(yearStr, monthStr, 0, 23, 59, 59, 999));
  return { start, end };
}

interface PostDeepDiveData {
  id: string;
  title: string;
  postType: "feed" | "reel" | "story" | "carousel" | "video";
  createdAt: Date;
  analyticsSummary?: {
    likes: number;
    comments: number;
    saves: number;
    reach: number;
    followerIncrease: number;
    engagementRate: number;
  };
  snapshotReferences?: Array<{
    id: string;
    status: "gold" | "negative" | "normal";
    summary?: string;
  }>;
}

interface PatternHighlights {
  gold?: Array<{
    id: string;
    status: "gold";
    summary?: string;
  }>;
  negative?: Array<{
    id: string;
    status: "negative";
    summary?: string;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-post-deep-dive", limit: 30, windowSeconds: 60 },
      auditEventName: "analytics_post_deep_dive_access",
    });

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 7); // YYYY-MM形式

    if (!/^\d{4}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "date parameter must be in YYYY-MM format" },
        { status: 400 }
      );
    }

    // 月の範囲を計算
    const { start, end } = getMonthRange(date);
    const startTimestamp = admin.firestore.Timestamp.fromDate(start);
    const endTimestamp = admin.firestore.Timestamp.fromDate(end);

    // 必要なデータを取得（並列）
    const [postsSnapshot, analyticsSnapshot, snapshotsSnapshot] = await Promise.all([
      // 期間内の投稿を取得
      adminDb
        .collection("posts")
        .where("userId", "==", uid)
        .where("createdAt", ">=", startTimestamp)
        .where("createdAt", "<=", endTimestamp)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get(),

      // 期間内の分析データを取得
      adminDb
        .collection("analytics")
        .where("userId", "==", uid)
        .where("publishedAt", ">=", startTimestamp)
        .where("publishedAt", "<=", endTimestamp)
        .get(),

      // スナップショット参照を取得
      adminDb
        .collection("postPerformanceSnapshots")
        .where("userId", "==", uid)
        .where("createdAt", ">=", startTimestamp)
        .where("createdAt", "<=", endTimestamp)
        .get(),
    ]);

    // 投稿と分析データをpostIdで紐付け
    const analyticsByPostId = new Map<string, any>();
    analyticsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const postId = data.postId;
      if (postId) {
        const existing = analyticsByPostId.get(postId);
        if (!existing || (data.publishedAt && existing.publishedAt && data.publishedAt > existing.publishedAt)) {
          analyticsByPostId.set(postId, data);
        }
      }
    });

    // スナップショット参照をpostIdでグループ化
    const snapshotsByPostId = new Map<string, Array<{ id: string; status: "gold" | "negative" | "normal"; summary?: string }>>();
    snapshotsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const postId = data.postId;
      if (postId) {
        if (!snapshotsByPostId.has(postId)) {
          snapshotsByPostId.set(postId, []);
        }
        snapshotsByPostId.get(postId)!.push({
          id: doc.id,
          status: data.status || "normal",
          summary: data.summary || data.insight || undefined,
        });
      }
    });

    // 投稿データを整形
    const posts: PostDeepDiveData[] = postsSnapshot.docs.map((doc) => {
      const postData = doc.data();
      const postId = doc.id;
      const analytics = analyticsByPostId.get(postId);
      const snapshots = snapshotsByPostId.get(postId) || [];

      // エンゲージメント率を計算
      let engagementRate = 0;
      if (analytics && analytics.reach > 0) {
        engagementRate = ((analytics.likes || 0) + (analytics.comments || 0)) / analytics.reach * 100;
      }

      return {
        id: postId,
        title: postData.title || postData.caption?.substring(0, 50) || "タイトルなし",
        postType: postData.postType || postData.type || "feed",
        createdAt: postData.createdAt instanceof admin.firestore.Timestamp
          ? postData.createdAt.toDate()
          : new Date(postData.createdAt),
        analyticsSummary: analytics
          ? {
              likes: analytics.likes || 0,
              comments: analytics.comments || 0,
              saves: analytics.saves || 0,
              reach: analytics.reach || 0,
              followerIncrease: analytics.followerIncrease || 0,
              engagementRate,
            }
          : undefined,
        snapshotReferences: snapshots.length > 0 ? snapshots : undefined,
      };
    });

    // リーチ数でソート（降順）
    posts.sort((a, b) => {
      const aReach = a.analyticsSummary?.reach || 0;
      const bReach = b.analyticsSummary?.reach || 0;
      return bReach - aReach;
    });

    // 成功/改善パターンを抽出
    const patternHighlights: PatternHighlights = {
      gold: [],
      negative: [],
    };

    snapshotsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const status = data.status;
      if (status === "gold") {
        patternHighlights.gold!.push({
          id: doc.id,
          status: "gold",
          summary: data.summary || data.insight || undefined,
        });
      } else if (status === "negative") {
        patternHighlights.negative!.push({
          id: doc.id,
          status: "negative",
          summary: data.summary || data.insight || undefined,
        });
      }
    });

    // 最大4件まで
    const postsToShow = posts.slice(0, 4);
    const goldHighlights = (patternHighlights.gold || []).slice(0, 3);
    const negativeHighlights = (patternHighlights.negative || []).slice(0, 3);

    return NextResponse.json({
      success: true,
      data: {
        posts: postsToShow,
        patternHighlights: {
          gold: goldHighlights.length > 0 ? goldHighlights : undefined,
          negative: negativeHighlights.length > 0 ? negativeHighlights : undefined,
        },
        month: date,
      },
    });
  } catch (error) {
    console.error("❌ 投稿ディープダイブ取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(
      {
        ...body,
        error: "投稿ディープダイブの取得に失敗しました",
      },
      { status }
    );
  }
}

