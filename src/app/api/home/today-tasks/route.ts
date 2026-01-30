import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import { logger } from "../../../../lib/logger";

/**
 * 今日やることを生成するAPI
 * 
 * 決定ロジック:
 * 1. 運用計画（plan）から今日の投稿タイプと頻度を取得
 * 2. 既にスケジュールされた投稿があるかチェック
 * 3. コメント返信が必要な投稿をチェック
 * 4. AIが提案する今日のタスクを生成
 */
export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "home-today-tasks", limit: 60, windowSeconds: 60 },
      auditEventName: "home_today_tasks_access",
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const tasks: Array<{
      id: string;
      type: "story" | "comment" | "feed" | "reel";
      title: string;
      description: string;
      recommendedTime?: string;
      content?: string;
      count?: number;
      reason?: string;
      priority: "high" | "medium" | "low";
    }> = [];

    // 1. 運用計画を取得
    const plansSnapshot = await adminDb
      .collection("plans")
      .where("userId", "==", uid)
      .where("snsType", "==", "instagram")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    let currentPlan = null;
    if (!plansSnapshot.empty) {
      const planDoc = plansSnapshot.docs[0];
      currentPlan = planDoc.data();
    }

    // 2. 今日スケジュールされた投稿を取得
    const postsSnapshot = await adminDb
      .collection("posts")
      .where("userId", "==", uid)
      .get();

    const todayScheduledPosts = postsSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        const scheduledDate = data.scheduledDate?.toDate?.() || data.scheduledDate;
        if (!scheduledDate) return null;
        const scheduled = scheduledDate instanceof Date ? scheduledDate : new Date(scheduledDate);
        if (
          scheduled.getFullYear() === today.getFullYear() &&
          scheduled.getMonth() === today.getMonth() &&
          scheduled.getDate() === today.getDate()
        ) {
          return {
            id: doc.id,
            type: data.postType || "feed",
            content: data.content || "",
            title: data.title || "",
            scheduledTime: scheduled,
          };
        }
        return null;
      })
      .filter(Boolean) as Array<{
      id: string;
      type: string;
      content: string;
      title: string;
      scheduledTime: Date;
    }>;

    // 3. 運用計画から今日の投稿タスクを生成
    if (currentPlan) {
      const formData = currentPlan.formData || {};
      const simulationResult = currentPlan.simulationResult || {};
      const aiSuggestion = currentPlan.aiSuggestion || null;
      
      // AI提案の週次計画から今日のタスクを取得
      if (aiSuggestion?.weeklyPlans && Array.isArray(aiSuggestion.weeklyPlans)) {
        const now = new Date();
        const planStart = currentPlan.startDate?.toDate?.() || currentPlan.createdAt?.toDate?.() || new Date();
        const diffTime = now.getTime() - planStart.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const currentWeek = Math.max(1, Math.floor(diffDays / 7) + 1);
        
        // 現在の週の計画を取得
        const weekPlan = aiSuggestion.weeklyPlans.find((p: any) => p.week === currentWeek);
        if (weekPlan && weekPlan.tasks) {
          const dayOfWeek = today.getDay(); // 0=日曜, 1=月曜, ...
          const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
          const dayName = dayNames[dayOfWeek];
          
          // 今日のタスクを取得
          const todayTasksFromPlan = weekPlan.tasks.filter((task: any) => task.day === dayName);
          
          const typeLabels: Record<string, string> = {
            feed: "フィード投稿",
            reel: "リール",
            story: "ストーリーズ",
            "feed+reel": "フィード投稿 + リール",
          };
          
          const typeTaskTypes: Record<string, "feed" | "reel" | "story"> = {
            feed: "feed",
            reel: "reel",
            story: "story",
            "feed+reel": "feed",
          };
          
          todayTasksFromPlan.forEach((task: any) => {
            const taskType = typeTaskTypes[task.type] || "feed";
            const hasScheduled = todayScheduledPosts.some(
              (post) => post.type === taskType
            );
            
            if (!hasScheduled) {
              tasks.push({
                id: `ai-plan-${task.day}-${task.type}-${today.getTime()}`,
                type: taskType,
                title: `${typeLabels[task.type] || task.type}を投稿する`,
                description: task.description || "",
                recommendedTime: task.time || "推奨時間未設定",
                content: task.description || "",
                reason: `週次計画（第${currentWeek}週）に基づくタスク`,
                priority: "high",
              });
            }
          });
        }
      }
      
      // 投稿頻度から今日のタスクを決定（既存ロジック、後方互換性のため）
      const dayOfWeek = today.getDay(); // 0=日曜, 1=月曜, ...
      const dayName = ["日", "月", "火", "水", "木", "金", "土"][dayOfWeek];

      // ストーリーズ: 毎日 or 頻度設定に基づく
      const storyFrequency = formData.storyFrequency || "";
      if (storyFrequency === "毎日" || storyFrequency === "ほぼ毎日") {
        // 今日のストーリーズ投稿がスケジュールされているかチェック
        const hasStoryScheduled = todayScheduledPosts.some(
          (post) => post.type === "story"
        );
        
        if (!hasStoryScheduled) {
          // AI戦略からストーリーズの内容を提案
          const strategy = currentPlan.generatedStrategy || "";
          const storyContent = extractStoryContentFromStrategy(strategy, dayName);
          
          tasks.push({
            id: `story-${today.getTime()}`,
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

      // フィード投稿: 週間頻度から今日のタスクを決定
      const feedFreq = formData.feedFreq || formData.availableTime || "";
      const shouldPostFeedToday = shouldPostToday(feedFreq, dayOfWeek);
      
      if (shouldPostFeedToday) {
        const hasFeedScheduled = todayScheduledPosts.some(
          (post) => post.type === "feed"
        );
        
        if (!hasFeedScheduled) {
          const strategy = currentPlan.generatedStrategy || "";
          const feedContent = extractFeedContentFromStrategy(strategy, dayName);
          
          tasks.push({
            id: `feed-${today.getTime()}`,
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

      // リール投稿: 週間頻度から今日のタスクを決定
      const reelFreq = formData.reelFreq || formData.reelCapability || "";
      const shouldPostReelToday = shouldPostToday(reelFreq, dayOfWeek);
      
      if (shouldPostReelToday) {
        const hasReelScheduled = todayScheduledPosts.some(
          (post) => post.type === "reel"
        );
        
        if (!hasReelScheduled) {
          tasks.push({
            id: `reel-${today.getTime()}`,
            type: "reel",
            title: "リールを投稿する",
            description: "リール動画の投稿",
            recommendedTime: "13:00推奨",
            reason: "今週の目標: リール1回",
            priority: "medium",
          });
        }
      }
    }

    // 4. 既にスケジュールされた投稿をタスクとして追加
    todayScheduledPosts.forEach((post) => {
      const scheduledHour = post.scheduledTime.getHours();
      const scheduledMinute = post.scheduledTime.getMinutes();
      const timeStr = `${scheduledHour.toString().padStart(2, "0")}:${scheduledMinute.toString().padStart(2, "0")}`;
      
      tasks.push({
        id: `scheduled-${post.id}`,
        type: post.type as "story" | "feed" | "reel",
        title: `${post.type === "story" ? "ストーリー" : post.type === "reel" ? "リール" : "フィード"}を投稿する`,
        description: post.title || post.content?.substring(0, 50) || "",
        recommendedTime: `${timeStr}予定`,
        content: post.content,
        priority: "high",
      });
    });

    // 5. コメント返信が必要な投稿をチェック
    const analyticsSnapshot = await adminDb
      .collection("analytics")
      .where("userId", "==", uid)
      .get();

    const recentAnalytics = analyticsSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        const publishedAt = data.publishedAt?.toDate?.() || data.publishedAt;
        return {
          ...data,
          comments: data.comments || 0,
          commentThreads: data.commentThreads || [],
          publishedAt: publishedAt instanceof Date ? publishedAt : new Date(publishedAt),
        };
      })
      .filter((a) => {
        // 過去7日以内の投稿
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return a.publishedAt >= sevenDaysAgo;
      });

    // コメントがあるが返信がない投稿をカウント
    const postsNeedingReply = recentAnalytics.filter((a) => {
      const comments = a.comments || 0;
      const hasReplies = a.commentThreads && a.commentThreads.length > 0;
      return comments > 0 && !hasReplies;
    });

    if (postsNeedingReply.length > 0) {
      tasks.push({
        id: `comments-${today.getTime()}`,
        type: "comment",
        title: "コメントに返信する",
        description: `${postsNeedingReply.length}件のコメントに返信が必要です`,
        count: postsNeedingReply.length,
        priority: "medium",
      });
    }

    // 優先度順にソート（high > medium > low）
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return NextResponse.json({
      success: true,
      data: {
        tasks,
        planExists: !!currentPlan,
        totalTasks: tasks.length,
      },
    });
  } catch (error) {
    logger.error("Today tasks API error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

/**
 * 週間頻度から今日投稿すべきか判定
 */
function shouldPostToday(frequency: string, dayOfWeek: number): boolean {
  if (!frequency) return false;
  
  // 週3回の場合: 月、水、金
  if (frequency.includes("3") || frequency === "週3回") {
    return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5; // 月、水、金
  }
  
  // 週4回の場合: 月、火、木、金
  if (frequency.includes("4") || frequency === "週4回") {
    return dayOfWeek === 1 || dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 5;
  }
  
  // 週5回の場合: 月〜金
  if (frequency.includes("5") || frequency === "週5回") {
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }
  
  // 毎日
  if (frequency.includes("毎日") || frequency === "毎日") {
    return true;
  }
  
  return false;
}

/**
 * AI戦略からストーリーズの内容を抽出
 */
function extractStoryContentFromStrategy(
  strategy: string,
  _dayName: string
): { title: string; content: string } {
  // 簡易的な抽出ロジック（後で改善可能）
  if (!strategy) {
    return {
      title: "今日のストーリーズ投稿",
      content: "今日の日常をシェアしましょう。",
    };
  }

  // 戦略から「今週やること」を抽出
  const thisWeekMatch = strategy.match(/今週やること[：:]\s*([^\n]+)/);
  if (thisWeekMatch) {
    return {
      title: thisWeekMatch[1].trim(),
      content: thisWeekMatch[1].trim(),
    };
  }

  return {
    title: "今日のストーリーズ投稿",
    content: "今日の日常をシェアしましょう。",
  };
}

/**
 * AI戦略からフィード投稿の内容を抽出
 */
function extractFeedContentFromStrategy(
  strategy: string,
  _dayName: string
): { title: string; content: string } {
  if (!strategy) {
    return {
      title: "フィード投稿",
      content: "",
    };
  }

  // 戦略から「今週やること」を抽出
  const thisWeekMatch = strategy.match(/今週やること[：:]\s*([^\n]+)/);
  if (thisWeekMatch) {
    return {
      title: thisWeekMatch[1].trim(),
      content: "",
    };
  }

  return {
    title: "フィード投稿",
    content: "",
  };
}

