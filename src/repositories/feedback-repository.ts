import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/repositories/collections";

export interface FeedbackRecord {
  id: string;
  userId: string;
  pageType: "analytics" | "monthly-report" | "plan" | "posts";
  satisfaction: "satisfied" | "dissatisfied";
  feedback: string;
  contextData: Record<string, unknown>;
  timestamp: Date | FirebaseFirestore.Timestamp;
  processed: boolean;
}

interface CreateFeedbackInput {
  userId: string;
  pageType: "analytics" | "monthly-report" | "plan" | "posts";
  satisfaction: "satisfied" | "dissatisfied";
  feedback: string;
  contextData?: Record<string, unknown>;
}

export class FeedbackRepository {
  static async create(input: CreateFeedbackInput): Promise<{ id: string }> {
    const payload = {
      userId: input.userId,
      pageType: input.pageType,
      satisfaction: input.satisfaction,
      feedback: input.feedback,
      contextData: input.contextData || {},
      timestamp: new Date(),
      processed: false,
    };

    const docRef = await adminDb.collection(COLLECTIONS.USER_FEEDBACK).add(payload);
    return { id: docRef.id };
  }

  static async listByUser(userId: string, pageType?: string | null): Promise<FeedbackRecord[]> {
    let queryRef: FirebaseFirestore.Query = adminDb
      .collection(COLLECTIONS.USER_FEEDBACK)
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .limit(50);

    if (pageType) {
      queryRef = adminDb
        .collection(COLLECTIONS.USER_FEEDBACK)
        .where("userId", "==", userId)
        .where("pageType", "==", pageType)
        .orderBy("timestamp", "desc")
        .limit(50);
    }

    const snapshot = await queryRef.get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<FeedbackRecord, "id">),
    }));
  }
}
