import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { canAccessFeature } from "@/lib/plan-access";
import { buildAIContext } from "@/lib/ai/context";
import OpenAI from "openai";
import * as admin from "firebase-admin";
import type { AiClient, AnalyticsData, ParsedActionPlan } from "@/domain/analysis/report/types";
import { getMonthName, getMonthRange, getNextMonthName } from "@/domain/analysis/report/utils/month";
import { calculatePerformanceScore } from "@/domain/analysis/report/calculators/performance-score";
import { extractActionPlansFromReview } from "@/domain/analysis/report/parsers/action-plans-from-review";
import {
  aggregatePreviousMonthAnalytics,
  detectRiskAlerts,
  type RuntimeRiskAlert,
} from "@/domain/analysis/report/calculators/risk-detection";
import {
  buildAiErrorFallbackMonthlyReview,
  buildInsufficientDataMonthlyReview,
  buildNoDataMonthlyReview,
  formatFollowerChangeText,
  formatReachChangeText,
} from "@/domain/analysis/report/usecases/monthly-review-generation";
import { generateMonthlyReviewWithAi } from "@/domain/analysis/report/usecases/generate-monthly-review-with-ai";
import {
  loadReusableMonthlyReview,
  persistFallbackMonthlyReview,
  persistGeneratedMonthlyReview,
  type MonthlyReviewStore,
} from "@/domain/analysis/report/usecases/monthly-review-persistence";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

const aiClient: AiClient | null = openai
  ? {
      async generateText({ model, systemPrompt, userPrompt, temperature, maxTokens }) {
        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
        });
        return completion.choices[0]?.message?.content || "";
      },
    }
  : null;

