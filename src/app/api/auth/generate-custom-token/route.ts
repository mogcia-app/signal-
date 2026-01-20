import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // userIdの検証（Firestoreでユーザーが存在することを確認）
    const userDoc = await adminDb.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // ユーザーがアクティブかどうか確認
    if (userData?.status !== "active") {
      return NextResponse.json(
        { error: "User account is not active" },
        { status: 403 }
      );
    }

    // Firebase Admin SDKでCustom Tokenを生成
    const customToken = await adminAuth.createCustomToken(userId);

    return NextResponse.json({
      customToken,
    });
  } catch (error) {
    console.error("Error generating custom token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
