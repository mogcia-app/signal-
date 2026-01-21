import { adminDb } from "@/lib/firebase-admin";
import type {
  ABTestSummary,
  ABTestVariantMetrics,
  ABTestResultTag,
  ABTestVariantResult,
  ABTestVariant,
} from "@/types/ab-test";

function formatMetricSummary(metrics?: ABTestVariantMetrics | null) {
  if (!metrics) {
    return undefined;
  }
  const parts: string[] = [];
  if (typeof metrics.engagementRate === "number") {
    parts.push(`ER ${metrics.engagementRate.toFixed(1)}%`);
  }
  if (typeof metrics.saveRate === "number") {
    parts.push(`保存率 ${metrics.saveRate.toFixed(1)}%`);
  }
  if (typeof metrics.reach === "number") {
    parts.push(`リーチ ${metrics.reach.toLocaleString()}`);
  } else if (typeof metrics.impressions === "number") {
    parts.push(`IMP ${metrics.impressions.toLocaleString()}`);
  }
  if (typeof metrics.saves === "number") {
    parts.push(`保存数 ${metrics.saves.toLocaleString()}`);
  }
  if (typeof metrics.conversions === "number") {
    parts.push(`CV ${metrics.conversions.toLocaleString()}`);
  }
  return parts.length > 0 ? parts.join(" / ") : undefined;
}

export async function fetchAbTestSummaries(
  userId: string,
  limit = 5
): Promise<ABTestSummary[]> {
  const snapshot = await adminDb.collection("ab_tests").where("userId", "==", userId).get();

  if (snapshot.empty) {
    return [];
  }

  const summaries: ABTestSummary[] = snapshot.docs.map((doc) => {
    const data = doc.data() || {};
    const variantsRaw = Array.isArray(data.variants) ? (data.variants as unknown[]) : [];

    const variants = variantsRaw.map((variant: unknown) => {
      const v = variant as Record<string, unknown>;
      return {
        label: (typeof v.label === "string" ? v.label : "バリエーション") as string,
        metrics: (v.metrics as ABTestVariantMetrics | undefined) || undefined,
        result: (v.result as ABTestVariantResult | undefined) || "pending",
        linkedPostId: (typeof v.linkedPostId === "string" ? v.linkedPostId : null) as string | null,
      };
    });

    const winnerVariant =
      (variantsRaw.find((variant: unknown) => {
        const v = variant as Record<string, unknown> & { id?: string; key?: string; result?: string };
        if (data.winnerVariantId) {
          return v.id === data.winnerVariantId || v.key === data.winnerVariantId;
        }
        if (data.winnerVariantKey) {
          return v.id === data.winnerVariantKey || v.key === data.winnerVariantKey;
        }
        return v.result === "win";
      }) as Record<string, unknown> & { label?: string; metrics?: { engagementRate?: number; saveRate?: number } } | null) || null;

    const summaryParts: string[] = [];
    if (data.primaryMetric) {
      summaryParts.push(`指標: ${data.primaryMetric}`);
    }
    if (winnerVariant?.label) {
      summaryParts.push(`勝者: ${winnerVariant.label}`);
    }
    if (winnerVariant?.metrics?.engagementRate != null) {
      summaryParts.push(`ER ${Number(winnerVariant.metrics.engagementRate).toFixed(1)}%`);
    }
    if (winnerVariant?.metrics?.saveRate != null) {
      summaryParts.push(`保存率 ${Number(winnerVariant.metrics.saveRate).toFixed(1)}%`);
    }

    return {
      id: doc.id,
      name: data.name || "A/Bテスト",
      status: data.status || "draft",
      primaryMetric: data.primaryMetric || undefined,
      winnerVariantLabel: winnerVariant?.label || null,
      summary: summaryParts.length ? summaryParts.join(" / ") : undefined,
      completedAt: data.completedAt?.toDate?.()?.toISOString?.() || null,
      variants,
    };
  });

  return summaries
    .sort((a, b) => {
      const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, limit);
}

export function mapAbTestResultsByPost(abTests: ABTestSummary[]): Map<string, ABTestResultTag[]> {
  const map = new Map<string, ABTestResultTag[]>();

  abTests.forEach((test) => {
    test.variants?.forEach((variant) => {
      const postId = variant.linkedPostId;
      if (!postId) {
        return;
      }

      const resultTag: ABTestResultTag = {
        testId: test.id,
        testName: test.name,
        variantLabel: variant.label,
        result: variant.result as ABTestVariantResult | undefined,
        primaryMetric: test.primaryMetric,
        metricSummary: formatMetricSummary(variant.metrics),
        linkedPostId: postId,
        winnerVariantLabel: test.winnerVariantLabel ?? null,
      };

      if (!map.has(postId)) {
        map.set(postId, []);
      }
      map.get(postId)!.push(resultTag);
    });
  });

  return map;
}

