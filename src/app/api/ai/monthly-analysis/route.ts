import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebase-admin";
import * as admin from "firebase-admin";
import { buildAIContext, AIContextBundle } from "@/lib/ai/context";
import { AIGenerationResponse, AIInsightBlock, AIReference } from "@/types/ai";
import { getLearningPhaseLabel } from "@/utils/learningPhase";

export type PostPerformanceTag = "gold" | "gray" | "red" | "neutral";

export interface PostLearningSignal {
  postId: string;
  title: string;
  category: string;
  hashtags: string[];
  metrics: {
    reach: number;
    saves: number;
    likes: number;
    comments: number;
    shares: number;
    savesRate: number;
    commentsRate: number;
    likesRate: number;
    reachToFollowerRatio: number;
    velocityScore: number;
    totalEngagement: number;
    earlyEngagement: number | null;
    watchTimeSeconds: number | null;
    linkClicks: number | null;
    impressions: number | null;
  };
  comparisons: {
    reachDiff: number;
    engagementRateDiff: number;
    savesRateDiff: number;
    commentsRateDiff: number;
    clusterPerformanceDiff: number;
  };
  significance: {
    reach: "higher" | "lower" | "neutral";
    engagement: "higher" | "lower" | "neutral";
    savesRate: "higher" | "lower" | "neutral";
    commentsRate: "higher" | "lower" | "neutral";
  };
  cluster: {
    id: string;
    label: string;
    centroidDistance: number;
    baselinePerformance: number;
    similarPosts: Array<{
      postId: string;
      title: string;
      performanceScore: number;
      publishedAt: string | null;
    }>;
  };
  engagementRate: number;
  reach: number;
  followerIncrease: number;
  kpiScore: number;
  sentimentScore: number;
  sentimentLabel: "positive" | "negative" | "neutral";
  tag: PostPerformanceTag;
  feedbackCounts: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

export interface PatternSummary {
  tag: PostPerformanceTag;
  summary: string;
  keyThemes: string[];
  cautions: string[];
  suggestedAngles: string[];
}

export interface LearningTimelinePoint {
  period: string; // e.g. "2025-11"
  label: string; // e.g. "2025年11月"
  feedbackCount: number;
  positiveRate: number;
  actionCount: number;
  appliedCount: number;
  adoptionRate: number;
  feedbackWithCommentCount: number;
}

interface LearningBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: "earned" | "in_progress";
  current: number;
  target: number;
  progress: number;
  condition?: string;
  highlight?: string;
  shortcuts?: Array<{
    label: string;
    href: string;
  }>;
}

export interface MasterContext {
  userId: string;
  totalInteractions: number;
  ragHitRate: number;
  learningPhase: "initial" | "learning" | "optimized" | "master";
  personalizedInsights: string[];
  recommendations: string[];
  lastUpdated: Date;
  feedbackStats?: {
    total: number;
    positiveRate: number;
    averageWeight: number;
  };
  actionStats?: {
    total: number;
    adoptionRate: number;
    averageResultDelta: number;
  };
  postPatterns?: {
    signals: PostLearningSignal[];
    summaries: Partial<Record<PostPerformanceTag, PatternSummary>>;
    topHashtags: Record<string, number>;
  };
  timeline?: LearningTimelinePoint[];
  weeklyTimeline?: LearningTimelinePoint[];
  achievements?: LearningBadge[];
  postInsights?: Record<
    string,
    {
      summary: string;
      strengths: string[];
      improvements: string[];
      nextActions: string[];
    }
  >;
}

const MASTER_CONTEXT_CACHE_COLLECTION = "ai_master_context_cache";
const MASTER_CONTEXT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface SerializedMasterContext extends Omit<MasterContext, "lastUpdated"> {
  lastUpdated: string;
}

function serializeMasterContext(context: MasterContext): SerializedMasterContext {
  return {
    ...context,
    lastUpdated: context.lastUpdated.toISOString(),
  };
}

function deserializeMasterContext(data: SerializedMasterContext): MasterContext {
  return {
    ...data,
    lastUpdated: new Date(data.lastUpdated),
  };
}

function buildLearningAchievements(params: {
  goldCount: number;
  feedbackCount: number;
  feedbackWithCommentCount: number;
  actionAdoptionRate: number;
  actionCount: number;
  appliedActionCount: number;
  averageResultDelta: number;
  positiveFeedbackWeight: number;
  negativeFeedbackWeight: number;
  monthlyTimelineLength: number;
  weeklyTimelineLength: number;
  weeklyFeedbackStreak: number;
  clusterBreakthroughCount: number;
  completedAbTests: number;
  personaResonanceSegments: number;
  ragReferenceDiversity: number;
  ragHitRate: number;
}): LearningBadge[] {
  const {
    goldCount,
    feedbackCount,
    feedbackWithCommentCount,
    actionAdoptionRate,
    actionCount,
    appliedActionCount,
    averageResultDelta,
    positiveFeedbackWeight,
    negativeFeedbackWeight,
    monthlyTimelineLength,
    weeklyTimelineLength,
    weeklyFeedbackStreak,
    clusterBreakthroughCount,
    completedAbTests,
    personaResonanceSegments,
    ragReferenceDiversity,
    ragHitRate,
  } = params;

  // デバッグログ: フィードバック多様性バッジの計算値を確認
  console.log(`[LearningBadge] フィードバック多様性: ポジティブ重み=${positiveFeedbackWeight}, ネガティブ重み=${negativeFeedbackWeight}, 最小値=${Math.min(positiveFeedbackWeight, negativeFeedbackWeight)}`);

  const adoptionPercent = Math.round(actionAdoptionRate * 100);
  const actionImpact = Math.max(0, Number(averageResultDelta.toFixed(1)));
  const balancedWeight = Math.min(positiveFeedbackWeight, negativeFeedbackWeight);

  const badges: LearningBadge[] = [
    {
      id: "gold-master",
      title: "ゴールド投稿10件",
      description: "成功パターンとして抽出されたゴールド投稿を10件以上蓄積しましょう。",
      icon: "crown",
      current: goldCount,
      target: 10,
      progress: Math.min(1, goldCount / 10),
      status: goldCount >= 10 ? "earned" : "in_progress",
    },
    {
      id: "feedback-champion",
      title: "フィードバックマスター",
      description: "累計フィードバック50件でAIとの学習が加速します。",
      icon: "message",
      current: feedbackCount,
      target: 50,
      progress: Math.min(1, feedbackCount / 50),
      status: feedbackCount >= 50 ? "earned" : "in_progress",
    },
    {
      id: "insight-builder",
      title: "気づきクリエイター",
      description: "コメント付きフィードバックを10件蓄積すると、AIがより深く学習できます。",
      icon: "sparkle",
      current: feedbackWithCommentCount,
      target: 10,
      progress: Math.min(1, feedbackWithCommentCount / 10),
      status: feedbackWithCommentCount >= 10 ? "earned" : "in_progress",
    },
    {
      id: "action-driver",
      title: "アクションドライバー",
      description: "AI提案の採用率50%を目指し、改善を高速化しましょう。",
      icon: "target",
      current: adoptionPercent,
      target: 50,
      progress:
        actionCount === 0
          ? 0
          : Math.min(1, adoptionPercent / 50),
      status: adoptionPercent >= 50 && actionCount >= 5 ? "earned" : "in_progress",
    },
    {
      id: "consistency-builder",
      title: "継続学習トラック",
      description: "直近4ヶ月分の学習データが蓄積されています。",
      icon: "calendar",
      current: monthlyTimelineLength,
      target: 4,
      progress: Math.min(1, monthlyTimelineLength / 4),
      status: monthlyTimelineLength >= 4 ? "earned" : "in_progress",
    },
    {
      id: "weekly-insight",
      title: "週次インサイト",
      description: "直近6週分の週次学習データを蓄積すると、細かな変化も掴みやすくなります。",
      icon: "clock",
      current: weeklyTimelineLength,
      target: 6,
      progress: Math.min(1, weeklyTimelineLength / 6),
      status: weeklyTimelineLength >= 6 ? "earned" : "in_progress",
    },
    {
      id: "action-loop",
      title: "アクションループ",
      description: "AI提案を10回採用してPDCAサイクルを定着させましょう。",
      icon: "repeat",
      current: appliedActionCount,
      target: 10,
      progress: Math.min(1, appliedActionCount / 10),
      status: appliedActionCount >= 10 ? "earned" : "in_progress",
      condition:
        appliedActionCount >= 10
          ? "AI提案を活用できています"
          : `あと${Math.max(0, 10 - appliedActionCount)}件採用で達成`,
      shortcuts: [
        { label: "Labで提案を見る", href: "/instagram/lab/feed" },
        { label: "学習ダッシュボード", href: "/learning" },
      ],
    },
    {
      id: "action-impact",
      title: "成果インパクト",
      description: "実行済みアクションの平均効果 +5pt を目指しましょう。",
      icon: "zap",
      current: actionImpact,
      target: 5,
      progress: Math.min(1, actionImpact / 5),
      status: actionImpact >= 5 ? "earned" : "in_progress",
      condition:
        actionImpact >= 5
          ? "平均効果が+5ptを突破しました"
          : `あと${Math.max(0, 5 - actionImpact).toFixed(1)}ptで達成`,
      shortcuts: [{ label: "翌月アクションを見る", href: "/instagram/monthly-report" }],
    },
    {
      id: "feedback-balance",
      title: "フィードバック多様性",
      description: "ポジティブ・ネガティブの両面でフィードバックを集めましょう。両方の重みの最小値がポイントになります。",
      icon: "scale",
      current: Number(balancedWeight.toFixed(1)),
      target: 15,
      progress: Math.min(1, balancedWeight / 15),
      status: balancedWeight >= 15 ? "earned" : "in_progress",
      condition:
        balancedWeight >= 15
          ? "多面的なフィードバックが集まっています"
          : negativeFeedbackWeight === 0
            ? "ネガティブフィードバックを追加するとポイントが増えます"
            : positiveFeedbackWeight === 0
              ? "ポジティブフィードバックを追加するとポイントが増えます"
              : `あと${Math.max(0, 15 - balancedWeight).toFixed(1)}ポイントで達成（現在: ポジ${positiveFeedbackWeight.toFixed(1)}pt / ネガ${negativeFeedbackWeight.toFixed(1)}pt）`,
      shortcuts: [{ label: "フィードバックを入力", href: "/analytics/feed" }],
    },
    {
      id: "cluster-breakthrough",
      title: "クラスタブレイクスルー",
      description: "新しい投稿クラスタで平均を超える成果を3件達成しましょう。",
      icon: "compass",
      current: clusterBreakthroughCount,
      target: 3,
      progress: Math.min(1, clusterBreakthroughCount / 3),
      status: clusterBreakthroughCount >= 3 ? "earned" : "in_progress",
      condition:
        clusterBreakthroughCount >= 3
          ? "新しい勝ちパターンが見つかりました"
          : `あと${Math.max(0, 3 - clusterBreakthroughCount)}件で達成`,
      shortcuts: [{ label: "Labで勝ちパターンを再現", href: "/instagram/lab/feed" }],
    },
    {
      id: "feedback-streak",
      title: "フィードバック連投",
      description: "4週連続でフィードバックを入力するとバッジを獲得できます。",
      icon: "activity",
      current: weeklyFeedbackStreak,
      target: 4,
      progress: Math.min(1, weeklyFeedbackStreak / 4),
      status: weeklyFeedbackStreak >= 4 ? "earned" : "in_progress",
      condition:
        weeklyFeedbackStreak >= 4
          ? "4週連続の記録を達成しました"
          : `現在${weeklyFeedbackStreak}週。あと${Math.max(0, 4 - weeklyFeedbackStreak)}週で達成`,
      shortcuts: [{ label: "週次タイムラインを見る", href: "/learning" }],
    },
    {
      id: "abtest-closer",
      title: "検証完走",
      description: "ABテストを完了し、結果を反映させましょう。",
      icon: "flask",
      current: completedAbTests,
      target: 1,
      progress: Math.min(1, completedAbTests / 1),
      status: completedAbTests >= 1 ? "earned" : "in_progress",
      condition:
        completedAbTests >= 1
          ? "検証結果まで完走できています"
          : "テスト登録→結果入力→反映で達成",
      shortcuts: [{ label: "LabでABテスト管理", href: "/instagram/lab/feed" }],
    },
    {
      id: "audience-resonance",
      title: "オーディエンス共鳴",
      description: "年代・性別ごとの共鳴パターンを2つ以上可視化しましょう。",
      icon: "users",
      current: personaResonanceSegments,
      target: 2,
      progress: Math.min(1, personaResonanceSegments / 2),
      status: personaResonanceSegments >= 2 ? "earned" : "in_progress",
      condition:
        personaResonanceSegments >= 2
          ? "共鳴セグメントが可視化されています"
          : `あと${Math.max(0, 2 - personaResonanceSegments)}セグメントで達成`,
      shortcuts: [{ label: "オーディエンス分析を見る", href: "/instagram/monthly-report" }],
    },
    {
      id: "rag-pilot",
      title: "コンテキストパイロット",
      description: "RAGヒット率65%以上でAIがより正確に学習します。",
      icon: "brain",
      current: Math.round(ragHitRate * 100),
      target: 65,
      progress: Math.min(1, (ragHitRate * 100) / 65),
      status: ragHitRate >= 0.65 ? "earned" : "in_progress",
      condition:
        ragHitRate >= 0.65
          ? "RAGが安定してヒットしています"
          : `現在${Math.round(ragHitRate * 100)}%。65%を目指しましょう`,
      shortcuts: [{ label: "学習リファレンスを確認", href: "/learning" }],
    },
  ];

  return badges;
}

export function buildPostPatternPromptSection(
  postPatterns?: MasterContext["postPatterns"]
): string {
  if (!postPatterns) {
    return "";
  }

  const lines: string[] = [];

  if (postPatterns.summaries?.gold?.summary) {
    lines.push(`- 成功パターン: ${postPatterns.summaries.gold.summary}`);
  }
  if (postPatterns.summaries?.gray?.summary) {
    lines.push(`- 惜しい投稿: ${postPatterns.summaries.gray.summary}`);
  }
  if (postPatterns.summaries?.red?.summary) {
    lines.push(`- 改善優先: ${postPatterns.summaries.red.summary}`);
  }

  const hashtagEntries = Object.entries(postPatterns.topHashtags || {}).slice(0, 5);
  if (hashtagEntries.length > 0) {
    lines.push(`- 注目ハッシュタグ: ${hashtagEntries.map(([tag]) => `#${tag}`).join(" ")}`);
  }

  return lines.length > 0
    ? `\n\n【投稿パターン学習】\n${lines.join("\n")}\nこれらの知見を踏まえて提案を調整してください。`
    : "";
}

// OpenAI APIを呼び出す関数
async function callOpenAI(prompt: string, context?: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not found");
  }

  const messages = [
    {
      role: "system",
      content: `あなたはInstagram分析の専門AIアシスタントです。ユーザーのInstagram運用データを分析し、具体的で実用的なアドバイスを提供します。

分析のポイント：
- データに基づいた客観的な分析
- 具体的で実行可能な改善提案
- ユーザーの成長段階に応じたアドバイス
- 簡潔で分かりやすい説明

${context ? `\nマスターコンテキスト:\n${context}` : ""}`,
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "分析結果を取得できませんでした。";
}

interface AnalyticsRecord {
  id: string;
  postId: string | null;
  title: string;
  content: string;
  hashtags: string[];
  category: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  followerIncrease: number;
  publishedAt: Date | null;
  sentiment?: "satisfied" | "dissatisfied" | null;
  sentimentMemo?: string;
}

interface FeedbackAggregate {
  postId: string;
  positive: number;
  negative: number;
  neutral: number;
  positiveWeight: number;
  negativeWeight: number;
  comments: string[];
}

function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean) as unknown as T[];
  }
  return [];
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function monthKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelFromKey(key: string): string {
  const [year, month] = key.split("-");
  if (!year || !month) {
    return key;
  }
  return `${year}年${Number(month)}月`;
}

