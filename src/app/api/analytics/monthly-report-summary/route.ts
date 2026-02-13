import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import { buildAIContext } from "@/lib/ai/context";
import { fetchAbTestSummaries, mapAbTestResultsByPost } from "@/lib/analytics/ab-test-utils";
import type { ABTestResultTag } from "@/types/ab-test";
import type { AIReference } from "@/types/ai";
import type { SnapshotReference as BaseSnapshotReference } from "@/types/ai";

interface AnalyticsData {
  id: string;
  userId: string;
  postId?: string;
  likes: number;
  comments: number;
  shares: number;
  reposts: number;
  reach: number;
  saves: number;
  followerIncrease: number;
  engagementRate: number;
  publishedAt: Date | { toDate: () => Date };
  publishedTime: string;
  createdAt: Date | { toDate: () => Date };
  // 投稿情報
  title?: string;
  content?: string;
  hashtags?: string[] | string; // 配列または文字列の両方に対応
  thumbnail?: string;
  category?: "reel" | "feed" | "story";
  postType?: "reel" | "feed" | "story";
  // フィード専用フィールド
  reachFollowerPercent?: number;
  interactionCount?: number;
  interactionFollowerPercent?: number;
  reachSourceProfile?: number;
  reachSourceFeed?: number;
  reachSourceExplore?: number;
  reachSourceSearch?: number;
  reachSourceOther?: number;
  reachedAccounts?: number;
  profileVisits?: number;
  profileFollows?: number;
  // リール専用フィールド
  reelReachFollowerPercent?: number;
  reelInteractionCount?: number;
  reelInteractionFollowerPercent?: number;
  reelReachSourceProfile?: number;
  reelReachSourceReel?: number;
  reelReachSourceExplore?: number;
  reelReachSourceSearch?: number;
  reelReachSourceOther?: number;
  reelReachedAccounts?: number;
  reelSkipRate?: number;
  reelNormalSkipRate?: number;
  reelPlayTime?: number;
  reelAvgPlayTime?: number;
  // オーディエンス分析
  audience?: {
    gender: {
      male: number;
      female: number;
      other: number;
    };
    age: {
      "13-17": number;
      "18-24": number;
      "25-34": number;
      "35-44": number;
      "45-54": number;
      "55-64": number;
      "65+": number;
    };
  };
  reachSource?: {
    sources: {
      posts: number;
      profile: number;
      explore: number;
      search: number;
      other: number;
    };
    followers: {
      followers: number;
      nonFollowers: number;
    };
  };
}

type SnapshotReference = Omit<BaseSnapshotReference, "score" | "summary"> & {
  score?: number;
  summary?: string;
};

interface PostData {
  id: string;
  title: string;
  content: string;
  hashtags: string[] | string; // 配列または文字列の両方に対応
  postType: "feed" | "reel" | "story";
  scheduledDate?: string;
  scheduledTime?: string;
  status: "draft" | "scheduled" | "published";
  createdAt: Date | { toDate: () => Date };
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  reach?: number;
  engagementRate?: number;
  snapshotReferences?: SnapshotReference[];
  textFeatures?: Record<string, unknown>;
}

type PostWithAnalytics = PostData & {
  analyticsSummary?: {
    likes?: number;
    comments?: number;
    shares?: number;
    reach?: number;
    saves?: number;
    followerIncrease?: number;
    engagementRate?: number;
  } | null;
  audienceSummary?: AnalyticsData["audience"];
  abTestResults?: ABTestResultTag[];
};

interface PatternHighlights {
  gold: SnapshotReference[];
  negative: SnapshotReference[];
}

interface LearningContextPayload {
  references: AIReference[];
  snapshotReferences: SnapshotReference[];
  masterContext?: {
    learningPhase?: string;
    ragHitRate?: number;
    totalInteractions?: number;
    feedbackStats?: {
      total?: number;
      positiveRate?: number;
      averageWeight?: number;
    } | null;
    actionStats?: {
      total?: number;
      adoptionRate?: number;
      averageResultDelta?: number;
    } | null;
    achievements?: Array<{
      id: string;
      title: string;
      description?: string;
      icon?: string;
      status?: string;
      progress?: number;
    }> | null;
  } | null;
}

interface PersonaSegmentSummary {
  segment: string;
  type: "gender" | "age";
  status: "gold" | "negative";
  value: number;
  delta?: number;
  postTitle: string;
  postId: string;
}

interface NextMonthFocusAction {
  id: string;
  title: string;
  focusKPI: string;
  reason: string;
  recommendedAction: string;
  referenceIds?: string[];
}

interface KPIBreakdownSegment {
  label: string;
  value: number;
  delta?: number;
}

interface KPIBreakdownTopPost {
  postId: string;
  title: string;
  value: number;
  postType?: "feed" | "reel" | "story";
  status?: "gold" | "negative" | "normal";
}

interface KPIBreakdown {
  key: "reach" | "saves" | "followers" | "engagement";
  label: string;
  value: number;
  unit?: "count" | "percent";
  changePct?: number;
  segments: KPIBreakdownSegment[];
  topPosts: KPIBreakdownTopPost[];
  insight?: string;
}

interface FeedbackSentimentComment {
  postId: string;
  title: string;
  comment: string;
  sentiment: "positive" | "negative" | "neutral";
  createdAt?: string;
  postType?: "feed" | "reel" | "story";
}

interface FeedbackPostSentiment {
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
  posts?: FeedbackPostSentiment[];
}

interface NextMonthFocusAction {
  id: string;
  title: string;
  focusKPI: string;
  reason: string;
  recommendedAction: string;
  referenceIds?: string[];
}

// 週の開始日と終了日を取得する関数
function getWeekRange(weekString: string): { start: Date; end: Date } {
  try {
    console.log("📅 getWeekRange呼び出し:", weekString);

    if (!weekString || !weekString.includes("-W")) {
      throw new Error(`Invalid week string format: ${weekString}`);
    }

    const [year, week] = weekString.split("-W");

    if (!year || !week || isNaN(parseInt(year)) || isNaN(parseInt(week))) {
      throw new Error(`Invalid year or week: year=${year}, week=${week}`);
    }

    const startOfYear = new Date(parseInt(year), 0, 1);
    const startOfWeek = new Date(
      startOfYear.getTime() + (parseInt(week) - 1) * 7 * 24 * 60 * 60 * 1000
    );
    const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);

    console.log("📅 getWeekRange結果:", { start: startOfWeek, end: endOfWeek });

    return { start: startOfWeek, end: endOfWeek };
  } catch (error) {
    console.error("❌ getWeekRangeエラー:", error);
    console.error("❌ weekString:", weekString);
    throw error;
  }
}

