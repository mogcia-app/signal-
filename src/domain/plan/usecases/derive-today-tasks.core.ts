import { deriveWeeklyPlans, extractTodayTasks, getCurrentWeekIndex } from "@/lib/plans/weekly-plans";
import {
  dayLabelToIndex,
  extractFeedContentFromStrategy,
  extractStoryContentFromStrategy,
  normalizeDayLabel,
  shouldPostToday,
} from "@/domain/plan/usecases/today-tasks.helpers";
import type {
  DeriveTodayTasksInput,
  DeriveTodayTasksOutput,
  FallbackPostAIGenerationRequest,
  PlanDataForGeneration,
  PostType,
  TodayTask,
  TodayTaskAIGenerationRequest,
  TomorrowPreparationAIGenerationRequest,
} from "@/domain/plan/usecases/today-tasks.types";

type WeeklyPlanContent = {
  feedPosts: Array<{ day: string; content: string; title?: string; type: string }>;
  storyContent: string | string[];
};

function toPostType(raw: string): PostType {
  if (raw === "reel" || raw === "story") {
    return raw;
  }
  return "feed";
}

function getDayContext(localDate: string): { dayOfWeek: number; dayName: string } {
  const [year, month, day] = localDate.split("-").map(Number);
  const localToday = new Date(year, month - 1, day);
  const dayOfWeek = localToday.getDay();
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  return { dayOfWeek, dayName: dayNames[dayOfWeek] };
}

function buildWeeklyPlanContent(
  currentPlan: Record<string, unknown>,
  localDate: string,
  timezone: string
): WeeklyPlanContent | null {
  const planData = (currentPlan.planData || null) as
    | {
        weeklyPlans?: Array<{
          week: number;
          feedPosts?: Array<{ day: string; content: string; title?: string; type?: string }>;
          storyContent?: string | string[];
        }>;
        startDate?: unknown;
      }
    | null;

  if (!planData?.weeklyPlans?.length) {
    return null;
  }

  const planStartForWeek = planData.startDate || currentPlan.startDate || currentPlan.createdAt || new Date();
  const currentWeek = getCurrentWeekIndex(planStartForWeek as Date | string, localDate, timezone) + 1;
  const currentWeekPlan = planData.weeklyPlans.find((week) => week.week === currentWeek) || planData.weeklyPlans[0];
  if (!currentWeekPlan) {
    return null;
  }

  return {
    feedPosts: (currentWeekPlan.feedPosts || []).map((post) => ({
      day: post.day,
      content: post.content,
      title: post.title,
      type: post.type || "feed",
    })),
    storyContent: currentWeekPlan.storyContent || [],
  };
}

function buildPlanDataForGeneration(formData: Record<string, unknown>): PlanDataForGeneration {
  return {
    title: String(formData.operationPurpose || "運用計画"),
    targetFollowers: Number(formData.targetFollowers || 100),
    currentFollowers: Number(formData.currentFollowers || 0),
    planPeriod: String(formData.planPeriod || "1ヶ月"),
    targetAudience: String(formData.targetAudience || ""),
    category: String(formData.operationPurpose || ""),
    strategies: [String(formData.operationPurpose || "認知拡大")],
    aiPersona: {
      tone: "親しみやすい",
      style: "自然",
      personality: "誠実",
      interests: [],
    },
    simulation: {
      postTypes: {
        reel: { weeklyCount: 1, followerEffect: 1 },
        feed: { weeklyCount: 1, followerEffect: 1 },
        story: { weeklyCount: 1, followerEffect: 1 },
      },
    },
  };
}

