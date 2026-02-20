import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/server/auth-context";
import { getMonthlyActionFocus } from "@/lib/ai/monthly-action-focus";

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "home-monthly-action-focus", limit: 60, windowSeconds: 60 },
      auditEventName: "home_monthly_action_focus",
    });

    const focus = await getMonthlyActionFocus(uid);
    return NextResponse.json({
      success: true,
      data: focus,
    });
  } catch (error) {
    console.error("home monthly action focus error:", error);
    return NextResponse.json(
      { success: false, error: "今月の施策テーマ取得に失敗しました" },
      { status: 500 }
    );
  }
}