// 前期間のデータを取得
function getPreviousPeriod(period: "weekly" | "monthly", currentDate: string): string {
  try {
    console.log("📅 getPreviousPeriod呼び出し:", { period, currentDate });

    if (period === "monthly") {
      // 月次形式 (2025-10) を完全な日付に変換
      const fullDate = currentDate + "-01";
      console.log("📅 月次日付変換:", { currentDate, fullDate });

      const current = new Date(fullDate);
      if (isNaN(current.getTime())) {
        throw new Error(`Invalid date format: ${fullDate}`);
      }

      current.setMonth(current.getMonth() - 1);
      const result = current.toISOString().slice(0, 7);
      console.log("📅 getPreviousPeriod結果(monthly):", result);
      return result;
    } else {
      const [year, week] = currentDate.split("-W");

      if (!year || !week || isNaN(parseInt(year)) || isNaN(parseInt(week))) {
        throw new Error(`Invalid year or week: year=${year}, week=${week}`);
      }

      const currentWeek = parseInt(week);
      const previousWeek = currentWeek > 1 ? currentWeek - 1 : 52;
      const previousYear = currentWeek > 1 ? year : (parseInt(year) - 1).toString();
      const result = `${previousYear}-W${previousWeek.toString().padStart(2, "0")}`;
      console.log("📅 getPreviousPeriod結果(weekly):", result);
      return result;
    }
  } catch (error) {
    console.error("❌ getPreviousPeriodエラー:", error);
    console.error("❌ パラメータ:", { period, currentDate });
    throw error;
  }
}

// データを期間でフィルタリング
function filterDataByPeriod(
  data: AnalyticsData[],
  period: "weekly" | "monthly",
  date: string
): AnalyticsData[] {
  try {
    console.log("🔍 filterDataByPeriod呼び出し:", { dataLength: data.length, period, date });

    return data.filter((item) => {
      try {
        const itemDate =
          item.publishedAt instanceof Date
            ? item.publishedAt
            : item.publishedAt &&
                typeof item.publishedAt === "object" &&
                "toDate" in item.publishedAt
              ? item.publishedAt.toDate()
              : new Date(item.publishedAt);

        if (isNaN(itemDate.getTime())) {
          console.warn("⚠️ 無効な日付をスキップ:", item.publishedAt);
          return false;
        }

        if (period === "monthly") {
          const itemMonth = itemDate.toISOString().slice(0, 7);
          const matches = itemMonth === date;
          if (matches) {
            console.log("📅 月次マッチ:", { itemMonth, targetDate: date });
          }
          return matches;
        } else if (period === "weekly") {
          const weekRange = getWeekRange(date);
          const matches = itemDate >= weekRange.start && itemDate <= weekRange.end;
          if (matches) {
            console.log("📅 週次マッチ:", { itemDate, weekRange });
          }
          return matches;
        }

        return true;
      } catch (error) {
        console.error("❌ フィルタリングエラー:", error, "item:", item);
        return false;
      }
    });
  } catch (error) {
    console.error("❌ filterDataByPeriod全体エラー:", error);
    return [];
  }
}

// 統計値を計算
function calculateTotals(analytics: AnalyticsData[]) {
  return {
    totalLikes: analytics.reduce((sum, data) => sum + data.likes, 0),
    totalComments: analytics.reduce((sum, data) => sum + data.comments, 0),
    totalShares: analytics.reduce((sum, data) => sum + data.shares, 0),
    totalReposts: analytics.reduce((sum, data) => sum + (data.reposts || 0), 0),
    totalReach: analytics.reduce((sum, data) => sum + data.reach, 0),
    totalSaves: analytics.reduce((sum, data) => sum + (data.saves || 0), 0),
    totalFollowerIncrease: analytics.reduce((sum, data) => sum + (data.followerIncrease || 0), 0),
    avgEngagementRate:
      analytics.length > 0
        ? analytics.reduce((sum, data) => sum + (data.engagementRate || 0), 0) / analytics.length
        : 0,
    totalPosts: 0, // 投稿数は別途計算するため0で初期化
  };
}

// 変化率を計算
function calculateChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

function summarizeSegments(segments: KPIBreakdownSegment[], totalValue: number): string | undefined {
  if (!segments || segments.length === 0 || totalValue <= 0) {
    return undefined;
  }
  const sorted = [...segments].sort((a, b) => b.value - a.value);
  const top = sorted[0];
  if (!top || top.value <= 0) {
    return undefined;
  }
  const share = totalValue > 0 ? (top.value / totalValue) * 100 : 0;
  return `${top.label}が全体の${share.toFixed(0)}%を占めています`;
}

