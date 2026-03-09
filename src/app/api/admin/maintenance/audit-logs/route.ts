import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, ForbiddenError, requireAuthContext } from "@/lib/server/auth-context";

type AuditLogDoc = {
  event?: string;
  actorUid?: string;
  actorEmail?: string | null;
  reason?: string;
  target?: string;
  changedKeys?: string[];
  requestId?: string;
  createdAt?: admin.firestore.Timestamp | { toDate?: () => Date };
};

const normalizeRole = (role: unknown): string =>
  typeof role === "string" ? role.trim().toLowerCase() : "";

const isAdminViewerRole = (role: string): boolean =>
  role === "admin" || role === "billing_admin" || role === "super_admin";

const toDate = (value: AuditLogDoc["createdAt"]): Date | null => {
  if (!value) {
    return null;
  }
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate();
  }
  if (typeof value === "object" && typeof value.toDate === "function") {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      rateLimit: { key: "admin-maintenance-audit-logs", limit: 60, windowSeconds: 60 },
      auditEventName: "admin_maintenance_audit_logs_get",
    });

    const db = getAdminDb();
    const actorDoc = await db.collection("users").doc(uid).get();
    const actorRole = normalizeRole(actorDoc.data()?.role);
    if (!isAdminViewerRole(actorRole)) {
      throw new ForbiddenError("Forbidden");
    }

    const params = request.nextUrl.searchParams;
    const limitRaw = Number.parseInt(params.get("limit") || "", 10);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 100)
      : 50;
    const cursor = (params.get("cursor") || "").trim();
    const events = [
      "admin.maintenance.update",
      "admin.login_control.update",
      "admin.feature_flags.update",
    ];

    let query: admin.firestore.Query = db
      .collection("auditLogs")
      .where("event", "in", events)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (cursor) {
      const cursorDoc = await db.collection("auditLogs").doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const items = snapshot.docs.map((doc) => {
      const data = doc.data() as AuditLogDoc;
      return {
        id: doc.id,
        event: data.event || "",
        actorUid: data.actorUid || "",
        actorEmail: data.actorEmail || null,
        reason: data.reason || "",
        target: data.target || "",
        changedKeys: Array.isArray(data.changedKeys) ? data.changedKeys : [],
        requestId: data.requestId || "",
        createdAt: toDate(data.createdAt)?.toISOString() || null,
      };
    });

    const nextCursor = snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null;

    return NextResponse.json({
      success: true,
      data: {
        items,
        nextCursor,
      },
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

