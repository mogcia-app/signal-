import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { getBillingCycleContext } from "@/lib/server/billing-cycle";

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "user-billing-cycle", limit: 60, windowSeconds: 60 },
      auditEventName: "user_billing_cycle_get",
    });

    const userProfile = await getUserProfile(uid);
    const cycle = getBillingCycleContext({ userProfile });

    return NextResponse.json({
      success: true,
      data: {
        currentKey: cycle.current.key,
        previousKey: cycle.previous.key,
        anchorDay: cycle.anchorDay,
        timezone: cycle.timezone,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: error.message,
        },
        { status: 401 },
      );
    }

    console.error("[api/user/billing-cycle] failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch billing cycle",
      },
      { status: 500 },
    );
  }
}
