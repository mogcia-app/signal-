import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, ForbiddenError, requireAuthContext } from "@/lib/server/auth-context";
import {
  MAINTENANCE_COLLECTION,
  MAINTENANCE_DOC_ID,
  MAINTENANCE_FEATURE_KEYS,
  type MaintenanceFeatureKey,
  normalizeMaintenanceDoc,
  serializeMaintenanceForResponse,
  type SessionPolicy,
  type ToolMaintenanceCurrent,
} from "@/lib/server/maintenance-config";

type MaintenancePatch = Partial<{
  enabled: boolean;
  message: string;
  allowAdminBypass: boolean;
  allowedRoles: string[];
  loginBlocked: boolean;
  sessionPolicy: SessionPolicy;
  allowPasswordReset: boolean;
  featureFlags: Partial<Record<MaintenanceFeatureKey, boolean>>;
}>;

type PatchRequestBody = {
  reason?: unknown;
  expectedVersion?: unknown;
  patch?: unknown;
};

class ConflictError extends Error {
  status = 409;
  code = "CONFLICT";

  constructor(message = "Version conflict") {
    super(message);
    this.name = "ConflictError";
  }
}

class ValidationError extends Error {
  status = 400;
  code = "VALIDATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const normalizeRole = (role: unknown): string =>
  typeof role === "string" ? role.trim().toLowerCase() : "";

const isAdminViewerRole = (role: string): boolean =>
  role === "admin" || role === "billing_admin" || role === "super_admin";

const isAdminUpdaterRole = (role: string): boolean =>
  role === "billing_admin" || role === "super_admin";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isSessionPolicy = (value: unknown): value is SessionPolicy =>
  value === "allow_existing" || value === "force_logout";

const sanitizePatch = (raw: unknown): MaintenancePatch => {
  if (!isRecord(raw)) {
    throw new ValidationError("patch must be an object");
  }

  const allowedKeys = new Set([
    "enabled",
    "message",
    "allowAdminBypass",
    "allowedRoles",
    "loginBlocked",
    "sessionPolicy",
    "allowPasswordReset",
    "featureFlags",
  ]);

  for (const key of Object.keys(raw)) {
    if (!allowedKeys.has(key)) {
      throw new ValidationError(`unsupported patch key: ${key}`);
    }
  }

  const patch: MaintenancePatch = {};

  if ("enabled" in raw) {
    if (typeof raw.enabled !== "boolean") {
      throw new ValidationError("enabled must be boolean");
    }
    patch.enabled = raw.enabled;
  }

  if ("message" in raw) {
    if (typeof raw.message !== "string") {
      throw new ValidationError("message must be string");
    }
    patch.message = raw.message.trim();
  }

  if ("allowAdminBypass" in raw) {
    if (typeof raw.allowAdminBypass !== "boolean") {
      throw new ValidationError("allowAdminBypass must be boolean");
    }
    patch.allowAdminBypass = raw.allowAdminBypass;
  }

  if ("allowedRoles" in raw) {
    if (!Array.isArray(raw.allowedRoles)) {
      throw new ValidationError("allowedRoles must be string[]");
    }
    const roles = raw.allowedRoles
      .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
      .filter(Boolean);
    if (roles.length === 0) {
      throw new ValidationError("allowedRoles cannot be empty");
    }
    patch.allowedRoles = Array.from(new Set(roles));
  }

  if ("loginBlocked" in raw) {
    if (typeof raw.loginBlocked !== "boolean") {
      throw new ValidationError("loginBlocked must be boolean");
    }
    patch.loginBlocked = raw.loginBlocked;
  }

  if ("sessionPolicy" in raw) {
    if (!isSessionPolicy(raw.sessionPolicy)) {
      throw new ValidationError("sessionPolicy must be allow_existing or force_logout");
    }
    patch.sessionPolicy = raw.sessionPolicy;
  }

  if ("allowPasswordReset" in raw) {
    if (typeof raw.allowPasswordReset !== "boolean") {
      throw new ValidationError("allowPasswordReset must be boolean");
    }
    patch.allowPasswordReset = raw.allowPasswordReset;
  }

  if ("featureFlags" in raw) {
    if (!isRecord(raw.featureFlags)) {
      throw new ValidationError("featureFlags must be object");
    }
    const featureFlags: Partial<Record<MaintenanceFeatureKey, boolean>> = {};
    const allowedFeatureKeys = new Set(MAINTENANCE_FEATURE_KEYS);
    for (const [key, value] of Object.entries(raw.featureFlags)) {
      if (!allowedFeatureKeys.has(key as MaintenanceFeatureKey)) {
        throw new ValidationError(`unsupported feature flag key: ${key}`);
      }
      if (typeof value !== "boolean") {
        throw new ValidationError(`feature flag must be boolean: ${key}`);
      }
      featureFlags[key as MaintenanceFeatureKey] = value;
    }
    patch.featureFlags = featureFlags;
  }

  return patch;
};

const applyPatch = (before: ToolMaintenanceCurrent, patch: MaintenancePatch): ToolMaintenanceCurrent => {
  const featureFlags = { ...before.featureFlags, ...(patch.featureFlags || {}) };
  const after: ToolMaintenanceCurrent = {
    ...before,
    ...patch,
    featureFlags,
    allowedRoles: patch.allowedRoles || before.allowedRoles,
    message: typeof patch.message === "string" ? patch.message : before.message,
  };

  if (after.enabled && !after.message.trim()) {
    throw new ValidationError("message is required when enabled=true");
  }

  if (!after.allowedRoles || after.allowedRoles.length === 0) {
    throw new ValidationError("allowedRoles cannot be empty");
  }

  return after;
};

const diffKeys = (before: ToolMaintenanceCurrent, after: ToolMaintenanceCurrent): string[] => {
  const keys: string[] = [];
  const topLevelKeys: Array<keyof ToolMaintenanceCurrent> = [
    "enabled",
    "message",
    "allowAdminBypass",
    "allowedRoles",
    "loginBlocked",
    "sessionPolicy",
    "allowPasswordReset",
    "version",
    "updatedBy",
    "updatedByEmail",
    "scheduledStart",
    "scheduledEnd",
  ];

  for (const key of topLevelKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      keys.push(key);
    }
  }

