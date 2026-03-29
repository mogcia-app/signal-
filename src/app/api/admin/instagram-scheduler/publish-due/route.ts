import { NextRequest, NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/server/admin-auth";
import { buildErrorResponse } from "@/lib/server/auth-context";
import { publishDueScheduledPosts } from "@/lib/server/instagram-scheduler";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await requireAdminContext(request, {
      requireContract: false,
      rateLimit: { key: "admin-instagram-scheduler-publish", limit: 10, windowSeconds: 60 },
      auditEventName: "admin_instagram_scheduler_publish",
    });

    const result = await publishDueScheduledPosts();
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
