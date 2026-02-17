/* eslint-disable no-console */
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const WEEK_DAYS = new Set(["日", "月", "火", "水", "木", "金", "土"]);

function parseLegacyDayList(value) {
  const normalized = String(value || "").replace(/（.*?）/g, "").trim();
  if (!normalized || normalized === "なし") return [];
  return normalized
    .split("・")
    .map((day) => day.trim())
    .filter((day) => WEEK_DAYS.has(day));
}

function extractLegacyScheduleFromTargetAudience(value) {
  const raw = String(value || "").trim();
  if (!raw) return { cleanText: "", feedDays: [], reelDays: [], storyDays: [] };

  const slashParts = raw
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const pipeParts = raw
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const parts = slashParts.length > pipeParts.length ? slashParts : pipeParts;

  const scheduleParts = parts.filter(
    (segment) =>
      segment.includes("フィード:") ||
      segment.includes("リール:") ||
      segment.includes("ストーリーズ:")
  );
  const scheduleSource = scheduleParts.join(" / ") || raw;

  const feedMatch = scheduleSource.match(/フィード:\s*([^/|]+)/);
  const reelMatch = scheduleSource.match(/リール:\s*([^/|]+)/);
  const storyMatch = scheduleSource.match(/ストーリーズ:\s*([^/|]+)/);

  const cleanText = parts
    .filter(
      (segment) =>
        !segment.includes("選択曜日") &&
        !segment.includes("フィード:") &&
        !segment.includes("リール:") &&
        !segment.includes("ストーリーズ:")
    )
    .join(" ")
    .trim();

  return {
    cleanText,
    feedDays: parseLegacyDayList(feedMatch && feedMatch[1]),
    reelDays: parseLegacyDayList(reelMatch && reelMatch[1]),
    storyDays: parseLegacyDayList(storyMatch && storyMatch[1]),
  };
}

async function run() {
  const dryRun = process.argv.includes("--dry-run");
  const plansSnap = await db.collection("plans").where("snsType", "==", "instagram").get();

  let scanned = 0;
  let migrated = 0;

  for (const doc of plansSnap.docs) {
    scanned += 1;
    const data = doc.data() || {};
    const formData = (data.formData && typeof data.formData === "object") ? { ...data.formData } : {};

    const targetAudience = typeof formData.targetAudience === "string" ? formData.targetAudience : "";
    const feedDays = Array.isArray(formData.feedDays) ? formData.feedDays.filter((d) => WEEK_DAYS.has(String(d))) : [];
    const reelDays = Array.isArray(formData.reelDays) ? formData.reelDays.filter((d) => WEEK_DAYS.has(String(d))) : [];
    const storyDays = Array.isArray(formData.storyDays) ? formData.storyDays.filter((d) => WEEK_DAYS.has(String(d))) : [];

    const looksLegacy =
      targetAudience.includes("選択曜日") ||
      targetAudience.includes("フィード:") ||
      targetAudience.includes("リール:") ||
      targetAudience.includes("ストーリーズ:");

    if (!looksLegacy && feedDays.length > 0 && reelDays.length > 0 && storyDays.length > 0) {
      continue;
    }

    const legacy = extractLegacyScheduleFromTargetAudience(targetAudience);
    const nextFeedDays = feedDays.length > 0 ? feedDays : legacy.feedDays;
    const nextReelDays = reelDays.length > 0 ? reelDays : legacy.reelDays;
    const nextStoryDays = storyDays.length > 0 ? storyDays : legacy.storyDays;
    const nextTargetAudience = looksLegacy ? legacy.cleanText : targetAudience;

    if (
      JSON.stringify(feedDays) === JSON.stringify(nextFeedDays) &&
      JSON.stringify(reelDays) === JSON.stringify(nextReelDays) &&
      JSON.stringify(storyDays) === JSON.stringify(nextStoryDays) &&
      targetAudience === nextTargetAudience
    ) {
      continue;
    }

    migrated += 1;

    if (dryRun) {
      console.log(`[DRY-RUN] migrate ${doc.id}`, {
        targetAudienceBefore: targetAudience,
        targetAudienceAfter: nextTargetAudience,
        feedDays: nextFeedDays,
        reelDays: nextReelDays,
        storyDays: nextStoryDays,
      });
      continue;
    }

    await doc.ref.update({
      "formData.feedDays": nextFeedDays,
      "formData.reelDays": nextReelDays,
      "formData.storyDays": nextStoryDays,
      "formData.targetAudience": nextTargetAudience,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  console.log(`done: scanned=${scanned}, migrated=${migrated}, dryRun=${dryRun}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
