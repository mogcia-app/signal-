import { NextRequest, NextResponse } from "next/server";
import { publishDueScheduledPosts } from "@/lib/server/instagram-scheduler";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest): boolean {
  const expectedSecret = process.env.CRON_SECRET?.trim();
  if (!expectedSecret) {
    return false;
  }

  const authHeader = request.headers.get("authorization") || "";
  return authHeader === `Bearer ${expectedSecret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await publishDueScheduledPosts();
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("scheduled publish cron failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to publish scheduled posts",
      },
      { status: 500 },
    );
  }
}
