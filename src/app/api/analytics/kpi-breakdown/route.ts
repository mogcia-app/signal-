import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { canAccessFeature } from "@/lib/plan-access";
import { buildKpiDashboard } from "@/domain/analysis/kpi/usecases/build-kpi-dashboard";
import { aggregateKpiInput } from "@/domain/analysis/kpi/usecases/aggregate-kpi-input";
import { KpiDashboardRepository } from "@/repositories/kpi-dashboard-repository";

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request);

    const userProfile = await getUserProfile(uid);
    if (!canAccessFeature(userProfile, "canAccessKPI")) {
      return NextResponse.json(
        { success: false, error: "KPIダッシュボード機能は、現在のプランではご利用いただけません。" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    if (!date) {
      return NextResponse.json(
        { success: false, error: "date parameter is required" },
        { status: 400 }
      );
    }

    const rawData = await KpiDashboardRepository.fetchKpiRawDataByBillingCycle(uid, date, userProfile);
    const aggregatedInput = aggregateKpiInput(rawData);
    const dashboard = buildKpiDashboard(aggregatedInput);

    return NextResponse.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    console.error("KPI breakdown API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
