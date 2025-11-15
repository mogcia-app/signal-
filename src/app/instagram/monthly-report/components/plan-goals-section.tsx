// new content start
"use client";

import React from "react";
import Link from "next/link";
import { Target, Users, Calendar, CheckCircle2, PenLine } from "lucide-react";
import type { PlanData } from "../../plan/types/plan";
import type { KPIBreakdown } from "./kpi-drilldown-section";
import type { NextMonthFocusAction } from "./next-month-focus-actions";

interface PlanGoalsSectionProps {
  planData: PlanData | null;
  reportSummary?: {
    kpiBreakdowns?: KPIBreakdown[] | null;
    totals?: { totalFollowerIncrease?: number; totalPosts?: number };
    personaHighlights?: PersonaSegmentSummary[] | null;
    nextMonthFocusActions?: NextMonthFocusAction[] | null;
    patternHighlights?: PatternHighlights | null;
    postDeepDive?: ReportPostBrief[] | null;
    posts?: ReportPostBrief[] | null;
  } | null;
}

type PersonaSegmentSummary = {
  segment: string;
  type: "gender" | "age";
  status: "gold" | "negative";
  value: number;
  delta?: number;
  postTitle: string;
  postId: string;
};

type PatternHighlights = {
  gold?: Array<{ title?: string; summary?: string }>;
  negative?: Array<{ title?: string; summary?: string }>;
};

type ReportPostBrief = {
  title?: string;
  analyticsSummary?:
    | {
        reach?: number | null;
        saves?: number | null;
        engagementRate?: number | null;
      }
    | null;
  textFeatures?: {
    structureTags?: string[];
    introStyle?: string;
    ctaType?: string;
    [key: string]: unknown;
  } | null;
};

type InsightResult = {
  tone: "good" | "warn" | "info";
  comment: string;
};

type ThemeTemplate =
  | "interest"
  | "brand"
  | "campaign"
  | "feedback"
  | "default";

type StrategyTemplate = "photos" | "video" | "hashtag" | "engagement" | "default";

const goalCategoryMap: Record<string, string> = {
  follower: "フォロワー獲得",
  engagement: "エンゲージ促進",
  like: "いいね増加",
  save: "保存率向上",
  reach: "リーチ拡大",
  impressions: "インプレッション増加",
  branding: "ブランド認知",
  profile: "プロフィール誘導",
};

const KPI_KEY_MAP: Record<string, KPIBreakdown["key"]> = {
  follower: "followers",
  engagement: "engagement",
  like: "engagement",
  save: "saves",
  reach: "reach",
  impressions: "reach",
  branding: "engagement",
  profile: "reach",
};

const THEME_TEMPLATE_MAP: Array<{ keyword: RegExp; template: ThemeTemplate }> = [
  { keyword: /興味|引き|好奇心|アンケート|ネタ/i, template: "interest" },
  { keyword: /ブランド|世界観|ストーリー|背景|理念/i, template: "brand" },
  { keyword: /キャンペーン|お知らせ|イベント|告知|リリース/i, template: "campaign" },
  { keyword: /お客様|フィードバック|レビュー|声|口コミ/i, template: "feedback" },
];

