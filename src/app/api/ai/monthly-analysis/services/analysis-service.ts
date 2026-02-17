/**
 * サービス層: AI分析サービス
 * 処理の流れとフォールバックを管理
 * 
 * 注意: 現在はPhase 3の移行段階のため、一部の計算ロジックが含まれています。
 * Phase 4以降でdomain層に移動予定です。
 */

import * as admin from "firebase-admin";
import { getAdminDb } from "../../../../../lib/firebase-admin";
import type { AIContextBundle } from "@/lib/ai/context";
import type { AIGenerationResponse, AIInsightBlock, AIReference } from "@/types/ai";
import { getLearningPhaseLabel } from "@/utils/learningPhase";
import { fetchScheduleStats } from "../infra/firestore/plan-summary";
import type {
  ReportSummary,
  PlanSummary,
  MasterContext,
  AnalysisAlert,
  PostTypeHighlight,
  PostTypeHighlightStatus,
  ActionPlan,
  ActionPlanPriority,
  PlanContextPayload,
  PDCAMetrics,
  AnalysisOverview,
} from "../types";
import { parseFirestoreDate, getPeriodRange } from "../utils/date-utils";
import { clamp } from "../utils/validation";
import { derivePostCountFromContentStats } from "../utils/data-utils";

// ユーティリティ関数は utils層からインポート済み

/**
 * AI分析を実行
 * 
 * 処理の流れ:
 * 1. コンテキストとデータをロード
 * 2. メトリクスを計算
 * 3. AI分析を実行（フォールバック対応）
 * 4. 結果を返す
 */
export async function performAIAnalysis(
  reportSummary: ReportSummary | null,
  masterContext: MasterContext | null,
  period: "weekly" | "monthly",
  date: string,
  planSummary: PlanSummary | null,
  userId: string | undefined,
  aiContext: AIContextBundle,
  // 依存関数（Phase 4以降でdomain層に移動予定）
  generateAIOverview: (params: unknown) => Promise<AnalysisOverview | null>,
  generateFallbackOverview: (params: unknown) => AnalysisOverview,
  generateAIActionPlans: (params: unknown) => Promise<ActionPlan[]>,
  generateFallbackActionPlans: (alerts: AnalysisAlert[], highlights: PostTypeHighlight[]) => ActionPlan[],
  callOpenAI: (prompt: string, context?: string) => Promise<string>,
  saveOverviewHistoryEntry: (params: unknown) => Promise<void>
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

  // totalLikes, totalComments, totalShares are calculated but not used
  // const totalLikes = totals.totalLikes || 0;
  // const totalComments = totals.totalComments || 0;
  // const totalShares = totals.totalShares || 0;
  const totalReach = totals.totalReach || 0;
  let totalPosts = totals.totalPosts || 0;
  // 総合エンゲージメント（総和）を明示的に計算して totals に追加
  const totalEngagement =
    (totals.totalLikes || 0) +
    (totals.totalComments || 0) +
    (totals.totalShares || 0) +
    (totals.totalSaves || 0);
  const totalsWithEngagement = totals as typeof totals & { totalEngagement: number };
  totalsWithEngagement.totalEngagement = totalEngagement;
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
  interface ReportSummaryWithKPIs extends ReportSummary {
    kpiBreakdowns?: Array<{ key?: string; value?: unknown }>;
  }
  const reportSummaryWithKPIs = reportSummary as ReportSummaryWithKPIs | null;
  const kpiPosts =
    Array.isArray(reportSummaryWithKPIs?.kpiBreakdowns)
      ? Number(
          reportSummaryWithKPIs.kpiBreakdowns
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
  // postTypeCountSum is calculated but not used
  // const postTypeCountSum = Array.isArray(postTypeStats)
  //   ? postTypeStats.reduce((sum, item) => sum + (typeof item?.count === "number" ? item.count : 0), 0)
  //   : 0;
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
        totalsWithEngagement?.totalEngagement > 0
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
  interface PostWithAnalyticsSummary {
    analyticsSummary?: unknown;
  }

  const analyzedPostsCount =
    Array.isArray(summaryExtras?.postDeepDive)
      ? (summaryExtras.postDeepDive as PostWithAnalyticsSummary[]).filter(
          (p) => !!p && !!p.analyticsSummary
        ).length
      : Array.isArray(summaryExtras?.posts)
        ? (summaryExtras.posts as PostWithAnalyticsSummary[]).filter(
            (p) => !!p && !!p.analyticsSummary
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
    reachSourceAnalysis: (reportSummary as ReportSummary & {
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
    })?.reachSourceAnalysis,
    contentPerformance: summaryExtras?.contentPerformance,
    postDeepDive: (summaryExtras?.postDeepDive || summaryExtras?.posts) as Array<{
      title?: string;
      analyticsSummary?: {
        reach?: number;
        saves?: number;
        engagementRate?: number;
      } | null;
    }> | undefined,
  });

  // 分析済み件数（表示/ハイライト用）
  const analyzedPostsForPeriod = pdcaMetrics?.analyzedPosts ?? 0;

  const overview =
    aiOverview ||
    generateFallbackOverview({
      totals: reportSummary?.totals,
      changes: reportSummary?.changes,
      alerts,
      postTypeHighlights,
      planContext,
    } as unknown);

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
    const totalEng = totalsWithEngagement.totalEngagement || 0;
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

  // totalEngagementCount calculation removed (unused)
  // const hasEngagement = totalEngagementCount > 0 || (engagementRate || 0) > 0;
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
      await saveOverviewHistoryEntry({
        userId,
        period,
        date,
        overview,
        actionPlans,
        totals: reportSummary?.totals,
        changes: reportSummary?.changes,
        confidence: {
          score: confidenceScore,
          dataPointCount,
          historicalHitRate: Number(historicalHitRate.toFixed(2)),
        },
        generation: generationPayload,
      } as unknown);
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
