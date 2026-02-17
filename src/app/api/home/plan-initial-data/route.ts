import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/repositories/collections";

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthDiff(fromMonthKey: string, toMonthKey: string): number {
  const [fromYear, fromMonth] = fromMonthKey.split("-").map(Number);
  const [toYear, toMonth] = toMonthKey.split("-").map(Number);
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

export async function GET(request: NextRequest) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "home-plan-initial", limit: 30, windowSeconds: 60 },
      auditEventName: "home_plan_initial",
    });

    const userProfile = await getUserProfile(userId);
    const initialFollowers = userProfile?.businessInfo?.initialFollowers || 0;
    const accountCreationDate = userProfile?.businessInfo?.accountCreationDate;

    const plansSnapshot = await adminDb
      .collection(COLLECTIONS.PLANS)
      .where("userId", "==", userId)
      .where("snsType", "==", "instagram")
      .where("status", "==", "active")
      .limit(1)
      .get();

    let currentFollowers = initialFollowers;
    let hasExistingPlan = false;
    let existingPlanData: Record<string, unknown> | null = null;
    let simulationResult: Record<string, unknown> | null = null;

    const now = new Date();
    const currentMonth = toMonthKey(now);
    const toolStartDateRaw = userProfile?.contractStartDate || userProfile?.createdAt || new Date().toISOString();
    const toolStartDate = new Date(toolStartDateRaw);
    const toolStartMonth = toMonthKey(toolStartDate);
    const monthsSinceStart = monthDiff(toolStartMonth, currentMonth);

    if (monthsSinceStart <= 0) {
      currentFollowers = initialFollowers;
    } else {
      const followerCountSnapshot = await adminDb
        .collection(COLLECTIONS.FOLLOWER_COUNTS)
        .where("userId", "==", userId)
        .where("snsType", "==", "instagram")
        .get();

      const kpiFollowersTotal = followerCountSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        const month = typeof data.month === "string" ? data.month : "";
        if (!month || month > currentMonth) {
          return sum;
        }
        return sum + (Number(data.followers) || 0);
      }, 0);

      currentFollowers = initialFollowers + kpiFollowersTotal;
    }

    if (!plansSnapshot.empty) {
      hasExistingPlan = true;
      const planDoc = plansSnapshot.docs[0];
      const planData = planDoc.data();
      simulationResult = (planData.simulationResult || planData.planData || null) as Record<string, unknown> | null;
      const formData = (planData.formData || {}) as Record<string, unknown>;

      let startDateStr: string;
      if (typeof formData.startDate === "string") {
        startDateStr = formData.startDate;
      } else if (planData.startDate) {
        const startDateObj = planData.startDate?.toDate?.() || planData.startDate;
        if (startDateObj instanceof Date) {
          startDateStr = startDateObj.toISOString().split("T")[0];
        } else {
          startDateStr = new Date().toISOString().split("T")[0];
        }
      } else {
        startDateStr = new Date().toISOString().split("T")[0];
      }

      if (planData.planData) {
        const savedPlanData = planData.planData as Record<string, unknown>;
        existingPlanData = {
          planId: planDoc.id,
          startDate: startDateStr,
          currentFollowers: (savedPlanData.currentFollowers as number) || (formData.currentFollowers as number) || 0,
          targetFollowers: (savedPlanData.targetFollowers as number) || (formData.targetFollowers as number) || 0,
          targetFollowerOption: (formData.targetFollowerOption as string) || "",
          customTargetFollowers: (formData.customTargetFollowers as string) || "",
          operationPurpose: (savedPlanData.operationPurpose as string) || (formData.operationPurpose as string) || "",
          weeklyPosts:
            (() => {
              const weeklyFreq =
                (savedPlanData.schedule as { weeklyFrequency?: string })?.weeklyFrequency
                  ?.replace("週", "")
                  .replace("回", "") || "";
              const weeklyNum = parseInt(weeklyFreq, 10) || 0;
              if (weeklyNum === 0) {return "none";}
              if (weeklyNum <= 2) {return "weekly-1-2";}
              if (weeklyNum <= 4) {return "weekly-3-4";}
              return "daily";
            })() ||
            (formData.weeklyPosts as string) ||
            "weekly-1-2",
          reelCapability:
            (() => {
              const reelPosts = (savedPlanData.schedule as { reelPosts?: number })?.reelPosts || 0;
              const weeklyReelPosts = reelPosts / 4;
              if (weeklyReelPosts === 0) {return "none";}
              if (weeklyReelPosts <= 2) {return "weekly-1-2";}
              if (weeklyReelPosts <= 4) {return "weekly-3-4";}
              return "daily";
            })() ||
            (formData.reelCapability as string) ||
            "weekly-1-2",
          storyFrequency:
            (() => {
              const storyPosts = (savedPlanData.schedule as { storyPosts?: number })?.storyPosts || 0;
              if (storyPosts > 0) {
                return storyPosts >= 7 ? "daily" : storyPosts >= 4 ? "weekly-3-4" : "weekly-1-2";
              }
              return (formData.storyFrequency as string) || "none";
            })(),
          targetAudience: (formData.targetAudience as string) || "",
          postingTime: (formData.postingTime as string) || "",
          regionRestriction: (formData.regionRestriction as string) || "none",
          regionName: (formData.regionName as string) || "",
        };
      } else {
        existingPlanData = {
          planId: planDoc.id,
          startDate: startDateStr,
          currentFollowers: (formData.currentFollowers as number) || 0,
          targetFollowers: (formData.targetFollowers as number) || 0,
          targetFollowerOption: (formData.targetFollowerOption as string) || "",
          customTargetFollowers: (formData.customTargetFollowers as string) || "",
          operationPurpose: (formData.operationPurpose as string) || "",
          weeklyPosts: (formData.weeklyPosts as string) || "weekly-1-2",
          reelCapability: (formData.reelCapability as string) || "weekly-1-2",
          storyFrequency: (formData.storyFrequency as string) || "none",
          targetAudience: (formData.targetAudience as string) || "",
          postingTime: (formData.postingTime as string) || "",
          regionRestriction: (formData.regionRestriction as string) || "none",
          regionName: (formData.regionName as string) || "",
        };
      }

      if (existingPlanData) {
        existingPlanData.currentFollowers = currentFollowers;
      }
    }

    let canUseAISuggestion = false;
    if (accountCreationDate) {
      const creationDate = new Date(accountCreationDate);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      canUseAISuggestion = creationDate <= oneYearAgo;
    }

    return NextResponse.json({
      initialFollowers,
      currentFollowers,
      hasExistingPlan,
      existingPlanData,
      simulationResult,
      canUseAISuggestion,
      accountCreationDate,
    });
  } catch (error) {
    console.error("ホーム初期データ取得エラー:", error);
    return NextResponse.json({ error: "ホーム初期データの取得に失敗しました" }, { status: 500 });
  }
}
