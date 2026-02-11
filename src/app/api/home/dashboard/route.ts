import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { getLocalDate } from "../../../../lib/utils/timezone";
import * as admin from "firebase-admin";

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

    // startOfMonth and endOfMonth removed (unused)

    // ユーザーのactivePlanIdを取得（必須）
    const user = await getUserProfile(uid);
    
    console.log("[Home Dashboard] ユーザーデータ:", {
      userId: uid,
      activePlanId: user?.activePlanId || null,
    });
    
    // 並列でデータを取得
    const [analyticsSnapshot, postsSnapshot, planDoc, followerCountsSnapshot] = await Promise.all([
      adminDb.collection("analytics").where("userId", "==", uid).get(),
      adminDb.collection("posts").where("userId", "==", uid).get(),
      user?.activePlanId 
        ? adminDb.collection("plans").doc(user.activePlanId).get()
        : Promise.resolve({ exists: false } as admin.firestore.DocumentSnapshot),
      adminDb.collection("follower_counts")
        .where("userId", "==", uid)
        .orderBy("date", "desc")
        .limit(2)
        .get(),
    ]);
    
    // 計画データを取得
    const planData = planDoc.exists ? planDoc.data() : null;
    
    console.log("[Home Dashboard] 計画データ:", {
      planExists: planDoc.exists,
      hasPlanData: !!planData,
      hasFormData: !!planData?.formData,
      hasSimulationResult: !!planData?.simulationResult,
      planId: planDoc.exists ? (planDoc as any).id : null,
    });

    const analytics = analyticsSnapshot.docs.map((doc) => {
      const data = doc.data();
      // publishedAtをDate型に統一（Timestamp型の場合はtoDate()で変換）
      const publishedAt = data.publishedAt
        ? data.publishedAt instanceof admin.firestore.Timestamp
          ? data.publishedAt.toDate()
          : data.publishedAt instanceof Date
            ? data.publishedAt
            : new Date(data.publishedAt)
        : new Date();
      return {
        ...data,
        likes: data.likes || 0,
        comments: data.comments || 0,
        shares: data.shares || 0,
        reach: data.reach || 0,
        saves: data.saves || 0,
        followers: data.followers || 0,
        followerIncrease: data.followerIncrease || 0,
        publishedAt,
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
    // フォロワー数は分析ページの値（analyticsのfollowerIncrease）とhomeページの値（follower_counts）を合算
    // KPIコンソールと同じロジックを使用
    const thisWeekFollowerIncreaseFromPosts = thisWeekAnalytics.reduce((sum, a) => sum + (a.followerIncrease || 0), 0);
    const lastWeekFollowerIncreaseFromPosts = lastWeekAnalytics.reduce((sum, a) => sum + (a.followerIncrease || 0), 0);
    
    // follower_countsから取得（homeページで入力された値）
    // follower_counts.followersは「投稿に紐づかない増加数」として保存されている
    // 注意: follower_countsは月単位のデータなので、週単位の正確な計算は難しい
    // 暫定的に、今月のfollower_countsの値を使用（より正確な実装には週単位のデータが必要）
    const followerCounts = followerCountsSnapshot.docs.map((doc) => doc.data());
    let thisWeekFollowerIncreaseFromOther = 0;
    let lastWeekFollowerIncreaseFromOther = 0;
    
    if (followerCounts.length >= 1) {
      // follower_counts.followersは既に「投稿に紐づかない増加数」として保存されている
      const monthFollowerIncreaseFromOther = followerCounts[0].followers || 0;
      // 週単位の概算: 今月の増加数を週数で割る（簡易計算）
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysSinceMonthStart = Math.floor((today.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const weeksSinceMonthStart = Math.ceil(daysSinceMonthStart / 7);
      // 今週の増加数を概算（今月の増加数 / 今月の週数）
      if (weeksSinceMonthStart > 0) {
        thisWeekFollowerIncreaseFromOther = Math.round(monthFollowerIncreaseFromOther / weeksSinceMonthStart);
      }
      
      if (followerCounts.length >= 2) {
        // 前月の「投稿に紐づかない増加数」
        const previousMonthFollowerIncreaseFromOther = followerCounts[1].followers || 0;
        // 先週の増加数も同様に概算（前月の増加数を週数で割る）
        const _previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const daysInPreviousMonth = previousMonthEnd.getDate();
        const weeksInPreviousMonth = Math.ceil(daysInPreviousMonth / 7);
        if (weeksInPreviousMonth > 0) {
          lastWeekFollowerIncreaseFromOther = Math.round(previousMonthFollowerIncreaseFromOther / weeksInPreviousMonth);
        }
      }
    }
    
    const thisWeekKPIs = {
      likes: thisWeekAnalytics.reduce((sum, a) => sum + (a.likes || 0), 0),
      comments: thisWeekAnalytics.reduce((sum, a) => sum + (a.comments || 0), 0),
      followers: thisWeekFollowerIncreaseFromPosts + thisWeekFollowerIncreaseFromOther,
    };

    // 先週のKPI計算
    const lastWeekKPIs = {
      likes: lastWeekAnalytics.reduce((sum, a) => sum + (a.likes || 0), 0),
      comments: lastWeekAnalytics.reduce((sum, a) => sum + (a.comments || 0), 0),
      followers: lastWeekFollowerIncreaseFromPosts + lastWeekFollowerIncreaseFromOther,
    };

    // 今日のタスク（投稿予定）
    const todayTasks = posts
      .filter((post) => {
        const scheduledDate = post.scheduledDate;
        if (!scheduledDate) {
          return false;
        }
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
        if (!scheduledDate) {
          return false;
        }
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
        if (!a.date || !b.date) {
          return 0;
        }
        const dateA = a.date instanceof Date ? a.date : new Date(a.date);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });

    // 運用計画の取得（planDataから直接取得）
    let currentPlan = null;
    
    if (planData && planDoc.exists) {
      // 計画開始日を取得（formData.startDateまたはstartDateから）
      const formData = (planData.formData || {}) as Record<string, unknown>;
      let planStartDate: Date | null = null;
      if (formData.startDate) {
        planStartDate = new Date(formData.startDate as string);
      } else if (planData.startDate) {
        planStartDate = planData.startDate instanceof Date 
          ? planData.startDate 
          : planData.startDate?.toDate?.() 
            ? planData.startDate.toDate() 
            : new Date(planData.startDate);
      } else if (planData.createdAt) {
        planStartDate = planData.createdAt?.toDate?.() || new Date(planData.createdAt);
      } else {
        planStartDate = new Date();
      }
      
      currentPlan = {
        id: user?.activePlanId || "",
        title: planData.title || "運用計画",
        strategy: planData.generatedStrategy || "",
        startDate: planStartDate,
        endDate: planData.endDate?.toDate?.() || planData.endDate,
        weeklyTasks: [],
        monthlyGoals: [],
        aiSuggestion: null,
      };
    }

    // 今月の戦略進捗（簡易版）
    const monthlyProgress = currentPlan
      ? {
          strategy: "運用計画実行中",
          progress: 0,
          totalDays: 0,
          completedDays: 0,
        }
      : null;

    // 計画の有無をログに記録
    console.log("[Home Dashboard] 計画の有無デバッグ:", {
      planDataExists: !!planData,
      currentPlanExists: !!currentPlan,
      currentPlanId: currentPlan?.id || null,
    });

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
        currentPlan: currentPlan,
        monthlyProgress,
        simulationResult: planData?.simulationResult || null,
      },
    });
  } catch (error) {
    console.error("Home dashboard error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

