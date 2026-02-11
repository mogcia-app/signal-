import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { PlanRepository } from "@/repositories/plan-repository";
import { PlanEngine } from "@/domain/plan/plan-engine";
import { getLocalDate } from "../../../../lib/utils/timezone";
import { getCurrentWeekIndex } from "@/lib/plans/weekly-plans";
import { adminDb } from "@/lib/firebase-admin";
import { StrategyPlan } from "@/domain/plan/strategy-plan";

function toPersistablePlanData(strategyPlan: StrategyPlan) {
  return {
    weeklyPlans: strategyPlan.weeklyPlans,
    schedule: strategyPlan.schedule,
    expectedResults: strategyPlan.expectedResults,
    difficulty: strategyPlan.difficulty,
    monthlyGrowthRate: strategyPlan.monthlyGrowthRate,
    features: strategyPlan.features || [],
    suggestedContentTypes: strategyPlan.suggestedContentTypes || [],
    startDate: strategyPlan.startDate,
    endDate: strategyPlan.endDate,
  };
}

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

function buildScheduleTitle(
  postType: string,
  rawContent: string,
  weekTheme: string
): string {
  const content = (rawContent || "").replace(/\s+/g, " ").trim().replace(/。$/, "");
  const isGenericReel =
    content === "" || content === "リール投稿" || content === "リール動画の投稿";

  if (postType === "reel" && isGenericReel) {
    return weekTheme ? `${weekTheme}（リール）` : "リール投稿";
  }

  if (!content) {
    if (postType === "reel") return "リール投稿";
    if (postType === "story") return "ストーリーズ投稿";
    return "フィード投稿";
  }

  return content.length > 24 ? `${content.slice(0, 24)}…` : content;
}

function weeklyOptionToCount(option: unknown): number {
  if (option === "none") return 0;
  if (option === "weekly-1-2") return 2;
  if (option === "weekly-3-4") return 4;
  if (option === "daily") return 7;
  return 0;
}

/**
 * ホームページ用: 週次コンテンツ計画を取得
 * 
 * StrategyPlanから現在の週の計画を取得して返す
 */
