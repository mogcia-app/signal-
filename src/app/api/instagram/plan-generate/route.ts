import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { PlanRepository } from "@/repositories/plan-repository";
import { PlanEngine } from "@/domain/plan/plan-engine";
import { PlanInput } from "@/domain/plan/plan-input";

interface PlanGenerateRequest {
  startDate: string;
  currentFollowers: number;
  targetFollowers?: number;
  targetFollowerOption?: "conservative" | "standard" | "ambitious" | "custom" | "ai";
  operationPurpose: string;
  weeklyPosts: string;
  reelCapability: string;
  storyFrequency?: string;
  targetAudience?: string;
  postingTime?: string;
  regionRestriction?: string;
  regionName?: string;
}

/**
 * 計画生成API
 * 
 * 新しいアーキテクチャ:
 * - PlanInputを構築
 * - PlanRepository.getLastMonthPerformanceで先月の実績データを取得
 * - PlanEngine.buildStrategyでStrategyPlanを生成
 * - PlanRepository.saveStrategyPlanで保存
 * - レスポンスを返す（既存の形式を維持）
 */
export async function POST(request: NextRequest) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "plan-generate", limit: 10, windowSeconds: 60 },
      auditEventName: "plan_generate",
    });

    const body: PlanGenerateRequest = await request.json();

    // バリデーション
    if (!body.startDate || !body.currentFollowers || !body.operationPurpose || !body.weeklyPosts || !body.reelCapability) {
      return NextResponse.json(
        { error: "必須項目が不足しています" },
        { status: 400 }
      );
    }

    // ユーザープロファイルを取得
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return NextResponse.json(
        { error: "ユーザープロファイルが見つかりません" },
        { status: 404 }
      );
    }

    // 目標フォロワー数を取得（リクエストから取得、なければデフォルト）
    const targetFollowers = body.targetFollowers || body.currentFollowers + 50;

    // PlanInputを構築
    const planInput: PlanInput = {
      userId,
      snsType: "instagram",
      startDate: body.startDate,
      currentFollowers: body.currentFollowers,
      targetFollowers,
      operationPurpose: body.operationPurpose,
      weeklyPosts: body.weeklyPosts as PlanInput["weeklyPosts"],
      reelCapability: body.reelCapability as PlanInput["reelCapability"],
      storyFrequency: (body.storyFrequency || "none") as PlanInput["storyFrequency"],
      targetAudience: body.targetAudience,
      postingTime: body.postingTime as PlanInput["postingTime"],
      regionRestriction: (body.regionRestriction || "none") as PlanInput["regionRestriction"],
      regionName: body.regionName,
    };

    // 先月の実績データを取得
    const startDateObj = new Date(body.startDate);
    const lastMonthPerformance = await PlanRepository.getLastMonthPerformance(userId, startDateObj);

    // StrategyPlanを生成（表示用、保存はしない）
    const strategyPlan = await PlanEngine.buildStrategy(planInput, userProfile, lastMonthPerformance);

    // PlanInputを保存（新しいアーキテクチャ）
    // 注意: StrategyPlanは保存しない。Homeページで動的に生成される
    const planId = await PlanRepository.savePlanInput(planInput);

    // 既存のレスポンス形式に変換（後方互換性のため）
    const plan = {
      startDate: body.startDate,
      endDate: strategyPlan.endDate.toISOString().split("T")[0],
      currentFollowers: body.currentFollowers,
      targetFollowers,
      followerIncrease: targetFollowers - body.currentFollowers,
      operationPurpose: body.operationPurpose,
      monthlyGrowthRate: strategyPlan.monthlyGrowthRate,
      difficulty: strategyPlan.difficulty,
      schedule: {
        weeklyFrequency: strategyPlan.schedule.weeklyFrequency,
        feedPosts: strategyPlan.schedule.feedPosts,
        feedPostsWithReel: strategyPlan.schedule.feedPosts,
        reelPosts: strategyPlan.schedule.reelPosts,
        storyPosts: strategyPlan.schedule.storyPosts,
        postingDays: strategyPlan.schedule.postingDays,
        storyDays: strategyPlan.schedule.storyDays,
      },
      weeklyPlans: strategyPlan.weeklyPlans,
      expectedResults: strategyPlan.expectedResults,
      features: strategyPlan.features || [],
      suggestedContentTypes: strategyPlan.suggestedContentTypes || [],
    };

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("計画生成エラー:", error);
    return NextResponse.json(
      { error: "計画の生成に失敗しました" },
      { status: 500 }
    );
  }
}
