/* eslint-disable no-console */
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const COLLECTION = "follower_counts";
const TARGET_FIELDS = ["followers", "startFollowers", "profileVisits", "externalLinkTaps"];

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function hasLegacyValues(data) {
  if (!data || typeof data !== "object") {
    return false;
  }

  return TARGET_FIELDS.some((field) => {
    if (!(field in data)) {
      return false;
    }
    return toNumber(data[field]) !== 0;
  });
}

function buildLegacyPayload(data) {
  return {
    followers: toNumber(data.followers),
    startFollowers: toNumber(data.startFollowers),
    profileVisits: toNumber(data.profileVisits),
    externalLinkTaps: toNumber(data.externalLinkTaps),
  };
}

async function run() {
  const dryRun = process.argv.includes("--dry-run");
  const snapshot = await db.collection(COLLECTION).get();

  let scanned = 0;
  let migrated = 0;
  let markedOnly = 0;
  let batch = db.batch();
  let batchCount = 0;

  const commitBatchIfNeeded = async (force = false) => {
    if (batchCount === 0) {
      return;
    }
    if (!force && batchCount < 400) {
      return;
    }
    await batch.commit();
    batch = db.batch();
    batchCount = 0;
  };

  for (const doc of snapshot.docs) {
    scanned += 1;
    const data = doc.data() || {};
    const hasLegacy = hasLegacyValues(data);
    const alreadyDisabled = Boolean(data.legacyFieldsDisabled);
    const needsMarker = !alreadyDisabled;

    if (!hasLegacy && !needsMarker) {
      continue;
    }

    const legacyValues = buildLegacyPayload(data);
    const existingLegacyManualInput =
      data.legacyManualInput && typeof data.legacyManualInput === "object"
        ? data.legacyManualInput
        : {};
    const updatePayload = {};

    if (hasLegacy) {
      migrated += 1;
      updatePayload.followers = 0;
      updatePayload.startFollowers = 0;
      updatePayload.profileVisits = 0;
      updatePayload.externalLinkTaps = 0;
      updatePayload.legacyManualInput = {
        ...existingLegacyManualInput,
        ...legacyValues,
        disabledAt: admin.firestore.FieldValue.serverTimestamp(),
      };
    } else {
      markedOnly += 1;
    }

    if (needsMarker) {
      updatePayload.legacyFieldsDisabled = true;
      if (!("legacyFieldsDisabledAt" in data)) {
        updatePayload.legacyFieldsDisabledAt = admin.firestore.FieldValue.serverTimestamp();
      }
    }

    updatePayload.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    if (dryRun) {
      console.log(`[DRY-RUN] migrate ${doc.id}`, {
        hadLegacyValues: hasLegacy,
        markDisabled: needsMarker,
        before: legacyValues,
      });
      continue;
    }

    batch.set(doc.ref, updatePayload, { merge: true });
    batchCount += 1;
    await commitBatchIfNeeded();
  }

  if (!dryRun) {
    await commitBatchIfNeeded(true);
  }

  console.log(
    `done: scanned=${scanned}, migrated=${migrated}, markedOnly=${markedOnly}, dryRun=${dryRun}`
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
