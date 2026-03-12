import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import {
  buildActorProfile,
  normalizeString,
  normalizeUiEventBase,
  type UiEventBase,
  writeUiEventLog,
} from "@/app/api/ui-events/_shared";

type PageButtonClickBody = UiEventBase & {
  buttonId?: unknown;
  label?: unknown;
  pagePath?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const { uid, token } = await requireAuthContext(request, {
      rateLimit: { key: "ui-page-button-click", limit: 240, windowSeconds: 60 },
      auditEventName: "ui_page_button_click",
    });

    const body = (await request.json().catch(() => null)) as PageButtonClickBody | null;
    const actorEmail =
      typeof token.email === "string" && token.email.trim().length > 0
        ? token.email.trim().toLowerCase()
        : null;

    console.info("[ui-events/page-button-click] request", {
      path: request.nextUrl.pathname,
      uid,
      buttonId: normalizeString(body?.buttonId, 160) || null,
      pagePath: normalizeString(body?.pagePath, 500) || null,
    });

    await writeUiEventLog(request, {
      eventType: "page.button.click",
      ...(await buildActorProfile(uid, actorEmail)),
      ...normalizeUiEventBase(body || {}),
      buttonId: normalizeString(body?.buttonId, 160) || null,
      label: normalizeString(body?.label, 200) || null,
      pagePath: normalizeString(body?.pagePath, 500) || null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ui-events/page-button-click] error", {
      path: request.nextUrl.pathname,
      error,
    });
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
