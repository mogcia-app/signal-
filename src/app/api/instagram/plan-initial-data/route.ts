import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { adminDb } from "@/lib/firebase-admin";

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
    });

    // ユーザープロフィールを取得
    const userProfile = await getUserProfile(userId);
    const initialFollowers = userProfile?.businessInfo?.initialFollowers || 0;
    const accountCreationDate = userProfile?.businessInfo?.accountCreationDate;

    // 既存の計画があるか確認
    const plansSnapshot = await adminDb
      .collection("plans")
      .where("userId", "==", userId)
      .where("snsType", "==", "instagram")
      .where("status", "==", "active")
      .limit(1)
      .get();

    let currentFollowers = initialFollowers;
    let hasExistingPlan = false;
    let existingPlanData = null;
    let simulationResult = null; // シミュレーション結果

    // 現在のフォロワー数の算出ルール:
    // - 初月: 利用開始時(initialFollowers)
    // - 2ヶ月目以降: initialFollowers + KPIページのフォロワー数累積
    const now = new Date();
    const currentMonth = toMonthKey(now);
    const toolStartDateRaw = userProfile?.contractStartDate || userProfile?.createdAt || new Date().toISOString();
    const toolStartDate = new Date(toolStartDateRaw);
    const toolStartMonth = toMonthKey(toolStartDate);
    const monthsSinceStart = monthDiff(toolStartMonth, currentMonth);

    if (monthsSinceStart <= 0) {
      currentFollowers = initialFollowers;
    } else {
      const analyticsSnapshot = await adminDb
        .collection("analytics")
        .where("userId", "==", userId)
        .where("snsType", "==", "instagram")
        .get();

      const kpiFollowersTotal = analyticsSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (Number(data.followerIncrease) || 0);
      }, 0);

      currentFollowers = initialFollowers + kpiFollowersTotal;
    }

    if (!plansSnapshot.empty) {
      hasExistingPlan = true;
      const planDoc = plansSnapshot.docs[0];
      const planData = planDoc.data();
      
      // シミュレーション結果を取得（後方互換性のため）
      simulationResult = planData.simulationResult || planData.planData || null;
      
      // 既存の計画データを取得
      // 新しいアーキテクチャ: formDataから直接取得
      const formData = planData.formData || {};
      
      // 開始日を取得
      let startDateStr: string;
      if (formData.startDate && typeof formData.startDate === "string") {
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
      
      // 古いアーキテクチャ（planData.planDataが存在する場合）の後方互換性
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
          weeklyPosts: (() => {
            const weeklyFreq = (savedPlanData.schedule as { weeklyFrequency?: string })?.weeklyFrequency?.replace("週", "").replace("回", "") || "";
            const weeklyNum = parseInt(weeklyFreq) || 0;
            // 新しい形式に変換
            if (weeklyNum === 0) {return "none";}
            if (weeklyNum <= 2) {return "weekly-1-2";}
            if (weeklyNum <= 4) {return "weekly-3-4";}
            return "daily";
          })() || (formData.weeklyPosts as string) || "weekly-1-2",
          reelCapability: (() => {
            const reelPosts = (savedPlanData.schedule as { reelPosts?: number })?.reelPosts || 0;
            const weeklyReelPosts = reelPosts / 4; // 月間から週間へ変換
            // 新しい形式に変換
            if (weeklyReelPosts === 0) {return "none";}
            if (weeklyReelPosts <= 2) {return "weekly-1-2";}
            if (weeklyReelPosts <= 4) {return "weekly-3-4";}
            return "daily";
          })() || (formData.reelCapability as string) || "weekly-1-2",
          storyFrequency: (() => {
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
        // 新しいアーキテクチャ: formDataから直接取得
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
      
      // 計画復元時も、現在フォロワー数は最新算出値を優先して表示
      if (existingPlanData && typeof existingPlanData === "object") {
        (existingPlanData as Record<string, unknown>).currentFollowers = currentFollowers;
      }
    }

    // AI提案が利用可能かどうか（1年以上のデータがある場合）
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
      simulationResult, // シミュレーション結果を返す
      canUseAISuggestion,
      accountCreationDate,
    });
  } catch (error) {
    console.error("初期データ取得エラー:", error);
    return NextResponse.json(
      { error: "初期データの取得に失敗しました" },
      { status: 500 }
    );
  }
}
