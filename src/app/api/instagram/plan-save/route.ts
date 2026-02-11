import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/server/auth-context";
import { PlanRepository } from "@/repositories/plan-repository";
import { PlanInput } from "@/domain/plan/plan-input";
import { PlanEngine } from "@/domain/plan/plan-engine";
import { getUserProfile } from "@/lib/server/user-profile";

interface PlanSaveRequest {
  startDate: string;
  currentFollowers: number;
  targetFollowers: number;
  targetFollowerOption?: "conservative" | "standard" | "ambitious" | "custom" | "ai";
  customTargetFollowers?: string;
  operationPurpose: string;
  weeklyPosts: string;
  reelCapability: string;
  storyFrequency?: string;
  targetAudience?: string;
  postingTime?: string;
  regionRestriction?: string;
  regionName?: string;
  simulationResult?: Record<string, unknown> | null;
}

/**
 * 計画保存API（新しいアーキテクチャ）
 * 
 * PlanInputのみを受け取って保存
 * StrategyPlanは生成せず、Homeページで動的に生成される
 */
export async function POST(request: NextRequest) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "plan-save", limit: 10, windowSeconds: 60 },
      auditEventName: "plan_save",
    });

    const body: PlanSaveRequest = await request.json();

    // バリデーション
    if (!body.startDate || !body.currentFollowers || !body.operationPurpose || !body.weeklyPosts || !body.reelCapability) {
      return NextResponse.json(
        { error: "必須項目が不足しています" },
        { status: 400 }
      );
    }

    // PlanInputを構築
    const planInput: PlanInput = {
      userId,
      snsType: "instagram",
      startDate: body.startDate,
      currentFollowers: body.currentFollowers,
      targetFollowers: body.targetFollowers,
      targetFollowerOption: body.targetFollowerOption,
      customTargetFollowers: body.customTargetFollowers,
      operationPurpose: body.operationPurpose,
      weeklyPosts: body.weeklyPosts as PlanInput["weeklyPosts"],
      reelCapability: body.reelCapability as PlanInput["reelCapability"],
      storyFrequency: (body.storyFrequency || "none") as PlanInput["storyFrequency"],
      targetAudience: body.targetAudience,
      postingTime: body.postingTime as PlanInput["postingTime"],
      regionRestriction: (body.regionRestriction || "none") as PlanInput["regionRestriction"],
      regionName: body.regionName,
    }

    // ユーザープロファイルを取得
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return NextResponse.json(
        { error: "ユーザープロファイルが見つかりません" },
        { status: 404 }
      );
    }

    // 先月の実績データを取得
    const lastMonthPerformance = await PlanRepository.getLastMonthPerformance(
      userId,
      new Date(planInput.startDate)
    );

    // StrategyPlanを生成（weeklyPlansを含む）
    const strategyPlan = await PlanEngine.buildStrategy(
      planInput,
      userProfile,
      lastMonthPerformance
    );

    // 初回は今週分（第1週）のみ保存し、次週以降はHomeアクセス時に週単位で追加生成する
    const firstWeekPlan = strategyPlan.weeklyPlans.find((wp) => wp.week === 1);
    const incrementalStrategyPlan = {
      ...strategyPlan,
      weeklyPlans: firstWeekPlan ? [firstWeekPlan] : [],
    };

    // PlanInputとStrategyPlanを保存
    const planId = await PlanRepository.savePlanInput(
      planInput,
      body.simulationResult,
      incrementalStrategyPlan
    )

    return NextResponse.json({
      success: true,
      planId,
      message: "計画を保存しました",
    })
  } catch (error) {
    console.error("計画保存エラー:", error)
    return NextResponse.json(
      { error: "計画の保存に失敗しました" },
      { status: 500 }
    )
  }
}
