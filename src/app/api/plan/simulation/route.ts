import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/server/auth-context";
import { getPostTypePerformance, getEngagementRateForFollowers } from "@/lib/instagram-benchmarks";

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
// 2026年ベンチマークデータに基づく計算
function getGrowthRateForPostType(
  postType: "reel" | "feed" | "story",
  currentFollowers: number
): { min: number; max: number } {
  const engagementRate = getEngagementRateForFollowers(currentFollowers);
  
  // 投稿タイプ別のパフォーマンスを取得
  const reelPerformance = getPostTypePerformance("reel");
  const carouselPerformance = getPostTypePerformance("carousel");
  const imagePerformance = getPostTypePerformance("image");
  
  // リーチ率とエンゲージメント率からフォロワー増加数を推定
  // リーチ数 = フォロワー数 × リーチ率
  // エンゲージメント数 = リーチ数 × エンゲージメント率
  // フォロワー増加数 ≈ エンゲージメント数 × コンバージョン率（推定2-5%）
  
  if (postType === "reel" && reelPerformance) {
    const reachRate = reelPerformance.averageReachRate / 100;
    const engagementRateAvg = (reelPerformance.engagementRate.min + reelPerformance.engagementRate.max) / 2 / 100;
    const conversionRate = 0.03; // 3%のコンバージョン率を仮定
    const expectedReach = currentFollowers * reachRate;
    const expectedEngagement = expectedReach * engagementRateAvg;
    const expectedFollowers = expectedEngagement * conversionRate;
    return {
      min: Math.max(0.5, expectedFollowers * 0.7), // 最小値は70%の期待値
      max: expectedFollowers * 1.3, // 最大値は130%の期待値
    };
  }
  
  if (postType === "feed") {
    // フィード投稿はカルーセルまたは画像の平均を使用
    const avgReachRate = ((carouselPerformance?.averageReachRate || 0) + (imagePerformance?.averageReachRate || 0)) / 2 / 100;
    const avgEngagementRate = ((carouselPerformance?.engagementRate.min || 0) + (imagePerformance?.engagementRate.min || 0)) / 2 / 100;
    const conversionRate = 0.02; // 2%のコンバージョン率を仮定（リールより低い）
    const expectedReach = currentFollowers * avgReachRate;
    const expectedEngagement = expectedReach * avgEngagementRate;
    const expectedFollowers = expectedEngagement * conversionRate;
    return {
      min: Math.max(0.3, expectedFollowers * 0.6),
      max: expectedFollowers * 1.2,
    };
  }
  
  if (postType === "story") {
    // ストーリーズはリーチ率が高いが、エンゲージメント率は低い
    const storyReachRate = 0.15; // ストーリーズのリーチ率（推定15%）
    const storyEngagementRate = engagementRate.min / 100; // エンゲージメント率は低め
    const conversionRate = 0.01; // 1%のコンバージョン率を仮定（最も低い）
    const expectedReach = currentFollowers * storyReachRate;
    const expectedEngagement = expectedReach * storyEngagementRate;
    const expectedFollowers = expectedEngagement * conversionRate;
    return {
      min: Math.max(0.05, expectedFollowers * 0.5),
      max: expectedFollowers * 1.0,
    };
  }
  
  // フォールバック値
  return {
    reel: { min: 1.0, max: 2.0 },
    feed: { min: 0.5, max: 1.5 },
    story: { min: 0.07, max: 0.14 },
  }[postType];
}

// 後方互換性のため、デフォルト値も保持
const GROWTH_RATE = {
  reel: { min: 1.0, max: 2.0 },
  feed: { min: 0.5, max: 1.5 },
  story: { min: 0.07, max: 0.14 },
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

    // ベンチマークデータに基づく成長係数を取得
    const reelGrowthRate = getGrowthRateForPostType("reel", body.currentFollowers);
    const feedGrowthRate = getGrowthRateForPostType("feed", body.currentFollowers);
    const storyGrowthRate = getGrowthRateForPostType("story", body.currentFollowers);

    // 週あたりの予測増加数（1週間分）
    const reelExpectedPerWeek = calcExpected(reel, 1, reelGrowthRate);
    const feedExpectedPerWeek = calcExpected(feed, 1, feedGrowthRate);
    const storyExpectedPerWeek = calcExpected(story, 1, storyGrowthRate);

    // 期間全体の予測増加数（実際の週数で計算）
    const reelExpectedTotal = calcExpected(reel, weeksRemaining, reelGrowthRate);
    const feedExpectedTotal = calcExpected(feed, weeksRemaining, feedGrowthRate);
    const storyExpectedTotal = calcExpected(story, weeksRemaining, storyGrowthRate);

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
    // Signal.でできること：投稿文生成時間のみ（分単位で計算）
    const REEL_MINUTES_PER_POST = 1;   // リール: Signal.での投稿文生成約1分
    const FEED_MINUTES_PER_POST = 1;   // フィード: Signal.での投稿文生成約1分
    const STORY_MINUTES_PER_POST = 0.5; // ストーリー: Signal.での投稿文生成約30秒
    const ENGAGEMENT_MINUTES_PER_WEEK = 5; // コメント返信: Signal.での返信文生成週5分

    const reelWeeklyMinutes = reel * REEL_MINUTES_PER_POST;
    const feedWeeklyMinutes = feed * FEED_MINUTES_PER_POST;
    const storyWeeklyMinutes = story * STORY_MINUTES_PER_POST;
    const weeklyMinutes = reelWeeklyMinutes + feedWeeklyMinutes + storyWeeklyMinutes + ENGAGEMENT_MINUTES_PER_WEEK;
    const weeklyHours = weeklyMinutes / 60; // 時間に変換（互換性のため）

    // 月間時間（週数 × 週間時間）
    const monthlyHours = Math.round((weeklyHours * (weeksRemaining / 4)) * 10) / 10;

    const workload: WorkloadCalculation = {
      weeklyHours: Math.round(weeklyHours * 10) / 10,
      monthlyHours,
      breakdown: {
        reel: {
          hours: Math.round(reelWeeklyMinutes / 60 * 10) / 10,
          perPost: REEL_MINUTES_PER_POST / 60, // 時間単位に変換
        },
        feed: {
          hours: Math.round(feedWeeklyMinutes / 60 * 10) / 10,
          perPost: FEED_MINUTES_PER_POST / 60, // 時間単位に変換
        },
        story: {
          hours: Math.round(storyWeeklyMinutes / 60 * 10) / 10,
          perPost: STORY_MINUTES_PER_POST / 60, // 時間単位に変換
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

