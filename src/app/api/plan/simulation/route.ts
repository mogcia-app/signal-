import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/server/auth-context";

interface SimulationCalculationRequest {
  followerGain: number;
  currentFollowers: number;
  planPeriod: string;
  postsPerWeek: {
    reel: number;
    feed: number;
    story: number;
  };
  planEndDate?: string; // ISO string format
}

interface ExpectedRange {
  min: number;
  max: number;
}

interface PostBreakdown {
  reel: {
    frequency: string;
    countTotal: number;
    expected: ExpectedRange;
  };
  feed: {
    frequency: string;
    countTotal: number;
    expected: ExpectedRange;
  };
  story: {
    frequency: string;
    countTotal: number;
    expected: ExpectedRange;
  };
}

interface WorkloadCalculation {
  weeklyHours: number;
  monthlyHours: number;
  breakdown: {
    reel: { hours: number; perPost: number };
    feed: { hours: number; perPost: number };
    story: { hours: number; perPost: number };
  };
}

interface SimulationCalculationResponse {
  weeksRemaining: number;
  daysRemaining: number;
  postBreakdown: PostBreakdown;
  totalExpected: ExpectedRange;
  goalAchievementRate: {
    label: string;
    showAdSuggestion: boolean;
  };
  dailyPace: number;
  workload: WorkloadCalculation;
}

// 成長係数（週1本あたりのフォロワー増加数）
// より現実的な値に調整
const GROWTH_RATE = {
  reel: { min: 1.0, max: 2.0 },     // リール1本あたり: 週に1〜2人
  feed: { min: 0.5, max: 1.5 },     // フィード1本あたり: 週に0.5〜1.5人（週2回で1〜3人）
  story: { min: 0.07, max: 0.14 },  // ストーリー1本あたり: 週に0.07〜0.14人（毎日で0.5〜1人）
};

// 期待値計算の共通関数
function calcExpected(
  postsPerWeek: number,
  weeks: number,
  rate: { min: number; max: number }
): ExpectedRange {
  return {
    min: Math.round(postsPerWeek * rate.min * weeks),
    max: Math.round(postsPerWeek * rate.max * weeks),
  };
}

// 投稿頻度を分かりやすい形式に変換
function formatPostFrequency(postsPerWeek: number): string {
  if (postsPerWeek === 0) return "投稿なし";
  if (postsPerWeek === 1) return "週1回";
  if (postsPerWeek === 2) return "週2回";
  if (postsPerWeek === 3) return "週3回";
  if (postsPerWeek === 4) return "週4回";
  if (postsPerWeek === 5) return "週5回";
  if (postsPerWeek === 6) return "週6回";
  if (postsPerWeek >= 7) return "毎日";
  return `週${postsPerWeek}回`;
}

// 期間に基づく日数を計算
function getPeriodDays(planPeriod: string): number {
  const now = new Date();
  const targetDate = new Date(now);
  
  switch (planPeriod) {
    case "1ヶ月":
      targetDate.setMonth(targetDate.getMonth() + 1);
      break;
    case "3ヶ月":
      targetDate.setMonth(targetDate.getMonth() + 3);
      break;
    case "6ヶ月":
      targetDate.setMonth(targetDate.getMonth() + 6);
      break;
    case "1年":
      targetDate.setFullYear(targetDate.getFullYear() + 1);
      break;
    default:
      targetDate.setMonth(targetDate.getMonth() + 1);
  }
  
  const timeDiff = targetDate.getTime() - now.getTime();
  return Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
}