  for (const featureKey of MAINTENANCE_FEATURE_KEYS) {
    if (before.featureFlags[featureKey] !== after.featureFlags[featureKey]) {
      keys.push(`featureFlags.${featureKey}`);
    }
  }

  return keys;
};

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      rateLimit: { key: "admin-maintenance-get", limit: 60, windowSeconds: 60 },
      auditEventName: "admin_maintenance_get",
    });

    const db = getAdminDb();
    const actorDoc = await db.collection("users").doc(uid).get();
    const actorRole = normalizeRole(actorDoc.data()?.role);
    if (!isAdminViewerRole(actorRole)) {
      throw new ForbiddenError("Forbidden");
    }

    const snapshot = await db.collection(MAINTENANCE_COLLECTION).doc(MAINTENANCE_DOC_ID).get();
    const current = normalizeMaintenanceDoc(snapshot.data());
    return NextResponse.json({
      success: true,
      data: serializeMaintenanceForResponse(current),
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      rateLimit: { key: "admin-maintenance-patch", limit: 20, windowSeconds: 60 },
      auditEventName: "admin_maintenance_patch",
    });

    const body = (await request.json().catch(() => null)) as PatchRequestBody | null;
    if (!body || !isRecord(body)) {
      throw new ValidationError("request body must be object");
    }

    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (reason.length < 10) {
      throw new ValidationError("reason must be at least 10 characters");
    }

    const expectedVersion = typeof body.expectedVersion === "number" ? body.expectedVersion : null;
    if (expectedVersion !== null && (!Number.isFinite(expectedVersion) || expectedVersion < 0)) {
      throw new ValidationError("expectedVersion must be non-negative number");
    }

    const patch = sanitizePatch(body.patch);

    const db = getAdminDb();
    const actorDoc = await db.collection("users").doc(uid).get();
    const actorData = actorDoc.data() || {};
    const actorRole = normalizeRole(actorData.role);
    const actorEmail =
      typeof actorData.email === "string" && actorData.email.trim()
        ? actorData.email.trim()
        : null;

    if (!isAdminUpdaterRole(actorRole)) {
      throw new ForbiddenError("Forbidden");
    }

    if (
      (patch.sessionPolicy === "force_logout" || patch.loginBlocked === true) &&
      actorRole !== "super_admin"
    ) {
      throw new ForbiddenError("Only super_admin can set force_logout or loginBlocked=true");
    }

    const requestId = crypto.randomUUID();
    const actorIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;
    const userAgent = request.headers.get("user-agent") ?? null;

    const maintenanceRef = db.collection(MAINTENANCE_COLLECTION).doc(MAINTENANCE_DOC_ID);
    const auditRef = db.collection("auditLogs").doc();

    let responseData: ReturnType<typeof serializeMaintenanceForResponse> | null = null;

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(maintenanceRef);
      const before = normalizeMaintenanceDoc(snapshot.data());

      if (expectedVersion !== null && before.version !== expectedVersion) {
        throw new ConflictError(
          `version mismatch: expected=${expectedVersion} actual=${before.version}`,
        );
      }

      const patched = applyPatch(before, patch);
      const nextVersion = before.version + 1;
      const changedKeys = diffKeys(before, { ...patched, version: nextVersion });

      const updatedPayload = {
        ...patched,
        version: nextVersion,
        updatedBy: uid,
        updatedByEmail: actorEmail || "",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      transaction.set(maintenanceRef, updatedPayload, { merge: true });
      transaction.set(auditRef, {
        event: "admin.maintenance.update",
        actorUid: uid,
        actorEmail,
        reason,
        target: `${MAINTENANCE_COLLECTION}/${MAINTENANCE_DOC_ID}`,
        before: serializeMaintenanceForResponse(before),
        after: {
          ...serializeMaintenanceForResponse({ ...patched, version: nextVersion }),
          updatedBy: uid,
          updatedByEmail: actorEmail || "",
        },
        changedKeys,
        requestId,
        ip: actorIp,
        userAgent,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      responseData = {
        ...serializeMaintenanceForResponse({ ...patched, version: nextVersion }),
        updatedBy: uid,
        updatedByEmail: actorEmail || "",
      };
    });

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof ConflictError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        { status: error.status },
      );
    }
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

