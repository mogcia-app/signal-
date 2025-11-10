import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";

// 個別の分析データを削除
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { id } = params;
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-delete", limit: 10, windowSeconds: 60 },
      auditEventName: "analytics_delete",
    });

    console.log("=== ANALYTICS DELETE REQUEST ===");
    console.log("Analytics ID:", id);
    console.log("User ID:", uid);

    if (!id) {
      return NextResponse.json({ error: "Analytics ID is required" }, { status: 400 });
    }

    // 本番環境でFirebase設定がない場合
    if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      console.log("Firebase API key not found in production, returning success");
      return NextResponse.json({
        success: true,
        message: "Analytics data deleted successfully (simulated)",
      });
    }

    // 分析データの存在確認
    const analyticsDoc = await adminDb.collection("analytics").doc(id).get();

    if (!analyticsDoc.exists) {
      return NextResponse.json({ error: "Analytics data not found" }, { status: 404 });
    }

    const analyticsData = analyticsDoc.data();

    // ユーザーIDの確認（セキュリティ）
    if (analyticsData?.userId !== uid) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    // 分析データを削除
    await adminDb.collection("analytics").doc(id).delete();

    console.log("Analytics data deleted successfully:", {
      id,
      userId: uid,
      title: analyticsData?.title || "Unknown",
    });

    return NextResponse.json({
      success: true,
      message: "Analytics data deleted successfully",
      deletedId: id,
    });
  } catch (error) {
    console.error("=== ANALYTICS DELETE ERROR ===");
    console.error("Error details:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");

    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// 個別の分析データを取得
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { id } = params;
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-get", limit: 60, windowSeconds: 60 },
      auditEventName: "analytics_get",
    });

    if (!id) {
      return NextResponse.json({ error: "Analytics ID is required" }, { status: 400 });
    }

    // 本番環境でFirebase設定がない場合
    if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      console.log("Firebase API key not found in production, returning empty data");
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const analyticsDoc = await adminDb.collection("analytics").doc(id).get();

    if (!analyticsDoc.exists) {
      return NextResponse.json({ error: "Analytics data not found" }, { status: 404 });
    }

    const analyticsData = analyticsDoc.data();

    // ユーザーIDの確認（セキュリティ）
    if (analyticsData?.userId !== uid) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: analyticsDoc.id,
        ...analyticsData,
        createdAt: analyticsData?.createdAt?.toDate?.() || analyticsData?.createdAt,
      },
    });
  } catch (error) {
    console.error("Analytics fetch error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
