/** @jest-environment node */

import type { PlanInput } from "../plan-input";

const mockCreate = jest.fn();

jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: (...args: unknown[]) => mockCreate(...args),
      },
    },
  }));
});

describe("PlanAIGenerationService", () => {
  const loadService = async () => import("./plan-ai-service");

  const baseInput: PlanInput = {
    userId: "user-1",
    snsType: "instagram",
    currentFollowers: 100,
    targetFollowers: 120,
    operationPurpose: "認知拡大",
    weeklyPosts: "none",
    reelCapability: "weekly-1-2",
    storyFrequency: "none",
    feedDays: [],
    reelDays: ["火", "金"],
    storyDays: [],
    startDate: "2026-05-22",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fallback plan uses the selected days and post types", async () => {
    mockCreate.mockRejectedValueOnce(new Error("AI unavailable"));
    const { PlanAIGenerationService } = await loadService();

    const result = await PlanAIGenerationService.generateWeeklyPlans(baseInput, {
      weeklyIncreases: [5, 5, 5, 5],
      calculatedExpectedResults: {
        monthlyReach: 1000,
        engagementRate: "4.0%",
        profileViews: 50,
        saves: 20,
        newFollowers: 20,
      },
      weeklyPostsNum: 0,
      weeklyReelPosts: 2,
      monthlyFeedPosts: 0,
      reelPosts: 8,
      storyPosts: 0,
    });

    expect(result.postingSchedule.feedPosts).toEqual([
      { day: "火曜", time: "20:00", type: "reel" },
      { day: "金曜", time: "20:00", type: "reel" },
    ]);
    expect(result.weeklyPlans[0]?.feedPosts).toEqual([
      expect.objectContaining({ day: "火曜", type: "reel" }),
      expect.objectContaining({ day: "金曜", type: "reel" }),
    ]);
  });

  test("normalizes AI output to only the selected days", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              postingSchedule: {
                feedPosts: [
                  { day: "月曜", time: "19:00", type: "reel" },
                  { day: "火曜", time: "20:00", type: "reel" },
                ],
                storyPosts: [],
              },
              weeklyPlans: [
                {
                  week: 1,
                  targetFollowers: 105,
                  increase: 5,
                  theme: "テーマ",
                  feedPosts: [
                    { day: "月曜", content: "除外される", type: "reel" },
                    { day: "火曜", content: "残る", type: "reel" },
                  ],
                  storyContent: [],
                },
              ],
            }),
          },
        },
      ],
    });

    const { PlanAIGenerationService } = await loadService();
    const result = await PlanAIGenerationService.generateWeeklyPlans(baseInput, {
      weeklyIncreases: [5, 5, 5, 5],
      calculatedExpectedResults: {
        monthlyReach: 1000,
        engagementRate: "4.0%",
        profileViews: 50,
        saves: 20,
        newFollowers: 20,
      },
      weeklyPostsNum: 0,
      weeklyReelPosts: 1,
      monthlyFeedPosts: 0,
      reelPosts: 4,
      storyPosts: 0,
    });

    expect(result.postingSchedule.feedPosts).toEqual([{ day: "火曜", time: "20:00", type: "reel" }]);
    expect(result.weeklyPlans[0]?.feedPosts).toEqual([
      expect.objectContaining({ day: "火曜", content: "残る", type: "reel" }),
    ]);
  });
});
