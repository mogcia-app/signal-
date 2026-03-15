import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import {
  CalendarDayLabel,
  CalendarPostType,
  MonthlyCalendarPlanItem,
  PlanRepository,
} from "@/repositories/plan-repository";

const isValidPostType = (value: unknown): value is CalendarPostType =>
  value === "feed" || value === "reel" || value === "story";

const isValidDayLabel = (value: unknown): value is CalendarDayLabel =>
  value === "日" || value === "月" || value === "火" || value === "水" || value === "木" || value === "金" || value === "土";

const isValidDateIso = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const normalizeItems = (items: unknown): MonthlyCalendarPlanItem[] => {
  if (!Array.isArray(items)) {return [];}
  return items
    .filter((item) => typeof item === "object" && item !== null)
    .map((item) => item as Record<string, unknown>)
    .filter(
      (item): item is Record<string, unknown> =>
        isValidDateIso(item.dateIso) &&
        isValidDayLabel(item.dayLabel) &&
        isValidPostType(item.postType) &&
        typeof item.suggestedTime === "string" &&
        typeof item.title === "string" &&
        (item.direction === undefined || typeof item.direction === "string") &&
        (item.hook === undefined || typeof item.hook === "string")
    )
    .map((item) => {
      const normalized: MonthlyCalendarPlanItem = {
        dateIso: item.dateIso as string,
        dayLabel: item.dayLabel as CalendarDayLabel,
        postType: item.postType as CalendarPostType,
        suggestedTime: String(item.suggestedTime || ""),
        title: String(item.title || ""),
      };
      if (typeof item.direction === "string" && item.direction.trim().length > 0) {
        normalized.direction = item.direction.trim();
      }
      if (typeof item.hook === "string" && item.hook.trim().length > 0) {
        normalized.hook = item.hook.trim();
      }
      return normalized;
    });
};

const resolvePlanId = async (uid: string, explicitPlanId?: string | null): Promise<string | null> => {
  if (explicitPlanId && explicitPlanId.trim().length > 0) {
    return explicitPlanId;
  }
  const user = await getUserProfile(uid);
  return (user?.activePlanId as string | undefined) || null;
};

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "home-monthly-calendar-plan-get", limit: 60, windowSeconds: 60 },
      auditEventName: "home_monthly_calendar_plan_get",
    });

    const { searchParams } = new URL(request.url);
    const planId = await resolvePlanId(uid, searchParams.get("planId"));
    if (!planId) {
      return NextResponse.json({ success: true, data: null });
    }

    const monthlyPlan = await PlanRepository.getMonthlyCalendarPlan(uid, planId);
    if (!monthlyPlan || typeof monthlyPlan !== "object") {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: {
        startDate: isValidDateIso(monthlyPlan.startDate) ? monthlyPlan.startDate : null,
        endDate: isValidDateIso(monthlyPlan.endDate) ? monthlyPlan.endDate : null,
        items: normalizeItems(monthlyPlan.items),
      },
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "home-monthly-calendar-plan-post", limit: 20, windowSeconds: 60 },
      auditEventName: "home_monthly_calendar_plan_post",
    });

    const body = (await request.json()) as {
      planId?: string;
      startDate?: string;
      endDate?: string;
      items?: unknown;
    };
    const planId = await resolvePlanId(uid, body.planId || null);
    if (!planId) {
      return NextResponse.json({ error: "保存先の計画が見つかりません" }, { status: 400 });
    }

    if (!isValidDateIso(body.startDate) || !isValidDateIso(body.endDate)) {
      return NextResponse.json({ error: "startDate/endDate が不正です" }, { status: 400 });
    }

    const ownedPlan = await PlanRepository.getOwnedPlanDocument(uid, planId);
    if (!ownedPlan) {
      return NextResponse.json({ error: "計画が見つかりません" }, { status: 404 });
    }

    const normalizedItems = normalizeItems(body.items);
    await PlanRepository.saveMonthlyCalendarPlan({
      userId: uid,
      planId,
      startDate: body.startDate,
      endDate: body.endDate,
      items: normalizedItems,
    });

    return NextResponse.json({
      success: true,
      data: {
        startDate: body.startDate,
        endDate: body.endDate,
        items: normalizedItems,
      },
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
