import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { canAccessFeature } from "@/lib/plan-access";
import { syncPlanFollowerProgress } from "../../../lib/plans/sync-follower-progress";

// 計画データの型定義（統一版）
interface PlanData {
  id?: string;
  userId: string;
  snsType: string;
  status: string;
  title: string;
  targetFollowers: number;
  currentFollowers: number;
  actualFollowers?: number;
  analyticsFollowerIncrease?: number;
  planPeriod: string;
  targetAudience: string;
  category: string;
  strategies: string[];
  postCategories: string[];
  createdAt: Date;
  updatedAt: Date;

  // シミュレーション結果
  simulationResult?: Record<string, unknown> | null;
  
  // 日付情報
  startDate?: Date | null;
  endDate?: Date | null;

  // フォームデータ全体
  formData?: Record<string, unknown>;

  // AI戦略
  generatedStrategy?: string | null;
  
  // 週次・月次データ
  generatedStrategyData?: {
    allWeeklyTasks?: any[];
    allMonthlyGoals?: any[];
  } | null;

  // AI提案データ（新規）
  aiSuggestion?: {
    weeklyTasks?: any[];
    monthlyGoals?: any[];
    keyMessage?: string;
    monthlyStrategy?: any[];
    weeklyPlans?: any[];
    recommendedPostingTimes?: any[];
  } | null;
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

    // プラン階層別アクセス制御: 松プランのみアクセス可能
    const userProfile = await getUserProfile(userId);
    if (!canAccessFeature(userProfile, "canAccessPlan")) {
      return NextResponse.json(
        { error: "運用計画機能は、現在のプランではご利用いただけません。" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // バリデーション
    if (!body.targetFollowers) {
      return NextResponse.json({ error: "目標フォロワー数は必須です" }, { status: 400 });
    }

    // startDateのバリデーション
    if (!body.startDate || body.startDate.trim() === '') {
      return NextResponse.json({ error: "開始日は必須です" }, { status: 400 });
    }

    // startDateが有効な日付かチェック
    const startDate = new Date(body.startDate);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "開始日が無効です" }, { status: 400 });
    }

    const snsType = body.snsType || "instagram";

    // currentFollowersが指定されていない場合、follower_countsから最新の値を取得
    let currentFollowersValue = body.currentFollowers
      ? parseInt(body.currentFollowers, 10)
      : null;

    if (!currentFollowersValue) {
      // follower_countsから最新の値を取得
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const followerCountSnapshot = await adminDb
        .collection("follower_counts")
        .where("userId", "==", userId)
        .where("snsType", "==", snsType)
        .orderBy("updatedAt", "desc")
        .limit(1)
        .get();

      if (!followerCountSnapshot.empty) {
        currentFollowersValue = followerCountSnapshot.docs[0].data().followers;
      } else {
        // follower_countsにデータがない場合、usersコレクションのinitialFollowersを取得
        const userDoc = await adminDb.collection("users").doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          currentFollowersValue =
            userData?.businessInfo?.initialFollowers || null;
        }
      }

      if (!currentFollowersValue) {
        return NextResponse.json(
          { error: "フォロワー数が取得できませんでした。ホームページでフォロワー数を入力してください。" },
          { status: 400 }
        );
      }
    }

    // startDateとendDateを設定
    const planStartDate = startDate;
    const planEndDate = body.endDate ? new Date(body.endDate) : (() => {
      const end = new Date(planStartDate);
      const period = body.planPeriod || "6ヶ月";
      if (period === "1ヶ月") {
        end.setMonth(end.getMonth() + 1);
      } else if (period === "3ヶ月") {
        end.setMonth(end.getMonth() + 3);
      } else if (period === "6ヶ月") {
        end.setMonth(end.getMonth() + 6);
      } else if (period === "1年") {
        end.setFullYear(end.getFullYear() + 1);
      } else {
        end.setMonth(end.getMonth() + 1);
      }
      return end;
    })();

    const planData: Omit<PlanData, "id"> = {
      userId,
      snsType,
      status: body.status || "active",
      title: body.title || "Instagram成長計画",
      targetFollowers: parseInt(body.targetFollowers),
      currentFollowers: currentFollowersValue,
      actualFollowers: currentFollowersValue,
      analyticsFollowerIncrease: 0,
      planPeriod: body.planPeriod || "6ヶ月",
      targetAudience: body.targetAudience || "未設定",
      category: body.category || "未設定",
      strategies: body.strategies || [],
      postCategories: body.postCategories || [],
      simulationResult: body.simulationResult || null,
      formData: body.formData || {},
      generatedStrategy: body.generatedStrategy || null,
      generatedStrategyData: body.generatedStrategyData || null,
      aiSuggestion: body.aiSuggestion || null, // AI提案データを保存
      startDate: planStartDate,
      endDate: planEndDate,
      createdAt: planStartDate,
      updatedAt: new Date(),
    };

    // デバッグログ：保存されるデータを確認
    console.log("[API] 計画保存データ:", {
      hasSimulationResult: !!planData.simulationResult,
      simulationResultKeys: planData.simulationResult ? Object.keys(planData.simulationResult) : [],
      hasGeneratedStrategy: !!planData.generatedStrategy,
      generatedStrategyLength: planData.generatedStrategy?.length || 0,
      hasGeneratedStrategyData: !!planData.generatedStrategyData,
      weeklyTasksCount: planData.generatedStrategyData?.allWeeklyTasks?.length || 0,
      monthlyGoalsCount: planData.generatedStrategyData?.allMonthlyGoals?.length || 0,
    });

    const docRef = await adminDb.collection("plans").add(planData);

    return NextResponse.json({
      id: docRef.id,
      message: "計画が保存されました",
      data: { ...planData, id: docRef.id },
    });
  } catch (error) {
    console.error("計画作成エラー:", error);
    console.error("エラー詳細:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    const { status, body: errorBody } = buildErrorResponse(error);
    return NextResponse.json(errorBody, { status });
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

    // プラン階層別アクセス制御: 松プランのみアクセス可能
    const userProfile = await getUserProfile(uid);
    if (!canAccessFeature(userProfile, "canAccessPlan")) {
      return NextResponse.json(
        { error: "運用計画機能は、現在のプランではご利用いただけません。" },
        { status: 403 }
      );
    }
    await syncPlanFollowerProgress(uid);
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
