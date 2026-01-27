import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "home-dashboard", limit: 60, windowSeconds: 60 },
      auditEventName: "home_dashboard_access",
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // 今週の開始日と終了日を計算（日曜日始まり）
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    // 先週の期間
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfWeek);
    endOfLastWeek.setDate(startOfWeek.getDate() - 1);
    endOfLastWeek.setHours(23, 59, 59, 999);

    // 今月の開始日と終了日
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 並列でデータを取得
    const [analyticsSnapshot, postsSnapshot, plansSnapshot, followerCountsSnapshot] = await Promise.all([
      adminDb.collection("analytics").where("userId", "==", uid).get(),
      adminDb.collection("posts").where("userId", "==", uid).get(),
      adminDb.collection("plans")
        .where("userId", "==", uid)
        .where("snsType", "==", "instagram")
        .where("status", "==", "active")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get(),
      adminDb.collection("followerCounts")
        .where("userId", "==", uid)
        .orderBy("date", "desc")
        .limit(2)
        .get(),
    ]);

    const analytics = analyticsSnapshot.docs.map((doc) => {
      const data = doc.data();
      const publishedAt = data.publishedAt?.toDate?.() || data.publishedAt;
      return {
        ...data,
        likes: data.likes || 0,
        comments: data.comments || 0,
        shares: data.shares || 0,
        reach: data.reach || 0,
        saves: data.saves || 0,
        followers: data.followers || 0,
        publishedAt: publishedAt instanceof Date ? publishedAt : new Date(publishedAt),
      };
    });

    const posts = postsSnapshot.docs.map((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || data.createdAt;
      const scheduledDate = data.scheduledDate?.toDate?.() || data.scheduledDate;
      return {
        ...data,
        id: doc.id,
        postType: data.postType || "feed",
        title: data.title || "",
        content: data.content || "",
        createdAt: createdAt instanceof Date ? createdAt : new Date(createdAt),
        scheduledDate: scheduledDate instanceof Date ? scheduledDate : (scheduledDate ? new Date(scheduledDate) : null),
      };
    });

    // 今週の分析データ
    const thisWeekAnalytics = analytics.filter((a) => {
      const date = a.publishedAt instanceof Date ? a.publishedAt : new Date(a.publishedAt);
      return date >= startOfWeek && date <= endOfWeek;
    });

    // 先週の分析データ
    const lastWeekAnalytics = analytics.filter((a) => {
      const date = a.publishedAt instanceof Date ? a.publishedAt : new Date(a.publishedAt);
      return date >= startOfLastWeek && date <= endOfLastWeek;
    });

    // 今週のKPI計算
    const thisWeekKPIs = {
      likes: thisWeekAnalytics.reduce((sum, a) => sum + (a.likes || 0), 0),
      comments: thisWeekAnalytics.reduce((sum, a) => sum + (a.comments || 0), 0),
      followers: 0,
    };

    // 先週のKPI計算
    const lastWeekKPIs = {
      likes: lastWeekAnalytics.reduce((sum, a) => sum + (a.likes || 0), 0),
      comments: lastWeekAnalytics.reduce((sum, a) => sum + (a.comments || 0), 0),
      followers: 0,
    };

    // フォロワー数の変化を計算
    const followerCounts = followerCountsSnapshot.docs.map((doc) => doc.data());
    if (followerCounts.length >= 2) {
      const currentFollowers = followerCounts[0].followers || 0;
      const previousFollowers = followerCounts[1].followers || 0;
      thisWeekKPIs.followers = currentFollowers;
      lastWeekKPIs.followers = previousFollowers;
    } else if (followerCounts.length === 1) {
      thisWeekKPIs.followers = followerCounts[0].followers || 0;
    }

    // 今日のタスク（投稿予定）
    const todayTasks = posts
      .filter((post) => {
        const scheduledDate = post.scheduledDate;
        if (!scheduledDate) return false;
        const scheduled = scheduledDate instanceof Date ? scheduledDate : new Date(scheduledDate);
        return (
          scheduled.getFullYear() === today.getFullYear() &&
          scheduled.getMonth() === today.getMonth() &&
          scheduled.getDate() === today.getDate()
        );
      })
      .map((post) => ({
        id: post.id,
        type: post.postType || "feed",
        title: post.title || "",
        content: post.content || "",
        scheduledTime: post.scheduledDate,
      }));

    // 今週の予定
    const weeklySchedule = posts
      .filter((post) => {
        const scheduledDate = post.scheduledDate;
        if (!scheduledDate) return false;
        const scheduled = scheduledDate instanceof Date ? scheduledDate : new Date(scheduledDate);
        return scheduled >= startOfWeek && scheduled <= endOfWeek;
      })
      .map((post) => ({
        id: post.id,
        date: post.scheduledDate,
        type: post.postType || "feed",
        title: post.title || "",
        scheduledTime: post.scheduledDate,
      }))
      .sort((a, b) => {
        if (!a.date || !b.date) return 0;
        const dateA = a.date instanceof Date ? a.date : new Date(a.date);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });

    // 運用計画の取得
    let currentPlan = null;
    let allWeeklyTasks: Array<{ week: number; tasks: Array<{ day: string; task: string }> }> = [];
    let allMonthlyGoals: Array<{ month: number; goals: Array<{ goal: string; description?: string }> }> = [];
    let planStartDate: Date | null = null;
    
    if (!plansSnapshot.empty) {
      const planDoc = plansSnapshot.docs[0];
      const planData = planDoc.data();
      const generatedStrategyData = planData.generatedStrategyData || {};
      
      // 計画開始日を取得（formData.startDateまたはcreatedAtから）
      const formData = planData.formData || {};
      if (formData.startDate) {
        planStartDate = new Date(formData.startDate);
      } else if (planData.createdAt) {
        planStartDate = planData.createdAt?.toDate?.() || new Date(planData.createdAt);
      } else {
        planStartDate = new Date();
      }
      
      allWeeklyTasks = generatedStrategyData.allWeeklyTasks || [];
      allMonthlyGoals = generatedStrategyData.allMonthlyGoals || [];
      
      currentPlan = {
        id: planDoc.id,
        title: planData.title || "運用計画",
        strategy: planData.generatedStrategy || "",
        startDate: planStartDate,
        endDate: planData.endDate?.toDate?.() || planData.endDate,
        weeklyTasks: allWeeklyTasks,
        monthlyGoals: allMonthlyGoals,
        aiSuggestion: planData.aiSuggestion || null,
      };
    }

    // 今月の戦略進捗（簡易版）
    const monthlyProgress = currentPlan
      ? {
          strategy: "ストーリーズを毎日投稿",
          progress: 0,
          totalDays: 0,
          completedDays: 0,
        }
      : null;

    // AI提案データを取得
    let currentWeekTasks: Array<{ day: string; task: string }> = [];
    let currentMonthGoals: Array<{ metric?: string; target?: string; goal?: string; description?: string }> = [];
    let keyMessage: string | null = null;
    let aiSuggestion: any = null;
    
    // planDataから直接aiSuggestionを取得
    const planData = plansSnapshot.empty ? null : plansSnapshot.docs[0].data();
    if (planData?.aiSuggestion) {
      aiSuggestion = planData.aiSuggestion;
      keyMessage = aiSuggestion.keyMessage || null;
      
      // 今月の目標を取得
      if (aiSuggestion.monthlyGoals && Array.isArray(aiSuggestion.monthlyGoals)) {
        currentMonthGoals = aiSuggestion.monthlyGoals;
      }
      
      // 今週のタスクを取得（週次計画から）
      if (aiSuggestion.weeklyPlans && Array.isArray(aiSuggestion.weeklyPlans)) {
        const now = new Date();
        const planStart = planStartDate || now;
        const diffTime = now.getTime() - planStart.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const currentWeek = Math.max(1, Math.floor(diffDays / 7) + 1);
        
        // 現在の週の計画を取得
        const weekPlan = aiSuggestion.weeklyPlans.find((p: any) => p.week === currentWeek);
        if (weekPlan && weekPlan.tasks) {
          const typeLabels: Record<string, string> = {
            feed: "フィード投稿",
            reel: "リール",
            story: "ストーリーズ",
            "feed+reel": "フィード投稿 + リール",
          };
          
          currentWeekTasks = weekPlan.tasks.map((task: any) => ({
            day: task.day,
            task: `${typeLabels[task.type] || task.type}（${task.time}）「${task.description}」`,
          }));
        }
      }
    } else if (planStartDate && allWeeklyTasks.length > 0 && allMonthlyGoals.length > 0) {
      // 既存のデータ構造を使用（後方互換性）
      const now = new Date();
      const diffTime = now.getTime() - planStartDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const currentWeek = Math.max(1, Math.floor(diffDays / 7) + 1);
      const currentMonth = Math.max(1, Math.floor(diffDays / 30) + 1);
      
      // 現在の週のタスクを取得
      const weekData = allWeeklyTasks.find((w: any) => w.week === currentWeek);
      if (weekData) {
        currentWeekTasks = weekData.tasks || [];
      }
      
      // 現在の月の目標を取得
      const monthData = allMonthlyGoals.find((m: any) => m.month === currentMonth);
      if (monthData) {
        currentMonthGoals = monthData.goals || [];
      }
    }

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
        currentWeekTasks,
        currentMonthGoals,
        keyMessage,
        aiSuggestion,
      },
    });
  } catch (error) {
    console.error("Home dashboard error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

