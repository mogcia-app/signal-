import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import { getMetaReviewConnectionStatus } from "@/lib/server/meta-review";

function buildValidationError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: false,
      rateLimit: { key: "review-meta-connect-status", limit: 30, windowSeconds: 60 },
      auditEventName: "review_meta_connect_status",
    });

    try {
      const status = await getMetaReviewConnectionStatus(uid);
      return NextResponse.json({
        success: true,
        data: status,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "接続状態の取得に失敗しました。";
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
