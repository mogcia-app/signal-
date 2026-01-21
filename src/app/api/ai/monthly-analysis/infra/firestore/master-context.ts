/**
 * Firestore層: マスターコンテキスト取得
 * RAGシステムでマスターコンテキストを取得・構築
 */

import { getAdminDb } from "../../../../../../lib/firebase-admin";
import * as admin from "firebase-admin";
import type {
  MasterContext,
  SerializedMasterContext,
  PostLearningSignal,
  PostPerformanceTag,
  PatternSummary,
  LearningTimelinePoint,
  LearningBadge,
  OverviewHighlight,
} from "../../types";
import type { AnalyticsRecord, FeedbackAggregate } from "../../domain/metrics/engagement";
import {
  aggregateFeedbackData,
  computeBaselineMetrics,
} from "../../domain/metrics/engagement";
import { evaluatePostPerformance } from "../../domain/metrics/performance";
import { summarizePostPatterns } from "../../domain/analysis/post-patterns";
import { collectTopHashtags } from "../../domain/metrics/calculations";
import {
  monthKeyFromDate,
  monthKeyFromUnknown,
  weekKeyFromDate,
  weekKeyFromUnknown,
  monthLabelFromKey,
  weekLabelFromKey,
  parseFirestoreDate,
} from "../../utils/date-utils";
import { ensureArray, toNumber } from "../../utils/validation";

const MASTER_CONTEXT_CACHE_COLLECTION = "ai_master_context_cache";
const MASTER_CONTEXT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * マスターコンテキストをシリアライズ
 */
function serializeMasterContext(context: MasterContext): SerializedMasterContext {
  return {
    ...context,
    lastUpdated: context.lastUpdated.toISOString(),
  };
}

/**
 * マスターコンテキストをデシリアライズ
 */
function deserializeMasterContext(data: SerializedMasterContext): MasterContext {
  return {
    ...data,
    lastUpdated: new Date(data.lastUpdated),
  };
}

/**
 * デフォルトのマスターコンテキストを生成
 */
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

/**
 * 学習バッジを構築
 */
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
      shortcuts: [{ label: "翌月アクションを見る", href: "/instagram/report" }],
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
      shortcuts: [{ label: "オーディエンス分析を見る", href: "/instagram/report" }],
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

/**
 * 投稿パターンプロンプトセクションを構築
 */
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

/**
 * RAGシステムでマスターコンテキストを取得
 */
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
        return evaluatePostPerformance(record, baselineMetrics, aggregate || undefined, analyticsRecords);
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

    // OpenAI APIエラーが発生してもフォールバック処理で続行できるようにPromise.allSettledを使用
    const [goldResult, grayResult, redResult] = await Promise.allSettled([
      summarizePostPatterns("gold", goldSignals),
      summarizePostPatterns("gray", graySignals),
      summarizePostPatterns("red", redSignals),
    ]);

    const patternSummaries: Partial<Record<PostPerformanceTag, PatternSummary>> = {};
    
    // 各結果を処理（エラーが発生した場合はnullを返す）
    const goldSummary = goldResult.status === "fulfilled" ? goldResult.value : null;
    const graySummary = grayResult.status === "fulfilled" ? grayResult.value : null;
    const redSummary = redResult.status === "fulfilled" ? redResult.value : null;
    
    // エラーが発生した場合はログに記録
    if (goldResult.status === "rejected") {
      console.error("GOLD投稿パターン要約生成エラー:", goldResult.reason);
    }
    if (grayResult.status === "rejected") {
      console.error("GRAY投稿パターン要約生成エラー:", grayResult.reason);
    }
    if (redResult.status === "rejected") {
      console.error("RED投稿パターン要約生成エラー:", redResult.reason);
    }
    
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

    // 現在の月/週を確実に含める
    const currentDate = new Date();
    const currentMonthKey = monthKeyFromDate(currentDate);
    const currentWeekKey = weekKeyFromDate(currentDate);
    
    ensureSlot(monthlyAccumulator, currentMonthKey);
    ensureSlot(weeklyAccumulator, currentWeekKey);

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
      highlights.forEach((highlight: OverviewHighlight) => {
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

