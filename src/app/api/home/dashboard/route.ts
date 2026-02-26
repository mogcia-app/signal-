import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/repositories/collections";
import { HomeDashboardRepository } from "@/repositories/home-dashboard-repository";

const WEEK_DAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;
type WeekDay = (typeof WEEK_DAYS)[number];

function addOneMonth(baseDate: Date): Date {
  const next = new Date(baseDate);
  next.setMonth(next.getMonth() + 1);
  return next;
}

function isPlanComplete(formData: Record<string, unknown>, planStartDate: Date | null): boolean {
  const operationPurpose = String(formData.operationPurpose || "").trim();
  const parsedStartDate =
    typeof formData.startDate === "string" ? new Date(formData.startDate) : planStartDate;
  const hasValidStartDate = Boolean(parsedStartDate) && !Number.isNaN((parsedStartDate as Date).getTime());
  const feedDays = Array.isArray(formData.feedDays) ? formData.feedDays : [];
  const reelDays = Array.isArray(formData.reelDays) ? formData.reelDays : [];
  const storyDays = Array.isArray(formData.storyDays) ? formData.storyDays : [];
  const customIncrease = Number(formData.customTargetFollowers || 0);
  const targetFollowers = Number(formData.targetFollowers || 0);
  const currentFollowers = Number(formData.currentFollowers || 0);
  const effectiveIncrease = customIncrease > 0 ? customIncrease : targetFollowers - currentFollowers;

  return (
    operationPurpose.length > 0 &&
    hasValidStartDate &&
    feedDays.length > 0 &&
    reelDays.length > 0 &&
    storyDays.length > 0 &&
    Number.isFinite(effectiveIncrease) &&
    effectiveIncrease > 0
  );
}

function parseLegacyDayList(value: string): WeekDay[] {
  const normalized = value.replace(/（.*?）/g, "").trim();
  if (!normalized || normalized === "なし") {return [];}
  return normalized
    .split("・")
    .map((day) => day.trim())
    .filter((day): day is WeekDay => WEEK_DAYS.includes(day as WeekDay));
}

