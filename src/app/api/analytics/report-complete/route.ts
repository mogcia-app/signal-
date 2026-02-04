import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { canAccessFeature } from "@/lib/plan-access";
import { buildAIContext } from "@/lib/ai/context";
import OpenAI from "openai";
import * as admin from "firebase-admin";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

// 月の範囲を計算
function getMonthRange(date: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = date.split("-").map(Number);
  const start = new Date(Date.UTC(yearStr, monthStr - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(yearStr, monthStr, 0, 23, 59, 59, 999));
  return { start, end };
}

// 月名を取得
function getMonthName(date: string): string {
  const [yearStr, monthStr] = date.split("-").map(Number);
  const dateObj = new Date(yearStr, monthStr - 1, 1);
  return dateObj.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
}

// 次月名を取得
function getNextMonthName(date: string): string {
  const [yearStr, monthStr] = date.split("-").map(Number);
  const nextMonth = new Date(yearStr, monthStr, 1);
  return nextMonth.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
}

interface AnalyticsData {
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  saves?: number;
  followerIncrease?: number;
  publishedAt: Date | admin.firestore.Timestamp;
}

interface PerformanceScoreResult {
  score: number;
  rating: "S" | "A" | "B" | "C" | "D" | "F";
  label: string;
  color: string;
  breakdown: {
    engagement: number;
    growth: number;
    quality: number;
    consistency: number;
  };
  kpis: {
    totalLikes: number;
    totalReach: number;
    totalSaves: number;
    totalComments: number;
    totalFollowerIncrease: number;
  };
  metrics: {
    postCount: number;
    analyzedCount: number;
    hasPlan: boolean;
  };
}

// パフォーマンス評価スコア計算
function calculatePerformanceScore(params: {
  postCount: number;
  analyzedCount: number;
  hasPlan: boolean;
  totalLikes: number;
  totalReach: number;
  totalSaves: number;
  totalComments: number;
  totalFollowerIncrease: number;
  analyticsData: AnalyticsData[];
}): PerformanceScoreResult {
  const { postCount, analyzedCount, hasPlan, totalLikes, totalReach, totalSaves, totalComments, totalFollowerIncrease, analyticsData } = params;

  if (analyticsData.length === 0) {
    return {
      score: 0,
      rating: "F",
      label: "データ不足",
      color: "red",
      breakdown: {
        engagement: 0,
        growth: 0,
        quality: 0,
        consistency: 0,
      },
      kpis: {
        totalLikes: 0,
        totalReach: 0,
        totalSaves: 0,
        totalComments: 0,
        totalFollowerIncrease: 0,
      },
      metrics: {
        postCount: 0,
        analyzedCount: 0,
        hasPlan: params.hasPlan,
      },
    };
  }

  // エンゲージメントスコア (50%)
  const avgEngagementRate =
    analyticsData.reduce((sum, data) => {
      const likes = data.likes || 0;
      const comments = data.comments || 0;
      const shares = data.shares || 0;
      const reach = data.reach || 1;
      const engagementRate = ((likes + comments + shares) / reach) * 100;
      return sum + engagementRate;
    }, 0) / analyticsData.length;
  const engagementScore = Math.min(50, avgEngagementRate * 10);

  // 成長スコア (25%)
  const growthScore = Math.min(25, totalFollowerIncrease * 0.05);

  // 投稿品質スコア (15%)
  const avgReach = analyticsData.reduce((sum, data) => sum + data.reach, 0) / analyticsData.length;
  const qualityScore = Math.min(15, avgReach / 2000);

  // 一貫性スコア (10%)
  const postsPerWeek = postCount / 4; // 月4週として計算
  const consistencyScore = Math.min(10, postsPerWeek * 3.33);

  // スコア内訳を先に計算（丸めた値）
  const breakdown = {
    engagement: Math.round(engagementScore),
    growth: Math.round(growthScore),
    quality: Math.round(qualityScore),
    consistency: Math.round(consistencyScore),
  };

  // スコア内訳の合計を総スコアとする（一致を保証）
  const totalScore = breakdown.engagement + breakdown.growth + breakdown.quality + breakdown.consistency;

  // ランク評価
  let rating: "S" | "A" | "B" | "C" | "D" | "F";
  let label: string;
  let color: string;

  if (totalScore >= 85) {
    rating = "S";
    label = "業界トップ0.1%";
    color = "purple";
  } else if (totalScore >= 70) {
    rating = "A";
    label = "優秀なクリエイター";
    color = "blue";
  } else if (totalScore >= 55) {
    rating = "B";
    label = "良好";
    color = "green";
  } else if (totalScore >= 40) {
    rating = "C";
    label = "平均";
    color = "yellow";
  } else if (totalScore >= 25) {
    rating = "D";
    label = "改善必要";
    color = "orange";
  } else {
    rating = "F";
    label = "大幅改善必要";
    color = "red";
  }

  return {
    score: totalScore,
    rating,
    label,
    color,
    breakdown,
    kpis: {
      totalLikes,
      totalReach,
      totalSaves,
      totalComments,
      totalFollowerIncrease,
    },
    metrics: {
      postCount,
      analyzedCount,
      hasPlan,
    },
  };
}

interface ActionPlan {
  title: string;
  description: string;
  action: string;
}

// レビューテキストから提案セクションを抽出してパース
function extractActionPlansFromReview(reviewText: string, nextMonth: string): ActionPlan[] {
  const actionPlans: ActionPlan[] = [];
  
  if (!reviewText || !nextMonth) {
    return actionPlans;
  }
  
  // 「📈 ${nextMonth}に向けた提案」セクションを探す
  const escapedMonth = nextMonth.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`📈\\s*${escapedMonth}に向けた提案[\\s\\S]*?(?=⸻|$)`, "i"),
    /📈\s*[^\n]*向けた提案[\s\S]*?(?=⸻|$)/i,
    /📈[\s\S]*?提案[\s\S]*?(?=⸻|$)/i,
  ];
  
  let proposalText = "";
  for (const pattern of patterns) {
    const match = reviewText.match(pattern);
    if (match) {
      proposalText = match[0];
      break;
    }
  }
  
  if (!proposalText) {
    return actionPlans;
  }
  
  // 各提案を抽出（「1.」「2.」「3.」で始まる行）
  const proposalRegex = /(\d+)\.\s*([^\n]+)(?:\n\s*([^\n]+(?:\n\s*[^\n]+)*?))?(?=\n\s*\d+\.|$)/g;
  let proposalMatch;
  
  while ((proposalMatch = proposalRegex.exec(proposalText)) !== null) {
    const title = proposalMatch[2]?.trim() || "";
    const descriptionAndAction = (proposalMatch[3] || "").trim();
    
    if (!title) {
      continue;
    }
    
    // 「→」で区切って説明とアクションを分離
    const lines = descriptionAndAction.split(/\n/).map(line => line.trim()).filter(line => line);
    let description = "";
    let action = "";
    
    for (const line of lines) {
      if (line.match(/^[→→]\s*/)) {
        action = line.replace(/^[→→]\s*/, "").trim();
      } else {
        description += (description ? " " : "") + line;
      }
    }
    
    actionPlans.push({
      title,
      description: description.trim(),
      action: action.trim(),
    });
  }
  
  return actionPlans;
}

