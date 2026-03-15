import { NextRequest, NextResponse } from "next/server";
import {
  buildErrorResponse,
  ForbiddenError,
  requireAuthContext,
} from "../../../lib/server/auth-context";
import { FeedbackRepository } from "@/repositories/feedback-repository";

function resolveRequestedUserId(candidate: unknown, authenticatedUid: string): string {
  if (candidate === undefined || candidate === null || candidate === "") {
    return authenticatedUid;
  }

  if (typeof candidate !== "string" || candidate !== authenticatedUid) {
    throw new ForbiddenError("他のユーザーのフィードバックにはアクセスできません");
  }

  return candidate;
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: false,
      rateLimit: { key: "feedback-create", limit: 20, windowSeconds: 60 },
      auditEventName: "feedback_create",
    });

    const body = await request.json();
    const { userId, pageType, satisfaction, feedback, contextData } = body;
    const resolvedUserId = resolveRequestedUserId(userId, uid);

    if (!pageType || !satisfaction || !feedback) {
      return NextResponse.json(
        {
          success: false,
          error: "pageType, satisfaction, and feedback are required",
        },
        { status: 400 }
      );
    }

    const created = await FeedbackRepository.create({
      userId: resolvedUserId,
      pageType,
      satisfaction,
      feedback,
      contextData: contextData || {},
    });

    return NextResponse.json({
      success: true,
      message: "フィードバックが保存されました",
      id: created.id,
    });
  } catch (error) {
    console.error("フィードバック保存エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: false,
      rateLimit: { key: "feedback-read", limit: 60, windowSeconds: 60 },
      auditEventName: "feedback_read",
    });

    const { searchParams } = new URL(request.url);
    const resolvedUserId = resolveRequestedUserId(searchParams.get("userId"), uid);
    const pageType = searchParams.get("pageType");

    const feedbacks = await FeedbackRepository.listByUser(resolvedUserId, pageType);

    return NextResponse.json({
      success: true,
      data: feedbacks,
    });
  } catch (error) {
    console.error("フィードバック取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
