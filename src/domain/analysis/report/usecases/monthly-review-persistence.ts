import type { ParsedActionPlan } from "@/domain/analysis/report/types";

export interface MonthlyReviewStore {
  getMonthlyReview(userId: string, month: string): Promise<{
    review: string;
    actionPlans: ParsedActionPlan[];
    isFallback?: boolean;
  } | null>;
  saveMonthlyReview(params: {
    userId: string;
    month: string;
    review: string;
    actionPlans: ParsedActionPlan[];
    hasPlan: boolean;
    analyzedCount: number;
    isFallback: boolean;
    merge: boolean;
  }): Promise<void>;
  upsertAiDirection(params: {
    userId: string;
    month: string;
    mainTheme: string;
    avoidFocus: string[];
    priorityKPI: string;
    postingRules: string[];
    optimalPostingTime: string | null;
  }): Promise<void>;
}

export interface DirectionPostAnalytics {
  publishedTime?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  reach?: number;
}

export interface DirectionPostInput {
  analyticsSummary?: DirectionPostAnalytics;
}

export async function loadReusableMonthlyReview(params: {
  store: MonthlyReviewStore;
  userId: string;
  month: string;
  forceRegenerate: boolean;
}): Promise<{ monthlyReview: string | null; actionPlans: ParsedActionPlan[]; isFallback: boolean }> {
  if (params.forceRegenerate) {
    return { monthlyReview: null, actionPlans: [], isFallback: false };
  }

  const saved = await params.store.getMonthlyReview(params.userId, params.month);
  if (!saved) {
    return { monthlyReview: null, actionPlans: [], isFallback: false };
  }

  return {
    monthlyReview: saved.review || null,
    actionPlans: saved.actionPlans || [],
    isFallback: Boolean(saved.isFallback),
  };
}

export async function persistFallbackMonthlyReview(params: {
  store: MonthlyReviewStore;
  userId: string;
  month: string;
  review: string;
  hasPlan: boolean;
  analyzedCount: number;
}): Promise<void> {
  await params.store.saveMonthlyReview({
    userId: params.userId,
    month: params.month,
    review: params.review,
    actionPlans: [],
    hasPlan: params.hasPlan,
    analyzedCount: params.analyzedCount,
    isFallback: true,
    merge: true,
  });
}

export async function persistGeneratedMonthlyReview(params: {
  store: MonthlyReviewStore;
  userId: string;
  month: string;
  review: string;
  actionPlans: ParsedActionPlan[];
  hasPlan: boolean;
  analyzedCount: number;
  postsForDirection: DirectionPostInput[];
}): Promise<void> {
  const enrichedActionPlans = enrichActionPlans(params.actionPlans);

  await params.store.saveMonthlyReview({
    userId: params.userId,
    month: params.month,
    review: params.review,
    actionPlans: enrichedActionPlans,
    hasPlan: params.hasPlan,
    analyzedCount: params.analyzedCount,
    isFallback: false,
    merge: false,
  });

  if (enrichedActionPlans.length === 0) {
    return;
  }

  const nextMonth = toNextMonth(params.month);
  const direction = buildDirectionDraft(enrichedActionPlans, params.postsForDirection);

  await params.store.upsertAiDirection({
    userId: params.userId,
    month: nextMonth,
    mainTheme: direction.mainTheme,
    avoidFocus: direction.avoidFocus,
    priorityKPI: direction.priorityKPI,
    postingRules: direction.postingRules,
    optimalPostingTime: direction.optimalPostingTime,
  });
}

function toNextMonth(month: string): string {
  const [yearStr, monthStr] = month.split("-").map(Number);
  const nextMonth = new Date(yearStr, monthStr - 1, 1);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
}