interface RiskAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  metric: string;
  message: string;
  change?: number;
  value?: number;
}

/**
 * 月次レポートページ用の統合BFF API
 * すべてのコンポーネントが使用するデータを1回のリクエストで取得
 */
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
      prevMonthSnapshot,
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
      // 前月のfollower_counts
      adminDb
        .collection("follower_counts")
        .where("userId", "==", uid)
        .where("snsType", "==", "instagram")
        .where("month", "==", prevMonthStr)
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

    analyticsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const postId = data.postId;
      if (postId && postIdsInPeriod.has(postId)) {
        const publishedAt = data.publishedAt?.toDate?.() || data.publishedAt || new Date();
        const existing = analyticsByPostId.get(postId);
        if (!existing || publishedAt > existing.publishedAt) {
          analyticsByPostId.set(postId, {
            ...data,
            publishedAt,
          });
        }
      }
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

    // フォロワー増加数の計算
    let followerIncreaseFromOther = 0;
    let currentFollowersFromHome = 0;
    if (!currentMonthSnapshot.empty) {
      const currentData = currentMonthSnapshot.docs[0].data();
      currentFollowersFromHome = currentData.followers || 0;
    }

    let previousFollowersFromHome = 0;
    if (!prevMonthSnapshot.empty) {
      const prevData = prevMonthSnapshot.docs[0].data();
      previousFollowersFromHome = prevData.followers || 0;
    }

    const isFirstMonth = prevMonthSnapshot.empty;
    let initialFollowers = 0;
    if (userDoc.exists) {
      const userData = userDoc.data();
      initialFollowers = userData?.businessInfo?.initialFollowers || 0;
    }

    if (isFirstMonth) {
      // 初月の場合、follower_counts.followersは「現在のフォロワー数」を保存している
      // そのため、その他からの増加数 = 現在のフォロワー数 - initialFollowers
      // ただし、currentFollowersFromHomeが0の場合は、何も入力されていないので増加数は0
      if (currentFollowersFromHome > 0 && currentFollowersFromHome > initialFollowers) {
        followerIncreaseFromOther = currentFollowersFromHome - initialFollowers;
      } else {
        followerIncreaseFromOther = 0;
      }
    } else {
      followerIncreaseFromOther = currentFollowersFromHome - previousFollowersFromHome;
    }

    let totalFollowerIncrease: number;
    if (isFirstMonth && initialFollowers > 0) {
      // 初月の場合、totalFollowerIncrease = 投稿からの増加数 + その他からの増加数
      // ただし、その他からの増加数は既に「現在のフォロワー数 - initialFollowers」として計算済み
      // そのため、totalFollowerIncrease = 投稿からの増加数 + (現在のフォロワー数 - initialFollowers)
      // これは「増加数」として正しい
      // ただし、何も増加がない場合（投稿からの増加数 = 0、その他からの増加数 = 0）は、0を表示する
      totalFollowerIncrease = followerIncreaseFromPosts + followerIncreaseFromOther;
    } else {
      totalFollowerIncrease = followerIncreaseFromPosts + followerIncreaseFromOther;
    }

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
    const prevAnalyticsByPostId = new Map<string, admin.firestore.DocumentData>();
    prevAnalyticsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const postId = data.postId;
      if (postId) {
        const existing = prevAnalyticsByPostId.get(postId);
        if (!existing || (data.publishedAt && existing.publishedAt && data.publishedAt > existing.publishedAt)) {
          prevAnalyticsByPostId.set(postId, data);
        }
      }
    });

    const prevAnalyzedCount = prevAnalyticsByPostId.size;
    let prevTotalLikes = 0;
    let prevTotalReach = 0;
    let prevTotalComments = 0;
    let prevTotalFollowerIncrease = 0;
    // prevTotalSaves removed (unused)

    prevAnalyticsByPostId.forEach((data) => {
      prevTotalLikes += data.likes || 0;
      prevTotalReach += data.reach || 0;
      prevTotalComments += data.comments || 0;
      prevTotalFollowerIncrease += data.followerIncrease || 0;
    });

    const riskAlerts: RiskAlert[] = [];

    // フォロワー数の急激な減少
    if (prevTotalFollowerIncrease > 0 && totalFollowerIncrease < 0) {
      const decreaseRate = (Math.abs(totalFollowerIncrease) / prevTotalFollowerIncrease) * 100;
      if (decreaseRate >= 10) {
        riskAlerts.push({
          id: "follower-decrease",
          severity: decreaseRate >= 30 ? "critical" : "warning",
          metric: "フォロワー数",
          message: `フォロワー数が前月比で${decreaseRate.toFixed(1)}％減少しています。コンテンツの質や投稿頻度を見直す必要があります。`,
          change: -decreaseRate,
        });
      }
    }

    // リーチ数の急激な減少
    if (prevTotalReach > 0 && totalReach > 0) {
      const reachChange = ((totalReach - prevTotalReach) / prevTotalReach) * 100;
      if (reachChange <= -30) {
        riskAlerts.push({
          id: "reach-decrease",
          severity: reachChange <= -50 ? "critical" : "warning",
          metric: "リーチ数",
          message: `リーチ数が前月比で${Math.abs(reachChange).toFixed(1)}％減少しています。投稿タイミングやハッシュタグの見直しを検討してください。`,
          change: reachChange,
        });
      }
    }

    // エンゲージメント率の急激な低下
    if (prevTotalReach > 0 && totalReach > 0) {
      const prevEngagementRate = ((prevTotalLikes + prevTotalComments) / prevTotalReach) * 100;
      const currentEngagementRate = ((totalLikes + totalComments) / totalReach) * 100;
      const engagementChange = currentEngagementRate - prevEngagementRate;
      
      if (engagementChange <= -2 && prevEngagementRate > 0) {
        riskAlerts.push({
          id: "engagement-decrease",
          severity: engagementChange <= -5 ? "critical" : "warning",
          metric: "エンゲージメント率",
          message: `エンゲージメント率が前月比で${Math.abs(engagementChange).toFixed(1)}ポイント低下しています。コンテンツの質やフォロワーとの関係性を見直す必要があります。`,
          change: engagementChange,
        });
      }
    }

    // 投稿頻度の急激な減少
    if (prevAnalyzedCount > 0 && analyzedCount > 0) {
      const postCountChange = ((analyzedCount - prevAnalyzedCount) / prevAnalyzedCount) * 100;
      if (postCountChange <= -50) {
        riskAlerts.push({
          id: "post-frequency-decrease",
          severity: "warning",
          metric: "投稿頻度",
          message: `投稿数が前月比で${Math.abs(postCountChange).toFixed(1)}％減少しています。安定した投稿頻度を維持することが重要です。`,
          change: postCountChange,
        });
      }
    }

    // 投稿がない場合
    if (analyzedCount === 0 && prevAnalyzedCount > 0) {
      riskAlerts.push({
        id: "no-posts",
        severity: "critical",
        metric: "投稿数",
        message: "今月は投稿がありません。継続的な投稿がアカウント成長の鍵です。",
        value: 0,
      });
    }

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
        return {
          id: doc.id,
          postId: data.postId,
          sentiment: (data.sentiment as "positive" | "negative" | "neutral") || "neutral",
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
      postIds.slice(0, 20).map(async (postId) => {
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
    let actionPlans: ActionPlan[] = [];

    const savedReviewDoc = await adminDb
      .collection("monthly_reviews")
      .doc(`${uid}_${date}`)
      .get();

    if (savedReviewDoc.exists && !forceRegenerate) {
      const savedData = savedReviewDoc.data();
      monthlyReview = savedData?.review || "";
      actionPlans = savedData?.actionPlans || [];
    }

    // 月次レビューが生成されていない場合、または再生成フラグがある場合
    // ただし、analyzedCountが10件未満の場合はAI生成をスキップ（トークン費削減）
    if (!monthlyReview || forceRegenerate) {
      // 10件未満の場合はAI生成をスキップしてフォールバックメッセージを表示
      if (analyzedCount < 10) {
        // 前月比を計算（フォールバックメッセージ用）
        let prevTotalReach = 0;
        prevAnalyticsByPostId.forEach((data) => {
          prevTotalReach += data.reach || 0;
        });
        const reachChange = prevTotalReach > 0 ? ((totalReach - prevTotalReach) / prevTotalReach) * 100 : 0;
        const reachChangeText = prevTotalReach > 0
          ? `（前月比${reachChange >= 0 ? "+" : ""}${reachChange.toFixed(1)}％）`
          : "";

        monthlyReview = `📊 Instagram運用レポート（${getMonthName(date)}総括）

⸻

📈 月次トータル数字
	•	閲覧数：${totalReach.toLocaleString()}人${reachChangeText}
	•	いいね数：${totalLikes.toLocaleString()}
	•	保存数：${totalSaves.toLocaleString()}
	•	コメント数：${totalComments.toLocaleString()}

⸻

💡 総評

${getMonthName(date)}は分析済み投稿が${analyzedCount}件と、まだデータが少ない状態です。より精度の高い分析とAIによる振り返り・アクションプラン生成のためには、最低10件以上の分析済み投稿が必要です。

引き続き投稿を分析してデータを蓄積していきましょう。`;
        actionPlans = [];
        
        // フォールバックメッセージもFirestoreに保存（次回以降の表示用）
        try {
          const reviewDocRef = adminDb
            .collection("monthly_reviews")
            .doc(`${uid}_${date}`);

          await reviewDocRef.set(
            {
              userId: uid,
              month: date,
              review: monthlyReview,
              actionPlans: [],
              hasPlan,
              analyzedCount,
              isFallback: true, // フォールバックメッセージであることを示すフラグ
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
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

        // 投稿ごとのAIサマリーを集計
        const allStrengths: string[] = [];
        const allRecommendedActions: string[] = [];
        const highPerformanceStrengths: string[] = [];

        if (validPostSummaries.length > 0) {
          // リーチ数でソートして、上位・下位を判定
          const sortedByReach = [...validPostSummaries].sort((a, b) => b.reach - a.reach);
          const top30Percent = Math.ceil(sortedByReach.length * 0.3);

          validPostSummaries.forEach((summary) => {
            allStrengths.push(...(summary?.strengths || []));
            allRecommendedActions.push(...(summary?.recommendedActions || []));

            // 高パフォーマンス投稿の強みを抽出
            const isHighPerformance = sortedByReach.slice(0, top30Percent).some((p) => p?.postId === summary?.postId);
            if (isHighPerformance) {
              highPerformanceStrengths.push(...(summary?.strengths || []));
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

        // AIサマリー集計結果を文字列化
        let postSummaryInsights = "";
        if (validPostSummaries.length > 0) {
          const insightsParts: string[] = [];
          insightsParts.push(`投稿ごとのAI分析結果（${validPostSummaries.length}件の投稿から抽出）:`);

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
        let prevTotalReach = 0;
        prevAnalyticsByPostId.forEach((data) => {
          prevTotalReach += data.reach || 0;
        });

        const reachChange = prevTotalReach > 0 ? ((totalReach - prevTotalReach) / prevTotalReach) * 100 : 0;
        const reachChangeText = prevTotalReach > 0
          ? `（前月比${reachChange >= 0 ? "+" : ""}${reachChange.toFixed(1)}％）`
          : "";

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
          if (openai && analyzedCount >= 10) {
            try {
            const currentMonth = getMonthName(date);
            const nextMonth = getNextMonthName(date);
            const totalShares = validAnalyticsData.reduce((sum, d) => sum + (d.shares || 0), 0);

            const prompt = `以下のInstagram運用データを基に、${currentMonth}の振り返りを自然な日本語で出力してください。

【データ】
- 分析済み投稿数: ${analyzedCount}件
- いいね数: ${totalLikes.toLocaleString()}
- リーチ数: ${totalReach.toLocaleString()}${reachChangeText}
- コメント数: ${totalComments.toLocaleString()}
- 保存数: ${totalSaves.toLocaleString()}
- シェア数: ${totalShares.toLocaleString()}
${hasPlan ? `- 運用計画: ${planInfo?.title || "あり"}` : "- 運用計画: 未設定"}
${businessInfoText}
${aiSettingsText}

【投稿タイプ別の統計】
${postTypeInfo}

【最も閲覧された投稿】
${topPostInfo}

${postSummaryInsights ? `\n【投稿ごとのAI分析結果の集計】\n${postSummaryInsights}` : ""}

【出力形式】
必ず以下のセクションを全て含めてください。最後の「📈 ${nextMonth}に向けた提案」セクションは必須です。
${postSummaryInsights ? "「📋 今月の投稿別強み・改善・施策まとめ」セクションも含めてください。" : ""}

📊 Instagram運用レポート（${currentMonth}総括）

⸻

📈 月次トータル数字
	•	閲覧数：${totalReach.toLocaleString()}人${reachChangeText}
	•	いいね数：${totalLikes.toLocaleString()}
	•	保存数：${totalSaves.toLocaleString()}
	•	コメント数：${totalComments.toLocaleString()}

⸻

🔹 アカウント全体の動き

{全体的な評価コメント（2-3文）。以下の点を含めてください：
- 上記の「📈 月次トータル数字」セクションで既に数値を表示しているので、ここでは数値を繰り返し羅列せず、その数値の意味や評価を自然な文章で説明してください
- 前月比がある場合は、その変化率と評価（増加している場合は「前月比で○％増加しています」など）
- 数値だけを羅列するのではなく、読み手が理解しやすい自然な文章で説明してください
- 「これは、ブランドの認知度を高めるために重要な要素であり」のような硬い表現は避け、もっと自然な表現にしてください
- 「リーチ数やいいね数が順調に伸びており、エンゲージメントも良好です」のような自然な表現を心がけてください
}

⸻

🔹 コンテンツ別の傾向
	•	${postTypeInfo}。
	•	もっとも閲覧されたコンテンツは${topPostInfo}。

{傾向の説明（1-2文）。以下の点を含めてください：
- どの投稿タイプが最も効果的だったか、その理由を自然な文章で説明
- 投稿タイプ別のバランスや改善の余地
- 自然な文章で、数値だけを羅列しないでください
- 最も閲覧された投稿の詳細は上記の箇条書きで既に記載しているので、ここでは重複せず、投稿タイプ全体の傾向に焦点を当ててください
- 「視覚的なコンテンツが受け入れられていることがわかりますが」のような硬い表現は避け、もっと自然な表現にしてください
- 「画像投稿が全体の79％を占めていることから、視覚的なアプローチが効果的であることが証明されました」のような自然な表現を心がけてください
}

⸻

${postSummaryInsights ? `📋 今月の投稿別強み・改善・施策まとめ

{投稿ごとのAI分析結果を基に、以下の3つの観点でまとめてください：

1. **今月の強み**
   - 頻出する強みや高パフォーマンス投稿の共通点を2-3個挙げてください
   - 「【投稿ごとのAI分析結果の集計】」セクションの「頻出する強み」と「高パフォーマンス投稿の共通点」を参考にしてください
   - 具体的で実践的な内容にしてください

2. **改善が必要な点**
   - 低パフォーマンス投稿の傾向や改善が必要な点を2-3個挙げてください
   - 数値だけを羅列せず、自然な文章で説明してください

3. **今月の施策まとめ**
   - 頻出する推奨アクションを2-3個挙げてください
   - 「【投稿ごとのAI分析結果の集計】」セクションの「頻出する推奨アクション」を参考にしてください
   - 実際に取り組んだ施策や効果的だった施策をまとめてください

注意：
- 箇条書きで簡潔にまとめてください
- 各項目は1-2文で説明してください
- 「【投稿ごとのAI分析結果の集計】」セクションの情報を必ず活用してください
- 自然な日本語で、読みやすい文章にしてください
}` : ""}

⸻

💡 総評

${currentMonth}の運用を振り返ると、{評価（好調/順調/改善の余地ありなど）}でした。
特に{強調ポイント（具体的な数値や投稿タイプなど）}が目立つ結果となりました。
また、{具体的な傾向（投稿タイプ別の特徴や、エンゲージメントの特徴など）}が高い反応を得ており、
アカウントの方向性がしっかり定まりつつあります。

{注意：
- 上記のテンプレートをそのまま出力せず、データに基づいて自然な文章で総評を書いてください
- 数値や具体的な事実を含めながら、読みやすい文章にしてください
- 「コンテンツ別の傾向」セクションで既に言及した投稿名や詳細は重複させないでください
- 総評では、全体の評価や今後の展望に焦点を当ててください
- 「2025年11月は全体的に好調で、リーチ数やいいね数の増加が見られたことが特に嬉しい結果でした」のような自然な表現を心がけてください
- 「これは、ブランドの認知度を高めるために重要な要素であり」のような硬い表現は避けてください
}

⸻

📈 ${nextMonth}に向けた提案
	1.	{提案1のタイトル}
　{提案1の説明。データに基づいた具体的な理由を記載してください。}

	2.	{提案2のタイトル}
　{提案2の説明。データに基づいた具体的な理由を記載してください。}

	3.	{提案3のタイトル}
　{提案3の説明。データに基づいた具体的な理由を記載してください。}

{注意：
- 各セクションで既に言及した内容（投稿名、投稿タイプの詳細など）は重複させないでください
- 提案は、これまでの分析を踏まえた具体的なアクションプランにしてください
- 同じ投稿名や数値を繰り返し言及しないでください
- 「来月はこうしようね」という親しみやすいトーンで書いてください
- **この「📈 ${nextMonth}に向けた提案」セクションは必須です。必ず含めてください。**
- **最重要：提案は必ず「ビジネス情報」と「Instagram AI設定」を参照してください。業種、商品・サービス、ターゲット市場、目標、課題、キャッチコピーなどの具体的な情報を活用して、そのビジネスに特化した提案をしてください。**
- **「重要：提案で必ず使用する具体的な商品・サービス名」セクションに記載されている商品・サービス名を必ず使用してください。これらの具体的なサービス名を提案に含めることで、より実践的で効果的な提案になります。**
- **業種に応じた適切な提案をしてください：**
  - 介護・福祉・老人ホーム業種の場合：プレゼント企画やセミナー告知ではなく、利用者の日常の様子、家族向けの情報、サービスの紹介（「デイサービス」「お試し入居」「ショートステイ」など、上記の具体的なサービス名を使用）、スタッフの様子、施設の雰囲気、食事の様子、レクリエーション活動など、利用者や家族に寄り添ったコンテンツを提案してください
  - 美容・理容業種の場合：上記の具体的なサービス名（「カット」「カラー」「パーマ」など）を使用してください
  - 飲食業種の場合：上記の具体的なメニュー名（「ランチセット」「ディナーコース」など）を使用してください
  - その他の業種も同様に、上記の具体的な商品・サービス名を使用して、その業種に適した具体的なコンテンツを提案してください
- **凡庸な例（「役立つ情報や美しい風景」「プレゼント企画」「セミナー告知」など）は避け、必ず上記の具体的な商品・サービス名を使用して提案をしてください。**


【重要】
- データが0の場合は0と記載し、「データ未取得」とは書かないでください
- 実績データに基づいて正確な数値を記載してください
- 投稿タイプ別の統計や最も閲覧された投稿の情報を必ず反映してください
- 前月比がある場合は、その変化を評価コメントに含めてください
- 提案はデータに基づいた具体的な内容にしてください
- 数値だけを羅列するのではなく、自然で読みやすい日本語の文章で説明してください
- テンプレートの{評価}や{強調ポイント}などのプレースホルダーをそのまま出力せず、実際のデータに基づいて具体的な内容を書いてください
- 文章は簡潔で分かりやすく、専門用語を使いすぎないでください
- **重複を避ける：同じ投稿名、同じ数値、同じ情報を複数のセクションで繰り返し言及しないでください。各セクションで異なる視点や情報を提供してください**
- 「コンテンツ別の傾向」で最も閲覧された投稿を紹介したら、「総評」では別の視点（全体の評価、今後の展望など）に焦点を当ててください
- **重要：必ず「${nextMonth}に向けた提案」セクションを含めてください。このセクションは必須です。**
- **最重要：提案セクションでは、必ず「ビジネス情報」と「Instagram AI設定」を参照してください。業種、商品・サービス、ターゲット市場、目標、課題、キャッチコピーなどの具体的な情報を活用し、そのビジネスに特化した提案をしてください。凡庸な例（「役立つ情報や美しい風景」など）ではなく、そのビジネスの具体的な商品・サービス名や業種に基づいた提案をしてください。例えば、美容・健康業種なら「カット」「カラー」などの具体的なサービス名を、飲食業種なら「ランチセット」「ディナーコース」などの具体的なメニュー名を使用してください。**
- **最重要：提案セクションでは、必ず「ビジネス情報」と「Instagram AI設定」を参照してください。業種、商品・サービス、ターゲット市場、目標、課題、キャッチコピーなどの具体的な情報を活用し、そのビジネスに特化した提案をしてください。**
- **「重要：提案で必ず使用する具体的な商品・サービス名」セクションに記載されている商品・サービス名を必ず使用してください。これらの具体的なサービス名を提案に含めることで、より実践的で効果的な提案になります。**
- **業種に応じた適切な提案をしてください：**
  - 介護・福祉・老人ホーム業種の場合：プレゼント企画やセミナー告知ではなく、利用者の日常の様子、家族向けの情報、サービスの紹介（上記の具体的なサービス名を使用）、スタッフの様子、施設の雰囲気、食事の様子、レクリエーション活動など、利用者や家族に寄り添ったコンテンツを提案してください
  - 美容・理容業種の場合：上記の具体的なサービス名を使用してください
  - 飲食業種の場合：上記の具体的なメニュー名を使用してください
  - その他の業種も同様に、上記の具体的な商品・サービス名を使用して、その業種に適した具体的なコンテンツを提案してください
- **凡庸な例（「役立つ情報や美しい風景」「プレゼント企画」「セミナー告知」など）は避け、必ず上記の具体的な商品・サービス名を使用して提案をしてください。**`;

            const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "あなたはInstagram運用の専門家です。データに基づいて自然で読みやすい日本語で振り返りを提供します。数値だけを羅列するのではなく、具体的な数値とその意味を自然な文章で説明してください。テンプレートのプレースホルダー（{評価}など）をそのまま出力せず、実際のデータに基づいて具体的な内容を書いてください。必ず「📈 ${nextMonth}に向けた提案」セクションを含めてください。このセクションは必須です。提案は必ず「ビジネス情報」と「Instagram AI設定」を参照し、そのビジネスに特化した提案をしてください。**最重要：「重要：提案で必ず使用する具体的な商品・サービス名」セクションに記載されている商品・サービス名を必ず使用してください。これらの具体的なサービス名を提案に含めることで、より実践的で効果的な提案になります。業種に応じた適切な提案をしてください。介護・福祉・老人ホーム業種の場合は、プレゼント企画やセミナー告知ではなく、利用者の日常の様子、家族向けの情報、サービスの紹介（上記の具体的なサービス名を使用）、スタッフの様子、施設の雰囲気、食事の様子、レクリエーション活動など、利用者や家族に寄り添ったコンテンツを提案してください。凡庸な例（「役立つ情報や美しい風景」「プレゼント企画」「セミナー告知」など）は避け、必ず上記の具体的な商品・サービス名を使用して提案をしてください。**「これは、ブランドの認知度を高めるために重要な要素であり」のような硬い表現は避け、もっと自然で読みやすい文章を心がけてください。",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 2000,
            });

            monthlyReview = completion.choices[0]?.message?.content || "";

            // 提案セクションが含まれていない場合、別途生成
            if (!monthlyReview.includes("📈") && !monthlyReview.includes("提案")) {
              try {
                const proposalPrompt = `以下のInstagram運用データを基に、${nextMonth}に向けた具体的なアクションプランを3つ生成してください。

【データ】
- 分析済み投稿数: ${analyzedCount}件
- いいね数: ${totalLikes.toLocaleString()}
- リーチ数: ${totalReach.toLocaleString()}${prevTotalReach > 0 ? `（前月比${reachChange >= 0 ? "+" : ""}${reachChange.toFixed(1)}％）` : ""}
- コメント数: ${totalComments.toLocaleString()}
- 保存数: ${totalSaves.toLocaleString()}
${businessInfoText}
${aiSettingsText}

【投稿タイプ別の統計】
${postTypeArray.length > 0
  ? postTypeArray
      .map((stat) => `${stat.label}: ${stat.count}件（${stat.percentage.toFixed(0)}％）`)
      .join("、")
  : "データがありません"}

【出力形式】
📈 ${nextMonth}に向けた提案
	1.	{提案1のタイトル}
　{提案1の説明。データに基づいた具体的な理由を記載してください。}

	2.	{提案2のタイトル}
　{提案2の説明。データに基づいた具体的な理由を記載してください。}

	3.	{提案3のタイトル}
　{提案3の説明。データに基づいた具体的な理由を記載してください。}

【重要】
- 「来月はこうしようね」という親しみやすいトーンで書いてください
- 必ず「ビジネス情報」と「Instagram AI設定」を参照し、そのビジネスに特化した提案をしてください
- **「重要：提案で必ず使用する具体的な商品・サービス名」セクションに記載されている商品・サービス名を必ず使用してください。これらの具体的なサービス名を提案に含めることで、より実践的で効果的な提案になります。**
- **業種に応じた適切な提案をしてください：**
  - 介護・福祉・老人ホーム業種の場合：プレゼント企画やセミナー告知ではなく、利用者の日常の様子、家族向けの情報、サービスの紹介（上記の具体的なサービス名を使用）、スタッフの様子、施設の雰囲気、食事の様子、レクリエーション活動など、利用者や家族に寄り添ったコンテンツを提案してください
  - 美容・理容業種の場合：上記の具体的なサービス名を使用してください
  - 飲食業種の場合：上記の具体的なメニュー名を使用してください
  - その他の業種も同様に、上記の具体的な商品・サービス名を使用して、その業種に適した具体的なコンテンツを提案してください
- **凡庸な例（「役立つ情報や美しい風景」「プレゼント企画」「セミナー告知」など）は避け、必ず上記の具体的な商品・サービス名を使用して提案をしてください**`;

                const proposalCompletion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                  {
                    role: "system",
                    content:
                      "あなたはInstagram運用の専門家です。データに基づいて具体的なアクションプランを提供します。必ず「ビジネス情報」と「Instagram AI設定」を参照し、そのビジネスに特化した提案をしてください。**最重要：「重要：提案で必ず使用する具体的な商品・サービス名」セクションに記載されている商品・サービス名を必ず使用してください。これらの具体的なサービス名を提案に含めることで、より実践的で効果的な提案になります。業種に応じた適切な提案をしてください。介護・福祉・老人ホーム業種の場合は、プレゼント企画やセミナー告知ではなく、利用者の日常の様子、家族向けの情報、サービスの紹介（上記の具体的なサービス名を使用）、スタッフの様子、施設の雰囲気、食事の様子、レクリエーション活動など、利用者や家族に寄り添ったコンテンツを提案してください。凡庸な例（「役立つ情報や美しい風景」「プレゼント企画」「セミナー告知」など）は避け、必ず上記の具体的な商品・サービス名を使用して提案をしてください。**",
                  },
                  {
                    role: "user",
                    content: proposalPrompt,
                  },
                ],
                temperature: 0.7,
                max_tokens: 800,
                });

                const proposalText = proposalCompletion.choices[0]?.message?.content || "";
                if (proposalText) {
                  monthlyReview += "\n\n⸻\n\n" + proposalText;
                }
              } catch (proposalError) {
                console.error("提案セクション生成エラー:", proposalError);
              }
            }

            // 提案セクションを抽出してパース
            const nextMonthName = getNextMonthName(date);
            actionPlans = extractActionPlansFromReview(monthlyReview, nextMonthName);

            // 生成されたレビューをFirestoreに保存
            if (monthlyReview) {
              try {
                const reviewDocRef = adminDb
                  .collection("monthly_reviews")
                  .doc(`${uid}_${date}`);

                await reviewDocRef.set(
                  {
                    userId: uid,
                    month: date,
                    review: monthlyReview,
                    actionPlans,
                    hasPlan,
                    analyzedCount,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  },
                  { merge: true }
                );
              } catch (saveError) {
                console.error("レビュー保存エラー:", saveError);
              }
            }
          } catch (aiError) {
            console.error("AI生成エラー:", aiError);
            // AI生成に失敗した場合はフォールバック
            monthlyReview = `📊 Instagram運用レポート（${getMonthName(date)}総括）

⸻

📈 月次トータル数字
	•	閲覧数：${totalReach.toLocaleString()}人${reachChangeText}
	•	いいね数：${totalLikes.toLocaleString()}
	•	保存数：${totalSaves.toLocaleString()}
	•	コメント数：${totalComments.toLocaleString()}

⸻

💡 総評

${getMonthName(date)}の運用を振り返ると、${totalReach > 0 ? `リーチ数${totalReach.toLocaleString()}人、いいね数${totalLikes.toLocaleString()}件を達成しました。` : "データ蓄積の段階です。"}継続的な投稿と分析により、アカウントの成長を目指しましょう。`;
            actionPlans = [];
          }
        }
        }
      }
    }
    
    // monthlyReviewがまだ設定されていない場合（データがない場合）のフォールバック
    if (!monthlyReview) {
      monthlyReview = `📊 Instagram運用レポート（${getMonthName(date)}総括})

⸻

📈 月次トータル数字
	•	閲覧数：0人
	•	いいね数：0
	•	保存数：0
	•	コメント数：0

⸻

💡 総評

${getMonthName(date)}のデータがまだありません。投稿を開始してデータを蓄積しましょう。`;
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
