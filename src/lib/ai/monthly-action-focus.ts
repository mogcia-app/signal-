import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/repositories/collections";
import { toPreviousMonth } from "@/repositories/firestore-utils";

const normalizeText = (value: unknown): string => String(value || "").trim();

type KpiKey = "likes" | "comments" | "shares" | "saves" | "reach" | "followerIncrease";
type EvaluationStatus = "achieved" | "not_achieved" | "no_data";

interface MonthlyActionPlanRow {
  title?: unknown;
  description?: unknown;
  action?: unknown;
  kpiKey?: unknown;
  kpiLabel?: unknown;
  evaluationRule?: unknown;
}

interface MonthlyKpiSummaryRow {
  totalLikes?: unknown;
  totalComments?: unknown;
  totalShares?: unknown;
  totalSaves?: unknown;
  totalReach?: unknown;
  totalFollowerIncrease?: unknown;
}

export interface MonthlyActionEvaluation {
  status: EvaluationStatus;
  kpiKey: KpiKey;
  kpiLabel: string;
  baselineMonth: string;
  targetMonth: string;
  baselineValue: number | null;
  targetValue: number | null;
  changePercent: number | null;
  summary: string;
}

export interface MonthlyActionFocus {
  month: string;
  title: string;
  description: string;
  action: string;
  kpiKey: KpiKey;
  kpiLabel: string;
  promptText: string;
  evaluation: MonthlyActionEvaluation | null;
}

function inferKpiMeta(row: MonthlyActionPlanRow): { kpiKey: KpiKey; kpiLabel: string } {
  const kpiKeyRaw = normalizeText(row.kpiKey);
  const kpiLabelRaw = normalizeText(row.kpiLabel);
  const allowed: KpiKey[] = ["likes", "comments", "shares", "saves", "reach", "followerIncrease"];
  if (allowed.includes(kpiKeyRaw as KpiKey) && kpiLabelRaw) {
    return { kpiKey: kpiKeyRaw as KpiKey, kpiLabel: kpiLabelRaw };
  }

  const text = `${normalizeText(row.title)} ${normalizeText(row.description)} ${normalizeText(row.action)}`.toLowerCase();
  if (/(保存|save)/.test(text)) {
    return { kpiKey: "saves", kpiLabel: "保存" };
  }
  if (/(コメント|comment)/.test(text)) {
    return { kpiKey: "comments", kpiLabel: "コメント" };
  }
  if (/(シェア|共有|share|repost)/.test(text)) {
    return { kpiKey: "shares", kpiLabel: "シェア" };
  }
  if (/(リーチ|閲覧|reach)/.test(text)) {
    return { kpiKey: "reach", kpiLabel: "リーチ" };
  }
  if (/(フォロワー|follower)/.test(text)) {
    return { kpiKey: "followerIncrease", kpiLabel: "フォロワー増減" };
  }
  return { kpiKey: "likes", kpiLabel: "いいね" };
}

function getMetricValue(summary: MonthlyKpiSummaryRow | null, key: KpiKey): number | null {
  if (!summary) {
    return null;
  }
  if (key === "likes") {
    return Number(summary.totalLikes || 0);
  }
  if (key === "comments") {
    return Number(summary.totalComments || 0);
  }
  if (key === "shares") {
    return Number(summary.totalShares || 0);
  }
  if (key === "saves") {
    return Number(summary.totalSaves || 0);
  }
  if (key === "reach") {
    return Number(summary.totalReach || 0);
  }
  return Number(summary.totalFollowerIncrease || 0);
}

async function fetchActionPlan(uid: string, month: string): Promise<MonthlyActionPlanRow | null> {
  const docRef = adminDb.collection(COLLECTIONS.MONTHLY_REVIEWS).doc(`${uid}_${month}`);
  const doc = await docRef.get();
  if (!doc.exists) {
    return null;
  }
  const data = doc.data() as { actionPlans?: unknown } | undefined;
  const actionPlans = Array.isArray(data?.actionPlans) ? (data?.actionPlans as MonthlyActionPlanRow[]) : [];
  const firstPlan = actionPlans[0];
  if (!firstPlan) {
    return null;
  }

  const needsKpiMeta = !normalizeText(firstPlan.kpiKey) || !normalizeText(firstPlan.kpiLabel);
  const needsRule = !normalizeText(firstPlan.evaluationRule);
  if (needsKpiMeta || needsRule) {
    const inferred = inferKpiMeta(firstPlan);
    const nextActionPlans = [...actionPlans];
    nextActionPlans[0] = {
      ...firstPlan,
      kpiKey: inferred.kpiKey,
      kpiLabel: inferred.kpiLabel,
      evaluationRule: "increase_vs_previous_month",
    };
    await docRef.set(
      {
        actionPlans: nextActionPlans,
      },
      { merge: true }
    );
    return nextActionPlans[0];
  }

  return firstPlan;
}

