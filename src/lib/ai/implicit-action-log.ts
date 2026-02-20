import * as admin from "firebase-admin";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/repositories/collections";

interface LogImplicitAiActionInput {
  uid: string;
  feature: "home_post_generation" | "home_advisor_chat" | "instagram_posts_advisor_chat" | "analytics_monthly_review";
  title: string;
  action?: string;
  focusMonth?: string;
  metadata?: Record<string, unknown>;
}

export async function logImplicitAiAction(input: LogImplicitAiActionInput): Promise<void> {
  const now = Date.now();
  const actionId = `${input.feature}_${now}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    await adminDb.collection(COLLECTIONS.AI_ACTION_LOGS).doc(`${input.uid}_${actionId}`).set(
      {
        userId: input.uid,
        actionId,
        title: input.title,
        focusArea: input.focusMonth || "",
        applied: true,
        feedback: input.action || "",
        feature: input.feature,
        source: "implicit",
        metadata: input.metadata || {},
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn("implicit ai action log failed:", error);
  }
}

