import * as admin from "firebase-admin";

export const MAINTENANCE_DOC_PATH = "toolMaintenance/current";
export const MAINTENANCE_COLLECTION = "toolMaintenance";
export const MAINTENANCE_DOC_ID = "current";

export const MAINTENANCE_FEATURE_KEYS = [
  "dashboard.write",
  "plan.write",
  "post.write",
  "analytics.write",
  "ai.generate",
] as const;

export type MaintenanceFeatureKey = (typeof MAINTENANCE_FEATURE_KEYS)[number];
export type SessionPolicy = "allow_existing" | "force_logout";

export type ToolMaintenanceCurrent = {
  enabled: boolean;
  message: string;
  allowAdminBypass: boolean;
  allowedRoles: string[];
  loginBlocked: boolean;
  sessionPolicy: SessionPolicy;
  allowPasswordReset: boolean;
  featureFlags: Record<MaintenanceFeatureKey, boolean>;
  version: number;
  updatedBy: string;
  updatedByEmail: string;
  updatedAt: admin.firestore.Timestamp | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
};

const DEFAULT_FEATURE_FLAGS: Record<MaintenanceFeatureKey, boolean> = {
  "dashboard.write": true,
  "plan.write": true,
  "post.write": true,
  "analytics.write": true,
  "ai.generate": true,
};

const DEFAULT_ALLOWED_ROLES = ["super_admin"];

export const DEFAULT_MAINTENANCE_CURRENT: ToolMaintenanceCurrent = {
  enabled: false,
  message: "",
  allowAdminBypass: true,
  allowedRoles: DEFAULT_ALLOWED_ROLES,
  loginBlocked: false,
  sessionPolicy: "allow_existing",
  allowPasswordReset: true,
  featureFlags: DEFAULT_FEATURE_FLAGS,
  version: 0,
  updatedBy: "",
  updatedByEmail: "",
  updatedAt: null,
  scheduledStart: null,
  scheduledEnd: null,
};

const asTrimmed = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const toBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

const toNonNegativeNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;

const toNullableString = (value: unknown): string | null => {
  const trimmed = asTrimmed(value);
  return trimmed || null;
};

const normalizeAllowedRoles = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return DEFAULT_ALLOWED_ROLES;
  }

  const roles = value
    .map((item) => asTrimmed(item).toLowerCase())
    .filter(Boolean);

  return roles.length > 0 ? Array.from(new Set(roles)) : DEFAULT_ALLOWED_ROLES;
};

const normalizeFeatureFlags = (
  value: unknown,
): Record<MaintenanceFeatureKey, boolean> => {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const result = { ...DEFAULT_FEATURE_FLAGS };

  for (const key of MAINTENANCE_FEATURE_KEYS) {
    if (typeof raw[key] === "boolean") {
      result[key] = raw[key] as boolean;
    }
  }

  return result;
};

export function normalizeMaintenanceDoc(raw: unknown): ToolMaintenanceCurrent {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const policyRaw = asTrimmed(data.sessionPolicy);
  const sessionPolicy: SessionPolicy =
    policyRaw === "force_logout" ? "force_logout" : "allow_existing";

  const updatedAtRaw = data.updatedAt;
  const updatedAt =
    updatedAtRaw instanceof admin.firestore.Timestamp
      ? updatedAtRaw
      : updatedAtRaw && typeof updatedAtRaw === "object" && "toDate" in updatedAtRaw
        ? (updatedAtRaw as admin.firestore.Timestamp)
        : null;

  return {
    enabled: toBoolean(data.enabled, DEFAULT_MAINTENANCE_CURRENT.enabled),
    message: asTrimmed(data.message),
    allowAdminBypass: toBoolean(
      data.allowAdminBypass,
      DEFAULT_MAINTENANCE_CURRENT.allowAdminBypass,
    ),
    allowedRoles: normalizeAllowedRoles(data.allowedRoles),
    loginBlocked: toBoolean(data.loginBlocked, DEFAULT_MAINTENANCE_CURRENT.loginBlocked),
    sessionPolicy,
    allowPasswordReset: toBoolean(
      data.allowPasswordReset,
      DEFAULT_MAINTENANCE_CURRENT.allowPasswordReset,
    ),
    featureFlags: normalizeFeatureFlags(data.featureFlags),
    version: toNonNegativeNumber(data.version, DEFAULT_MAINTENANCE_CURRENT.version),
    updatedBy: asTrimmed(data.updatedBy),
    updatedByEmail: asTrimmed(data.updatedByEmail),
    updatedAt,
    scheduledStart: toNullableString(data.scheduledStart),
    scheduledEnd: toNullableString(data.scheduledEnd),
  };
}

export function serializeMaintenanceForResponse(
  data: ToolMaintenanceCurrent,
): Omit<ToolMaintenanceCurrent, "updatedAt"> & { updatedAt: string | null } {
  return {
    ...data,
    updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
  };
}

