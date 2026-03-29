import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import {
  createScheduledPost,
  getInstagramAccountForClient,
  listScheduledPostsForClient,
  parseScheduledAt,
} from "@/lib/server/instagram-scheduler";
import { uploadPostImageDataUrl } from "@/lib/server/post-image-storage";

export const runtime = "nodejs";

const MAX_CAPTION_LENGTH = 2200;
const MAX_IMAGE_DATA_BYTES = 3_000_000;

type CreateSchedulerRequest = {
  imageData?: string;
  caption?: string;
  scheduledAt?: string;
};

function buildValidationError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "instagram-scheduler-list", limit: 60, windowSeconds: 60 },
      auditEventName: "instagram_scheduler_list",
    });

    const [account, posts] = await Promise.all([
      getInstagramAccountForClient(uid),
      listScheduledPostsForClient(uid),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        accountConnected: Boolean(account),
        tokenExpiresAt: account?.token_expire_at?.toISOString() || null,
        posts: posts.map((post) => ({
          id: post.id,
          imageUrl: post.image_url,
          caption: post.caption,
          creationId: post.creation_id,
          scheduledTime: post.scheduled_time.toISOString(),
          status: post.status,
          publishedAt: post.published_at?.toISOString() || null,
          lastError: post.last_error || null,
        })),
      },
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "instagram-scheduler-create", limit: 20, windowSeconds: 60 },
      auditEventName: "instagram_scheduler_create",
    });

    let body: CreateSchedulerRequest;
    try {
      body = (await request.json()) as CreateSchedulerRequest;
    } catch {
      return buildValidationError("Invalid JSON body.");
    }

    const imageData = typeof body.imageData === "string" ? body.imageData.trim() : "";
    const caption = typeof body.caption === "string" ? body.caption.trim() : "";
    const scheduledAtRaw = typeof body.scheduledAt === "string" ? body.scheduledAt.trim() : "";

    if (!imageData || !caption || !scheduledAtRaw) {
      return buildValidationError("imageData, caption, scheduledAt are required.");
    }
    if (!imageData.startsWith("data:image/")) {
      return buildValidationError("画像データ形式が不正です");
    }
    if (Buffer.byteLength(imageData, "utf8") > MAX_IMAGE_DATA_BYTES) {
      return buildValidationError("画像サイズが大きすぎます。画像を小さくして再度お試しください。", 413);
    }
    if (caption.length > MAX_CAPTION_LENGTH) {
      return buildValidationError(`キャプションは${MAX_CAPTION_LENGTH}文字以内で入力してください。`);
    }

    let scheduledAt: Date;
    try {
      scheduledAt = parseScheduledAt(scheduledAtRaw);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "SCHEDULE_TOO_SOON") {
        return buildValidationError("投稿日は現在時刻から10分以降を指定してください。");
      }
      return buildValidationError("投稿日の形式が不正です。");
    }

    const uploaded = await uploadPostImageDataUrl({
      userId: uid,
      imageDataUrl: imageData,
    });

    try {
      const scheduledPost = await createScheduledPost({
        clientId: uid,
        imageUrl: uploaded.imageUrl,
        caption,
        scheduledAt,
      });

      return NextResponse.json({
        success: true,
        data: {
          id: scheduledPost.id,
          imageUrl: scheduledPost.image_url,
          caption: scheduledPost.caption,
          creationId: scheduledPost.creation_id,
          scheduledTime: scheduledPost.scheduled_time.toISOString(),
          status: scheduledPost.status,
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