function monthKeyFromUnknown(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const match = value.match(/^(\d{4})[-/](\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}`;
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return monthKeyFromDate(parsed);
    }
    return null;
  }

  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) {
      return monthKeyFromDate(value);
    }
    return null;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    try {
      const converted = (value as { toDate: () => Date }).toDate();
      if (converted instanceof Date && !Number.isNaN(converted.getTime())) {
        return monthKeyFromDate(converted);
      }
    } catch {
      return null;
    }
  }

  return null;
}

function getIsoWeekInfo(date: Date): { year: number; week: number } {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: target.getUTCFullYear(), week };
}

function weekKeyFromDate(date: Date): string {
  const { year, week } = getIsoWeekInfo(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function weekLabelFromKey(key: string): string {
  const match = key.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    return key;
  }
  const year = Number(match[1]);
  const week = Number(match[2]);
  return `${year}年 第${week}週`;
}

function weekKeyFromUnknown(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return weekKeyFromDate(parsed);
    }
    return null;
  }

  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) {
      return weekKeyFromDate(value);
    }
    return null;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    try {
      const converted = (value as { toDate: () => Date }).toDate();
      if (converted instanceof Date && !Number.isNaN(converted.getTime())) {
        return weekKeyFromDate(converted);
      }
    } catch {
      return null;
    }
  }

  return null;
}

function calculateEngagementRate(record: AnalyticsRecord): number {
  const totalEngagement =
    (record.likes || 0) + (record.comments || 0) + (record.shares || 0) + (record.saves || 0);
  if (!record.reach || record.reach <= 0) {
    return Number(totalEngagement.toFixed(2));
  }
  return Number(((totalEngagement / record.reach) * 100).toFixed(2));
}

function computeBaselineMetrics(records: AnalyticsRecord[]) {
  const engagementValues = records
    .map((record) => calculateEngagementRate(record))
    .filter((value) => Number.isFinite(value) && value > 0);
  const reachValues = records
    .map((record) => record.reach)
    .filter((value) => Number.isFinite(value) && value > 0);
  const followerValues = records
    .map((record) => record.followerIncrease)
    .filter((value) => Number.isFinite(value) && value > 0);

  const average = (values: number[], fallback: number) =>
    values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;

  return {
    avgEngagement: average(engagementValues, 0),
    avgReach: average(reachValues, 0),
    avgFollowerIncrease: average(followerValues, 0),
  };
}

function aggregateFeedbackData(
  feedbackSnapshot: admin.firestore.QuerySnapshot<admin.firestore.DocumentData>
) {
  const aggregates = new Map<string, FeedbackAggregate>();

  feedbackSnapshot.forEach((doc) => {
    const data = doc.data() || {};
    const postId = typeof data.postId === "string" && data.postId.length > 0 ? data.postId : null;
    if (!postId) {
      return;
    }
    const sentiment = typeof data.sentiment === "string" ? data.sentiment : "neutral";
    const weight = typeof data.weight === "number" ? data.weight : 1;
    const comment = typeof data.comment === "string" ? data.comment.trim() : "";

    const aggregate =
      aggregates.get(postId) ||
      ({
        postId,
        positive: 0,
        negative: 0,
        neutral: 0,
        positiveWeight: 0,
        negativeWeight: 0,
        comments: [],
      } as FeedbackAggregate);

    if (sentiment === "positive") {
      aggregate.positive += 1;
      aggregate.positiveWeight += weight;
    } else if (sentiment === "negative") {
      aggregate.negative += 1;
      aggregate.negativeWeight += weight;
    } else {
      aggregate.neutral += 1;
    }

    if (comment.length > 0) {
      aggregate.comments.push(comment);
    }

    aggregates.set(postId, aggregate);
  });

  return aggregates;
}

function deriveSentimentScore(
  aggregate: FeedbackAggregate | undefined,
  analyticsSentiment: AnalyticsRecord["sentiment"]
) {
  let positiveWeight = aggregate?.positiveWeight ?? 0;
  let negativeWeight = aggregate?.negativeWeight ?? 0;
  let neutralWeight = aggregate?.neutral ?? 0;
  let positiveCount = aggregate?.positive ?? 0;
  let negativeCount = aggregate?.negative ?? 0;
  let neutralCount = aggregate?.neutral ?? 0;

  if (analyticsSentiment === "satisfied") {
    positiveWeight += 1;
    positiveCount += 1;
  } else if (analyticsSentiment === "dissatisfied") {
    negativeWeight += 1;
    negativeCount += 1;
  } else if (!aggregate) {
    neutralWeight += 1;
    neutralCount += 1;
  }

  const totalWeight = positiveWeight + negativeWeight + neutralWeight;
  const score = totalWeight > 0 ? positiveWeight / totalWeight : 0.5;

  let label: "positive" | "negative" | "neutral" = "neutral";
  if (score >= 0.6) {
    label = "positive";
  } else if (score <= 0.4) {
    label = "negative";
  }

  return {
    score,
    label,
    counts: {
      positive: positiveCount,
      negative: negativeCount,
      neutral: neutralCount,
    },
  };
}

function evaluatePostPerformance(
  record: AnalyticsRecord,
  baseline: ReturnType<typeof computeBaselineMetrics>,
  aggregate: FeedbackAggregate | undefined
): PostLearningSignal | null {
  const engagementRate = calculateEngagementRate(record);
  const components: number[] = [];

  if (baseline.avgReach > 0) {
    components.push(record.reach / baseline.avgReach);
  } else if (record.reach > 0) {
    components.push(1);
  }

  if (baseline.avgEngagement > 0) {
    components.push(engagementRate / baseline.avgEngagement);
  } else if (engagementRate > 0) {
    components.push(1);
  }

  if (baseline.avgFollowerIncrease > 0 && record.followerIncrease >= 0) {
    components.push(
      record.followerIncrease === 0 && baseline.avgFollowerIncrease === 0
        ? 1
        : (record.followerIncrease + 0.01) / (baseline.avgFollowerIncrease + 0.01)
    );
  }

  const kpiScore =
    components.length > 0
      ? Number(
          Math.max(
            0,
            Math.min(3, components.reduce((sum, value) => sum + value, 0) / components.length)
          ).toFixed(2)
        )
      : 0;

  const highKpi =
    kpiScore >= 1.1 ||
    (baseline.avgEngagement > 0 && engagementRate >= baseline.avgEngagement * 1.3) ||
    (baseline.avgReach > 0 && record.reach >= baseline.avgReach * 1.3) ||
    record.followerIncrease > 0;

  const lowKpi =
    (kpiScore > 0 && kpiScore <= 0.85) ||
    (baseline.avgEngagement > 0 && engagementRate <= baseline.avgEngagement * 0.7) ||
    (baseline.avgReach > 0 && record.reach <= baseline.avgReach * 0.7);

  const sentiment = deriveSentimentScore(aggregate, record.sentiment);
  let tag: PostPerformanceTag = "neutral";

  if (sentiment.score >= 0.65 && highKpi) {
    tag = "gold";
  } else if (sentiment.score >= 0.65 && !highKpi) {
    tag = "gray";
  } else if (sentiment.score <= 0.4 && lowKpi) {
    tag = "red";
  }

  const hashtags = ensureArray<string>(record.hashtags)
    .map((tagStr) => tagStr.replace(/^#+/, "").trim())
    .filter((tagStr) => tagStr.length > 0)
    .slice(0, 10);

  return {
    postId: record.postId ?? record.id,
    title: record.title || "タイトル未設定",
    category: record.category || "feed",
    hashtags,
    metrics: {
      reach: record.reach,
      saves: record.saves ?? 0,
      likes: record.likes ?? 0,
      comments: record.comments ?? 0,
      shares: record.shares ?? 0,
      savesRate: record.reach > 0 ? (record.saves ?? 0) / record.reach : 0,
      commentsRate: record.reach > 0 ? (record.comments ?? 0) / record.reach : 0,
      likesRate: record.reach > 0 ? (record.likes ?? 0) / record.reach : 0,
      reachToFollowerRatio: record.followerIncrease !== undefined && record.followerIncrease !== null
        ? record.reach / Math.max(1, record.followerIncrease + 1)
        : 0,
      velocityScore: 0,
      totalEngagement: (record.likes ?? 0) + (record.comments ?? 0) + (record.shares ?? 0) + (record.saves ?? 0),
      earlyEngagement: null,
      watchTimeSeconds: null,
      linkClicks: null,
      impressions: null,
    },
    comparisons: {
      reachDiff: 0,
      engagementRateDiff: 0,
      savesRateDiff: 0,
      commentsRateDiff: 0,
      clusterPerformanceDiff: 0,
    },
    significance: {
      reach: "neutral",
      engagement: "neutral",
      savesRate: "neutral",
      commentsRate: "neutral",
    },
    cluster: {
      id: record.category || "cluster-default",
      label: record.category || "投稿クラスタ",
      centroidDistance: 0,
      baselinePerformance: 0,
      similarPosts: [],
    },
    engagementRate,
    reach: record.reach,
    followerIncrease: record.followerIncrease,
    kpiScore,
    sentimentScore: Number(sentiment.score.toFixed(2)),
    sentimentLabel: sentiment.label,
    tag,
    feedbackCounts: sentiment.counts,
  };
}

function collectTopHashtags(signals: PostLearningSignal[]): Record<string, number> {
  const counts: Record<string, number> = {};

  signals.forEach((signal) => {
    const weight =
      signal.tag === "gold" ? 2 : signal.tag === "gray" ? 1 : signal.tag === "red" ? 0.5 : 0.3;
    signal.hashtags.forEach((tag) => {
      const normalized = tag.toLowerCase();
      if (!normalized) {
        return;
      }
      counts[normalized] = (counts[normalized] || 0) + weight;
    });
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .reduce((acc, [tag, value]) => {
      acc[tag] = Number(value.toFixed(2));
      return acc;
    }, {} as Record<string, number>);
}

function buildFallbackPatternSummary(
  tag: PostPerformanceTag,
  posts: PostLearningSignal[]
): PatternSummary {
  const tagLabelMap: Record<PostPerformanceTag, string> = {
    gold: "成功パターン",
    gray: "ユーザー満足は高いが指標が伸びないパターン",
    red: "改善が必要なパターン",
    neutral: "参考パターン",
  };

  const topHashtags = collectTopHashtags(posts);
  const hashtagList = Object.keys(topHashtags);

  let summary = `${tagLabelMap[tag]}が${posts.length}件見つかりました。`;
  if (hashtagList.length > 0) {
    summary += ` よく使われたハッシュタグは${hashtagList.slice(0, 3).join("、")}です。`;
  }

  const defaultCautions =
    tag === "red"
      ? ["CTAの明確化", "投稿構成の見直し", "ハッシュタグの再検証"]
      : tag === "gray"
        ? ["KPIの改善策を併記する", "投稿時間の最適化", "ビジュアル要素の見直し"]
        : [];

  const suggestedAngles =
    tag === "gold"
      ? ["成功パターンの再活用", "構成・トーンのテンプレ化", "CTAの強化"]
      : tag === "gray"
        ? ["主観満足の理由を活かしつつKPI向上施策を試す", "エンゲージメント導線を追加する"]
        : ["投稿内容とターゲットの整合性を再確認する"];

  return {
    tag,
    summary,
    keyThemes: hashtagList.slice(0, 5),
    cautions: defaultCautions,
    suggestedAngles,
  };
}

async function summarizePostPatterns(
  tag: PostPerformanceTag,
  posts: PostLearningSignal[]
): Promise<PatternSummary | null> {
  if (posts.length === 0) {
    return null;
  }

  const tagLabelMap: Record<PostPerformanceTag, string> = {
    gold: "成功パターン（指標も満足度も高い投稿）",
    gray: "主観満足度は高いが指標が伸びにくい投稿",
    red: "指標も満足度も低い投稿",
    neutral: "参考レベルの投稿",
  };

  const sample = posts.slice(0, 5).map((post) => ({
    title: post.title,
    category: post.category,
    engagementRate: post.engagementRate,
    reach: post.reach,
    followerIncrease: post.followerIncrease,
    sentimentLabel: post.sentimentLabel,
    sentimentScore: post.sentimentScore,
    hashtags: post.hashtags,
  }));

  const prompt = `以下はInstagram投稿の${tagLabelMap[tag]}一覧です。共通点や活用すべき要素、注意点を整理し、必ず次のJSON形式のみで回答してください。

投稿データ:
${JSON.stringify(sample, null, 2)}

出力形式:
{
  "summary": "全体像（120文字以内）",
  "keyThemes": ["共通する特徴やハッシュタグ", "..."],
  "cautions": ["改善・注意すべき点", "..."],
  "suggestedAngles": ["次回活かす視点", "..."]
}

制約:
- JSON以外のテキストは一切出力しない
- 日本語で記述する
- keyThemes, cautions, suggestedAnglesは空配列でもよいが、存在する場合は具体的に記載する`;

  try {
    const response = await callOpenAI(prompt);
    const jsonText = response.trim().startsWith("{")
      ? response.trim()
      : response.slice(response.indexOf("{"));
    const parsed = JSON.parse(jsonText);

    return {
      tag,
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      keyThemes: Array.isArray(parsed.keyThemes)
        ? parsed.keyThemes.filter((item: unknown): item is string => typeof item === "string")
        : [],
      cautions: Array.isArray(parsed.cautions)
        ? parsed.cautions.filter((item: unknown): item is string => typeof item === "string")
        : [],
      suggestedAngles: Array.isArray(parsed.suggestedAngles)
        ? parsed.suggestedAngles.filter((item: unknown): item is string => typeof item === "string")
        : [],
    };
  } catch (error) {
    console.error("投稿パターン要約生成エラー:", error);
    return buildFallbackPatternSummary(tag, posts);
  }
}

// RAGシステムでマスターコンテキストを取得
export async function getMasterContext(
  userId: string,
  options: { forceRefresh?: boolean } = {}
): Promise<MasterContext | null> {
  try {
    const db = getAdminDb();
    let completedAbTests = 0;
    let personaResonanceSegments = 0;
    const cacheRef = db.collection(MASTER_CONTEXT_CACHE_COLLECTION).doc(userId);
    const forceRefresh = options.forceRefresh ?? false;

    if (!forceRefresh) {
      const cacheDoc = await cacheRef.get();
      if (cacheDoc.exists) {
        const cacheData = cacheDoc.data() || {};
        const updatedAtRaw = cacheData.updatedAt;
        let updatedAt: Date | null = null;
        if (
          updatedAtRaw &&
          typeof updatedAtRaw === "object" &&
          typeof (updatedAtRaw as { toDate?: () => Date }).toDate === "function"
        ) {
          updatedAt = (updatedAtRaw as { toDate: () => Date }).toDate();
        } else if (updatedAtRaw instanceof Date) {
          updatedAt = updatedAtRaw;
        } else if (typeof updatedAtRaw === "string") {
          const parsed = new Date(updatedAtRaw);
          updatedAt = Number.isNaN(parsed.getTime()) ? null : parsed;
        }

        const contextData = cacheData.context as SerializedMasterContext | undefined;
        if (
          updatedAt &&
          contextData &&
          Date.now() - updatedAt.getTime() < MASTER_CONTEXT_CACHE_TTL_MS
        ) {
          try {
            return deserializeMasterContext(contextData);
          } catch (error) {
            console.warn("Master context cache deserialize failed:", error);
          }
        }
      }
    }

    const historySnapshot = await db
      .collection("ai_overview_history")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(12)
      .get();

    const feedbackSnapshot = await db
      .collection("ai_post_feedback")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const actionLogSnapshot = await db
      .collection("ai_action_logs")
      .where("userId", "==", userId)
      .orderBy("updatedAt", "desc")
      .limit(100)
      .get();

    const analyticsSnapshot = await db
      .collection("analytics")
      .where("userId", "==", userId)
      .orderBy("publishedAt", "desc")
      .limit(120)
      .get();

    try {
      const abTestSnapshot = await db
        .collection("ab_tests")
        .where("userId", "==", userId)
        .where("status", "==", "completed")
        .limit(10)
        .get();
      completedAbTests = abTestSnapshot.size;
    } catch (error) {
      console.error("ABテスト取得エラー（バッジ計算）:", error);
    }

    try {
      const personaSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("postPerformanceSnapshots")
        .orderBy("updatedAt", "desc")
        .limit(25)
        .get();
      const personaSet = new Set<string>();
      personaSnapshot.forEach((doc) => {
        const data = doc.data() || {};
        const persona = data.personaInsights as
          | {
              topGender?: { segment: string; value: number };
              topAgeRange?: { segment: string; value: number };
            }
          | undefined;
        if (
          persona?.topGender?.segment &&
          typeof persona.topGender.value === "number" &&
          persona.topGender.value >= 40
        ) {
          personaSet.add(`gender:${persona.topGender.segment}`);
        }
        if (
          persona?.topAgeRange?.segment &&
          typeof persona.topAgeRange.value === "number" &&
          persona.topAgeRange.value >= 30
        ) {
          personaSet.add(`age:${persona.topAgeRange.segment}`);
        }
      });
      personaResonanceSegments = personaSet.size;
    } catch (error) {
      console.error("オーディエンスデータ取得エラー（バッジ計算）:", error);
    }

    const feedbackCount = feedbackSnapshot.size;
    const actionLogCount = actionLogSnapshot.size;
    const analyticsCount = analyticsSnapshot.size;

    if (historySnapshot.empty && feedbackCount === 0 && actionLogCount === 0 && analyticsCount === 0) {
      return createDefaultMasterContext(userId);
    }

    const feedbackAggregates = aggregateFeedbackData(feedbackSnapshot);

    // analyticsコレクション（分析済みデータ）のみを使用
    // 重複除去: 同じpostIdの最新レコードのみ保持
    const postIdToAnalyticsRecord = new Map<string, AnalyticsRecord>();
    
    for (const doc of analyticsSnapshot.docs) {
      const data = doc.data() || {};
      const postId = typeof data.postId === "string" && data.postId.length > 0 ? data.postId : null;
      
      // postIdがない場合はスキップ（分析データとして不完全）
      if (!postId) {
        continue;
      }
      
      const publishedAtRaw = data.publishedAt;
      const publishedAt =
        publishedAtRaw && typeof publishedAtRaw === "object" && typeof publishedAtRaw.toDate === "function"
          ? publishedAtRaw.toDate()
          : typeof publishedAtRaw === "string"
            ? new Date(publishedAtRaw)
            : null;

      const record: AnalyticsRecord = {
        id: doc.id,
        postId,
        title: typeof data.title === "string" ? data.title : "",
        content: typeof data.content === "string" ? data.content : "",
        hashtags: ensureArray<string>(data.hashtags),
        category: typeof data.category === "string" ? data.category : "feed",
        likes: toNumber(data.likes),
        comments: toNumber(data.comments),
        shares: toNumber(data.shares),
        saves: toNumber(data.saves),
        reach: toNumber(data.reach),
        followerIncrease: toNumber(data.followerIncrease),
        publishedAt,
        sentiment:
          typeof data.sentiment === "string" && (data.sentiment === "satisfied" || data.sentiment === "dissatisfied")
            ? data.sentiment
            : null,
        sentimentMemo: typeof data.sentimentMemo === "string" ? data.sentimentMemo : "",
      };

      // 重複除去: 同じpostIdが既にある場合、publishedAtが新しい方を保持
      const existing = postIdToAnalyticsRecord.get(postId);
      if (!existing || (publishedAt && existing.publishedAt && publishedAt > existing.publishedAt)) {
        postIdToAnalyticsRecord.set(postId, record);
      }
    }

    // analyticsコレクションに存在するデータ（分析済み）のみを使用
    const analyticsRecords: AnalyticsRecord[] = Array.from(postIdToAnalyticsRecord.values());

    const baselineMetrics = computeBaselineMetrics(analyticsRecords);

    const evaluatedSignals = analyticsRecords
      .map((record) => {
        const aggregate =
          feedbackAggregates.get(record.postId ?? record.id) ??
          (record.postId ? feedbackAggregates.get(record.postId) : undefined);
        return evaluatePostPerformance(record, baselineMetrics, aggregate || undefined);
      })
      .filter((signal): signal is PostLearningSignal => Boolean(signal));

    const clusterBreakthroughCount = evaluatedSignals.filter((signal) => {
      if (signal.tag !== "gold") {
        return false;
      }
      const reachLift =
        baselineMetrics.avgReach > 0 ? signal.metrics.reach / baselineMetrics.avgReach : 0;
      const engagementLift =
        baselineMetrics.avgEngagement > 0
          ? signal.engagementRate / baselineMetrics.avgEngagement
          : 0;
      return reachLift >= 1.3 || engagementLift >= 1.3;
    }).length;

    const sortSignals = (signals: PostLearningSignal[]) =>
      signals
        .slice()
        .sort((a, b) => {
          if (b.tag === "gold" && a.tag !== "gold") {
            return 1;
          }
          if (a.tag === "gold" && b.tag !== "gold") {
            return -1;
          }
          if (b.kpiScore !== a.kpiScore) {
            return b.kpiScore - a.kpiScore;
          }
          if (b.sentimentScore !== a.sentimentScore) {
            return b.sentimentScore - a.sentimentScore;
          }
          return b.reach - a.reach;
        });

    const sortedSignals = sortSignals(evaluatedSignals);
    const limitedSignals = sortedSignals.slice(0, 40);

    const goldSignals = evaluatedSignals
      .filter((signal) => signal.tag === "gold")
      .sort((a, b) => b.kpiScore - a.kpiScore || b.sentimentScore - a.sentimentScore)
      .slice(0, 12);
    const graySignals = evaluatedSignals
      .filter((signal) => signal.tag === "gray")
      .sort((a, b) => b.sentimentScore - a.sentimentScore || a.kpiScore - b.kpiScore)
      .slice(0, 12);
    const redSignals = evaluatedSignals
      .filter((signal) => signal.tag === "red")
      .sort((a, b) => a.kpiScore - b.kpiScore || a.sentimentScore - b.sentimentScore)
      .slice(0, 12);

    const [goldSummary, graySummary, redSummary] = await Promise.all([
      summarizePostPatterns("gold", goldSignals),
      summarizePostPatterns("gray", graySignals),
      summarizePostPatterns("red", redSignals),
    ]);

    const patternSummaries: Partial<Record<PostPerformanceTag, PatternSummary>> = {};
    if (goldSummary) {
      patternSummaries.gold = goldSummary;
    }
    if (graySummary) {
      patternSummaries.gray = graySummary;
    }
    if (redSummary) {
      patternSummaries.red = redSummary;
    }

    const topHashtags = collectTopHashtags(evaluatedSignals);

    const hasHistory = !historySnapshot.empty;
    const entries = hasHistory
      ? historySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            period: typeof data.period === "string" ? data.period : "monthly",
            date: typeof data.date === "string" ? data.date : "",
            updatedAt: data.updatedAt?.toDate?.() ?? data.createdAt?.toDate?.() ?? new Date(),
            overview: data.overview || {},
            actionPlans: Array.isArray(data.actionPlans) ? data.actionPlans : [],
            totalsSnapshot: data.totalsSnapshot || {},
            changesSnapshot: data.changesSnapshot || {},
            confidenceSnapshot: data.confidenceSnapshot || {},
          };
        })
      : [];

    interface TimelineAccumulator {
      feedbackCount: number;
      positiveWeight: number;
      totalWeight: number;
      actionCount: number;
      appliedCount: number;
      feedbackWithCommentCount: number;
    }

    const createAccumulator = (): TimelineAccumulator => ({
      feedbackCount: 0,
      positiveWeight: 0,
      totalWeight: 0,
      actionCount: 0,
      appliedCount: 0,
      feedbackWithCommentCount: 0,
    });

    const monthlyAccumulator = new Map<string, TimelineAccumulator>();
    const weeklyAccumulator = new Map<string, TimelineAccumulator>();
    let totalFeedbackWithComment = 0;

    const ensureSlot = (map: Map<string, TimelineAccumulator>, key: string) => {
      if (!map.has(key)) {
        map.set(key, createAccumulator());
      }
    };

    entries.forEach((entry) => {
      if (entry.period === "monthly") {
        const monthKey =
          monthKeyFromUnknown(entry.date) ?? monthKeyFromUnknown(entry.updatedAt) ?? null;
        if (monthKey) {
          ensureSlot(monthlyAccumulator, monthKey);
        }
      }
      const weekKey =
        weekKeyFromUnknown(entry.date) ?? weekKeyFromUnknown(entry.updatedAt) ?? null;
      if (weekKey) {
        ensureSlot(weeklyAccumulator, weekKey);
      }
    });

    feedbackSnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAtValue =
        data.createdAt?.toDate?.() ??
        (typeof data.createdAt === "string" ? new Date(data.createdAt) : null);
      if (!createdAtValue || Number.isNaN(createdAtValue.getTime())) {
        return;
      }
      const monthKey = monthKeyFromDate(createdAtValue);
      const weekKey = weekKeyFromDate(createdAtValue);
      const weight = typeof data.weight === "number" ? data.weight : 1;
      const sentiment = typeof data.sentiment === "string" ? data.sentiment : "neutral";
      const hasComment =
        typeof data.comment === "string" && data.comment.trim().length > 0;

      ensureSlot(monthlyAccumulator, monthKey);
      const monthAcc = monthlyAccumulator.get(monthKey)!;
      monthAcc.feedbackCount += 1;
      monthAcc.totalWeight += weight;
      if (sentiment === "positive") {
        monthAcc.positiveWeight += weight;
      }
      if (hasComment) {
        monthAcc.feedbackWithCommentCount += 1;
        totalFeedbackWithComment += 1;
      }

      ensureSlot(weeklyAccumulator, weekKey);
      const weekAcc = weeklyAccumulator.get(weekKey)!;
      weekAcc.feedbackCount += 1;
      weekAcc.totalWeight += weight;
      if (sentiment === "positive") {
        weekAcc.positiveWeight += weight;
      }
      if (hasComment) {
        weekAcc.feedbackWithCommentCount += 1;
      }
    });

    actionLogSnapshot.forEach((doc) => {
      const data = doc.data();
      const updatedAtValue =
        data.updatedAt?.toDate?.() ??
        data.createdAt?.toDate?.() ??
        (typeof data.updatedAt === "string" ? new Date(data.updatedAt) : null);
      if (!updatedAtValue || Number.isNaN(updatedAtValue.getTime())) {
        return;
      }
      const monthKey = monthKeyFromDate(updatedAtValue);
      const weekKey = weekKeyFromDate(updatedAtValue);

      ensureSlot(monthlyAccumulator, monthKey);
      const monthAcc = monthlyAccumulator.get(monthKey)!;
      monthAcc.actionCount += 1;
      if (data.applied === true) {
        monthAcc.appliedCount += 1;
      }

      ensureSlot(weeklyAccumulator, weekKey);
      const weekAcc = weeklyAccumulator.get(weekKey)!;
      weekAcc.actionCount += 1;
      if (data.applied === true) {
        weekAcc.appliedCount += 1;
      }
    });

    const buildTimeline = (
      map: Map<string, TimelineAccumulator>,
      labelFormatter: (key: string) => string,
      sliceCount = 8
    ): LearningTimelinePoint[] =>
      Array.from(map.entries())
        .sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0))
        .slice(-sliceCount)
        .map<LearningTimelinePoint>(([key, acc]) => {
          const positiveRate =
            acc.totalWeight > 0 ? Number((acc.positiveWeight / acc.totalWeight).toFixed(3)) : 0;
          const adoptionRate =
            acc.actionCount > 0 ? Number((acc.appliedCount / acc.actionCount).toFixed(3)) : 0;
          return {
            period: key,
            label: labelFormatter(key),
            feedbackCount: acc.feedbackCount,
            positiveRate,
            actionCount: acc.actionCount,
            appliedCount: acc.appliedCount,
            adoptionRate,
            feedbackWithCommentCount: acc.feedbackWithCommentCount,
          };
        });

    const timeline = buildTimeline(monthlyAccumulator, monthLabelFromKey, 8);
    const weeklyTimeline = buildTimeline(weeklyAccumulator, weekLabelFromKey, 12);
    const weeklyFeedbackStreak = (() => {
      let streak = 0;
      for (let i = weeklyTimeline.length - 1; i >= 0; i -= 1) {
        if (weeklyTimeline[i].feedbackCount > 0) {
          streak += 1;
        } else {
          break;
        }
      }
      return streak;
    })();

    const goldCount = evaluatedSignals.filter((signal) => signal.tag === "gold").length;
    const totalInteractions = entries.length;
    const latestEntry = entries[0];

    const focusAreaCounts: Record<string, number> = {};
    const watchoutCounts: Record<string, number> = {};
    const highlightCounts: Record<string, number> = {};
    let confidenceSum = 0;

    for (const entry of entries) {
      for (const plan of entry.actionPlans) {
        const focus = typeof plan.focusArea === "string" ? plan.focusArea : "全体";
        focusAreaCounts[focus] = (focusAreaCounts[focus] || 0) + 1;
      }

      const watchouts = Array.isArray(entry.overview?.watchouts) ? entry.overview.watchouts : [];
      watchouts.forEach((item: string) => {
        const normalized = item.trim();
        if (normalized.length > 0) {
          watchoutCounts[normalized] = (watchoutCounts[normalized] || 0) + 1;
        }
      });

      const highlights = Array.isArray(entry.overview?.highlights)
        ? entry.overview.highlights
        : [];
      highlights.forEach((highlight: any) => {
        const label =
          typeof highlight?.label === "string" && highlight.label.trim().length > 0
            ? highlight.label.trim()
            : null;
        if (label) {
          highlightCounts[label] = (highlightCounts[label] || 0) + 1;
        }
      });

      const confidenceScore =
        typeof entry.confidenceSnapshot?.score === "number" ? entry.confidenceSnapshot.score : 0;
      confidenceSum += confidenceScore;
    }

    let positiveWeight = 0;
    let negativeWeight = 0;
    let weightTotal = 0;
    feedbackSnapshot.forEach((doc) => {
      const data = doc.data();
      const weight = typeof data.weight === "number" ? data.weight : 1;
      const sentiment = typeof data.sentiment === "string" ? data.sentiment : "neutral";
      if (sentiment === "positive") {
        positiveWeight += weight;
      } else if (sentiment === "negative") {
        negativeWeight += weight;
      }
      weightTotal += weight;
    });
    
    // デバッグログ: フィードバックの集計結果を確認
    console.log(`[MasterContext] フィードバック集計: 総数=${feedbackSnapshot.size}, ポジティブ重み=${positiveWeight}, ネガティブ重み=${negativeWeight}, 総重み=${weightTotal}`);
    const feedbackPositiveRate = weightTotal > 0 ? positiveWeight / weightTotal : 0;
    const averageFeedbackWeight = feedbackCount > 0 ? weightTotal / feedbackCount : 0;

    let appliedCount = 0;
    let resultDeltaSum = 0;
    actionLogSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.applied === true) {
        appliedCount += 1;
      }
      if (typeof data.resultDelta === "number") {
        resultDeltaSum += data.resultDelta;
      }
    });
    const actionAdoptionRate = actionLogCount > 0 ? appliedCount / actionLogCount : 0;
    const averageResultDelta = actionLogCount > 0 ? resultDeltaSum / actionLogCount : 0;

    const topFocusAreas = Object.entries(focusAreaCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([focus, count]) => `${focus} (${count}回)`);

    const frequentWatchouts = Object.entries(watchoutCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([watchout]) => watchout);

    const frequentHighlights = Object.entries(highlightCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label]) => label);

    const learningPhase =
      totalInteractions >= 12
        ? "master"
        : totalInteractions >= 8
          ? "optimized"
          : totalInteractions >= 4
            ? "learning"
            : "initial";

    const baseRagScore =
      (Object.keys(focusAreaCounts).length + frequentWatchouts.length + frequentHighlights.length) /
      12;
    const combinedScore =
      (baseRagScore + feedbackPositiveRate + actionAdoptionRate + averageFeedbackWeight / 5) / 4;
    const ragHitRate = Math.min(1, Math.max(0, Number(combinedScore.toFixed(2))));

    const ragReferenceDiversity = [
      goldCount > 0,
      feedbackCount > 0,
      actionLogCount > 0,
      completedAbTests > 0,
      personaResonanceSegments > 0,
      clusterBreakthroughCount > 0,
    ].filter(Boolean).length;

    const achievements = buildLearningAchievements({
      goldCount,
      feedbackCount,
      feedbackWithCommentCount: totalFeedbackWithComment,
      actionAdoptionRate,
      actionCount: actionLogCount,
      appliedActionCount: appliedCount,
      averageResultDelta,
      positiveFeedbackWeight: positiveWeight,
      negativeFeedbackWeight: negativeWeight,
      monthlyTimelineLength: timeline.length,
      weeklyTimelineLength: weeklyTimeline.length,
      weeklyFeedbackStreak,
      clusterBreakthroughCount,
      completedAbTests,
      personaResonanceSegments,
      ragReferenceDiversity,
      ragHitRate,
    });

    const personalizedInsights: string[] = [];
    if (latestEntry?.overview?.summary) {
      personalizedInsights.push(`最新サマリー: ${latestEntry.overview.summary}`);
    }
    if (frequentHighlights.length > 0) {
      personalizedInsights.push(`注目指標: ${frequentHighlights.join(" / ")}`);
    }
    if (frequentWatchouts.length > 0) {
      personalizedInsights.push(`注意点: ${frequentWatchouts.join(" / ")}`);
    }
    if (feedbackCount > 0) {
      personalizedInsights.push(
        `フィードバック総数: ${feedbackCount}件（好感度 ${Math.round(feedbackPositiveRate * 100)}%）`
      );
    }
    if (actionLogCount > 0) {
      personalizedInsights.push(
        `アクション採用率: ${Math.round(actionAdoptionRate * 100)}%、平均効果 ${averageResultDelta.toFixed(1)}%`
      );
    }

    if (goldSignals.length > 0 && goldSummary?.summary) {
      personalizedInsights.push(`成功投稿パターン: ${goldSummary.summary}`);
    }
    if (graySignals.length > 0 && graySummary?.summary) {
      personalizedInsights.push(`主観◎だが伸び悩む投稿: ${graySummary.summary}`);
    }
    if (redSignals.length > 0 && redSummary?.summary) {
      personalizedInsights.push(`改善優先投稿: ${redSummary.summary}`);
    }

    const recommendations: string[] = [];
    if (topFocusAreas.length > 0) {
      recommendations.push(`重点テーマ: ${topFocusAreas.join(" / ")}`);
    }
    if (feedbackCount > 0 && feedbackPositiveRate < 0.5) {
      recommendations.push("フィードバックで指摘された投稿を再分析し、改善策を検討しましょう");
    }
    if (actionLogCount > 0 && actionAdoptionRate < 0.4) {
      recommendations.push("AI提案の採用率を高めるため、実行しやすいプランを優先しましょう");
    }
    recommendations.push("AIとの対話を継続して学習を促進しましょう");
    recommendations.push("提案を実行し、結果をフィードバックして精度を高めましょう");
    if (goldSummary?.suggestedAngles?.length) {
      recommendations.push(`成功パターン活用: ${goldSummary.suggestedAngles[0]}`);
    }
    if (graySummary?.cautions?.length) {
      recommendations.push(`伸び悩み改善: ${graySummary.cautions[0]}`);
    }
    if (redSummary?.cautions?.length) {
      recommendations.push(`優先改善: ${redSummary.cautions[0]}`);
    }

    const result: MasterContext = {
      userId,
      totalInteractions,
      ragHitRate,
      learningPhase: learningPhase as MasterContext["learningPhase"],
      personalizedInsights,
      recommendations,
      lastUpdated: latestEntry?.updatedAt ?? new Date(),
      feedbackStats: {
        total: feedbackCount,
        positiveRate: feedbackPositiveRate,
        averageWeight: averageFeedbackWeight,
      },
      actionStats: {
        total: actionLogCount,
        adoptionRate: actionAdoptionRate,
        averageResultDelta,
      },
      postPatterns: {
        signals: limitedSignals,
        summaries: patternSummaries,
        topHashtags,
      },
      timeline,
      weeklyTimeline,
      achievements,
    };

    try {
      const serializedContext = serializeMasterContext(result);
      await cacheRef.set({
        context: serializedContext,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (cacheError) {
      console.warn("Master context cache write failed:", cacheError);
    }

    return result;
  } catch (error) {
    console.error("マスターコンテキスト取得エラー:", error);
    return createDefaultMasterContext(userId);
  }
}

// 分析データを取得（月次レポートサマリー全体を取得）
async function getReportSummary(userId: string, period: string, date: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/analytics/monthly-report-summary?userId=${userId}&period=${period}&date=${date}`
    );

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        return result.data;
      }
    }
  } catch (error) {
    console.error("レポートサマリー取得エラー:", error);
  }

  return null;
}

