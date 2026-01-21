import { adminDb } from "@/lib/firebase-admin";
import { UserProfile } from "@/types/user";
import { AIActionLog, AIReference, SnapshotReference } from "@/types/ai";
import { getLearningPhaseLabel } from "@/utils/learningPhase";
interface MasterContextSummary {
  learningPhase?: string;
  ragHitRate?: number;
  totalInteractions?: number;
  feedbackStats?: {
    total?: number;
    positiveRate?: number;
    averageWeight?: number;
  };
  actionStats?: {
    total?: number;
    adoptionRate?: number;
    averageResultDelta?: number;
  };
  achievements?: Array<{
    id: string;
    title: string;
    description: string;
    icon?: string;
    status?: string;
    progress?: number;
  }>;
}

const DEFAULT_OPTIONS = {
  includeUserProfile: true,
  includePlan: true,
  includeSnapshots: true,
  includeMasterContext: false,
  includeActionLogs: true,
  includeAbTests: true,
  snapshotLimit: 5,
  actionLogLimit: 6,
  abTestLimit: 3,
};

type BuildAIContextOptions = Partial<typeof DEFAULT_OPTIONS>;

export interface AIContextBundle {
  userProfile?: UserProfile | null;
  latestPlan?: Record<string, unknown> | null;
  snapshotReferences: SnapshotReference[];
  masterContext?: MasterContextSummary | null;
  references: AIReference[];
  actionLogs?: AIActionLog[];
  abTests?: Array<{
    id: string;
    name: string;
    status: string;
    primaryMetric?: string;
    winnerVariantLabel?: string | null;
    summary?: string;
  }>;
}
async function fetchCachedMasterContext(userId: string): Promise<MasterContextSummary | null> {
  try {
    const doc = await adminDb.collection("ai_master_context_cache").doc(userId).get();
    if (!doc.exists) {
      return null;
    }
    const cacheData = doc.data() || {};
    const context = (cacheData.context || null) as MasterContextSummary | null;
    if (!context) {
      return null;
    }
    return {
      learningPhase: context.learningPhase,
      ragHitRate: context.ragHitRate,
      totalInteractions: context.totalInteractions,
      feedbackStats: context.feedbackStats,
      actionStats: context.actionStats,
      achievements: context.achievements,
    };
  } catch (error) {
    console.warn("⚠️ マスターコンテキストキャッシュ取得エラー:", error);
    return null;
  }
}

function formatDelta(value?: number, suffix = "%") {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  const rounded = Number(value.toFixed(1));
  const sign = rounded > 0 ? "+" : rounded < 0 ? "" : "";
  return `${sign}${rounded}${suffix}`;
}

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const doc = await adminDb.collection("users").doc(userId).get();
    return doc.exists ? (doc.data() as UserProfile) : null;
  } catch (error) {
    console.warn("⚠️ ユーザープロファイル取得エラー:", error);
    return null;
  }
}

async function fetchLatestPlan(userId: string): Promise<Record<string, unknown> | null> {
  try {
    const plansSnapshot = await adminDb
      .collection("plans")
      .where("userId", "==", userId)
      .where("snsType", "==", "instagram")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (plansSnapshot.empty) {
      return null;
    }

    const doc = plansSnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.warn("⚠️ 運用計画取得エラー:", error);
    return null;
  }
}

