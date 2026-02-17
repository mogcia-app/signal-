import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { getLocalDate } from "@/lib/utils/timezone";
import { logger } from "@/lib/logger";
import { HomeDashboardRepository } from "@/repositories/home-dashboard-repository";
import type { TodayTasksCacheEntry } from "@/repositories/types";
import {
  createScheduledPostTasks,
  deriveTodayTasksFromPlan,
  filterTodayScheduledPosts,
  sortTasksByPriority,
  type TodayTask,
} from "@/domain/plan/usecases/derive-today-tasks";
import { canGenerateTodayTaskAiForUid, generatePostContent } from "./ai-content";

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "home-today-tasks", limit: 60, windowSeconds: 60 },
      auditEventName: "home_today_tasks_access",
    });

    const user = await getUserProfile(uid);
    const currentPlan = await HomeDashboardRepository.fetchActivePlanDocument(user?.activePlanId || null);

    const timezoneForPlan =
      currentPlan && typeof currentPlan.timezone === "string" && currentPlan.timezone.trim().length > 0
        ? currentPlan.timezone
        : "Asia/Tokyo";
    const localDateForPlan = getLocalDate(timezoneForPlan);

    const cached = await HomeDashboardRepository.getTodayTasksCache(uid, localDateForPlan);
    if (cached) {
      const samePlan = (cached.activePlanId || null) === (user?.activePlanId || null);
      if (samePlan && cached.data) {
        return NextResponse.json({ success: true, data: cached.data });
      }
    }

    const canGenerateTodayTaskAi = canGenerateTodayTaskAiForUid(uid);
    const requestOrigin = request.nextUrl.origin;
    const requestCookie = request.headers.get("cookie") || "";

    const scheduledPosts = await HomeDashboardRepository.fetchScheduledPosts(uid);
    const todayScheduledPosts = filterTodayScheduledPosts(scheduledPosts, localDateForPlan, timezoneForPlan);

    const tasks: TodayTask[] = [];
    let regionNameForHashtag = "";
    let planDataForGeneration: ReturnType<typeof deriveTodayTasksFromPlan>["planDataForGeneration"] | undefined;
    let tomorrowRequests: ReturnType<typeof deriveTodayTasksFromPlan>["tomorrowRequests"] = [];
    let fallbackRequest: ReturnType<typeof deriveTodayTasksFromPlan>["fallbackRequest"] = null;

    if (currentPlan) {
      const derived = deriveTodayTasksFromPlan({
        currentPlan,
        localDate: localDateForPlan,
        timezone: timezoneForPlan,
        scheduledPosts: todayScheduledPosts,
        nowMs: Date.now(),
      });

      regionNameForHashtag = derived.regionNameForHashtag;
      planDataForGeneration = derived.planDataForGeneration;
      tomorrowRequests = derived.tomorrowRequests;
      fallbackRequest = derived.fallbackRequest;

      const aiByTaskId = new Map(
        derived.aiRequests.map((requestItem) => [requestItem.taskId, requestItem] as const)
      );

      for (const task of derived.baseTasks) {
        const aiRequest = aiByTaskId.get(task.id);
        if (aiRequest && canGenerateTodayTaskAi) {
          const generated = await generatePostContent(aiRequest.prompt, aiRequest.postType, user, {
            brandName: user?.name,
            regionName: regionNameForHashtag,
            origin: requestOrigin,
            cookie: requestCookie,
            planData: planDataForGeneration,
          });

          tasks.push({
            ...task,
            ...(generated.content ? { content: generated.content } : {}),
            ...(generated.hashtags.length > 0 ? { hashtags: generated.hashtags } : {}),
          });
          continue;
        }

        tasks.push(task);
      }
    }

    tasks.push(...createScheduledPostTasks(todayScheduledPosts));

    const postsNeedingReplyCount = await HomeDashboardRepository.countRecentPostsNeedingReply(uid, 7);
    if (postsNeedingReplyCount > 0) {
      tasks.push({
        id: `comments-${Date.now()}`,
        type: "comment",
        title: "コメントに返信する",
        description: `${postsNeedingReplyCount}件のコメントに返信が必要です`,
        count: postsNeedingReplyCount,
        priority: "medium",
      });
    }

    const sortedTasks = sortTasksByPriority(tasks);

    const hasPostingTask = sortedTasks.some(
      (task) => task.type === "feed" || task.type === "reel" || task.type === "story"
    );

    if (canGenerateTodayTaskAi && !hasPostingTask && fallbackRequest) {
      const generated = await generatePostContent(fallbackRequest.prompt, fallbackRequest.postType, user, {
        brandName: user?.name,
        regionName: regionNameForHashtag,
        origin: requestOrigin,
        cookie: requestCookie,
        planData: planDataForGeneration,
      });

      sortedTasks.push({
        ...fallbackRequest.task,
        ...(generated.content ? { content: generated.content } : {}),
        ...(generated.hashtags.length > 0 ? { hashtags: generated.hashtags } : {}),
      });
    }

    const hasGeneratedPostTask = sortedTasks.some(
      (task) => (task.type === "feed" || task.type === "reel" || task.type === "story") && !!task.content
    );
    const filteredTasks = hasGeneratedPostTask ? sortedTasks.filter((task) => task.type !== "comment") : sortedTasks;

    const tomorrowPreparations: Array<{
      type: "feed" | "reel" | "story";
      description: string;
      content?: string;
      hashtags?: string[];
      preparation: string;
    }> = [];

    for (const requestItem of tomorrowRequests) {
      const generated = await generatePostContent(requestItem.prompt, requestItem.type, user, {
        brandName: user?.name,
        regionName: regionNameForHashtag,
        origin: requestOrigin,
        cookie: requestCookie,
        planData: planDataForGeneration,
      });

      tomorrowPreparations.push({
        type: requestItem.type,
        description: requestItem.description,
        content: generated.content,
        hashtags: generated.hashtags,
        preparation: requestItem.preparation,
      });
    }

    const responseData = {
      tasks: filteredTasks,
      tomorrowPreparations,
      planExists: !!currentPlan,
      totalTasks: filteredTasks.length,
    };

    try {
      await HomeDashboardRepository.setTodayTasksCache({
        uid,
        localDate: localDateForPlan,
        timezone: timezoneForPlan,
        activePlanId: user?.activePlanId || null,
        data: responseData as NonNullable<TodayTasksCacheEntry["data"]>,
      });
    } catch (cacheError) {
      console.error("Today tasks cache save error:", cacheError);
    }

    return NextResponse.json({ success: true, data: responseData });
  } catch (error) {
    logger.error("Today tasks API error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
