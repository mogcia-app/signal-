import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { buildPostGenerationPrompt } from "../../../../utils/aiPromptBuilder";
// buildAIContext removed (unused)
import OpenAI from "openai";
import { cache, generateCacheKey } from "../../../../lib/cache";
import type { AIPlanSuggestion } from "../../../instagram/plan/types/plan";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

/**
 * Homeページ用のAI生成セクション
 * - 今日やること
 * - 明日の準備
 * - 今月の目標
 */
export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "home-ai-sections", limit: 30, windowSeconds: 60 },
      auditEventName: "home_ai_sections_access",
    });

    // 日本時間（JST）で今日の日付を取得
    const now = new Date();
    const jstOffset = 9 * 60; // JSTはUTC+9
    const jstTime = new Date(now.getTime() + (jstOffset - now.getTimezoneOffset()) * 60000);
    const today = new Date(jstTime.getFullYear(), jstTime.getMonth(), jstTime.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // 現在の計画を取得
    const plansSnapshot = await adminDb
      .collection("plans")
      .where("userId", "==", uid)
      .where("snsType", "==", "instagram")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (plansSnapshot.empty) {
      return NextResponse.json({
        success: true,
        data: {
          todayTasks: [],
          tomorrowPreparation: [],
          monthlyGoals: [],
          weeklySchedule: null,
        },
      });
    }

    const planDoc = plansSnapshot.docs[0];
    const planData = planDoc.data();
    const aiSuggestion = planData.aiSuggestion as AIPlanSuggestion | undefined;
    const formData = (planData.formData || {}) as Record<string, unknown>;

    // 現在の週を計算（キャッシュキーに含めるため先に計算）
    const planStart = planData.startDate 
      ? (planData.startDate instanceof Date 
          ? planData.startDate 
          : planData.startDate.toDate 
            ? planData.startDate.toDate() 
            : new Date(planData.startDate))
      : planData.createdAt 
        ? (planData.createdAt instanceof Date 
            ? planData.createdAt 
            : planData.createdAt.toDate 
              ? planData.createdAt.toDate() 
              : new Date(planData.createdAt))
        : today;

    const diffTime = today.getTime() - planStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const currentWeek = Math.max(1, Math.floor(diffDays / 7) + 1);

    // 現在の月を取得（今月の目標用）
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    // キャッシュキーを生成
    // - 「今日やること」「明日の準備」「今週の予定」は週単位（週が変わったら再生成）
    // - 「今月の目標」は月単位（月が変わったら再生成、または計画が新しくなったら再生成）
    const planId = planDoc.id;
    const cacheKey = generateCacheKey("home-ai-sections", {
      userId: uid,
      week: currentWeek, // 週単位（日付ではなく週）
      month: currentMonth, // 月単位（今月の目標用）
      planId, // 計画が変わったら再生成
    });

    // キャッシュから取得を試みる（24時間有効）
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`[Home AI Sections] キャッシュヒット: ${cacheKey}`);
      return NextResponse.json({
        success: true,
        data: cached,
      });
    }

    // ユーザープロフィールを取得（ビジネス情報を含む）
    const userProfile = await getUserProfile(uid);
    console.log(`[ユーザープロフィール] 取得結果: ${userProfile ? "成功" : "失敗"}`);
    if (userProfile) {
      console.log(`[ユーザープロフィール] ビジネス情報: ${userProfile.businessInfo ? "あり" : "なし"}`);
    }
    const businessInfo = userProfile?.businessInfo || {};
    const businessDescription = (businessInfo as { description?: string })?.description || "";
    const businessCatchphrase = (businessInfo as { catchphrase?: string })?.catchphrase || "";

    if (!aiSuggestion) {
      const emptyData = {
        todayTasks: [],
        tomorrowPreparation: [],
        monthlyGoals: [],
        weeklySchedule: null,
      };
      // 空データもキャッシュ（1時間）
      cache.set(cacheKey, emptyData, 60 * 60 * 1000);
      return NextResponse.json({
        success: true,
        data: emptyData,
      });
    }

    // 今日の曜日を取得（"月"形式に統一）
    const dayOfWeek = today.getDay();
    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
    const todayDayName = dayNames[dayOfWeek];
    const tomorrowDayName = dayNames[(dayOfWeek + 1) % 7];
    
    // 曜日マッチング用のヘルパー関数（"月曜"と"月"の両方に対応）
    const matchDay = (taskDay: string, targetDay: string): boolean => {
      return taskDay === targetDay || taskDay.startsWith(targetDay) || taskDay === `${targetDay}曜`;
    };

    // 今週の計画を取得
    const weekPlan = aiSuggestion?.weeklyPlans?.find((p) => p.week === currentWeek);
    
    // ============================================
    // 解決策B: 今週の予定を先に生成してから、今日・明日を参照
    // ============================================
    
    // 今週の予定（AI生成）を先に生成
    let weeklySchedule: {
      week: number;
      theme: string;
      actions: string[];
      tasks: Array<{ day: string; date?: string; time: string; type: string; description: string }>;
      startDate?: string;
      endDate?: string;
    } | null = null;

    if (weekPlan && openai) {
      try {
        // 今週の日付範囲を計算（計画開始日の曜日を基準にする）
        const planStartDayOfWeek = planStart.getDay(); // 計画開始日の曜日（0=日, 1=月, ..., 6=土）
        const weekStartDate = new Date(planStart);
        weekStartDate.setDate(planStart.getDate() + (currentWeek - 1) * 7);
        
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekStartDate.getDate() + 6);

        const formatDate = (date: Date) => {
          const month = date.getMonth() + 1;
          const day = date.getDate();
          const dayOfWeek = date.getDay();
          const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
          return `${month}/${day}（${dayNames[dayOfWeek]}）`;
        };

        const mainGoal = (formData.mainGoal as string) || "フォロワーを増やす";
        const targetAudience = (formData.targetAudience as string) || "";
        const currentMonthStrategy = aiSuggestion?.monthlyStrategy?.find((s) => s.week === currentWeek);
        const strategyTheme = currentMonthStrategy?.theme || "";
        const strategyActions = currentMonthStrategy?.actions || [];
        const weeklyFeedPosts = formData.weeklyFeedPosts || 0;
        const weeklyReelPosts = formData.weeklyReelPosts || 0;
        const weeklyStoryPosts = formData.weeklyStoryPosts || 0;

        const weeklySchedulePrompt = `保存された計画内容を達成させるために、今週の予定を具体的に提案してください。

【計画の目標】
${mainGoal}

【ターゲット層】
${targetAudience || "未設定"}

【今週の戦略テーマ】
${strategyTheme || "未設定"}

【今週の戦略アクション】
${strategyActions.length > 0 ? strategyActions.map((a: string) => `- ${a}`).join("\n") : "未設定"}

【投稿頻度】
- フィード投稿: 週${weeklyFeedPosts}回
- リール: 週${weeklyReelPosts}回
- ストーリーズ: 週${weeklyStoryPosts}回

【今週の期間】
${formatDate(weekStartDate)} 〜 ${formatDate(weekEndDate)}

【ビジネス情報】
${businessDescription ? `事業内容: ${businessDescription}` : ""}
${businessCatchphrase ? `キャッチフレーズ: ${businessCatchphrase}` : ""}

以下の形式でJSONを返してください:
{
  "theme": "今週のテーマ（1行で簡潔に）",
  "actions": [
    "戦略的なアクション1（具体的な投稿以外の行動）",
    "戦略的なアクション2（例：コメント返信を必ず行う）",
    "戦略的なアクション3"
  ],
  "tasks": [
    {
      "day": "月",
      "time": "13:00",
      "type": "feed",
      "description": "投稿タイトル（簡潔に、1行で）"
    }
  ]
}

**重要**: 
- dayフィールドは「月」「火」「水」「木」「金」「土」「日」のいずれかで指定してください（「月曜」ではなく「月」）。
- actionsは「具体的な投稿内容」ではなく、「戦略的な行動」を記載してください。**2026年の最新のInstagramアルゴリズムに基づいた提案をしてください**（例：「ハッシュタグを20〜30個使用」のような古い手法ではなく、「リールの最初の3秒で視聴者の興味を引く」「ストーリーズの質問スタンプでエンゲージメントを促進」「投稿後1時間以内にコメント返信を行う」など）。
- 2026年のInstagram運用のベストプラクティス：
  - ハッシュタグは3〜5個の関連性の高いものに絞る（20〜30個は非推奨）
  - リールの最初の3秒で視聴者の注意を引く
  - ストーリーズのインタラクティブ機能（質問、投票、スライダー）を活用
  - 投稿後1時間以内のエンゲージメントが重要
  - リポスト機能を活用して既存コンテンツを再利用
  - ユーザー生成コンテンツ（UGC）を促進
- tasksのdescriptionは投稿タイトルのみで、詳細な説明は不要です（例：「コーヒーの健康効果」だけでOK、「コーヒーの健康効果を紹介する投稿。キャッチフレーズを使い...」のような長文は不要）。

計画の目標「${mainGoal}」を達成するために、**2026年の最新のInstagramアルゴリズムに基づいた**今週のテーマ、戦略的なアクション、そして投稿スケジュール（曜日ごと、タイトルのみ）を具体的に提案してください。投稿頻度に合わせて、適切に分散させてください。`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "あなたは2026年の最新のInstagramアルゴリズムに精通した運用の専門家です。保存された計画内容を達成させるために、最新のベストプラクティスに基づいた今週の予定を具体的に提案してください。古い手法（例：ハッシュタグを20〜30個使用）ではなく、2026年の最新の手法を提案してください。",
            },
            {
              role: "user",
              content: weeklySchedulePrompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
          response_format: { type: "json_object" },
        });

        const aiResponse = completion.choices[0]?.message?.content;
        if (aiResponse) {
          const parsedResponse = JSON.parse(aiResponse);
          
          // 各タスクに日付を追加（計画開始日の曜日を基準にする）
          type TaskWithDate = { day: string; time: string; type: string; description: string; date?: string };
          const tasksWithDates = ((parsedResponse.tasks as TaskWithDate[]) || (weekPlan?.tasks as TaskWithDate[]) || []).map((task) => {
            const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
            // task.dayから「曜」を除去（「月曜」→「月」）
            const dayName = task.day.replace(/曜$/, "");
            const taskDayIndex = dayNames.indexOf(dayName);
            if (taskDayIndex !== -1) {
              const taskDate = new Date(weekStartDate);
              // 計画開始日の曜日を基準に日数差を計算
              // planStartDayOfWeekが基準（0）、そこからの相対的な日数差を計算
              let dayOffset = taskDayIndex - planStartDayOfWeek;
              if (dayOffset < 0) {
                dayOffset += 7; // 週をまたぐ場合
              }
              taskDate.setDate(weekStartDate.getDate() + dayOffset);
              const month = taskDate.getMonth() + 1;
              const day = taskDate.getDate();
              return {
                ...task,
                date: `${month}/${day}（${dayName}）`,
              };
            }
            return task;
          });
          
          // タスクを日付順にソート
          const sortedTasks = tasksWithDates.sort((a, b) => {
            if (!a.date || !b.date) {
              return 0;
            }
            // 日付文字列から日付を抽出して比較
            const dateA = a.date.match(/(\d+)\/(\d+)/);
            const dateB = b.date.match(/(\d+)\/(\d+)/);
            if (!dateA || !dateB) {
              return 0;
            }
            const monthA = parseInt(dateA[1]);
            const dayA = parseInt(dateA[2]);
            const monthB = parseInt(dateB[1]);
            const dayB = parseInt(dateB[2]);
            if (monthA !== monthB) {
              return monthA - monthB;
            }
            return dayA - dayB;
          });
          
          weeklySchedule = {
            week: currentWeek,
            theme: parsedResponse.theme || strategyTheme || "",
            actions: parsedResponse.actions || strategyActions || [],
            tasks: sortedTasks,
            startDate: formatDate(weekStartDate),
            endDate: formatDate(weekEndDate),
          };
        }
      } catch (error) {
        console.error("今週の予定AI生成エラー:", error);
        // フォールバック: 既存のweekPlanから生成（計画開始日の曜日を基準にする）
        const planStartDayOfWeek = planStart.getDay();
        const weekStartDate = new Date(planStart);
        weekStartDate.setDate(planStart.getDate() + (currentWeek - 1) * 7);
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekStartDate.getDate() + 6);
        
        const formatDate = (date: Date) => {
          const month = date.getMonth() + 1;
          const day = date.getDate();
          const dayOfWeek = date.getDay();
          const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
          return `${month}/${day}（${dayNames[dayOfWeek]}）`;
        };

        const currentMonthStrategy = aiSuggestion?.monthlyStrategy?.find((s) => s.week === currentWeek);
        
        // 各タスクに日付を追加（計画開始日の曜日を基準にする）
        const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
        type TaskWithDate = { day: string; time: string; type: string; description: string; date?: string };
        const tasksWithDates = ((weekPlan?.tasks as TaskWithDate[]) || []).map((task) => {
          // task.dayから「曜」を除去（「月曜」→「月」）
          const dayName = task.day.replace(/曜$/, "");
          const taskDayIndex = dayNames.indexOf(dayName);
          if (taskDayIndex !== -1) {
            const taskDate = new Date(weekStartDate);
            // 計画開始日の曜日を基準に日数差を計算
            let dayOffset = taskDayIndex - planStartDayOfWeek;
            if (dayOffset < 0) {
              dayOffset += 7; // 週をまたぐ場合
            }
            taskDate.setDate(weekStartDate.getDate() + dayOffset);
            const month = taskDate.getMonth() + 1;
            const day = taskDate.getDate();
            return {
              ...task,
              date: `${month}/${day}（${dayName}）`,
            };
          }
          return task;
        });
        
        // タスクを日付順にソート
        const sortedTasks = tasksWithDates.sort((a, b) => {
          if (!a.date || !b.date) {
            return 0;
          }
          const dateA = a.date.match(/(\d+)\/(\d+)/);
          const dateB = b.date.match(/(\d+)\/(\d+)/);
          if (!dateA || !dateB) {
            return 0;
          }
          const monthA = parseInt(dateA[1]);
          const dayA = parseInt(dateA[2]);
          const monthB = parseInt(dateB[1]);
          const dayB = parseInt(dateB[2]);
          if (monthA !== monthB) {
            return monthA - monthB;
          }
          return dayA - dayB;
        });
        
        weeklySchedule = {
          week: currentWeek,
          theme: currentMonthStrategy?.theme || "",
          actions: currentMonthStrategy?.actions || [],
          tasks: sortedTasks,
          startDate: formatDate(weekStartDate),
          endDate: formatDate(weekEndDate),
        };
      }
    } else if (weekPlan) {
      // AIが使えない場合のフォールバック（計画開始日の曜日を基準にする）
      const planStartDayOfWeek = planStart.getDay();
      const weekStartDate = new Date(planStart);
      weekStartDate.setDate(planStart.getDate() + (currentWeek - 1) * 7);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 6);
      
      const formatDate = (date: Date) => {
        return `${date.getMonth() + 1}/${date.getDate()}`;
      };

      const currentMonthStrategy = aiSuggestion?.monthlyStrategy?.find((s) => s.week === currentWeek);
      
      // 各タスクに日付を追加（計画開始日の曜日を基準にする）
      const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
      type TaskWithDate = { day: string; time: string; type: string; description: string; date?: string };
      const tasksWithDates = ((weekPlan?.tasks as TaskWithDate[]) || []).map((task) => {
        // task.dayから「曜」を除去（「月曜」→「月」）
        const dayName = task.day.replace(/曜$/, "");
        const taskDayIndex = dayNames.indexOf(dayName);
        if (taskDayIndex !== -1) {
          const taskDate = new Date(weekStartDate);
          // 計画開始日の曜日を基準に日数差を計算
          let dayOffset = taskDayIndex - planStartDayOfWeek;
          if (dayOffset < 0) {
            dayOffset += 7; // 週をまたぐ場合
          }
          taskDate.setDate(weekStartDate.getDate() + dayOffset);
          const month = taskDate.getMonth() + 1;
          const day = taskDate.getDate();
          return {
            ...task,
            date: `${month}/${day}（${dayName}）`,
          };
        }
        return task;
      });
      
      // タスクを日付順にソート
      const sortedTasks = tasksWithDates.sort((a, b) => {
        if (!a.date || !b.date) {
          return 0;
        }
        const dateA = a.date.match(/(\d+)\/(\d+)/);
        const dateB = b.date.match(/(\d+)\/(\d+)/);
        if (!dateA || !dateB) {
          return 0;
        }
        const monthA = parseInt(dateA[1]);
        const dayA = parseInt(dateA[2]);
        const monthB = parseInt(dateB[1]);
        const dayB = parseInt(dateB[2]);
        if (monthA !== monthB) {
          return monthA - monthB;
        }
        return dayA - dayB;
      });
      
      weeklySchedule = {
        week: currentWeek,
        theme: currentMonthStrategy?.theme || "",
        actions: currentMonthStrategy?.actions || [],
        tasks: sortedTasks,
        startDate: formatDate(weekStartDate),
        endDate: formatDate(weekEndDate),
      };
    }

    // 解決策B: 今日やることと明日の準備は、weeklySchedule.tasksを優先的に使用
    // 同じデータソースから切り出すことで、一貫性を保つ
    const sourceTasks = weeklySchedule?.tasks?.length 
      ? weeklySchedule.tasks 
      : weekPlan?.tasks ?? [];
    
    // 今日やること（今週の計画から、AIで計画達成のためのヒントを生成 + 投稿文とハッシュタグを自動生成）
    const todayTasks: Array<{
      time: string;
      type: string;
      description: string;
      tip?: string;
      generatedContent?: string;
      generatedHashtags?: string[];
    }> = [];

    if (sourceTasks.length > 0) {
      // 曜日マッチング（"月"と"月曜"の両方に対応）
      type Task = { day: string; time: string; type: string; description: string };
      const todayTasksFromPlan = sourceTasks.filter((task: Task) => matchDay(task.day, todayDayName));
      
      // 計画達成のためのコンテキストを構築
      const mainGoal = (formData.mainGoal as string) || "フォロワーを増やす";
      const targetAudience = (formData.targetAudience as string) || "";
      const currentMonthStrategy = aiSuggestion?.monthlyStrategy?.find((s) => s.week === currentWeek);
      const strategyTheme = currentMonthStrategy?.theme || "";
      const strategyActions = currentMonthStrategy?.actions || [];

      // AIに計画達成のためのヒントを生成してもらう + 投稿文とハッシュタグを自動生成
      const postGenerationMap = new Map<number, { content: string; hashtags: string[] }>();
      
      console.log(`[今日やること] 条件チェック: todayTasksFromPlan.length=${todayTasksFromPlan.length}, openai=${!!openai}, userProfile=${!!userProfile}`);
      
      if (todayTasksFromPlan.length > 0 && openai && userProfile) {
        try {
          // 投稿タイプがfeed/reel/storyの場合、ラボのAIで投稿文とハッシュタグを生成
          const postTasks = todayTasksFromPlan.filter((task) => 
            task.type === "feed" || task.type === "reel" || task.type === "story"
          );

          console.log(`[今日やること] 投稿タスク数: ${postTasks.length}, 全タスク数: ${todayTasksFromPlan.length}`);
          console.log(`[今日やること] 投稿タスク詳細:`, postTasks.map((t) => ({ type: t.type, description: t.description })));

          // 投稿文とハッシュタグを並列で生成（ラボのAIエンドポイントと同じロジックを使用）
          const postGenerationPromises = postTasks.map(async (task) => {
            try {
              const postType = task.type as "feed" | "reel" | "story";
              
              // ラボのAIエンドポイントと同じシステムプロンプトを構築
              let systemPrompt = buildPostGenerationPrompt(userProfile, "instagram", postType);
              
              // 運用計画の要約を追加
              if (planData) {
                const createdAt = planData.createdAt as { toDate?: () => Date } | Date | string | null;
                let createdDate = "不明";
                if (createdAt) {
                  if (createdAt instanceof Date) {
                    createdDate = createdAt.toLocaleDateString();
                  } else if (typeof createdAt === "object" && "toDate" in createdAt && createdAt.toDate) {
                    createdDate = createdAt.toDate().toLocaleDateString();
                  } else if (typeof createdAt === "string") {
                    createdDate = new Date(createdAt).toLocaleDateString();
                  }
                }
                const planType = (planData.planType as string) || "AI生成";
                const strategy = (planData.generatedStrategy as string) || (aiSuggestion?.monthlyStrategy?.[0]?.theme || "運用計画を参照してください");

                systemPrompt += `

【運用計画の参照（PDCA - Plan）】
この投稿は、以下の運用計画に基づいて生成されます：
- 計画タイプ: ${planType}
- 作成日: ${createdDate}
- 戦略の概要: ${strategy.substring(0, 200)}...

運用計画との一貫性を保ちながら、投稿を生成してください。`;
              }

              // 投稿タイプ別の追加指示
              const postTypeLabel =
                postType === "reel" ? "リール" : postType === "story" ? "ストーリーズ" : "フィード";
              const textLengthGuide =
                postType === "story"
                  ? "20-50文字程度、1-2行の短い一言二言"
                  : postType === "reel"
                    ? "50-150文字程度、エンゲージメント重視"
                    : "100-150文字程度、詳細で魅力的な内容";

              systemPrompt += `

【投稿生成の指示】
- 投稿タイプ: ${postTypeLabel}
${postType === "story" ? "- **重要**: ストーリーは短い文（20-50文字、1-2行）にしてください" : ""}
${postType === "feed" ? "- **重要**: フィード投稿文は100-150文字程度で生成してください。商品やサービスの魅力、特徴、使い方などを詳しく説明し、フォロワーが興味を持てるような内容にしてください。150文字を超える場合は、重要な情報を残しつつ150文字以内に収めてください。" : ""}
- テーマ: ${task.description}

必ず以下のJSON形式のみを返してください。JSON以外のテキストは一切含めないでください。

{
  "title": "簡潔で魅力的なタイトル",
  "body": "計画に沿った投稿文（${textLengthGuide}）",
  "hashtags": [
    {
      "tag": "企業・ブランドハッシュタグ（${userProfile?.name || "企業名"}に関連する固有のハッシュタグ、#は不要）",
      "category": "brand",
      "reason": "選定理由（20文字以内）"
    },
    {
      "tag": "トレンド・検索されやすいハッシュタグ（投稿内容のテーマに沿った、検索されやすい大きなハッシュタグ、#は不要）",
      "category": "trending",
      "reason": "選定理由（20文字以内）"
    },
    {
      "tag": "補助的ハッシュタグ1（投稿内容を補完する、より具体的なハッシュタグ、#は不要）",
      "category": "supporting",
      "reason": "選定理由（20文字以内）"
    },
    {
      "tag": "補助的ハッシュタグ2（投稿内容を補完する、より具体的なハッシュタグ、#は不要）",
      "category": "supporting",
      "reason": "選定理由（20文字以内）"
    },
    {
      "tag": "補助的ハッシュタグ3（投稿内容を補完する、より具体的なハッシュタグ、#は不要）",
      "category": "supporting",
      "reason": "選定理由（20文字以内）"
    }
  ]
}

重要: JSON以外のテキストは一切出力しないでください。`;

              const userPrompt = `以下のテーマで${postType === "reel" ? "リール" : postType === "story" ? "ストーリーズ" : "フィード"}投稿文を生成してください:

テーマ: ${task.description}

上記のクライアント情報と運用計画に基づいて、効果的な投稿文を作成してください。`;

              const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                  {
                    role: "system",
                    content: systemPrompt,
                  },
                  {
                    role: "user",
                    content: userPrompt,
                  },
                ],
                temperature: 0.7,
                max_tokens: 1000,
                response_format: { type: "json_object" },
              });

              const aiResponse = completion.choices[0]?.message?.content;
              if (aiResponse) {
                const parsedData = JSON.parse(aiResponse);
                let content = parsedData.body || "";
                
                console.log(`[投稿文生成] ${task.description}: 生成成功, 文字数: ${content.length}`);
                
                // フィードの場合は150文字以内に制限
                if (postType === "feed" && content.length > 150) {
                  let truncated = content.substring(0, 150);
                  const lastPeriod = truncated.lastIndexOf("。");
                  const lastNewline = truncated.lastIndexOf("\n");
                  const lastBreak = Math.max(lastPeriod, lastNewline);
                  if (lastBreak > 100) {
                    truncated = truncated.substring(0, lastBreak + 1);
                  }
                  content = truncated;
                  console.log(`[投稿文生成] ${task.description}: 150文字に切り詰め`);
                }

                // ハッシュタグを抽出
                const hashtags: string[] = [];
                if (parsedData.hashtags && Array.isArray(parsedData.hashtags)) {
                  for (const item of parsedData.hashtags) {
                    if (item.tag) {
                      const cleanTag = item.tag.replace(/^#+/, "").trim();
                      if (cleanTag && cleanTag.length > 0) {
                        hashtags.push(cleanTag);
                      }
                    }
                  }
                }

                const taskIndex = todayTasksFromPlan.indexOf(task);
                console.log(`[投稿文生成] ${task.description}: taskIndex=${taskIndex}, hashtags数=${hashtags.length}`);

                return {
                  taskIndex,
                  content,
                  hashtags,
                };
              }
            } catch (error) {
              console.error(`投稿文生成エラー (${task.description}):`, error);
              return null;
            }
            return null;
          });

          const postGenerationResults = await Promise.all(postGenerationPromises);
          console.log(`[投稿文生成] 生成結果数: ${postGenerationResults.filter(r => r !== null).length}/${postGenerationResults.length}`);
          postGenerationResults.forEach((result) => {
            if (result) {
              postGenerationMap.set(result.taskIndex, {
                content: result.content,
                hashtags: result.hashtags,
              });
              console.log(`[投稿文生成] Mapに設定: taskIndex=${result.taskIndex}, content長=${result.content.length}, hashtags数=${result.hashtags.length}`);
            }
          });
          console.log(`[投稿文生成] Mapサイズ: ${postGenerationMap.size}`);

          const todayTasksPrompt = `以下の情報を基に、今日のタスクを実行する際の具体的なヒントを提案してください。

【計画の目標】
${mainGoal}

【ターゲット層】
${targetAudience || "未設定"}

【今週の戦略テーマ】
${strategyTheme || "未設定"}

【今週の戦略アクション】
${strategyActions.length > 0 ? strategyActions.map((a: string) => `- ${a}`).join("\n") : "未設定"}

【今日のタスク】
${todayTasksFromPlan.map((task, index: number) => 
  `${index + 1}. ${task.time} - ${task.type === "feed" ? "フィード投稿" : task.type === "reel" ? "リール" : "ストーリーズ"}: ${task.description}`
).join("\n")}

【ビジネス情報】
${businessDescription ? `事業内容: ${businessDescription}` : ""}
${businessCatchphrase ? `キャッチフレーズ: ${businessCatchphrase}` : ""}

以下の形式でJSONを返してください:
{
  "tips": [
    {
      "taskIndex": 1,
      "tip": "計画達成のための具体的なヒント（1行で簡潔に）"
    }
  ]
}

計画の目標「${mainGoal}」を達成するために、各タスクを実行する際の具体的で実用的なヒントを提案してください。`;

          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "あなたはInstagram運用の専門家です。保存された計画内容を達成させるために、具体的で実用的なヒントを提案してください。",
              },
              {
                role: "user",
                content: todayTasksPrompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 500,
            response_format: { type: "json_object" },
          });

          const aiResponse = completion.choices[0]?.message?.content;
          if (aiResponse) {
            const parsedResponse = JSON.parse(aiResponse) as { tips?: Array<{ taskIndex: number; tip: string }> };
            if (parsedResponse.tips && Array.isArray(parsedResponse.tips)) {
              todayTasksFromPlan.forEach((task, index: number) => {
                const tip = parsedResponse.tips?.find((t) => t.taskIndex === index + 1) || parsedResponse.tips?.[0];
                const postGeneration = postGenerationMap.get(index);
                console.log(`[今日やること] タスク追加: index=${index}, type=${task.type}, description=${task.description}, hasContent=${!!postGeneration?.content}, hasHashtags=${!!postGeneration?.hashtags && postGeneration.hashtags.length > 0}`);
                todayTasks.push({
                  time: task.time || "",
                  type: task.type || "feed",
                  description: task.description || "",
                  tip: tip?.tip || (task.type === "feed" 
                    ? "商品の魅力を写真と文章で伝えよう"
                    : task.type === "reel"
                    ? "動画で魅力的なコンテンツを発信しよう"
                    : "フォロワーが「へー！」と思う情報を"),
                  generatedContent: postGeneration?.content,
                  generatedHashtags: postGeneration?.hashtags,
                });
              });
            } else {
              // フォールバック
              todayTasksFromPlan.forEach((task, index: number) => {
                const postGeneration = postGenerationMap.get(index);
                todayTasks.push({
                  time: task.time || "",
                  type: task.type || "feed",
                  description: task.description || "",
                  tip: task.type === "feed" 
                    ? "商品の魅力を写真と文章で伝えよう"
                    : task.type === "reel"
                    ? "動画で魅力的なコンテンツを発信しよう"
                    : "フォロワーが「へー！」と思う情報を",
                  generatedContent: postGeneration?.content,
                  generatedHashtags: postGeneration?.hashtags,
                });
              });
            }
          }
        } catch (error) {
          console.error("今日のタスクAI生成エラー:", error);
          // フォールバック（投稿文生成は試行済みの場合のみ含める）
          todayTasksFromPlan.forEach((task, index: number) => {
            const postGeneration = postGenerationMap.get(index);
            todayTasks.push({
              time: task.time || "",
              type: task.type || "feed",
              description: task.description || "",
              tip: task.type === "feed" 
                ? "商品の魅力を写真と文章で伝えよう"
                : task.type === "reel"
                ? "動画で魅力的なコンテンツを発信しよう"
                : "フォロワーが「へー！」と思う情報を",
              generatedContent: postGeneration?.content,
              generatedHashtags: postGeneration?.hashtags,
            });
          });
        }
      } else {
        // AIが使えない場合のフォールバック
        todayTasksFromPlan.forEach((task) => {
          todayTasks.push({
            time: task.time || "",
            type: task.type || "feed",
            description: task.description || "",
            tip: task.type === "feed" 
              ? "商品の魅力を写真と文章で伝えよう"
              : task.type === "reel"
              ? "動画で魅力的なコンテンツを発信しよう"
              : "フォロワーが「へー！」と思う情報を",
          });
        });
      }
    }

    // 明日の準備（明日の計画から）
    const tomorrowPreparation: Array<{
      time: string;
      type: string;
      description: string;
      preparation: string;
    }> = [];

    if (sourceTasks.length > 0) {
      // 曜日マッチング（"月"と"月曜"の両方に対応）
      type Task = { day: string; time: string; type: string; description: string };
      const tomorrowTasksFromPlan = sourceTasks.filter((task: Task) => matchDay(task.day, tomorrowDayName));
      
      // AIに明日の準備を生成してもらう（計画達成のための準備）
      if (tomorrowTasksFromPlan.length > 0) {
        const mainGoal = (formData.mainGoal as string) || "フォロワーを増やす";
        const targetAudience = (formData.targetAudience as string) || "";
        const currentMonthStrategy = aiSuggestion?.monthlyStrategy?.find((s) => s.week === currentWeek);
        const strategyTheme = currentMonthStrategy?.theme || "";
        const strategyActions = currentMonthStrategy?.actions || [];

        const preparationPrompt = `保存された計画内容を達成させるために、以下の投稿予定に基づいて、明日の準備を具体的に提案してください。

【計画の目標】
${mainGoal}

【ターゲット層】
${targetAudience || "未設定"}

【今週の戦略テーマ】
${strategyTheme || "未設定"}

【今週の戦略アクション】
${strategyActions.length > 0 ? strategyActions.map((a: string) => `- ${a}`).join("\n") : "未設定"}

【明日の投稿予定】
${tomorrowTasksFromPlan.map((task, index: number) => 
  `${index + 1}. ${task.time} - ${task.type === "feed" ? "フィード投稿" : task.type === "reel" ? "リール" : "ストーリーズ"}: ${task.description}`
).join("\n")}

【ビジネス情報】
${businessDescription ? `事業内容: ${businessDescription}` : ""}
${businessCatchphrase ? `キャッチフレーズ: ${businessCatchphrase}` : ""}

以下の形式でJSONを返してください:
{
  "preparations": [
    {
      "task": "準備タスクの内容（計画達成のために必要な具体的な準備）",
      "reason": "なぜこの準備が必要か"
    }
  ]
}

計画の目標「${mainGoal}」を達成するために、各投稿予定に対して3-5個の具体的で実用的な準備タスクを提案してください。`;

        try {
          if (openai) {
            const completion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: "あなたはInstagram運用の専門家です。保存された計画内容を達成させるために、投稿予定に基づいて具体的で実用的な準備タスクを提案してください。",
                },
                {
                  role: "user",
                  content: preparationPrompt,
                },
              ],
              temperature: 0.7,
              max_tokens: 500,
              response_format: { type: "json_object" },
            });

            const aiResponse = completion.choices[0]?.message?.content;
            if (aiResponse) {
              const parsedResponse = JSON.parse(aiResponse) as { preparations?: Array<{ task: string; reason?: string }> };
              if (parsedResponse.preparations && parsedResponse.preparations.length > 0) {
                tomorrowTasksFromPlan.forEach((task, index: number) => {
                  const prep = parsedResponse.preparations?.[index] || parsedResponse.preparations?.[0];
                  if (prep) {
                    tomorrowPreparation.push({
                      time: task.time || "",
                      type: task.type || "feed",
                      description: task.description || "",
                      preparation: prep.task || "コンテンツの準備をしましょう",
                    });
                  }
                });
              }
            }
          } else {
            throw new Error("OpenAI API key not configured");
          }
        } catch (error) {
          console.error("AI生成エラー:", error);
          // フォールバック: デフォルトの準備タスク
          tomorrowTasksFromPlan.forEach((task) => {
            tomorrowPreparation.push({
              time: task.time || "",
              type: task.type || "feed",
              description: task.description || "",
              preparation: task.type === "feed" 
                ? "写真とキャプションの準備"
                : task.type === "reel"
                ? "動画コンテンツの準備"
                : "ストーリーズ用のコンテンツ準備",
            });
          });
        }
      }
    }

    // 今月の目標（monthlyGoalsから）
    const monthlyGoals: Array<{
      metric: string;
      target: string;
      progress?: number;
    }> = [];

    if (aiSuggestion?.monthlyGoals) {
      aiSuggestion.monthlyGoals.forEach((goal) => {
        monthlyGoals.push({
          metric: goal.metric || "",
          target: goal.target || "",
        });
      });
    }


    console.log(`[レスポンス] todayTasks数: ${todayTasks.length}`);
    todayTasks.forEach((task, index) => {
      console.log(`[レスポンス] タスク${index}: type=${task.type}, description=${task.description}, hasContent=${!!task.generatedContent}, hasHashtags=${!!task.generatedHashtags && task.generatedHashtags.length > 0}`);
    });

    const responseData = {
      todayTasks,
      tomorrowPreparation,
      monthlyGoals,
      weeklySchedule,
    };

    // キャッシュに保存（24時間有効 - 同じ日・同じ週の間は同じ内容を返す）
    cache.set(cacheKey, responseData, 24 * 60 * 60 * 1000);
    console.log(`[Home AI Sections] キャッシュ保存: ${cacheKey}`);

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("AI生成セクション取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

