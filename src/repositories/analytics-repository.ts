import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/repositories/collections";

function normalizePublishedAt(input: unknown): Date | null {
  if (!input) {
    return null;
  }

  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }

  if (typeof input === "object" && input !== null) {
    const maybeTimestamp = input as { toDate?: () => Date };
    if (typeof maybeTimestamp.toDate === "function") {
      const date = maybeTimestamp.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
}

export class AnalyticsRepository {
  static async fillMissingPublishedTime(
    userId: string,
  ): Promise<Array<{ id: string; publishedAt: string; publishedTime: string }>> {
    const snapshot = await adminDb.collection(COLLECTIONS.ANALYTICS).where("userId", "==", userId).get();
    const updates: Array<{ id: string; publishedAt: string; publishedTime: string }> = [];

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const publishedAt = normalizePublishedAt(data.publishedAt);

      if (!data.publishedTime && publishedAt) {
        const hours = publishedAt.getHours().toString().padStart(2, "0");
        const minutes = publishedAt.getMinutes().toString().padStart(2, "0");
        const publishedTime = `${hours}:${minutes}`;

        await adminDb.collection(COLLECTIONS.ANALYTICS).doc(docSnapshot.id).update({
          publishedTime,
        });

        updates.push({
          id: docSnapshot.id,
          publishedAt: publishedAt.toISOString(),
          publishedTime,
        });
      }
    }

    return updates;
  }
}
