import { adminDb } from "@/lib/firebase-admin";
import { fetchAIDirection } from "@/lib/ai/context";
import { getMasterContext } from "@/app/api/ai/monthly-analysis/infra/firestore/master-context";
import { COLLECTIONS } from "@/repositories/collections";

type PlanLike = {
  title?: string;
  generatedStrategy?: string;
  formData?: Record<string, unknown>;
  planData?: Record<string, unknown>;
} | null;

interface BuildLabContextInput {
  userId: string;
  latestPlan: PlanLike;
  requestPlanData: Record<string, unknown> | null;
}

interface LabContextResult {
  mustDo: string[];
  avoid: string[];
  kpiFocus: string[];
  styleRules: string[];
  promptBlock: string;
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function uniq(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

function take(items: string[], limit: number): string[] {
  return items.slice(0, Math.max(0, limit));
}

async function fetchLatestMonthlyActionPlans(userId: string): Promise<string[]> {
  try {
    const snapshot = await adminDb
      .collection(COLLECTIONS.MONTHLY_REVIEWS)
      .where("userId", "==", userId)
      .limit(8)
      .get();

    if (snapshot.empty) {
      return [];
    }

    const docs = snapshot.docs
      .map((doc) => ({ id: doc.id, data: doc.data() || {} }))
      .sort((a, b) => {
        const aMonth = String(a.data.month || "").trim();
        const bMonth = String(b.data.month || "").trim();
        return bMonth.localeCompare(aMonth);
      });

    const latest = docs[0]?.data;
    if (!latest) {
      return [];
    }

    const actionPlans = Array.isArray(latest.actionPlans) ? latest.actionPlans : [];
    const actions: string[] = [];
    for (const plan of actionPlans) {
      if (!plan || typeof plan !== "object") {
        continue;
      }
      const row = plan as Record<string, unknown>;
      const title = String(row.title || "").trim();
      const recommendedActions = toStringList(row.recommendedActions);
      if (title) {
        actions.push(title);
      }
      actions.push(...recommendedActions);
    }
    return take(uniq(actions), 6);
  } catch (error) {
    console.warn("LabContext: monthly action plans fetch failed", error);
    return [];
  }
}

export async function buildLabContext(input: BuildLabContextInput): Promise<LabContextResult> {
  const [aiDirection, masterContext, monthlyActions] = await Promise.all([
    fetchAIDirection(input.userId),
    getMasterContext(input.userId).catch(() => null),
    fetchLatestMonthlyActionPlans(input.userId),
  ]);

  const planFormData =
    ((input.latestPlan?.formData as Record<string, unknown> | undefined) ||
      (input.requestPlanData?.formData as Record<string, unknown> | undefined) ||
      {}) ?? {};
  const operationPurpose = String(planFormData.operationPurpose || "").trim();
  const contentTypes = toStringList(planFormData.contentTypes);
  const targetAudience = String(planFormData.targetAudience || "").trim();

  const mustDo = uniq([
    aiDirection?.mainTheme ? `今月の軸: ${aiDirection.mainTheme}` : "",
    ...toStringList(aiDirection?.postingRules).map((rule) => `投稿ルール: ${rule}`),
    ...monthlyActions.map((action) => `実行アクション: ${action}`),
    operationPurpose ? `運用目的: ${operationPurpose}` : "",
    targetAudience ? `対象読者: ${targetAudience}` : "",
  ]);

  const avoid = uniq([
    ...toStringList(aiDirection?.avoidFocus).map((focus) => `避ける: ${focus}`),
  ]);

  const kpiFocus = uniq([
    aiDirection?.priorityKPI ? aiDirection.priorityKPI : "",
    ...(masterContext?.recommendations || []).filter((item): item is string => typeof item === "string").slice(0, 3),
  ]);

  const styleRules = uniq([
    contentTypes.length > 0 ? `投稿種類は ${contentTypes.join(" / ")} の範囲に寄せる` : "",
    aiDirection?.optimalPostingTime ? `推奨投稿時間帯: ${aiDirection.optimalPostingTime}` : "",
  ]);

  const toBullet = (items: string[], empty = "なし") =>
    items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : `- ${empty}`;

  const promptBlock = `【LabContext（統合要約・優先順）】
1) 今月の方針と禁止事項
${toBullet(take([...mustDo, ...avoid], 8))}
2) 月次レポート由来の次アクション
${toBullet(take(monthlyActions, 5))}
3) 学習インサイト（分析アドバイス）
${toBullet(take(kpiFocus, 4))}
4) 保存計画からの制約
${toBullet(take(styleRules, 4))}

【生成時ルール】
- 上記4セクションの優先順を守る
- 矛盾がある場合は「今月の方針と禁止事項」を優先
- 投稿文では must-do を反映し、avoid を回避する`;

  return {
    mustDo,
    avoid,
    kpiFocus,
    styleRules,
    promptBlock,
  };
}