function extractLegacyScheduleFromTargetAudience(value: unknown): {
  cleanText: string;
  feedDays: WeekDay[];
  reelDays: WeekDay[];
  storyDays: WeekDay[];
} {
  const raw = String(value || "").trim();
  if (!raw) {return { cleanText: "", feedDays: [], reelDays: [], storyDays: [] };}

  const slashParts = raw
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const pipeParts = raw
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const parts = slashParts.length > pipeParts.length ? slashParts : pipeParts;
  const scheduleParts = parts.filter(
    (segment) => segment.includes("フィード:") || segment.includes("リール:") || segment.includes("ストーリーズ:")
  );
  const scheduleSource = scheduleParts.join(" / ") || raw;

  const feedMatch = scheduleSource.match(/フィード:\s*([^/|]+)/);
  const reelMatch = scheduleSource.match(/リール:\s*([^/|]+)/);
  const storyMatch = scheduleSource.match(/ストーリーズ:\s*([^/|]+)/);

  const cleanText = parts
    .filter(
      (segment) =>
        !segment.includes("選択曜日") &&
        !segment.includes("フィード:") &&
        !segment.includes("リール:") &&
        !segment.includes("ストーリーズ:")
    )
    .join(" ")
    .trim();

  return {
    cleanText,
    feedDays: parseLegacyDayList(feedMatch?.[1] || ""),
    reelDays: parseLegacyDayList(reelMatch?.[1] || ""),
    storyDays: parseLegacyDayList(storyMatch?.[1] || ""),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "home-dashboard", limit: 60, windowSeconds: 60 },
      auditEventName: "home_dashboard_access",
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfWeek);
    endOfLastWeek.setDate(startOfWeek.getDate() - 1);
    endOfLastWeek.setHours(23, 59, 59, 999);

    const user = await getUserProfile(uid);
    const { analytics, posts, followerCounts, activePlan } = await HomeDashboardRepository.fetchDashboardData(
      uid,
      user?.activePlanId || null
    );

    const thisWeekAnalytics = analytics.filter((a) => a.publishedAt >= startOfWeek && a.publishedAt <= endOfWeek);
    const lastWeekAnalytics = analytics.filter(
      (a) => a.publishedAt >= startOfLastWeek && a.publishedAt <= endOfLastWeek
    );

    const thisWeekFollowerIncreaseFromPosts = thisWeekAnalytics.reduce(
      (sum, a) => sum + (a.followerIncrease || 0),
      0
    );
    const lastWeekFollowerIncreaseFromPosts = lastWeekAnalytics.reduce(
      (sum, a) => sum + (a.followerIncrease || 0),
      0
    );

    let thisWeekFollowerIncreaseFromOther = 0;
    let lastWeekFollowerIncreaseFromOther = 0;

    if (followerCounts.length >= 1) {
      const monthFollowerIncreaseFromOther = followerCounts[0].followers || 0;
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysSinceMonthStart =
        Math.floor((today.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const weeksSinceMonthStart = Math.ceil(daysSinceMonthStart / 7);
      if (weeksSinceMonthStart > 0) {
        thisWeekFollowerIncreaseFromOther = Math.round(monthFollowerIncreaseFromOther / weeksSinceMonthStart);
      }

      if (followerCounts.length >= 2) {
        const previousMonthFollowerIncreaseFromOther = followerCounts[1].followers || 0;
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const daysInPreviousMonth = previousMonthEnd.getDate();
        const weeksInPreviousMonth = Math.ceil(daysInPreviousMonth / 7);
        if (weeksInPreviousMonth > 0) {
          lastWeekFollowerIncreaseFromOther = Math.round(
            previousMonthFollowerIncreaseFromOther / weeksInPreviousMonth
          );
        }
      }
    }

    const thisWeekKPIs = {
      likes: thisWeekAnalytics.reduce((sum, a) => sum + (a.likes || 0), 0),
      comments: thisWeekAnalytics.reduce((sum, a) => sum + (a.comments || 0), 0),
      followers: thisWeekFollowerIncreaseFromPosts + thisWeekFollowerIncreaseFromOther,
    };

    const lastWeekKPIs = {
      likes: lastWeekAnalytics.reduce((sum, a) => sum + (a.likes || 0), 0),
      comments: lastWeekAnalytics.reduce((sum, a) => sum + (a.comments || 0), 0),
      followers: lastWeekFollowerIncreaseFromPosts + lastWeekFollowerIncreaseFromOther,
    };

    const todayTasks = posts
      .filter((post) => {
        if (!post.scheduledDate) {
          return false;
        }
        return (
          post.scheduledDate.getFullYear() === today.getFullYear() &&
          post.scheduledDate.getMonth() === today.getMonth() &&
          post.scheduledDate.getDate() === today.getDate()
        );
      })
      .map((post) => ({
        id: post.id,
        type: post.postType,
        title: post.title,
        content: post.content,
        scheduledTime: post.scheduledDate,
      }));

    const weeklySchedule = posts
      .filter((post) => post.scheduledDate && post.scheduledDate >= startOfWeek && post.scheduledDate <= endOfWeek)
      .map((post) => ({
        id: post.id,
        date: post.scheduledDate,
        type: post.postType,
        title: post.title,
        scheduledTime: post.scheduledDate,
      }))
      .sort((a, b) => {
        if (!a.date || !b.date) {
          return 0;
        }
        return a.date.getTime() - b.date.getTime();
      });

    let currentPlan = null;

    if (activePlan) {
      const formData = { ...activePlan.formData };
      let planStartDate: Date | null = null;

      if (typeof formData.startDate === "string") {
        const parsed = new Date(formData.startDate);
        planStartDate = Number.isNaN(parsed.getTime()) ? null : parsed;
      }

      if (!planStartDate) {
        planStartDate = activePlan.startDate || activePlan.createdAt || new Date();
      }

      const completePlan = isPlanComplete(formData, planStartDate);
      const planExpiryDate = addOneMonth(planStartDate);
      if (!completePlan || today >= planExpiryDate) {
        try {
          const nextPlanStatus = completePlan ? "expired" : "invalid";
          await Promise.all([
            adminDb.collection("users").doc(uid).update({
              activePlanId: null,
              updatedAt: new Date(),
            }),
            adminDb.collection(COLLECTIONS.PLANS).doc(activePlan.id).update({
              status: nextPlanStatus,
              updatedAt: new Date(),
            }),
          ]);
        } catch (planResetError) {
          console.error("Home dashboard plan reset failed:", planResetError);
        }
      } else {

        const parsedFeedDays = Array.isArray(formData.feedDays) ? formData.feedDays : [];
        const parsedReelDays = Array.isArray(formData.reelDays) ? formData.reelDays : [];
        const parsedStoryDays = Array.isArray(formData.storyDays) ? formData.storyDays : [];
        const targetAudienceValue = typeof formData.targetAudience === "string" ? formData.targetAudience : "";
        const looksLegacyTargetAudience =
          targetAudienceValue.includes("選択曜日") ||
          targetAudienceValue.includes("フィード:") ||
          targetAudienceValue.includes("リール:") ||
          targetAudienceValue.includes("ストーリーズ:");

        if ((parsedFeedDays.length === 0 || parsedReelDays.length === 0 || parsedStoryDays.length === 0) && looksLegacyTargetAudience) {
          const legacy = extractLegacyScheduleFromTargetAudience(targetAudienceValue);
          const nextFeedDays = parsedFeedDays.length > 0 ? parsedFeedDays : legacy.feedDays;
          const nextReelDays = parsedReelDays.length > 0 ? parsedReelDays : legacy.reelDays;
          const nextStoryDays = parsedStoryDays.length > 0 ? parsedStoryDays : legacy.storyDays;
          const nextTargetAudience = legacy.cleanText;

          formData.feedDays = nextFeedDays;
          formData.reelDays = nextReelDays;
          formData.storyDays = nextStoryDays;
          formData.targetAudience = nextTargetAudience;

          try {
            await adminDb.collection(COLLECTIONS.PLANS).doc(activePlan.id).update({
              "formData.feedDays": nextFeedDays,
              "formData.reelDays": nextReelDays,
              "formData.storyDays": nextStoryDays,
              "formData.targetAudience": nextTargetAudience,
            });
          } catch (migrationError) {
            console.error("Home dashboard legacy plan migration failed:", migrationError);
          }
        }

        currentPlan = {
          id: activePlan.id,
          title: activePlan.title,
          strategy: activePlan.generatedStrategy,
          aiGenerationStatus: activePlan.aiGenerationStatus || "completed",
          aiGenerationCompletedAt: activePlan.aiGenerationCompletedAt || null,
          formData,
          operationPurpose: typeof formData.operationPurpose === "string" ? formData.operationPurpose : "",
          targetFollowers:
            typeof formData.targetFollowers === "number"
              ? formData.targetFollowers
              : Number(formData.targetFollowers || 0),
          currentFollowers:
            typeof formData.currentFollowers === "number"
              ? formData.currentFollowers
              : Number(formData.currentFollowers || 0),
          targetFollowerOption:
            typeof formData.targetFollowerOption === "string" ? formData.targetFollowerOption : "",
          targetFollowerIncrease:
            typeof formData.customTargetFollowers === "string"
              ? Number(formData.customTargetFollowers || 0)
              : Number(formData.customTargetFollowers || 0),
          customTargetFollowers:
            typeof formData.customTargetFollowers === "string" ? formData.customTargetFollowers : "",
          weeklyPosts: typeof formData.weeklyPosts === "string" ? formData.weeklyPosts : "",
          reelCapability: typeof formData.reelCapability === "string" ? formData.reelCapability : "",
          storyFrequency: typeof formData.storyFrequency === "string" ? formData.storyFrequency : "",
          feedDays: Array.isArray(formData.feedDays) ? formData.feedDays : [],
          reelDays: Array.isArray(formData.reelDays) ? formData.reelDays : [],
          storyDays: Array.isArray(formData.storyDays) ? formData.storyDays : [],
          targetAudience: typeof formData.targetAudience === "string" ? formData.targetAudience : "",
          postingTime: typeof formData.postingTime === "string" ? formData.postingTime : "",
          regionRestriction: typeof formData.regionRestriction === "string" ? formData.regionRestriction : "",
          regionName: typeof formData.regionName === "string" ? formData.regionName : "",
          startDate: planStartDate,
          endDate: activePlan.endDate,
          weeklyTasks: [],
          monthlyGoals: [],
          aiSuggestion: null,
        };
      }
    }

    const monthlyProgress = currentPlan
      ? {
          strategy: "運用計画実行中",
          progress: 0,
          totalDays: 0,
          completedDays: 0,
        }
      : null;

    return NextResponse.json({
      success: true,
      data: {
        todayTasks,
        weeklyKPIs: {
          thisWeek: thisWeekKPIs,
          lastWeek: lastWeekKPIs,
          changes: {
            likes: thisWeekKPIs.likes - lastWeekKPIs.likes,
            comments: thisWeekKPIs.comments - lastWeekKPIs.comments,
            followers: thisWeekKPIs.followers - lastWeekKPIs.followers,
          },
        },
        weeklySchedule,
        currentPlan,
        monthlyProgress,
        simulationResult: currentPlan ? activePlan?.simulationResult || null : null,
      },
    });
  } catch (error) {
    console.error("Home dashboard error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
