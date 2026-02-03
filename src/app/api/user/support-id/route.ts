import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/server/auth-context";
import { adminDb } from "@/lib/firebase-admin";

/**
 * サポートID取得API
 * GET /api/user/support-id
 */
export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
    });

    const userDoc = await adminDb.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const supportId = userData?.supportId;

    return NextResponse.json({
      success: true,
      supportId: supportId || null,
    });
  } catch (error) {
    console.error("❌ サポートID取得エラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch support ID",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

