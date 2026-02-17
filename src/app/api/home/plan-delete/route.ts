import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/server/auth-context";
import { PlanRepository } from "@/repositories/plan-repository";

export async function DELETE(request: NextRequest) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "home-plan-delete", limit: 10, windowSeconds: 60 },
      auditEventName: "home_plan_delete",
    });

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get("planId");

    if (!planId) {
      return NextResponse.json({ error: "計画IDが必要です" }, { status: 400 });
    }

    await PlanRepository.deletePlan(userId, planId);
    return NextResponse.json({ success: true, message: "計画を削除しました" });
  } catch (error) {
    console.error("ホーム計画削除エラー:", error);
    const errorMessage = error instanceof Error ? error.message : "計画の削除に失敗しました";
    return NextResponse.json(
      { error: errorMessage },
      {
        status:
          error instanceof Error && errorMessage.includes("見つかりません")
            ? 404
            : error instanceof Error && errorMessage.includes("権限")
              ? 403
              : 500,
      }
    );
  }
}
