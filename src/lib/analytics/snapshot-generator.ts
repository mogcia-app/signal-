import { adminDb } from "../firebase-admin";

type FirestoreTimestamp = FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;

interface SnapshotGenerationOptions {
  windowDays?: number;
  dryRun?: boolean;
}

interface AudienceSnapshot {
  gender?: Record<string, number>;
  age?: Record<string, number>;
}

interface AnalyticsRecord {
  id: string;
  postId?: string | null;
  userId: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  saves: number;
  followerIncrease?: number;
  engagementRate?: number;
  publishedAt?: Date | null;
  createdAt?: Date | null;
  title?: string;
  content?: string;
  hashtags?: string[];
  postType?: string;
  audience?: AudienceSnapshot;
}

interface PostRecord {
  id: string;
  title?: string;
  content?: string;
  hashtags?: string[];
  postType?: string;
  createdAt?: Date | null;
}

interface MetricsBundle {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  engagementRate: number;
  saveRate: number;
}

type TextFeatureValue = string | number | boolean | string[];

interface SnapshotDocument {
  userId: string;
  analyticsId: string;
  postId?: string | null;
  status: "gold" | "negative" | "normal";
  score: number;
  metrics: MetricsBundle;
  zScores: Record<string, number>;
  deltaMetrics: Record<string, number>;
  personaInsights: {
    topGender?: { segment: string; value: number };
    topAgeRange?: { segment: string; value: number };
    summary?: string[];
    raw?: AudienceSnapshot;
    topGenderDiff?: { segment: string; delta: number };
    topAgeDiff?: { segment: string; delta: number };
  };
  textFeatures: Record<string, TextFeatureValue>;
  publishedAt?: Date | null;
  source: {
    title?: string;
    postType?: string;
    hashtags?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_WINDOW_DAYS = 90;
const BATCH_WRITE_LIMIT = 400;

const CTA_HARD_PATTERNS =
  /(詳細はこちら|プロフィールリンク|今すぐ|限定|予約|DM|お問い合わせ|申し込み|購入|チェック|URL|リンク)/i;
const CTA_SOFT_PATTERNS = /(保存|シェア|コメント|感想|フォロー|スクショ|いいね)/i;
const STORY_PATTERNS = /(ストーリー|体験|before|after|だった|でした)/i;
const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

function toDate(value: unknown): Date | null {
  if (!value) {return null;}
  if (value instanceof Date) {return value;}
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    // @ts-expect-error Firestore Timestamp duck typing
    return value.toDate();
  }
  return null;
}

function safeNumber(value: unknown, fallback = 0) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function mean(values: number[]) {
  if (values.length === 0) {return 0;}
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function std(values: number[], meanValue: number) {
  if (values.length <= 1) {return 0;}
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - meanValue, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function zScore(value: number, meanValue: number, stdValue: number) {
  if (stdValue === 0) {return 0;}
  return (value - meanValue) / stdValue;
}

function extractTextFeatures(post?: PostRecord, analytics?: AnalyticsRecord) {
  const content = (post?.content || analytics?.content || "").trim();
  const hashtags = post?.hashtags || analytics?.hashtags || [];
  const lines = content ? content.split(/\r?\n/) : [];
  const paragraphs = content ? content.split(/\n\s*\n+/).filter((block) => block.trim()) : [];
  const wordTokens = content ? content.split(/\s+/).filter(Boolean) : [];
  const sentenceMatches = content
    ? content.match(/[^\n.!?！？。]+[.!?！？。]?/g) ?? []
    : [];

  const wordCount = wordTokens.length;
  const characterCount = content.length;
  const sentenceCount = sentenceMatches.length;
  const avgSentenceLength = sentenceCount > 0 ? Number((wordCount / sentenceCount).toFixed(2)) : 0;
  const paragraphCount = paragraphs.length || (content ? 1 : 0);

  const bulletLines = lines.filter((line) => /^\s*[-*・••・▶︎>]/.test(line));
  const hasBullets = bulletLines.length > 0;
  const bulletCount = bulletLines.length;
  const hasHashtags = hashtags.length > 0 || /#[^\s#]+/.test(content);
  const hashtagsCount = hashtags.length || (content.match(/#[^\s#]+/g)?.length ?? 0);
  const containsHardCta = CTA_HARD_PATTERNS.test(content);
  const containsSoftCta = CTA_SOFT_PATTERNS.test(content);
  const containsCTA = containsHardCta || containsSoftCta;
  const ctaType = containsHardCta ? "conversion" : containsSoftCta ? "engagement" : "none";
  const introSentence = lines[0] || "";
  const introStyle = STORY_PATTERNS.test(introSentence)
    ? "story"
    : /^\s*(Q|？|\?)/.test(introSentence)
      ? "question"
      : "statement";
  const hasEmoji = EMOJI_REGEX.test(content);

  const structureTags: string[] = [];
  if (introStyle === "story") {
    structureTags.push("story_intro");
  }
  if (introStyle === "question") {
    structureTags.push("question_intro");
  }
  if (hasBullets) {
    structureTags.push("bullet_list");
  }
  if (ctaType !== "none") {
    structureTags.push(ctaType === "conversion" ? "cta_hard" : "cta_soft");
  }
  if (hasEmoji) {
    structureTags.push("emoji_rich");
  }
  if (paragraphCount >= 3) {
    structureTags.push("long_form");
  }

  return {
    wordCount,
    characterCount,
    sentenceCount,
    avgSentenceLength,
    paragraphCount,
    hasBullets,
    bulletCount,
    hasHashtags,
    hashtagsCount,
    containsCTA,
    ctaType,
    introStyle,
    hasEmoji,
    structureTags,
  };
}

function buildPersonaInsights(audience?: AudienceSnapshot) {
  if (!audience) {
    return { summary: [] };
  }

  const genderEntries = Object.entries(audience.gender || {});
  const ageEntries = Object.entries(audience.age || {});
  const topGender = genderEntries.sort((a, b) => b[1] - a[1])[0];
  const topAge = ageEntries.sort((a, b) => b[1] - a[1])[0];

  const summary: string[] = [];
  if (topGender) {
    summary.push(`${topGender[0]}層の反応が高い（${topGender[1].toFixed(1)}%）`);
  }
  if (topAge) {
    summary.push(`${topAge[0]}層で特にエンゲージメントが高い（${topAge[1].toFixed(1)}%）`);
  }

  return {
    topGender: topGender
      ? { segment: topGender[0], value: Number(topGender[1].toFixed(2)) }
      : undefined,
    topAgeRange: topAge ? { segment: topAge[0], value: Number(topAge[1].toFixed(2)) } : undefined,
    summary,
    raw: audience,
  };
}

function computeMetrics(record: AnalyticsRecord): MetricsBundle {
  const likes = safeNumber(record.likes);
  const comments = safeNumber(record.comments);
  const shares = safeNumber(record.shares);
  const saves = safeNumber(record.saves);
  const reach = Math.max(0, safeNumber(record.reach));
  const engagementRate =
    reach > 0 ? ((likes + comments + shares + saves) / reach) * 100 : safeNumber(record.engagementRate);
  const saveRate = reach > 0 ? (saves / reach) * 100 : 0;

  return {
    likes,
    comments,
    shares,
    saves,
    reach,
    engagementRate,
    saveRate,
  };
}

function buildDeltaMetrics(metrics: MetricsBundle, averages: MetricsBundle) {
  const deltas: Record<string, number> = {};
  (Object.keys(metrics) as (keyof MetricsBundle)[]).forEach((key) => {
    deltas[`${key}Delta`] = Number((metrics[key] - averages[key]).toFixed(2));
    const avg = averages[key];
    if (avg !== 0) {
      deltas[`${key}DeltaPct`] = Number((((metrics[key] - avg) / Math.abs(avg)) * 100).toFixed(2));
    }
  });
  return deltas;
}

async function deleteExistingSnapshots(userId: string) {
  const snapshotCollection = adminDb.collection("users").doc(userId).collection("postPerformanceSnapshots");
  const existing = await snapshotCollection.get();
  if (existing.empty) {return 0;}

  let batch = adminDb.batch();
  let writeCount = 0;
  let totalDeleted = 0;

  for (const doc of existing.docs) {
    batch.delete(doc.ref);
    writeCount += 1;
    totalDeleted += 1;

    if (writeCount >= BATCH_WRITE_LIMIT) {
      await batch.commit();
      batch = adminDb.batch();
      writeCount = 0;
    }
  }

  if (writeCount > 0) {
    await batch.commit();
  }

  return totalDeleted;
}

async function saveSnapshots(userId: string, snapshots: SnapshotDocument[]) {
  const snapshotCollection = adminDb.collection("users").doc(userId).collection("postPerformanceSnapshots");

  let batch = adminDb.batch();
  let writeCount = 0;

  for (const snapshot of snapshots) {
    const docId = snapshot.analyticsId || snapshot.postId || adminDb.collection("_").doc().id;
    const docRef = snapshotCollection.doc(docId);
    batch.set(docRef, snapshot, { merge: true });
    writeCount += 1;

    if (writeCount >= BATCH_WRITE_LIMIT) {
      await batch.commit();
      batch = adminDb.batch();
      writeCount = 0;
    }
  }

  if (writeCount > 0) {
    await batch.commit();
  }
}

export async function generatePostPerformanceSnapshots(
  userId: string,
  options: SnapshotGenerationOptions = {},
) {
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - windowDays);

  const [analyticsSnapshot, postsSnapshot] = await Promise.all([
    adminDb.collection("analytics").where("userId", "==", userId).get(),
    adminDb.collection("posts").where("userId", "==", userId).get(),
  ]);

  const postsMap = new Map<string, PostRecord>();
  postsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    postsMap.set(doc.id, {
      id: doc.id,
      title: data.title,
      content: data.content,
      hashtags: data.hashtags || [],
      postType: data.postType,
      createdAt: toDate(data.createdAt),
    });
  });

  const analyticsRecords: AnalyticsRecord[] = analyticsSnapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        postId: data.postId,
        userId: data.userId,
        likes: safeNumber(data.likes),
        comments: safeNumber(data.comments),
        shares: safeNumber(data.shares),
        reach: safeNumber(data.reach),
        saves: safeNumber(data.saves ?? data.saveCount),
        followerIncrease: safeNumber(data.followerIncrease),
        engagementRate: safeNumber(data.engagementRate),
        publishedAt: toDate(data.publishedAt),
        createdAt: toDate(data.createdAt),
        title: data.title,
        content: data.content,
        hashtags: data.hashtags || [],
        postType: data.postType,
        audience: data.audience,
      } as AnalyticsRecord;
    })
    .filter((record) => {
      if (!record.publishedAt) {return true;}
      return record.publishedAt >= startDate;
    });

  if (analyticsRecords.length === 0) {
    return {
      userId,
      windowDays,
      processed: 0,
      message: "No analytics records found for the specified window",
    };
  }

  const metricsList = analyticsRecords.map((record) => computeMetrics(record));

  const averages: MetricsBundle = {
    likes: mean(metricsList.map((m) => m.likes)),
    comments: mean(metricsList.map((m) => m.comments)),
    shares: mean(metricsList.map((m) => m.shares)),
    saves: mean(metricsList.map((m) => m.saves)),
    reach: mean(metricsList.map((m) => m.reach)),
    engagementRate: mean(metricsList.map((m) => m.engagementRate)),
    saveRate: mean(metricsList.map((m) => m.saveRate)),
  };

  const stdValues = {
    reach: std(metricsList.map((m) => m.reach), averages.reach),
    engagementRate: std(metricsList.map((m) => m.engagementRate), averages.engagementRate),
    saveRate: std(metricsList.map((m) => m.saveRate), averages.saveRate),
  };

  const snapshots: SnapshotDocument[] = analyticsRecords.map((record, index) => {
    const metrics = metricsList[index];
    const reachZ = zScore(metrics.reach, averages.reach, stdValues.reach);
    const engagementRateZ = zScore(
      metrics.engagementRate,
      averages.engagementRate,
      stdValues.engagementRate,
    );
    const saveRateZ = zScore(metrics.saveRate, averages.saveRate, stdValues.saveRate);

    const score = Number((0.5 * engagementRateZ + 0.3 * saveRateZ + 0.2 * reachZ).toFixed(3));
    const status: SnapshotDocument["status"] =
      score >= 1 ? "gold" : score <= -1 ? "negative" : "normal";

    const post = record.postId ? postsMap.get(record.postId) : undefined;
    const deltaMetrics = buildDeltaMetrics(metrics, averages);

    return {
      userId,
      analyticsId: record.id,
      postId: record.postId || null,
      status,
      score,
      metrics: {
        ...metrics,
        engagementRate: Number(metrics.engagementRate.toFixed(2)),
        saveRate: Number(metrics.saveRate.toFixed(2)),
      },
      zScores: {
        reach: Number(reachZ.toFixed(3)),
        engagementRate: Number(engagementRateZ.toFixed(3)),
        saveRate: Number(saveRateZ.toFixed(3)),
      },
      deltaMetrics,
      personaInsights: buildPersonaInsights(record.audience),
      textFeatures: extractTextFeatures(post, record),
      publishedAt: record.publishedAt ?? post?.createdAt ?? null,
      source: {
        title: post?.title || record.title,
        postType: post?.postType || record.postType,
        hashtags: post?.hashtags?.length ? post.hashtags : record.hashtags,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  const goldCount = snapshots.filter((s) => s.status === "gold").length;
  const negativeCount = snapshots.filter((s) => s.status === "negative").length;

  let deletedCount = 0;
  if (!options.dryRun) {
    deletedCount = await deleteExistingSnapshots(userId);
    await saveSnapshots(userId, snapshots);
  }

  return {
    userId,
    windowDays,
    processed: snapshots.length,
    goldCount,
    negativeCount,
    dryRun: Boolean(options.dryRun),
    deletedCount,
    savedCount: options.dryRun ? 0 : snapshots.length,
  };
}

