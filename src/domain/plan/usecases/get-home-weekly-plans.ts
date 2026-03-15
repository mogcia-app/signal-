import { PlanEngine } from "@/domain/plan/plan-engine";
import type { PlanInput } from "@/domain/plan/plan-input";
import type { StrategyPlan } from "@/domain/plan/strategy-plan";
import { PlanRepository } from "@/repositories/plan-repository";
import { getUserProfile } from "@/lib/server/user-profile";
import { getCurrentWeekIndex } from "@/lib/plans/weekly-plans";
import { getLocalDate } from "@/lib/utils/timezone";

type DisplayPostType = "feed" | "reel" | "story";

interface SavedPlanData {
  weeklyPlans?: StrategyPlan["weeklyPlans"];
  schedule?: StrategyPlan["schedule"];
  expectedResults?: StrategyPlan["expectedResults"];
  difficulty?: StrategyPlan["difficulty"];
  monthlyGrowthRate?: StrategyPlan["monthlyGrowthRate"];
  features?: StrategyPlan["features"];
  suggestedContentTypes?: StrategyPlan["suggestedContentTypes"];
  startDate?: unknown;
  endDate?: unknown;
}

interface DisplayPost {
  day: string;
  content: string;
  title: string;
  type: DisplayPostType;
  date: string;
  month: number;
  dayNumber: number;
  dayName: string;
  time: string;
  displayText: string;
  sortValue: number;
}

export interface HomeWeeklyPlansData {
  currentWeek: number;
  currentWeekPlan: {
    week: number;
    targetFollowers: number;
    increase: number;
    theme: string;
    feedPosts: Array<Omit<DisplayPost, "sortValue">>;
    storyContent: string[];
  } | null;
  allWeeklyPlans: Array<{
    week: number;
    targetFollowers: number;
    increase: number;
    theme: string;
    feedPosts: Array<{
      day: string;
      content: string;
      title: string;
      type: string;
    }>;
    storyContent: string[];
  }>;
  schedule: StrategyPlan["schedule"];
}

export type HomeWeeklyPlansResult =
  | { kind: "ok"; data: HomeWeeklyPlansData }
  | { kind: "empty" }
  | { kind: "user-profile-not-found" };

function parsePlanDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    const parsed = (value as { toDate: () => Date }).toDate();
    if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return fallback;
}

function buildScheduleTitle(postType: string, rawContent: string, weekTheme: string): string {
  const content = (rawContent || "").replace(/\s+/g, " ").trim().replace(/。$/, "");
  const isGenericReel = content === "" || content === "リール投稿" || content === "リール動画の投稿";

  if (postType === "reel" && isGenericReel) {
    return weekTheme ? `${weekTheme}（リール）` : "リール投稿";
  }
  if (!content) {
    if (postType === "reel") {return "リール投稿";}
    if (postType === "story") {return "ストーリーズ投稿";}
    return "フィード投稿";
  }
  return content.length > 24 ? `${content.slice(0, 24)}…` : content;
}

function weeklyOptionToCount(option: unknown): number {
  if (option === "none") {return 0;}
  if (option === "weekly-1-2") {return 2;}
  if (option === "weekly-3-4") {return 4;}
  if (option === "daily") {return 7;}
  return 0;
}

