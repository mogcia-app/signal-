import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";

const DEFAULT_METRICS = ["impressions", "reach", "likes", "comments", "saved"] as const;

export async function GET(request: NextRequest) {
  try {
    await requireAuthContext(request, {
      requireContract: false,
      rateLimit: { key: "review-meta-insights", limit: 30, windowSeconds: 60 },
      auditEventName: "review_meta_insights",
    });

    const mediaId = request.nextUrl.searchParams.get("mediaId");
    if (!mediaId) {
      return NextResponse.json(
        { success: false, error: "mediaId is required." },
        { status: 400 }
      );
    }

    // TODO: 実装時はMeta Graph API /{media-id}/insights に置き換える
    return NextResponse.json({
      success: true,
      data: {
        mediaId,
        metrics: DEFAULT_METRICS.map((name, index) => ({
          name,
          value: 1000 - index * 120,
        })),
        note: "Template response. Replace with Graph API insights metrics.",
      },
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