export function deriveTodayTasksFromPlan(input: DeriveTodayTasksInput): DeriveTodayTasksOutput {
  const formData = (input.currentPlan.formData || {}) as Record<string, unknown>;
  const simulationResult = (input.currentPlan.simulationResult || null) as Record<string, unknown> | null;
  const generatedStrategy = String(input.currentPlan.generatedStrategy || "");
  const { dayOfWeek, dayName } = getDayContext(input.localDate);

  const regionNameForHashtag =
    formData.regionRestriction === "restricted" && typeof formData.regionName === "string" ? formData.regionName : "";
  const planDataForGeneration = buildPlanDataForGeneration(formData);

  const weeklyPlanContent = buildWeeklyPlanContent(input.currentPlan, input.localDate, input.timezone);
  const baseTasks: TodayTask[] = [];
  const aiRequests: TodayTaskAIGenerationRequest[] = [];
  let fallbackPostCandidate: { type: PostType; title: string } | null = null;

  if (weeklyPlanContent) {
    const postsWithOffset = weeklyPlanContent.feedPosts
      .map((post) => {
        const postDayIndex = dayLabelToIndex(post.day || "");
        if (postDayIndex < 0) {
          return null;
        }
        const offset = (postDayIndex - dayOfWeek + 7) % 7;
        return { post, offset };
      })
      .filter((item): item is { post: { day: string; content: string; title?: string; type: string }; offset: number } => item !== null);

    const minOffset = postsWithOffset.length > 0 ? Math.min(...postsWithOffset.map((item) => item.offset)) : null;
    const nearestFeedPosts =
      minOffset === null ? [] : postsWithOffset.filter((item) => item.offset === minOffset).map((item) => item.post);

    const typeLabels: Record<PostType, string> = {
      feed: "フィード投稿",
      reel: "リール",
      story: "ストーリーズ",
    };

    for (const post of nearestFeedPosts) {
      const postType = toPostType(post.type || "feed");
      const postTitle = post.title || post.content || "";
      const hasScheduled = input.scheduledPosts.some((scheduledPost) => scheduledPost.type === postType);
      if (hasScheduled) {
        continue;
      }

      const taskId = `weekly-plan-${post.day}-${postType}-${input.nowMs}`;
      baseTasks.push({
        id: taskId,
        type: postType,
        title: `${typeLabels[postType]}を投稿する`,
        description: postTitle,
        recommendedTime: "推奨時間未設定",
        reason:
          minOffset === 0
            ? `今週のコンテンツ計画: ${postTitle}`
            : `今週のコンテンツ計画（最短: ${post.day}）: ${postTitle}`,
        priority: "high",
      });
      aiRequests.push({
        taskId,
        postType,
        prompt: postTitle,
      });
    }
  }

  const weeklyPlans = deriveWeeklyPlans(
    formData as {
      startDate: string;
      periodMonths: number;
      weeklyFeedPosts: number;
      weeklyReelPosts: number;
      weeklyStoryPosts: number;
      [key: string]: unknown;
    },
    simulationResult
  );

  const planStartRaw = (input.currentPlan.startDate || input.currentPlan.createdAt || new Date()) as
    | Date
    | { toDate?: () => Date }
    | string;
  const planStart =
    planStartRaw instanceof Date
      ? planStartRaw
      : typeof planStartRaw === "object" && planStartRaw !== null && "toDate" in planStartRaw
        ? (planStartRaw as { toDate: () => Date }).toDate()
        : new Date(String(planStartRaw));
  const weekIndex = getCurrentWeekIndex(planStart, input.localDate, input.timezone);

  const currentWeekTasks = weeklyPlans[weekIndex]?.tasks || [];
  const firstWeekWithTasks = weeklyPlans.find((week) => week.tasks.length > 0);
  const candidateTask = currentWeekTasks[0] || firstWeekWithTasks?.tasks?.[0];
  if (candidateTask) {
    fallbackPostCandidate = {
      type: candidateTask.type,
      title: candidateTask.description || "次回投稿",
    };
  }

  if (!weeklyPlanContent || weeklyPlanContent.feedPosts.length === 0) {
    const todayTasksFromPlan = extractTodayTasks(weeklyPlans, input.localDate, weekIndex);
    const typeLabels: Record<string, string> = {
      feed: "フィード投稿",
      reel: "リール",
      story: "ストーリーズ",
      "feed+reel": "フィード投稿 + リール",
    };
    const typeTaskTypes: Record<string, PostType> = {
      feed: "feed",
      reel: "reel",
      story: "story",
      "feed+reel": "feed",
    };

    for (const task of todayTasksFromPlan) {
      const taskType = typeTaskTypes[task.type] || "feed";
      const hasScheduled = input.scheduledPosts.some((post) => post.type === taskType);
      if (hasScheduled) {
        continue;
      }

      const taskId = `ai-plan-${task.day}-${task.type}-${input.nowMs}`;
      baseTasks.push({
        id: taskId,
        type: taskType,
        title: `${typeLabels[task.type] || task.type}を投稿する`,
        description: task.description || "",
        recommendedTime: task.time || "推奨時間未設定",
        reason: `週次計画（第${weekIndex + 1}週）に基づくタスク`,
        priority: "high",
      });
      aiRequests.push({
        taskId,
        postType: taskType,
        prompt: task.description || "",
      });
    }
  }

  const storyFrequency = String(formData.storyFrequency || "");
  if (storyFrequency === "毎日" || storyFrequency === "ほぼ毎日") {
    const hasStoryScheduled = input.scheduledPosts.some((post) => post.type === "story");
    if (!hasStoryScheduled) {
      const storyContent = extractStoryContentFromStrategy(generatedStrategy, dayName);
      baseTasks.push({
        id: `story-${input.nowMs}`,
        type: "story",
        title: "ストーリーを投稿する",
        description: storyContent.title || "今日のストーリーズ投稿",
        recommendedTime: "11:00推奨",
        content: storyContent.content,
        reason: "今月の戦略: 「ストーリーズを毎日投稿」\n理由: ストーリーズの反応が良いため",
        priority: "high",
      });
    }
  }

  const feedFreq = String(formData.feedFreq || formData.availableTime || "");
  if (shouldPostToday(feedFreq, dayOfWeek)) {
    const hasFeedScheduled = input.scheduledPosts.some((post) => post.type === "feed");
    if (!hasFeedScheduled) {
      const feedContent = extractFeedContentFromStrategy(generatedStrategy, dayName);
      baseTasks.push({
        id: `feed-${input.nowMs}`,
        type: "feed",
        title: "フィード投稿をする",
        description: feedContent.title || "フィード投稿",
        recommendedTime: "13:00推奨",
        content: feedContent.content,
        reason: "今週の目標: フィード3回",
        priority: "medium",
      });
    }
  }

  const reelFreq = String(formData.reelFreq || formData.reelCapability || "");
  if (shouldPostToday(reelFreq, dayOfWeek)) {
    const hasReelScheduled = input.scheduledPosts.some((post) => post.type === "reel");
    if (!hasReelScheduled) {
      baseTasks.push({
        id: `reel-${input.nowMs}`,
        type: "reel",
        title: "リールを投稿する",
        description: "リール動画の投稿",
        recommendedTime: "13:00推奨",
        reason: "今週の目標: リール1回",
        priority: "medium",
      });
    }
  }

  let fallbackRequest: FallbackPostAIGenerationRequest | null = null;
  const hasPostingBaseTask = baseTasks.some((task) => task.type === "feed" || task.type === "reel" || task.type === "story");
  if (!hasPostingBaseTask) {
    const nearestPostFromWeeklyPlan = weeklyPlanContent?.feedPosts?.length
      ? weeklyPlanContent.feedPosts
          .map((post) => {
            const postDayIndex = dayLabelToIndex(post.day || "");
            if (postDayIndex < 0) {
              return null;
            }
            const offset = (postDayIndex - dayOfWeek + 7) % 7;
            return { post, offset };
          })
          .filter((item): item is { post: { day: string; content: string; title?: string; type: string }; offset: number } => item !== null)
          .sort((a, b) => a.offset - b.offset)[0]?.post
      : null;

    const nextPost =
      nearestPostFromWeeklyPlan ||
      (fallbackPostCandidate
        ? { type: fallbackPostCandidate.type, title: fallbackPostCandidate.title, content: fallbackPostCandidate.title }
        : null);

    if (nextPost) {
      const postType = toPostType(nextPost.type || "feed");
      const prompt = nextPost.title || nextPost.content || "次回投稿";
      fallbackRequest = {
        task: {
          id: `fallback-next-post-${input.nowMs}`,
          type: postType,
          title: "次回投稿の下書きを準備する",
          description: prompt,
          recommendedTime: "今日中",
          reason: "本日の投稿予定がないため、今週の予定から次回投稿の準備を提案",
          priority: "medium",
        },
        postType,
        prompt,
      };
    }
  }

  const tomorrowRequests: TomorrowPreparationAIGenerationRequest[] = [];
  if (weeklyPlanContent) {
    const [todayYear, todayMonth, todayDay] = input.localDate.split("-").map(Number);
    const todayLocal = new Date(todayYear, todayMonth - 1, todayDay);
    const tomorrow = new Date(todayLocal);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDayName = ["日", "月", "火", "水", "木", "金", "土"][tomorrow.getDay()];

    const tomorrowFeedPosts = weeklyPlanContent.feedPosts.filter(
      (post) => normalizeDayLabel(post.day || "") === tomorrowDayName
    );

    for (const post of tomorrowFeedPosts) {
      const postType = toPostType(post.type || "feed");
      const postTitle = post.title || post.content || "";
      tomorrowRequests.push({
        type: postType,
        description: postTitle,
        prompt: postTitle,
        preparation: `明日の${postType === "feed" ? "フィード" : postType === "reel" ? "リール" : "ストーリーズ"}投稿の準備をしましょう。投稿文とハッシュタグを確認してください。`,
      });
    }
  }

  return {
    baseTasks,
    aiRequests,
    tomorrowRequests,
    fallbackRequest,
    regionNameForHashtag,
    planDataForGeneration,
  };
}
