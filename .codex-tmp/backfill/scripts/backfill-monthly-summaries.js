"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
const monthly_summary_aggregation_1 = require("../functions/src/monthly-summary-aggregation");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
function shouldReplaceLastDoc(currentLatestDate, currentDocId, nextDate, nextDocId) {
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
    const analyticsSnapshot = await db.collection("analytics").get();
    console.log(`Loaded analytics documents: ${analyticsSnapshot.size}`);
    const buckets = new Map();
    let skippedDocs = 0;
    for (const doc of analyticsSnapshot.docs) {
        const data = doc.data();
        const contribution = (0, monthly_summary_aggregation_1.buildContribution)(data);
        const publishedAt = (0, monthly_summary_aggregation_1.toDate)(data.publishedAt);
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
                patch: (0, monthly_summary_aggregation_1.createPatch)(contribution.userId, contribution.month, doc.id),
                latestPublishedAt: null,
                lastAnalyticsDocId: "",
            });
        }
        const bucket = buckets.get(key);
        (0, monthly_summary_aggregation_1.addContributionToPatch)(bucket.patch, contribution);
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
            snsType: "instagram",
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
            batch.set(db.collection("monthly_kpi_summaries").doc(docId), summaryDoc, { merge: true });
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