interface ReportSummary {
  totals?: {
    totalLikes?: number;
    totalComments?: number;
    totalShares?: number;
    totalReach?: number;
    totalPosts?: number;
    totalSaves?: number;
    totalReposts?: number;
    totalFollowerIncrease?: number;
    avgEngagementRate?: number;
  };
  changes?: {
    likesChange?: number;
    commentsChange?: number;
    sharesChange?: number;
    reachChange?: number;
    postsChange?: number;
    followerChange?: number;
    engagementRateChange?: number;
  };
  previousTotals?: Record<string, unknown>;
  postTypeStats?: Array<{
    type: string;
    count: number;
    label: string;
    percentage: number;
  }>;
  hashtagStats?: Array<{
    hashtag: string;
    count: number;
  }>;
  timeSlotAnalysis?: Array<{
    label: string;
    range?: number[];
    postsInRange: number;
    avgEngagement: number;
  }>;
  bestTimeSlot?: {
    label: string;
    postsInRange: number;
    avgEngagement: number;
  };
}

type AlertSeverity = "info" | "warning" | "critical";

interface AnalysisAlert {
  id: string;
  metric: string;
  message: string;
  severity: AlertSeverity;
  change?: number;
  value?: number;
}

type PostTypeHighlightStatus = "strong" | "neutral" | "weak";

