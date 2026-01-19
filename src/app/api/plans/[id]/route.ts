import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { canAccessFeature } from "@/lib/plan-access";

// 計画更新（ステータス変更など）
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "plan-update", limit: 30, windowSeconds: 60 },
      auditEventName: "plan_update",
    });

    // プラン階層別アクセス制御: 松プランのみアクセス可能
    const userProfile = await getUserProfile(userId);
    if (!canAccessFeature(userProfile, "canAccessPlan")) {
      return NextResponse.json(
        { error: "運用計画機能は、現在のプランではご利用いただけません。" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // 計画の存在確認と所有権チェック
    const planDoc = await adminDb.collection("plans").doc(id).get();

    if (!planDoc.exists) {
      return NextResponse.json({ error: "計画が見つかりません" }, { status: 404 });
    }

    const planData = planDoc.data();
    if (planData?.userId !== userId) {
      return NextResponse.json({ error: "この計画を更新する権限がありません" }, { status: 403 });
    }

    // 更新データ
    const updateData = {
      ...body,
      updatedAt: new Date(),
    };

    await adminDb.collection("plans").doc(id).update(updateData);

    return NextResponse.json({
      success: true,
      message: "計画が更新されました",
      id,
    });
  } catch (error) {
    console.error("計画更新エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// 計画削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "plan-delete", limit: 30, windowSeconds: 60 },
      auditEventName: "plan_delete",
    });

    // プラン階層別アクセス制御: 松プランのみアクセス可能
    const userProfile = await getUserProfile(userId);
    if (!canAccessFeature(userProfile, "canAccessPlan")) {
      return NextResponse.json(
        { error: "運用計画機能は、現在のプランではご利用いただけません。" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // 計画の存在確認と所有権チェック
    const planDoc = await adminDb.collection("plans").doc(id).get();

    if (!planDoc.exists) {
      return NextResponse.json({ error: "計画が見つかりません" }, { status: 404 });
    }

    const planData = planDoc.data();
    if (planData?.userId !== userId) {
      return NextResponse.json({ error: "この計画を削除する権限がありません" }, { status: 403 });
    }

    await adminDb.collection("plans").doc(id).delete();

    return NextResponse.json({
      success: true,
      message: "計画が削除されました",
    });
  } catch (error) {
    console.error("計画削除エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
