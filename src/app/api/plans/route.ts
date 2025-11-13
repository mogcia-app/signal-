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

type FirestoreTimestampLike = {
  toDate?: () => Date;
};

type FirestorePlan = Omit<PlanData, "createdAt" | "updatedAt"> & {
  createdAt?: Date | FirestoreTimestampLike | string;
  updatedAt?: Date | FirestoreTimestampLike | string;
};

function isFirestoreTimestamp(value: unknown): value is FirestoreTimestampLike {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as FirestoreTimestampLike).toDate === "function"
  );
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
function calculatePlanEndDate(startDate: Date, period: string | undefined) {
  const endDate = new Date(startDate);
  switch (period) {
    case "1ヶ月":
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case "3ヶ月":
      endDate.setMonth(endDate.getMonth() + 3);
      break;
    case "6ヶ月":
      endDate.setMonth(endDate.getMonth() + 6);
      break;
    case "1年":
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
    default:
      endDate.setMonth(endDate.getMonth() + 1);
      break;
  }
  return endDate;
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "plan-list", limit: 30, windowSeconds: 60 },
      auditEventName: "plan_list",
    });
    const { searchParams } = new URL(request.url);
    const snsType = searchParams.get("snsType"); // instagram, x, tiktok
    const status = searchParams.get("status"); // active, archived, expired
    const limit = parseInt(searchParams.get("limit") || "10");
    const effectiveMonthParam = searchParams.get("effectiveMonth");

    let effectiveMonthStart: Date | null = null;
    let effectiveMonthEnd: Date | null = null;

    if (effectiveMonthParam) {
      const [yearStr, monthStr] = effectiveMonthParam.split("-");
      const year = Number.parseInt(yearStr, 10);
      const monthIndex = Number.parseInt(monthStr, 10) - 1;

      if (!Number.isNaN(year) && !Number.isNaN(monthIndex)) {
        effectiveMonthStart = new Date(year, monthIndex, 1);
        effectiveMonthEnd = new Date(year, monthIndex + 1, 1);
      }
    }

    // クエリを構築
    let query = adminDb.collection("plans").where("userId", "==", uid);

    // SNSタイプでフィルタ
    if (snsType) {
      query = query.where("snsType", "==", snsType);
    }

    // ステータスでフィルタ
    if (status) {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.get();

    const mappedPlans = snapshot.docs
      .map((doc) => {
        const data = doc.data() as FirestorePlan;

        const createdAtRaw = data.createdAt;
        const updatedAtRaw = data.updatedAt;

        let createdAtValue: Date;
        if (createdAtRaw instanceof Date) {
          createdAtValue = createdAtRaw;
        } else if (isFirestoreTimestamp(createdAtRaw)) {
          createdAtValue = createdAtRaw.toDate ? createdAtRaw.toDate() : new Date();
        } else if (createdAtRaw) {
          createdAtValue = new Date(createdAtRaw);
        } else {
          createdAtValue = new Date();
        }

        let updatedAtValue: Date;
        if (updatedAtRaw instanceof Date) {
          updatedAtValue = updatedAtRaw;
        } else if (isFirestoreTimestamp(updatedAtRaw)) {
          updatedAtValue = updatedAtRaw.toDate ? updatedAtRaw.toDate() : new Date();
        } else if (updatedAtRaw) {
          updatedAtValue = new Date(updatedAtRaw);
        } else {
          updatedAtValue = new Date();
        }

        return {
          id: doc.id,
          ...data,
          createdAt: createdAtValue,
          updatedAt: updatedAtValue,
        };
      })
      .filter((plan) => {
        if (!effectiveMonthStart || !effectiveMonthEnd) {
          return true;
        }

        const planStart =
          plan.createdAt instanceof Date ? plan.createdAt : new Date(plan.createdAt);

        if (Number.isNaN(planStart.getTime())) {
          return false;
        }

        const periodLabel =
          typeof plan.planPeriod === "string"
            ? plan.planPeriod
            : typeof plan.formData?.planPeriod === "string"
              ? (plan.formData.planPeriod as string)
              : "1ヶ月";

        const planEnd = calculatePlanEndDate(planStart, periodLabel);

        // 期間が重なっている場合に対象とする
        return planStart < effectiveMonthEnd && planEnd > effectiveMonthStart;
      });

    let plans = mappedPlans
      .sort((a, b) => {
        const aTime =
          a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const bTime =
          b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
        return bTime - aTime; // 降順（新しい順）
      })
      .slice(0, limit);

    // 指定した月に該当する計画が存在しない場合、直近の過去の計画を返す
    if (
      plans.length === 0 &&
      effectiveMonthStart &&
      effectiveMonthEnd &&
      mappedPlans.length > 0
    ) {
      plans = mappedPlans
        .filter((plan) => {
          const planStart =
            plan.createdAt instanceof Date ? plan.createdAt : new Date(plan.createdAt);
          return (
            !Number.isNaN(planStart.getTime()) &&
            planStart <= effectiveMonthStart
          );
        })
        .sort((a, b) => {
          const aTime =
            a.createdAt instanceof Date
              ? a.createdAt.getTime()
              : new Date(a.createdAt).getTime();
          const bTime =
            b.createdAt instanceof Date
              ? b.createdAt.getTime()
              : new Date(b.createdAt).getTime();
          return bTime - aTime;
        })
        .slice(0, 1);
    }

    return NextResponse.json({
      success: true,
      plans: plans,
      total: plans.length,
    });
  } catch (error) {
    console.error("計画取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
