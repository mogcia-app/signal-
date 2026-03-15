import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import { getHomeWeeklyPlans } from "@/domain/plan/usecases/get-home-weekly-plans";

/**
 * ホームページ用: 週次コンテンツ計画を取得
 * 
 * StrategyPlanから現在の週の計画を取得して返す
 */
export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "home-weekly-plans", limit: 60, windowSeconds: 60 },
      auditEventName: "home_weekly_plans_access",
    });
    const result = await getHomeWeeklyPlans(uid);
    if (result.kind === "user-profile-not-found") {
      return NextResponse.json({
        success: false,
        error: "ユーザープロファイルが見つかりません",
      }, { status: 404 });
    }

    if (result.kind === "empty") {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("[Home Weekly Plans] エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
