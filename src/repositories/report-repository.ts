import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/repositories/collections";
import { toDate, toPreviousMonth, toTimestampRange } from "@/repositories/firestore-utils";
import type {
  DirectionAlignmentWarningDocument,
  ReportAnalyticsDocument,
  ReportFeedbackDocument,
  ReportFollowerCountDocument,
  ReportPlanDocument,
  ReportPostSummaryDocument,
  ReportRepositoryData,
  ReportUserDocument,
  SnapshotStatus,
} from "@/repositories/types";

function normalizePostType(value: unknown): "feed" | "reel" | "story" | "carousel" | "video" {
  const raw = String(value || "feed");
  if (raw === "reel" || raw === "story" || raw === "carousel" || raw === "video") {
    return raw;
  }
  return "feed";
}

export class ReportRepository {
  static async fetchReportRepositoryData(userId: string, month: string): Promise<ReportRepositoryData> {
    const { startDate, endDate } = toTimestampRange(month);
    const previousMonth = toPreviousMonth(month);
    const { startTimestamp, endTimestamp } = toTimestampRange(month);
    const { startTimestamp: prevStartTimestamp, endTimestamp: prevEndTimestamp } = toTimestampRange(previousMonth);

    const [
      analytics,
      posts,
      activePlan,
      user,
      previousAnalytics,
      followerCount,
      feedbackEntries,
      snapshotStatusMap,
      directionAlignmentWarnings,
    ] = await Promise.all([
      this.fetchReportAnalytics(userId, startTimestamp, endTimestamp),
      this.fetchReportPostIds(userId, startTimestamp, endTimestamp),
      this.fetchActivePlan(userId),
      this.fetchUser(userId),
      this.fetchReportAnalytics(userId, prevStartTimestamp, prevEndTimestamp),
      this.fetchFollowerCounts(userId, month),
      this.fetchFeedbackEntries(userId, 500),
      this.fetchSnapshotStatuses(userId, startTimestamp, endTimestamp),
      this.fetchDirectionAlignmentWarnings(userId, month),
    ]);

    return {
      month,
      startDate,
      endDate,
      analytics,
      posts,
      activePlan,
      user,
      previousAnalytics,
      followerCount,
      feedbackEntries,
      snapshotStatusMap,
      directionAlignmentWarnings,
    };
  }

  static async fetchReportAnalytics(
    userId: string,
    startTimestamp: FirebaseFirestore.Timestamp,
    endTimestamp: FirebaseFirestore.Timestamp
  ): Promise<ReportAnalyticsDocument[]> {
    const snapshot = await adminDb
      .collection(COLLECTIONS.ANALYTICS)
      .where("userId", "==", userId)
      .where("publishedAt", ">=", startTimestamp)
      .where("publishedAt", "<=", endTimestamp)
      .get();

    const analytics: ReportAnalyticsDocument[] = [];

    for (const doc of snapshot.docs) {
      const normalized = this.normalizeAnalytics(doc.data());
      if (normalized) {
        analytics.push(normalized);
      }
    }

    return analytics;
  }

  static async fetchReportPostIds(
    userId: string,
    startTimestamp: FirebaseFirestore.Timestamp,
    endTimestamp: FirebaseFirestore.Timestamp
  ): Promise<string[]> {
    const snapshot = await adminDb
      .collection(COLLECTIONS.POSTS)
      .where("userId", "==", userId)
      .where("createdAt", ">=", startTimestamp)
      .where("createdAt", "<=", endTimestamp)
      .get();

    return snapshot.docs.map((doc) => doc.id);
  }

