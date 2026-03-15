import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";

interface PublishRequestBody {
  caption?: string;
  imageUrl?: string;
  scheduledAt?: string;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuthContext(request, {
      requireContract: false,
      rateLimit: { key: "review-meta-publish", limit: 20, windowSeconds: 60 },
      auditEventName: "review_meta_publish",
    });

    let body: PublishRequestBody;
    try {
      body = (await request.json()) as PublishRequestBody;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
    }

    if (!body.caption || !body.imageUrl || !body.scheduledAt) {
      return NextResponse.json(
        {
          success: false,
          error: "caption, imageUrl, scheduledAt are required.",
        },
        { status: 400 }
      );
    }

    // TODO: 実装時はMeta Graph APIのmedia作成+予約投稿フローに置き換える
    return NextResponse.json({
      success: true,
      data: {
        creationId: `mock_creation_${Date.now()}`,
        scheduledPublishTime: body.scheduledAt,
        note: "Template response. Replace with Graph API: /{ig-user-id}/media then /{ig-user-id}/media_publish.",
      },
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
