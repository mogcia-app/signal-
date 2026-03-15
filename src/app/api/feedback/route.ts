import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebase-admin";
import {
  buildErrorResponse,
  ForbiddenError,
  requireAuthContext,
} from "../../../lib/server/auth-context";

interface FeedbackData {
  id?: string;
  userId: string;
  pageType: "analytics" | "monthly-report" | "plan" | "posts";
  satisfaction: "satisfied" | "dissatisfied";
  feedback: string;
  contextData: Record<string, unknown>;
  timestamp: Date;
  processed: boolean;
}

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

    const feedbackData: FeedbackData = {
      userId: resolvedUserId,
      pageType,
      satisfaction,
      feedback,
      contextData: contextData || {},
      timestamp: new Date(),
      processed: false,
    };

    const docRef = await adminDb.collection("user_feedback").add(feedbackData);

    return NextResponse.json({
      success: true,
      message: "フィードバックが保存されました",
      id: docRef.id,
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

    let queryRef: FirebaseFirestore.Query = adminDb
      .collection("user_feedback")
      .where("userId", "==", resolvedUserId)
      .orderBy("timestamp", "desc")
      .limit(50);

    if (pageType) {
      queryRef = adminDb
        .collection("user_feedback")
        .where("userId", "==", resolvedUserId)
        .where("pageType", "==", pageType)
        .orderBy("timestamp", "desc")
        .limit(50);
    }

    const snapshot = await queryRef.get();
    const feedbacks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

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
