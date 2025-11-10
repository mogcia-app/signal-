import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../lib/server/auth-context";

// 計画データの型定義（統一版）
interface PlanData {
  id?: string;
  userId: string;
  snsType: string;
  status: string;
  title: string;
  targetFollowers: number;
  currentFollowers: number;
  planPeriod: string;
  targetAudience: string;
  category: string;
  strategies: string[];
  postCategories: string[];
  createdAt: Date;
  updatedAt: Date;

  // シミュレーション結果
  simulationResult?: Record<string, unknown> | null;

  // フォームデータ全体
  formData?: Record<string, unknown>;

  // AI戦略
  generatedStrategy?: string | null;
}

// 計画作成
export async function POST(request: NextRequest) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "plan-create", limit: 10, windowSeconds: 60 },
      auditEventName: "plan_create",
    });

    const body = await request.json();

    // バリデーション
    if (!body.targetFollowers || !body.currentFollowers) {
      return NextResponse.json({ error: "必須フィールドが不足しています" }, { status: 400 });
    }

    const planData: Omit<PlanData, "id"> = {
      userId,
      snsType: body.snsType || "instagram",
      status: body.status || "active",
      title: body.title || "Instagram成長計画",
      targetFollowers: parseInt(body.targetFollowers),
      currentFollowers: parseInt(body.currentFollowers),
      planPeriod: body.planPeriod || "6ヶ月",
      targetAudience: body.targetAudience || "未設定",
      category: body.category || "未設定",
      strategies: body.strategies || [],
      postCategories: body.postCategories || [],
      simulationResult: body.simulationResult || null,
      formData: body.formData || {},
      generatedStrategy: body.generatedStrategy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection("plans").add(planData);

    return NextResponse.json({
      id: docRef.id,
      message: "計画が保存されました",
      data: { ...planData, id: docRef.id },
    });
  } catch (error) {
    console.error("計画作成エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// 計画一覧取得
export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "plan-list", limit: 30, windowSeconds: 60 },
      auditEventName: "plan_list",
    });
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? uid;
    const snsType = searchParams.get("snsType"); // instagram, x, tiktok
    const status = searchParams.get("status"); // active, archived, expired
    const limit = parseInt(searchParams.get("limit") || "10");

    // userIdが指定されていない場合はエラー
    if (!userId) {
      return NextResponse.json({ error: "userIdが必要です" }, { status: 400 });
    }

    if (userId !== uid) {
      return NextResponse.json({ error: "別ユーザーの計画にはアクセスできません" }, { status: 403 });
    }

    // クエリを構築
    let query = adminDb.collection("plans").where("userId", "==", userId);

    // SNSタイプでフィルタ
    if (snsType) {
      query = query.where("snsType", "==", snsType);
    }

    // ステータスでフィルタ
    if (status) {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.get();

    const plans = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now()),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt || Date.now()),
        };
      })
      .sort((a, b) => {
        const aTime =
          a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const bTime =
          b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
        return bTime - aTime; // 降順（新しい順）
      })
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      plans: plans,
      total: snapshot.size,
    });
  } catch (error) {
    const { searchParams } = new URL(request.url);
    console.error("計画取得エラー:", error);
    console.error("エラーの詳細:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      userId: searchParams.get("userId"),
    });
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