interface PostTypeHighlight {
  id: string;
  type: string;
  label: string;
  status: PostTypeHighlightStatus;
  percentage: number;
  count: number;
  message: string;
}

type ActionPlanPriority = "high" | "medium" | "low";

interface ActionPlan {
  id: string;
  title: string;
  description: string;
  priority: ActionPlanPriority;
  focusArea: string;
  expectedImpact: string;
  recommendedActions: string[];
}

interface PlanSummary {
  id: string;
  title: string;
  status: string;
  snsType: string;
  planPeriod: string;
  targetFollowers: number;
  currentFollowers: number;
  targetAudience?: string;
  strategies: string[];
  postCategories: string[];
  planStartDate?: string;
  planEndDate?: string;
  simulationSummary?: string;
  formData?: Record<string, unknown> | null;
}

type PlanCheckpointStatus = "met" | "partial" | "missed" | "no_data";
type PlanReflectionStatus = "on_track" | "at_risk" | "off_track" | "no_plan";

interface PlanCheckpoint {
  label: string;
  target: string;
  actual: string;
  status: PlanCheckpointStatus;
}

interface PlanReflection {
  summary: string;
  status: PlanReflectionStatus;
  checkpoints: PlanCheckpoint[];
  nextSteps: string[];
  planStrategyReview?: string; // 計画の「取り組みたいこと」「投稿したい内容」に対する総評
}

interface PDCAMetrics {
  planExists: boolean;
  loopScore: number;
  planScore: number;
  executionRate: number;
  feedbackCoverage: number;
  adoptionRate: number;
  plannedPosts: number;
  analyzedPosts: number;
  feedbackCount: number;
  actionCount: number;
  actionAppliedCount: number;
}

interface PlanContextPayload {
  planSummary: PlanSummary | null;
  actualPerformance: {
    totalPosts: number;
    followerChange: number;
    avgEngagementRate: number;
    reach: number;
    saves: number;
  };
}

interface OverviewHighlight {
  label: string;
  value: string;
  change: string;
  context?: string;
}

interface AnalysisOverview {
  summary: string;
  highlights: OverviewHighlight[];
  watchouts: string[];
  planReflection?: PlanReflection | null;
}

function parseFirestoreDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    try {
      const converted = (value as { toDate: () => Date }).toDate();
      return converted instanceof Date ? converted : null;
    } catch {
      return null;
    }
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

function clamp(value: number, min = 0, max = 1): number {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function getPeriodRange(
  period: "weekly" | "monthly",
  date: string
): { start: Date; end: Date } | null {
  if (period === "monthly") {
    const match = date.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      const year = Number.parseInt(match[1], 10);
      const month = Number.parseInt(match[2], 10) - 1;
      if (!Number.isNaN(year) && !Number.isNaN(month)) {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 1);
        return { start, end };
      }
    }
    const parsed = new Date(date);
    if (!Number.isNaN(parsed.getTime())) {
      const start = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
      const end = new Date(parsed.getFullYear(), parsed.getMonth() + 1, 1);
      return { start, end };
    }
    return null;
  }

  const match = date.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    return null;
  }
  const year = Number.parseInt(match[1], 10);
  const week = Number.parseInt(match[2], 10);
  if (Number.isNaN(year) || Number.isNaN(week)) {
    return null;
  }

  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayOfWeek = simple.getUTCDay() || 7;
  const isoWeekStart = new Date(simple);
  isoWeekStart.setUTCDate(simple.getUTCDate() + 1 - dayOfWeek);
  const start = new Date(
    isoWeekStart.getUTCFullYear(),
    isoWeekStart.getUTCMonth(),
    isoWeekStart.getUTCDate()
  );
  const end = new Date(start.getTime());
  end.setDate(start.getDate() + 7);
  return { start, end };
}

function parsePlanPeriodToMonths(planPeriod: string | undefined): number {
  if (!planPeriod || typeof planPeriod !== "string") {
    return 1;
  }

  const normalized = planPeriod.trim().toLowerCase();
  if (normalized.includes("年")) {
    const match = normalized.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      const years = Number.parseFloat(match[1]);
      if (!Number.isNaN(years) && years > 0) {
        return Math.round(years * 12);
      }
    }
    return 12;
  }

  if (normalized.includes("週") || normalized.includes("week")) {
    const match = normalized.match(/(\d+)/);
    if (match) {
      const weeks = Number.parseInt(match[1], 10);
      if (!Number.isNaN(weeks) && weeks > 0) {
        return Math.max(1, Math.round(weeks / 4));
      }
    }
    return 1;
  }

  const numericMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  if (numericMatch) {
    const months = Number.parseFloat(numericMatch[1]);
    if (!Number.isNaN(months) && months > 0) {
      return Math.round(months);
    }
  }

  switch (normalized) {
    case "半期":
    case "半年":
      return 6;
    default:
      return 1;
  }
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setMonth(result.getMonth() + months);
  return result;
}

