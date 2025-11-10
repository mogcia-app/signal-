import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";

export async function GET(request: NextRequest) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "ai-chat-usage-get", limit: 30, windowSeconds: 60 },
      auditEventName: "ai_chat_usage_get",
    });

    // 今月の使用回数を取得
    const today = new Date();
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    const usageDoc = await adminDb.collection("aiChatUsage").doc(`${userId}-${monthKey}`).get();

    const currentUsage = usageDoc.exists ? usageDoc.data() : null;
    const usageCount = currentUsage?.count || 0;

    // 使用制限を調整（月50回に増加）
    const maxUsage = 50;
    const remainingUsage = Math.max(0, maxUsage - usageCount);
    const canUse = remainingUsage > 0;

    return NextResponse.json({
      success: true,
      usageInfo: {
        usageCount,
        maxUsage,
        remainingUsage,
        canUse,
        month: monthKey,
        lastUsed: currentUsage?.lastUsed?.toDate?.() || null,
      },
    });
  } catch (error) {
    console.error("Usage API Error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "ai-chat-usage-post", limit: 30, windowSeconds: 60 },
      auditEventName: "ai_chat_usage_post",
    });

    // 今月の使用回数を記録
    const today = new Date();
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const usageRef = adminDb.collection("aiChatUsage").doc(`${userId}-${monthKey}`);

    await adminDb.runTransaction(async (transaction) => {
      const usageDoc = await transaction.get(usageRef);

      if (!usageDoc.exists) {
        transaction.set(usageRef, {
          userId,
          month: monthKey,
          count: 1,
          lastUsed: today,
          createdAt: today,
        });
      } else {
        const currentCount = usageDoc.data()?.count || 0;
        transaction.update(usageRef, {
          count: currentCount + 1,
          lastUsed: today,
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Usage recorded successfully",
    });
  } catch (error) {
    console.error("Usage recording error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
