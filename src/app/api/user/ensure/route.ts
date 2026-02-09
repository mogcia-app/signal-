import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebase-admin";
import { requireAuthContext } from "../../../../lib/server/auth-context";
import type { UserProfile } from "../../../../types/user";

/**
 * ユーザードキュメントの存在確認・作成API
 * POST /api/user/ensure
 * 
 * クライアント側から直接Firestoreにアクセスする代わりに、
 * Admin SDK経由でユーザードキュメントを作成・確認します
 */
export async function POST(request: NextRequest) {
  try {
    let uid: string;
    try {
      const authContext = await requireAuthContext(request);
      uid = authContext.uid;
    } catch (error) {
      // UnauthorizedErrorの場合は、より詳細なエラーメッセージを返す
      if (error instanceof Error && error.name === "UnauthorizedError") {
        return NextResponse.json(
          {
            success: false,
            error: "Unauthorized",
            details: error.message,
          },
          { status: 401 }
        );
      }
      throw error;
    }
    const adminDb = getAdminDb();

    const userRef = adminDb.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      // 既に存在する場合はそのまま返す
      return NextResponse.json({
        success: true,
        exists: true,
        data: userDoc.data(),
      });
    }

    // 存在しない場合は作成
    const defaultUserProfile: Omit<UserProfile, "id"> & { setupRequired?: boolean } = {
      email: "", // 認証情報から取得できない場合は空文字
      name: "ユーザー",
      role: "user",
      isActive: true,
      snsCount: 1,
      usageType: "solo",
      contractType: "trial",
      contractSNS: ["instagram"],
      snsAISettings: {},
      businessInfo: {
        industry: "",
        companySize: "",
        businessType: "",
        description: "",
        targetMarket: "",
        goals: [],
        challenges: [],
      },
      status: "pending_setup",
      setupRequired: true,
      contractStartDate: new Date().toISOString(),
      contractEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      billingInfo: {
        paymentMethod: "none",
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 0,
      },
      notes: "新規ユーザー - 初期設定待ち",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await userRef.set(defaultUserProfile);
    console.log("✅ User document created via API:", uid);

    return NextResponse.json({
      success: true,
      exists: false,
      created: true,
      data: defaultUserProfile,
    });
  } catch (error) {
    console.error("❌ Error ensuring user document:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to ensure user document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

