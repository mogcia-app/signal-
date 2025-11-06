import { NextRequest, NextResponse } from "next/server";
import {
  SimulationRequest,
  ABTestScenario,
  ABTestComparison,
} from "../../../instagram/plan/types/plan";

export async function POST(request: NextRequest) {
  try {
    const body: SimulationRequest = await request.json();

    // バリデーション
    if (!body.followerGain || !body.currentFollowers || !body.planPeriod) {
      return NextResponse.json({ error: "必要なパラメータが不足しています" }, { status: 400 });
    }

    // A/Bテストシナリオ生成と比較
    const abTestResult = await runABTest(body);

    return NextResponse.json(abTestResult);
  } catch (error) {
    console.error("A/Bテストエラー:", error);
    return NextResponse.json({ error: "A/Bテスト処理中にエラーが発生しました" }, { status: 500 });
  }
}

// A/Bテスト実行
async function runABTest(baseRequest: SimulationRequest): Promise<ABTestComparison> {
  // シナリオ生成
  const scenarios = generateTestScenarios(baseRequest);

  // シナリオ比較
  const comparison = compareScenarios(scenarios, baseRequest);

  return comparison;
}

// テストシナリオ生成
function generateTestScenarios(baseRequest: SimulationRequest): ABTestScenario[] {
  const scenarios: ABTestScenario[] = [];

  // シナリオ1: リール中心戦略
  scenarios.push({
    id: "reel-focused",
    name: "リール中心戦略",
    description: "リール投稿を週4回、フィードを週2回に設定してトレンドを活用",
    strategy: {
      postsPerWeek: { reel: 4, feed: 2, story: 5 },
      contentMix: { trending: 0.6, educational: 0.3, "behind-scenes": 0.1 },
      postingSchedule: ["14:00", "20:00", "21:00"],
      hashtagStrategy: "trending-heavy",
      engagementStrategy: "quick-response",
    },
    expectedOutcome: {
      followerGrowth: baseRequest.followerGain * 1.2,
      engagementRate: 0.045,
      reach: baseRequest.currentFollowers * 2.5,
    },
    riskLevel: "medium",
    resourceRequirement: {
      timePerWeek: 15,
      budget: 5000,
      teamSize: 1,
    },
  });

  // シナリオ2: バランス型戦略
  scenarios.push({
    id: "balanced",
    name: "バランス型戦略",
    description: "リール、フィード、ストーリーを均等に配分して安定成長",
    strategy: {
      postsPerWeek: { reel: 2, feed: 3, story: 4 },
      contentMix: { educational: 0.4, personal: 0.3, promotional: 0.3 },
      postingSchedule: ["10:00", "15:00", "19:00"],
      hashtagStrategy: "niche-focused",
      engagementStrategy: "community-building",
    },
    expectedOutcome: {
      followerGrowth: baseRequest.followerGain,
      engagementRate: 0.035,
      reach: baseRequest.currentFollowers * 2.0,
    },
    riskLevel: "low",
    resourceRequirement: {
      timePerWeek: 12,
      budget: 3000,
      teamSize: 1,
    },
  });

  // シナリオ3: エンゲージメント重視戦略
  scenarios.push({
    id: "engagement-focused",
    name: "エンゲージメント重視戦略",
    description: "ストーリー中心でコミュニティ構築に重点を置く",
    strategy: {
      postsPerWeek: { reel: 1, feed: 2, story: 7 },
      contentMix: { interactive: 0.5, personal: 0.3, educational: 0.2 },
      postingSchedule: ["08:00", "12:00", "18:00", "22:00"],
      hashtagStrategy: "minimal",
      engagementStrategy: "high-interaction",
    },
    expectedOutcome: {
      followerGrowth: baseRequest.followerGain * 0.8,
      engagementRate: 0.055,
      reach: baseRequest.currentFollowers * 1.8,
    },
    riskLevel: "high",
    resourceRequirement: {
      timePerWeek: 20,
      budget: 2000,
      teamSize: 2,
    },
  });

  // シナリオ4: 高頻度投稿戦略
  scenarios.push({
    id: "high-frequency",
    name: "高頻度投稿戦略",
    description: "毎日投稿でアルゴリズムに最適化してリーチを最大化",
    strategy: {
      postsPerWeek: { reel: 3, feed: 4, story: 7 },
      contentMix: { "quick-tips": 0.4, trending: 0.3, "user-generated": 0.3 },
      postingSchedule: ["09:00", "13:00", "17:00", "21:00"],
      hashtagStrategy: "algorithm-optimized",
      engagementStrategy: "automated",
    },
    expectedOutcome: {
      followerGrowth: baseRequest.followerGain * 1.1,
      engagementRate: 0.03,
      reach: baseRequest.currentFollowers * 3.0,
    },
    riskLevel: "high",
    resourceRequirement: {
      timePerWeek: 25,
      budget: 8000,
      teamSize: 3,
    },
  });

  return scenarios;
}