function buildTopPosts(
  posts: PostWithAnalytics[],
  metric: (post: PostWithAnalytics["analyticsSummary"] | null | undefined) => number,
  snapshotStatusMap: Map<string, "gold" | "negative" | "normal">
): KPIBreakdownTopPost[] {
  return posts
    .map((post) => {
      const value = metric(post.analyticsSummary);
      return {
        postId: post.id,
        title: post.title || "無題の投稿",
        value,
        postType: post.postType,
        status: snapshotStatusMap.get(post.id) ?? "normal",
      };
    })
    .filter((entry) => entry.value && entry.value !== 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
}

function buildKpiBreakdowns(params: {
  totals: ReturnType<typeof calculateTotals>;
  previousTotals: ReturnType<typeof calculateTotals>;
  changes: {
    likesChange: number;
    commentsChange: number;
    sharesChange: number;
    repostsChange: number;
    reachChange: number;
    savesChange: number;
    followerChange: number;
    engagementRateChange: number;
    postsChange: number;
  };
  reachSourceAnalysis: ReturnType<typeof calculateReachSourceAnalysis>;
  posts: PostWithAnalytics[];
  snapshotStatusMap: Map<string, "gold" | "negative" | "normal">;
}): KPIBreakdown[] {
  const { totals, previousTotals, changes, reachSourceAnalysis, posts, snapshotStatusMap } = params;
  const typeLabelMap: Record<string, string> = {
    feed: "フィード",
    reel: "リール",
    story: "ストーリーズ",
  };

  const reachSegments: KPIBreakdownSegment[] = [
    { label: "投稿からの流入", value: reachSourceAnalysis?.sources?.posts || 0 },
    { label: "プロフィール閲覧", value: reachSourceAnalysis?.sources?.profile || 0 },
    { label: "発見タブ", value: reachSourceAnalysis?.sources?.explore || 0 },
    { label: "検索結果", value: reachSourceAnalysis?.sources?.search || 0 },
    { label: "その他チャネル", value: reachSourceAnalysis?.sources?.other || 0 },
  ].filter((segment) => segment.value > 0);

  const reachValue = totals.totalReach || 0;
  const reachBreakdown: KPIBreakdown = {
    key: "reach",
    label: "リーチ",
    value: reachValue,
    unit: "count",
    changePct: changes.reachChange ?? 0,
    segments: reachSegments,
    topPosts: buildTopPosts(
      posts,
      (summary) => summary?.reach || 0,
      snapshotStatusMap
    ),
    insight: summarizeSegments(reachSegments, reachValue),
  };

  const savesByType = posts.reduce<Record<string, number>>((acc, post) => {
    const type = post.postType || "feed";
    const saves = post.analyticsSummary?.saves || 0;
    acc[type] = (acc[type] || 0) + saves;
    return acc;
  }, {});

  const savesSegments: KPIBreakdownSegment[] = Object.entries(savesByType)
    .map(([type, value]) => ({
      label: typeLabelMap[type] || type,
      value,
    }))
    .filter((segment) => segment.value > 0)
    .sort((a, b) => b.value - a.value);

  const savesValue = totals.totalSaves || 0;
  const savesBreakdown: KPIBreakdown = {
    key: "saves",
    label: "保存数",
    value: savesValue,
    unit: "count",
    changePct: changes.savesChange ?? 0,
    segments: savesSegments,
    topPosts: buildTopPosts(
      posts,
      (summary) => summary?.saves || 0,
      snapshotStatusMap
    ),
    insight: summarizeSegments(savesSegments, savesValue),
  };

  const followerSegmentsRaw = posts.reduce<Record<string, number>>((acc, post) => {
    const type = post.postType || "feed";
    const gain = post.analyticsSummary?.followerIncrease || 0;
    acc[type] = (acc[type] || 0) + gain;
    return acc;
  }, {});

  const followerSegments: KPIBreakdownSegment[] = Object.entries(followerSegmentsRaw)
    .map(([type, value]) => ({
      label: typeLabelMap[type] || type,
      value,
    }))
    .filter((segment) => segment.value !== 0)
    .sort((a, b) => b.value - a.value);

  const followerValue = totals.totalFollowerIncrease || 0;
  const followerBreakdown: KPIBreakdown = {
    key: "followers",
    label: "フォロワー増減",
    value: followerValue,
    unit: "count",
    changePct: changes.followerChange ?? 0,
    segments: followerSegments,
    topPosts: buildTopPosts(
      posts,
      (summary) => summary?.followerIncrease || 0,
      snapshotStatusMap
    ),
    insight: summarizeSegments(followerSegments, followerValue),
  };

  const engagementValue =
    (totals.totalLikes || 0) +
    (totals.totalComments || 0) +
    (totals.totalShares || 0) +
    (totals.totalSaves || 0);
  const previousEngagementValue =
    (previousTotals.totalLikes || 0) +
    (previousTotals.totalComments || 0) +
    (previousTotals.totalShares || 0) +
    (previousTotals.totalSaves || 0);
  const engagementChange =
    previousEngagementValue === 0
      ? engagementValue > 0
        ? 100
        : 0
      : ((engagementValue - previousEngagementValue) / previousEngagementValue) * 100;

  const engagementSegments: KPIBreakdownSegment[] = [
    { label: "いいね", value: totals.totalLikes || 0 },
    { label: "コメント", value: totals.totalComments || 0 },
    { label: "シェア", value: totals.totalShares || 0 },
    { label: "保存", value: totals.totalSaves || 0 },
  ].filter((segment) => segment.value > 0);

  const engagementBreakdown: KPIBreakdown = {
    key: "engagement",
    label: "エンゲージメント（総和）",
    value: engagementValue,
    unit: "count",
    changePct: engagementChange,
    segments: engagementSegments,
    topPosts: buildTopPosts(
      posts,
      (summary) =>
        (summary?.likes || 0) + (summary?.comments || 0) + (summary?.shares || 0) + (summary?.saves || 0),
      snapshotStatusMap
    ),
    insight: summarizeSegments(engagementSegments, engagementValue),
  };

  return [reachBreakdown, savesBreakdown, followerBreakdown, engagementBreakdown];
}

function getMonthDateRange(monthStr: string): { start: Date; end: Date } {
  const [yearStr, monthStrValue] = monthStr.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStrValue) - 1;
  if (Number.isNaN(year) || Number.isNaN(monthIndex)) {
    throw new Error(`Invalid month string: ${monthStr}`);
  }
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));
  return { start, end };
}

async function buildFeedbackSentimentSummary(params: {
  userId: string;
  month: string;
  posts: PostWithAnalytics[];
  snapshotStatusMap: Map<string, "gold" | "negative" | "normal">;
}): Promise<FeedbackSentimentSummary | null> {
  const { userId, month, posts, snapshotStatusMap } = params;
  const postsMap = new Map(posts.map((post) => [post.id, post]));
  const { start, end } = getMonthDateRange(month);

  const snapshot = await adminDb
    .collection("ai_post_feedback")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(500)
    .get();

  if (snapshot.empty) {
    return null;
  }

  type RawFeedbackEntry = {
    id: string;
    postId?: string;
    sentiment: "positive" | "negative" | "neutral";
    comment?: string;
    createdAt?: Date;
  };

  const entries: RawFeedbackEntry[] = snapshot.docs
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
    return null;
  }

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
    FeedbackPostSentiment & {
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
    return null;
  }

  const formatComments = (list: CommentInternal[]) =>
    list
      .sort((a, b) => b.createdAtMs - a.createdAtMs)
      .slice(0, 3)
      .map(({ createdAtMs: _createdAtMs, ...rest }) => rest);

  const postsArray = Array.from(postStats.values())
    .map((entry) => {
      const { lastCommentDate: _lastCommentDate, ...rest } = entry;
      return rest;
    })
    .sort((a, b) => {
      if (b.score === a.score) {
        return b.total - a.total;
      }
      return b.score - a.score;
    })
    .slice(0, 6);

  return {
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
}

// オーディエンス分析を計算
function calculateAudienceAnalysis(analytics: AnalyticsData[]) {
  const audienceData = analytics.filter((data) => data.audience);
  if (audienceData.length === 0) {
    return {
      gender: { male: 0, female: 0, other: 0 },
      age: { "18-24": 0, "25-34": 0, "35-44": 0, "45-54": 0 },
    };
  }

  const avgGender = {
    male:
      audienceData.reduce((sum, data) => sum + (data.audience?.gender.male || 0), 0) /
      audienceData.length,
    female:
      audienceData.reduce((sum, data) => sum + (data.audience?.gender.female || 0), 0) /
      audienceData.length,
    other:
      audienceData.reduce((sum, data) => sum + (data.audience?.gender.other || 0), 0) /
      audienceData.length,
  };

  const avgAge = {
    "18-24":
      audienceData.reduce((sum, data) => sum + (data.audience?.age["18-24"] || 0), 0) /
      audienceData.length,
    "25-34":
      audienceData.reduce((sum, data) => sum + (data.audience?.age["25-34"] || 0), 0) /
      audienceData.length,
    "35-44":
      audienceData.reduce((sum, data) => sum + (data.audience?.age["35-44"] || 0), 0) /
      audienceData.length,
    "45-54":
      audienceData.reduce((sum, data) => sum + (data.audience?.age["45-54"] || 0), 0) /
      audienceData.length,
  };

  return { gender: avgGender, age: avgAge };
}