function buildSavedStrategyPlan(
  uid: string,
  activePlanId: string,
  savedPlanData: SavedPlanData,
  planStartDate: Date,
  planEndDate: Date,
): StrategyPlan | null {
  if (!savedPlanData.weeklyPlans || !savedPlanData.schedule) {
    return null;
  }

  return {
    id: activePlanId,
    planInputId: activePlanId,
    userId: uid,
    snsType: "instagram",
    weeklyPlans: savedPlanData.weeklyPlans,
    schedule: savedPlanData.schedule,
    expectedResults: savedPlanData.expectedResults || {
      monthlyReach: 0,
      engagementRate: "0%",
      profileViews: 0,
      saves: 0,
      newFollowers: 0,
    },
    difficulty: savedPlanData.difficulty || {
      stars: "3",
      label: "中程度",
      industryRange: "標準",
      achievementRate: 50,
    },
    monthlyGrowthRate: savedPlanData.monthlyGrowthRate || "0%",
    features: savedPlanData.features || [],
    suggestedContentTypes: savedPlanData.suggestedContentTypes || [],
    startDate: parsePlanDate(savedPlanData.startDate, planStartDate),
    endDate: parsePlanDate(savedPlanData.endDate, planEndDate),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function buildStrategyPlan(params: {
  uid: string;
  planInput: PlanInput;
  planStartDate: Date;
  planEndDate: Date;
  activePlanId: string | null;
}): Promise<
  | {
      kind: "ok";
      strategyPlan: StrategyPlan;
      savedStrategyPlan: StrategyPlan | null;
      generatedStrategyPlan: StrategyPlan | null;
    }
  | {
      kind: "user-profile-not-found";
    }
> {
  const { uid, planInput, planStartDate, planEndDate, activePlanId } = params;
  let savedStrategyPlan: StrategyPlan | null = null;

  if (activePlanId) {
    const ownedPlan = await PlanRepository.getOwnedPlanDocument(uid, activePlanId);
    const planData = ownedPlan || null;
    if (planData?.planData && typeof planData.planData === "object") {
      savedStrategyPlan = buildSavedStrategyPlan(
        uid,
        activePlanId,
        planData.planData as SavedPlanData,
        planStartDate,
        planEndDate,
      );
      if (savedStrategyPlan) {
        console.log("[Home Weekly Plans] 保存されたweeklyPlansを使用");
      }
    }
  }

  if (savedStrategyPlan) {
    return {
      kind: "ok",
      strategyPlan: savedStrategyPlan,
      savedStrategyPlan,
      generatedStrategyPlan: null,
    };
  }

  console.log("[Home Weekly Plans] 保存されたplanDataがないため、AI生成を実行");
  const lastMonthPerformance = await PlanRepository.getLastMonthPerformance(uid, new Date(planInput.startDate));
  const userProfile = await getUserProfile(uid);
  if (!userProfile) {
    return { kind: "user-profile-not-found" };
  }

  const generatedStrategyPlan = await PlanEngine.buildStrategy(planInput, userProfile, lastMonthPerformance);
  return {
    kind: "ok",
    strategyPlan: generatedStrategyPlan,
    savedStrategyPlan: null,
    generatedStrategyPlan,
  };
}

async function ensureCurrentWeekPlan(params: {
  uid: string;
  activePlanId: string | null;
  planInput: PlanInput;
  strategyPlan: StrategyPlan;
  savedStrategyPlan: StrategyPlan | null;
  generatedStrategyPlan: StrategyPlan | null;
  currentWeek: number;
}): Promise<{ strategyPlan: StrategyPlan; currentWeekPlan: StrategyPlan["weeklyPlans"][number] | null }> {
  const { uid, activePlanId, planInput, savedStrategyPlan } = params;
  let { strategyPlan, generatedStrategyPlan } = params;
  const { currentWeek } = params;
  let currentWeekPlan = strategyPlan.weeklyPlans.find((wp) => wp.week === currentWeek) || null;

  if (!currentWeekPlan) {
    if (!generatedStrategyPlan) {
      const userProfile = await getUserProfile(uid);
      if (!userProfile) {
        return { strategyPlan, currentWeekPlan: null };
      }
      const lastMonthPerformance = await PlanRepository.getLastMonthPerformance(uid, new Date(planInput.startDate));
      generatedStrategyPlan = await PlanEngine.buildStrategy(planInput, userProfile, lastMonthPerformance);
    }

    const generatedCurrentWeekPlan =
      generatedStrategyPlan.weeklyPlans.find((wp) => wp.week === currentWeek) || null;

    if (!generatedCurrentWeekPlan) {
      const fallbackCurrentWeekPlan = generatedStrategyPlan.weeklyPlans.slice().sort((a, b) => b.week - a.week)[0];
      if (!fallbackCurrentWeekPlan) {
        console.log("[Home Weekly Plans] 現在の週の計画が見つかりません:", {
          currentWeek,
          availableWeeks: strategyPlan.weeklyPlans.map((wp) => wp.week),
        });
        return { strategyPlan, currentWeekPlan: null };
      }

      currentWeekPlan = fallbackCurrentWeekPlan;
      strategyPlan = {
        ...strategyPlan,
        weeklyPlans: [
          ...strategyPlan.weeklyPlans.filter((wp) => wp.week !== fallbackCurrentWeekPlan.week),
          fallbackCurrentWeekPlan,
        ].sort((a, b) => a.week - b.week),
        updatedAt: new Date(),
      };
    } else {
      strategyPlan = {
        ...strategyPlan,
        weeklyPlans: [
          ...strategyPlan.weeklyPlans.filter((wp) => wp.week !== currentWeek),
          generatedCurrentWeekPlan,
        ].sort((a, b) => a.week - b.week),
        updatedAt: new Date(),
      };
      currentWeekPlan = generatedCurrentWeekPlan;
    }

    if (activePlanId) {
      await PlanRepository.saveStrategyPlanData({ userId: uid, planId: activePlanId, strategyPlan });
    }
  }

  if (!savedStrategyPlan && currentWeekPlan && activePlanId) {
    strategyPlan = {
      ...strategyPlan,
      weeklyPlans: [currentWeekPlan],
      updatedAt: new Date(),
    };
    await PlanRepository.saveStrategyPlanData({ userId: uid, planId: activePlanId, strategyPlan });
  }

  if (activePlanId && strategyPlan.weeklyPlans.some((wp) => wp.week > currentWeek)) {
    strategyPlan = {
      ...strategyPlan,
      weeklyPlans: strategyPlan.weeklyPlans.filter((wp) => wp.week <= currentWeek),
      updatedAt: new Date(),
    };
    await PlanRepository.saveStrategyPlanData({ userId: uid, planId: activePlanId, strategyPlan });
  }

  return { strategyPlan, currentWeekPlan };
}

function buildAllWeeklyPlans(strategyPlan: StrategyPlan): HomeWeeklyPlansData["allWeeklyPlans"] {
  return strategyPlan.weeklyPlans.map((wp) => ({
    week: wp.week,
    targetFollowers: wp.targetFollowers,
    increase: wp.increase,
    theme: wp.theme,
    feedPosts: wp.feedPosts.map((post) => ({
      day: post.day,
      content: post.content,
      title: buildScheduleTitle(post.type || "feed", post.content || "", wp.theme || ""),
      type: post.type || "feed",
    })),
    storyContent: Array.isArray(wp.storyContent) ? wp.storyContent : [],
  }));
}

function buildDisplayFeedPosts(params: {
  currentWeekPlan: StrategyPlan["weeklyPlans"][number];
  strategyPlan: StrategyPlan;
  planInput: PlanInput;
}): Array<Omit<DisplayPost, "sortValue">> {
  const { currentWeekPlan, strategyPlan, planInput } = params;
  const strategyStartDate = new Date(strategyPlan.startDate);
  const scheduleBaseDate = new Date(strategyStartDate);
  scheduleBaseDate.setDate(scheduleBaseDate.getDate() + 1);
  const planStartDayOfWeek = scheduleBaseDate.getDay();
  const currentWeekStartDate = new Date(scheduleBaseDate);
  currentWeekStartDate.setDate(scheduleBaseDate.getDate() + (currentWeekPlan.week - 1) * 7);

  const dayNameToIndex: Record<string, number> = {
    日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6,
  };

  const getPostDate = (dayName: string) => {
    if (!dayName) {
      return { date: "", month: 0, day: 0, dayName: "", sortValue: Number.MAX_SAFE_INTEGER };
    }

    const dayNameOnly = dayName.replace("曜", "").replace("曜日", "").trim();
    const dayIndex = dayNameToIndex[dayNameOnly] ?? 0;
    let dayOffset = 0;
    if (dayIndex >= planStartDayOfWeek) {
      dayOffset = dayIndex - planStartDayOfWeek;
    } else {
      dayOffset = (7 - planStartDayOfWeek) + dayIndex;
    }

    const postDate = new Date(currentWeekStartDate);
    postDate.setDate(currentWeekStartDate.getDate() + dayOffset);
    return {
      date: `${postDate.getMonth() + 1}/${postDate.getDate()}`,
      month: postDate.getMonth() + 1,
      day: postDate.getDate(),
      dayName: dayNameOnly,
      sortValue: postDate.getTime(),
    };
  };

  const getPostTime = (dayName: string, postType: string): string => {
    if (!dayName) {
      return postType === "story" ? "11:00" : "13:00";
    }

    const dayNameOnly = dayName.replace("曜", "").replace("曜日", "").trim();
    if (postType === "story") {
      const storyDay = strategyPlan.schedule.storyDays.find((sd) => {
        if (!sd.day) {return false;}
        return sd.day.replace("曜", "").replace("曜日", "").trim() === dayNameOnly;
      });
      return storyDay?.time || "11:00";
    }

    const postingDay = strategyPlan.schedule.postingDays.find((pd) => {
      if (!pd.day) {return false;}
      const normalized = pd.day.replace("曜", "").replace("曜日", "").trim();
      return normalized === dayNameOnly && (pd.type === postType || (!pd.type && postType === "feed"));
    });
    return postingDay?.time || "13:00";
  };

  const storyContentList = Array.isArray(currentWeekPlan.storyContent) ? currentWeekPlan.storyContent : [];
  const storyPosts = strategyPlan.schedule.storyDays.map((storyDay, index) => {
    const rawStory = storyContentList[index] || "";
    const parsedStoryTitle = rawStory.includes(":")
      ? rawStory.split(":").slice(1).join(":").trim()
      : rawStory.trim();
    return {
      day: storyDay.day || "",
      content: parsedStoryTitle || "ストーリーズ投稿",
      type: "story",
    };
  });

  const mapped = [...currentWeekPlan.feedPosts, ...storyPosts].map((post, index) => {
    const postType = (post.type || "feed") as DisplayPostType;
    let dayName = post.day;
    if (!dayName) {
      dayName = ["月", "火", "水", "木", "金", "土", "日"][index % 7];
    }
    const postDate = getPostDate(dayName);
    const postTime = getPostTime(dayName, postType);
    const typeLabel = postType === "feed" ? "フィード" : postType === "reel" ? "リール" : "ストーリーズ";
    const title = buildScheduleTitle(postType, post.content || "", currentWeekPlan.theme || "");
    return {
      day: dayName,
      content: post.content || "",
      title,
      type: postType,
      date: postDate.date || "",
      month: postDate.month || 0,
      dayNumber: postDate.day || 0,
      dayName: postDate.dayName || "",
      time: postTime || "13:00",
      displayText: `[${typeLabel}] ${postDate.date || ""}（${postDate.dayName || ""}）${postTime || "13:00"} ${title}`,
      sortValue: postDate.sortValue,
    };
  });

  const genericTitles = ["フィード投稿", "リール投稿", "ストーリーズ投稿"];
  const cleaned = mapped
    .sort((a, b) => a.sortValue - b.sortValue)
    .filter((item, _, arr) => {
      const isGeneric = genericTitles.includes(item.title || "");
      if (!isGeneric) {return true;}
      return !arr.some(
        (other) =>
          other !== item &&
          other.day === item.day &&
          other.type === item.type &&
          !genericTitles.includes(other.title || ""),
      );
    });

  const expectedFeedCount = weeklyOptionToCount(planInput.weeklyPosts);
  const expectedReelCount = weeklyOptionToCount(planInput.reelCapability);
  const feedNow = cleaned.filter((p) => p.type === "feed").length;
  const reelNow = cleaned.filter((p) => p.type === "reel").length;
  const neededFeed = Math.max(0, expectedFeedCount - feedNow);
  const neededReel = Math.max(0, expectedReelCount - reelNow);

  const usedKeys = new Set(cleaned.map((p) => `${p.type}|${p.day}`));
  const createFallback = (type: "feed" | "reel", idx: number): DisplayPost => {
    const dayFromSchedule = strategyPlan.schedule.postingDays.find((pd) => {
      const pdType = (pd.type || "feed") as "feed" | "reel";
      return pdType === type && !usedKeys.has(`${type}|${pd.day || ""}`);
    })?.day;
    const day = dayFromSchedule || ["月", "火", "水", "木", "金", "土", "日"][(idx + (type === "reel" ? 2 : 0)) % 7] + "曜";
    usedKeys.add(`${type}|${day}`);
    const postDate = getPostDate(day);
    const postTime = getPostTime(day, type);
    const typeLabel = type === "feed" ? "フィード" : "リール";
    const title = buildScheduleTitle(type, `${currentWeekPlan.theme || "今週のテーマ"}（${typeLabel}）`, currentWeekPlan.theme || "");
    return {
      day,
      content: title,
      title,
      type,
      date: postDate.date || "",
      month: postDate.month || 0,
      dayNumber: postDate.day || 0,
      dayName: postDate.dayName || "",
      time: postTime || "13:00",
      displayText: `[${typeLabel}] ${postDate.date || ""}（${postDate.dayName || ""}）${postTime || "13:00"} ${title}`,
      sortValue: postDate.sortValue,
    };
  };

  const extras = [
    ...Array.from({ length: neededFeed }).map((_, i) => createFallback("feed", i)),
    ...Array.from({ length: neededReel }).map((_, i) => createFallback("reel", i)),
  ];

  return [...cleaned, ...extras]
    .sort((a, b) => a.sortValue - b.sortValue)
    .map(({ sortValue: _sortValue, ...rest }) => rest);
}

export async function getHomeWeeklyPlans(uid: string): Promise<HomeWeeklyPlansResult> {
  const planInput = await PlanRepository.getActivePlanInput(uid, "instagram");
  if (!planInput) {
    return { kind: "empty" };
  }

  const planStartDate = new Date(planInput.startDate);
  const planEndDate = new Date(planStartDate);
  planEndDate.setMonth(planEndDate.getMonth() + 1);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  planStartDate.setHours(0, 0, 0, 0);
  planEndDate.setHours(23, 59, 59, 999);
  if (today < planStartDate || today > planEndDate) {
    console.log("[Home Weekly Plans] 計画の期間外:", {
      today: today.toISOString().split("T")[0],
      planStartDate: planStartDate.toISOString().split("T")[0],
      planEndDate: planEndDate.toISOString().split("T")[0],
    });
  }

  const activePlanId = await PlanRepository.getActivePlanId(uid);
  const strategyBuild = await buildStrategyPlan({
    uid,
    planInput,
    planStartDate,
    planEndDate,
    activePlanId,
  });

  if (strategyBuild.kind !== "ok") {
    return { kind: "user-profile-not-found" };
  }

  let { strategyPlan } = strategyBuild;
  const { savedStrategyPlan, generatedStrategyPlan } = strategyBuild;

  console.log("[Home Weekly Plans] StrategyPlan生成後の検証:", {
    weeklyPlansCount: strategyPlan.weeklyPlans.length,
    weeklyPlans: strategyPlan.weeklyPlans.map((wp) => ({
      week: wp.week,
      feedPostsCount: wp.feedPosts.length,
      feedPosts: wp.feedPosts.map((p) => ({
        hasDay: !!p.day,
        day: p.day,
        content: p.content?.substring(0, 50),
        type: p.type,
      })),
    })),
    postingDays: strategyPlan.schedule.postingDays.map((pd) => ({
      day: pd.day,
      time: pd.time,
      type: pd.type,
    })),
  });

  const timezone = "Asia/Tokyo";
  const localDate = getLocalDate(timezone);
  let weekIndex = getCurrentWeekIndex(strategyPlan.startDate, localDate, timezone);
  if (!Number.isFinite(weekIndex)) {
    const fallbackStartDate = parsePlanDate(strategyPlan.startDate, planStartDate);
    weekIndex = getCurrentWeekIndex(fallbackStartDate, localDate, timezone);
  }

  const requestedWeek = weekIndex + 1;
  const availableWeeks = strategyPlan.weeklyPlans
    .map((wp) => wp.week)
    .filter((w) => Number.isFinite(w))
    .sort((a, b) => a - b);
  const currentWeek = Math.min(
    Math.max(requestedWeek, availableWeeks[0] || 1),
    availableWeeks[availableWeeks.length - 1] || 1,
  );

  if (requestedWeek !== currentWeek) {
    console.log("[Home Weekly Plans] 週番号をフォールバック:", {
      requestedWeek,
      currentWeek,
      availableWeeks,
    });
  }

  const ensured = await ensureCurrentWeekPlan({
    uid,
    activePlanId,
    planInput,
    strategyPlan,
    savedStrategyPlan,
    generatedStrategyPlan,
    currentWeek,
  });
  strategyPlan = ensured.strategyPlan;
  const currentWeekPlan = ensured.currentWeekPlan;

  if (!currentWeekPlan) {
    return { kind: "empty" };
  }

  return {
    kind: "ok",
    data: {
      currentWeek,
      currentWeekPlan: {
        week: currentWeekPlan.week,
        targetFollowers: currentWeekPlan.targetFollowers,
        increase: currentWeekPlan.increase,
        theme: currentWeekPlan.theme,
        feedPosts: buildDisplayFeedPosts({ currentWeekPlan, strategyPlan, planInput }),
        storyContent: Array.isArray(currentWeekPlan.storyContent) ? currentWeekPlan.storyContent : [],
      },
      allWeeklyPlans: buildAllWeeklyPlans(strategyPlan),
      schedule: {
        weeklyFrequency: strategyPlan.schedule.weeklyFrequency,
        postingDays: strategyPlan.schedule.postingDays,
        storyDays: strategyPlan.schedule.storyDays,
        feedPosts: strategyPlan.schedule.feedPosts,
        reelPosts: strategyPlan.schedule.reelPosts,
        storyPosts: strategyPlan.schedule.storyPosts,
      },
    },
  };
}