  static async fetchActivePlan(userId: string): Promise<ReportPlanDocument | null> {
    const snapshot = await adminDb
      .collection(COLLECTIONS.PLANS)
      .where("userId", "==", userId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const data = snapshot.docs[0].data();
    return {
      title: String(data.title || "運用計画"),
      targetFollowers: Number(data.targetFollowers || 0),
      currentFollowers: Number(data.currentFollowers || 0),
      strategies: Array.isArray(data.strategies) ? data.strategies.map(String) : [],
      postCategories: Array.isArray(data.postCategories) ? data.postCategories.map(String) : [],
      startDate: toDate(data.startDate),
      endDate: toDate(data.endDate),
      createdAt: toDate(data.createdAt),
    };
  }

  static async fetchUser(userId: string): Promise<ReportUserDocument | null> {
    const userDoc = await adminDb.collection(COLLECTIONS.USERS).doc(userId).get();
    if (!userDoc.exists) {
      return null;
    }

    const data = userDoc.data() || {};
    return {
      businessInfo: (data.businessInfo || null) as Record<string, unknown> | null,
      snsAISettings: (data.snsAISettings || null) as Record<string, unknown> | null,
    };
  }

  static async fetchFollowerCounts(userId: string, month: string): Promise<ReportFollowerCountDocument | null> {
    const snapshot = await adminDb
      .collection(COLLECTIONS.FOLLOWER_COUNTS)
      .where("userId", "==", userId)
      .where("snsType", "==", "instagram")
      .where("month", "==", month)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const data = snapshot.docs[0].data();
    return {
      followers: Number(data.followers || 0),
    };
  }

  static async fetchFeedbackEntries(userId: string, limit: number): Promise<ReportFeedbackDocument[]> {
    const snapshot = await adminDb
      .collection(COLLECTIONS.AI_POST_FEEDBACK)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        postId: typeof data.postId === "string" ? data.postId : null,
        sentiment:
          data.sentiment === "positive" || data.sentiment === "negative" || data.sentiment === "neutral"
            ? data.sentiment
            : null,
        goalAchievementProspect:
          data.goalAchievementProspect === "high" ||
          data.goalAchievementProspect === "medium" ||
          data.goalAchievementProspect === "low"
            ? data.goalAchievementProspect
            : null,
        comment: typeof data.comment === "string" ? data.comment : "",
        createdAt: toDate(data.createdAt),
      };
    });
  }

  static async fetchSnapshotStatuses(
    userId: string,
    startTimestamp: FirebaseFirestore.Timestamp,
    endTimestamp: FirebaseFirestore.Timestamp
  ): Promise<Map<string, SnapshotStatus>> {
    const snapshot = await adminDb
      .collection(COLLECTIONS.POST_PERFORMANCE_SNAPSHOTS)
      .where("userId", "==", userId)
      .where("createdAt", ">=", startTimestamp)
      .where("createdAt", "<=", endTimestamp)
      .get();

    const map = new Map<string, SnapshotStatus>();
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const postId = typeof data.postId === "string" ? data.postId : null;
      if (!postId) {
        return;
      }
      const status: SnapshotStatus = data.status === "gold" || data.status === "negative" ? data.status : "normal";
      map.set(postId, status);
    });
    return map;
  }

  static async fetchDirectionAlignmentWarnings(
    userId: string,
    month: string
  ): Promise<DirectionAlignmentWarningDocument[]> {
    try {
      const snapshot = await adminDb
        .collection(COLLECTIONS.DIRECTION_ALIGNMENT_LOGS)
        .where("userId", "==", userId)
        .where("month", "==", month)
        .get();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          postId: typeof data.postId === "string" ? data.postId : "",
          directionAlignment: data.directionAlignment === "乖離" ? "乖離" : "要注意",
          directionComment: String(data.directionComment || ""),
          aiDirectionMainTheme: typeof data.aiDirectionMainTheme === "string" ? data.aiDirectionMainTheme : null,
        };
      });
    } catch (error) {
      console.error("方向性警告ログ取得エラー:", error);
      return [];
    }
  }

  static async fetchPostSummaries(userId: string, postIds: string[]): Promise<ReportPostSummaryDocument[]> {
    const summaries = await Promise.all(
      postIds.map(async (postId) => {
        try {
          const summaryDoc = await adminDb.collection(COLLECTIONS.AI_POST_SUMMARIES).doc(`${userId}_${postId}`).get();
          if (!summaryDoc.exists) {
            return null;
          }

          const data = summaryDoc.data() || {};
          return {
            postId,
            summary: String(data.summary || ""),
            strengths: Array.isArray(data.insights) ? data.insights.map(String) : [],
            improvements: [] as string[],
            recommendedActions: Array.isArray(data.recommendedActions)
              ? data.recommendedActions.map(String)
              : [],
          };
        } catch (error) {
          console.error(`AIサマリー取得エラー (postId: ${postId}):`, error);
          return null;
        }
      })
    );

    return summaries.filter((summary) => Boolean(summary)) as ReportPostSummaryDocument[];
  }

  private static normalizeAnalytics(data: FirebaseFirestore.DocumentData): ReportAnalyticsDocument | null {
    const postId = typeof data.postId === "string" ? data.postId : null;
    const publishedAt = toDate(data.publishedAt);
    if (!postId || !publishedAt) {
      return null;
    }

    return {
      postId,
      title: String(data.title || data.caption?.substring(0, 50) || "タイトルなし"),
      postType: normalizePostType(data.category || data.postType),
      publishedAt,
      publishedTime: typeof data.publishedTime === "string" ? data.publishedTime : "",
      likes: Number(data.likes || 0),
      comments: Number(data.comments || 0),
      shares: Number(data.shares || 0),
      reposts: Number(data.reposts || 0),
      reach: Number(data.reach || 0),
      saves: Number(data.saves || 0),
      followerIncrease: Number(data.followerIncrease || 0),
    };
  }
}