async function fetchMonthlySummary(uid: string, month: string): Promise<MonthlyKpiSummaryRow | null> {
  const snapshot = await adminDb
    .collection(COLLECTIONS.MONTHLY_KPI_SUMMARIES)
    .where("userId", "==", uid)
    .where("snsType", "==", "instagram")
    .where("month", "==", month)
    .limit(1)
    .get();
  if (snapshot.empty) {
    return null;
  }
  return (snapshot.docs[0].data() || null) as MonthlyKpiSummaryRow | null;
}

async function evaluatePreviousAction(uid: string, currentMonth: string): Promise<MonthlyActionEvaluation | null> {
  const targetMonth = toPreviousMonth(currentMonth);
  const baselineMonth = toPreviousMonth(targetMonth);
  const previousAction = await fetchActionPlan(uid, targetMonth);
  if (!previousAction) {
    return null;
  }

  const { kpiKey, kpiLabel } = inferKpiMeta(previousAction);
  const [baselineSummary, targetSummary] = await Promise.all([
    fetchMonthlySummary(uid, baselineMonth),
    fetchMonthlySummary(uid, targetMonth),
  ]);
  const baselineValue = getMetricValue(baselineSummary, kpiKey);
  const targetValue = getMetricValue(targetSummary, kpiKey);

  if (baselineValue === null || targetValue === null || baselineValue <= 0) {
    return {
      status: "no_data",
      kpiKey,
      kpiLabel,
      baselineMonth,
      targetMonth,
      baselineValue,
      targetValue,
      changePercent: null,
      summary: `先月施策Aは判定不可（${kpiLabel}のデータ不足）`,
    };
  }

  const changePercent = ((targetValue - baselineValue) / baselineValue) * 100;
  const achieved = changePercent > 0;
  return {
    status: achieved ? "achieved" : "not_achieved",
    kpiKey,
    kpiLabel,
    baselineMonth,
    targetMonth,
    baselineValue,
    targetValue,
    changePercent,
    summary: achieved
      ? `先月施策Aは達成（${kpiLabel} ${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%）`
      : `先月施策Aは未達（${kpiLabel} ${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%）`,
  };
}

function formatFocusPrompt(params: {
  month: string;
  title: string;
  description: string;
  action: string;
  kpiLabel: string;
  evaluation: MonthlyActionEvaluation | null;
}): string {
  return [
    `今月の注力施策（${params.month} / 次の一手[A]）:`,
    params.title ? `- タイトル: ${params.title}` : "",
    params.description ? `- 目的: ${params.description}` : "",
    params.action ? `- 実行手順: ${params.action}` : "",
    `- 判定対象KPI: ${params.kpiLabel}`,
    params.evaluation ? `- 先月判定: ${params.evaluation.summary}` : "",
    "- 上記施策に沿って提案を優先してください。",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function getMonthlyActionFocus(uid: string): Promise<MonthlyActionFocus | null> {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const previousMonth = toPreviousMonth(currentMonth);

  try {
    const [currentAction, previousAction, evaluation] = await Promise.all([
      fetchActionPlan(uid, currentMonth),
      fetchActionPlan(uid, previousMonth),
      evaluatePreviousAction(uid, currentMonth),
    ]);
    const selectedMonth = currentAction ? currentMonth : previousMonth;
    const selectedAction = currentAction || previousAction;
    if (!selectedAction) {
      return null;
    }

    const title = normalizeText(selectedAction.title);
    const description = normalizeText(selectedAction.description);
    const action = normalizeText(selectedAction.action);
    if (!title && !description && !action) {
      return null;
    }
    const kpiMeta = inferKpiMeta(selectedAction);
    const promptText = formatFocusPrompt({
      month: selectedMonth,
      title,
      description,
      action,
      kpiLabel: kpiMeta.kpiLabel,
      evaluation,
    });
    return {
      month: selectedMonth,
      title,
      description,
      action,
      kpiKey: kpiMeta.kpiKey,
      kpiLabel: kpiMeta.kpiLabel,
      promptText,
      evaluation,
    };
  } catch (error) {
    console.warn("monthly action focus read failed:", error);
    return null;
  }
}

export async function getMonthlyActionFocusPrompt(uid: string): Promise<string> {
  const focus = await getMonthlyActionFocus(uid);
  return focus?.promptText || "";
}
