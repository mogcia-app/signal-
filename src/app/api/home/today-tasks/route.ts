import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { deriveWeeklyPlans, getCurrentWeekIndex, extractTodayTasks } from "../../../../lib/plans/weekly-plans";
import { getLocalDate } from "../../../../lib/utils/timezone";
import { logger } from "../../../../lib/logger";
import OpenAI from "openai";

// OpenAI APIの初期化
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

/**
 * 今日やることのAI投稿文生成を許可するUIDかどうかを判定
 * - 未設定時: 全ユーザー許可（既存挙動を維持）
 * - 設定時: カンマ区切りUIDのみに制限
 */
function canGenerateTodayTaskAiForUid(uid: string): boolean {
  const allowlist = process.env.HOME_TODAY_TASKS_AI_UID_ALLOWLIST?.trim();
  if (!allowlist) {
    return true;
  }

  const allowedUids = allowlist
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return allowedUids.includes(uid);
}

function getDateKeyInTimezone(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function normalizeDayLabel(day: string): string {
  return day.replace(/曜日|曜/g, "").trim();
}

function dayLabelToIndex(day: string): number {
  const normalized = normalizeDayLabel(day);
  const map: Record<string, number> = {
    日: 0,
    月: 1,
    火: 2,
    水: 3,
    木: 4,
    金: 5,
    土: 6,
  };
  return map[normalized] ?? -1;
}

function stripHashtagsFromContent(raw: string): string {
  if (!raw) return raw;

  const lines = raw
    .split("\n")
    .map((line) => line.trimEnd());

  const filteredLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    // ハッシュタグだけの行（#tag #tag ...）は除去
    if (/^(?:[＃#][^\s#＃]+[\s　]*)+$/.test(trimmed)) {
      return false;
    }
    return true;
  });

  let cleaned = filteredLines.join("\n").trim();
  // 文末に連結されたハッシュタグ群を除去
  cleaned = cleaned.replace(/\s*(?:[＃#][^\s#＃]+[\s　]*){2,}$/u, "").trim();
  return cleaned;
}

/**
 * 投稿内容を基にAIで投稿文とハッシュタグを生成
 */
async function generatePostContent(
  postDescription: string,
  postType: "feed" | "reel" | "story",
  userProfile: { name?: string } | null,
  options?: {
    brandName?: string;
    regionName?: string;
    origin?: string;
    cookie?: string;
    planData?: {
      title: string;
      targetFollowers: number;
      currentFollowers: number;
      planPeriod: string;
      targetAudience: string;
      category: string;
      strategies: string[];
      aiPersona: {
        tone: string;
        style: string;
        personality: string;
        interests: string[];
      };
      simulation: {
        postTypes: {
          reel: { weeklyCount: number; followerEffect: number };
          feed: { weeklyCount: number; followerEffect: number };
          story: { weeklyCount: number; followerEffect: number };
        };
      };
    };
  }
): Promise<{ content: string; hashtags: string[] }> {
  const normalizeTag = (raw: unknown): string => {
    if (typeof raw !== "string") return "";
    return raw
      .replace(/[＃#]+/g, "")
      .replace(/\s+/g, "")
      .trim();
  };

  const withRequiredTags = (rawTags: unknown[]): string[] => {
    const brandTag = normalizeTag(options?.brandName || userProfile?.name || "");
    const regionTag = normalizeTag(options?.regionName || "");
    const aiTags = rawTags.map(normalizeTag).filter(Boolean);
    const unique: string[] = [];
    const pushUnique = (tag: string) => {
      if (!tag) return;
      if (!unique.includes(tag)) {
        unique.push(tag);
      }
    };

    // 1つ目は必ずオンボーディング名のタグ
    pushUnique(brandTag);
    // 地域指定がある場合は必須
    pushUnique(regionTag);
    // 残りをAI生成タグで埋める
    for (const tag of aiTags) {
      pushUnique(tag);
      if (unique.length >= 5) break;
    }

    return unique.slice(0, 5);
  };

  if (!openai) {
    // OpenAI APIキーがない場合はフォールバック
    return {
      content: postDescription,
      hashtags: withRequiredTags([]),
    };
  }

  try {
    // Labと同じ投稿生成APIを優先利用
    if (options?.origin) {
      const fallbackPlanData = options.planData || {
        title: postDescription.slice(0, 30) || "投稿テーマ",
        targetFollowers: 100,
        currentFollowers: 90,
        planPeriod: "1ヶ月",
        targetAudience: "",
        category: "",
        strategies: ["認知拡大"],
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

      const labResponse = await fetch(`${options.origin}/api/ai/post-generation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: options.cookie || "",
        },
        body: JSON.stringify({
          prompt: postDescription,
          postType,
          action: "generatePost",
          autoGenerate: false,
          planData: fallbackPlanData,
        }),
      });

      if (labResponse.ok) {
        const labData = await labResponse.json();
        const generatedContent = labData?.data?.content;
        const generatedHashtags = labData?.data?.hashtags;
        if (typeof generatedContent === "string") {
          return {
            content: stripHashtagsFromContent(generatedContent || postDescription),
            hashtags: withRequiredTags(Array.isArray(generatedHashtags) ? generatedHashtags : []),
          };
        }
      }
    }

    const systemPrompt = `あなたはInstagramマーケティングの専門家です。与えられた投稿テーマに基づいて、魅力的な投稿文と適切なハッシュタグを生成してください。
JSON形式で以下の形式で返してください：
{
  "content": "投稿文（改行を含む、200文字程度）",
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2", ...]（5-10個程度）
}`;

    const userPrompt = `以下のテーマで${postType === "feed" ? "フィード" : postType === "reel" ? "リール" : "ストーリーズ"}投稿の投稿文とハッシュタグを生成してください。

テーマ: ${postDescription}

${userProfile?.name ? `ブランド名: ${userProfile.name}` : ""}

エンゲージメントを高める魅力的な投稿文と、適切なハッシュタグを生成してください。`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI response is empty");
    }

    const parsed = JSON.parse(content);
    return {
      content: stripHashtagsFromContent(parsed.content || postDescription),
      hashtags: withRequiredTags(Array.isArray(parsed.hashtags) ? parsed.hashtags : []),
    };
  } catch (error) {
    console.error("AI投稿文生成エラー:", error);
    // エラー時はフォールバック
    return {
      content: postDescription,
      hashtags: withRequiredTags([]),
    };
  }
}

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
    const canGenerateTodayTaskAi = canGenerateTodayTaskAiForUid(uid);
    let regionNameForHashtag = "";
    const requestOrigin = request.nextUrl.origin;
    const requestCookie = request.headers.get("cookie") || "";
    let labPlanDataForGeneration: {
      title: string;
      targetFollowers: number;
      currentFollowers: number;
      planPeriod: string;
      targetAudience: string;
      category: string;
      strategies: string[];
      aiPersona: {
        tone: string;
        style: string;
        personality: string;
        interests: string[];
      };
      simulation: {
        postTypes: {
          reel: { weeklyCount: number; followerEffect: number };
          feed: { weeklyCount: number; followerEffect: number };
          story: { weeklyCount: number; followerEffect: number };
        };
      };
    } | undefined;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let timezoneForPlan = "Asia/Tokyo";
    let localDateForPlan = getLocalDate(timezoneForPlan);

    const tasks: Array<{
      id: string;
      type: "story" | "comment" | "feed" | "reel";
      title: string;
      description: string;
      recommendedTime?: string;
      content?: string;
      hashtags?: string[];
      count?: number;
      reason?: string;
      priority: "high" | "medium" | "low";
    }> = [];

    // 1. 運用計画を取得（activePlanIdベース）
    const user = await getUserProfile(uid);
    let currentPlan = null;
    
    if (user?.activePlanId) {
      const planDoc = await adminDb.collection("plans").doc(user.activePlanId).get();
      if (planDoc.exists) {
        currentPlan = planDoc.data();
      }
    }
    if (currentPlan?.timezone) {
      timezoneForPlan = currentPlan.timezone;
      localDateForPlan = getLocalDate(timezoneForPlan);
    }

    // 1日固定キャッシュ: 同じ日付・同じactivePlanIdなら再生成せず返す
    const todayTasksCacheId = `${uid}_${localDateForPlan}`;
    const todayTasksCacheRef = adminDb.collection("home_today_tasks_cache").doc(todayTasksCacheId);
    const todayTasksCacheSnap = await todayTasksCacheRef.get();
    if (todayTasksCacheSnap.exists) {
      const cached = todayTasksCacheSnap.data() as {
        activePlanId?: string | null;
        data?: {
          tasks?: Array<{
            id: string;
            type: "story" | "comment" | "feed" | "reel";
            title: string;
            description: string;
            recommendedTime?: string;
            content?: string;
            hashtags?: string[];
            count?: number;
            reason?: string;
            priority: "high" | "medium" | "low";
          }>;
          tomorrowPreparations?: Array<{
            type: "feed" | "reel" | "story";
            description: string;
            content?: string;
            hashtags?: string[];
            preparation: string;
          }>;
          planExists?: boolean;
          totalTasks?: number;
        };
      };
      const samePlan = (cached.activePlanId || null) === (user?.activePlanId || null);
      if (samePlan && cached.data) {
        return NextResponse.json({
          success: true,
          data: cached.data,
        });
      }
    }

    // 2. 今日スケジュールされた投稿を取得
    const postsSnapshot = await adminDb
      .collection("posts")
      .where("userId", "==", uid)
      .get();

    const allScheduledPosts = postsSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        const scheduledDate = data.scheduledDate?.toDate?.() || data.scheduledDate;
        if (!scheduledDate) {
          return null;
        }
        const scheduled = scheduledDate instanceof Date ? scheduledDate : new Date(scheduledDate);
        return {
          id: doc.id,
          type: data.postType || "feed",
          content: data.content || "",
          title: data.title || "",
          scheduledTime: scheduled,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      type: string;
      content: string;
      title: string;
      scheduledTime: Date;
    }>;
    let todayScheduledPosts = allScheduledPosts.filter(
      (post) => getDateKeyInTimezone(post.scheduledTime, timezoneForPlan) === localDateForPlan
    );

    // 3. 今週のコンテンツ計画を取得（保存済みplanDataから）
    let weeklyPlanContent: {
      feedPosts: Array<{ day: string; content: string; title?: string; type: string }>;
      storyContent: string | string[];
    } | null = null;
    let fallbackPostCandidate: { type: "feed" | "reel" | "story"; title: string } | null = null;

    // weekly-plansの内部HTTP呼び出しは行わず、保存済みplanDataを直接利用する

    // 4. 運用計画から今日の投稿タスクを生成
    // 重要: HomeではaiSuggestionの生成を行ってはならない（完全禁止）
    // Homeは必ずplan.formData + simulationResultからweeklyPlansを導出する
    if (currentPlan) {
      const formData = (currentPlan.formData || {}) as Record<string, unknown>;
      regionNameForHashtag =
        formData.regionRestriction === "restricted" && typeof formData.regionName === "string"
          ? formData.regionName
          : "";
      labPlanDataForGeneration = {
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
      const simulationResult = currentPlan.simulationResult as Record<string, unknown> | null;
      const timezone = currentPlan.timezone || "Asia/Tokyo";
      const localDate = getLocalDate(timezone);
      timezoneForPlan = timezone;
      localDateForPlan = localDate;
      todayScheduledPosts = allScheduledPosts.filter(
        (post) => getDateKeyInTimezone(post.scheduledTime, timezoneForPlan) === localDateForPlan
      );
      
      // 今日の曜日を取得（計画タイムゾーン基準）
      const [localYear, localMonth, localDay] = localDate.split("-").map(Number);
      const localToday = new Date(localYear, localMonth - 1, localDay);
      const dayOfWeek = localToday.getDay(); // 0=日曜, 1=月曜, ...
      const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
      const todayDayName = dayNames[dayOfWeek];

      // 保存済みplanDataから今週の計画を取得
      const savedPlanData = (currentPlan.planData || null) as {
        weeklyPlans?: Array<{
          week: number;
          feedPosts?: Array<{ day: string; content: string; title?: string; type?: string }>;
          storyContent?: string | string[];
        }>;
        startDate?: unknown;
      } | null;

      if (savedPlanData?.weeklyPlans?.length) {
        const planStartForWeek = savedPlanData.startDate || currentPlan.startDate || currentPlan.createdAt || new Date();
        const currentWeek = getCurrentWeekIndex(planStartForWeek as Date | string, localDate, timezone) + 1;
        const currentWeekPlan =
          savedPlanData.weeklyPlans.find((week) => week.week === currentWeek) || savedPlanData.weeklyPlans[0];

        if (currentWeekPlan) {
          weeklyPlanContent = {
            feedPosts: (currentWeekPlan.feedPosts || []).map((post) => ({
              day: post.day,
              content: post.content,
              title: post.title,
              type: post.type || "feed",
            })),
            storyContent: currentWeekPlan.storyContent || [],
          };
        }
      }
      
      // weekly-plansから今日の投稿内容を取得
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

        const minOffset =
          postsWithOffset.length > 0
            ? Math.min(...postsWithOffset.map((item) => item.offset))
            : null;
        const nearestFeedPosts =
          minOffset === null
            ? []
            : postsWithOffset
                .filter((item) => item.offset === minOffset)
                .map((item) => item.post);

        for (const post of nearestFeedPosts) {
          const postType = (post.type || "feed") as "feed" | "reel" | "story";
          const postTitle = post.title || post.content || "";
          const hasScheduled = todayScheduledPosts.some(
            (scheduledPost) => scheduledPost.type === postType
          );

          if (!hasScheduled) {
            const generated = canGenerateTodayTaskAi
              ? await generatePostContent(postTitle, postType, user, {
                  brandName: user?.name,
                  regionName: regionNameForHashtag,
                  origin: requestOrigin,
                  cookie: requestCookie,
                  planData: labPlanDataForGeneration,
                })
              : { content: "", hashtags: [] as string[] };

            const typeLabels: Record<string, string> = {
              feed: "フィード投稿",
              reel: "リール",
              story: "ストーリーズ",
            };

            tasks.push({
              id: `weekly-plan-${post.day}-${postType}-${today.getTime()}`,
              type: postType,
              title: `${typeLabels[postType] || postType}を投稿する`,
              description: postTitle,
              recommendedTime: "推奨時間未設定",
              ...(generated.content ? { content: generated.content } : {}),
              ...(generated.hashtags.length > 0 ? { hashtags: generated.hashtags } : {}),
              reason:
                minOffset === 0
                  ? `今週のコンテンツ計画: ${postTitle}`
                  : `今週のコンテンツ計画（最短: ${post.day}）: ${postTitle}`,
              priority: "high",
            });
          }
        }
      }

      // 既存のロジック（後方互換性のため）
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
      
      // 週番号を取得（plan.startDate基準）
      const planStart = currentPlan.startDate 
        ? (currentPlan.startDate instanceof Date 
            ? currentPlan.startDate 
            : currentPlan.startDate.toDate 
              ? currentPlan.startDate.toDate() 
              : new Date(currentPlan.startDate))
        : currentPlan.createdAt 
          ? (currentPlan.createdAt instanceof Date 
              ? currentPlan.createdAt 
              : currentPlan.createdAt.toDate 
                ? currentPlan.createdAt.toDate() 
                : new Date(currentPlan.createdAt))
          : new Date();
      
      const weekIndex = getCurrentWeekIndex(planStart, localDate, timezone);

      const currentWeekTasks = weeklyPlans[weekIndex]?.tasks || [];
      const firstWeekWithTasks = weeklyPlans.find((week) => week.tasks.length > 0);
      const candidateTask = currentWeekTasks[0] || firstWeekWithTasks?.tasks?.[0];
      if (candidateTask) {
        fallbackPostCandidate = {
          type: candidateTask.type,
          title: candidateTask.description || "次回投稿",
        };
      }
      
      // 今日のタスクを抽出（weekly-plansから取得できなかった場合のフォールバック）
      if (!weeklyPlanContent || weeklyPlanContent.feedPosts.length === 0) {
        const todayTasksFromPlan = extractTodayTasks(weeklyPlans, localDate, weekIndex);
        
        if (todayTasksFromPlan.length > 0) {
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
          
          for (const task of todayTasksFromPlan) {
            const taskType = typeTaskTypes[task.type] || "feed";
            const hasScheduled = todayScheduledPosts.some(
              (post) => post.type === taskType
            );
            
            if (!hasScheduled) {
              const generated = canGenerateTodayTaskAi
                ? await generatePostContent(task.description || "", taskType, user, {
                    brandName: user?.name,
                    regionName: regionNameForHashtag,
                    origin: requestOrigin,
                    cookie: requestCookie,
                    planData: labPlanDataForGeneration,
                  })
                : { content: "", hashtags: [] as string[] };

              tasks.push({
                id: `ai-plan-${task.day}-${task.type}-${today.getTime()}`,
                type: taskType,
                title: `${typeLabels[task.type] || task.type}を投稿する`,
                description: task.description || "",
                recommendedTime: task.time || "推奨時間未設定",
                ...(generated.content ? { content: generated.content } : {}),
                ...(generated.hashtags.length > 0 ? { hashtags: generated.hashtags } : {}),
                reason: `週次計画（第${weekIndex + 1}週）に基づくタスク`,
                priority: "high",
              });
            }
          }
        }
      }
      
      // 投稿頻度から今日のタスクを決定（既存ロジック、後方互換性のため）
      const dayName = todayDayName;

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
      const feedFreq = (formData.feedFreq as string) || (formData.availableTime as string) || "";
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
      const reelFreq = (formData.reelFreq as string) || (formData.reelCapability as string) || "";
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

    // 投稿タスクが1件もない場合でも、許可UIDには次回投稿の準備タスクを1件表示する
    const hasPostingTask = tasks.some((task) =>
      task.type === "feed" || task.type === "reel" || task.type === "story"
    );
    if (canGenerateTodayTaskAi && !hasPostingTask) {
      const [fallbackYear, fallbackMonth, fallbackDay] = localDateForPlan.split("-").map(Number);
      const fallbackLocalToday = new Date(fallbackYear, fallbackMonth - 1, fallbackDay);
      const fallbackDayOfWeek = fallbackLocalToday.getDay();

      const nearestPostFromWeeklyPlan = weeklyPlanContent?.feedPosts?.length
        ? weeklyPlanContent.feedPosts
            .map((post) => {
              const postDayIndex = dayLabelToIndex(post.day || "");
              if (postDayIndex < 0) {
                return null;
              }
              const offset = (postDayIndex - fallbackDayOfWeek + 7) % 7;
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

      if (!nextPost) {
        // 投稿候補が見つからない場合はスキップ
      } else {
        const nextPostType = (nextPost.type || "feed") as "feed" | "reel" | "story";
        const nextPostTitle = nextPost.title || nextPost.content || "次回投稿";
      const generated = await generatePostContent(nextPostTitle, nextPostType, user, {
        brandName: user?.name,
        regionName: regionNameForHashtag,
        origin: requestOrigin,
        cookie: requestCookie,
        planData: labPlanDataForGeneration,
      });

      tasks.push({
        id: `fallback-next-post-${today.getTime()}`,
        type: nextPostType,
        title: "次回投稿の下書きを準備する",
        description: nextPostTitle,
        recommendedTime: "今日中",
        ...(generated.content ? { content: generated.content } : {}),
        ...(generated.hashtags.length > 0 ? { hashtags: generated.hashtags } : {}),
        reason: "本日の投稿予定がないため、今週の予定から次回投稿の準備を提案",
        priority: "medium",
      });
      }
    }

    // 投稿文付きタスクがある日は「コメントに返信する」を表示しない
    const hasGeneratedPostTask = tasks.some(
      (task) => (task.type === "feed" || task.type === "reel" || task.type === "story") && !!task.content
    );
    const filteredTasks = hasGeneratedPostTask
      ? tasks.filter((task) => task.type !== "comment")
      : tasks;

    // 明日の準備を生成（計画タイムゾーン基準）
    const [todayYear, todayMonth, todayDay] = localDateForPlan.split("-").map(Number);
    const todayLocal = new Date(todayYear, todayMonth - 1, todayDay);
    const tomorrow = new Date(todayLocal);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDayOfWeek = tomorrow.getDay();
    const dayNamesForTomorrow = ["日", "月", "火", "水", "木", "金", "土"];
    const tomorrowDayName = dayNamesForTomorrow[tomorrowDayOfWeek];
    
    const tomorrowPreparations: Array<{
      type: "feed" | "reel" | "story";
      description: string;
      content?: string;
      hashtags?: string[];
      preparation: string;
    }> = [];

    if (weeklyPlanContent) {
      const tomorrowFeedPosts = weeklyPlanContent.feedPosts.filter(
        (post) => normalizeDayLabel(post.day || "") === tomorrowDayName
      );

      for (const post of tomorrowFeedPosts) {
        const postType = (post.type || "feed") as "feed" | "reel" | "story";
        const postTitle = post.title || post.content || "";
        
        // AIで投稿文とハッシュタグを生成
        const generated = await generatePostContent(
          postTitle,
          postType,
          user,
          {
            brandName: user?.name,
            regionName: regionNameForHashtag,
            origin: requestOrigin,
            cookie: requestCookie,
            planData: labPlanDataForGeneration,
          }
        );

        tomorrowPreparations.push({
          type: postType,
          description: postTitle,
          content: generated.content,
          hashtags: generated.hashtags,
          preparation: `明日の${postType === "feed" ? "フィード" : postType === "reel" ? "リール" : "ストーリーズ"}投稿の準備をしましょう。投稿文とハッシュタグを確認してください。`,
        });
      }
    }

    const responseData = {
      tasks: filteredTasks,
      tomorrowPreparations,
      planExists: !!currentPlan,
      totalTasks: filteredTasks.length,
    };

    try {
      await todayTasksCacheRef.set(
        {
          uid,
          localDate: localDateForPlan,
          timezone: timezoneForPlan,
          activePlanId: user?.activePlanId || null,
          data: responseData,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch (cacheError) {
      console.error("Today tasks cache save error:", cacheError);
    }

    return NextResponse.json({
      success: true,
      data: responseData,
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