function buildDirectionDraft(actionPlans: ParsedActionPlan[], posts: DirectionPostInput[]): {
  mainTheme: string;
  avoidFocus: string[];
  priorityKPI: string;
  postingRules: string[];
  optimalPostingTime: string | null;
} {
  const mainTheme = actionPlans[0]?.title || "継続的な改善";
  const avoidFocus: string[] = [];
  const postingRules: string[] = [];
  let priorityKPI = "エンゲージメント率";

  actionPlans.forEach((plan) => {
    if (plan.description.includes("避ける") || plan.description.includes("控える")) {
      const match = plan.description.match(/(避ける|控える)[^。]+/);
      if (match) {
        avoidFocus.push(match[0]);
      }
    }
    if (plan.action) {
      postingRules.push(plan.action);
    }
    if (plan.title.includes("保存") || plan.description.includes("保存")) {
      priorityKPI = "保存率";
    } else if (plan.title.includes("リーチ") || plan.description.includes("リーチ")) {
      priorityKPI = "リーチ";
    } else if (plan.title.includes("フォロワー") || plan.description.includes("フォロワー")) {
      priorityKPI = "フォロワー増加";
    }
  });

  return {
    mainTheme,
    avoidFocus: avoidFocus.length > 0 ? avoidFocus : ["日常雑談のみの投稿"],
    priorityKPI,
    postingRules: postingRules.length > 0 ? postingRules : ["1投稿1メッセージ"],
    optimalPostingTime: calculateOptimalPostingTime(posts),
  };
}

function inferKpiMeta(plan: ParsedActionPlan): {
  kpiKey: "likes" | "comments" | "shares" | "saves" | "reach" | "followerIncrease";
  kpiLabel: string;
} {
  const text = `${plan.title} ${plan.description} ${plan.action}`.toLowerCase();
  if (/(保存|save)/.test(text)) {
    return { kpiKey: "saves", kpiLabel: "保存" };
  }
  if (/(コメント|comment)/.test(text)) {
    return { kpiKey: "comments", kpiLabel: "コメント" };
  }
  if (/(シェア|共有|share|repost)/.test(text)) {
    return { kpiKey: "shares", kpiLabel: "シェア" };
  }
  if (/(リーチ|閲覧|reach)/.test(text)) {
    return { kpiKey: "reach", kpiLabel: "リーチ" };
  }
  if (/(フォロワー|follower)/.test(text)) {
    return { kpiKey: "followerIncrease", kpiLabel: "フォロワー増減" };
  }
  return { kpiKey: "likes", kpiLabel: "いいね" };
}

function enrichActionPlans(actionPlans: ParsedActionPlan[]): ParsedActionPlan[] {
  return actionPlans.map((plan) => {
    if (plan.kpiKey && plan.kpiLabel) {
      return plan;
    }
    const inferred = inferKpiMeta(plan);
    return {
      ...plan,
      kpiKey: inferred.kpiKey,
      kpiLabel: inferred.kpiLabel,
      evaluationRule: "increase_vs_previous_month",
    };
  });
}

function calculateOptimalPostingTime(posts: DirectionPostInput[]): string | null {
  const timeSlots = [
    { label: "早朝 (6-9時)", range: [6, 9] },
    { label: "午前 (9-12時)", range: [9, 12] },
    { label: "午後 (12-15時)", range: [12, 15] },
    { label: "夕方 (15-18時)", range: [15, 18] },
    { label: "夜 (18-21時)", range: [18, 21] },
    { label: "深夜 (21-6時)", range: [21, 24] },
  ] as const;

  const timeSlotKpi = timeSlots.map(({ label, range }) => {
    const inRange = posts.filter((post) => {
      const publishedTime = post.analyticsSummary?.publishedTime;
      if (!publishedTime) {
        return false;
      }
      const hour = parseInt(publishedTime.split(":")[0], 10);
      if (Number.isNaN(hour)) {
        return false;
      }
      if (range[0] === 21 && range[1] === 24) {
        return hour >= 21 || hour < 6;
      }
      return hour >= range[0] && hour < range[1];
    });

    if (inRange.length === 0) {
      return { label, postsInRange: 0, avgEngagementRate: 0 };
    }

    const totalEngagementRate = inRange.reduce((sum, post) => {
      const summary = post.analyticsSummary;
      if (!summary) {
        return sum;
      }
      const likes = summary.likes || 0;
      const comments = summary.comments || 0;
      const shares = summary.shares || 0;
      const saves = summary.saves || 0;
      const reach = summary.reach || 0;
      const engagement = likes + comments + shares + saves;
      const engagementRate = reach > 0 ? (engagement / reach) * 100 : 0;
      return sum + engagementRate;
    }, 0);

    return {
      label,
      postsInRange: inRange.length,
      avgEngagementRate: totalEngagementRate / inRange.length,
    };
  });

  const valid = timeSlotKpi.filter((slot) => slot.postsInRange > 0);
  if (valid.length === 0) {
    return null;
  }
  const best = valid.reduce((acc, slot) => {
    if (slot.avgEngagementRate > acc.avgEngagementRate) {
      return slot;
    }
    return acc;
  }, valid[0]);
  return best.label;
}
