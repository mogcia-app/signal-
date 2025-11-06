import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "../../../../lib/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    // 🔐 Firebase認証トークンからユーザーIDを取得
    let userId = "anonymous";
    const authHeader = request.headers.get("authorization");
    const userIdHeader = request.headers.get("x-user-id");

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        userId = decodedToken.uid;
      } catch (authError) {
        console.warn("⚠️ Firebase認証エラー:", authError);
        return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
      }
    } else if (userIdHeader) {
      userId = userIdHeader;
    }

    if (userId === "anonymous") {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

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
    return NextResponse.json(
      {
        error: "Failed to get usage info",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

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
    return NextResponse.json(
      {
        error: "Failed to record usage",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