export async function fetchSnapshotReferences(
  userId: string,
  limit = 5
): Promise<SnapshotReference[]> {
  try {
    const snapshotRef = await adminDb
      .collection("users")
      .doc(userId)
      .collection("postPerformanceSnapshots")
      .orderBy("createdAt", "desc")
      .limit(limit * 3)
      .get();

    if (snapshotRef.empty) {
      return [];
    }

    const snapshots = snapshotRef.docs.map((doc) => {
      const data = doc.data();
      const postId = data.postId || data.source?.postId || null;
      const status = data.status ?? "normal";
      const deltaMetrics = data.deltaMetrics || {};
      const saveRateDelta = formatDelta(deltaMetrics.saveRateDeltaPct ?? deltaMetrics.saveRateDelta);
      const engagementDelta = formatDelta(
        deltaMetrics.engagementRateDeltaPct ?? deltaMetrics.engagementRateDelta
      );
      const reachDelta =
        typeof deltaMetrics.reachDelta === "number" && !Number.isNaN(deltaMetrics.reachDelta)
          ? `${deltaMetrics.reachDelta >= 0 ? "+" : ""}${Number(
              deltaMetrics.reachDelta.toFixed(0)
            )}`
          : null;
      const deltaSummaryParts = [
        saveRateDelta ? `保存率${saveRateDelta}` : null,
        engagementDelta ? `ER${engagementDelta}` : null,
        reachDelta ? `リーチ${reachDelta}` : null,
      ].filter(Boolean);
      const summaryText =
        deltaSummaryParts.length > 0
          ? `${status === "gold" ? "成功" : status === "negative" ? "改善" : "参考"}: ${
              data.source?.title || "無題"
            }（${deltaSummaryParts.join(" / ")}）`
          : `${status === "gold" ? "成功" : status === "negative" ? "改善" : "参考"}: ${
              data.source?.title || "無題"
            }（ER: ${data.metrics?.engagementRate?.toFixed?.(1) ?? "-"}%, 保存率: ${
              data.metrics?.saveRate?.toFixed?.(1) ?? "-"
            }%）`;
      return {
        id: doc.id,
        status,
        score: typeof data.score === "number" ? Number(data.score.toFixed(3)) : 0,
        postId,
        title: data.source?.title,
        postType: data.source?.postType,
        metrics: data.metrics
          ? {
              engagementRate: data.metrics.engagementRate,
              saveRate: data.metrics.saveRate,
              reach: data.metrics.reach,
              saves: data.metrics.saves,
            }
          : undefined,
        summary: summaryText,
        textFeatures: data.textFeatures || undefined,
      } as SnapshotReference;
    });

    // analyticsコレクション（分析済みデータ）に存在する投稿のみをフィルタリング
    const postIdsWithSnapshots = snapshots
      .map((s) => s.postId)
      .filter((id): id is string => Boolean(id));
    
    const analyzedPostIds = new Set<string>();
    if (postIdsWithSnapshots.length > 0) {
      // バッチでanalyticsコレクションに存在するか確認（Firestoreの制限: 10件ずつ）
      const batchSize = 10;
      for (let i = 0; i < postIdsWithSnapshots.length; i += batchSize) {
        const batch = postIdsWithSnapshots.slice(i, i + batchSize);
        try {
          // analyticsコレクションでpostIdが存在するか確認
          const analyticsQueries = await Promise.all(
            batch.map((postId) =>
              adminDb
                .collection("analytics")
                .where("postId", "==", postId)
                .limit(1)
                .get()
            )
          );
          analyticsQueries.forEach((querySnapshot, index) => {
            if (!querySnapshot.empty) {
              analyzedPostIds.add(batch[index]);
            }
          });
        } catch (error) {
          console.error("スナップショット参照のanalytics確認エラー:", error);
          // エラーが発生した場合は、すべての投稿を有効とみなす（フォールバック）
          batch.forEach((postId) => analyzedPostIds.add(postId));
        }
      }
    }

    // analyticsコレクションに存在する投稿（分析済み）のスナップショットのみを抽出
    const validSnapshots = snapshots.filter(
      (snapshot) => !snapshot.postId || analyzedPostIds.has(snapshot.postId)
    );

    const gold = validSnapshots.filter((snapshot) => snapshot.status === "gold").slice(0, limit);
    const negative = validSnapshots.filter((snapshot) => snapshot.status === "negative").slice(0, limit);

    const remaining = limit - gold.length;
    const normalFallback =
      remaining > 0
        ? validSnapshots.filter((snapshot) => snapshot.status === "normal").slice(0, remaining)
        : [];

    return [...gold, ...negative, ...normalFallback];
  } catch (error) {
    console.warn("⚠️ スナップショット参照取得エラー:", error);
    return [];
  }
}

