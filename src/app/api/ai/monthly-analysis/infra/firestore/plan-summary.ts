/**
 * Firestore層: 運用計画取得
 * Firestoreから運用計画データを取得
 */

import { getAdminDb } from "../../../../../../lib/firebase-admin";
import * as FirebaseFirestore from "firebase-admin/firestore";

// 型定義をtypes.tsから再エクスポート
export interface PlanSummary {
  id: string;
  title: string;
  status: string;
  snsType: string;
  planPeriod: string;
  targetFollowers: number;
  currentFollowers: number;
  targetAudience?: string;
  strategies: string[];
  postCategories: string[];
  planStartDate?: string;
  planEndDate?: string;
  simulationSummary?: string;
  formData?: Record<string, unknown> | null;
}

// ユーティリティ関数をインポート
import { parseFirestoreDate, addMonths, resolveReferenceDate } from "../../utils/date-utils";
import { parsePlanPeriodToMonths, toNumber } from "../../utils/validation";

/**
 * 運用計画を取得
 */
export async function fetchPlanSummaryForPeriod(
  userId: string,
  period: "weekly" | "monthly",
  date: string,
  snsType: string = "instagram"
): Promise<PlanSummary | null> {
  try {
    const db = getAdminDb();
    let query = db
      .collection("plans")
      .where("userId", "==", userId)
      .where("snsType", "==", snsType);

    // Firestore orderBy requires indexed fields; attempt to order by updatedAt, fallback to createdAt
    try {
      query = query.orderBy("updatedAt", "desc");
    } catch (error) {
      console.warn("plans orderBy(updatedAt) failed, fallback to createdAt:", error);
      query = query.orderBy("createdAt", "desc");
    }

    const snapshot = await query.limit(12).get();
    if (snapshot.empty) {
      return null;
    }

    const referenceDate = resolveReferenceDate(period, date);

    const plans = snapshot.docs
      .map((doc) => {
        const data = doc.data() || {};
        const createdAt = parseFirestoreDate(data.createdAt) ?? new Date();
        const updatedAt = parseFirestoreDate(data.updatedAt) ?? createdAt;
        const periodLabel =
          typeof data.planPeriod === "string"
            ? data.planPeriod
            : typeof data.formData?.planPeriod === "string"
              ? (data.formData.planPeriod as string)
              : "1ヶ月";
        const months = parsePlanPeriodToMonths(periodLabel);
        const planStart = createdAt;
        const planEnd = addMonths(planStart, Math.max(1, months));
        let simulationSummary: string | undefined;
        if (typeof data.simulationResult?.summary === "string") {
          simulationSummary = data.simulationResult.summary;
        } else if (typeof data.simulationResult?.headline === "string") {
          simulationSummary = data.simulationResult.headline;
        }
        const summary: PlanSummary = {
          id: doc.id,
          title: typeof data.title === "string" ? data.title : "運用計画",
          status: typeof data.status === "string" ? data.status : "active",
          snsType: typeof data.snsType === "string" ? data.snsType : snsType,
          planPeriod: periodLabel,
          targetFollowers: Number.parseInt(String(data.targetFollowers ?? 0), 10) || 0,
          currentFollowers: Number.parseInt(String(data.currentFollowers ?? 0), 10) || 0,
          targetAudience: typeof data.targetAudience === "string" ? data.targetAudience : undefined,
          strategies: Array.isArray(data.strategies) ? data.strategies : [],
          postCategories: Array.isArray(data.postCategories) ? data.postCategories : [],
          planStartDate: planStart.toISOString(),
          planEndDate: planEnd.toISOString(),
          simulationSummary,
          formData: typeof data.formData === "object" ? (data.formData as Record<string, unknown>) : null,
        };
        return {
          summary,
          planStart,
          planEnd,
          updatedAt,
        };
      })
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    if (plans.length === 0) {
      return null;
    }

    if (referenceDate) {
      const matched = plans.find(
        (plan) => referenceDate >= plan.planStart && referenceDate <= plan.planEnd
      );
      if (matched) {
        return matched.summary;
      }
    }

    return plans[0].summary;
  } catch (error) {
    console.error("運用計画の取得に失敗しました:", error);
    return null;
  }
}

/**
 * 運用スケジュール統計を取得
 */
export async function fetchScheduleStats(
  db: FirebaseFirestore.Firestore,
  userId: string
): Promise<{ monthlyPosts: number } | null> {
  try {
    const scheduleDoc = await db.collection("userSchedules").doc(userId).get();
    if (!scheduleDoc.exists) {
      return null;
    }
    const data = scheduleDoc.data() || {};

    interface ScheduleEntry {
      monthlyPosts?: unknown;
      schedule?: Array<{ posts?: unknown[] }>;
    }

    const extractMonthlyPosts = (entry: ScheduleEntry | null | undefined): number => {
      if (!entry) {
        return 0;
      }
      const monthly = toNumber(entry.monthlyPosts);
      if (monthly > 0) {
        return monthly;
      }
      if (Array.isArray(entry.schedule)) {
        const weeklyPosts = entry.schedule.reduce((acc: number, day: { posts?: unknown[] }) => {
          if (!day || !Array.isArray(day.posts)) {
            return acc;
          }
          return acc + day.posts.length;
        }, 0);
        return weeklyPosts > 0 ? weeklyPosts * 4 : 0;
      }
      return 0;
    };

    const feedPosts = extractMonthlyPosts(data.feedSchedule);
    const reelPosts = extractMonthlyPosts(data.reelSchedule);
    const storyPosts = extractMonthlyPosts(data.storySchedule);

    return {
      monthlyPosts: feedPosts + reelPosts + storyPosts,
    };
  } catch (error) {
    console.error("運用スケジュール取得エラー:", error);
    return null;
  }
}