export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "home-weekly-plans", limit: 60, windowSeconds: 60 },
      auditEventName: "home_weekly_plans_access",
    });

    // PlanInputを取得
    const planInput = await PlanRepository.getActivePlanInput(uid, "instagram");
    if (!planInput) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // 計画の開始日と終了日を確認（表示は継続し、ログのみ）
    const planStartDate = new Date(planInput.startDate);
    const planEndDate = new Date(planStartDate);
    planEndDate.setMonth(planEndDate.getMonth() + 1); // デフォルト1ヶ月
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    planStartDate.setHours(0, 0, 0, 0);
    planEndDate.setHours(23, 59, 59, 999);
    
    // 計画の期間外（開始前または終了後）の場合でも、表示用にフォールバックする
    if (today < planStartDate || today > planEndDate) {
      console.log("[Home Weekly Plans] 計画の期間外:", {
        today: today.toISOString().split("T")[0],
        planStartDate: planStartDate.toISOString().split("T")[0],
        planEndDate: planEndDate.toISOString().split("T")[0],
      });
    }

    // 保存されたplanDataを取得（weeklyPlansを含む）
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const activePlanId = userDoc.data()?.activePlanId;
    let savedStrategyPlan: StrategyPlan | null = null;
    let generatedStrategyPlan: StrategyPlan | null = null;

    if (activePlanId) {
      const planDoc = await adminDb.collection("plans").doc(activePlanId).get();
      const planData = planDoc.data();
      if (planData?.planData && typeof planData.planData === "object") {
        const savedPlanData = planData.planData as {
          weeklyPlans?: StrategyPlan["weeklyPlans"];
          schedule?: StrategyPlan["schedule"];
          expectedResults?: StrategyPlan["expectedResults"];
          difficulty?: StrategyPlan["difficulty"];
          monthlyGrowthRate?: StrategyPlan["monthlyGrowthRate"];
          features?: StrategyPlan["features"];
          suggestedContentTypes?: StrategyPlan["suggestedContentTypes"];
          startDate?: unknown;
          endDate?: unknown;
        };

        if (savedPlanData.weeklyPlans && savedPlanData.schedule) {
          // 保存されたweeklyPlansを使用
          savedStrategyPlan = {
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
          console.log("[Home Weekly Plans] 保存されたweeklyPlansを使用");
        }
      }
    }

    // 保存されたplanDataがない場合のみAI生成を実行
    let strategyPlan: StrategyPlan;
    if (savedStrategyPlan) {
      strategyPlan = savedStrategyPlan;
    } else {
      console.log("[Home Weekly Plans] 保存されたplanDataがないため、AI生成を実行");
      // 先月の実績データを取得
      const lastMonthPerformance = await PlanRepository.getLastMonthPerformance(
        uid,
        new Date(planInput.startDate)
      );

      // ユーザープロファイルを取得
      const userProfile = await getUserProfile(uid);
      if (!userProfile) {
        return NextResponse.json({
          success: false,
          error: "ユーザープロファイルが見つかりません",
        }, { status: 404 });
      }

      // StrategyPlanを生成（AI生成を含む）
      generatedStrategyPlan = await PlanEngine.buildStrategy(
        planInput,
        userProfile,
        lastMonthPerformance
      );
      strategyPlan = generatedStrategyPlan;
    }

    // デバッグ: weeklyPlansのfeedPostsにdayフィールドが含まれているか確認
    console.log("[Home Weekly Plans] StrategyPlan生成後の検証:", {
      weeklyPlansCount: strategyPlan.weeklyPlans.length,
      weeklyPlans: strategyPlan.weeklyPlans.map(wp => ({
        week: wp.week,
        feedPostsCount: wp.feedPosts.length,
        feedPosts: wp.feedPosts.map(p => ({
          hasDay: !!p.day,
          day: p.day,
          content: p.content?.substring(0, 50),
          type: p.type,
        })),
      })),
      postingDays: strategyPlan.schedule.postingDays.map(pd => ({
        day: pd.day,
        time: pd.time,
        type: pd.type,
      })),
    });

    // 現在の週を計算
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
    const minWeek = availableWeeks[0] || 1;
    const maxWeek = availableWeeks[availableWeeks.length - 1] || 1;
    const currentWeek = Math.min(Math.max(requestedWeek, minWeek), maxWeek);

    if (requestedWeek !== currentWeek) {
      console.log("[Home Weekly Plans] 週番号をフォールバック:", {
        requestedWeek,
        currentWeek,
        availableWeeks,
      });
    }

    let currentWeekPlan = strategyPlan.weeklyPlans.find(wp => wp.week === currentWeek);
    
    // 現在の週の計画が未生成なら、その週だけ生成して確定保存する
    if (!currentWeekPlan) {
      if (!generatedStrategyPlan) {
        const userProfile = await getUserProfile(uid);
        if (!userProfile) {
          return NextResponse.json({
            success: false,
            error: "ユーザープロファイルが見つかりません",
          }, { status: 404 });
        }
        const lastMonthPerformance = await PlanRepository.getLastMonthPerformance(
          uid,
          new Date(planInput.startDate)
        );
        generatedStrategyPlan = await PlanEngine.buildStrategy(
          planInput,
          userProfile,
          lastMonthPerformance
        );
      }

      const generatedCurrentWeekPlan = generatedStrategyPlan.weeklyPlans.find(
        (wp) => wp.week === currentWeek
      );

      if (!generatedCurrentWeekPlan) {
        const fallbackCurrentWeekPlan = generatedStrategyPlan.weeklyPlans
          .slice()
          .sort((a, b) => b.week - a.week)[0];

        if (fallbackCurrentWeekPlan) {
          currentWeekPlan = fallbackCurrentWeekPlan;
          strategyPlan = {
            ...strategyPlan,
            weeklyPlans: [
              ...strategyPlan.weeklyPlans.filter((wp) => wp.week !== fallbackCurrentWeekPlan.week),
              fallbackCurrentWeekPlan,
            ].sort((a, b) => a.week - b.week),
            updatedAt: new Date(),
          };
          if (activePlanId) {
            await adminDb.collection("plans").doc(activePlanId).set(
              {
                planData: toPersistablePlanData(strategyPlan),
              },
              { merge: true }
            );
          }
        } else {
        console.log("[Home Weekly Plans] 現在の週の計画が見つかりません:", {
          currentWeek,
          availableWeeks: strategyPlan.weeklyPlans.map(wp => wp.week),
        });
        return NextResponse.json({
          success: true,
          data: null,
        });
        }
      } else {
        const mergedWeeklyPlans = [
          ...strategyPlan.weeklyPlans.filter((wp) => wp.week !== currentWeek),
          generatedCurrentWeekPlan,
        ].sort((a, b) => a.week - b.week);

        strategyPlan = {
          ...strategyPlan,
          weeklyPlans: mergedWeeklyPlans,
          updatedAt: new Date(),
        };
        currentWeekPlan = generatedCurrentWeekPlan;

        if (activePlanId) {
          await adminDb.collection("plans").doc(activePlanId).set(
            {
              planData: toPersistablePlanData(strategyPlan),
            },
            { merge: true }
          );
        }
      }
    }

    // 初回生成時は「今週分のみ」を確定保存して、次週以降は週の切替時に追加生成する
    if (!savedStrategyPlan && currentWeekPlan && activePlanId) {
      strategyPlan = {
        ...strategyPlan,
        weeklyPlans: [currentWeekPlan],
        updatedAt: new Date(),
      };
      await adminDb.collection("plans").doc(activePlanId).set(
        {
          planData: toPersistablePlanData(strategyPlan),
        },
        { merge: true }
      );
    }

    // 既存の古い計画（先の週まで事前生成済み）を週次生成方式に寄せる
    // 今週より先の週は一旦保持せず、週切り替え時に必要分のみ生成する
    if (
      activePlanId &&
      strategyPlan.weeklyPlans.some((wp) => wp.week > currentWeek)
    ) {
      strategyPlan = {
        ...strategyPlan,
        weeklyPlans: strategyPlan.weeklyPlans.filter((wp) => wp.week <= currentWeek),
        updatedAt: new Date(),
      };
      await adminDb.collection("plans").doc(activePlanId).set(
        {
          planData: toPersistablePlanData(strategyPlan),
        },
        { merge: true }
      );
    }

    // 計画開始日の翌日から動けるスケジュールにする
    // 表示用の週基準日は「計画開始日 + 1日」
    const strategyStartDate = new Date(strategyPlan.startDate);
    const scheduleBaseDate = new Date(strategyStartDate);
    scheduleBaseDate.setDate(scheduleBaseDate.getDate() + 1);
    const planStartDayOfWeek = scheduleBaseDate.getDay(); // 表示基準日の曜日（0=日曜, 1=月曜, ..., 6=土曜）
    
    // 現在の週の開始日を計算（表示基準日を基準に）
    const currentWeekStartDate = new Date(scheduleBaseDate);
    currentWeekStartDate.setDate(scheduleBaseDate.getDate() + (currentWeek - 1) * 7);
    
    // 曜日名から日付を計算する関数
    const dayNameToIndex: Record<string, number> = {
      "日": 0, "月": 1, "火": 2, "水": 3, "木": 4, "金": 5, "土": 6,
    };
    
    const getPostDate = (dayName: string): { date: string; month: number; day: number; dayName: string; sortValue: number } => {
      if (!dayName) {
        console.warn("[Home Weekly Plans] dayName is empty");
        return {
          date: "",
          month: 0,
          day: 0,
          dayName: "",
          sortValue: Number.MAX_SAFE_INTEGER,
        };
      }

      const dayNameOnly = dayName.replace("曜", "").replace("曜日", "").trim();
      const dayIndex = dayNameToIndex[dayNameOnly] ?? 0;
      
      if (dayIndex === 0 && !dayNameToIndex[dayNameOnly]) {
        console.warn("[Home Weekly Plans] Unknown day name:", dayName, "dayNameOnly:", dayNameOnly);
      }
      
      // 計画開始日の曜日を基準に、その週の範囲内で日付を計算
      // 例：計画開始日が木曜日（4）の場合、その週は木(4)→金(5)→土(6)→日(0)→月(1)→火(2)→水(3)
      // 曜日名が「火」の場合、計画開始日の曜日（4）から「火」（2）までの日数を計算
      let dayOffset = 0;
      if (dayIndex >= planStartDayOfWeek) {
        // 同じ週内（計画開始日の曜日以降）
        dayOffset = dayIndex - planStartDayOfWeek;
      } else {
        // 次の週の前半（計画開始日の曜日より前）
        dayOffset = (7 - planStartDayOfWeek) + dayIndex;
      }
      
      const postDate = new Date(currentWeekStartDate);
      postDate.setDate(currentWeekStartDate.getDate() + dayOffset);
      
      // 実際の曜日を確認（検証用）
      const actualDayOfWeek = postDate.getDay();
      if (actualDayOfWeek !== dayIndex) {
        console.warn("[Home Weekly Plans] 日付と曜日が一致しません:", {
          dayName,
          dayNameOnly,
          dayIndex,
          planStartDayOfWeek,
          dayOffset,
          actualDayOfWeek,
          postDate: postDate.toISOString().split("T")[0],
          currentWeekStartDate: currentWeekStartDate.toISOString().split("T")[0],
        });
      }
      
      return {
        date: `${postDate.getMonth() + 1}/${postDate.getDate()}`,
        month: postDate.getMonth() + 1,
        day: postDate.getDate(),
        dayName: dayNameOnly,
        sortValue: postDate.getTime(),
      };
    };

    // 投稿の時間を取得する関数
    const getPostTime = (dayName: string, postType: string): string => {
      if (!dayName) {
        return postType === "story" ? "11:00" : "13:00";
      }

      const dayNameOnly = dayName.replace("曜", "").replace("曜日", "").trim();
      if (postType === "story") {
        const storyDay = strategyPlan.schedule.storyDays.find(sd => {
          if (!sd.day) return false;
          const sdDay = sd.day.replace("曜", "").replace("曜日", "").trim();
          return sdDay === dayNameOnly;
        });
        return storyDay?.time || "11:00";
      }

      const postingDay = strategyPlan.schedule.postingDays.find(pd => {
        if (!pd.day) return false;
        const pdDay = pd.day.replace("曜", "").replace("曜日", "").trim();
        return pdDay === dayNameOnly && (pd.type === postType || (!pd.type && postType === "feed"));
      });
      
      if (!postingDay) {
        console.warn("[Home Weekly Plans] No postingDay found for:", {
          dayName,
          dayNameOnly,
          postType,
          availablePostingDays: strategyPlan.schedule.postingDays.map(pd => ({
            day: pd.day,
            time: pd.time,
            type: pd.type,
          })),
        });
      }
      
      return postingDay?.time || "13:00";
    };

    // 全週の計画も返す（今後の拡張用）
    const allWeeklyPlans = strategyPlan.weeklyPlans.map(wp => ({
      week: wp.week,
      targetFollowers: wp.targetFollowers,
      increase: wp.increase,
      theme: wp.theme,
      feedPosts: wp.feedPosts.map(post => ({
        day: post.day,
        content: post.content,
        title: buildScheduleTitle(post.type || "feed", post.content || "", wp.theme || ""),
        type: post.type || "feed",
      })),
      storyContent: Array.isArray(wp.storyContent) ? wp.storyContent : [],
    }));

    return NextResponse.json({
      success: true,
      data: {
        currentWeek,
        currentWeekPlan: currentWeekPlan ? {
          week: currentWeekPlan.week,
          targetFollowers: currentWeekPlan.targetFollowers,
          increase: currentWeekPlan.increase,
          theme: currentWeekPlan.theme,
          feedPosts: (() => {
            const storyContentList = Array.isArray(currentWeekPlan.storyContent)
              ? currentWeekPlan.storyContent
              : [];
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
            const weeklyPostsForDisplay = [...currentWeekPlan.feedPosts, ...storyPosts];

            const mapped = weeklyPostsForDisplay.map((post, index) => {
              const postType = (post.type || "feed") as "feed" | "reel" | "story";
              let dayName = post.day;
              if (!dayName) {
                const dayNames = ["月", "火", "水", "木", "金", "土", "日"];
                dayName = dayNames[index % 7];
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
                if (!isGeneric) return true;
                return !arr.some(
                  (other) =>
                    other !== item &&
                    other.day === item.day &&
                    other.type === item.type &&
                    !genericTitles.includes(other.title || "")
                );
              });

            const expectedFeedCount = weeklyOptionToCount(planInput.weeklyPosts);
            const expectedReelCount = weeklyOptionToCount(planInput.reelCapability);
            const feedNow = cleaned.filter((p) => p.type === "feed").length;
            const reelNow = cleaned.filter((p) => p.type === "reel").length;
            const neededFeed = Math.max(0, expectedFeedCount - feedNow);
            const neededReel = Math.max(0, expectedReelCount - reelNow);

            const usedKeys = new Set(cleaned.map((p) => `${p.type}|${p.day}`));
            const createFallback = (type: "feed" | "reel", idx: number) => {
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
              .map(({ sortValue, ...rest }) => rest);
          })(),
          storyContent: Array.isArray(currentWeekPlan.storyContent) 
            ? currentWeekPlan.storyContent 
            : [],
        } : null,
        allWeeklyPlans,
        schedule: {
          weeklyFrequency: strategyPlan.schedule.weeklyFrequency,
          postingDays: strategyPlan.schedule.postingDays,
          storyDays: strategyPlan.schedule.storyDays,
        },
      },
    });
  } catch (error) {
    console.error("[Home Weekly Plans] エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