// 閲覧ソース分析を計算
function calculateReachSourceAnalysis(analytics: AnalyticsData[]) {
  const reachSourceData = analytics.filter((data) => data.reachSource);
  if (reachSourceData.length === 0) {
    return {
      sources: { posts: 0, profile: 0, explore: 0, search: 0, other: 0 },
      followers: { followers: 0, nonFollowers: 0 },
    };
  }

  const avgSources = {
    posts:
      reachSourceData.reduce((sum, data) => sum + (data.reachSource?.sources.posts || 0), 0) /
      reachSourceData.length,
    profile:
      reachSourceData.reduce((sum, data) => sum + (data.reachSource?.sources.profile || 0), 0) /
      reachSourceData.length,
    explore:
      reachSourceData.reduce((sum, data) => sum + (data.reachSource?.sources.explore || 0), 0) /
      reachSourceData.length,
    search:
      reachSourceData.reduce((sum, data) => sum + (data.reachSource?.sources.search || 0), 0) /
      reachSourceData.length,
    other:
      reachSourceData.reduce((sum, data) => sum + (data.reachSource?.sources.other || 0), 0) /
      reachSourceData.length,
  };

  const avgFollowers = {
    followers:
      reachSourceData.reduce((sum, data) => sum + (data.reachSource?.followers.followers || 0), 0) /
      reachSourceData.length,
    nonFollowers:
      reachSourceData.reduce(
        (sum, data) => sum + (data.reachSource?.followers.nonFollowers || 0),
        0
      ) / reachSourceData.length,
  };

  return { sources: avgSources, followers: avgFollowers };
}

function calculateFeedPerformanceStats(analytics: AnalyticsData[]) {
  const feedData = analytics.filter((data) => data.category === "feed");
  if (feedData.length === 0) {
    return null;
  }

  const safeNumber = (value: number | undefined | null) => Number(value) || 0;

  const totalLikes = feedData.reduce((sum, data) => sum + safeNumber(data.likes), 0);
  const totalComments = feedData.reduce((sum, data) => sum + safeNumber(data.comments), 0);
  const totalShares = feedData.reduce((sum, data) => sum + safeNumber(data.shares), 0);
  const totalReposts = feedData.reduce((sum, data) => sum + safeNumber(data.reposts), 0);
  const totalSaves = feedData.reduce((sum, data) => sum + safeNumber(data.saves), 0);
  const totalReach = feedData.reduce((sum, data) => sum + safeNumber(data.reach), 0);
  const totalFollowerIncrease = feedData.reduce(
    (sum, data) => sum + safeNumber(data.followerIncrease),
    0
  );
  const totalInteractionCount = feedData.reduce(
    (sum, data) => sum + safeNumber(data.interactionCount),
    0
  );

  const avgReachFollowerPercent =
    feedData.reduce((sum, data) => sum + safeNumber(data.reachFollowerPercent), 0) /
    feedData.length;
  const avgInteractionFollowerPercent =
    feedData.reduce((sum, data) => sum + safeNumber(data.interactionFollowerPercent), 0) /
    feedData.length;

  const reachSources = {
    profile: feedData.reduce((sum, data) => sum + safeNumber(data.reachSourceProfile), 0),
    feed: feedData.reduce((sum, data) => sum + safeNumber(data.reachSourceFeed), 0),
    explore: feedData.reduce((sum, data) => sum + safeNumber(data.reachSourceExplore), 0),
    search: feedData.reduce((sum, data) => sum + safeNumber(data.reachSourceSearch), 0),
    other: feedData.reduce((sum, data) => sum + safeNumber(data.reachSourceOther), 0),
  };

  const totalReachedAccounts = feedData.reduce(
    (sum, data) => sum + safeNumber(data.reachedAccounts),
    0
  );
  const totalProfileVisits = feedData.reduce(
    (sum, data) => sum + safeNumber(data.profileVisits),
    0
  );

  const feedAudience = calculateAudienceAnalysis(feedData);
  // reelAudience removed (unused)
  // const reelAudience = calculateAudienceAnalysis(
  //   analytics.filter((data) => data.category === "reel")
  // );

  return {
    totalLikes,
    totalComments,
    totalShares,
    totalReposts,
    totalSaves,
    totalReach,
    totalFollowerIncrease,
    totalInteractionCount,
    avgReachFollowerPercent,
    avgInteractionFollowerPercent,
    reachSources,
    totalReachedAccounts,
    totalProfileVisits,
    audienceBreakdown: {
      gender: feedAudience.gender,
      age: feedAudience.age,
    },
  };
}

function calculateReelPerformanceStats(analytics: AnalyticsData[]) {
  const reelData = analytics.filter((data) => data.category === "reel");
  if (reelData.length === 0) {
    return null;
  }

  const safeNumber = (value: number | undefined | null) => Number(value) || 0;

  const totalLikes = reelData.reduce((sum, data) => sum + safeNumber(data.likes), 0);
  const totalComments = reelData.reduce((sum, data) => sum + safeNumber(data.comments), 0);
  const totalShares = reelData.reduce((sum, data) => sum + safeNumber(data.shares), 0);
  const totalReposts = reelData.reduce((sum, data) => sum + safeNumber(data.reposts), 0);
  const totalSaves = reelData.reduce((sum, data) => sum + safeNumber(data.saves), 0);
  const totalReach = reelData.reduce((sum, data) => sum + safeNumber(data.reach), 0);
  const totalFollowerIncrease = reelData.reduce(
    (sum, data) => sum + safeNumber(data.followerIncrease),
    0
  );

  const totalInteractionCount = reelData.reduce(
    (sum, data) => sum + safeNumber(data.reelInteractionCount),
    0
  );
  const avgReachFollowerPercent =
    reelData.reduce((sum, data) => sum + safeNumber(data.reelReachFollowerPercent), 0) /
    reelData.length;
  const avgInteractionFollowerPercent =
    reelData.reduce((sum, data) => sum + safeNumber(data.reelInteractionFollowerPercent), 0) /
    reelData.length;

  const reachSources = {
    profile: reelData.reduce((sum, data) => sum + safeNumber(data.reelReachSourceProfile), 0),
    reel: reelData.reduce((sum, data) => sum + safeNumber(data.reelReachSourceReel), 0),
    explore: reelData.reduce((sum, data) => sum + safeNumber(data.reelReachSourceExplore), 0),
    search: reelData.reduce((sum, data) => sum + safeNumber(data.reelReachSourceSearch), 0),
    other: reelData.reduce((sum, data) => sum + safeNumber(data.reelReachSourceOther), 0),
  };

  const totalReachedAccounts = reelData.reduce(
    (sum, data) => sum + safeNumber(data.reelReachedAccounts),
    0
  );
  const totalPlayTimeSeconds = reelData.reduce(
    (sum, data) => sum + safeNumber(data.reelPlayTime),
    0
  );
  const avgPlayTimeSeconds =
    reelData.reduce((sum, data) => sum + safeNumber(data.reelAvgPlayTime), 0) / reelData.length;

  const avgSkipRate =
    reelData.reduce((sum, data) => sum + safeNumber(data.reelSkipRate), 0) / reelData.length;
  const avgNormalSkipRate =
    reelData.reduce((sum, data) => sum + safeNumber(data.reelNormalSkipRate), 0) /
    reelData.length;

  // reelAudience removed (unused)
  // const reelAudience = calculateAudienceAnalysis(
  //   analytics.filter((data) => data.category === "reel")
  // );

  return {
    totalLikes,
    totalComments,
    totalShares,
    totalReposts,
    totalSaves,
    totalReach,
    totalFollowerIncrease,
    totalInteractionCount,
    avgReachFollowerPercent,
    avgInteractionFollowerPercent,
    reachSources,
    totalReachedAccounts,
    totalPlayTimeSeconds,
    avgPlayTimeSeconds,
    avgSkipRate,
    avgNormalSkipRate,
    audienceBreakdown: {
      gender: calculateAudienceAnalysis(reelData).gender,
      age: calculateAudienceAnalysis(reelData).age,
    },
  };
}

