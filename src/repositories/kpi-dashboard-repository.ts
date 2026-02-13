import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/repositories/collections";
import { toDate, toPreviousMonth, toTimestampRange } from "@/repositories/firestore-utils";
import type {
  AnalyticsDocument,
  FollowerCountDocument,
  KpiRepositoryData,
  PlanGoalDocument,
  SnapshotStatus,
} from "@/repositories/types";

export class KpiDashboardRepository {
  static async fetchKpiRawData(userId: string, month: string): Promise<KpiRepositoryData> {
    const previousMonth = toPreviousMonth(month);

    const [currentAnalytics, previousAnalytics, followerCounts, snapshotStatusMap, activePlan, initialFollowers] =
      await Promise.all([
        this.fetchMonthlyAnalytics(userId, month),
        this.fetchMonthlyAnalytics(userId, previousMonth),
        this.fetchFollowerCounts(userId, month, previousMonth),
        this.fetchSnapshotStatuses(userId),
        this.fetchActivePlanGoals(userId),
        this.fetchInitialFollowers(userId),
      ]);

    return {
      month,
      currentAnalytics,
      previousAnalytics,
      followerCount: followerCounts.current,
      previousFollowerCount: followerCounts.previous,
      snapshotStatusMap,
      activePlan,
      initialFollowers,
    };
  }

  static async fetchMonthlyAnalytics(userId: string, month: string): Promise<AnalyticsDocument[]> {
    const { startTimestamp, endTimestamp } = toTimestampRange(month);

    const snapshot = await adminDb
      .collection(COLLECTIONS.ANALYTICS)
      .where("userId", "==", userId)
      .where("publishedAt", ">=", startTimestamp)
      .where("publishedAt", "<=", endTimestamp)
      .get();

    const analytics: AnalyticsDocument[] = [];

    for (const doc of snapshot.docs) {
      const normalized = this.normalizeAnalyticsDocument(doc.data());
      if (normalized) {
        analytics.push(normalized);
      }
    }

    return analytics;
  }

  static async fetchFollowerCounts(
    userId: string,
    month: string,
    previousMonth: string
  ): Promise<{ current: FollowerCountDocument | null; previous: FollowerCountDocument | null }> {
    const [currentSnapshot, previousSnapshot] = await Promise.all([
      adminDb
        .collection(COLLECTIONS.FOLLOWER_COUNTS)
        .where("userId", "==", userId)
        .where("snsType", "==", "instagram")
        .where("month", "==", month)
        .limit(1)
        .get(),
      adminDb
        .collection(COLLECTIONS.FOLLOWER_COUNTS)
        .where("userId", "==", userId)
        .where("snsType", "==", "instagram")
        .where("month", "==", previousMonth)
        .limit(1)
        .get(),
    ]);

    return {
      current: currentSnapshot.empty ? null : this.normalizeFollowerCount(currentSnapshot.docs[0].data()),
      previous: previousSnapshot.empty ? null : this.normalizeFollowerCount(previousSnapshot.docs[0].data()),
    };
  }

