import * as admin from "firebase-admin";
import type { UserProfile } from "@/types/user";
import { adminDb } from "@/lib/firebase-admin";
import { getUserPlanTier, type PlanTier } from "@/lib/plan-access";

export type AiOutputFeature =
  | "home_post_generation"
  | "home_advisor_chat"
  | "instagram_posts_advisor_chat"
  | "analytics_monthly_review";

interface AiUsageLimitConfig {
  monthlyLimit: number | null;
}

interface AiUsageDoc {
  uid: string;
  month: string;
  tier: PlanTier;
  limit: number | null;
  count: number;
  breakdown?: Record<string, number>;
  createdAt?: unknown;
}

const AI_USAGE_COLLECTION = "ai_output_usage_monthly";
const DEFAULT_TIMEZONE = "Asia/Tokyo";

const PLAN_LIMITS: Record<PlanTier, AiUsageLimitConfig> = {
  basic: { monthlyLimit: 10 },
  standard: { monthlyLimit: 20 },
  pro: { monthlyLimit: 50 },
};

export class AiUsageLimitError extends Error {
  readonly month: string;
  readonly limit: number | null;
  readonly used: number;
  readonly remaining: number | null;

  constructor(params: { month: string; limit: number | null; used: number }) {
    const remaining = params.limit === null ? null : Math.max(params.limit - params.used, 0);
    super(
      remaining === null
        ? "このプランはAI出力回数が無制限です。"
        : `今月のAI出力上限(${params.limit}回)に達しました。`
    );
    this.name = "AiUsageLimitError";
    this.month = params.month;
    this.limit = params.limit;
    this.used = params.used;
    this.remaining = remaining;
  }
}

const normalizeTimezone = (timezone: string | undefined): string => {
  const candidate = String(timezone || "").trim() || DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("ja-JP", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return DEFAULT_TIMEZONE;
  }
};

const getMonthKey = (date: Date, timezone: string): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value || "1970";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  return `${year}-${month}`;
};

const buildDocId = (uid: string, monthKey: string): string => `${uid}_${monthKey}`;

const resolveUsageContext = (params: {
  userProfile: UserProfile | null | undefined;
  now?: Date;
}): {
  monthKey: string;
  tier: PlanTier;
  limit: number | null;
  timezone: string;
} => {
  const now = params.now || new Date();
  const tier = getUserPlanTier(params.userProfile);
  const limit = PLAN_LIMITS[tier].monthlyLimit;
  const timezone = normalizeTimezone(params.userProfile?.timezone);
  const monthKey = getMonthKey(now, timezone);
  return { monthKey, tier, limit, timezone };
};

const parseUsageCount = (snapshotData: FirebaseFirestore.DocumentData | undefined, monthKey: string): number => {
  if (!snapshotData) {
    return 0;
  }
  const month = String(snapshotData.month || "");
  if (month !== monthKey) {
    return 0;
  }
  const count = Number(snapshotData.count || 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

export async function assertAiOutputAvailable(params: {
  uid: string;
  userProfile: UserProfile | null | undefined;
}): Promise<{ month: string; limit: number | null; used: number; remaining: number | null }> {
  const { uid, userProfile } = params;
  const { monthKey, limit } = resolveUsageContext({ userProfile });
  const docId = buildDocId(uid, monthKey);
  const usageDoc = await adminDb.collection(AI_USAGE_COLLECTION).doc(docId).get();
  const used = parseUsageCount(usageDoc.data(), monthKey);
  if (limit !== null && used >= limit) {
    throw new AiUsageLimitError({ month: monthKey, limit, used });
  }
  return {
    month: monthKey,
    limit,
    used,
    remaining: limit === null ? null : Math.max(limit - used, 0),
  };
}

export async function getAiUsageSummary(params: {
  uid: string;
  userProfile: UserProfile | null | undefined;
}): Promise<{
  month: string;
  limit: number | null;
  used: number;
  remaining: number | null;
  breakdown: Partial<Record<AiOutputFeature, number>>;
}> {
  const { uid, userProfile } = params;
  const { monthKey, limit } = resolveUsageContext({ userProfile });
  const docId = buildDocId(uid, monthKey);
  const usageDoc = await adminDb.collection(AI_USAGE_COLLECTION).doc(docId).get();
  const raw = usageDoc.data();
  const used = parseUsageCount(raw, monthKey);
  const breakdownRaw = raw?.breakdown;
  const breakdown =
    breakdownRaw && typeof breakdownRaw === "object"
      ? (breakdownRaw as Partial<Record<AiOutputFeature, number>>)
      : {};

  return {
    month: monthKey,
    limit,
    used,
    remaining: limit === null ? null : Math.max(limit - used, 0),
    breakdown,
  };
}

export async function consumeAiOutput(params: {
  uid: string;
  userProfile: UserProfile | null | undefined;
  feature: AiOutputFeature;
}): Promise<{ month: string; limit: number | null; used: number; remaining: number | null }> {
  const { uid, userProfile, feature } = params;
  const context = resolveUsageContext({ userProfile });
  const docId = buildDocId(uid, context.monthKey);
  const docRef = adminDb.collection(AI_USAGE_COLLECTION).doc(docId);

  const result = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);
    const currentData = (snapshot.data() || {}) as Partial<AiUsageDoc>;
    const currentMonth = String(currentData.month || "");
    const currentCount =
      currentMonth === context.monthKey && Number.isFinite(Number(currentData.count))
        ? Math.max(Number(currentData.count), 0)
        : 0;
    const nextCount = currentCount + 1;

    if (context.limit !== null && nextCount > context.limit) {
      throw new AiUsageLimitError({ month: context.monthKey, limit: context.limit, used: currentCount });
    }

    const currentBreakdown =
      currentMonth === context.monthKey && currentData.breakdown && typeof currentData.breakdown === "object"
        ? currentData.breakdown
        : {};
    const nextFeatureCount = Number(currentBreakdown[feature] || 0) + 1;
    const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 1000 * 60 * 60 * 24 * 45);

    transaction.set(
      docRef,
      {
        uid,
        month: context.monthKey,
        tier: context.tier,
        limit: context.limit,
        count: nextCount,
        breakdown: {
          ...currentBreakdown,
          [feature]: nextFeatureCount,
        },
        expiresAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: snapshot.exists
          ? currentData.createdAt || admin.firestore.FieldValue.serverTimestamp()
          : admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      month: context.monthKey,
      limit: context.limit,
      used: nextCount,
      remaining: context.limit === null ? null : Math.max(context.limit - nextCount, 0),
    };
  });

  return result;
}
