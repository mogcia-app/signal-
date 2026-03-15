import * as admin from "firebase-admin";
import { adminDb } from "@/lib/firebase-admin";
import { ForbiddenError } from "@/lib/server/auth-context";
import { COLLECTIONS } from "@/repositories/collections";
import { toDate } from "@/repositories/firestore-utils";
import type {
  CreatePostInput,
  FirestorePostDocument,
  PostListFilters,
  PostRecord,
  UpdatePostInput,
} from "@/repositories/post-types";
import type { WriteResult } from "firebase-admin/firestore";

export class PostRepository {
  static async create(input: CreatePostInput): Promise<PostRecord> {
    const now = new Date();
    const payload: FirestorePostDocument = {
      userId: input.userId,
      title: input.title,
      content: input.content,
      hashtags: input.hashtags,
      postType: input.postType,
      scheduledDate: input.scheduledDate || null,
      scheduledTime: input.scheduledTime || null,
      status: input.status,
      imageUrl: input.imageUrl || null,
      analytics: input.analytics || null,
      snapshotReferences: input.snapshotReferences || [],
      generationReferences: (input.generationReferences || []).slice(0, 8),
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await adminDb.collection(COLLECTIONS.POSTS).add(payload);
    return this.normalizePost(docRef.id, payload);
  }

  static async list(filters: PostListFilters): Promise<{ posts: PostRecord[]; total: number }> {
    let queryRef: FirebaseFirestore.Query = adminDb
      .collection(COLLECTIONS.POSTS)
      .where("userId", "==", filters.userId);

    if (filters.status) {
      queryRef = queryRef.where("status", "==", filters.status);
    }
    if (filters.postType) {
      queryRef = queryRef.where("postType", "==", filters.postType);
    }

    const snapshot = await queryRef.get();
    const posts = snapshot.docs
      .map((doc) => this.normalizePost(doc.id, doc.data() as FirestorePostDocument))
      .sort((a, b) => this.sortByCreatedAtDesc(a, b))
      .slice(0, filters.limit ?? 50);

    return {
      posts,
      total: snapshot.size,
    };
  }

  static async getById(userId: string, postId: string): Promise<PostRecord | null> {
    const snapshot = await adminDb.collection(COLLECTIONS.POSTS).doc(postId).get();
    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data() as FirestorePostDocument | undefined;
    if (!data) {
      return null;
    }

    this.assertOwnership(userId, data.userId);
    return this.normalizePost(snapshot.id, data);
  }

  static async updateById(params: {
    userId: string;
    postId: string;
    updates: UpdatePostInput;
  }): Promise<{ previousImageUrl: string | null }> {
    const docRef = adminDb.collection(COLLECTIONS.POSTS).doc(params.postId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      throw new Error("POST_NOT_FOUND");
    }

    const currentData = snapshot.data() as FirestorePostDocument | undefined;
    if (!currentData) {
      throw new Error("POST_NOT_FOUND");
    }

    this.assertOwnership(params.userId, currentData.userId);
    const previousImageUrl = typeof currentData.imageUrl === "string" ? currentData.imageUrl : null;

    const updateData = this.buildUpdatePayload(params.updates);
    await docRef.update(updateData);

    if (params.updates.scheduledDate !== undefined || params.updates.scheduledTime !== undefined) {
      await this.syncAnalyticsPublishedAt({
        userId: params.userId,
        postId: params.postId,
        currentData,
        updates: params.updates,
      });
    }

    return { previousImageUrl };
  }

  static async deleteById(params: {
    userId: string;
    postId: string;
  }): Promise<void> {
    const docRef = adminDb.collection(COLLECTIONS.POSTS).doc(params.postId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      throw new Error("POST_NOT_FOUND");
    }

    const postData = snapshot.data() as FirestorePostDocument | undefined;
    if (!postData) {
      throw new Error("POST_NOT_FOUND");
    }

    this.assertOwnership(params.userId, postData.userId);
    await docRef.delete();
    await this.cleanupRelatedDocuments(params.postId, postData.userId);
  }

  private static normalizePost(id: string, data: FirestorePostDocument): PostRecord {
    const scheduledDate = toDate(data.scheduledDate);

    return {
      id,
      userId: data.userId,
      title: String(data.title || ""),
      content: String(data.content || ""),
      hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
      postType: data.postType === "reel" || data.postType === "story" ? data.postType : "feed",
      scheduledDate: scheduledDate || (typeof data.scheduledDate === "string" ? data.scheduledDate : null),
      scheduledTime: typeof data.scheduledTime === "string" ? data.scheduledTime : null,
      status: data.status === "scheduled" || data.status === "published" ? data.status : "draft",
      imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : null,
      analytics: data.analytics || null,
      snapshotReferences: Array.isArray(data.snapshotReferences) ? data.snapshotReferences : [],
      generationReferences: Array.isArray(data.generationReferences) ? data.generationReferences : [],
      createdAt: toDate(data.createdAt) || null,
      updatedAt: toDate(data.updatedAt) || null,
    };
  }

  private static sortByCreatedAtDesc(a: PostRecord, b: PostRecord): number {
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt || 0).getTime();
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  }

