import * as admin from "firebase-admin";
import {
  addContributionToPatch,
  buildContribution,
  createPatch,
  toDate,
  type SummaryPatch,
} from "../functions/src/monthly-summary-aggregation";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const COLLECTIONS = {
  ANALYTICS: "analytics",
  MONTHLY_KPI_SUMMARIES: "monthly_kpi_summaries",
} as const;

type MonthlyBucket = {
  userId: string;
  month: string;
  patch: SummaryPatch;
  latestPublishedAt: Date | null;
  lastAnalyticsDocId: string;
};

function shouldReplaceLastDoc(
  currentLatestDate: Date | null,
  currentDocId: string,
  nextDate: Date,
  nextDocId: string
): boolean {
  if (!currentLatestDate) {
    return true;
  }
  if (nextDate.getTime() > currentLatestDate.getTime()) {
    return true;
  }
  if (nextDate.getTime() < currentLatestDate.getTime()) {
    return false;
  }
  return nextDocId > currentDocId;
}

async function backfillMonthlySummaries() {
  const dryRun = process.argv.includes("--dry-run");
  const targetMonthArg = process.argv.find((arg) => arg.startsWith("--month="));
  const targetMonth = targetMonthArg ? targetMonthArg.replace("--month=", "").trim() : null;

  console.log("Starting monthly_kpi_summaries backfill", { dryRun, targetMonth });

  const analyticsSnapshot = await db.collection(COLLECTIONS.ANALYTICS).get();
  console.log(`Loaded analytics documents: ${analyticsSnapshot.size}`);

  const buckets = new Map<string, MonthlyBucket>();
  let skippedDocs = 0;

  for (const doc of analyticsSnapshot.docs) {
    const data = doc.data();
    const contribution = buildContribution(data as Record<string, unknown>);

    const publishedAt = toDate((data as Record<string, unknown>).publishedAt);

    if (!contribution || !publishedAt) {
      skippedDocs++;
      continue;
    }

    if (targetMonth && contribution.month !== targetMonth) {
      continue;
    }

    const key = `${contribution.userId}_${contribution.month}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        userId: contribution.userId,
        month: contribution.month,
        patch: createPatch(contribution.userId, contribution.month, doc.id),
        latestPublishedAt: null,
        lastAnalyticsDocId: "",
      });
    }

    const bucket = buckets.get(key)!;
    addContributionToPatch(bucket.patch, contribution);

    if (shouldReplaceLastDoc(bucket.latestPublishedAt, bucket.lastAnalyticsDocId, publishedAt, doc.id)) {
      bucket.latestPublishedAt = publishedAt;
      bucket.lastAnalyticsDocId = doc.id;
      bucket.patch.lastAnalyticsDocId = doc.id;
    }
  }

  const bucketEntries = Array.from(buckets.entries());
  console.log(`Target summary documents: ${bucketEntries.length}, skipped analytics docs: ${skippedDocs}`);

  if (bucketEntries.length === 0) {
    console.log("No target months found. Done.");
    return;
  }

  let writeCount = 0;
  let batch = db.batch();
  let batchOps = 0;

  for (const [docId, bucket] of bucketEntries) {
    const dailyBreakdown = Array.from(bucket.patch.dailyByDate.entries())
      .map(([date, values]) => ({
        date,
        likes: values.likes,
        reach: values.reach,
        saves: values.saves,
        comments: values.comments,
        engagement: values.engagement,
      }))
      .filter((entry) => entry.likes || entry.reach || entry.saves || entry.comments || entry.engagement)
      .sort((a, b) => a.date.localeCompare(b.date));

    const summaryDoc = {
      userId: bucket.userId,
      month: bucket.month,
      snsType: "instagram" as const,
      totalLikes: bucket.patch.delta.likes,
      totalComments: bucket.patch.delta.comments,
      totalShares: bucket.patch.delta.shares,
      totalReach: bucket.patch.delta.reach,
      totalSaves: bucket.patch.delta.saves,
      totalFollowerIncrease: bucket.patch.delta.followerIncrease,
      totalInteraction: bucket.patch.delta.interaction,
      totalExternalLinkTaps: bucket.patch.delta.externalLinkTaps,
      totalProfileVisits: bucket.patch.delta.profileVisits,
      postCount: bucket.patch.delta.postCount,
      dailyBreakdown,
      lastAnalyticsDocId: bucket.patch.lastAnalyticsDocId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (!dryRun) {
      batch.set(db.collection(COLLECTIONS.MONTHLY_KPI_SUMMARIES).doc(docId), summaryDoc, { merge: true });
      batchOps++;
    }

    writeCount++;

    if (!dryRun && batchOps >= 400) {
      await batch.commit();
      batch = db.batch();
      batchOps = 0;
      console.log(`Committed ${writeCount}/${bucketEntries.length} summary docs`);
    }
  }

  if (!dryRun && batchOps > 0) {
    await batch.commit();
  }

  console.log(`${dryRun ? "[DRY RUN] " : ""}Backfill completed. Processed summary docs: ${writeCount}`);
}

backfillMonthlySummaries()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exit(1);
  });
