import { NextRequest, NextResponse } from "next/server";

const DEFAULT_METRICS = ["impressions", "reach", "likes", "comments", "saved"] as const;

export async function GET(request: NextRequest) {
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
}
