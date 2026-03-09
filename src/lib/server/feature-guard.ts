import { getAdminDb } from "@/lib/firebase-admin";

export type MaintenanceFeatureKey =
  | "dashboard.write"
  | "plan.write"
  | "post.write"
  | "analytics.write"
  | "ai.generate";

type FeatureGuardResult = {
  allowed: boolean;
  reason: string | null;
};

const MAINTENANCE_COLLECTION = "toolMaintenance";
const MAINTENANCE_DOC_ID = "current";
const CACHE_MS = 5_000;

let cache:
  | {
      timestamp: number;
      featureFlags: Record<string, boolean>;
    }
  | null = null;

const DEFAULT_FEATURE_FLAGS: Record<MaintenanceFeatureKey, boolean> = {
  "dashboard.write": true,
  "plan.write": true,
  "post.write": true,
  "analytics.write": true,
  "ai.generate": true,
};

async function getFeatureFlags(): Promise<Record<string, boolean>> {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_MS) {
    return cache.featureFlags;
  }

  const db = getAdminDb();
  const snapshot = await db.collection(MAINTENANCE_COLLECTION).doc(MAINTENANCE_DOC_ID).get();
  const raw = snapshot.data() as { featureFlags?: unknown } | undefined;
  const featureFlags =
    raw && typeof raw.featureFlags === "object" && raw.featureFlags !== null
      ? { ...DEFAULT_FEATURE_FLAGS, ...(raw.featureFlags as Record<string, boolean>) }
      : DEFAULT_FEATURE_FLAGS;

  cache = {
    timestamp: now,
    featureFlags,
  };
  return featureFlags;
}

export async function assertFeatureEnabled(feature: MaintenanceFeatureKey): Promise<void> {
  const flags = await getFeatureFlags();
  if (flags[feature] === false) {
    const error = new Error(`Feature disabled: ${feature}`);
    (error as Error & { status?: number; code?: string }).status = 403;
    (error as Error & { status?: number; code?: string }).code = "FEATURE_DISABLED";
    throw error;
  }
}

export async function checkFeatureEnabled(feature: MaintenanceFeatureKey): Promise<FeatureGuardResult> {
  const flags = await getFeatureFlags();
  if (flags[feature] === false) {
    return {
      allowed: false,
      reason: `Feature disabled: ${feature}`,
    };
  }
  return {
    allowed: true,
    reason: null,
  };
}

