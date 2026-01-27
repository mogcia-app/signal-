import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebase-admin";
import { requireAuthContext } from "../../../../lib/server/auth-context";

/**
 * オンボーディング完了時にstatusをactiveに更新するAPI
 * POST /api/user/complete-onboarding
 */
export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request);
    const adminDb = getAdminDb();

    // ユーザードキュメントを取得
    const userRef = adminDb.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // statusをactiveに更新（Admin SDKなのでSecurity Rulesをバイパス）
    await userRef.update({
      status: "active",
      updatedAt: new Date().toISOString(),
    });

    console.log("✅ オンボーディング完了: statusをactiveに更新しました", { userId: uid });

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully",
    });
  } catch (error) {
    console.error("❌ オンボーディング完了エラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to complete onboarding",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

















