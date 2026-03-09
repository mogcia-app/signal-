import { getAdminDb } from "@/lib/firebase-admin";
import {
  MAINTENANCE_COLLECTION,
  MAINTENANCE_DOC_ID,
  type MaintenanceFeatureKey,
  normalizeMaintenanceDoc,
} from "@/lib/server/maintenance-config";

type FeatureGuardResult = {
  allowed: boolean;
  reason: string | null;
};

let cache:
  | {
      timestamp: number;
      featureFlags: Record<string, boolean>;
    }
  | null = null;

const CACHE_MS = 5_000;

async function getFeatureFlags(): Promise<Record<string, boolean>> {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_MS) {
    return cache.featureFlags;
  }

  const db = getAdminDb();
  const snapshot = await db.collection(MAINTENANCE_COLLECTION).doc(MAINTENANCE_DOC_ID).get();
  const current = normalizeMaintenanceDoc(snapshot.data());

  cache = {
    timestamp: now,
    featureFlags: current.featureFlags,
  };
  return current.featureFlags;
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