// ハッシュタグ統計を計算（postsコレクション + 手動入力分析データから取得）
function calculateHashtagStats(analytics: AnalyticsData[], posts: PostData[]) {
  const hashtagCounts: { [key: string]: number } = {};

  console.log("🔍 ハッシュタグ統計計算開始:", {
    postsCount: posts.length,
    analyticsCount: analytics.length,
  });

  // 1. postsコレクションから直接ハッシュタグを取得
  posts.forEach((post, index) => {
    console.log(`📝 Post ${index}:`, {
      postId: post.id,
      hashtags: post.hashtags,
      hasHashtags: !!post.hashtags && post.hashtags.length > 0,
    });

    if (post.hashtags) {
      let hashtagsArray: string[] = [];

      // hashtagsが配列か文字列かを判定
      if (Array.isArray(post.hashtags)) {
        hashtagsArray = post.hashtags;
      } else if (typeof post.hashtags === "string") {
        // 文字列の場合はカンマ区切りで分割
        hashtagsArray = post.hashtags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag);
      }

      console.log(`📝 Postハッシュタグ処理:`, {
        postId: post.id,
        originalHashtags: post.hashtags,
        hashtagsType: typeof post.hashtags,
        isArray: Array.isArray(post.hashtags),
        processedHashtags: hashtagsArray,
      });

      if (hashtagsArray.length > 0) {
        hashtagsArray.forEach((hashtag) => {
          hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
        });
      }
    }
  });

  // 2. 手動入力の分析データからもハッシュタグを取得（postIdがnullの場合）
  analytics.forEach((data, index) => {
    console.log(`📊 Analytics ${index}:`, {
      postId: data.postId,
      hashtags: data.hashtags,
      hasAnalyticsHashtags: !!data.hashtags && data.hashtags.length > 0,
      isManualInput: data.postId === null,
    });

    // postIdがnull（手動入力）の場合、分析データからハッシュタグを取得
    if (data.postId === null && data.hashtags) {
      let hashtagsArray: string[] = [];

      // hashtagsが配列か文字列かを判定
      if (Array.isArray(data.hashtags)) {
        hashtagsArray = data.hashtags;
      } else if (typeof data.hashtags === "string") {
        // 文字列の場合はカンマ区切りで分割
        hashtagsArray = data.hashtags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag);
      }

      console.log(`📊 手動入力ハッシュタグ処理:`, {
        postId: data.postId,
        originalHashtags: data.hashtags,
        hashtagsType: typeof data.hashtags,
        isArray: Array.isArray(data.hashtags),
        processedHashtags: hashtagsArray,
      });

      if (hashtagsArray.length > 0) {
        hashtagsArray.forEach((hashtag) => {
          hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
        });
      }
    }
  });

  console.log("📊 ハッシュタグ集計結果:", hashtagCounts);

  const result = Object.entries(hashtagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10) // 上位10件
    .map(([hashtag, count]) => ({ hashtag, count }));

  console.log("📊 最終ハッシュタグ結果:", result);

  return result;
}

// 投稿時間分析を計算
function calculateTimeSlotAnalysis(analytics: AnalyticsData[]) {
  const timeSlots = [
    { label: "早朝 (6-9時)", range: [6, 9], color: "from-blue-400 to-blue-600" },
    { label: "午前 (9-12時)", range: [9, 12], color: "from-green-400 to-green-600" },
    { label: "午後 (12-15時)", range: [12, 15], color: "from-yellow-400 to-yellow-600" },
    { label: "夕方 (15-18時)", range: [15, 18], color: "from-orange-400 to-orange-600" },
    { label: "夜 (18-21時)", range: [18, 21], color: "from-red-400 to-red-600" },
    { label: "深夜 (21-6時)", range: [21, 24], color: "from-purple-400 to-purple-600" },
  ];

  return timeSlots.map(({ label, range, color }) => {
    const postsInRange = analytics.filter((data) => {
      if (data.publishedTime && data.publishedTime !== "") {
        const hour = parseInt(data.publishedTime.split(":")[0]);

        if (range[0] === 21 && range[1] === 24) {
          return hour >= 21 || hour < 6;
        }

        return hour >= range[0] && hour < range[1];
      }
      return false;
    });

    const avgEngagement =
      postsInRange.length > 0
        ? postsInRange.reduce((sum, data) => sum + (data.likes + data.comments + data.shares), 0) /
          postsInRange.length
        : 0;

    const postTypeStats = ["feed", "reel", "story"].map((type) => {
      const typePosts = postsInRange.filter(
        (data) => (data.category || data.postType || "feed") === type
      );
      const typeAvgEngagement =
        typePosts.length > 0
          ? typePosts.reduce((sum, data) => sum + (data.likes + data.comments + data.shares), 0) /
            typePosts.length
          : 0;
      return {
        type: type as "feed" | "reel" | "story",
        count: typePosts.length,
        avgEngagement: Number(typeAvgEngagement.toFixed(2)),
      };
    });

    return {
      label,
      range,
      color,
      postsInRange: postsInRange.length,
      avgEngagement,
      postTypes: postTypeStats,
    };
  });
}

