import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/repositories/collections";
import { toDate } from "@/repositories/firestore-utils";
import type {
  HomeDashboardFollowerCountDocument,
  HomeDashboardPlanDocument,
  HomeDashboardRepositoryData,
  TodayTasksCacheEntry,
} from "@/repositories/types";

export class HomeDashboardRepository {
  static async fetchDashboardData(userId: string, activePlanId?: string | null): Promise<HomeDashboardRepositoryData> {
    const [analyticsSnapshot, postsSnapshot, planSnapshot, followerCountsSnapshot] = await Promise.all([
      adminDb.collection(COLLECTIONS.ANALYTICS).where("userId", "==", userId).get(),
      adminDb.collection(COLLECTIONS.POSTS).where("userId", "==", userId).get(),
      activePlanId ? adminDb.collection(COLLECTIONS.PLANS).doc(activePlanId).get() : Promise.resolve(null),
      adminDb
        .collection(COLLECTIONS.FOLLOWER_COUNTS)
        .where("userId", "==", userId)
        .orderBy("date", "desc")
        .limit(2)
        .get(),
    ]);

    const analytics = analyticsSnapshot.docs
      .map((doc) => this.normalizeAnalytics(doc.data()))
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const posts = postsSnapshot.docs
      .map((doc) => this.normalizePost(doc.id, doc.data()))
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const followerCounts: HomeDashboardFollowerCountDocument[] = followerCountsSnapshot.docs.map((doc) => ({
      followers: Number(doc.data().followers || 0),
    }));

    const activePlan = this.normalizePlan(activePlanId || null, planSnapshot?.data() || null);

    return {
      analytics,
      posts,
      followerCounts,
      activePlan,
    };
  }

  static async getTodayTasksCache(uid: string, localDate: string): Promise<TodayTasksCacheEntry | null> {
    const cacheId = `${uid}_${localDate}`;
    const snapshot = await adminDb.collection(COLLECTIONS.HOME_TODAY_TASKS_CACHE).doc(cacheId).get();
    if (!snapshot.exists) {
      return null;
    }
    return snapshot.data() as TodayTasksCacheEntry;
  }

  static async setTodayTasksCache(params: {
    uid: string;
    localDate: string;
    timezone: string;
    activePlanId: string | null;
    data: NonNullable<TodayTasksCacheEntry["data"]>;
  }): Promise<void> {
    const cacheId = `${params.uid}_${params.localDate}`;
    await adminDb
      .collection(COLLECTIONS.HOME_TODAY_TASKS_CACHE)
      .doc(cacheId)
      .set(
        {
          uid: params.uid,
          localDate: params.localDate,
          timezone: params.timezone,
          activePlanId: params.activePlanId,
          data: params.data,
          updatedAt: new Date(),
        },
        { merge: true }
      );
  }

  private static normalizeAnalytics(data: FirebaseFirestore.DocumentData) {
    const publishedAt = toDate(data.publishedAt);
    if (!publishedAt) {
      return null;
    }

    return {
      likes: Number(data.likes || 0),
      comments: Number(data.comments || 0),
      shares: Number(data.shares || 0),
      reach: Number(data.reach || 0),
      saves: Number(data.saves || 0),
      followers: Number(data.followers || 0),
      followerIncrease: Number(data.followerIncrease || 0),
      publishedAt,
    };
  }

  private static normalizePost(id: string, data: FirebaseFirestore.DocumentData) {
    const createdAt = toDate(data.createdAt) ?? new Date();
    const scheduledDate = toDate(data.scheduledDate);

    const postType = data.postType === "reel" || data.postType === "story" ? data.postType : "feed";

    return {
      id,
      postType,
      title: String(data.title || ""),
      content: String(data.content || ""),
      createdAt,
      scheduledDate,
    };
  }

  private static normalizePlan(
    id: string | null,
    data: FirebaseFirestore.DocumentData | null
  ): HomeDashboardPlanDocument | null {
    if (!id || !data) {
      return null;
    }

    return {
      id,
      title: String(data.title || "運用計画"),
      generatedStrategy: String(data.generatedStrategy || ""),
      formData: (data.formData || {}) as Record<string, unknown>,
      simulationResult: (data.simulationResult as Record<string, unknown> | null) || null,
      startDate: toDate(data.startDate),
      endDate: toDate(data.endDate),
      createdAt: toDate(data.createdAt),
    };
  }
}
