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

interface FeedbackSentimentComment {
  postId: string;
  title: string;
  comment: string;
  sentiment: "positive" | "negative" | "neutral";
  createdAt?: string;
  postType?: "feed" | "reel" | "story";
}

interface FeedbackPostSentimentEntry {
  postId: string;
  title: string;
  postType?: "feed" | "reel" | "story";
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  score: number;
  lastComment?: string;
  lastCommentAt?: string;
  lastSentiment?: "positive" | "negative" | "neutral";
  status?: "gold" | "negative" | "normal";
}

interface FeedbackSentimentSummary {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  positiveRate: number;
  withCommentCount: number;
  commentHighlights?: {
    positive: FeedbackSentimentComment[];
    negative: FeedbackSentimentComment[];
  };
  posts?: FeedbackPostSentimentEntry[];
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-feedback-sentiment", limit: 30, windowSeconds: 60 },
      auditEventName: "analytics_feedback_sentiment_access",
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
    const [postsSnapshot, feedbackSnapshot, snapshotsSnapshot] = await Promise.all([
      // 期間内の投稿を取得
      adminDb
        .collection("posts")
        .where("userId", "==", uid)
        .where("createdAt", ">=", startTimestamp)
        .where("createdAt", "<=", endTimestamp)
        .get(),

      // フィードバックデータを取得
      adminDb
        .collection("ai_post_feedback")
        .where("userId", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(500)
        .get(),

      // スナップショット参照を取得（投稿のステータス判定用）
      adminDb
        .collection("postPerformanceSnapshots")
        .where("userId", "==", uid)
        .where("createdAt", ">=", startTimestamp)
        .where("createdAt", "<=", endTimestamp)
        .get(),
    ]);

    // 投稿マップを作成
    const postsMap = new Map(
      postsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return [
          doc.id,
          {
            id: doc.id,
            title: data.title || data.caption?.substring(0, 50) || "タイトルなし",
            postType: data.postType || data.type || "feed",
          },
        ];
      })
    );

    // スナップショットステータスマップを作成
    const snapshotStatusMap = new Map<string, "gold" | "negative" | "normal">();
    snapshotsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const postId = data.postId;
      if (postId) {
        snapshotStatusMap.set(postId, data.status || "normal");
      }
    });

    // フィードバックエントリを期間でフィルタリング
    type RawFeedbackEntry = {
      id: string;
      postId?: string;
      sentiment: "positive" | "negative" | "neutral";
      comment?: string;
      createdAt?: Date;
    };

    const entries: RawFeedbackEntry[] = feedbackSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.();
        return {
          id: doc.id,
          postId: data.postId,
          sentiment: (data.sentiment as RawFeedbackEntry["sentiment"]) || "neutral",
          comment: data.comment,
          createdAt,
        };
      })
      .filter((entry) => {
        if (!entry.createdAt) {
          return false;
        }
        return entry.createdAt >= start && entry.createdAt < end;
      });

    if (entries.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        month: date,
      });
    }

    // カウントとコメントを集計
    const counts = {
      positive: 0,
      negative: 0,
      neutral: 0,
    };
    let withCommentCount = 0;

    type CommentInternal = FeedbackSentimentComment & { createdAtMs: number };
    const positiveComments: CommentInternal[] = [];
    const negativeComments: CommentInternal[] = [];

    const postStats = new Map<
      string,
      FeedbackPostSentimentEntry & {
        lastCommentDate?: Date;
      }
    >();

    entries.forEach((entry) => {
      counts[entry.sentiment] += 1;

      const postMeta = entry.postId ? postsMap.get(entry.postId) : null;
      const baseComment = entry.comment?.trim();

      if (baseComment) {
        withCommentCount += 1;
        const commentPayload: CommentInternal = {
          postId: entry.postId || "",
          title: postMeta?.title || "投稿",
          comment: baseComment,
          sentiment: entry.sentiment,
          createdAt: entry.createdAt?.toISOString(),
          createdAtMs: entry.createdAt?.getTime() ?? 0,
          postType: postMeta?.postType,
        };
        if (entry.sentiment === "positive") {
          positiveComments.push(commentPayload);
        } else if (entry.sentiment === "negative") {
          negativeComments.push(commentPayload);
        }
      }

      if (!entry.postId) {
        return;
      }

      if (!postStats.has(entry.postId)) {
        postStats.set(entry.postId, {
          postId: entry.postId,
          title: postMeta?.title || "投稿",
          postType: postMeta?.postType,
          total: 0,
          positive: 0,
          negative: 0,
          neutral: 0,
          score: 0,
          status: snapshotStatusMap.get(entry.postId) ?? "normal",
        });
      }

      const stat = postStats.get(entry.postId)!;
      stat.total += 1;
      stat[entry.sentiment] += 1;
      stat.score = stat.positive - stat.negative;

      if (baseComment) {
        const currentDate = entry.createdAt;
        if (!stat.lastCommentDate || (currentDate && currentDate > stat.lastCommentDate)) {
          stat.lastComment = baseComment;
          stat.lastCommentAt = currentDate?.toISOString();
          stat.lastSentiment = entry.sentiment;
          stat.lastCommentDate = currentDate || stat.lastCommentDate;
        }
      }
    });

    const total = counts.positive + counts.negative + counts.neutral;
    if (total === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        month: date,
      });
    }

    const formatComments = (list: CommentInternal[]) =>
      list
        .sort((a, b) => b.createdAtMs - a.createdAtMs)
        .slice(0, 3)
        .map(({ createdAtMs, ...rest }) => rest);

    const postsArray = Array.from(postStats.values())
      .map((entry) => {
        const { lastCommentDate, ...rest } = entry;
        return rest;
      })
      .sort((a, b) => {
        if (b.score === a.score) {
          return b.total - a.total;
        }
        return b.score - a.score;
      })
      .slice(0, 6);

    const summary: FeedbackSentimentSummary = {
      total,
      positive: counts.positive,
      negative: counts.negative,
      neutral: counts.neutral,
      positiveRate: counts.positive / total,
      withCommentCount,
      commentHighlights: {
        positive: formatComments(positiveComments),
        negative: formatComments(negativeComments),
      },
      posts: postsArray,
    };

    return NextResponse.json({
      success: true,
      data: summary,
      month: date,
    });
  } catch (error) {
    console.error("❌ フィードバック感情トラッキング取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(
      {
        ...body,
        error: "フィードバック感情トラッキングの取得に失敗しました",
      },
      { status }
    );
  }
}

