import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "business-info-get", limit: 20, windowSeconds: 60 },
      auditEventName: "business_info_get",
    });

    const db = getAdminDb();
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    const userData = userDoc.data();
    const businessInfo = userData?.businessInfo || {};

    return NextResponse.json({
      success: true,
      businessInfo: {
        companySize: businessInfo.companySize || "",
        businessType: businessInfo.businessType || "",
        description: businessInfo.description || "",
        catchphrase: businessInfo.catchphrase || "",
        targetMarket: businessInfo.targetMarket || [],
        goals: businessInfo.goals || [],
        challenges: businessInfo.challenges || [],
        features: businessInfo.features || [],
        industry: businessInfo.industry || "",
        productsOrServices: businessInfo.productsOrServices || [],
        snsAISettings: userData?.snsAISettings || {},
      },
    });
  } catch (error) {
    console.error("ビジネス情報取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