export async function POST(request: NextRequest) {
  try {
    await requireAuthContext(request, {
      requireContract: true,
    });

    const body: SimulationCalculationRequest = await request.json();

    // バリデーション
    if (!body.followerGain || !body.currentFollowers || !body.planPeriod || !body.postsPerWeek) {
      return NextResponse.json(
        { error: "必要なパラメータが不足しています" },
        { status: 400 }
      );
    }

    // 残り日数を計算
    let daysRemaining: number;
    if (body.planEndDate) {
      const now = new Date();
      const endDate = new Date(body.planEndDate);
      const timeDiff = endDate.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
    } else {
      daysRemaining = getPeriodDays(body.planPeriod);
    }

    // 週数を唯一の時間軸にする（1ヶ月=4週間で統一）
    // 投稿数の計算には4週間を使用（1ヶ月は4週として扱う）
    const weeksForCount = 4; // 投稿数の計算用（常に4週間）
    const weeksRemaining = Math.max(1, Math.ceil(daysRemaining / 7)); // 予測増加数の計算用（実際の週数）

    // postBreakdown を週単位で計算
    const reel = typeof body.postsPerWeek.reel === "number" && !isNaN(body.postsPerWeek.reel) 
      ? body.postsPerWeek.reel 
      : 0;
    const feed = typeof body.postsPerWeek.feed === "number" && !isNaN(body.postsPerWeek.feed)
      ? body.postsPerWeek.feed
      : 0;
    const story = typeof body.postsPerWeek.story === "number" && !isNaN(body.postsPerWeek.story)
      ? body.postsPerWeek.story
      : 0;

    // 週あたりの予測増加数（1週間分）
    const reelExpectedPerWeek = calcExpected(reel, 1, GROWTH_RATE.reel);
    const feedExpectedPerWeek = calcExpected(feed, 1, GROWTH_RATE.feed);
    const storyExpectedPerWeek = calcExpected(story, 1, GROWTH_RATE.story);

    // 期間全体の予測増加数（実際の週数で計算）
    const reelExpectedTotal = calcExpected(reel, weeksRemaining, GROWTH_RATE.reel);
    const feedExpectedTotal = calcExpected(feed, weeksRemaining, GROWTH_RATE.feed);
    const storyExpectedTotal = calcExpected(story, weeksRemaining, GROWTH_RATE.story);

    const postBreakdown: PostBreakdown = {
      reel: {
        frequency: formatPostFrequency(reel),
        countTotal: Math.round(reel * weeksForCount), // 4週間で計算
        expected: reelExpectedPerWeek, // 週あたりの予測増加数
      },
      feed: {
        frequency: formatPostFrequency(feed),
        countTotal: Math.round(feed * weeksForCount), // 4週間で計算
        expected: feedExpectedPerWeek, // 週あたりの予測増加数
      },
      story: {
        frequency: formatPostFrequency(story),
        countTotal: Math.round(story * weeksForCount), // 4週間で計算
        expected: storyExpectedPerWeek, // 週あたりの予測増加数
      },
    };

    // totalExpected を期間全体で計算（実際の週数を使用）
    const totalExpected: ExpectedRange = {
      min:
        reelExpectedTotal.min +
        feedExpectedTotal.min +
        storyExpectedTotal.min,
      max:
        reelExpectedTotal.max +
        feedExpectedTotal.max +
        storyExpectedTotal.max,
    };

    // 達成判定ロジック（思想を揃える）
    const target = Number(body.followerGain);
    let goalAchievementRate: { label: string; showAdSuggestion: boolean };

    if (!target || !totalExpected.max) {
      goalAchievementRate = { label: "不明", showAdSuggestion: false };
    } else if (totalExpected.min >= target) {
      goalAchievementRate = { label: "達成可能", showAdSuggestion: false };
    } else if (totalExpected.max >= target) {
      goalAchievementRate = { label: "頑張れば達成可能", showAdSuggestion: true };
    } else {
      const ratio = totalExpected.max / target;
      if (ratio >= 0.7) {
        goalAchievementRate = { label: "やや困難", showAdSuggestion: true };
      } else if (ratio >= 0.4) {
        goalAchievementRate = { label: "困難", showAdSuggestion: true };
      } else {
        goalAchievementRate = { label: "非常に困難", showAdSuggestion: true };
      }
    }

    // 1日あたりの必要ペースを計算
    const dailyPace = daysRemaining > 0
      ? Math.round((target / daysRemaining) * 10) / 10
      : target;

    // 実行負荷（工数）を計算
    // 投稿タイプごとの制作時間（時間）
    const REEL_HOURS_PER_POST = 2.0;   // リール: 1本あたり2時間（企画・撮影・編集）
    const FEED_HOURS_PER_POST = 0.75;  // フィード: 1本あたり0.75時間（45分）
    const STORY_HOURS_PER_POST = 0.2;  // ストーリー: 1本あたり0.2時間（12分）

    const reelWeeklyHours = reel * REEL_HOURS_PER_POST;
    const feedWeeklyHours = feed * FEED_HOURS_PER_POST;
    const storyWeeklyHours = story * STORY_HOURS_PER_POST;
    const weeklyHours = reelWeeklyHours + feedWeeklyHours + storyWeeklyHours;

    // 月間時間（週数 × 週間時間）
    const monthlyHours = Math.round((weeklyHours * (weeksRemaining / 4)) * 10) / 10;

    const workload: WorkloadCalculation = {
      weeklyHours: Math.round(weeklyHours * 10) / 10,
      monthlyHours,
      breakdown: {
        reel: {
          hours: Math.round(reelWeeklyHours * 10) / 10,
          perPost: REEL_HOURS_PER_POST,
        },
        feed: {
          hours: Math.round(feedWeeklyHours * 10) / 10,
          perPost: FEED_HOURS_PER_POST,
        },
        story: {
          hours: Math.round(storyWeeklyHours * 10) / 10,
          perPost: STORY_HOURS_PER_POST,
        },
      },
    };

    const response: SimulationCalculationResponse = {
      weeksRemaining,
      daysRemaining,
      postBreakdown,
      totalExpected,
      goalAchievementRate,
      dailyPace,
      workload,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("シミュレーション計算エラー:", error);
    return NextResponse.json(
      { error: "シミュレーション計算中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

