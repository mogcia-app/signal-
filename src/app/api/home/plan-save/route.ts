import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/server/auth-context";
import { PlanRepository } from "@/repositories/plan-repository";
import { PlanInput } from "@/domain/plan/plan-input";
import { PlanEngine } from "@/domain/plan/plan-engine";
import { getUserProfile } from "@/lib/server/user-profile";

interface PlanSaveRequest {
  startDate: string;
  currentFollowers: number;
  targetFollowers?: number;
  targetFollowerIncrease?: number;
  targetFollowerOption?: "conservative" | "standard" | "ambitious" | "custom" | "ai";
  customTargetFollowers?: string;
  operationPurpose: string;
  weeklyPosts: string;
  reelCapability: string;
  storyFrequency?: string;
  feedDays?: string[];
  reelDays?: string[];
  storyDays?: string[];
  targetAudience?: string;
  postingTime?: string;
  regionRestriction?: string;
  regionName?: string;
  simulationResult?: Record<string, unknown> | null;
}

export async function POST(request: NextRequest) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "home-plan-save", limit: 20, windowSeconds: 60 },
      auditEventName: "home_plan_save",
    });

    const body: PlanSaveRequest = await request.json();

    if (!body.startDate || !body.currentFollowers || !body.operationPurpose || !body.weeklyPosts || !body.reelCapability) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    const startDate = String(body.startDate || "").trim();
    const operationPurpose = String(body.operationPurpose || "").trim();
    const feedDays = Array.isArray(body.feedDays) ? body.feedDays : [];
    const reelDays = Array.isArray(body.reelDays) ? body.reelDays : [];
    const storyDays = Array.isArray(body.storyDays) ? body.storyDays : [];

    const parsedStartDate = new Date(startDate);
    if (!startDate || Number.isNaN(parsedStartDate.getTime())) {
      return NextResponse.json({ error: "計画開始日を設定してください" }, { status: 400 });
    }
    if (!operationPurpose) {
      return NextResponse.json({ error: "投稿の目的を設定してください" }, { status: 400 });
    }
    if (feedDays.length === 0 || reelDays.length === 0 || storyDays.length === 0) {
      return NextResponse.json(
        { error: "フィード・リール・ストーリーズの投稿曜日をすべて設定してください" },
        { status: 400 }
      );
    }

    const currentFollowers = Number(body.currentFollowers || 0);
    const targetFollowerIncrease = Number(body.targetFollowerIncrease || 0);
    const targetFollowersFromBody = Number(body.targetFollowers || 0);
    if (!Number.isFinite(currentFollowers) || currentFollowers < 0) {
      return NextResponse.json({ error: "現在フォロワー数が不正です" }, { status: 400 });
    }
    if (!Number.isFinite(targetFollowerIncrease) || targetFollowerIncrease <= 0) {
      return NextResponse.json(
        { error: "増加目標は1以上の値を設定してください" },
        { status: 400 }
      );
    }
    const targetFollowers = Number.isFinite(targetFollowersFromBody) && targetFollowersFromBody > currentFollowers
      ? targetFollowersFromBody
      : currentFollowers + targetFollowerIncrease;

    const planInput: PlanInput = {
      userId,
      snsType: "instagram",
      startDate,
      currentFollowers,
      targetFollowers,
      targetFollowerOption: body.targetFollowerOption,
      customTargetFollowers: body.customTargetFollowers || String(targetFollowerIncrease),
      operationPurpose,
      weeklyPosts: body.weeklyPosts as PlanInput["weeklyPosts"],
      reelCapability: body.reelCapability as PlanInput["reelCapability"],
      storyFrequency: (body.storyFrequency || "none") as PlanInput["storyFrequency"],
      feedDays,
      reelDays,
      storyDays,
      targetAudience: body.targetAudience,
      postingTime: body.postingTime as PlanInput["postingTime"],
      regionRestriction: (body.regionRestriction || "none") as PlanInput["regionRestriction"],
      regionName: body.regionName,
    };

    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return NextResponse.json({ error: "ユーザープロファイルが見つかりません" }, { status: 404 });
    }

    const lastMonthPerformance = await PlanRepository.getLastMonthPerformance(userId, new Date(planInput.startDate));
    const strategyPlan = await PlanEngine.buildStrategy(planInput, userProfile, lastMonthPerformance);
    const firstWeekPlan = strategyPlan.weeklyPlans.find((wp) => wp.week === 1);
    const incrementalStrategyPlan = {
      ...strategyPlan,
      weeklyPlans: firstWeekPlan ? [firstWeekPlan] : [],
    };

    const planId = await PlanRepository.savePlanInput(planInput, body.simulationResult, incrementalStrategyPlan);

    return NextResponse.json({ success: true, planId, message: "計画を保存しました" });
  } catch (error) {
    console.error("ホーム計画保存エラー:", error);
    const message = error instanceof Error ? error.message : "計画の保存に失敗しました";
    const status = message.includes("バリデーション") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
