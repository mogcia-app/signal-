import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
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

    console.log("📊 ユーザープロファイル取得:", { userId });

    // Firestoreからユーザー情報を取得
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.log("❌ ユーザーが見つかりません:", userId);
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const userData = userSnap.data() as UserProfile;
    console.log("✅ ユーザープロファイル取得成功:", userData.email);

    return NextResponse.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error("❌ ユーザープロファイル取得エラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch user profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
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

    console.log("📝 ユーザープロファイル更新:", { userId, updates });

    // Firestoreのユーザー情報を取得
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.log("❌ ユーザーが見つかりません:", userId);
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // 更新データを準備
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Firestoreを更新
    await setDoc(userRef, updateData, { merge: true });

    // 更新後のデータを取得
    const updatedUserSnap = await getDoc(userRef);
    const updatedUserData = updatedUserSnap.data() as UserProfile;

    console.log("✅ ユーザープロファイル更新成功:", updatedUserData.email);

    return NextResponse.json({
      success: true,
      data: updatedUserData,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("❌ ユーザープロファイル更新エラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update user profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
