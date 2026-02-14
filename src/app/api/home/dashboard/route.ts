import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { HomeDashboardRepository } from "@/repositories/home-dashboard-repository";

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
      const formData = activePlan.formData;
      let planStartDate: Date | null = null;

      if (typeof formData.startDate === "string") {
        const parsed = new Date(formData.startDate);
        planStartDate = Number.isNaN(parsed.getTime()) ? null : parsed;
      }

      if (!planStartDate) {
        planStartDate = activePlan.startDate || activePlan.createdAt || new Date();
      }

      currentPlan = {
        id: activePlan.id,
        title: activePlan.title,
        strategy: activePlan.generatedStrategy,
        startDate: planStartDate,
        endDate: activePlan.endDate,
        weeklyTasks: [],
        monthlyGoals: [],
        aiSuggestion: null,
      };
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
        simulationResult: activePlan?.simulationResult || null,
      },
    });
  } catch (error) {
    console.error("Home dashboard error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