const monthlyReviewStore: MonthlyReviewStore = {
  async getMonthlyReview(userId, month) {
    const doc = await adminDb.collection("monthly_reviews").doc(`${userId}_${month}`).get();
    if (!doc.exists) {
      return null;
    }
    const data = doc.data();
    return {
      review: data?.review || "",
      actionPlans: data?.actionPlans || [],
    };
  },
  async saveMonthlyReview({
    userId,
    month,
    review,
    actionPlans,
    hasPlan,
    analyzedCount,
    isFallback,
    merge,
  }) {
    await adminDb.collection("monthly_reviews").doc(`${userId}_${month}`).set(
      {
        userId,
        month,
        review,
        actionPlans,
        hasPlan,
        analyzedCount,
        isFallback,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge }
    );
  },
  async upsertAiDirection({
    userId,
    month,
    mainTheme,
    avoidFocus,
    priorityKPI,
    postingRules,
    optimalPostingTime,
  }) {
    await adminDb.collection("ai_direction").doc(`${userId}_${month}`).set(
      {
        userId,
        month,
        mainTheme,
        avoidFocus,
        priorityKPI,
        postingRules,
        optimalPostingTime,
        generatedFrom: "monthly_review",
        lockedAt: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  },
};


export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-report-complete", limit: 60, windowSeconds: 60 },
      auditEventName: "analytics_report_complete_access",
    });

    // プラン階層別アクセス制御
    const userProfile = await getUserProfile(uid);
    if (!canAccessFeature(userProfile, "canAccessReport")) {
      return NextResponse.json(
        { success: false, error: "月次レポート機能は、現在のプランではご利用いただけません。" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 7); // YYYY-MM形式
    const forceRegenerate = searchParams.get("regenerate") === "true";

    if (!/^\d{4}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: "date parameter must be in YYYY-MM format" },
        { status: 400 }
      );
    }

    // 月の範囲を計算
    const { start, end } = getMonthRange(date);
    const startTimestamp = admin.firestore.Timestamp.fromDate(start);
    const endTimestamp = admin.firestore.Timestamp.fromDate(end);

    // 前月の範囲を計算
    const prevMonth = new Date(start);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
    const { start: prevStart, end: prevEnd } = getMonthRange(prevMonthStr);
    const prevStartTimestamp = admin.firestore.Timestamp.fromDate(prevStart);
    const prevEndTimestamp = admin.firestore.Timestamp.fromDate(prevEnd);

    // 1. 基本データを取得（並列）
    const [
      analyticsSnapshot,
      postsSnapshot,
      plansSnapshot,
      userDoc,
      prevAnalyticsSnapshot,
      currentMonthSnapshot,
      feedbackSnapshot,
      snapshotsSnapshot,
    ] = await Promise.all([
      // 当月のanalyticsデータ
      adminDb
        .collection("analytics")
        .where("userId", "==", uid)
        .where("publishedAt", ">=", startTimestamp)
        .where("publishedAt", "<=", endTimestamp)
        .get(),
      // 当月の投稿データ
      adminDb
        .collection("posts")
        .where("userId", "==", uid)
        .where("createdAt", ">=", startTimestamp)
        .where("createdAt", "<=", endTimestamp)
        .get(),
      // アクティブなプラン
      adminDb
        .collection("plans")
        .where("userId", "==", uid)
        .where("status", "==", "active")
        .get(),
      // ユーザー情報
      adminDb.collection("users").doc(uid).get(),
      // 前月のanalyticsデータ（リスク検知用）
      adminDb
        .collection("analytics")
        .where("userId", "==", uid)
        .where("publishedAt", ">=", prevStartTimestamp)
        .where("publishedAt", "<=", prevEndTimestamp)
        .get(),
      // 当月のfollower_counts
      adminDb
        .collection("follower_counts")
        .where("userId", "==", uid)
        .where("snsType", "==", "instagram")
        .where("month", "==", date)
        .limit(1)
        .get(),
      // フィードバックデータ
      adminDb
        .collection("ai_post_feedback")
        .where("userId", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(500)
        .get(),
      // スナップショット参照
      adminDb
        .collection("postPerformanceSnapshots")
        .where("userId", "==", uid)
        .where("createdAt", ">=", startTimestamp)
        .where("createdAt", "<=", endTimestamp)
        .get(),
    ]);

    // 投稿と分析データをpostIdで紐付け（重複除去）
    const analyticsByPostId = new Map<string, admin.firestore.DocumentData>();
    const postIdsInPeriod = new Set(postsSnapshot.docs.map((doc) => doc.id));

    let totalFollowerIncreaseInAnalytics = 0; // デバッグ用
    analyticsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const postId = data.postId;
      if (postId && postIdsInPeriod.has(postId)) {
        // publishedAtの型変換（Timestamp型とDate型の両方に対応）
        let publishedAt: Date;
        if (data.publishedAt) {
          if (data.publishedAt instanceof admin.firestore.Timestamp) {
            publishedAt = data.publishedAt.toDate();
          } else if (data.publishedAt instanceof Date) {
            publishedAt = data.publishedAt;
          } else if (data.publishedAt.toDate && typeof data.publishedAt.toDate === "function") {
            // Firestore Timestamp型（クライアント側から来た場合）
            publishedAt = data.publishedAt.toDate();
          } else {
            // 文字列やその他の形式の場合
            publishedAt = new Date(data.publishedAt);
          }
        } else {
          publishedAt = new Date();
        }

        // デバッグ: followerIncreaseの値を集計
        const followerIncrease = Number(data.followerIncrease) || 0;
        if (followerIncrease > 0) {
          totalFollowerIncreaseInAnalytics += followerIncrease;
        }

        const existing = analyticsByPostId.get(postId);
        if (!existing || publishedAt > existing.publishedAt) {
          analyticsByPostId.set(postId, {
            ...data,
            publishedAt,
          });
        }
      }
    });

    // デバッグログ
    console.log("[Report Complete] フォロワー数デバッグ:", {
      analyticsSnapshotSize: analyticsSnapshot.docs.length,
      postIdsInPeriodSize: postIdsInPeriod.size,
      analyticsByPostIdSize: analyticsByPostId.size,
      totalFollowerIncreaseInAnalytics,
      currentMonth: date,
    });

    // 期間内の投稿に対応する分析データを抽出
    const validAnalyticsData: AnalyticsData[] = Array.from(analyticsByPostId.values()).map((data) => ({
      likes: data.likes || 0,
      comments: data.comments || 0,
      shares: data.shares || 0,
      reach: data.reach || 0,
      saves: data.saves || 0,
      followerIncrease: data.followerIncrease || 0,
      publishedAt: data.publishedAt,
    }));

    const postCount = postIdsInPeriod.size;
    const analyzedCount = validAnalyticsData.length;
    const hasPlan = plansSnapshot.docs.length > 0;

    // KPIを集計
    const totalLikes = validAnalyticsData.reduce((sum, d) => sum + d.likes, 0);
    const totalReach = validAnalyticsData.reduce((sum, d) => sum + d.reach, 0);
    const totalSaves = validAnalyticsData.reduce((sum, d) => sum + (d.saves || 0), 0);
    const totalComments = validAnalyticsData.reduce((sum, d) => sum + d.comments, 0);
    const followerIncreaseFromPosts = validAnalyticsData.reduce((sum, d) => sum + (d.followerIncrease || 0), 0);

    // デバッグログ
    console.log("[Report Complete] フォロワー数内訳:", {
      validAnalyticsDataCount: validAnalyticsData.length,
      validAnalyticsDataWithFollowerIncrease: validAnalyticsData.filter((d) => (d.followerIncrease || 0) > 0).length,
      followerIncreaseFromPosts,
      followerIncreaseFromOther: 0, // 後で計算される
    });

    // フォロワー増加数の計算
    // follower_counts.followersは「投稿に紐づかない増加数」として保存されている
    let followerIncreaseFromOther = 0;
    if (!currentMonthSnapshot.empty) {
      const currentData = currentMonthSnapshot.docs[0].data();
      // follower_counts.followersは既に「投稿に紐づかない増加数」として保存されているので、そのまま使用
      followerIncreaseFromOther = currentData.followers || 0;
    }

    // 合計増加数 = 投稿からの増加数 + その他からの増加数
    const totalFollowerIncrease = followerIncreaseFromPosts + followerIncreaseFromOther;

    // 2. パフォーマンススコア計算
    const performanceScore = calculatePerformanceScore({
      postCount,
      analyzedCount,
      hasPlan,
      totalLikes,
      totalReach,
      totalSaves,
      totalComments,
      totalFollowerIncrease,
      analyticsData: validAnalyticsData,
    });

    // 3. リスク検知
    const previous = aggregatePreviousMonthAnalytics(
      prevAnalyticsSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>)
    );
    const prevTotalReach = previous.totalReach;
    const prevTotalFollowerIncrease = previous.totalFollowerIncrease;

    const riskAlerts: RuntimeRiskAlert[] = detectRiskAlerts({
      current: {
        analyzedCount,
        totalLikes,
        totalReach,
        totalComments,
        totalFollowerIncrease,
      },
      previous,
    });

    // 4. フィードバック感情分析
    const postsMap = new Map<string, { id: string; title: string; postType: "feed" | "reel" | "story" }>();
    analyticsByPostId.forEach((data, postId) => {
      const rawPostType = data.category || data.postType || "feed";
      const postType: "feed" | "reel" | "story" =
        rawPostType === "reel" || rawPostType === "story" ? rawPostType : "feed";
      postsMap.set(postId, {
        id: postId,
        title: data.title || data.caption?.substring(0, 50) || "タイトルなし",
        postType,
      });
    });

    const snapshotStatusMap = new Map<string, "gold" | "negative" | "normal">();
    snapshotsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const postId = data.postId;
      if (postId) {
        snapshotStatusMap.set(postId, data.status || "normal");
      }
    });

    const entries = feedbackSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.();
        // goalAchievementProspectからsentimentを推測（満足/不満足ボタンが削除されたため）
        let sentiment: "positive" | "negative" | "neutral" = "neutral";
        if (data.goalAchievementProspect) {
          // goalAchievementProspectが存在する場合は、それからsentimentを推測
          if (data.goalAchievementProspect === "high") {
            sentiment = "positive";
          } else if (data.goalAchievementProspect === "low") {
            sentiment = "negative";
          } else {
            sentiment = "neutral";
          }
        } else if (data.sentiment) {
          // 後方互換性のため、既存のsentimentフィールドも使用
          sentiment = data.sentiment as "positive" | "negative" | "neutral";
        }
        return {
          id: doc.id,
          postId: data.postId,
          sentiment,
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

    let feedbackSentiment = null;
    if (entries.length > 0) {
      const counts = {
        positive: 0,
        negative: 0,
        neutral: 0,
      };
      interface CommentEntry {
        postId: string;
        title: string;
        comment: string;
        sentiment: "positive" | "negative" | "neutral";
        createdAt?: string;
        postType?: string;
      }

      interface PostStat {
        postId: string;
        title: string;
        postType?: string;
        total: number;
        positive: number;
        negative: number;
        neutral: number;
        score?: number;
        status?: string;
      }

      let withCommentCount = 0;
      const positiveComments: CommentEntry[] = [];
      const negativeComments: CommentEntry[] = [];
      const postStats = new Map<string, PostStat>();

      entries.forEach((entry) => {
        counts[entry.sentiment] += 1;
        const postMeta = entry.postId ? postsMap.get(entry.postId) : null;
        const baseComment = entry.comment?.trim();

        if (baseComment) {
          withCommentCount += 1;
          const commentPayload: CommentEntry = {
            postId: entry.postId || "",
            title: postMeta?.title || "投稿",
            comment: baseComment,
            sentiment: entry.sentiment,
            createdAt: entry.createdAt?.toISOString(),
            postType: postMeta?.postType,
          };
          if (entry.sentiment === "positive") {
            positiveComments.push(commentPayload);
          } else if (entry.sentiment === "negative") {
            negativeComments.push(commentPayload);
          }
        }

        if (entry.postId) {
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
        }
      });

      const total = counts.positive + counts.negative + counts.neutral;
      if (total > 0) {
        feedbackSentiment = {
          total,
          positive: counts.positive,
          negative: counts.negative,
          neutral: counts.neutral,
          positiveRate: counts.positive / total,
          withCommentCount,
          commentHighlights: {
            positive: positiveComments
              .sort((a, b) => (new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()))
              .slice(0, 3),
            negative: negativeComments
              .sort((a, b) => (new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()))
              .slice(0, 3),
          },
          posts: Array.from(postStats.values())
            .sort((a, b) => {
              const scoreA = a.score ?? 0;
              const scoreB = b.score ?? 0;
              if (scoreB === scoreA) {
                return b.total - a.total;
              }
              return scoreB - scoreA;
            })
            .slice(0, 6),
        };
      }
    }

    // 5. 投稿ディープダイブ（簡易版 - 詳細は後で実装）
    const postDeepDive = Array.from(analyticsByPostId.entries())
      .slice(0, 10)
      .map(([postId, data]) => ({
        id: postId,
        title: data.title || data.caption?.substring(0, 50) || "タイトルなし",
        postType: (data.category || data.postType || "feed") as "feed" | "reel" | "story",
        createdAt: data.publishedAt?.toDate?.() || data.publishedAt || new Date(),
        analyticsSummary: {
          likes: data.likes || 0,
          comments: data.comments || 0,
          saves: data.saves || 0,
          reach: data.reach || 0,
          followerIncrease: data.followerIncrease || 0,
          engagementRate: data.reach > 0 ? ((data.likes || 0) + (data.comments || 0)) / data.reach : 0,
        },
        snapshotReferences: snapshotStatusMap.has(postId)
          ? [
              {
                id: postId,
                status: snapshotStatusMap.get(postId)!,
              },
            ]
          : [],
      }));

    // 6. 方向性警告ログを取得（今月の投稿分析で警告が出た投稿）
    let directionAlignmentWarnings: Array<{
      postId: string;
      directionAlignment: "乖離" | "要注意";
      directionComment: string;
      aiDirectionMainTheme: string | null;
    }> = [];
    
    try {
      const alignmentLogsSnapshot = await adminDb
        .collection("direction_alignment_logs")
        .where("userId", "==", uid)
        .where("month", "==", date)
        .get();
      
      directionAlignmentWarnings = alignmentLogsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          postId: data.postId || "",
          directionAlignment: (data.directionAlignment === "乖離" || data.directionAlignment === "要注意")
            ? data.directionAlignment
            : "要注意",
          directionComment: data.directionComment || "",
          aiDirectionMainTheme: data.aiDirectionMainTheme || null,
        };
      });
    } catch (alignmentError) {
      console.error("方向性警告ログ取得エラー:", alignmentError);
    }

    // 6. AI学習リファレンス
    const aiContextBundle = await buildAIContext(uid, {
      includeUserProfile: true,
      includePlan: true,
      includeSnapshots: true,
      includeMasterContext: true,
      includeActionLogs: false,
      includeAbTests: false,
      snapshotLimit: 10,
    });

    const seenPostIds = new Set<string>();
    const filteredSnapshotRefs = aiContextBundle.snapshotReferences
      .filter((ref) => {
        const postId = ref.postId;
        if (postId) {
          if (seenPostIds.has(postId)) {
            return false;
          }
          seenPostIds.add(postId);
        }
        return true;
      })
      .slice(0, 3);

    const aiLearningReferences = {
      masterContext: aiContextBundle.masterContext || null,
      references: aiContextBundle.references || [],
      snapshotReferences: filteredSnapshotRefs,
    };

    // 7. 投稿サマリー（PostSummaryInsights用）
    const postIds = Array.from(analyticsByPostId.keys());
    const postSummaries = await Promise.all(
      postIds.map(async (postId) => {
        try {
          const docId = `${uid}_${postId}`;
          const summaryDoc = await adminDb.collection("ai_post_summaries").doc(docId).get();
          if (summaryDoc.exists) {
            const summaryData = summaryDoc.data();
            const analytics = analyticsByPostId.get(postId);
            return {
              postId,
              summary: summaryData?.summary || "",
              strengths: Array.isArray(summaryData?.insights) ? summaryData.insights : [],
              improvements: [],
              recommendedActions: Array.isArray(summaryData?.recommendedActions)
                ? summaryData.recommendedActions
                : [],
              reach: analytics?.reach || 0,
            };
          }
        } catch (error) {
          console.error(`AIサマリー取得エラー (postId: ${postId}):`, error);
        }
        return null;
      })
    );

    const validPostSummaries = postSummaries.filter((s) => s !== null);

    // 8. 月次レビューとアクションプラン（完全版AI生成）
    let monthlyReview = null;
    let actionPlans: ParsedActionPlan[] = [];

    const reusableReview = await loadReusableMonthlyReview({
      store: monthlyReviewStore,
      userId: uid,
      month: date,
      forceRegenerate,
    });
    monthlyReview = reusableReview.monthlyReview;
    actionPlans = reusableReview.actionPlans;

    // 月次レビューが生成されていない場合、または再生成フラグがある場合
    // ただし、analyzedCountが10件未満の場合はAI生成をスキップ（トークン費削減）
    if (!monthlyReview || forceRegenerate) {
      // 再生成の場合は既存データをクリア
      if (forceRegenerate) {
        monthlyReview = null;
        actionPlans = [];
        console.log("[Report Complete] 再生成フラグが有効: 既存データを無視して再生成します");
      }
      // 10件未満の場合はAI生成をスキップしてフォールバックメッセージを表示
      if (analyzedCount < 10) {
        const reachChangeText = formatReachChangeText(prevTotalReach, totalReach);
        const fallbackFollowerChangeText = formatFollowerChangeText(
          prevTotalFollowerIncrease,
          totalFollowerIncrease
        );

        // フォロワー数の表示用テキスト（0の場合も必ず表示）
        const followerDisplayValue = totalFollowerIncrease || 0;
        const followerDisplayText = followerDisplayValue !== 0
          ? `${followerDisplayValue > 0 ? "+" : ""}${followerDisplayValue.toLocaleString()}人${fallbackFollowerChangeText}`
          : `0人`;

        console.log("[Report Complete] フォールバックメッセージ生成:", {
          totalFollowerIncrease,
          followerIncreaseFromPosts,
          followerIncreaseFromOther,
          prevTotalFollowerIncrease,
          followerDisplayText,
        });

        monthlyReview = buildInsufficientDataMonthlyReview({
          monthName: getMonthName(date),
          analyzedCount,
          totalReach,
          totalLikes,
          totalSaves,
          totalComments,
          followerDisplayText,
          reachChangeText,
        });
        actionPlans = [];
        
        // フォールバックメッセージもFirestoreに保存（次回以降の表示用）
        try {
          await persistFallbackMonthlyReview({
            store: monthlyReviewStore,
            userId: uid,
            month: date,
            review: monthlyReview,
            hasPlan,
            analyzedCount,
          });
        } catch (saveError) {
          console.error("フォールバックレビュー保存エラー:", saveError);
        }
      } else {
        // 10件以上の場合は通常のAI生成処理を実行
        // 投稿タイプ別の統計を計算
        const postTypeStats: Record<string, { count: number; totalReach: number; labels: string[] }> = {};
        const postReachMap = new Map<string, { reach: number; title: string; type: string }>();

        analyticsByPostId.forEach((analytics, postId) => {
          const postType = analytics.category || analytics.postType || "unknown";
          const postTitle = analytics.title || analytics.caption?.substring(0, 50) || "タイトルなし";
          const reach = analytics.reach || 0;

          if (!postTypeStats[postType]) {
            postTypeStats[postType] = { count: 0, totalReach: 0, labels: [] };
          }
          postTypeStats[postType].count++;
          postTypeStats[postType].totalReach += reach;
          if (postTitle && !postTypeStats[postType].labels.includes(postTitle)) {
            postTypeStats[postType].labels.push(postTitle);
          }

          postReachMap.set(postId, { reach, title: postTitle, type: postType });
        });

        // 投稿タイプのラベルを日本語に変換
        const typeLabelMap: Record<string, string> = {
          feed: "画像投稿",
          reel: "リール",
          story: "ストーリー",
          carousel: "カルーセル",
          video: "動画",
          unknown: "その他",
        };

        // 投稿タイプ別の統計を配列に変換（リーチ数でソート）
        const postTypeArray = Object.entries(postTypeStats)
          .map(([type, stats]) => ({
            type,
            label: typeLabelMap[type] || type,
            count: stats.count,
            totalReach: stats.totalReach,
            percentage: totalReach > 0 ? (stats.totalReach / totalReach) * 100 : 0,
          }))
          .sort((a, b) => b.totalReach - a.totalReach);

        // 最も閲覧された投稿を取得
        let topPost = null;
        if (postReachMap.size > 0) {
          const sortedPosts = Array.from(postReachMap.entries())
            .map(([postId, data]) => ({ postId, ...data }))
            .sort((a, b) => b.reach - a.reach);
          topPost = sortedPosts[0];
        }

        // 投稿ごとのAIサマリーを集計（今月の分析データに存在する全ての投稿を対象）
        const allStrengths: string[] = [];
        const allRecommendedActions: string[] = [];
        const highPerformanceStrengths: string[] = [];

        // 今月の分析データに存在する全ての投稿をリーチ数でソート
        const allAnalyzedPosts = Array.from(analyticsByPostId.entries())
          .map(([postId, analytics]) => ({
            postId,
            reach: analytics.reach || 0,
            summary: validPostSummaries.find((s) => s?.postId === postId) || null,
          }))
          .sort((a, b) => b.reach - a.reach);

        if (allAnalyzedPosts.length > 0) {
          const top30Percent = Math.ceil(allAnalyzedPosts.length * 0.3);

          // サマリーが存在する投稿のみを集計対象とする
          allAnalyzedPosts.forEach((post) => {
            if (post.summary) {
              allStrengths.push(...(post.summary?.strengths || []));
              allRecommendedActions.push(...(post.summary?.recommendedActions || []));

              // 高パフォーマンス投稿の強みを抽出
              const isHighPerformance = allAnalyzedPosts.slice(0, top30Percent).some((p) => p?.postId === post.postId);
              if (isHighPerformance) {
                highPerformanceStrengths.push(...(post.summary?.strengths || []));
              }
            }
          });
        }

        // 頻出する強み・推奨アクションを抽出
        const strengthFrequency = new Map<string, number>();
        allStrengths.forEach((strength) => {
          strengthFrequency.set(strength, (strengthFrequency.get(strength) || 0) + 1);
        });
        const topStrengths = Array.from(strengthFrequency.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([strength]) => strength);

        const actionFrequency = new Map<string, number>();
        allRecommendedActions.forEach((action) => {
          actionFrequency.set(action, (actionFrequency.get(action) || 0) + 1);
        });
        const topActions = Array.from(actionFrequency.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([action]) => action);

        const highPerformanceStrengthFrequency = new Map<string, number>();
        highPerformanceStrengths.forEach((strength) => {
          highPerformanceStrengthFrequency.set(strength, (highPerformanceStrengthFrequency.get(strength) || 0) + 1);
        });
        const topHighPerformanceStrengths = Array.from(highPerformanceStrengthFrequency.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([strength]) => strength);

        // AIサマリー集計結果を文字列化（今月の分析データに存在する全ての投稿数を表示）
        let postSummaryInsights = "";
        if (allAnalyzedPosts.length > 0) {
          const insightsParts: string[] = [];
          insightsParts.push(`投稿ごとのAI分析結果（${allAnalyzedPosts.length}件の投稿から抽出）:`);

          if (topStrengths.length > 0) {
            insightsParts.push(`- 頻出する強み: ${topStrengths.join("、")}`);
          }

          if (topHighPerformanceStrengths.length > 0) {
            insightsParts.push(`- 高パフォーマンス投稿の共通点: ${topHighPerformanceStrengths.join("、")}`);
          }

          if (topActions.length > 0) {
            insightsParts.push(`- 頻出する推奨アクション: ${topActions.join("、")}`);
          }

          postSummaryInsights = insightsParts.join("\n");
        }

        // 前月比を計算
        const prevTotalReach = previous.totalReach;
        const reachChangeText = formatReachChangeText(prevTotalReach, totalReach);

        // 運用計画の情報を取得
        let planInfo = null;
        if (hasPlan) {
          const planDoc = plansSnapshot.docs[0];
          const planData = planDoc.data();
          planInfo = {
            title: planData.title || "運用計画",
            targetFollowers: planData.targetFollowers || 0,
            currentFollowers: planData.currentFollowers || 0,
            strategies: Array.isArray(planData.strategies) ? planData.strategies : [],
            postCategories: Array.isArray(planData.postCategories) ? planData.postCategories : [],
          };
        }

        // 投稿タイプ別の情報を文字列化
        const postTypeInfo = postTypeArray.length > 0
          ? postTypeArray
              .map((stat, index) => {
                const order = index === 0 ? "最も多く" : index === 1 ? "次いで" : "最後に";
                return `${order}${stat.label}が${stat.count}件（全体の${stat.percentage.toFixed(0)}％）`;
              })
              .join("、")
          : "投稿タイプのデータがありません";

        const topPostInfo = topPost
          ? `「${topPost.title}」投稿で、${topPost.reach.toLocaleString()}回閲覧`
          : "データがありません";

        // ユーザーのビジネス情報とAI設定を取得
        let businessInfoText = "";
        let aiSettingsText = "";
        if (userDoc.exists) {
          const userData = userDoc.data();
          const businessInfo = userData?.businessInfo || {};
          const snsAISettings = userData?.snsAISettings?.instagram || {};

          // ビジネス情報を構築
          const businessInfoParts: string[] = [];
          if (businessInfo.industry) {
            businessInfoParts.push(`業種: ${businessInfo.industry}`);
          }
          if (businessInfo.companySize) {
            businessInfoParts.push(`会社規模: ${businessInfo.companySize}`);
          }
          if (businessInfo.businessType) {
            businessInfoParts.push(`事業形態: ${businessInfo.businessType}`);
          }
          if (businessInfo.description) {
            businessInfoParts.push(`事業内容: ${businessInfo.description}`);
          }
          if (businessInfo.catchphrase) {
            businessInfoParts.push(`キャッチコピー: ${businessInfo.catchphrase}`);
          }
          if (Array.isArray(businessInfo.targetMarket) && businessInfo.targetMarket.length > 0) {
            businessInfoParts.push(`ターゲット市場: ${businessInfo.targetMarket.join("、")}`);
          }

          // 商品・サービス情報を強調して表示
          let productsOrServicesText = "";
          if (Array.isArray(businessInfo.productsOrServices) && businessInfo.productsOrServices.length > 0) {
            const productsText = businessInfo.productsOrServices
              .map((p: { name?: string; details?: string }) => {
                if (p.details) {
                  return `${p.name}（${p.details}）`;
                }
                return p.name;
              })
              .filter(Boolean)
              .join("、");
            if (productsText) {
              businessInfoParts.push(`商品・サービス: ${productsText}`);
              productsOrServicesText = businessInfo.productsOrServices
                .map((p: { name?: string; details?: string }) => p.name)
                .filter(Boolean)
                .join("、");
            }
          }

          if (Array.isArray(businessInfo.goals) && businessInfo.goals.length > 0) {
            businessInfoParts.push(`目標: ${businessInfo.goals.join("、")}`);
          }
          if (Array.isArray(businessInfo.challenges) && businessInfo.challenges.length > 0) {
            businessInfoParts.push(`課題: ${businessInfo.challenges.join("、")}`);
          }

          if (businessInfoParts.length > 0) {
            businessInfoText = `\n【ビジネス情報】\n${businessInfoParts.join("\n")}`;
            if (productsOrServicesText) {
              businessInfoText += `\n\n【重要：提案で必ず使用する具体的な商品・サービス名】\n${productsOrServicesText}`;
            }
          }

          // AI設定を構築
          const aiSettingsParts: string[] = [];
          if (snsAISettings.tone) {
            aiSettingsParts.push(`トーン: ${snsAISettings.tone}`);
          }
          if (snsAISettings.manner) {
            aiSettingsParts.push(`マナー・ルール: ${snsAISettings.manner}`);
          }
          if (snsAISettings.goals) {
            aiSettingsParts.push(`Instagram運用の目標: ${snsAISettings.goals}`);
          }
          if (snsAISettings.motivation) {
            aiSettingsParts.push(`運用動機: ${snsAISettings.motivation}`);
          }
          if (snsAISettings.additionalInfo) {
            aiSettingsParts.push(`その他参考情報: ${snsAISettings.additionalInfo}`);
          }

          if (aiSettingsParts.length > 0) {
            aiSettingsText = `\n【Instagram AI設定】\n${aiSettingsParts.join("\n")}`;
          }

          // AI生成（完全版）
          // 10件以上の分析済み投稿がある場合のみAI生成を実行（トークン費削減）
          if (aiClient && analyzedCount >= 10) {
            try {
            const currentMonth = getMonthName(date);
            const nextMonth = getNextMonthName(date);
            const totalShares = validAnalyticsData.reduce((sum, d) => sum + (d.shares || 0), 0);
            const followerChangeText = formatFollowerChangeText(
              prevTotalFollowerIncrease,
              totalFollowerIncrease
            );

            monthlyReview = await generateMonthlyReviewWithAi({
              aiClient,
              nextMonth,
              monthlyReviewPromptInput: {
                currentMonth,
                nextMonth,
                analyzedCount,
                totalLikes,
                totalReach,
                totalComments,
                totalSaves,
                totalShares,
                totalFollowerIncrease,
                reachChangeText,
                followerChangeText,
                hasPlan,
                planTitle: planInfo?.title,
                businessInfoText,
                aiSettingsText,
                postTypeInfo,
                topPostInfo,
                postSummaryInsights,
                directionAlignmentWarnings,
              },
              proposalPromptInput: {
                nextMonth,
                analyzedCount,
                totalLikes,
                totalReach,
                totalComments,
                totalSaves,
                totalFollowerIncrease,
                reachChangeText,
                followerChangeText,
                businessInfoText,
                aiSettingsText,
                postTypeSummary: postTypeInfo,
                directionAlignmentWarnings,
              },
            });

            // 提案セクションを抽出してパース
            const nextMonthName = getNextMonthName(date);
            actionPlans = extractActionPlansFromReview(monthlyReview, nextMonthName);

            // 生成されたレビューをFirestoreに保存し、ai_directionも更新
            if (monthlyReview) {
              try {
                const postsForDirection = postsSnapshot.docs.flatMap((postDoc) => {
                  const analyticsData = analyticsByPostId.get(postDoc.id);
                  if (!analyticsData) {
                    return [];
                  }

                  let publishedTime = "";
                  if (analyticsData.publishedTime) {
                    publishedTime = analyticsData.publishedTime;
                  } else if (analyticsData.publishedAt) {
                    let publishedAt: Date;
                    if (analyticsData.publishedAt instanceof admin.firestore.Timestamp) {
                      publishedAt = analyticsData.publishedAt.toDate();
                    } else if (analyticsData.publishedAt instanceof Date) {
                      publishedAt = analyticsData.publishedAt;
                    } else if (
                      analyticsData.publishedAt.toDate &&
                      typeof analyticsData.publishedAt.toDate === "function"
                    ) {
                      publishedAt = analyticsData.publishedAt.toDate();
                    } else {
                      publishedAt = new Date(analyticsData.publishedAt);
                    }
                    const hours = String(publishedAt.getHours()).padStart(2, "0");
                    const minutes = String(publishedAt.getMinutes()).padStart(2, "0");
                    publishedTime = `${hours}:${minutes}`;
                  }

                  return [
                    {
                      analyticsSummary: {
                        likes: analyticsData.likes || 0,
                        comments: analyticsData.comments || 0,
                        shares: analyticsData.shares || 0,
                        saves: analyticsData.saves || 0,
                        reach: analyticsData.reach || 0,
                        publishedTime,
                      },
                    },
                  ];
                });

                await persistGeneratedMonthlyReview({
                  store: monthlyReviewStore,
                  userId: uid,
                  month: date,
                  review: monthlyReview,
                  actionPlans,
                  hasPlan,
                  analyzedCount,
                  postsForDirection,
                });
                console.log("[Report Complete] 月次レビューを再生成してFirestoreに保存しました");
              } catch (saveError) {
                console.error("レビュー保存エラー:", saveError);
              }
            }
          } catch (aiError) {
            console.error("AI生成エラー:", aiError);
            // AI生成に失敗した場合はフォールバック
            monthlyReview = buildAiErrorFallbackMonthlyReview({
              monthName: getMonthName(date),
              totalReach,
              totalLikes,
              totalSaves,
              totalComments,
              reachChangeText,
            });
            actionPlans = [];
          }
        }
        }
      }
    }
    
    // monthlyReviewがまだ設定されていない場合（データがない場合）のフォールバック
    if (!monthlyReview) {
      monthlyReview = buildNoDataMonthlyReview(getMonthName(date));
      actionPlans = [];
    }

    // レスポンスを構築
    const result = {
      performanceScore,
      riskAlerts,
      feedbackSentiment,
      postDeepDive: {
        posts: postDeepDive,
      },
      aiLearningReferences,
      postSummaries: validPostSummaries,
      monthlyReview: {
        review: monthlyReview,
        actionPlans,
        hasPlan,
        analyzedCount,
      },
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ 月次レポート統合データ取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