const STRATEGY_TEMPLATE_MAP: Array<{ keyword: RegExp; template: StrategyTemplate }> = [
  { keyword: /写真|フォト|ギャラリー|アルバム/i, template: "photos" },
  { keyword: /動画|リール|ショート|ムービー/i, template: "video" },
  { keyword: /ハッシュタグ|タグ|#|キーワード/i, template: "hashtag" },
  { keyword: /エンゲージ|コメント|保存|反応|コミュニケーション/i, template: "engagement" },
];

function safeNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function parseDateValue(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: unknown }).toDate === "function") {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function formatDateLabel(date: Date | null) {
  if (!date) {
    return "未設定";
  }
  return date.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" });
}

const badgeClass =
  "inline-flex items-center px-2.5 py-0.5 text-[11px] rounded-full border border-slate-200 text-slate-700 bg-white";

const statusStyles: Record<"good" | "warn" | "info", string> = {
  good: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  info: "bg-slate-100 text-slate-600 border-slate-200",
};

function StatusBadge({ tone, label }: { tone: keyof typeof statusStyles; label: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] rounded-full border ${statusStyles[tone]}`}>
      {label}
    </span>
  );
}

export function PlanGoalsSection({ planData, reportSummary }: PlanGoalsSectionProps) {
  if (!planData) {
    return (
      <div className="bg-white border border-slate-200 rounded-none p-6 shadow-sm mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">今月の目標サマリー</p>
            <p className="text-xs text-slate-500 mt-1">
              運用計画が設定されていません。まずはプランを作成しましょう。
            </p>
          </div>
          <Link
            href="/instagram/plan"
            className="text-xs font-semibold text-white bg-[#ff8a15] px-3 py-1.5 hover:bg-orange-600 transition-colors"
          >
            プランを作成
          </Link>
        </div>
      </div>
    );
  }

  const formData = planData.formData as Record<string, unknown> | undefined;
  const targetAudience =
    (formData?.targetAudience as string) || planData.targetAudience || "未設定";
  const goalCategoryKey = (formData?.goalCategory as string) || planData.category || "follower";
  const goalLabel = goalCategoryMap[goalCategoryKey] || goalCategoryKey || "未設定";
  const planPeriod = planData.planPeriod || (formData?.planPeriod as string) || "未設定";
  const planDurationMatch =
    typeof planPeriod === "string" ? planPeriod.match(/(\d+)\s*ヶ月/) : null;
  const planDurationMonths = planDurationMatch ? Number.parseInt(planDurationMatch[1], 10) : 1;

  const strategies = Array.isArray(planData.strategies) ? planData.strategies : [];
  const postThemes = Array.isArray(planData.postCategories) ? planData.postCategories : [];
  const rawFocusNote =
    (formData?.weeklyFocus as string) ||
    (formData?.aiHelpRequest as string) ||
    "重点テーマは未設定です。";
  const focusNote =
    rawFocusNote && !rawFocusNote.includes("未設定") ? rawFocusNote : null;
  const brandConcept = (formData?.brandConcept as string) || "";
  const tonePreference = (formData?.tone as string) || "";
  const audienceLabel =
    targetAudience && targetAudience !== "未設定" ? targetAudience : "想定オーディエンス";
  const brandLabel = brandConcept || "ブランド";
  const toneLabel = tonePreference || "";
  const describeVoice = toneLabel ? `${toneLabel}トーンで` : "";

  const getTemplateMessage = (template: ThemeTemplate, themeName: string) => {
    switch (template) {
      case "interest":
        return `まず${audienceLabel}の悩みを一文で書き出し、${describeVoice}「${themeName}」の切り口で意外な統計や質問を投げかけると ${brandLabel} らしさを保ったまま保存率が上がります。`;
      case "brand":
        return `${brandLabel} の世界観が伝わるよう、ビフォー/アフターや制作の裏側を添えてストーリー化しましょう。${describeVoice}語りかけるだけで共感が増えます。`;
      case "campaign":
        return `キャンペーンは「◯日まで」「数量限定」など期限つきCTAに変えると、${audienceLabel}でも行動率が安定します。${brandLabel}らしい特典名を入れると差別化できます。`;
      case "feedback":
        return `お客様の声は「結論→背景→ひと言」の順にまとめ、${describeVoice}${brandLabel}の価値が伝わる引用を冒頭に置くと離脱を防げます。`;
      default:
        return `「${themeName}」に該当する投稿がまだ少ないため、LabでAI提案を再生成し分析ページに登録しておくと来月の学習が進みます。`;
    }
  };

  const getStrategyTemplate = (value: string): StrategyTemplate => {
    const match = STRATEGY_TEMPLATE_MAP.find((item) => item.keyword.test(value));
    return match ? match.template : "default";
  };

  const getStrategyMessage = (template: StrategyTemplate, name: string) => {
    switch (template) {
      case "photos":
        return `${brandLabel} の写真投稿は「撮影意図 → 現場の一言 → 工夫」の順に並べると、${audienceLabel} が保存したくなる情報密度になります。`;
      case "video":
        return `リールで ${name} を打ち出すときは、冒頭3秒でベネフィットを写し、${describeVoice || "自然なトーンで"}CTAを字幕にも載せると完走率が安定します。`;
      case "hashtag":
        return `ハッシュタグは「ブランド専用タグ + 競合が使うタグ + 具体的な悩みワード」の3層構造にすると、${audienceLabel} にヒットしやすくなります。`;
      case "engagement":
        return `保存やコメントを狙うときは、本文末に「あなたの○○を教えてください」など回答しやすい問いを入れると、${brandLabel} らしい対話が続きます。`;
      default:
        return `${name} の進め方をAIがまだ学習中です。Labで実験した手応えを分析ページに登録すると、来月の提案が精密になります。`;
    }
  };

  const currentFollowers = safeNumber(planData.currentFollowers, 0);
  const planAnalyticsIncrease = safeNumber(planData.analyticsFollowerIncrease, 0);
  const targetFollowers = safeNumber(planData.targetFollowers, 0);
  const followerTotals =
    reportSummary?.totals?.totalFollowerIncrease ?? planAnalyticsIncrease ?? 0;
  const actualFollowers =
    planData.actualFollowers !== undefined
      ? safeNumber(planData.actualFollowers, currentFollowers + followerTotals)
      : currentFollowers + followerTotals;
  const followerShortfall = Math.max(0, targetFollowers - actualFollowers);
  const planSavedDate =
    parseDateValue(planData.updatedAt) ||
    parseDateValue(planData.createdAt) ||
    null;
  const planEndDate =
    planSavedDate && Number.isFinite(planSavedDate.getTime())
      ? new Date(planSavedDate.getTime())
      : null;
  if (planEndDate) {
    planEndDate.setMonth(planEndDate.getMonth() + (Number.isFinite(planDurationMonths) ? planDurationMonths : 1));
  }
  const planDateRangeLabel =
    planSavedDate && planEndDate
      ? `${formatDateLabel(planSavedDate)} → ${formatDateLabel(planEndDate)}`
      : "保存日情報を取得できませんでした";

  const personaHighlights = reportSummary?.personaHighlights || [];
  const topPersona = personaHighlights?.[0];
  const personaMatch =
    targetAudience && topPersona?.segment
      ? targetAudience.toLowerCase().includes(topPersona.segment.toLowerCase())
      : false;

  const kpiBreakdowns = reportSummary?.kpiBreakdowns || [];
  const mappedKey = KPI_KEY_MAP[goalCategoryKey] || ("engagement" as KPIBreakdown["key"]);
  const targetKpi = kpiBreakdowns?.find((kpi) => kpi.key === mappedKey);
  const followerKpi = kpiBreakdowns?.find((kpi) => kpi.key === "followers");
  const kpiChangePct = targetKpi?.changePct;
  const followerKpiValue =
    followerKpi && Number.isFinite(followerKpi.value) ? Math.round(followerKpi.value) : null;
  const followerKpiLabel =
    followerKpiValue === null ? "計測中" : `${followerKpiValue >= 0 ? "+" : ""}${followerKpiValue.toLocaleString()}人`;
  const followerRemainingLabel =
    followerShortfall === 0 ? "目標達成済み" : `あと +${followerShortfall.toLocaleString()}人`;

  const personaStatusTone = topPersona
    ? topPersona.status === "gold"
      ? personaMatch
        ? "good"
        : "info"
      : "warn"
    : "info";
  const kpiStatusTone =
    kpiChangePct === undefined
      ? "info"
      : kpiChangePct >= 5
        ? "good"
        : kpiChangePct >= 0
          ? "info"
          : "warn";

  const simulationResult = planData.simulationResult as
    | (Record<string, unknown> & { monthlyPostCount?: unknown })
    | null
    | undefined;
  const simulationMonthlyPosts = safeNumber(simulationResult?.monthlyPostCount, 0);
  const feedFreq = safeNumber(formData?.feedFreq, 0);
  const reelFreq = safeNumber(formData?.reelFreq, 0);
  const storyFreq = safeNumber(formData?.storyFreq, 0);
  const freqBasedMonthlyPosts = (feedFreq + reelFreq + storyFreq) * 4;
  const requiredMonthlyPosts = Math.max(
    0,
    Math.round(simulationMonthlyPosts || freqBasedMonthlyPosts || 0),
  );

  const reportPosts: ReportPostBrief[] = Array.isArray(reportSummary?.postDeepDive)
    ? reportSummary?.postDeepDive ?? []
    : Array.isArray(reportSummary?.posts)
      ? (reportSummary?.posts as ReportPostBrief[])
      : [];
  const trackedPostsRaw =
    typeof reportSummary?.totals?.totalPosts === "number"
      ? reportSummary?.totals?.totalPosts || 0
      : reportPosts.length;
  const trackedPosts = Math.max(0, Math.round(trackedPostsRaw));
  const analyticsEntries = reportPosts.filter((post) => {
    const summary = post.analyticsSummary;
    if (!summary) {
      return false;
    }
    return Object.values(summary).some(
      (value) => typeof value === "number" && Number.isFinite(value),
    );
  }).length;
  const analyticsGap = Math.max(0, trackedPosts - analyticsEntries);
  const postShortfall =
    requiredMonthlyPosts > 0 ? Math.max(0, requiredMonthlyPosts - trackedPosts) : 0;
  const postProgressRatio =
    requiredMonthlyPosts > 0 ? trackedPosts / requiredMonthlyPosts : 0;
  const postStatusTone =
    requiredMonthlyPosts === 0
      ? "info"
      : postProgressRatio >= 1
        ? "good"
        : postProgressRatio >= 0.6
          ? "info"
          : "warn";
  const postStatusLabel =
    requiredMonthlyPosts === 0 ? "未設定" : postProgressRatio >= 1 ? "計画通り" : "投稿不足";
  const planSimulationNote =
    requiredMonthlyPosts === 0
      ? "Planで投稿目標シミュレーションを実行すると必要件数が算出されます。"
      : postShortfall === 0
        ? `必要件数はクリア済み。分析未登録 ${analyticsGap} 件を埋めると AI 学習精度が上がります。`
        : `あと ${postShortfall} 件でシミュレーション目標に到達。分析データ化済みは ${analyticsEntries} 件です。`;
  const analyticsMessage =
    trackedPosts === 0
      ? "投稿データ未登録"
      : analyticsGap > 0
        ? `未登録 ${analyticsGap} 件`
        : "全件反映済み";

  const focusActions = reportSummary?.nextMonthFocusActions || [];
  const goldInsights = reportSummary?.patternHighlights?.gold || [];
  const deepDivePosts = reportSummary?.postDeepDive || [];
  const averageSaves =
    deepDivePosts.length > 0
      ? deepDivePosts.reduce((sum, post) => sum + (post.analyticsSummary?.saves ?? 0), 0) /
        deepDivePosts.length
      : 0;

  const buildStrategyInsight = (strategy: string): InsightResult => {
    const normalized = strategy.toLowerCase();
    const template = getStrategyTemplate(strategy);
    const matchedAction = focusActions.find(
      (action) =>
        action.title.toLowerCase().includes(normalized) ||
        action.recommendedAction.toLowerCase().includes(normalized) ||
        action.reason.toLowerCase().includes(normalized),
    );

    if (!matchedAction) {
      return {
        tone: "info",
        comment: getStrategyMessage(template, strategy),
      };
    }

    const reasonText = matchedAction.reason || matchedAction.recommendedAction;
    const lower = reasonText.toLowerCase();
    const tone =
      lower.includes("低") || lower.includes("課題") || lower.includes("停滞") || lower.includes("減")
        ? "warn"
        : "good";

    return {
      tone,
      comment: reasonText,
    };
  };

  const getThemeTemplate = (theme: string): ThemeTemplate => {
    const match = THEME_TEMPLATE_MAP.find((item) => item.keyword.test(theme));
    return match ? match.template : "default";
  };

  let themeInsightIndex = 0;

  const buildThemeInsight = (theme: string): InsightResult => {
    const normalized = theme.toLowerCase();
    const template = getThemeTemplate(theme);

    const rankedPosts = deepDivePosts
      .map((post, index) => {
        const summary = post.analyticsSummary || {};
        const saves = typeof summary.saves === "number" ? summary.saves : 0;
        const reach = typeof summary.reach === "number" ? summary.reach : 0;
        const title = (post.title || "").toLowerCase();
        const tagHit =
          Array.isArray(post.textFeatures?.structureTags) &&
          post.textFeatures?.structureTags?.some((tag) =>
            typeof tag === "string" ? normalized.includes(tag.toLowerCase()) : false,
          );
        const directMatch = title.includes(normalized);
        const score =
          (directMatch ? 2 : 0) +
          (tagHit ? 1 : 0) +
          (saves >= averageSaves ? 2 : saves > 0 ? 1 : 0) +
          (reach > 0 ? 0.5 : 0);
        return { post, score, index };
      })
      .filter((entry) => entry.score > 0 && entry.post.analyticsSummary)
      .sort((a, b) => b.score - a.score || a.index - b.index);

    const matchedPost =
      rankedPosts[(themeInsightIndex++) % Math.max(rankedPosts.length, 1)]?.post || null;

    if (!matchedPost) {
      const goldMatch = goldInsights.find(
        (item) =>
          (item.title || "").toLowerCase().includes(normalized) ||
          (item.summary || "").toLowerCase().includes(normalized),
      );

      if (goldMatch) {
        return {
          tone: "good",
          comment: `「${goldMatch.title || "ゴールド投稿"}」が好調でした。次月も同じ切り口で継続しましょう。`,
        };
      }

      return {
        tone: "info",
        comment: getTemplateMessage(template, theme),
      };
    }

    const { saves = 0, reach = 0 } = matchedPost.analyticsSummary || {};
    const safeSaves = typeof saves === "number" ? saves : 0;
    const safeReach = typeof reach === "number" ? reach : 0;
    const positiveThreshold = Math.max(1, averageSaves);
    const isPositive = safeSaves >= positiveThreshold;
    const tone: InsightResult["tone"] =
      isPositive ? "good" : safeReach > 0 || safeSaves > 0 ? "info" : "warn";
    const comment =
      tone === "good"
        ? `「${matchedPost.title || "関連投稿"}」は保存 ${safeSaves.toLocaleString()} 件 / リーチ ${safeReach.toLocaleString()}。${brandLabel}らしい表現が刺さっているので、この流れで「${theme}」ネタを増やしましょう。`
        : tone === "info"
          ? `「${matchedPost.title || "関連投稿"}」はリーチ ${safeReach.toLocaleString()}。${audienceLabel}に呼びかけるCTAをもう一段強くし、${brandLabel}の強みを一言で添えると保存率が伸びます。`
          : `「${matchedPost.title || "関連投稿"}」ではまだ反応が薄いので、${describeVoice || "ナチュラルなトーンで"}${theme}の切り口を変えたり、別のCTAをテストしてください。`;

    return { tone, comment };
  };

  return (
    <div className="bg-white border border-slate-200 rounded-none p-6 shadow-sm mb-6">
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">今月の目標サマリー</p>
          <p className="text-xs text-slate-500">
            計画と実績を突き合わせて、目標の達成状況を確認できます。
          </p>
        </div>
        <Link
          href="/instagram/plan"
          className="text-xs font-semibold text-[#ff8a15] border border-[#ff8a15]/30 px-3 py-1.5 hover:bg-[#ff8a15]/10 transition-colors"
        >
          プランを編集
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="border border-slate-200 bg-slate-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-600" />
            <p className="text-sm font-semibold text-slate-900">ターゲット層</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-800">{targetAudience}</p>
            <StatusBadge
              tone={personaStatusTone}
              label={
                topPersona
                  ? personaMatch
                    ? "狙い通り"
                    : topPersona.status === "gold"
                      ? "想定外の反応"
                      : "ズレあり"
                  : "計測中"
              }
            />
          </div>
          {topPersona ? (
            <p className="text-xs text-slate-600">
              今月もっとも反応が良かったのは「{topPersona.segment}」
              （{topPersona.status === "gold" ? "好調" : "伸び悩み"}）。投稿 Deep Dive と学習ダッシュボードで詳細を確認できます。
            </p>
          ) : (
            <p className="text-xs text-slate-500">今月のペルソナ別反応はまだ十分ではありません。</p>
          )}
        </div>

        <div className="border border-slate-200 bg-slate-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-slate-600" />
            <p className="text-sm font-semibold text-slate-900">注力 KPI</p>
          </div>
          <div className="flex items-center justify-between">
            <span className={badgeClass}>{goalLabel}</span>
            <StatusBadge
              tone={kpiStatusTone}
              label={
                kpiChangePct === undefined
                  ? "計測中"
                  : kpiChangePct >= 5
                    ? "上振れ"
                    : kpiChangePct >= 0
                      ? "微増"
                      : "要改善"
              }
            />
          </div>
          {targetKpi ? (
            <p className="text-xs text-slate-600">
              今月 {targetKpi.value.toLocaleString()}件（前月比{" "}
              {kpiChangePct !== undefined ? `${kpiChangePct >= 0 ? "+" : ""}${kpiChangePct.toFixed(1)}%` : "N/A"}
              ）。寄与投稿は KPI 分解の「{goalLabel}」で確認できます。
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              この KPI のデータが少ないため、KPI コンソールで推移を確認してください。
            </p>
          )}
        </div>

        <div className="border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-slate-600" />
            <p className="text-sm font-semibold text-slate-900">投稿シミュレーション進捗</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-500">Planで必要</p>
              <p className="text-lg font-semibold text-slate-900">
                {requiredMonthlyPosts > 0 ? `${requiredMonthlyPosts}件 / 月` : "未設定"}
              </p>
            </div>
            <StatusBadge tone={postStatusTone} label={postStatusLabel} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white border border-slate-200 p-3">
              <p className="text-[11px] text-slate-500">今月の投稿実績</p>
              <p className="text-xl font-semibold text-slate-900">{trackedPosts.toLocaleString()}件</p>
              <p className="text-[11px] text-slate-500">
                {postShortfall > 0 ? `目標まで残り ${postShortfall} 件` : "必要件数をカバー"}
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-3">
              <p className="text-[11px] text-slate-500">分析入力済み</p>
              <p className="text-xl font-semibold text-slate-900">
                {analyticsEntries.toLocaleString()}件
              </p>
              <p className="text-[11px] text-slate-500">{analyticsMessage}</p>
            </div>
          </div>
          <p className="text-xs text-slate-600">{planSimulationNote}</p>
          <a
            href="/analytics/feed"
            className="inline-flex items-center text-[11px] font-semibold text-slate-700 hover:text-slate-900"
          >
            分析ページで投稿を登録 →
          </a>
        </div>

        <div className="border border-slate-200 bg-slate-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <PenLine className="w-4 h-4 text-slate-600" />
            <p className="text-sm font-semibold text-slate-900">取り組みたいこと</p>
          </div>
          {strategies.length > 0 ? (
            <div className="space-y-2">
              {strategies.slice(0, 4).map((strategy) => {
                const insight = buildStrategyInsight(strategy);
                return (
                  <div key={strategy} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={badgeClass}>{strategy}</span>
                      <StatusBadge
                        tone={insight.tone}
                        label={insight.tone === "good" ? "AI評価:良好" : "AI観測中"}
                      />
                    </div>
                    <p className="text-xs text-slate-600">{insight.comment}</p>
                  </div>
                );
              })}
              {strategies.length > 4 && (
                <p className="text-[11px] text-slate-500">
                  他 {strategies.length - 4} 件の施策はプラン画面で確認できます。
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">まだ設定されていません。</p>
          )}
        </div>

        <div className="border border-slate-200 bg-slate-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <PenLine className="w-4 h-4 text-slate-600" />
            <p className="text-sm font-semibold text-slate-900">投稿したい内容</p>
          </div>
          {postThemes.length > 0 ? (
            <div className="space-y-2">
              {postThemes.slice(0, 4).map((theme) => {
                const insight = buildThemeInsight(theme);
                return (
                  <div key={theme} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={badgeClass}>{theme}</span>
                      <StatusBadge
                        tone={insight.tone}
                        label={
                          insight.tone === "good"
                            ? "好調"
                            : insight.tone === "info"
                              ? "検証中"
                              : "再考"
                        }
                      />
                    </div>
                    <p className="text-xs text-slate-600">{insight.comment}</p>
                  </div>
                );
              })}
              {postThemes.length > 4 && (
                <p className="text-[11px] text-slate-500">
                  他 {postThemes.length - 4} 件はプラン画面で確認できます。
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">まだ設定されていません。</p>
          )}
          {focusNote ? (
            <p className="text-[11px] text-slate-500">{focusNote}</p>
          ) : null}
        </div>

        <div className="border border-slate-200 bg-slate-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-600" />
            <p className="text-sm font-semibold text-slate-900">目標フォロワー & 期間</p>
          </div>
          <p className="text-sm text-slate-800">
            {targetFollowers.toLocaleString()}人まで / {planPeriod}
          </p>
          <p className="text-xs text-slate-600">保存日レンジ: {planDateRangeLabel}</p>
          <p className="text-xs text-slate-600">
            KPI分解: 今月 {followerKpiLabel} / {followerRemainingLabel}
          </p>
          <p className="text-[11px] text-slate-500">
            フォロワー KPI ドリルダウンで寄与投稿と増減内訳を確認できます。
          </p>
        </div>
      </div>
    </div>
  );
}

