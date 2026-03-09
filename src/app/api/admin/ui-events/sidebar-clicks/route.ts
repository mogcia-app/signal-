import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";

const COLLECTION = "uiEventLogs";
const MAX_LIMIT = 10000;
const DEFAULT_LIMIT = 3000;

type SidebarEventDoc = {
  eventType?: string;
  actorUid?: string;
  actorEmail?: string | null;
  buttonId?: string;
  label?: string;
  href?: string;
  currentPath?: string | null;
  createdAt?: admin.firestore.Timestamp | { toDate?: () => Date };
};

const parseDate = (value: string | null, fallback: Date): Date => {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const toDate = (value: SidebarEventDoc["createdAt"]): Date | null => {
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

const normalizeRole = (role: unknown): string => {
  if (typeof role !== "string") {
    return "";
  }
  return role.trim().toLowerCase();
};

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      rateLimit: { key: "admin-sidebar-clicks", limit: 60, windowSeconds: 60 },
      auditEventName: "admin_sidebar_clicks_access",
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
    const buttonIdFilter = (params.get("buttonId") || "").trim();
    const eventTypeParam = (params.get("eventType") || "sidebar.click").trim();
    const eventType =
      eventTypeParam === "page.button.click" || eventTypeParam === "sidebar.click"
        ? eventTypeParam
        : "sidebar.click";
    const limitRaw = Number.parseInt(params.get("limit") || "", 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), MAX_LIMIT) : DEFAULT_LIMIT;

    const snapshot = await db
      .collection(COLLECTION)
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(from))
      .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(to))
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const buttonCountMap = new Map<string, { buttonId: string; label: string; count: number; uniqueActors: Set<string> }>();
    const actorCountMap = new Map<string, { actorUid: string; actorEmail: string | null; count: number; byButton: Map<string, number> }>();

    let filteredTotal = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as SidebarEventDoc;
      if (data.eventType !== eventType) {
        return;
      }

      const actorUid = String(data.actorUid || "").trim();
      const actorEmail = data.actorEmail || null;
      const buttonId = String(data.buttonId || "").trim();
      const label = String(data.label || "").trim() || buttonId;
      if (!actorUid || !buttonId) {
        return;
      }

      if (actorUidFilter && actorUidFilter !== actorUid) {
        return;
      }
      if (buttonIdFilter && buttonIdFilter !== buttonId) {
        return;
      }

      filteredTotal += 1;

      const buttonEntry = buttonCountMap.get(buttonId) || {
        buttonId,
        label,
        count: 0,
        uniqueActors: new Set<string>(),
      };
      buttonEntry.count += 1;
      buttonEntry.uniqueActors.add(actorUid);
      buttonCountMap.set(buttonId, buttonEntry);

      const actorEntry = actorCountMap.get(actorUid) || {
        actorUid,
        actorEmail,
        count: 0,
        byButton: new Map<string, number>(),
      };
      actorEntry.count += 1;
      actorEntry.byButton.set(buttonId, (actorEntry.byButton.get(buttonId) || 0) + 1);
      actorCountMap.set(actorUid, actorEntry);
    });

    const byButton = Array.from(buttonCountMap.values())
      .map((entry) => ({
        buttonId: entry.buttonId,
        label: entry.label,
        count: entry.count,
        uniqueActors: entry.uniqueActors.size,
      }))
      .sort((a, b) => b.count - a.count);

    const byActor = Array.from(actorCountMap.values())
      .map((entry) => ({
        actorUid: entry.actorUid,
        actorEmail: entry.actorEmail,
        count: entry.count,
        buttons: Array.from(entry.byButton.entries())
          .map(([buttonId, count]) => ({ buttonId, count }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.count - a.count);

    const latestClicks = snapshot.docs
      .map((doc) => {
        const data = doc.data() as SidebarEventDoc;
        if (data.eventType !== "sidebar.click") {
          return null;
        }
        if (data.eventType !== eventType) {
          return null;
        }
        if (actorUidFilter && data.actorUid !== actorUidFilter) {
          return null;
        }
        if (buttonIdFilter && data.buttonId !== buttonIdFilter) {
          return null;
        }
        return {
          id: doc.id,
          actorUid: data.actorUid || null,
          actorEmail: data.actorEmail || null,
          buttonId: data.buttonId || null,
          label: data.label || null,
          href: data.href || null,
          currentPath: data.currentPath || null,
          createdAt: toDate(data.createdAt)?.toISOString() || null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 100);

    return NextResponse.json({
      success: true,
      data: {
        range: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
        eventType,
        totalClicks: filteredTotal,
        uniqueActors: actorCountMap.size,
        byButton,
        byActor,
        latestClicks,
      },
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
