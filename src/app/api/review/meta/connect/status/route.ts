import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";

export async function GET(request: NextRequest) {
  try {
    await requireAuthContext(request, {
      requireContract: false,
      rateLimit: { key: "review-meta-connect-status", limit: 30, windowSeconds: 60 },
      auditEventName: "review_meta_connect_status",
    });

    // TODO: 実装時はMeta Graph APIの接続確認に置き換える
    return NextResponse.json({
      success: true,
      data: {
        pageConnected: false,
        instagramConnected: false,
        pageId: null,
        instagramAccountId: null,
        note: "Template response. Replace with real Graph API check for /me/accounts and linked IG account.",
      },
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
