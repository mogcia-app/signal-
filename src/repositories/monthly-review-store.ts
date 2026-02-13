import * as admin from "firebase-admin";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/repositories/collections";
import type { MonthlyReviewStore } from "@/domain/analysis/report/usecases/monthly-review-persistence";

export const monthlyReviewStore: MonthlyReviewStore = {
  async getMonthlyReview(userId, month) {
    const doc = await adminDb.collection(COLLECTIONS.MONTHLY_REVIEWS).doc(`${userId}_${month}`).get();
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return {
      review: data?.review || "",
      actionPlans: data?.actionPlans || [],
    };
  },

  async saveMonthlyReview({
    userId,
    month,
    review,
    actionPlans,
    hasPlan,
    analyzedCount,
    isFallback,
    merge,
  }) {
    await adminDb.collection(COLLECTIONS.MONTHLY_REVIEWS).doc(`${userId}_${month}`).set(
      {
        userId,
        month,
        review,
        actionPlans,
        hasPlan,
        analyzedCount,
        isFallback,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge }
    );
  },

  async upsertAiDirection({
    userId,
    month,
    mainTheme,
    avoidFocus,
    priorityKPI,
    postingRules,
    optimalPostingTime,
  }) {
    await adminDb.collection(COLLECTIONS.AI_DIRECTION).doc(`${userId}_${month}`).set(
      {
        userId,
        month,
        mainTheme,
        avoidFocus,
        priorityKPI,
        postingRules,
        optimalPostingTime,
        generatedFrom: "monthly_review",
        lockedAt: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  },
};
