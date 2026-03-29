import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import { createScheduledPost, parseScheduledAt } from "@/lib/server/instagram-scheduler";

interface PublishRequestBody {
  caption?: string;
  imageUrl?: string;
  scheduledAt?: string;
}

function buildValidationError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
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

    let scheduledAt: Date;
    try {
      scheduledAt = parseScheduledAt(body.scheduledAt);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "SCHEDULE_TOO_SOON") {
        return buildValidationError("投稿日は現在時刻から10分以降を指定してください。");
      }
      return buildValidationError("scheduledAt must be a valid ISO datetime.");
    }

    try {
      const scheduledPost = await createScheduledPost({
        clientId: uid,
        imageUrl: body.imageUrl,
        caption: body.caption,
        scheduledAt,
      });

      return NextResponse.json({
        success: true,
        data: {
          creationId: scheduledPost.creation_id,
          scheduledPublishTime: scheduledPost.scheduled_time.toISOString(),
          note: "Creation container created via the Instagram Graph API and queued for scheduled publish.",
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "予約投稿の作成に失敗しました。";
      if (message === "INSTAGRAM_ACCOUNT_NOT_FOUND" || message === "INSTAGRAM_ACCOUNT_INCOMPLETE") {
        return buildValidationError("Instagramアカウント連携情報が見つかりません。", 400);
      }
      if (message === "TOKEN_EXPIRED" || (error as { code?: string })?.code === "TOKEN_INVALID") {
        return buildValidationError("Instagramのトークンが無効です。再ログインしてください。", 401);
      }
      if ((error as { code?: string })?.code === "PERMISSION_DENIED") {
        return buildValidationError(message, 403);
      }
      if ((error as { status?: number })?.status && (error as { status?: number }).status! >= 400 && (error as { status?: number }).status! < 500) {
        return buildValidationError(message, (error as { status: number }).status);
      }
      throw error;
    }
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