  private static assertOwnership(requestUserId: string, ownerUserId: string | undefined): void {
    if (!ownerUserId || ownerUserId !== requestUserId) {
      throw new ForbiddenError("別ユーザーの投稿にはアクセスできません");
    }
  }

  private static buildUpdatePayload(updates: UpdatePostInput): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.title !== undefined) {payload.title = updates.title;}
    if (updates.content !== undefined) {payload.content = updates.content;}
    if (updates.hashtags !== undefined) {payload.hashtags = updates.hashtags;}
    if (updates.postType !== undefined) {payload.postType = updates.postType;}
    if (updates.scheduledDate !== undefined) {payload.scheduledDate = updates.scheduledDate;}
    if (updates.scheduledTime !== undefined) {payload.scheduledTime = updates.scheduledTime;}
    if (updates.status !== undefined) {payload.status = updates.status;}
    if (updates.imageUrl !== undefined) {payload.imageUrl = updates.imageUrl;}
    if (updates.analytics !== undefined) {payload.analytics = updates.analytics;}
    if (updates.imageData !== undefined) {payload.imageData = null;}

    return payload;
  }

  private static async syncAnalyticsPublishedAt(params: {
    userId: string;
    postId: string;
    currentData: FirestorePostDocument;
    updates: UpdatePostInput;
  }): Promise<void> {
    const analyticsSnapshot = await adminDb
      .collection(COLLECTIONS.ANALYTICS)
      .where("userId", "==", params.userId)
      .where("postId", "==", params.postId)
      .get();

    if (analyticsSnapshot.empty) {
      return;
    }

    const finalScheduledDate =
      params.updates.scheduledDate !== undefined ? params.updates.scheduledDate : params.currentData.scheduledDate;
    const finalScheduledTime =
      params.updates.scheduledTime !== undefined ? params.updates.scheduledTime : params.currentData.scheduledTime;

    if (!finalScheduledDate) {
      return;
    }

    const publishedAtDate = this.resolvePublishedAt(finalScheduledDate, finalScheduledTime);
    if (!publishedAtDate) {
      return;
    }

    const batch = adminDb.batch();
    analyticsSnapshot.docs.forEach((analyticsDoc) => {
      batch.update(analyticsDoc.ref, {
        publishedAt: admin.firestore.Timestamp.fromDate(publishedAtDate),
        publishedTime: finalScheduledTime || publishedAtDate.toTimeString().slice(0, 5),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
  }

  private static resolvePublishedAt(
    scheduledDate: string | Date | FirebaseFirestore.Timestamp | null | undefined,
    scheduledTime: string | null | undefined,
  ): Date | null {
    const baseDate = toDate(scheduledDate);
    if (!baseDate) {
      return null;
    }

    const result = new Date(baseDate);
    if (scheduledTime && typeof scheduledTime === "string") {
      const [hours, minutes] = scheduledTime.split(":").map(Number);
      if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
        result.setHours(hours, minutes, 0, 0);
      }
    }
    return result;
  }

  private static async cleanupRelatedDocuments(postId: string, userId: string): Promise<void> {
    const cleanupTasks: Array<Promise<WriteResult[] | void>> = [];

    const analyticsSnapshot = await adminDb
      .collection(COLLECTIONS.ANALYTICS)
      .where("userId", "==", userId)
      .where("postId", "==", postId)
      .get();
    if (!analyticsSnapshot.empty) {
      const batch = adminDb.batch();
      analyticsSnapshot.forEach((analyticsDoc) => batch.delete(analyticsDoc.ref));
      cleanupTasks.push(batch.commit());
    }

    const feedbackSnapshot = await adminDb
      .collection(COLLECTIONS.AI_POST_FEEDBACK)
      .where("postId", "==", postId)
      .get();
    if (!feedbackSnapshot.empty) {
      const batch = adminDb.batch();
      feedbackSnapshot.forEach((feedbackDoc) => batch.delete(feedbackDoc.ref));
      cleanupTasks.push(batch.commit());
    }

    const actionSnapshot = await adminDb
      .collection(COLLECTIONS.AI_ACTION_LOGS)
      .where("userId", "==", userId)
      .where("focusArea", "==", `learning-${postId}`)
      .get();
    if (!actionSnapshot.empty) {
      const batch = adminDb.batch();
      actionSnapshot.forEach((actionDoc) => batch.delete(actionDoc.ref));
      cleanupTasks.push(batch.commit());
    }

    await Promise.all(cleanupTasks);
  }
}
