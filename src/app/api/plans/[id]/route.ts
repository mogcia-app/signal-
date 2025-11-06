import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "../../../../lib/firebase-admin";

// 計画更新（ステータス変更など）
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 🔐 Firebase認証トークンからユーザーIDを取得
    let userId = "";
    const authHeader = request.headers.get("authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        userId = decodedToken.uid;
      } catch (authError) {
        return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: "認証トークンが必要です" }, { status: 401 });
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
    return NextResponse.json({ error: "計画の更新に失敗しました" }, { status: 500 });
  }
}

// 計画削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Firebase認証トークンからユーザーIDを取得
    let userId = "";
    const authHeader = request.headers.get("authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        userId = decodedToken.uid;
      } catch (authError) {
        return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: "認証トークンが必要です" }, { status: 401 });
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
    return NextResponse.json({ error: "計画の削除に失敗しました" }, { status: 500 });
  }
}
