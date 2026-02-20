import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { getAiUsageSummary } from "@/lib/server/ai-usage-limit";

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "ai-usage-summary", limit: 60, windowSeconds: 60 },
      auditEventName: "ai_usage_summary_access",
    });

    const userProfile = await getUserProfile(uid);
    const usage = await getAiUsageSummary({ uid, userProfile });
    return NextResponse.json({ success: true, data: usage });
  } catch (error) {
    console.error("ai usage summary error:", error);
    return NextResponse.json({ success: false, error: "利用状況の取得に失敗しました" }, { status: 500 });
  }
}