async function fetchRecentActionLogs(userId: string, limit = 6): Promise<AIActionLog[]> {
  try {
    const snapshot = await adminDb
      .collection("ai_action_logs")
      .where("userId", "==", userId)
      .limit(limit * 3)
      .get();

    if (snapshot.empty) {
      return [];
    }

    const logsWithTimestamps = snapshot.docs.map((doc) => {
      const data = doc.data() || {};
      const updatedAtDate = data.updatedAt?.toDate?.() ?? null;
      const createdAtDate = data.createdAt?.toDate?.() ?? null;
      const referenceTime = (updatedAtDate ?? createdAtDate)?.getTime?.() ?? 0;
      return {
        id: doc.id,
        actionId: data.actionId ?? doc.id,
        title: data.title ?? "アクション",
        focusArea: data.focusArea ?? "",
        applied: Boolean(data.applied),
        resultDelta: typeof data.resultDelta === "number" ? Number(data.resultDelta) : null,
        feedback: data.feedback ?? "",
        createdAt: createdAtDate ? createdAtDate.toISOString() : null,
        updatedAt: updatedAtDate ? updatedAtDate.toISOString() : null,
        _referenceTime: referenceTime,
      };
    });

    return logsWithTimestamps
      .sort((a, b) => (b._referenceTime || 0) - (a._referenceTime || 0))
      .slice(0, limit)
      .map(({ _referenceTime, ...log }) => log);
  } catch (error) {
    console.warn("⚠️ アクションログ取得エラー (AI context):", error);
    return [];
  }
}

async function fetchRecentAbTests(
  userId: string,
  limit = 3
): Promise<
  Array<{
    id: string;
    name: string;
    status: string;
    primaryMetric?: string;
    winnerVariantLabel?: string | null;
    summary?: string;
    winnerMetrics?: Record<string, number>;
    updatedAt?: string | null;
  }>