// 投稿タイプ別統計を計算
function calculatePostTypeStats(analytics: AnalyticsData[], _posts: PostData[]) {
  // analyticsから投稿タイプを集計（categoryフィールドを使用）
  // analyticsに存在する投稿のみをカウント（analyticsで削除されたものはカウントしない）
  // postsから追加でカウントしないことで、analyticsで削除された投稿がカウントされないようにする
  const feedCount = analytics.filter((data) => data.category === "feed").length;
  const reelCount = analytics.filter((data) => data.category === "reel").length;
  const storyCount = analytics.filter((data) => data.category === "story").length;
  const total = feedCount + reelCount + storyCount;

  return [
    {
      type: "feed",
      count: feedCount,
      label: "📸 フィード",
      color: "from-blue-400 to-blue-600",
      bg: "from-blue-50 to-blue-100",
    },
    {
      type: "reel",
      count: reelCount,
      label: "🎬 リール",
      color: "from-purple-400 to-purple-600",
      bg: "from-purple-50 to-purple-100",
    },
    {
      type: "story",
      count: storyCount,
      label: "📱 ストーリーズ",
      color: "from-pink-400 to-pink-600",
      bg: "from-pink-50 to-pink-100",
    },
  ].map(({ type, count, label, color, bg }) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return { type, count, label, color, bg, percentage };
  });
}

function buildNextMonthFocusActions(params: {
  changes: {
    likesChange: number;
    commentsChange: number;
    sharesChange: number;
    reachChange: number;
    savesChange: number;
    followerChange: number;
    engagementRateChange: number;
    postsChange: number;
  };
  patternHighlights: PatternHighlights;
  snapshotReferences: SnapshotReference[];
}): NextMonthFocusAction[] {
  const actions: NextMonthFocusAction[] = [];
  const {
    changes: { reachChange, savesChange, followerChange, engagementRateChange },
    patternHighlights,
    snapshotReferences,
  } = params;

  const topGold = patternHighlights.gold?.[0];
  const topNegative = patternHighlights.negative?.[0];
  const fallbackReference = snapshotReferences[0];

  if (reachChange < -5) {
    actions.push({
      id: "focus-reach",
      title: "リーチ回復に集中",
      focusKPI: "リーチ",
      reason: `先月比でリーチが ${reachChange.toFixed(1)}% 減少しています。`,
      recommendedAction:
        "ゴールド投稿の投稿時間・導入構成を再現し、露出強化の週を1回設けてリーチを底上げしましょう。",
      referenceIds: [topGold?.id || fallbackReference?.id].filter(Boolean),
    });
  }

  if (savesChange < -5 || engagementRateChange < -5) {
    actions.push({
      id: "focus-saves",
      title: "保存率とERの立て直し",
      focusKPI: "保存率 / エンゲージメント率",
      reason: `保存率またはERが前月比で低下しています（保存率: ${savesChange.toFixed(
        1
      )}%, ER: ${engagementRateChange.toFixed(1)}%）。`,
      recommendedAction:
        "ネガティブ投稿で指摘された離脱要因を避け、チェックリスト型やCTA強めの構成を増やして保存を促しましょう。",
      referenceIds: [topNegative?.id || fallbackReference?.id].filter(Boolean),
    });
  }

  if (followerChange < -5) {
    actions.push({
      id: "focus-followers",
      title: "フォロワー増加をテコ入れ",
      focusKPI: "フォロワー増加数",
      reason: `フォロワー増加が先月比で ${followerChange.toFixed(1)}% 減少しています。`,
      recommendedAction:
        "プロフィール誘導のCTAや求人・キャンペーン投稿を週2回入れ、フォロワー増につながる導線を明示しましょう。",
      referenceIds: [topGold?.id, topNegative?.id].filter(Boolean),
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: "focus-scale",
      title: "好調施策をスケール",
      focusKPI: "リーチ / 保存率",
      reason: "主要KPIが安定しているため、成果の出ているパターンを増やす好機です。",
      recommendedAction:
        "ゴールド投稿の切り口を週次で再アレンジし、同じ構成で3本のバリエーションを仕込んでみましょう。",
      referenceIds: [topGold?.id || fallbackReference?.id].filter(Boolean),
    });
  }

  return actions.slice(0, 3);
}