  static async fetchSnapshotStatuses(userId: string): Promise<Map<string, SnapshotStatus>> {
    const snapshot = await adminDb
      .collection(COLLECTIONS.SNAPSHOT_REFERENCES)
      .where("userId", "==", userId)
      .get();

    const snapshotStatusMap = new Map<string, SnapshotStatus>();

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const postId = typeof data.postId === "string" ? data.postId : null;
      if (!postId) {
        return;
      }
      const status = data.status === "gold" || data.status === "negative" ? data.status : "normal";
      snapshotStatusMap.set(postId, status);
    });

    return snapshotStatusMap;
  }

  static async fetchActivePlanGoals(userId: string): Promise<PlanGoalDocument | null> {
    try {
      const snapshot = await adminDb
        .collection(COLLECTIONS.PLANS)
        .where("userId", "==", userId)
        .where("snsType", "==", "instagram")
        .where("status", "==", "active")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const data = snapshot.docs[0].data();
      const simulationResult = data.simulationResult as { monthlyPostCount?: number } | null | undefined;

      return {
        targetFollowers: Number(data.targetFollowers || 0),
        currentFollowers: Number(data.currentFollowers || 0),
        monthlyPostCount: Number(simulationResult?.monthlyPostCount || 20),
      };
    } catch {
      return null;
    }
  }

  static async fetchInitialFollowers(userId: string): Promise<number> {
    try {
      const userDoc = await adminDb.collection(COLLECTIONS.USERS).doc(userId).get();
      if (!userDoc.exists) {
        return 0;
      }

      const data = userDoc.data();
      return Number(data?.businessInfo?.initialFollowers || 0);
    } catch {
      return 0;
    }
  }

  private static normalizeAnalyticsDocument(data: FirebaseFirestore.DocumentData): AnalyticsDocument | null {
    const postId = typeof data.postId === "string" ? data.postId : null;
    const publishedAt = toDate(data.publishedAt);

    if (!postId || !publishedAt) {
      return null;
    }

    const rawPostType = data.category || data.postType || "feed";
    const postType = rawPostType === "reel" || rawPostType === "story" ? rawPostType : "feed";

    return {
      postId,
      publishedAt,
      title: String(data.title || "無題の投稿"),
      postType,
      hashtags: Array.isArray(data.hashtags) ? data.hashtags.map(String) : [],
      analyticsSummary: {
        likes: Number(data.likes || 0),
        comments: Number(data.comments || 0),
        shares: Number(data.shares || 0),
        reach: Number(data.reach || 0),
        saves: Number(data.saves || 0),
        followerIncrease: Number(data.followerIncrease || 0),
        publishedTime: String(data.publishedTime || ""),
        reachFollowerPercent: Number(data.reachFollowerPercent || 0),
        interactionCount: Number(data.interactionCount || 0),
        interactionFollowerPercent: Number(data.interactionFollowerPercent || 0),
        reachSourceProfile: Number(data.reachSourceProfile || 0),
        reachSourceFeed: Number(data.reachSourceFeed || 0),
        reachSourceExplore: Number(data.reachSourceExplore || 0),
        reachSourceSearch: Number(data.reachSourceSearch || 0),
        reachSourceOther: Number(data.reachSourceOther || 0),
        reachedAccounts: Number(data.reachedAccounts || 0),
        profileVisits: Number(data.profileVisits || 0),
        externalLinkTaps: Number(data.externalLinkTaps || 0),
        reelReachFollowerPercent: Number(data.reelReachFollowerPercent || 0),
        reelInteractionCount: Number(data.reelInteractionCount || 0),
        reelInteractionFollowerPercent: Number(data.reelInteractionFollowerPercent || 0),
        reelReachSourceProfile: Number(data.reelReachSourceProfile || 0),
        reelReachSourceReel: Number(data.reelReachSourceReel || 0),
        reelReachSourceExplore: Number(data.reelReachSourceExplore || 0),
        reelReachSourceSearch: Number(data.reelReachSourceSearch || 0),
        reelReachSourceOther: Number(data.reelReachSourceOther || 0),
        reelReachedAccounts: Number(data.reelReachedAccounts || 0),
        reelPlayTime: Number(data.reelPlayTime || 0),
        reelAvgPlayTime: Number(data.reelAvgPlayTime || 0),
        reelSkipRate: Number(data.reelSkipRate || 0),
        reelNormalSkipRate: Number(data.reelNormalSkipRate || 0),
        audience: data.audience || null,
      },
    };
  }

  private static normalizeFollowerCount(data: FirebaseFirestore.DocumentData): FollowerCountDocument {
    return {
      profileVisits: Number(data.profileVisits || 0),
      externalLinkTaps: Number(data.externalLinkTaps || 0),
      followers: Number(data.followers || 0),
    };
  }
}
