import * as admin from "firebase-admin";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/repositories/collections";

export interface SuggestionLearningMeta {
  suggestionId: string;
  patternKey: string;
  patternLabel: string;
  postType: "feed" | "reel" | "story";
}

export interface SuggestionPatternStat {
  patternKey: string;
  patternLabel: string;
  postType: "feed" | "reel" | "story";
  avgScore: number;
  usageCount: number;
  adoptedCount: number;
  improvedCount: number;
}

function randomIdPart(): string {
  return Math.random().toString(36).slice(2, 8);
}

function normalizePart(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-");
}

function toPatternDocId(userId: string, patternKey: string): string {
  const safeKey = normalizePart(patternKey).slice(0, 80) || "default";
  return `${userId}_${safeKey}`;
}

export function createSuggestionLearningMeta(input: {
  postType: "feed" | "reel" | "story";
  feedPostType?: string;
  playbookSectionIds?: string[];
}): SuggestionLearningMeta {
  const playbookKey = (input.playbookSectionIds || []).slice(0, 2).join("+") || "general";
  const feedType = input.feedPostType || "default";
  const patternKey = `${input.postType}|${feedType}|${playbookKey}`;
  const suggestionId = `sg_${Date.now()}_${randomIdPart()}`;
  return {
    suggestionId,
    patternKey,
    patternLabel: `${input.postType}/${feedType}/${playbookKey}`,
    postType: input.postType,
  };
}

export async function fetchTopSuggestionPatterns(input: {
  userId: string;
  postType: "feed" | "reel" | "story";
  limit?: number;
}): Promise<SuggestionPatternStat[]> {
  const limit = input.limit ?? 3;
  const snapshot = await adminDb
    .collection(COLLECTIONS.AI_SUGGESTION_PATTERNS)
    .where("userId", "==", input.userId)
    .get();

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs
    .map((doc) => doc.data() || {})
    .filter((data) => data.postType === input.postType)
    .map((data) => ({
      patternKey: String(data.patternKey || ""),
      patternLabel: String(data.patternLabel || data.patternKey || ""),
      postType: data.postType as "feed" | "reel" | "story",
      avgScore: typeof data.avgScore === "number" ? data.avgScore : 0,
      usageCount: typeof data.usageCount === "number" ? data.usageCount : 0,
      adoptedCount: typeof data.adoptedCount === "number" ? data.adoptedCount : 0,
      improvedCount: typeof data.improvedCount === "number" ? data.improvedCount : 0,
    }))
    .sort((a, b) => b.avgScore - a.avgScore || b.usageCount - a.usageCount)
    .slice(0, limit);
}

export function buildSuggestionPriorityPrompt(patterns: SuggestionPatternStat[]): string {
  if (patterns.length === 0) {
    return "";
  }
  const rows = patterns.map(
    (p, index) =>
      `${index + 1}. ${p.patternLabel} (avgScore=${p.avgScore.toFixed(2)}, improved=${p.improvedCount}/${p.usageCount})`
  );
  return `【学習済み提案パターン（優先適用）】
過去に成果が高かった順です。今回のテーマに矛盾しない範囲で優先して適用してください。
${rows.map((row) => `- ${row}`).join("\n")}`;
}

export function computeSuggestionOutcomeScore(input: {
  adopted: boolean;
  improved: boolean;
}): number {
  const adopted = input.adopted ? 1 : 0;
  const improved = input.improved ? 1 : 0;
  return adopted + improved;
}

export async function recordSuggestionOutcome(input: {
  userId: string;
  suggestionId: string;
  patternKey: string;
  patternLabel: string;
  postType: "feed" | "reel" | "story";
  adopted: boolean;
  improved: boolean;
  score: number;
  resultDelta?: number | null;
  feedback?: string;
}): Promise<void> {
  const now = admin.firestore.FieldValue.serverTimestamp();

  const actionLogRef = adminDb
    .collection(COLLECTIONS.AI_ACTION_LOGS)
    .doc(`${input.userId}_${input.suggestionId}`);
  await actionLogRef.set(
    {
      userId: input.userId,
      actionId: input.suggestionId,
      title: `提案学習: ${input.patternLabel}`,
      focusArea: `suggestion-pattern:${input.patternKey}`,
      applied: input.adopted,
      resultDelta: typeof input.resultDelta === "number" ? input.resultDelta : null,
      feedback:
        input.feedback ||
        `score=${input.score} (adopted=${input.adopted ? 1 : 0}, improved=${input.improved ? 1 : 0})`,
      suggestionId: input.suggestionId,
      patternKey: input.patternKey,
      patternLabel: input.patternLabel,
      postType: input.postType,
      improved: input.improved,
      score: input.score,
      updatedAt: now,
      createdAt: now,
    },
    { merge: true }
  );

  const patternRef = adminDb
    .collection(COLLECTIONS.AI_SUGGESTION_PATTERNS)
    .doc(toPatternDocId(input.userId, input.patternKey));

  await adminDb.runTransaction(async (tx) => {
    const doc = await tx.get(patternRef);
    const current = doc.exists ? doc.data() || {} : {};
    const usageCount = (typeof current.usageCount === "number" ? current.usageCount : 0) + 1;
    const adoptedCount =
      (typeof current.adoptedCount === "number" ? current.adoptedCount : 0) +
      (input.adopted ? 1 : 0);
    const improvedCount =
      (typeof current.improvedCount === "number" ? current.improvedCount : 0) +
      (input.improved ? 1 : 0);
    const totalScore = (typeof current.totalScore === "number" ? current.totalScore : 0) + input.score;
    const avgScore = usageCount > 0 ? Number((totalScore / usageCount).toFixed(4)) : 0;

    tx.set(
      patternRef,
      {
        userId: input.userId,
        patternKey: input.patternKey,
        patternLabel: input.patternLabel,
        postType: input.postType,
        usageCount,
        adoptedCount,
        improvedCount,
        totalScore,
        avgScore,
        lastSuggestionId: input.suggestionId,
        updatedAt: now,
        createdAt: current.createdAt || now,
      },
      { merge: true }
    );
  });
}
