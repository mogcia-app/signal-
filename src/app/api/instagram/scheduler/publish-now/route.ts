import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import { publishDueScheduledPosts } from "@/lib/server/instagram-scheduler";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "instagram-scheduler-publish-now", limit: 10, windowSeconds: 60 },
      auditEventName: "instagram_scheduler_publish_now",
    });

    const result = await publishDueScheduledPosts({ clientId: uid });
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