> {
  try {
    const snapshot = await adminDb.collection("ab_tests").where("userId", "==", userId).get();

    if (snapshot.empty) {
      return [];
    }

    const tests = snapshot.docs.map((doc) => {
      const data = doc.data() || {};
      const variants = Array.isArray(data.variants) ? (data.variants as unknown[]) : [];
      const winnerVariant =
        variants.find((variant: unknown) => {
          const v = variant as Record<string, unknown> & { id?: string; key?: string; result?: string };
          if (data.winnerVariantId) {
            return v.id === data.winnerVariantId || v.key === data.winnerVariantId;
          }
          return v.result === "win";
        }) as Record<string, unknown> & { label?: string; metrics?: { engagementRate?: number; saveRate?: number } } | null;
      const summaryParts: string[] = [];

      if (data.primaryMetric) {
        summaryParts.push(`指標: ${data.primaryMetric}`);
      }
      if (winnerVariant?.label) {
        summaryParts.push(`勝者: ${winnerVariant.label}`);
      }
      if (winnerVariant?.metrics?.engagementRate) {
        summaryParts.push(`ER ${Number(winnerVariant.metrics.engagementRate).toFixed?.(1)}%`);
      }
      if (winnerVariant?.metrics?.saveRate) {
        summaryParts.push(`保存率 ${Number(winnerVariant.metrics.saveRate).toFixed?.(1)}%`);
      }

      return {
        id: doc.id,
        name: data.name ?? "A/Bテスト",
        status: data.status ?? "running",
        primaryMetric: data.primaryMetric ?? undefined,
        winnerVariantLabel: winnerVariant?.label ?? null,
        summary: summaryParts.join(" / ") || undefined,
        winnerMetrics: winnerVariant?.metrics ?? undefined,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    return tests
      .sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, limit);
  } catch (error) {
    console.warn("⚠️ A/Bテスト取得エラー (AI context):", error);
    return [];
  }
}

export async function buildAIContext(
  userId: string,
  options: BuildAIContextOptions = {}
): Promise<AIContextBundle> {
  const merged = { ...DEFAULT_OPTIONS, ...options };

  const [userProfile, latestPlan, snapshotReferences, masterContext, actionLogs, abTests] =
    await Promise.all([
      merged.includeUserProfile ? fetchUserProfile(userId) : Promise.resolve(null),
      merged.includePlan ? fetchLatestPlan(userId) : Promise.resolve(null),
      merged.includeSnapshots
        ? fetchSnapshotReferences(userId, merged.snapshotLimit)
        : Promise.resolve([] as SnapshotReference[]),
      merged.includeMasterContext ? fetchCachedMasterContext(userId) : Promise.resolve(null),
      merged.includeActionLogs
        ? fetchRecentActionLogs(userId, merged.actionLogLimit)
        : Promise.resolve([] as AIActionLog[]),
      merged.includeAbTests
        ? fetchRecentAbTests(userId, merged.abTestLimit)
        : Promise.resolve([] as ReturnType<typeof fetchRecentAbTests> extends Promise<infer R> ? R : []),
    ]);

  const references: AIReference[] = [];

  if (userProfile) {
      references.push({
        id: userId,
        sourceType: "profile",
        label: userProfile.name || "アカウント設定",
        summary: userProfile.businessInfo?.description || userProfile.notes || undefined,
      });
  }

  if (latestPlan) {
    references.push({
      id: String(latestPlan.id ?? "plan"),
      sourceType: "plan",
      label: typeof latestPlan.title === "string" ? latestPlan.title : "最新の運用計画",
      summary:
        typeof latestPlan.generatedStrategy === "string"
          ? latestPlan.generatedStrategy.slice(0, 160)
          : undefined,
      metadata: {
        planType: latestPlan.planType,
      },
    });
  }

  if (masterContext) {
    references.push({
      id: `master-context-${userId}`,
      sourceType: "masterContext",
      label: "マスターコンテキスト",
      summary: `フェーズ:${getLearningPhaseLabel(masterContext.learningPhase)} / RAG:${Math.round(
        (masterContext.ragHitRate || 0) * 100
      )}%`,
      metadata: {
        learningPhase: masterContext.learningPhase,
        ragHitRate: masterContext.ragHitRate,
        totalInteractions: masterContext.totalInteractions,
      },
    });

    if (masterContext.feedbackStats) {
      references.push({
        id: `feedback-stats-${userId}`,
        sourceType: "feedback",
        label: "フィードバック統計",
        summary: `総数 ${masterContext.feedbackStats.total} / 好感度 ${Math.round(
          (masterContext.feedbackStats.positiveRate || 0) * 100
        )}%`,
        metadata: masterContext.feedbackStats,
      });
    }

    if (masterContext.actionStats) {
      references.push({
        id: `action-stats-${userId}`,
        sourceType: "analytics",
        label: "アクションログ",
        summary: `採用率 ${Math.round((masterContext.actionStats.adoptionRate || 0) * 100)}%`,
        metadata: masterContext.actionStats,
      });
    }

    if (masterContext.achievements?.length) {
      masterContext.achievements.slice(0, 3).forEach((badge) => {
        references.push({
          id: `badge-${badge.id}`,
          sourceType: "analytics",
          label: badge.title,
          summary: badge.description,
          metadata: {
            progress: badge.progress,
            status: badge.status,
          },
        });
      });
    }
  }

  snapshotReferences.forEach((snapshot) => {
    references.push({
      id: snapshot.id,
      sourceType: "snapshot",
      label: snapshot.title || "投稿実績",
      summary: snapshot.summary,
      metadata: {
        status: snapshot.status,
        score: snapshot.score,
        postType: snapshot.postType,
      },
    });
  });

  if (actionLogs.length > 0) {
    actionLogs.slice(0, merged.actionLogLimit).forEach((log) => {
      const focusLabel = log.focusArea ? `フォーカス: ${log.focusArea}` : null;
      const statusLabel = log.applied ? "実行済み" : "未実行";
      const resultLabel =
        typeof log.resultDelta === "number"
          ? `効果: ${log.resultDelta > 0 ? "+" : ""}${Number(log.resultDelta.toFixed(1))}`
          : null;
      const updatedLabel = log.updatedAt
        ? `更新: ${new Date(log.updatedAt).toLocaleDateString("ja-JP")}`
        : null;
      references.push({
        id: `action-${log.actionId}`,
        sourceType: "analytics",
        label: `${statusLabel}: ${log.title}`,
        summary: [focusLabel, resultLabel, updatedLabel].filter(Boolean).join(" / ") || undefined,
        metadata: {
          focusArea: log.focusArea,
          applied: log.applied,
          resultDelta: log.resultDelta,
          feedback: log.feedback,
          updatedAt: log.updatedAt,
        },
      });
    });
  }

  if (abTests.length > 0) {
    abTests.forEach((test) => {
      references.push({
        id: `abtest-${test.id}`,
        sourceType: "analytics",
        label: `A/B: ${test.name}`,
        summary: test.summary,
        metadata: {
          type: "abTest",
          status: test.status,
          primaryMetric: test.primaryMetric,
          winnerVariant: test.winnerVariantLabel,
          winnerMetrics: test.winnerMetrics,
        },
      });
    });
  }

  return {
    userProfile: merged.includeUserProfile ? userProfile : undefined,
    latestPlan: merged.includePlan ? latestPlan : undefined,
    snapshotReferences,
    masterContext: merged.includeMasterContext ? masterContext : undefined,
    references,
    actionLogs: merged.includeActionLogs ? actionLogs : undefined,
    abTests: merged.includeAbTests ? abTests : undefined,
  };
}

