/**
 * Domain層: AI概要生成
 * AI依存の概要生成ロジック
 */

import * as admin from "firebase-admin";
import { getAdminDb } from "../../../../../../lib/firebase-admin";
import { AIGenerationResponse } from "@/types/ai";
import { callOpenAI } from "./client";
import type {
  ReportSummary,
  PlanSummary,
  ActionPlan,
  PostPerformanceTag,
  PatternSummary,
  AnalysisAlert,
  PostTypeHighlight,
  PlanContextPayload,
  PlanCheckpointStatus,
  PlanReflectionStatus,
  PlanCheckpoint,
  PlanReflection,
  OverviewHighlight,
  AnalysisOverview,
} from "../../types";

// 型定義はtypes.tsからインポート済み

/**
 * メトリックハイライトを構築
 */
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

/**
 * フォールバック概要を生成（AIなし）
 */
export function generateFallbackOverview(params: {
  totals?: ReportSummary["totals"];
  changes?: ReportSummary["changes"];
  alerts: AnalysisAlert[];
  postTypeHighlights: PostTypeHighlight[];
  planContext?: PlanContextPayload;
}): AnalysisOverview {
  const { totals, changes, alerts, postTypeHighlights, planContext } = params;
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

/**
 * AI概要を生成
 */
export async function generateAIOverview(
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

/**
 * 概要履歴を保存
 */
export async function saveOverviewHistoryEntry(params: {
  userId: string;
  period: "weekly" | "monthly";
  date: string;
  overview: AnalysisOverview;
  actionPlans: ActionPlan[];
  totals: ReportSummary["totals"];
  changes: ReportSummary["changes"];
  confidence: {
    score: number;
    dataPointCount: number;
    historicalHitRate: number;
  };
  generation: AIGenerationResponse | null;
}): Promise<void> {
  const { userId, period, date, overview, actionPlans, totals, changes, confidence, generation } = params;
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

// 型エクスポート
export type {
  AnalysisAlert,
  PostTypeHighlight,
  PlanContextPayload,
  OverviewHighlight,
  PlanCheckpoint,
  PlanReflection,
};