// シナリオ比較
function compareScenarios(
  scenarios: ABTestScenario[],
  userProfile: SimulationRequest
): ABTestComparison {
  // 各シナリオのスコア計算
  const scoredScenarios = scenarios.map((scenario) => ({
    ...scenario,
    score: calculateScenarioScore(scenario, userProfile),
  }));

  // スコア順でソート
  scoredScenarios.sort((a, b) => (b.score || 0) - (a.score || 0));

  const winner = scoredScenarios[0];
  const confidence = calculateConfidence(scoredScenarios);

  return {
    scenarios: scoredScenarios,
    winner: winner.id,
    confidence,
    recommendation: generateRecommendation(winner),
    timeline: generateTimeline(winner),
  };
}

// シナリオスコア計算
function calculateScenarioScore(scenario: ABTestScenario, userProfile: SimulationRequest): number {
  let score = 0;

  // 目標達成可能性（40%）
  const goalAlignment = calculateGoalAlignment(scenario, userProfile);
  score += goalAlignment * 0.4;

  // リソース適合性（30%）
  const resourceFit = calculateResourceFit(scenario, userProfile);
  score += resourceFit * 0.3;

  // リスク評価（20%）
  const riskScore = calculateRiskScore(scenario);
  score += riskScore * 0.2;

  // エンゲージメント期待値（10%）
  const engagementScore = scenario.expectedOutcome.engagementRate * 10;
  score += engagementScore * 0.1;

  return Math.min(100, Math.max(0, score));
}

// 目標適合性計算
function calculateGoalAlignment(scenario: ABTestScenario, userProfile: SimulationRequest): number {
  const goalCategory = userProfile.goalCategory;

  switch (goalCategory) {
    case "follower":
      return scenario.expectedOutcome.followerGrowth / userProfile.followerGain;
    case "engagement":
      return scenario.expectedOutcome.engagementRate * 20;
    case "reach":
      return scenario.expectedOutcome.reach / userProfile.currentFollowers;
    default:
      return 0.5;
  }
}

// リソース適合性計算
function calculateResourceFit(scenario: ABTestScenario, userProfile: SimulationRequest): number {
  const availableTime = 15; // デフォルト値
  const availableBudget = userProfile.budget || 5000;
  const availableTeam = userProfile.teamSize || 1;

  const timeFit = Math.min(1, availableTime / scenario.resourceRequirement.timePerWeek);
  const budgetFit = Math.min(1, availableBudget / scenario.resourceRequirement.budget);
  const teamFit = Math.min(1, availableTeam / scenario.resourceRequirement.teamSize);

  return (timeFit + budgetFit + teamFit) / 3;
}

// リスクスコア計算
function calculateRiskScore(scenario: ABTestScenario): number {
  const riskMap = { low: 0.9, medium: 0.7, high: 0.4 };
  return riskMap[scenario.riskLevel];
}

// 信頼度計算
function calculateConfidence(scenarios: ABTestScenario[]): number {
  if (scenarios.length < 2) {return 0.5;}

  const winnerScore = scenarios[0].score || 0;
  const runnerUpScore = scenarios[1].score || 0;

  const gap = winnerScore - runnerUpScore;
  return Math.min(0.95, Math.max(0.5, 0.5 + gap / 100));
}

// 推奨生成
function generateRecommendation(winner: ABTestScenario): string {
  return `${winner.name}が最も適しています。${winner.description}により、目標達成の可能性が高く、リソース要件も現在の状況に適合しています。`;
}

// タイムライン生成
 
function generateTimeline(_winner: ABTestScenario) {
  return [
    {
      phase: "準備期間",
      duration: "1-2週間",
      expectedResult: "コンテンツ戦略の詳細化とスケジュール設定",
    },
    {
      phase: "テスト実行",
      duration: "4週間",
      expectedResult: "初期データの収集とパフォーマンス測定",
    },
    {
      phase: "最適化",
      duration: "2週間",
      expectedResult: "データに基づく戦略の微調整",
    },
    {
      phase: "本格運用",
      duration: "継続",
      expectedResult: "最適化された戦略での目標達成",
    },
  ];
}
