import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";

const COLLECTION = "uiEventLogs";

type SidebarClickBody = {
  buttonId?: unknown;
  label?: unknown;
  href?: unknown;
  currentPath?: unknown;
  sessionId?: unknown;
  clickedAt?: unknown;
};

const normalizeString = (value: unknown, maxLength = 200): string => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, maxLength);
};

export async function POST(request: NextRequest) {
  try {
    const { uid, token } = await requireAuthContext(request, {
      rateLimit: { key: "ui-sidebar-click", limit: 240, windowSeconds: 60 },
    });

    const body = (await request.json().catch(() => null)) as SidebarClickBody | null;
    const buttonId = normalizeString(body?.buttonId, 80);
    const label = normalizeString(body?.label, 120);
    const href = normalizeString(body?.href, 500);
    const currentPath = normalizeString(body?.currentPath, 500);
    const sessionId = normalizeString(body?.sessionId, 120);
    const clickedAt = normalizeString(body?.clickedAt, 80);

    if (!buttonId || !label || !href) {
      return NextResponse.json(
        { success: false, error: "buttonId, label, href are required" },
        { status: 400 },
      );
    }

    const email =
      typeof token.email === "string" && token.email.trim().length > 0
        ? token.email.trim().toLowerCase()
        : null;

    const db = getAdminDb();
    await db.collection(COLLECTION).add({
      eventType: "sidebar.click",
      actorUid: uid,
      actorEmail: email,
      buttonId,
      label,
      href,
      currentPath: currentPath || null,
      sessionId: sessionId || null,
      clickedAtClient: clickedAt || null,
      userAgent: request.headers.get("user-agent") ?? null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