function resolveReferenceDate(period: "weekly" | "monthly", date: string): Date | null {
  if (!date) {
    return null;
  }

  if (period === "monthly") {
    const parsed = new Date(`${date}-01T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  // Weekly (YYYY-Wxx)
  const match = date.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    return null;
  }
  const year = Number.parseInt(match[1], 10);
  const week = Number.parseInt(match[2], 10);
  if (Number.isNaN(year) || Number.isNaN(week)) {
    return null;
  }

  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const dayOfWeek = startOfYear.getUTCDay();
  const dayOffset = (week - 1) * 7;
  const isoWeekStartOffset = ((dayOfWeek <= 4 ? dayOfWeek : dayOfWeek - 7) - 1) * -1;
  const reference = new Date(startOfYear.getTime());
  reference.setUTCDate(reference.getUTCDate() + dayOffset + isoWeekStartOffset);
  return reference;
}

function derivePostCountFromContentStats(
  stats?: Record<string, unknown> | null
): number {
  if (!stats) {
    return 0;
  }
  const numericKeys = [
    "totalLikes",
    "totalComments",
    "totalShares",
    "totalReach",
    "totalSaves",
    "totalFollowerIncrease",
    "totalInteractionCount",
    "totalReachedAccounts",
    "totalPlayTimeSeconds",
  ];
  const record = stats as Record<string, unknown>;
  const hasSignal = numericKeys.some((key) => {
    const value = record[key];
    return typeof value === "number" && Number.isFinite(value) && value > 0;
  });
  if (!hasSignal) {
    return 0;
  }
  const explicit = record["totalPosts"];
  if (typeof explicit === "number" && Number.isFinite(explicit) && explicit > 0) {
    return Math.round(explicit);
  }
  return 1;
}

async function fetchPlanSummaryForPeriod(
  userId: string,
  period: "weekly" | "monthly",
  date: string,
  snsType: string = "instagram"
): Promise<PlanSummary | null> {
  try {
    const db = getAdminDb();
    let query = db
      .collection("plans")
      .where("userId", "==", userId)
      .where("snsType", "==", snsType);

    // Firestore orderBy requires indexed fields; attempt to order by updatedAt, fallback to createdAt
    try {
      query = query.orderBy("updatedAt", "desc");
    } catch (error) {
      console.warn("plans orderBy(updatedAt) failed, fallback to createdAt:", error);
      query = query.orderBy("createdAt", "desc");
    }

    const snapshot = await query.limit(12).get();
    if (snapshot.empty) {
      return null;
    }

    const referenceDate = resolveReferenceDate(period, date);

    const plans = snapshot.docs
      .map((doc) => {
        const data = doc.data() || {};
        const createdAt = parseFirestoreDate(data.createdAt) ?? new Date();
        const updatedAt = parseFirestoreDate(data.updatedAt) ?? createdAt;
        const periodLabel =
          typeof data.planPeriod === "string"
            ? data.planPeriod
            : typeof data.formData?.planPeriod === "string"
              ? (data.formData.planPeriod as string)
              : "1ヶ月";
        const months = parsePlanPeriodToMonths(periodLabel);
        const planStart = createdAt;
        const planEnd = addMonths(planStart, Math.max(1, months));
        let simulationSummary: string | undefined;
        if (typeof data.simulationResult?.summary === "string") {
          simulationSummary = data.simulationResult.summary;
        } else if (typeof data.simulationResult?.headline === "string") {
          simulationSummary = data.simulationResult.headline;
        }
        const summary: PlanSummary = {
          id: doc.id,
          title: typeof data.title === "string" ? data.title : "運用計画",
          status: typeof data.status === "string" ? data.status : "active",
          snsType: typeof data.snsType === "string" ? data.snsType : snsType,
          planPeriod: periodLabel,
          targetFollowers: Number.parseInt(data.targetFollowers ?? 0, 10) || 0,
          currentFollowers: Number.parseInt(data.currentFollowers ?? 0, 10) || 0,
          targetAudience: typeof data.targetAudience === "string" ? data.targetAudience : undefined,
          strategies: Array.isArray(data.strategies) ? data.strategies : [],
          postCategories: Array.isArray(data.postCategories) ? data.postCategories : [],
          planStartDate: planStart.toISOString(),
          planEndDate: planEnd.toISOString(),
          simulationSummary,
          formData: typeof data.formData === "object" ? (data.formData as Record<string, unknown>) : null,
        };
        return {
          summary,
          planStart,
          planEnd,
          updatedAt,
        };
      })
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    if (plans.length === 0) {
      return null;
    }

    if (referenceDate) {
      const matched = plans.find(
        (plan) => referenceDate >= plan.planStart && referenceDate <= plan.planEnd
      );
      if (matched) {
        return matched.summary;
      }
    }

    return plans[0].summary;
  } catch (error) {
    console.error("運用計画の取得に失敗しました:", error);
    return null;
  }
}

async function fetchScheduleStats(
  db: FirebaseFirestore.Firestore,
  userId: string
): Promise<{ monthlyPosts: number } | null> {
  try {
    const scheduleDoc = await db.collection("userSchedules").doc(userId).get();
    if (!scheduleDoc.exists) {
      return null;
    }
    const data = scheduleDoc.data() || {};

    const extractMonthlyPosts = (entry: any): number => {
      if (!entry) {
        return 0;
      }
      const monthly = toNumber(entry.monthlyPosts);
      if (monthly > 0) {
        return monthly;
      }
      if (Array.isArray(entry.schedule)) {
        const weeklyPosts = entry.schedule.reduce((acc: number, day: any) => {
          if (!day || !Array.isArray(day.posts)) {
            return acc;
          }
          return acc + day.posts.length;
        }, 0);
        return weeklyPosts > 0 ? weeklyPosts * 4 : 0;
      }
      return 0;
    };

    const feedPosts = extractMonthlyPosts(data.feedSchedule);
    const reelPosts = extractMonthlyPosts(data.reelSchedule);
    const storyPosts = extractMonthlyPosts(data.storySchedule);

    return {
      monthlyPosts: feedPosts + reelPosts + storyPosts,
    };
  } catch (error) {
    console.error("運用スケジュール取得エラー:", error);
    return null;
  }
}
function createDefaultMasterContext(userId: string): MasterContext {
  return {
    userId,
    totalInteractions: 0,
    ragHitRate: 0,
    learningPhase: "initial",
    personalizedInsights: [
      "AI分析を開始しました",
      "データが蓄積されるほど精度が向上します",
      "継続的な投稿で成長を追跡できます",
    ],
    recommendations: [
      "AIとの対話を継続して学習を促進しましょう",
      "過去の成功パターンを活用した戦略を試してください",
      "まずは投稿データを蓄積しましょう",
    ],
    lastUpdated: new Date(),
    feedbackStats: {
      total: 0,
      positiveRate: 0,
      averageWeight: 0,
    },
    actionStats: {
      total: 0,
      adoptionRate: 0,
      averageResultDelta: 0,
    },
    postPatterns: {
      signals: [],
      summaries: {},
      topHashtags: {},
    },
    timeline: [],
    weeklyTimeline: [],
    achievements: [],
  };
}

function sanitizeActionPlanPriority(priority: string | undefined): ActionPlanPriority {
  if (priority === "high" || priority === "medium" || priority === "low") {
    return priority;
  }
  return "medium";
}

function generateFallbackActionPlans(
  alerts: AnalysisAlert[],
  postTypeHighlights: PostTypeHighlight[]
): ActionPlan[] {
  const plans: ActionPlan[] = [];

  const criticalOrWarningAlerts = alerts.filter(
    (alert) => alert.severity === "critical" || alert.severity === "warning"
  );

  criticalOrWarningAlerts.slice(0, 2).forEach((alert, index) => {
    plans.push({
      id: `alert-plan-${alert.id}-${index}`,
      title:
        alert.severity === "critical"
          ? `${alert.metric}の緊急改善`
          : `${alert.metric}の優先改善`,
      description: alert.message,
      priority: alert.severity === "critical" ? "high" : "medium",
      focusArea: alert.metric,
      expectedImpact:
        alert.severity === "critical"
          ? "直ちに改善しないと成長が鈍化する可能性があります。"
          : "早期に対処することで指標の落ち込みを食い止められます。",
      recommendedActions: [
        alert.metric.includes("投稿")
          ? "投稿頻度とコンテンツテーマを見直す"
          : "直近の投稿を振り返り、トーンやクリエイティブを調整する",
        "効果が高かった投稿のパターンを再利用する",
      ],
    });
  });

  const weakHighlights = postTypeHighlights.filter((highlight) => highlight.status === "weak");
  const strongHighlights = postTypeHighlights.filter((highlight) => highlight.status === "strong");

  if (weakHighlights.length > 0) {
    const weak = weakHighlights[0];
    plans.push({
      id: `highlight-plan-${weak.id}`,
      title: `${weak.label}の改善施策`,
      description: weak.message,
      priority: "medium",
      focusArea: weak.label,
      expectedImpact: "投稿タイプのバランスを整え、エンゲージメント低下を抑えられます。",
      recommendedActions: [
        `${weak.label}の投稿内容やフォーマットを見直す`,
        "好調な投稿タイプの要素を取り入れてABテストする",
      ],
    });
  }

  if (strongHighlights.length > 0) {
    const strong = strongHighlights[0];
    plans.push({
      id: `double-down-${strong.id}`,
      title: `${strong.label}を強化する`,
      description: strong.message,
      priority: "medium",
      focusArea: strong.label,
      expectedImpact: "成果が出ている投稿タイプを伸ばし、フォロワー増加につなげます。",
      recommendedActions: [
        `${strong.label}の投稿頻度を増やし、成功パターンを再利用する`,
        "広告やキャンペーンと連動させてリーチを拡大する",
      ],
    });
  }

  if (plans.length === 0) {
    plans.push({
      id: "baseline-plan",
      title: "次の打ち手を検討しましょう",
      description:
        "顕著なリスクは見つかりませんでした。投稿計画とコンテンツの質を維持しながら、小さな改善を継続してください。",
      priority: "low",
      focusArea: "全体運用",
      expectedImpact: "運用の安定性を保ちながら、成長の基盤を築きます。",
      recommendedActions: [
        "これまでの成功投稿を振り返り、学びを整理する",
        "投稿カレンダーを定期的に見直して改善点を洗い出す",
      ],
    });
  }

  return plans;
}

async function generateAIActionPlans(
  context: {
    period: "weekly" | "monthly";
    date: string;
    totals: ReportSummary["totals"];
    changes: ReportSummary["changes"];
    alerts: AnalysisAlert[];
    postTypeHighlights: PostTypeHighlight[];
    confidence: {
      score: number;
      dataPointCount: number;
      historicalHitRate: number;
    };
    masterContext: MasterContext | null;
    userProfile: Record<string, unknown> | null;
  }
): Promise<ActionPlan[]> {
  try {
    const payload = JSON.stringify(context, null, 2);
    const prompt = `以下はInstagram運用の総合分析データです。優先度の高いアクションプランを最大3件生成し、必ず次のJSON形式のみで回答してください。\n\n分析データ:\n${payload}\n\n出力形式:\n{\n  "actionPlans": [\n    {\n      "id": "string（ユニーク）",\n      "title": "string",\n      "description": "string",\n      "priority": "high" | "medium" | "low",\n      "focusArea": "string",\n      "expectedImpact": "string",\n      "recommendedActions": ["string", ...]\n    }\n  ]\n}\n\n制約:\n- JSON以外の文字列や説明は一切出力しない\n- recommendedActionsは日本語の具体的な提案を少なくとも2つ含める\n- priorityはhigh/medium/lowのいずれか\n- idは重複しないようにする`;

    const response = await callOpenAI(prompt);
    const parsed = JSON.parse(response);
    const plansSource = Array.isArray(parsed?.actionPlans)
      ? parsed.actionPlans
      : Array.isArray(parsed)
        ? parsed
        : [];

    const typedPlanSource = plansSource as Array<Record<string, unknown>>;

    const plans: ActionPlan[] = typedPlanSource
      .map((plan, index): ActionPlan | null => {
        if (!plan || typeof plan !== "object") {
          return null;
        }

        const recommendedActions = Array.isArray(plan.recommendedActions)
          ? (plan.recommendedActions as unknown[]).filter(
              (action): action is string => typeof action === "string" && action.trim().length > 0
            )
          : [];

        if (!plan.title || recommendedActions.length === 0) {
          return null;
        }

        return {
          id:
            typeof plan.id === "string" && plan.id.trim().length > 0
              ? plan.id
              : `ai-plan-${index}`,
          title: String(plan.title),
          description: typeof plan.description === "string" ? plan.description : "",
          priority: sanitizeActionPlanPriority(
            typeof plan.priority === "string" ? plan.priority : undefined
          ),
          focusArea: typeof plan.focusArea === "string" ? plan.focusArea : "全体",
          expectedImpact:
            typeof plan.expectedImpact === "string"
              ? plan.expectedImpact
              : "改善インパクトの詳細は未設定です。",
          recommendedActions,
        };
      })
      .filter((plan): plan is ActionPlan => Boolean(plan));

    return plans;
  } catch (error) {
    console.error("AIアクションプラン生成エラー:", error);
    return [];
  }
}

function buildMetricHighlights(
  totals: ReportSummary["totals"] | undefined,
  changes: ReportSummary["changes"] | undefined
): OverviewHighlight[] {
  if (!totals || !changes) {
    return [];
  }

  const metricConfigs: Array<{
    key: keyof typeof changes;
    label: string;
    value: number | undefined;
    formatter: (value: number | undefined) => string;
  }> = [
    {
      key: "followerChange",
      label: "フォロワー増減",
      value: totals.totalFollowerIncrease,
      formatter: (value) => `${(value ?? 0).toLocaleString()}人`,
    },
    {
      key: "reachChange",
      label: "リーチ",
      value: totals.totalReach,
      formatter: (value) => `${(value ?? 0).toLocaleString()}人`,
    },
    {
      key: "engagementRateChange",
      label: "平均エンゲージメント率",
      value: totals.avgEngagementRate,
      formatter: (value) => `${((value ?? 0) * 100).toFixed(2)}%`,
    },
    {
      key: "likesChange",
      label: "いいね",
      value: totals.totalLikes,
      formatter: (value) => `${(value ?? 0).toLocaleString()}件`,
    },
    {
      key: "postsChange",
      label: "投稿数",
      value: totals.totalPosts,
      formatter: (value) => `${(value ?? 0).toLocaleString()}件`,
    },
  ];

  const highlightCandidates = metricConfigs
    .map((config) => {
      const changeValue = changes[config.key] ?? 0;
      return {
        label: config.label,
        value: config.formatter(config.value),
        change: `${changeValue >= 0 ? "+" : ""}${changeValue.toFixed(1)}%`,
        absChange: Math.abs(changeValue),
      };
    })
    .filter((item) => item.absChange > 0);

  return highlightCandidates
    .sort((a, b) => b.absChange - a.absChange)
    .slice(0, 3)
    .map(({ absChange, ...rest }) => rest);
}

function generateFallbackOverview(
  totals: ReportSummary["totals"] | undefined,
  changes: ReportSummary["changes"] | undefined,
  alerts: AnalysisAlert[],
  postTypeHighlights: PostTypeHighlight[],
  planContext?: PlanContextPayload
): AnalysisOverview {
  const summary =
    (totals?.totalPosts || 0) === 0
      ? "今月は投稿が確認できません。まずは投稿を再開し、アカウントスコアの底上げを図りましょう。"
      : `今月の投稿数は${totals?.totalPosts ?? 0}件。フォロワー増減は${(totals?.totalFollowerIncrease ?? 0).toLocaleString()}人です。`;

  const highlights = buildMetricHighlights(totals, changes);

  const watchouts: string[] = [];
  alerts
    .filter((alert) => alert.severity !== "info")
    .slice(0, 2)
    .forEach((alert) => {
      watchouts.push(`⚠️ ${alert.metric}: ${alert.message}`);
    });

  postTypeHighlights
    .filter((highlight) => highlight.status === "strong")
    .slice(0, 1)
    .forEach((highlight) => {
      watchouts.push(`✅ ${highlight.label}: ${highlight.message}`);
    });

  if (watchouts.length === 0) {
    watchouts.push("特筆すべきリスクはありません。安定運用を継続しましょう。");
  }

  let planReflection: PlanReflection | null = null;
  if (planContext?.planSummary) {
    planReflection = {
      summary:
        "AIサマリーの生成に失敗したため、運用計画との振り返りは手動で確認してください。投稿数とフォロワー指標が計画と乖離していないかチェックしましょう。",
      status: "at_risk",
      checkpoints: [],
      nextSteps: ["計画の目標と今月の実績を照らし合わせ、優先施策を再確認してください。"],
    };
  } else if (planContext) {
    planReflection = {
      summary: "運用計画がまだ設定されていないため、振り返りを生成できません。",
      status: "no_plan",
      checkpoints: [],
      nextSteps: ["まずは運用計画を作成し、目標と戦略を定義しましょう。"],
    };
  }

  return {
    summary,
    highlights,
    watchouts,
    planReflection,
  };
}

async function generateAIOverview(
  context: {
    period: "weekly" | "monthly";
    date: string;
    totals: ReportSummary["totals"];
    previousTotals: ReportSummary["previousTotals"] | undefined;
    changes: ReportSummary["changes"];
    alerts: AnalysisAlert[];
    postTypeHighlights: PostTypeHighlight[];
    timeSlotAnalysis: ReportSummary["timeSlotAnalysis"];
    bestTimeSlot: ReportSummary["bestTimeSlot"] | undefined;
    hashtagStats: ReportSummary["hashtagStats"];
    confidence: {
      score: number;
      dataPointCount: number;
      historicalHitRate: number;
    };
    postPatterns?: {
      summaries: Partial<Record<PostPerformanceTag, PatternSummary>>;
      topHashtags: Record<string, number>;
    };
    planContext?: PlanContextPayload;
    reachSourceAnalysis?: {
      sources?: {
        posts?: number;
        profile?: number;
        explore?: number;
        search?: number;
        other?: number;
      };
      followers?: {
        followers?: number;
        nonFollowers?: number;
      };
    };
    contentPerformance?: {
      feed?: {
        totalProfileVisits?: number;
        totalReachedAccounts?: number;
        totalReach?: number;
      } | null;
      reel?: {
        totalReachedAccounts?: number;
        totalReach?: number;
      } | null;
    };
    postDeepDive?: Array<{
      title?: string;
      analyticsSummary?: {
        reach?: number;
        saves?: number;
        engagementRate?: number;
      } | null;
    }>;
  }
): Promise<AnalysisOverview | null> {
  try {
    // 月の情報を取得
    const currentDate = new Date(context.date + "-01");
    const currentMonth = currentDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
    const nextMonthDate = new Date(currentDate);
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonth = nextMonthDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
    
    const payload = JSON.stringify(context, null, 2);
    const planStrategyReviewTemplate = `📊 Instagram運用レポート（${currentMonth}総括）

⸻

🔹 アカウント全体の動き
	•	閲覧数：{数値}人（context.totals.totalReachから取得。KPIコンソールの「閲覧数総数」と同じ値）
	•	フォロワー外リーチ率：{数値}％（context.reachSourceAnalysis.followers.nonFollowersとcontext.reachSourceAnalysis.followers.followersから計算。nonFollowers / (followers + nonFollowers) * 100。データがない場合は計算できない）
	•	総リーチ数：{数値}（context.totals.totalReachから取得。閲覧数と同じ値）
	•	プロフィールアクティビティ：{数値}（前月比{変化率}％）（context.contentPerformance.feed.totalProfileVisitsから取得。前月比はcontext.previousTotalsと比較して計算。データがない場合は「データ未取得」と記載）

{全体的な評価コメント（2-3文）}

⸻

🔹 コンテンツ別の傾向
	•	{投稿タイプ}が最も多く見られ（全体の{割合}％）、
次いで{投稿タイプ}、最後に{投稿タイプ}が続きます。（postTypeStatsから取得）
	•	もっとも閲覧されたコンテンツは「{投稿タイトル}」投稿で、{数値}回再生／閲覧。（postDeepDiveやpostsから最高リーチの投稿を特定）
{傾向の説明（1-2文）}

⸻

💡 総評

${currentMonth}は全体的に{評価}で、
特に{強調ポイント}が目立つ結果でした。
また、{具体的な傾向}が高い反応を得ており、
アカウントの方向性がしっかり定まりつつあります。

⸻

📈 ${nextMonth}に向けた提案
	1.	{提案1のタイトル}
　{提案1の説明}
　→ {具体的なアクション}
	2.	{提案2のタイトル}
　{提案2の説明}
	3.	{提案3のタイトル}
　{提案3の説明}`;

    const prompt = `以下のInstagram運用データを分析し、要約と重要指標を生成してください。必ずJSONのみを出力し、余計なテキストは含めないでください。

現在の月: ${currentMonth}
来月: ${nextMonth}

分析データ:
${payload}

出力形式:
{
  "summary": "120文字以内の今月のまとめ",
  "highlights": [
    {
      "label": "指標名",
      "value": "現在値（フォーマット済み）",
      "change": "+12.3% などの前期比"
    }
  ],
  "watchouts": [
    "注意すべきポイントや好調ポイントを一言コメント"
  ],
  "planReflection": {
    "summary": "運用計画に対する振り返り文（80文字以内）",
    "status": "on_track | at_risk | off_track | no_plan",
    "checkpoints": [
      {
        "label": "比較項目名（投稿頻度、フォロワー増など）",
        "target": "計画上の目標値",
        "actual": "実績値や結果",
        "status": "met | partial | missed | no_data"
      }
    ],
    "nextSteps": [
      "来月に向けた具体的アクション（60文字以内）"
    ],
    "planStrategyReview": "【必須】以下の形式で出力してください。必ずこのフィールドに値を設定してください:\n\n${planStrategyReviewTemplate}\n\nデータ取得方法:\n- 閲覧数・総リーチ数: context.totals.totalReach（KPIコンソールの「閲覧数総数」と同じ）\n- フォロワー外リーチ率: context.reachSourceAnalysis.followers から計算（データがない場合は「データ未取得」）\n- プロフィールアクティビティ: context.contentPerformance.feed.totalProfileVisits（データがない場合は「データ未取得」）\n- context.totals にはKPIコンソールのデータ（totalLikes、totalComments、totalShares、totalReach、totalFollowerIncrease）が含まれています\n\n必ず実績データを確認し、正確な数値を記載してください。"
  ]
}

制約:
- summaryは120文字以内の自然な日本語文
- highlightsは最大3件。符号付き%を含め、重要度順に並べる
- watchoutsは最大3件。リスク・好調・次に見るべき点などを短く書く
- planReflection.checkpointsは最大3件、nextStepsは最大3件
- 運用計画データが存在しない場合は、statusを"no_plan"にし、checkpointsとnextStepsを空配列にする
- 運用計画がある場合は、目標と実績の差分を簡潔にまとめ、statusを適切に設定する（達成:on_track, 一部未達:at_risk, 未達:off_track）
- planReflection.planStrategyReviewは必須フィールドです。上記の形式に従って、以下の内容を含めてください：
  1. 📊 Instagram運用レポート（${currentMonth}総括）の見出し
  2. 🔹 アカウント全体の動き：
     - 閲覧数: context.totals.totalReach の値をそのまま使用（KPIコンソールの「閲覧数総数」と同じ値）。数値が存在する場合は必ずその数値を記載し、0の場合は0と記載
     - フォロワー外リーチ率: context.reachSourceAnalysis.followers.nonFollowers と context.reachSourceAnalysis.followers.followers から計算（nonFollowers / (followers + nonFollowers) * 100）。データがない場合は「データ未取得」
     - 総リーチ数: context.totals.totalReach の値をそのまま使用（閲覧数と同じ値）。数値が存在する場合は必ずその数値を記載し、0の場合は0と記載
     - プロフィールアクティビティ: context.contentPerformance.feed.totalProfileVisits から取得。前月比は context.previousTotals と比較して計算（前月の値がない場合は「前月比なし」と記載）。データがない場合は「データ未取得」
  3. 🔹 コンテンツ別の傾向：context.postTypeHighlights または context 内の postTypeStats から投稿タイプ別の割合と、context.postDeepDive から最高リーチの投稿を特定
  4. 💡 総評：${currentMonth}の全体的な評価と、計画の「取り組みたいこと」「投稿したい内容」との整合性を評価（2-3文）
  5. 📈 ${nextMonth}に向けた提案：具体的なアクションプランを3つ提示（各提案はタイトルと説明、具体的なアクションを含む）
  
  【重要】context.totals にはKPIコンソールのデータが含まれています（totalLikes、totalComments、totalShares、totalReach、totalFollowerIncreaseなど）。これらのデータを必ず確認し、正確な数値を記載してください。データが0の場合は0と記載し、「データ未取得」とは書かないでください。実績データ（context.totals、context.changes、context.postTypeHighlights、context.postDeepDive、context.reachSourceAnalysis、context.contentPerformanceなど）を必ず確認し、正確な数値を記載してください。フォロワー増加が正の値の場合は「増加が見込めない」などと書かないでください。計画データがない場合やstrategies/postCategoriesが空の場合は、実績データのみに基づいて総評を作成してください
- 【重要】planStrategyReviewを書く際は、必ず実績データ（totals.totalFollowerIncrease、totals.totalLikes、totals.totalReachなど）を確認してください。フォロワー増加が正の値（増加している）場合は「フォロワー増加につながらない」「増加が見込めない」などと書かないでください。実績データと矛盾する表現は絶対に避けてください。実績が好調な場合はそれを正しく評価し、改善が必要な場合のみ改善提案をしてください
- JSON以外の文字は出力しない`;

    const response = await callOpenAI(prompt);
    const parsed = JSON.parse(response);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim().length > 0
        ? parsed.summary.trim()
        : "";

    const highlightsRaw = Array.isArray(parsed.highlights)
      ? (parsed.highlights as Array<Record<string, unknown>>)
      : [];
    const highlights: OverviewHighlight[] = highlightsRaw
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const label =
          typeof item.label === "string" && item.label.trim().length > 0
            ? item.label.trim()
            : null;
        const value =
          typeof item.value === "string" && item.value.trim().length > 0
            ? item.value.trim()
            : null;
        const change =
          typeof item.change === "string" && item.change.trim().length > 0
            ? item.change.trim()
            : null;

        if (!label || !value || !change) {
          return null;
        }

        const formatted: OverviewHighlight = {
          label,
          value,
          change,
        };

        if (typeof item.context === "string" && item.context.trim().length > 0) {
          formatted.context = item.context.trim();
        }

        return formatted;
      })
      .filter((item): item is OverviewHighlight => Boolean(item))
      .slice(0, 3);

    const watchoutsRaw = Array.isArray(parsed.watchouts)
      ? (parsed.watchouts as Array<unknown>)
      : [];
    const watchouts = watchoutsRaw
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item: string) => item.trim())
      .slice(0, 3);

    let planReflection: PlanReflection | null = null;
    if (parsed.planReflection && typeof parsed.planReflection === "object") {
      const rawPlanReflection = parsed.planReflection as Record<string, unknown>;
      const allowedStatuses: PlanReflectionStatus[] = ["on_track", "at_risk", "off_track", "no_plan"];
      const statusRaw =
        typeof rawPlanReflection.status === "string" ? rawPlanReflection.status.trim() : "at_risk";
      const status = (allowedStatuses.includes(statusRaw as PlanReflectionStatus)
        ? (statusRaw as PlanReflectionStatus)
        : "at_risk") as PlanReflectionStatus;

      const checkpointsRaw = Array.isArray(rawPlanReflection.checkpoints)
        ? (rawPlanReflection.checkpoints as Array<Record<string, unknown>>)
        : [];
      const checkpoints: PlanCheckpoint[] = checkpointsRaw
        .map((checkpoint) => {
          if (!checkpoint || typeof checkpoint !== "object") {
            return null;
          }
          const label =
            typeof checkpoint.label === "string" && checkpoint.label.trim().length > 0
              ? checkpoint.label.trim()
              : null;
          const target =
            typeof checkpoint.target === "string" && checkpoint.target.trim().length > 0
              ? checkpoint.target.trim()
              : null;
          const actual =
            typeof checkpoint.actual === "string" && checkpoint.actual.trim().length > 0
              ? checkpoint.actual.trim()
              : null;
          const statusCandidate =
            typeof checkpoint.status === "string" ? checkpoint.status.trim() : "no_data";
          const allowedCheckpointStatuses: PlanCheckpointStatus[] = [
            "met",
            "partial",
            "missed",
            "no_data",
          ];
          const checkpointStatus = (allowedCheckpointStatuses.includes(
            statusCandidate as PlanCheckpointStatus
          )
            ? (statusCandidate as PlanCheckpointStatus)
            : "no_data") as PlanCheckpointStatus;

          if (!label || !target || !actual) {
            return null;
          }

          return {
            label,
            target,
            actual,
            status: checkpointStatus,
          };
        })
        .filter((checkpoint): checkpoint is PlanCheckpoint => Boolean(checkpoint))
        .slice(0, 3);

      const nextStepsRaw = Array.isArray(rawPlanReflection.nextSteps)
        ? (rawPlanReflection.nextSteps as Array<unknown>)
        : [];
      const nextSteps = nextStepsRaw
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim())
        .slice(0, 3);

      const summaryValue =
        typeof rawPlanReflection.summary === "string" ? rawPlanReflection.summary.trim() : "";

      const planStrategyReviewValue =
        typeof rawPlanReflection.planStrategyReview === "string"
          ? rawPlanReflection.planStrategyReview.trim()
          : "";
      
      // planStrategyReviewが空の場合は、デフォルトメッセージを設定
      const finalPlanStrategyReview = planStrategyReviewValue || 
        (status === "no_plan" 
          ? "運用計画が未設定のため、総評を生成できませんでした。" 
          : "総評の生成に失敗しました。実績データを確認してください。");

      planReflection = {
        summary: summaryValue || (status === "no_plan" ? "運用計画が未設定のため振り返りはありません。" : ""),
        status,
        checkpoints,
        nextSteps,
        planStrategyReview: finalPlanStrategyReview,
      };
    }

    if (!planReflection) {
      if (context.planContext?.planSummary) {
        planReflection = {
          summary:
            "運用計画との振り返りを生成できませんでした。目標と今月の実績を照らし合わせて確認してください。",
          status: "at_risk",
          checkpoints: [],
          nextSteps: ["投稿数とフォロワー推移を確認し、来月の打ち手を再定義しましょう。"],
          planStrategyReview: "総評の生成に失敗しました。実績データを確認してください。",
        };
      } else if (context.planContext) {
        planReflection = {
          summary: "運用計画が未設定のため、振り返りを表示できません。",
          status: "no_plan",
          checkpoints: [],
          nextSteps: ["まずは運用計画を作成して目標を明確にしましょう。"],
          planStrategyReview: "運用計画が未設定のため、総評を生成できませんでした。",
        };
      }
    }
    
    // planReflectionが存在するがplanStrategyReviewがない場合のフォールバック
    if (planReflection && !planReflection.planStrategyReview) {
      planReflection.planStrategyReview = 
        planReflection.status === "no_plan"
          ? "運用計画が未設定のため、総評を生成できませんでした。"
          : "総評の生成に失敗しました。実績データを確認してください。";
    }

    return {
      summary,
      highlights,
      watchouts,
      planReflection,
    };
  } catch (error) {
    console.error("AI概要生成エラー:", error);
    return null;
  }
}

async function saveOverviewHistoryEntry(
  userId: string,
  period: "weekly" | "monthly",
  date: string,
  overview: AnalysisOverview,
  actionPlans: ActionPlan[],
  totals: ReportSummary["totals"],
  changes: ReportSummary["changes"],
  confidence: {
    score: number;
    dataPointCount: number;
    historicalHitRate: number;
  },
  generation: AIGenerationResponse | null
) {
  try {
    const db = getAdminDb();
    const docId = `${userId}_${period}_${date}`;
    const docRef = db.collection("ai_overview_history").doc(docId);
    const existing = await docRef.get();

    await docRef.set({
      userId,
      period,
      date,
      overview,
      actionPlans,
      generation: generation ?? null,
      totalsSnapshot: totals || {},
      changesSnapshot: changes || {},
      confidenceSnapshot: confidence,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: existing.exists
        ? existing.data()?.createdAt ?? admin.firestore.FieldValue.serverTimestamp()
        : admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("AI概要履歴の保存に失敗しました:", error);
  }
}

// AI分析を実行
async function performAIAnalysis(
  reportSummary: ReportSummary | null,
  masterContext: MasterContext | null,
  period: "weekly" | "monthly",
  date: string,
  planSummary: PlanSummary | null,
  userId: string | undefined,
  aiContext: AIContextBundle
): Promise<{
  predictions: {
    followerGrowth: { weekly: number; monthly: number };
    engagementRate: number;
    optimalPostingTime: string;
  };
  confidence: {
    score: number;
    dataPointCount: number;
    historicalHitRate: number;
  };
  alerts: AnalysisAlert[];
  postTypeHighlights: PostTypeHighlight[];
  actionPlans: ActionPlan[];
  overview: AnalysisOverview;
  insights: string[];
  recommendations: string[];
  summary: string;
  pdcaMetrics: PDCAMetrics | null;
  generation: AIGenerationResponse | null;
}> {
  // レポートサマリーからデータを取得
  const totals = { ...(reportSummary?.totals || {}) };
  const changes = reportSummary?.changes || {};

  const totalLikes = totals.totalLikes || 0;
  const totalComments = totals.totalComments || 0;
  const totalShares = totals.totalShares || 0;
  const totalReach = totals.totalReach || 0;
  let totalPosts = totals.totalPosts || 0;
  // 総合エンゲージメント（総和）を明示的に計算して totals に追加
  const totalEngagement =
    (totals.totalLikes || 0) +
    (totals.totalComments || 0) +
    (totals.totalShares || 0) +
    (totals.totalSaves || 0);
  (totals as any).totalEngagement = totalEngagement;
  const summaryExtras = reportSummary as
    | {
        postDeepDive?: unknown[];
        posts?: unknown[];
        contentPerformance?: {
          feed?: Record<string, unknown> | null;
          reel?: Record<string, unknown> | null;
        };
      }
    | null
    | undefined;
  const postDeepDiveCount = Array.isArray(summaryExtras?.postDeepDive)
    ? summaryExtras?.postDeepDive.length
    : 0;
  const postsCollectionCount = Array.isArray(summaryExtras?.posts)
    ? summaryExtras?.posts.length
    : 0;
  const feedDerivedPosts = derivePostCountFromContentStats(summaryExtras?.contentPerformance?.feed);
  const reelDerivedPosts = derivePostCountFromContentStats(summaryExtras?.contentPerformance?.reel);
  // KPI分解（posts）がある場合も考慮
  const kpiPosts =
    Array.isArray((reportSummary as any)?.kpiBreakdowns)
      ? Number(
          ((reportSummary as any).kpiBreakdowns as Array<{ key?: string; value?: unknown }>)
            .find((k) => k?.key === "posts")?.value ?? 0
        )
      : 0;
  const inferredPostCount = Math.max(
    totalPosts,
    postDeepDiveCount,
    postsCollectionCount,
    feedDerivedPosts + reelDerivedPosts,
    kpiPosts
  );
  totalPosts = inferredPostCount;
  totals.totalPosts = totalPosts;

  // 追加: BFF直集計（Firestoreから当月投稿数を直接カウント）を最優先で採用
  try {
    if (userId && period === "monthly" && typeof date === "string" && /^\d{4}-\d{2}$/.test(date)) {
      const [y, m] = date.split("-");
      const year = Number(y);
      const monthIndex = Number(m) - 1;
      if (!Number.isNaN(year) && !Number.isNaN(monthIndex)) {
        const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
        const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));
        const startTs = admin.firestore.Timestamp.fromDate(start);
        const endTs = admin.firestore.Timestamp.fromDate(end);
        const postsSnap = await getAdminDb()
          .collection("posts")
          .where("userId", "==", userId)
          .where("createdAt", ">=", startTs)
          .where("createdAt", "<", endTs)
          .get();
        const directCount = postsSnap.size;
        if (directCount > 0) {
          totalPosts = Math.max(totalPosts, directCount);
          totals.totalPosts = totalPosts;
        }
      }
    }
  } catch (e) {
    console.warn("⚠️ 直集計(totalPosts)に失敗しましたが継続します:", e);
  }
  if (totalPosts === 0) {
    const postSamples = [
      ...(Array.isArray(summaryExtras?.postDeepDive) ? summaryExtras.postDeepDive : []),
      ...(Array.isArray(summaryExtras?.posts) ? summaryExtras.posts : []),
    ];
    if (postSamples.length > 0) {
      totalPosts = postSamples.length;
      totals.totalPosts = totalPosts;
    }
  }
  const engagementRate = totals.avgEngagementRate || 0;
  const postTypeStats = reportSummary?.postTypeStats || [];
  const postTypeCountSum = Array.isArray(postTypeStats)
    ? postTypeStats.reduce((sum, item) => sum + (typeof item?.count === "number" ? item.count : 0), 0)
    : 0;
  const dataPointCount =
    (reportSummary?.totals?.totalPosts || 0) +
    (reportSummary?.hashtagStats?.length || 0) +
    (reportSummary?.postTypeStats?.length || 0);

  const db = getAdminDb();
  const userProfile = aiContext.userProfile ?? null;
  const userProfileForAI =
    (userProfile as unknown as Record<string, unknown> | null) ?? null;
  const analysisReferences: AIReference[] = [...aiContext.references];
  let scheduleStats: { monthlyPosts: number } | null = null;
  let feedbackDocs: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData>[] = [];
  let actionLogDocs: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData>[] = [];
  let pdcaMetrics: PDCAMetrics | null = null;

  if (userId) {
    try {
      scheduleStats = await fetchScheduleStats(db, userId);
      try {
        const feedbackSnapshot = await db
          .collection("ai_post_feedback")
          .where("userId", "==", userId)
          .orderBy("createdAt", "desc")
          .limit(200)
          .get();
        feedbackDocs = feedbackSnapshot.docs;
      } catch (feedbackError) {
        console.error("フィードバック取得エラー（PDCA計算用）:", feedbackError);
      }
      try {
        const actionSnapshot = await db
          .collection("ai_action_logs")
          .where("userId", "==", userId)
          .orderBy("updatedAt", "desc")
          .limit(200)
          .get();
        actionLogDocs = actionSnapshot.docs;
      } catch (actionError) {
        console.error("アクションログ取得エラー（PDCA計算用）:", actionError);
      }
    } catch (error) {
      console.error("ユーザーデータ取得エラー:", error);
    }
  }

  // マスターコンテキストの活用度を判定
  const isOptimized =
    (masterContext && masterContext.learningPhase === "optimized") ||
    masterContext?.learningPhase === "master";
  const ragHitRate = masterContext?.ragHitRate || 0;
  const historicalHitRate =
    ragHitRate > 0 ? ragHitRate : Math.min(0.6, (masterContext?.totalInteractions || 0) / 50);

  const normalizedDataVolume = Math.min(1, dataPointCount / 20);
  const confidenceScore = Number(
    Math.max(0.2, Math.min(1, normalizedDataVolume * 0.6 + (ragHitRate || 0.3) * 0.4)).toFixed(2)
  );

  const alerts: AnalysisAlert[] = [];

  const pushAlert = (alert: AnalysisAlert) => {
    alerts.push(alert);
  };

  // 投稿ゼロアラート: 実データがゼロのときのみ
  if (totalPosts === 0 && (totals.totalReach || 0) === 0) {
    pushAlert({
      id: "no-posts",
      metric: "投稿数",
      message: "期間中の投稿がありません。まずは投稿を実施しましょう。",
      severity: "critical",
      value: totalPosts,
    });
  }

  if ((changes.reachChange ?? 0) < -30) {
    pushAlert({
      id: "reach-drop",
      metric: "リーチ",
      message: `リーチが前期間比で${Math.abs(changes.reachChange ?? 0).toFixed(1)}%減少しています。投稿内容や時間帯を見直してください。`,
      severity: "warning",
      change: changes.reachChange,
    });
  }

  if ((changes.likesChange ?? 0) < -25) {
    pushAlert({
      id: "likes-drop",
      metric: "いいね",
      message: `いいね数が大きく減少しています。トレンドとずれていないか確認しましょう。`,
      severity: "warning",
      change: changes.likesChange,
    });
  }

  // ER低下アラート: データが十分なときのみ（分析済み3件以上相当）
  if (engagementRate < 1 && totalPosts >= 3 && (totals.totalReach || 0) > 0) {
    pushAlert({
      id: "low-engagement",
      metric: "エンゲージメント率",
      message:
        (totals as any)?.totalEngagement > 0
          ? "エンゲージメントは得られていますが効率が低めです。CTAや導線の調整を検討してください。"
          : "エンゲージメントがまだ十分ではありません。導入/構成の最適化を試してください。",
      severity: "info",
      value: engagementRate,
    });
  }

  if ((changes.postsChange ?? 0) < -40 && totalPosts > 0) {
    pushAlert({
      id: "post-frequency-drop",
      metric: "投稿本数",
      message: "投稿本数が大幅に減っています。安定した投稿頻度を維持しましょう。",
      severity: "warning",
      change: changes.postsChange,
    });
  }

  if (alerts.length === 0) {
    pushAlert({
      id: "no-alerts",
      metric: "健全性",
      message: "特筆すべきリスクはありません。引き続き現状を維持しましょう。",
      severity: "info",
    });
  }

  const postTypeHighlights: PostTypeHighlight[] = [];

  if (postTypeStats.length > 0) {
    const totalTypePosts = postTypeStats.reduce((sum, stat) => sum + (stat.count || 0), 0) || 1;
    const avgPercentage =
      postTypeStats.reduce((sum, stat) => sum + (stat.percentage || 0), 0) /
      postTypeStats.length;

    postTypeStats.forEach((stat) => {
      const percentage = typeof stat.percentage === "number"
        ? stat.percentage
        : ((stat.count || 0) / totalTypePosts) * 100;
      const deviation = percentage - avgPercentage;
      let status: PostTypeHighlightStatus = "neutral";
      let message = `${stat.label}は安定しています。`;

      if (deviation >= 5) {
        status = "strong";
        message = `${stat.label}は他の投稿タイプより反応が良好です。`;
      } else if (deviation <= -5) {
        status = "weak";
        message = `${stat.label}は伸び悩んでいます。改善が必要です。`;
      }

      postTypeHighlights.push({
        id: `post-type-${stat.type}`,
        type: stat.type,
        label: stat.label,
        status,
        percentage: Number(percentage.toFixed(1)),
        count: stat.count || 0,
        message,
      });
    });
  }

  const aiGeneratedActionPlans = await generateAIActionPlans({
    period,
    date,
    totals,
    changes,
    alerts,
    postTypeHighlights,
    confidence: {
      score: confidenceScore,
      dataPointCount,
      historicalHitRate: Number(historicalHitRate.toFixed(2)),
    },
    masterContext,
    userProfile: userProfileForAI,
  });

  const actionPlans =
    aiGeneratedActionPlans.length > 0
      ? aiGeneratedActionPlans
      : generateFallbackActionPlans(alerts, postTypeHighlights);

  const periodRange = getPeriodRange(period, date);
  // 分析済み件数を集計（posts/postDeepDive の analyticsSummary 有無でカウント）
  const analyzedPostsCount =
    Array.isArray((reportSummary as any)?.postDeepDive)
      ? ((reportSummary as any).postDeepDive as Array<{ analyticsSummary?: unknown }>).filter(
          (p) => !!p && !!(p as any).analyticsSummary
        ).length
      : Array.isArray((reportSummary as any)?.posts)
        ? ((reportSummary as any).posts as Array<{ analyticsSummary?: unknown }>).filter(
            (p) => !!p && !!(p as any).analyticsSummary
          ).length
        : 0;
  const analyzedInPeriod = analyzedPostsCount;

  const feedbackInPeriod = feedbackDocs.filter((doc) => {
    if (!periodRange) {
      return true;
    }
    const data = doc.data() || {};
    const createdAt = parseFirestoreDate(data.createdAt);
    return createdAt ? createdAt >= periodRange.start && createdAt < periodRange.end : false;
  });
  const feedbackCountInPeriod = feedbackInPeriod.length;

  const actionLogsInPeriod = actionLogDocs.filter((doc) => {
    if (!periodRange) {
      return true;
    }
    const data = doc.data() || {};
    const updatedAt = parseFirestoreDate(data.updatedAt) ?? parseFirestoreDate(data.createdAt);
    return updatedAt ? updatedAt >= periodRange.start && updatedAt < periodRange.end : false;
  });
  const actionCountInPeriod = actionLogsInPeriod.length;
  const actionAppliedCount = actionLogsInPeriod.filter((doc) => {
    const data = doc.data() || {};
    return Boolean(data.applied);
  }).length;

  // 計画投稿数を取得: 運用計画（Plan）のシミュレーション結果を優先、なければスケジュールから
  let plannedMonthlyPosts = 0;
  
  // 1. 運用計画（Plan）のシミュレーション結果から取得を試みる
  if (planSummary?.formData) {
    const formData = planSummary.formData;
    const simulationResult = formData.simulationResult as Record<string, unknown> | undefined;
    if (simulationResult && typeof simulationResult.monthlyPostCount === "number") {
      plannedMonthlyPosts = Math.max(0, Math.round(simulationResult.monthlyPostCount));
    } else {
      // シミュレーション結果がない場合、投稿頻度から計算
      const feedFreq = typeof formData.feedFreq === "number" ? formData.feedFreq : 0;
      const reelFreq = typeof formData.reelFreq === "number" ? formData.reelFreq : 0;
      const storyFreq = typeof formData.storyFreq === "number" ? formData.storyFreq : 0;
      const freqBasedMonthlyPosts = (feedFreq + reelFreq + storyFreq) * 4;
      if (freqBasedMonthlyPosts > 0) {
        plannedMonthlyPosts = Math.max(0, Math.round(freqBasedMonthlyPosts));
      }
    }
  }
  
  // 2. 運用計画から取得できない場合、スケジュールから取得（フォールバック）
  if (plannedMonthlyPosts === 0) {
    plannedMonthlyPosts = scheduleStats?.monthlyPosts ?? 0;
  }
  
  let plannedPostsForPeriod =
    period === "weekly"
      ? plannedMonthlyPosts > 0
        ? Math.max(1, Math.round(plannedMonthlyPosts / 4))
        : 0
      : plannedMonthlyPosts;
  plannedPostsForPeriod = Math.max(0, Math.round(plannedPostsForPeriod));

  const planExists = Boolean(planSummary);
  const planScore = planExists ? 1 : 0;
  const executionRate =
    plannedPostsForPeriod > 0
      ? clamp(analyzedInPeriod / Math.max(1, plannedPostsForPeriod))
      : analyzedInPeriod > 0
        ? 1
        : 0;
  const feedbackCoverage =
    analyzedInPeriod > 0 ? clamp(feedbackCountInPeriod / Math.max(1, analyzedInPeriod)) : 0;
  const adoptionRate =
    actionCountInPeriod > 0 ? clamp(actionAppliedCount / Math.max(1, actionCountInPeriod)) : 0;

  const loopScore = clamp((planScore + executionRate + feedbackCoverage + adoptionRate) / 4);

  if (
    planExists ||
    plannedPostsForPeriod > 0 ||
    analyzedInPeriod > 0 ||
    feedbackCountInPeriod > 0 ||
    actionCountInPeriod > 0
  ) {
    pdcaMetrics = {
      planExists,
      loopScore,
      planScore,
      executionRate,
      feedbackCoverage,
      adoptionRate,
      plannedPosts: plannedPostsForPeriod,
      analyzedPosts: analyzedInPeriod,
      feedbackCount: feedbackCountInPeriod,
      actionCount: actionCountInPeriod,
      actionAppliedCount,
    };
  }

  if (planSummary) {
    analysisReferences.push({
      id: planSummary.id,
      sourceType: "plan",
      label: planSummary.title,
      summary: planSummary.simulationSummary || undefined,
      metadata: {
        planPeriod: planSummary.planPeriod,
        targetFollowers: planSummary.targetFollowers,
      },
    });
  }

  const periodLabel = period === "weekly" ? "週次" : "月次";

  // 追加: 投稿シミュレーション進捗（必要本数・実績・分析済み・未登録・残数）
  const plannedPostsPerPeriod = pdcaMetrics?.plannedPosts ?? 0;
  const postedThisPeriod = totalPosts; // 推定/集計済みの投稿数
  const analyzedCount = pdcaMetrics?.analyzedPosts ?? 0;
  const unregisteredCount = Math.max(0, postedThisPeriod - analyzedCount);
  const remainingToGoal = Math.max(0, plannedPostsPerPeriod - postedThisPeriod);
  if (plannedPostsPerPeriod > 0 || postedThisPeriod > 0 || analyzedCount > 0) {
    analysisReferences.push({
      id: `simulation-progress-${period}-${date}`,
      sourceType: "analytics",
      label: "投稿シミュレーション進捗",
      summary: `必要${plannedPostsPerPeriod}件 / 実績${postedThisPeriod}件 / 分析${analyzedCount}件 / 未登録${unregisteredCount}件 / 残り${remainingToGoal}件`,
      metadata: {
        plannedPostsPerPeriod,
        postedThisPeriod,
        analyzedCount,
        unregisteredCount,
        remainingToGoal,
      },
    });
  }

  analysisReferences.push({
    id: `report-${period}-${date}`,
    sourceType: "analytics",
    label: `${periodLabel}レポート`,
    summary: `投稿${totalPosts}件 / リーチ${totalReach.toLocaleString()} / ER ${engagementRate.toFixed(
      1
    )}%`,
    metadata: { period, date },
  });

  if (masterContext) {
    analysisReferences.push({
      id: `master-context-${date}`,
      sourceType: "masterContext",
      label: "マスターコンテキスト",
      summary: `フェーズ:${getLearningPhaseLabel(masterContext.learningPhase)} / RAG:${Math.round(
        (masterContext.ragHitRate || 0) * 100
      )}%`,
      metadata: {
        learningPhase: masterContext.learningPhase,
        ragHitRate: masterContext.ragHitRate,
      },
    });
  }

  const planContext: PlanContextPayload | undefined =
    planSummary || reportSummary
      ? {
          planSummary: planSummary ?? null,
          actualPerformance: {
            totalPosts,
            followerChange: totals.totalFollowerIncrease || 0,
            avgEngagementRate: engagementRate || 0,
            reach: totalReach || 0,
            saves: totals.totalSaves || 0,
          },
        }
      : undefined;

  const aiOverview = await generateAIOverview({
    period,
    date,
    totals,
    previousTotals: reportSummary?.previousTotals,
    changes,
    alerts,
    postTypeHighlights,
    timeSlotAnalysis: reportSummary?.timeSlotAnalysis || [],
    bestTimeSlot: reportSummary?.bestTimeSlot,
    hashtagStats: (reportSummary?.hashtagStats || []).slice(0, 5),
    confidence: {
      score: confidenceScore,
      dataPointCount,
      historicalHitRate: Number(historicalHitRate.toFixed(2)),
    },
    postPatterns: masterContext?.postPatterns
      ? {
          summaries: masterContext.postPatterns.summaries,
          topHashtags: masterContext.postPatterns.topHashtags,
        }
      : undefined,
    planContext,
    reachSourceAnalysis: (reportSummary as any)?.reachSourceAnalysis,
    contentPerformance: (reportSummary as any)?.contentPerformance,
    postDeepDive: (reportSummary as any)?.postDeepDive || (reportSummary as any)?.posts,
  });

  // 分析済み件数（表示/ハイライト用）
  const analyzedPostsForPeriod = pdcaMetrics?.analyzedPosts ?? 0;

  const overview =
    aiOverview ||
    generateFallbackOverview(
      reportSummary?.totals,
      reportSummary?.changes,
      alerts,
      postTypeHighlights,
      planContext
    );

  // ハイライトの「投稿数」は分析入力済み件数ベースに置換（前月比は不明な場合は "—"）
  if (overview && Array.isArray(overview.highlights) && typeof analyzedPostsForPeriod === "number") {
    const nextHighlights = overview.highlights.slice();
    const idx = nextHighlights.findIndex((h) => h.label === "投稿数");
    const postHighlight = {
      label: "投稿数",
      value: `${analyzedPostsForPeriod.toLocaleString()}件`,
      change:
        typeof (reportSummary?.changes?.postsChange) === "number"
          ? `${(reportSummary!.changes!.postsChange! >= 0 ? "+" : "")}${reportSummary!.changes!.postsChange!.toFixed(1)}%`
          : "—",
    };
    if (idx >= 0) {
      nextHighlights[idx] = postHighlight;
    } else {
      nextHighlights.unshift(postHighlight);
    }
    overview.highlights = nextHighlights;
  }

  // ハイライトの「フォロワー」を進捗表示に調整（例: +12 / 35人）
  if (overview && Array.isArray(overview.highlights)) {
    const nextHighlights = overview.highlights.slice();
    const idxFollower = nextHighlights.findIndex((h) => h.label === "フォロワー増減" || h.label === "フォロワー数");
    const currentIncrease = totals.totalFollowerIncrease || 0;
    const targetFollowers = planSummary?.targetFollowers ?? 0;
    const currentFollowersBase = planSummary?.currentFollowers ?? 0;
    const monthlyGoalDelta = Math.max(0, targetFollowers - currentFollowersBase);
    const followerValue =
      monthlyGoalDelta > 0
        ? `${currentIncrease.toLocaleString()}人 / ${monthlyGoalDelta.toLocaleString()}人`
        : `${currentIncrease.toLocaleString()}人`;
    const followerChangeText =
      typeof reportSummary?.changes?.followerChange === "number"
        ? `${(reportSummary!.changes!.followerChange! >= 0 ? "+" : "")}${reportSummary!.changes!.followerChange!.toFixed(1)}%`
        : "—";
    const followerHighlight = {
      label: "フォロワー増加",
      value: followerValue,
      change: followerChangeText,
    };
    if (idxFollower >= 0) {
      nextHighlights[idxFollower] = followerHighlight;
    } else {
      nextHighlights.push(followerHighlight);
    }
    overview.highlights = nextHighlights;
  }

  // AI注目ポイント（watchouts）をデータ整合的に再構築
  if (overview) {
    const newWatchouts: string[] = [];
    const er = engagementRate || 0;
    const totalEng = (totals as any)?.totalEngagement || 0;
    const followerInc = totals.totalFollowerIncrease || 0;
    // エンゲージメントが完全にゼロの場合のみ注意喚起
    if (er === 0 && totalEng === 0) {
      newWatchouts.push("エンゲージメントの反応がまだ見られません。構成と導入の最適化を検討してください。");
    }
    // フォロワー増がゼロ以下の場合のみ注意喚起
    if (followerInc <= 0) {
      newWatchouts.push("フォロワーの純増が確認できません。プロフィール導線と訴求の見直しが有効です。");
    }
    // 投稿計画に対する進捗
    if (typeof pdcaMetrics?.plannedPosts === "number") {
      const remain = Math.max(0, (pdcaMetrics?.plannedPosts ?? 0) - analyzedPostsForPeriod);
      if (remain > 0) {
        newWatchouts.push(`計画に対して残り${remain}件の分析済み投稿が必要です。`);
      }
    }
    // ひとつも無ければ既存を踏襲、あれば置換
    if (newWatchouts.length > 0) {
      overview.watchouts = newWatchouts.slice(0, 3);
    }
  }

  // 運用計画の振り返り（planReflection）を進捗ベースで上書き
  if (overview) {
    const checkpoints: Array<{ label: string; target: string; actual: string; status: "met" | "partial" | "missed" | "no_data" }> = [];
    let worst: "met" | "partial" | "missed" | "no_data" = "met";
    const applyWorst = (s: typeof worst) => {
      const order = { met: 0, partial: 1, missed: 2, no_data: 3 };
      if (order[s] > order[worst]) { worst = s; }
    };
    // フォロワー目標
    const targetFollowers = planSummary?.targetFollowers ?? 0;
    const currentFollowersBase = planSummary?.currentFollowers ?? 0;
    const monthlyGoalDelta = Math.max(0, targetFollowers - currentFollowersBase);
    if (monthlyGoalDelta > 0) {
      const inc = totals.totalFollowerIncrease || 0;
      const status: "met" | "partial" | "missed" =
        inc >= monthlyGoalDelta ? "met" : inc > 0 ? "partial" : "missed";
      applyWorst(status);
      checkpoints.push({
        label: "フォロワー増加",
        target: `${monthlyGoalDelta.toLocaleString()}人`,
        actual: `${inc.toLocaleString()}人`,
        status,
      });
    }
    // 投稿頻度（分析済み）目標
    if (typeof pdcaMetrics?.plannedPosts === "number" && pdcaMetrics.plannedPosts > 0) {
      const planned = pdcaMetrics.plannedPosts;
      const actual = analyzedPostsForPeriod;
      const status: "met" | "partial" | "missed" =
        actual >= planned ? "met" : actual > 0 ? "partial" : "missed";
      applyWorst(status);
      checkpoints.push({
        label: "投稿頻度（分析済み）",
        target: `${planned.toLocaleString()}件`,
        actual: `${actual.toLocaleString()}件`,
        status,
      });
    }
    if (checkpoints.length > 0) {
      const summaryText =
        worst === "met"
          ? "計画に沿って進捗しています。来月は伸びた要素の再現に注力しましょう。"
          : worst === "partial"
            ? "おおむね前進しています。残りの未達分を計画的に埋めていきましょう。"
            : "未達の項目があります。優先順位を見直し、実行ペースと導線を調整しましょう。";
      // 既存の planReflection があれば planStrategyReview を保持
      const existingPlanStrategyReview = overview.planReflection?.planStrategyReview;
      overview.planReflection = {
        summary: summaryText,
        status: worst === "met" ? "on_track" : worst === "partial" ? "at_risk" : "off_track",
        checkpoints,
        nextSteps: [
          "来月に向けて優先KPIを1つに絞り、実行本数と導線を明確化する",
          "好調パターンの再現と、未達要因の1点改善を同時に進める",
        ],
        planStrategyReview: existingPlanStrategyReview,
      };
    }
  }

  // プロンプトを構築（学習段階に応じて最適化）
  const postsArrayCount =
    (Array.isArray((reportSummary as any)?.posts) ? ((reportSummary as any).posts as unknown[]).length : 0) +
    (Array.isArray((reportSummary as any)?.postDeepDive) ? ((reportSummary as any).postDeepDive as unknown[]).length : 0);
  // 低データ判定は「投稿は0だが、他のKPIが存在する」ケースに限定
  const lowDataMode = totalPosts === 0 && totalReach > 0;
  let prompt = `Instagram分析データを基に、簡潔に分析してください。

【御社専用AI設定】
${
  userProfile?.businessInfo
    ? `
- 業種: ${userProfile.businessInfo.industry || "未設定"}
- 会社規模: ${userProfile.businessInfo.companySize || "未設定"}
- 事業形態: ${userProfile.businessInfo.businessType || "未設定"}
- ターゲット市場: ${Array.isArray(userProfile.businessInfo.targetMarket) ? userProfile.businessInfo.targetMarket.join("、") : userProfile.businessInfo.targetMarket || "未設定"}
- キャッチコピー: ${userProfile.businessInfo.catchphrase || "未設定"}
- 事業内容: ${userProfile.businessInfo.description || "未設定"}
- 目標: ${Array.isArray(userProfile.businessInfo.goals) ? userProfile.businessInfo.goals.join("、") : ""}
- 課題: ${Array.isArray(userProfile.businessInfo.challenges) ? userProfile.businessInfo.challenges.join("、") : ""}
`
    : "ビジネス情報未設定"
}

【要約ルール】
- 冒頭に120-180文字の「今月のまとめ」を1段落で書く
- 来月の最優先アクションを1つだけ含める（冗長に列挙しない）
- フォロワー数・フォロワー増減・エンゲージメント率・いいね数などの具体的な指標名や数値、パーセンテージには触れず、「反応が集まりやすい/深まりやすい」「関心を集めやすい」など感覚的な表現に言い換える
- 見出しや箇条書きではなく自然文のみで書く（「1.」「・」「●」「■」などの記号は禁止）
- 文章は最大3文・1段落。数値は原則出さず、どうしても必要な場合も1つまでにとどめる
- 投稿数・投稿本数・分析件数・「〇件」といった具体的な本数には触れず、全体の流れ・質・傾向にフォーカスする
- 投稿本数や分析件数が0の場合、その数字を直接書かず、代わりに「これから増やしていける余地がある」といった前向きな表現に置き換える
- 「投稿が0件」「分析済み0件」「投稿がありません」のようなゼロを強調する表現は禁止

【回答形式】`;

  if (lowDataMode) {
    prompt += `
登録済みの分析データが一部のみ存在します。ビジネス情報と利用可能なKPIから簡潔に所見をまとめてください。絶対に「投稿が全くない」と断定しないこと。
投稿シミュレーション進捗とKPI分解/ドリルダウンは、残数をそのまま列挙するのではなく「これから増やせる余地」や「今見えている傾向」の説明にだけ使ってください。

【禁止事項】
「###」「-」「*」「1.」などの記号、箇条書きや見出し、JSON形式やMarkdown形式を使わない。すべて自然な日本語の一つの段落で書く。
以下の表現は禁止し、必ず前向きな言い換えを行う:
「投稿がない」「投稿ゼロ」「全くない」「停滞」「できていない」「分析済み0件」
例) 「投稿がない」→「これから投稿を積み上げていける状態です」
数値と矛盾する表現は禁止。たとえばフォロワー増加が正のときは「増加が見込めない/機会を活かせない」などと書かない。

最終的な出力は、今月の状況の要約→そこから読み取れる示唆→来月の最優先アクション、の順で構成した1段落のみとする。`;
  } else if (totalPosts === 0) {
    prompt += `
ビジネス情報・投稿シミュレーション進捗・KPI分解/ドリルダウンに基づいて実践的な提案を行う。すべて自然な日本語の一つの段落で簡潔に答える。否定的な断定（例: 投稿が全くない）は避ける。

【禁止事項】
「###」「-」「*」「1.」などの記号、箇条書きや見出し、JSON形式やMarkdown形式を使わない。すべて自然な日本語の文章で書く。
以下の表現は禁止し、必ず前向きな言い換えを行う:
「投稿がない」「投稿ゼロ」「全くない」「停滞」「できていない」「分析済み0件」
例) 「投稿がない」→「これから投稿を積み上げていくフェーズです」
数値と矛盾する表現は禁止。たとえばフォロワー増加が正のときは「増加が見込めない/機会を活かせない」などと書かない。

今月の状況の要約→これからの方向性→来月の最優先アクション、の流れを一つの段落で表現すること。`;
  } else {
    prompt += `
【禁止事項】
「###」「-」「*」「1.」などの記号、箇条書きや見出し、JSON形式やMarkdown形式を使わない。すべて自然な日本語の文章で書く。
以下の表現は禁止し、必ず前向きな言い換えを行う:
「投稿がない」「投稿ゼロ」「全くない」「停滞」「できていない」
数値と矛盾する表現は禁止。たとえばフォロワー増加が正のときは「増加が見込めない/機会を活かせない」などと書かない。

最終的な出力は、今月の状況の要約→そこから読み取れる示唆→来月の最優先アクション、の順で構成した1段落のみとする。`;
  }

  // 学習段階に応じてプロンプトを最適化
  if (isOptimized && ragHitRate > 0.7) {
    prompt += `\n\n【最適化モード】
過去の学習データを活用し、簡潔で的確な分析を提供してください。`;
  }

  const hasFollowerGain = (totals.totalFollowerIncrease || 0) > 0;
  const totalEngagementCount =
    (totals.totalLikes || 0) +
    (totals.totalComments || 0) +
    (totals.totalShares || 0) +
    (totals.totalSaves || 0);
  const hasEngagement = totalEngagementCount > 0 || (engagementRate || 0) > 0;
  // 固定テンプレの洞察/推奨は廃止（出力のテンプレ感を防ぎ、LLM+参照データに委ねる）
  const insightMessages: string[] = [];
  const recommendationMessages: string[] = [];

  try {
    const feedbackStats = masterContext?.feedbackStats;
    const actionStats = masterContext?.actionStats;
    const patternSummaries = masterContext?.postPatterns?.summaries;
    const topPatternHashtags = masterContext?.postPatterns
      ? Object.keys(masterContext.postPatterns.topHashtags || {}).slice(0, 3)
      : [];
    const patternLines: string[] = [];
    if (patternSummaries?.gold?.summary) {
      patternLines.push(`成功:${patternSummaries.gold.summary}`);
    }
    if (patternSummaries?.gray?.summary) {
      patternLines.push(`伸び悩み:${patternSummaries.gray.summary}`);
    }
    if (patternSummaries?.red?.summary) {
      patternLines.push(`改善:${patternSummaries.red.summary}`);
    }
    if (topPatternHashtags.length > 0) {
      patternLines.push(`注目ハッシュタグ:${topPatternHashtags.join("、")}`);
    }
    const contextString = masterContext
      ? `学習フェーズ: ${getLearningPhaseLabel(masterContext.learningPhase)}
RAGヒット率: ${Math.round(masterContext.ragHitRate * 100)}%
AI提案活用数: ${masterContext.totalInteractions}
フィードバック総数: ${feedbackStats?.total ?? 0}（好感度 ${feedbackStats ? Math.round(feedbackStats.positiveRate * 100) : 0}%）
アクション採用率: ${actionStats ? Math.round(actionStats.adoptionRate * 100) : 0}%
平均改善効果: ${actionStats ? actionStats.averageResultDelta.toFixed(1) : "0.0"}%
学習インサイト: ${masterContext.personalizedInsights.join(" / ")}
フォーカステーマ: ${masterContext.recommendations.join(" / ")}
${patternLines.length > 0 ? `投稿パターン: ${patternLines.join(" / ")}` : ""}`
      : undefined;

    const aiResponse = await callOpenAI(prompt, contextString);

    // 予測値を抽出（簡易的な実装）
    const followerGrowthWeekly = Math.round(totalPosts * 2.5 + Math.random() * 10);
    const followerGrowthMonthly = Math.round(totalPosts * 8 + Math.random() * 30);

    const generatedAt = new Date().toISOString();
    const aiInsightBlocks: AIInsightBlock[] = actionPlans.slice(0, 5).map((plan) => ({
      title: plan.title,
      description: plan.description,
      action: plan.recommendedActions[0],
      referenceIds: [],
    }));
    const topPriorityPlan = actionPlans
      .slice()
      .sort((a, b) => {
        const priorityOrder: Record<ActionPlanPriority, number> = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })[0];

    const generationPayload: AIGenerationResponse = {
      draft: {
        title: `${periodLabel}サマリー`,
        body: aiResponse.trim(),
        hashtags: [],
      },
      insights: [],
      aiInsights: aiInsightBlocks,
      imageHints: [],
      priority: topPriorityPlan
        ? {
            focus: topPriorityPlan.focusArea,
            level: topPriorityPlan.priority,
            reason: topPriorityPlan.expectedImpact,
          }
        : undefined,
      references: analysisReferences,
      metadata: {
        model: "gpt-4o-mini",
        generatedAt,
        promptVersion: "monthly-analysis:v1",
      },
      rawText: aiResponse,
    };

    if (userId) {
      await saveOverviewHistoryEntry(
        userId,
        period,
        date,
        overview,
        actionPlans,
        reportSummary?.totals,
        reportSummary?.changes,
        {
          score: confidenceScore,
          dataPointCount,
          historicalHitRate: Number(historicalHitRate.toFixed(2)),
        },
        generationPayload
      );
    }

    return {
      predictions: {
        followerGrowth: {
          weekly: followerGrowthWeekly,
          monthly: followerGrowthMonthly,
        },
        engagementRate: 0,
        optimalPostingTime: "18:00-20:00",
      },
      confidence: {
        score: confidenceScore,
        dataPointCount,
        historicalHitRate: Number(historicalHitRate.toFixed(2)),
      },
      alerts,
      postTypeHighlights,
      actionPlans,
      overview,
      pdcaMetrics,
      insights: insightMessages,
      recommendations: recommendationMessages,
      summary: overview.summary || aiResponse.substring(0, 300),
      generation: generationPayload,
    };
  } catch (error) {
    console.error("AI分析エラー:", error);

    // フォールバック分析
    const fallbackGeneration: AIGenerationResponse = {
      draft: {
        title: `${periodLabel}サマリー`,
        body: overview.summary || "AI分析を実行中です。しばらくお待ちください。",
        hashtags: [],
      },
      insights: [],
      aiInsights: [],
      imageHints: [],
      references: analysisReferences,
      metadata: {
        model: "fallback",
        generatedAt: new Date().toISOString(),
      },
      rawText: overview.summary || "",
    };

    return {
      predictions: {
        followerGrowth: {
          weekly: Math.round(totalPosts * 2),
          monthly: Math.round(totalPosts * 6),
        },
        engagementRate: 0,
        optimalPostingTime: reportSummary?.bestTimeSlot?.label || "18:00-20:00",
      },
      confidence: {
        score: confidenceScore,
        dataPointCount,
        historicalHitRate: Number(historicalHitRate.toFixed(2)),
      },
      alerts,
      postTypeHighlights,
      actionPlans,
      overview,
      pdcaMetrics,
      insights: insightMessages,
      recommendations: recommendationMessages,
      summary: overview.summary || "AI分析を実行中です。しばらくお待ちください。",
      generation: fallbackGeneration,
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("🤖 AI分析API開始");

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const period = searchParams.get("period") as "weekly" | "monthly";
    const date = searchParams.get("date");

    if (!userId || !period || !date) {
      return NextResponse.json(
        { error: "userId, period, date パラメータが必要です" },
        { status: 400 }
      );
    }

    console.log("🤖 AI分析パラメータ:", { userId, period, date });

    const aiContext = await buildAIContext(userId, { snapshotLimit: 5, includeMasterContext: true });

    // 1. マスターコンテキストを取得（RAGシステム）
    console.log("🔍 マスターコンテキスト取得中...");
    const masterContext = await getMasterContext(userId, { forceRefresh: true });
    console.log("✅ マスターコンテキスト取得完了:", masterContext?.learningPhase);

    // 2. レポートサマリーを取得
    console.log("📊 レポートサマリー取得中...");
    const reportSummary = await getReportSummary(userId, period, date);
    console.log("✅ レポートサマリー取得完了:", reportSummary ? "データあり" : "データなし");

    // 2.5 運用計画の取得
    console.log("🗂️ 運用計画取得中...");
    const planSummary = await fetchPlanSummaryForPeriod(userId, period, date, "instagram");
    console.log("✅ 運用計画取得:", planSummary ? planSummary.title : "なし");

    // 3. AI分析を実行
    console.log("🧠 AI分析実行中...");
    const analysisResult = await performAIAnalysis(
      reportSummary,
      masterContext,
      period,
      date,
      planSummary,
      userId,
      aiContext
    );
    console.log("✅ AI分析完了");

    // 4. 結果を返す
    const result = {
      success: true,
      data: {
        ...analysisResult,
        masterContext: masterContext
          ? {
              learningPhase: masterContext.learningPhase,
              ragHitRate: masterContext.ragHitRate,
              totalInteractions: masterContext.totalInteractions,
              isOptimized:
                masterContext.learningPhase === "optimized" ||
                masterContext.learningPhase === "master",
            }
          : null,
        metadata: {
          period,
          date,
          dataPoints: analysisResult.confidence.dataPointCount,
          confidenceScore: analysisResult.confidence.score,
          historicalHitRate: analysisResult.confidence.historicalHitRate,
          analysisTimestamp: new Date().toISOString(),
        },
      },
    };

    console.log("🎉 AI分析API完了");
    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ AI分析APIエラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: "AI分析の実行に失敗しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function calculatePostPerformanceScore(metrics: {
  engagementRate: number;
  savesRate: number;
  commentsRate: number;
  likesRate: number;
}): number {
  const { engagementRate, savesRate, commentsRate, likesRate } = metrics;
  return engagementRate * 0.6 + savesRate * 0.25 + commentsRate * 0.1 + likesRate * 0.05;
}

function buildPostInsightSummary(params: {
  comparisons: PostLearningSignal["comparisons"];
  significance: PostLearningSignal["significance"];
  clusterLabel: string;
  sentimentSummary?: string;
}): {
  summary: string;
  strengths: string[];
  improvements: string[];
  nextActions: string[];
} {
  const { comparisons, significance, clusterLabel } = params;

  const summaryParts: string[] = [];
  const strengths: string[] = [];
  const improvements: string[] = [];
  const nextActions: string[] = [];

  if (significance.reach === "higher") {
    summaryParts.push("リーチが平均より上回りました");
    strengths.push("リーチ獲得が好調です。流入経路や露出ポイントを継続しましょう。");
  } else if (significance.reach === "lower") {
    improvements.push("リーチが平均を下回りました。投稿時間や分布を見直してください。");
  }

  if (significance.engagement === "higher") {
    strengths.push("エンゲージメント率が高く、フォロワーとの共感が得られています。");
  } else if (significance.engagement === "lower") {
    improvements.push("エンゲージメント率が低下傾向です。コメントを誘発する問いかけを強化しましょう。");
    nextActions.push("キャプションに具体的な質問やCTAを追加してみる");
  }

  if (significance.savesRate === "higher") {
    strengths.push("保存率が高く、価値のあるコンテンツとして認識されています。");
  } else if (significance.savesRate === "lower") {
    improvements.push("保存率が低いです。チェックリストやTipsを取り入れると有効です。");
    nextActions.push("保存したくなるようなまとめや要点を追加する");
  }

  if (significance.commentsRate === "higher") {
    strengths.push("コメント率が高く、会話が生まれています。");
  } else if (significance.commentsRate === "lower") {
    improvements.push("コメント率が低いです。問いかけやユーザー参加を促しましょう。");
  }

  if (comparisons.clusterPerformanceDiff > 0.1) {
    summaryParts.push(`同クラスタ基準を${Math.round(comparisons.clusterPerformanceDiff * 100)}%上回りました。`);
  } else if (comparisons.clusterPerformanceDiff < -0.1) {
    improvements.push("同じ傾向の投稿と比べて伸び悩んでいます。構成を見直しましょう。");
  }

  if (summaryParts.length === 0) {
    summaryParts.push(`クラスタ『${clusterLabel}』の基準と概ね同程度の結果です。`);
  }

  return {
    summary: summaryParts.join(" ") || `クラスタ『${clusterLabel}』に属する投稿として平均的な結果です。`,
    strengths,
    improvements,
    nextActions,
  };
}
