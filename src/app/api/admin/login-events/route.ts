import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";

const COLLECTION = "loginEventLogs";
const MAX_LIMIT = 10000;
const DEFAULT_LIMIT = 2000;

type LoginEventDoc = {
  eventType?: string;
  outcome?: "success" | "failed";
  actorUid?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  source?: string | null;
  currentPath?: string | null;
  errorCode?: string | null;
  ip?: string | null;
  createdAt?: admin.firestore.Timestamp | { toDate?: () => Date };
};

const parseDate = (value: string | null, fallback: Date): Date => {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const normalizeRole = (role: unknown): string => {
  if (typeof role !== "string") {
    return "";
  }
  return role.trim().toLowerCase();
};

const toDate = (value: LoginEventDoc["createdAt"]): Date | null => {
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
      rateLimit: { key: "admin-login-events", limit: 60, windowSeconds: 60 },
      auditEventName: "admin_login_events_access",
    });

    const db = getAdminDb();
    const actorDoc = await db.collection("users").doc(uid).get();
    const role = normalizeRole(actorDoc.data()?.role);
    const isAdmin = role === "admin" || role === "super_admin" || role === "billing_admin";
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7);
    const from = parseDate(params.get("from"), defaultFrom);
    const to = parseDate(params.get("to"), now);
    const actorUidFilter = (params.get("actorUid") || "").trim();
    const outcomeFilter = (params.get("outcome") || "all").trim();
    const limitRaw = Number.parseInt(params.get("limit") || "", 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), MAX_LIMIT) : DEFAULT_LIMIT;

    const snapshot = await db
      .collection(COLLECTION)
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(from))
      .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(to))
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    let successCount = 0;
    let failedCount = 0;
    const uniqueActors = new Set<string>();

    const items = snapshot.docs
      .map((doc) => {
        const data = doc.data() as LoginEventDoc;
        const eventType = data.eventType || "";
        const outcome = eventType === "auth.login.success" ? "success" : eventType === "auth.login.failed" ? "failed" : "";
        if (!outcome) {
          return null;
        }
        if (outcomeFilter !== "all" && outcome !== outcomeFilter) {
          return null;
        }
        if (actorUidFilter && actorUidFilter !== String(data.actorUid || "")) {
          return null;
        }

        if (outcome === "success") {
          successCount += 1;
        } else {
          failedCount += 1;
        }

        if (data.actorUid) {
          uniqueActors.add(data.actorUid);
        }

        return {
          id: doc.id,
          eventType,
          outcome,
          actorUid: data.actorUid || null,
          actorName: data.actorName || null,
          actorEmail: data.actorEmail || null,
          source: data.source || null,
          currentPath: data.currentPath || null,
          errorCode: data.errorCode || null,
          ip: data.ip || null,
          createdAt: toDate(data.createdAt)?.toISOString() || null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    return NextResponse.json({
      success: true,
      data: {
        range: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
        total: items.length,
        successCount,
        failedCount,
        uniqueActors: uniqueActors.size,
        items,
      },
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

