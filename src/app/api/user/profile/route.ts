import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import { UserProfile, UserProfileUpdate } from "../../../../types/user";

/**
 * ユーザープロファイル取得API
 * GET /api/user/profile?userId={uid}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });
    }

    // 認証コンテキストを取得（自分のデータのみ、または管理者）
    const { uid } = await requireAuthContext(request, {
      requireContract: false,
    });

    // 自分のデータのみ、または管理者のみアクセス可能
    if (uid !== userId) {
      // 管理者チェックは requireAuthContext 内で行われる
      // ここでは自分のデータのみ許可
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    console.log("📊 ユーザープロファイル取得:", { userId });

    // Admin SDKを使用してFirestoreからユーザー情報を取得
    const db = getAdminDb();
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      console.log("❌ ユーザーが見つかりません:", userId);
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const userData = { id: userDoc.id, ...userDoc.data() } as UserProfile;
    console.log("✅ ユーザープロファイル取得成功:", userData.email);

    return NextResponse.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error("❌ ユーザープロファイル取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

/**
 * ユーザープロファイル更新API
 * PUT /api/user/profile
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, updates } = body as { userId: string; updates: UserProfileUpdate };

    if (!userId) {
      return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });
    }

    // 認証コンテキストを取得（自分のデータのみ更新可能）
    const { uid } = await requireAuthContext(request, {
      requireContract: false,
    });

    // 自分のデータのみ更新可能
    if (uid !== userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    console.log("📝 ユーザープロファイル更新:", { userId, updates });

    // Admin SDKを使用してFirestoreのユーザー情報を取得
    const db = getAdminDb();
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      console.log("❌ ユーザーが見つかりません:", userId);
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // 既存のデータを取得
    const existingData = userDoc.data() || {};

    // 更新データを準備
    // businessInfoが含まれている場合は、既存のbusinessInfoとマージ
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }

    if (updates.businessInfo !== undefined) {
      // 既存のbusinessInfoとマージ
      const existingBusinessInfo = existingData.businessInfo || {};
      updateData.businessInfo = {
        ...existingBusinessInfo,
        ...updates.businessInfo,
      };
    }

    if (updates.snsAISettings !== undefined) {
      // 既存のsnsAISettingsとマージ
      const existingSnsAISettings = existingData.snsAISettings || {};
      updateData.snsAISettings = {
        ...existingSnsAISettings,
        ...updates.snsAISettings,
      };
    }

    // Admin SDKを使用してFirestoreを更新
    await db.collection("users").doc(userId).update(updateData);

    // 更新後のデータを取得
    const updatedUserDoc = await db.collection("users").doc(userId).get();
    const updatedUserData = { id: updatedUserDoc.id, ...updatedUserDoc.data() } as UserProfile;

    console.log("✅ ユーザープロファイル更新成功:", updatedUserData.email);

    return NextResponse.json({
      success: true,
      data: updatedUserData,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("❌ ユーザープロファイル更新エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