export async function GET(request: NextRequest) {
  try {
    console.log("🚀 月次レポートサマリーAPI開始");

    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-monthly-report-summary", limit: 30, windowSeconds: 60 },
      auditEventName: "analytics_monthly_report_summary_access",
    });

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") as "weekly" | "monthly" | null;
    const date = searchParams.get("date");

    console.log("🔍 パラメータ確認:", { period, date });

    if (!period || !date) {
      console.log("❌ パラメータ不足");
      return NextResponse.json(
        { error: "period, date パラメータが必要です" },
        { status: 400 }
      );
    }

    console.log("📊 月次レポートサマリー取得開始:", { userId: uid, period, date });

    // Firebase接続確認
    console.log("🔍 Firebase接続確認中...");
    if (!adminDb) {
      console.error("❌ Firebase接続エラー: adminDb is null");
      return NextResponse.json({ error: "Firebase接続エラー" }, { status: 500 });
    }
    console.log("✅ Firebase接続OK");

    // 分析データを取得（投稿一覧ページと同じロジック）
    console.log("🔍 分析データ取得開始...");
    const analyticsSnapshot = await adminDb
      .collection("analytics")
      .where("userId", "==", uid)
      .get();
    console.log("✅ 分析データ取得完了:", analyticsSnapshot.docs.length, "件");
    const analytics: AnalyticsData[] = analyticsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId || "",
        postId: data.postId,
        likes: data.likes || 0,
        comments: data.comments || 0,
        shares: data.shares || 0,
        reposts: data.reposts || 0,
        reach: data.reach || 0,
        saves: data.saves || 0,
        followerIncrease: data.followerIncrease || 0,
        engagementRate: data.engagementRate || 0,
        publishedAt: data.publishedAt?.toDate
          ? data.publishedAt.toDate()
          : new Date(data.publishedAt || Date.now()),
        publishedTime: data.publishedTime || "",
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate()
          : new Date(data.createdAt || Date.now()),
        // 投稿情報
        title: data.title,
        content: data.content,
        hashtags: data.hashtags,
        thumbnail: data.thumbnail,
        category: data.category,
        // フィード専用フィールド
        reachFollowerPercent: data.reachFollowerPercent,
        interactionCount: data.interactionCount,
        interactionFollowerPercent: data.interactionFollowerPercent,
        reachSourceProfile: data.reachSourceProfile,
        reachSourceFeed: data.reachSourceFeed,
        reachSourceExplore: data.reachSourceExplore,
        reachSourceSearch: data.reachSourceSearch,
        reachSourceOther: data.reachSourceOther,
        reachedAccounts: data.reachedAccounts,
        profileVisits: data.profileVisits,
        profileFollows: data.profileFollows,
        // リール専用フィールド
        reelReachFollowerPercent: data.reelReachFollowerPercent,
        reelInteractionCount: data.reelInteractionCount,
        reelInteractionFollowerPercent: data.reelInteractionFollowerPercent,
        reelReachSourceProfile: data.reelReachSourceProfile,
        reelReachSourceReel: data.reelReachSourceReel,
        reelReachSourceExplore: data.reelReachSourceExplore,
        reelReachSourceSearch: data.reelReachSourceSearch,
        reelReachSourceOther: data.reelReachSourceOther,
        reelReachedAccounts: data.reelReachedAccounts,
        reelSkipRate: data.reelSkipRate,
        reelNormalSkipRate: data.reelNormalSkipRate,
        reelPlayTime: data.reelPlayTime,
        reelAvgPlayTime: data.reelAvgPlayTime,
        // オーディエンス分析
        audience: data.audience,
        reachSource: data.reachSource,
      };
    });

    // 投稿データを取得（投稿一覧ページと同じロジック）
    console.log("🔍 投稿データ取得開始...");
    const postsSnapshot = await adminDb.collection("posts").where("userId", "==", uid).get();
    console.log("✅ 投稿データ取得完了:", postsSnapshot.docs.length, "件");
    const posts: PostData[] = postsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || "",
        content: data.content || "",
        hashtags: data.hashtags || [],
        postType: data.postType || "feed",
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime,
        status: data.status || "draft",
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate()
          : new Date(data.createdAt || Date.now()),
        likes: data.likes,
        comments: data.comments,
        shares: data.shares,
        views: data.views,
        reach: data.reach,
        engagementRate: data.engagementRate,
        snapshotReferences: data.snapshotReferences || [],
      };
    });

    console.log("📊 データ取得完了:", {
      analyticsCount: analytics.length,
      postsCount: posts.length,
    });

    // 現在期間のデータをフィルタリング（投稿一覧ページと同じロジック）
    const currentAnalytics = filterDataByPeriod(analytics, period, date);

    // 投稿データは期間フィルタリングを別途実装
    const currentPosts = posts.filter((post) => {
      const postDate =
        post.createdAt instanceof Date
          ? post.createdAt
          : post.createdAt && typeof post.createdAt === "object" && "toDate" in post.createdAt
            ? post.createdAt.toDate()
            : new Date(post.createdAt);

      if (period === "monthly") {
        const postMonth = postDate.toISOString().slice(0, 7);
        return postMonth === date;
      } else if (period === "weekly") {
        const weekRange = getWeekRange(date);
        return postDate >= weekRange.start && postDate <= weekRange.end;
      }
      return true;
    });

    const analyticsByPostId = new Map(
      currentAnalytics
        .filter((entry) => typeof entry.postId === "string" && entry.postId)
        .map((entry) => [entry.postId as string, entry])
    );

    const [aiContextBundle, abTestSummaries = []] = await Promise.all([
      buildAIContext(uid, {
        includeMasterContext: true,
        snapshotLimit: 8,
      }),
      fetchAbTestSummaries(uid, 5).catch((error) => {
        console.warn("⚠️ A/Bテストサマリー取得エラー:", error);
        return [];
      }),
    ]);

    const abTestResultsByPost = mapAbTestResultsByPost(abTestSummaries);

    let postsWithAnalytics: PostWithAnalytics[] = currentPosts.map((post) => {
      const analyticsEntry = analyticsByPostId.get(post.id);
      return {
        ...post,
        analyticsSummary: analyticsEntry
          ? {
              likes: analyticsEntry.likes,
              comments: analyticsEntry.comments,
              shares: analyticsEntry.shares,
              reach: analyticsEntry.reach,
              saves: analyticsEntry.saves,
              followerIncrease: analyticsEntry.followerIncrease,
              engagementRate: analyticsEntry.engagementRate,
            }
          : null,
        audienceSummary: analyticsEntry?.audience,
      };
    });

    if (postsWithAnalytics.length > 0) {
      postsWithAnalytics = postsWithAnalytics.map((post) => ({
        ...post,
        abTestResults: abTestResultsByPost.get(post.id) || [],
      }));
    }

    // 前期間のデータを取得
    const previousPeriod = getPreviousPeriod(period, date);
    const previousAnalytics = filterDataByPeriod(analytics, period, previousPeriod);
    const previousPosts = posts.filter((post) => {
      const postDate =
        post.createdAt instanceof Date
          ? post.createdAt
          : post.createdAt && typeof post.createdAt === "object" && "toDate" in post.createdAt
            ? post.createdAt.toDate()
            : new Date(post.createdAt);

      if (period === "monthly") {
        const postMonth = postDate.toISOString().slice(0, 7);
        return postMonth === previousPeriod;
      } else if (period === "weekly") {
        const weekRange = getWeekRange(previousPeriod);
        return postDate >= weekRange.start && postDate <= weekRange.end;
      }
      return true;
    });

    console.log("📊 期間別データ:", {
      currentAnalytics: currentAnalytics.length,
      currentPosts: postsWithAnalytics.length,
      previousAnalytics: previousAnalytics.length,
      previousPosts: previousPosts.length,
    });

    // 統計値を計算（投稿一覧ページと同じロジック）
    const currentTotals = calculateTotals(currentAnalytics);
    const previousTotals = calculateTotals(previousAnalytics);

    console.log("📊 calculateTotals結果（投稿数上書き前）:", {
      currentTotalsPosts: currentTotals.totalPosts,
      previousTotalsPosts: previousTotals.totalPosts,
      currentAnalyticsLength: currentAnalytics.length,
      previousAnalyticsLength: previousAnalytics.length,
    });

    // 投稿数も正確に計算（analyticsに存在する投稿のみをカウント）
    // analyticsで削除された投稿はpostsに残っていてもカウントしない
    const currentAnalyticsPostIds = new Set(
      currentAnalytics
        .filter((entry) => typeof entry.postId === "string" && entry.postId)
        .map((entry) => entry.postId as string)
    );
    const previousAnalyticsPostIds = new Set(
      previousAnalytics
        .filter((entry) => typeof entry.postId === "string" && entry.postId)
        .map((entry) => entry.postId as string)
    );
    
    // analyticsに存在する投稿のみをカウント
    // postIdがないanalyticsデータも1件としてカウント
    const currentPostsCount = currentAnalyticsPostIds.size + 
      currentAnalytics.filter((entry) => !entry.postId || typeof entry.postId !== "string").length;
    const previousPostsCount = previousAnalyticsPostIds.size + 
      previousAnalytics.filter((entry) => !entry.postId || typeof entry.postId !== "string").length;
    
    currentTotals.totalPosts = currentPostsCount;
    previousTotals.totalPosts = previousPostsCount;

    console.log("📊 投稿数上書き後:", {
      currentTotalsPosts: currentTotals.totalPosts,
      previousTotalsPosts: previousTotals.totalPosts,
      currentPostsLength: postsWithAnalytics.length,
      previousPostsLength: previousPosts.length,
    });

    // 変化率を計算
    const changes = {
      likesChange: calculateChange(currentTotals.totalLikes, previousTotals.totalLikes),
      commentsChange: calculateChange(currentTotals.totalComments, previousTotals.totalComments),
      sharesChange: calculateChange(currentTotals.totalShares, previousTotals.totalShares),
      repostsChange: calculateChange(currentTotals.totalReposts, previousTotals.totalReposts),
      reachChange: calculateChange(currentTotals.totalReach, previousTotals.totalReach),
      savesChange: calculateChange(currentTotals.totalSaves, previousTotals.totalSaves),
      followerChange: calculateChange(
        currentTotals.totalFollowerIncrease,
        previousTotals.totalFollowerIncrease
      ),
      engagementRateChange: calculateChange(
        currentTotals.avgEngagementRate,
        previousTotals.avgEngagementRate
      ),
      postsChange: calculateChange(currentTotals.totalPosts, previousTotals.totalPosts),
    };

    // 詳細分析を計算（投稿一覧ページと同じロジック）
    const audienceAnalysis = calculateAudienceAnalysis(currentAnalytics);
    const reachSourceAnalysis = calculateReachSourceAnalysis(currentAnalytics);
    const hashtagStats = calculateHashtagStats(currentAnalytics, postsWithAnalytics);
    const timeSlotAnalysis = calculateTimeSlotAnalysis(currentAnalytics);
    const postTypeStats = calculatePostTypeStats(currentAnalytics, postsWithAnalytics);
    const feedPerformanceStats = calculateFeedPerformanceStats(currentAnalytics);
    const reelPerformanceStats = calculateReelPerformanceStats(currentAnalytics);

    const snapshotReferencePayload: SnapshotReference[] = aiContextBundle.snapshotReferences.map(
      (reference) => ({
        id: reference.id,
        status: reference.status,
        score: reference.score,
        postId: reference.postId,
        title: reference.title,
        postType: reference.postType,
        summary: reference.summary,
        metrics: reference.metrics,
        textFeatures: reference.textFeatures,
        abTestResults: reference.postId ? abTestResultsByPost.get(reference.postId) : undefined,
      })
    );

    const patternHighlights: PatternHighlights = {
      gold: snapshotReferencePayload.filter((reference) => reference.status === "gold"),
      negative: snapshotReferencePayload.filter((reference) => reference.status === "negative"),
    };

    if (snapshotReferencePayload.length > 0) {
      const textFeaturesByPostId = new Map<string, SnapshotReference>();
      snapshotReferencePayload.forEach((reference) => {
        if (reference.postId) {
          textFeaturesByPostId.set(reference.postId, reference);
        }
      });
      postsWithAnalytics = postsWithAnalytics.map((post) => ({
        ...post,
        textFeatures: textFeaturesByPostId.get(post.id)?.textFeatures ?? post.textFeatures,
      }));
    }

    const snapshotStatusMap = new Map<string, "gold" | "negative" | "normal">();
    snapshotReferencePayload.forEach((reference) => {
      if (reference.postId) {
        snapshotStatusMap.set(reference.postId, reference.status ?? "normal");
      }
    });

    const learningContext: LearningContextPayload = {
      references: aiContextBundle.references,
      snapshotReferences: snapshotReferencePayload,
      masterContext: aiContextBundle.masterContext ?? null,
    };

    console.log("📊 投稿タイプ別統計:", postTypeStats);

    // 最適な投稿時間を特定
    const bestTimeSlot = timeSlotAnalysis.reduce((best, current) => {
      if (current.postsInRange > 0 && current.avgEngagement > best.avgEngagement) {
        return current;
      }
      return best;
    }, timeSlotAnalysis[0]);

    const personaHighlights: PersonaSegmentSummary[] = snapshotReferencePayload
      .flatMap((reference) => {
        const results: PersonaSegmentSummary[] = [];
        const persona = (reference as SnapshotReference & {
          personaInsights?: {
            topGender?: { segment: string; value: number; delta?: number };
            topAgeRange?: { segment: string; value: number; delta?: number };
            topGenderDiff?: { segment: string; delta: number };
            topAgeRangeDiff?: { segment: string; delta: number };
          };
        }).personaInsights;
        const normalizedStatus: "gold" | "negative" =
          reference.status === "negative" ? "negative" : "gold";
        if (persona?.topGender) {
          results.push({
            segment: persona.topGender.segment,
            type: "gender",
            status: normalizedStatus,
            value: persona.topGender.value,
            delta: persona.topGenderDiff?.delta,
            postTitle: reference.title || "",
            postId: reference.postId ? String(reference.postId) : "",
          });
        }
        if (persona?.topAgeRange) {
          results.push({
            segment: persona.topAgeRange.segment,
            type: "age",
            status: normalizedStatus,
            value: persona.topAgeRange.value,
            delta: persona.topAgeRangeDiff?.delta,
            postTitle: reference.title || "",
            postId: reference.postId ? String(reference.postId) : "",
          });
        }
        return results;
      })
      .filter((entry) => entry.postId && entry.segment)
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .slice(0, 6);

    const kpiBreakdowns = buildKpiBreakdowns({
      totals: currentTotals,
      previousTotals,
      changes,
      reachSourceAnalysis,
      posts: postsWithAnalytics,
      snapshotStatusMap,
    });

    const feedbackSentiment = await buildFeedbackSentimentSummary({
      userId: uid,
      month: date,
      posts: postsWithAnalytics,
      snapshotStatusMap,
    });

    const summary = {
      period,
      date,
      totals: currentTotals,
      previousTotals,
      changes,
      audienceAnalysis,
      reachSourceAnalysis,
      hashtagStats,
      timeSlotAnalysis,
      bestTimeSlot,
      postTypeStats,
      posts: postsWithAnalytics,
      contentPerformance: {
        feed: feedPerformanceStats,
        reel: reelPerformanceStats,
      },
      patternHighlights,
      learningContext,
      abTestSummaries,
      feedbackSentiment,
      kpiBreakdowns,
      postDeepDive: postsWithAnalytics,
      nextMonthFocusActions: buildNextMonthFocusActions({
        changes,
        patternHighlights,
        snapshotReferences: snapshotReferencePayload,
      }),
      personaHighlights,
      // 新しいフィールドを追加
      avgEngagementRate: currentTotals.avgEngagementRate,
      totalSaves: currentTotals.totalSaves,
      totalReposts: currentTotals.totalReposts,
      totalFollowerIncrease: currentTotals.totalFollowerIncrease,
    };

    console.log("📊 月次レポートサマリー計算完了");

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("❌ 月次レポートサマリー取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(
      {
        ...body,
        error: "月次レポートサマリーの取得に失敗しました",
        details: body.details ?? (body.error !== "月次レポートサマリーの取得に失敗しました" ? body.error : undefined),
        code: body.code ?? "analytics_monthly_report_summary_error",
      },
      { status }
    );
  }
}
