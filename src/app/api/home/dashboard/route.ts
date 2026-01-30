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

    // startOfMonth and endOfMonth removed (unused)

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
      adminDb.collection("follower_counts")
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
        followerIncrease: data.followerIncrease || 0,
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
    // フォロワー数は分析ページの値（analyticsのfollowerIncrease）とhomeページの値（follower_counts）を合算
    // KPIコンソールと同じロジックを使用
    const thisWeekFollowerIncreaseFromPosts = thisWeekAnalytics.reduce((sum, a) => sum + (a.followerIncrease || 0), 0);
    const lastWeekFollowerIncreaseFromPosts = lastWeekAnalytics.reduce((sum, a) => sum + (a.followerIncrease || 0), 0);
    
    // follower_countsから取得（homeページで入力された値）
    // 注意: follower_countsは月単位のデータなので、週単位の正確な計算は難しい
    // 暫定的に、今月のfollower_countsの値を使用（より正確な実装には週単位のデータが必要）
    const followerCounts = followerCountsSnapshot.docs.map((doc) => doc.data());
    let thisWeekFollowerIncreaseFromOther = 0;
    let lastWeekFollowerIncreaseFromOther = 0;
    
    if (followerCounts.length >= 1) {
      const currentFollowers = followerCounts[0].followers || 0;
      const startFollowers = followerCounts[0].startFollowers || currentFollowers;
      // 今月の増加数（その他からの増加数）
      const monthFollowerIncrease = currentFollowers - startFollowers;
      // 週単位の概算: 今月の増加数を週数で割る（簡易計算）
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysSinceMonthStart = Math.floor((today.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const weeksSinceMonthStart = Math.ceil(daysSinceMonthStart / 7);
      // 今週の増加数を概算（今月の増加数 / 今月の週数）
      if (weeksSinceMonthStart > 0) {
        thisWeekFollowerIncreaseFromOther = Math.round(monthFollowerIncrease / weeksSinceMonthStart);
      }
      
      if (followerCounts.length >= 2) {
        const previousFollowers = followerCounts[1].followers || 0;
        const previousStartFollowers = followerCounts[1].startFollowers || previousFollowers;
        const previousMonthFollowerIncrease = previousFollowers - previousStartFollowers;
        // 先週の増加数も同様に概算（前月の増加数を週数で割る）
        const _previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const daysInPreviousMonth = previousMonthEnd.getDate();
        const weeksInPreviousMonth = Math.ceil(daysInPreviousMonth / 7);
        if (weeksInPreviousMonth > 0) {
          lastWeekFollowerIncreaseFromOther = Math.round(previousMonthFollowerIncrease / weeksInPreviousMonth);
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
    let planStartDate: Date | null = null;
    
    if (!plansSnapshot.empty) {
      const planDoc = plansSnapshot.docs[0];
      const planData = planDoc.data();
      
      // 計画開始日を取得（formData.startDateまたはstartDateから）
      const formData = planData.formData || {};
      if (formData.startDate) {
        planStartDate = new Date(formData.startDate);
      } else if (planData.startDate) {
        planStartDate = planData.startDate instanceof Date 
          ? planData.startDate 
          : planData.startDate?.toDate?.() 
            ? planData.startDate.toDate() 
            : new Date(planData.startDate);
      } else if (planData.createdAt) {
        // 後方互換性のため（createdAtは作成日時なので、startDateの代わりには使わない）
        planStartDate = planData.createdAt?.toDate?.() || new Date(planData.createdAt);
      } else {
        planStartDate = new Date();
      }
      
      // デバッグログ：計画開始日を確認
      console.log("[Home Dashboard] 計画開始日デバッグ:", {
        formDataStartDate: formData.startDate,
        planDataStartDate: planData.startDate,
        planStartDate: planStartDate?.toISOString(),
        planId: planDoc.id,
        hasFormData: !!planData.formData,
        hasAiSuggestion: !!planData.aiSuggestion,
        plansSnapshotEmpty: plansSnapshot.empty,
      });
      
      // generatedStrategyDataは廃止。aiSuggestionのみを使用
      // 後方互換性のため、generatedStrategyDataがある場合は警告を出す
      if (planData.generatedStrategyData) {
        console.warn("[Home Dashboard] generatedStrategyDataが使用されています。aiSuggestionに移行してください。", {
          planId: planDoc.id,
          hasAiSuggestion: !!planData.aiSuggestion,
        });
      }
      
      currentPlan = {
        id: planDoc.id,
        title: planData.title || "運用計画",
        strategy: planData.generatedStrategy || "",
        startDate: planStartDate,
        endDate: planData.endDate?.toDate?.() || planData.endDate,
        weeklyTasks: [], // generatedStrategyDataは使用しない
        monthlyGoals: [], // generatedStrategyDataは使用しない
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
    let aiSuggestion: any = null;
    
    // planDataから直接aiSuggestionを取得
    const planData = plansSnapshot.empty ? null : plansSnapshot.docs[0].data();
    if (planData?.aiSuggestion) {
      aiSuggestion = planData.aiSuggestion;
      
      // デバッグログ：aiSuggestionの構造を確認
      console.log("[Home Dashboard] aiSuggestion確認:", {
        hasWeeklyPlans: !!aiSuggestion.weeklyPlans,
        weeklyPlansCount: aiSuggestion.weeklyPlans?.length || 0,
        hasMonthlyGoals: !!aiSuggestion.monthlyGoals,
        monthlyGoalsCount: aiSuggestion.monthlyGoals?.length || 0,
        weeklyPlansWeeks: aiSuggestion.weeklyPlans?.map((p: any) => p.week) || [],
      });
      
      // 今月の目標を取得
      if (aiSuggestion.monthlyGoals && Array.isArray(aiSuggestion.monthlyGoals)) {
        currentMonthGoals = aiSuggestion.monthlyGoals;
      }
      
      // 今週のタスクを取得（週次計画から）
      // 重要: 週番号で日付を逆算するのではなく、開始日 + offsetで日付を確定する
      if (aiSuggestion.weeklyPlans && Array.isArray(aiSuggestion.weeklyPlans)) {
        const now = new Date();
        const planStart = planStartDate || now;
        
        // 計画開始日を基準に週を計算
        const diffTime = now.getTime() - planStart.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const currentWeek = Math.max(1, Math.floor(diffDays / 7) + 1);
        
        // デバッグログ：週計算を確認
        console.log("[Home Dashboard] 週計算デバッグ:", {
          planStart: planStart.toISOString(),
          now: now.toISOString(),
          diffDays,
          currentWeek,
          weeklyPlansWeeks: aiSuggestion.weeklyPlans.map((p: any) => p.week),
        });
        
        // 現在の週の計画を取得
        const weekPlan = aiSuggestion.weeklyPlans.find((p: any) => p.week === currentWeek);
        
        if (weekPlan && weekPlan.tasks) {
          const typeLabels: Record<string, string> = {
            feed: "フィード投稿",
            reel: "リール",
            story: "ストーリーズ",
            "feed+reel": "フィード投稿 + リール",
          };
          
          // 計画開始日を基準に、現在の週の開始日（月曜日）を計算
          const planStartDateObj = new Date(planStart);
          planStartDateObj.setHours(0, 0, 0, 0);
          
          // 計画開始日が何曜日か取得（0=日曜, 1=月曜, ..., 6=土曜）
          const planStartDayOfWeek = planStartDateObj.getDay();
          // 計画開始日が月曜日になるように調整
          const planStartMondayOffset = planStartDayOfWeek === 0 ? -6 : 1 - planStartDayOfWeek;
          const planStartMonday = new Date(planStartDateObj);
          planStartMonday.setDate(planStartDateObj.getDate() + planStartMondayOffset);
          
          // 現在の週の月曜日を計算（計画開始週の月曜日 + (currentWeek - 1) * 7日）
          const currentWeekMonday = new Date(planStartMonday);
          currentWeekMonday.setDate(planStartMonday.getDate() + (currentWeek - 1) * 7);
          
          // デバッグログ：日付計算を確認
          console.log("[Home Dashboard] 日付計算デバッグ:", {
            planStartDateObj: planStartDateObj.toISOString(),
            planStartDayOfWeek,
            planStartMondayOffset,
            planStartMonday: planStartMonday.toISOString(),
            currentWeek,
            currentWeekMonday: currentWeekMonday.toISOString(),
            weekPlanTasksCount: weekPlan.tasks.length,
          });
          
          // 曜日のマッピング（月曜日=0から始まる）
          const dayNameToIndex: Record<string, number> = {
            "月": 0, "火": 1, "水": 2, "木": 3, "金": 4, "土": 5, "日": 6,
          };
          
          currentWeekTasks = weekPlan.tasks.map((task: any) => {
            // 曜日から日付を計算（currentWeekMondayは現在の週の月曜日）
            const dayIndex = dayNameToIndex[task.day] ?? 0;
            const taskDate = new Date(currentWeekMonday);
            taskDate.setDate(currentWeekMonday.getDate() + dayIndex);
            taskDate.setHours(0, 0, 0, 0); // 時刻を0時に設定
            
            const month = taskDate.getMonth() + 1;
            const day = taskDate.getDate();
            
            // デバッグログ：各タスクの日付を確認
            console.log("[Home Dashboard] タスク日付:", {
              taskDay: task.day,
              dayIndex,
              taskDate: taskDate.toISOString(),
              formatted: `${month}/${day}（${task.day}）`,
            });
            
            return {
              day: `${month}/${day}（${task.day}）`,
            task: `${typeLabels[task.type] || task.type}（${task.time}）「${task.description}」`,
            };
          });
        } else {
          console.warn("[Home Dashboard] 週計画が見つかりません:", {
            currentWeek,
            availableWeeks: aiSuggestion.weeklyPlans.map((p: any) => p.week),
            hasWeekPlan: !!weekPlan,
          });
      }
      }
    }
    // generatedStrategyDataは使用しない（aiSuggestion一本化）

    // 計画の有無をログに記録
    console.log("[Home Dashboard] 計画の有無デバッグ:", {
      plansSnapshotEmpty: plansSnapshot.empty,
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
        currentPlan: plansSnapshot.empty ? null : currentPlan,
        monthlyProgress,
        currentWeekTasks,
        currentMonthGoals,
        aiSuggestion,
      },
    });
  } catch (error) {
    console.error("Home dashboard error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

