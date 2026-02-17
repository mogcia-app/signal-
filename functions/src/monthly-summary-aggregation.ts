export type SummaryDelta = {
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  saves: number;
  followerIncrease: number;
  interaction: number;
  externalLinkTaps: number;
  profileVisits: number;
  postCount: number;
};

export type DailyDelta = {
  likes: number;
  reach: number;
  saves: number;
  comments: number;
  engagement: number;
};

export type AnalyticsContribution = {
  userId: string;
  month: string;
  date: string;
  snsType: "instagram";
  delta: SummaryDelta;
  daily: DailyDelta;
};

export type SummaryPatch = {
  userId: string;
  month: string;
  snsType: "instagram";
  lastAnalyticsDocId: string;
  delta: SummaryDelta;
  dailyByDate: Map<string, DailyDelta>;
};

const EMPTY_DELTA: SummaryDelta = {
  likes: 0,
  comments: 0,
  shares: 0,
  reach: 0,
  saves: 0,
  followerIncrease: 0,
  interaction: 0,
  externalLinkTaps: 0,
  profileVisits: 0,
  postCount: 0,
};

export function toNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function toDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toMonthString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function toDayString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildContribution(data: Record<string, unknown> | undefined): AnalyticsContribution | null {
  if (!data) {
    return null;
  }

  const userId = typeof data.userId === "string" ? data.userId.trim() : "";
  if (!userId) {
    return null;
  }

  const snsType = typeof data.snsType === "string" ? data.snsType.trim().toLowerCase() : "instagram";
  if (snsType && snsType !== "instagram") {
    return null;
  }

  const publishedAt = toDate(data.publishedAt);
  if (!publishedAt) {
    return null;
  }

  const likes = toNumber(data.likes);
  const comments = toNumber(data.comments);
  const shares = toNumber(data.shares);
  const reach = toNumber(data.reach);
  const saves = toNumber(data.saves);
  const followerIncrease = toNumber(data.followerIncrease);
  const interaction = toNumber(data.interactionCount) || likes + comments + shares + saves;
  const externalLinkTaps = toNumber(data.externalLinkTaps);
  const profileVisits = toNumber(data.profileVisits);

  return {
    userId,
    month: toMonthString(publishedAt),
    date: toDayString(publishedAt),
    snsType: "instagram",
    delta: {
      likes,
      comments,
      shares,
      reach,
      saves,
      followerIncrease,
      interaction,
      externalLinkTaps,
      profileVisits,
      postCount: 1,
    },
    daily: {
      likes,
      reach,
      saves,
      comments,
      engagement: interaction,
    },
  };
}

export function negateContribution(input: AnalyticsContribution): AnalyticsContribution {
  return {
    ...input,
    delta: {
      likes: -input.delta.likes,
      comments: -input.delta.comments,
      shares: -input.delta.shares,
      reach: -input.delta.reach,
      saves: -input.delta.saves,
      followerIncrease: -input.delta.followerIncrease,
      interaction: -input.delta.interaction,
      externalLinkTaps: -input.delta.externalLinkTaps,
      profileVisits: -input.delta.profileVisits,
      postCount: -input.delta.postCount,
    },
    daily: {
      likes: -input.daily.likes,
      reach: -input.daily.reach,
      saves: -input.daily.saves,
      comments: -input.daily.comments,
      engagement: -input.daily.engagement,
    },
  };
}

function mergeDelta(a: SummaryDelta, b: SummaryDelta): SummaryDelta {
  return {
    likes: a.likes + b.likes,
    comments: a.comments + b.comments,
    shares: a.shares + b.shares,
    reach: a.reach + b.reach,
    saves: a.saves + b.saves,
    followerIncrease: a.followerIncrease + b.followerIncrease,
    interaction: a.interaction + b.interaction,
    externalLinkTaps: a.externalLinkTaps + b.externalLinkTaps,
    profileVisits: a.profileVisits + b.profileVisits,
    postCount: a.postCount + b.postCount,
  };
}

export function applyDeltaNonNegative(base: number, delta: number): number {
  const result = base + delta;
  return result < 0 ? 0 : result;
}

export function createPatch(userId: string, month: string, docId: string): SummaryPatch {
  return {
    userId,
    month,
    snsType: "instagram",
    lastAnalyticsDocId: docId,
    delta: { ...EMPTY_DELTA },
    dailyByDate: new Map<string, DailyDelta>(),
  };
}

export function addContributionToPatch(patch: SummaryPatch, contribution: AnalyticsContribution) {
  patch.delta = mergeDelta(patch.delta, contribution.delta);
  const existing = patch.dailyByDate.get(contribution.date) ?? {
    likes: 0,
    reach: 0,
    saves: 0,
    comments: 0,
    engagement: 0,
  };
  patch.dailyByDate.set(contribution.date, {
    likes: existing.likes + contribution.daily.likes,
    reach: existing.reach + contribution.daily.reach,
    saves: existing.saves + contribution.daily.saves,
    comments: existing.comments + contribution.daily.comments,
    engagement: existing.engagement + contribution.daily.engagement,
  });
}
