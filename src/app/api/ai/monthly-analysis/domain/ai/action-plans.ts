/**
 * Domain層: AI アクションプラン生成
 * AI依存のアクションプラン生成ロジック
 */

import { callOpenAI } from "./client";
import type {
  ActionPlan,
  ActionPlanPriority,
  AnalysisAlert,
  PostTypeHighlight,
  ReportSummary,
  MasterContext,
} from "../../types";

// 型定義はtypes.tsからインポート済み

function sanitizeActionPlanPriority(priority: string | undefined): ActionPlanPriority {
  if (priority === "high" || priority === "medium" || priority === "low") {
    return priority;
  }
  return "medium";
}

/**
 * AI アクションプランを生成
 */
export async function generateAIActionPlans(
  context: {
    period: "weekly" | "monthly";
    date: string;
    totals: ReportSummary["totals"];
    changes: ReportSummary["changes"];
    alerts: AnalysisAlert[];
    postTypeHighlights: PostTypeHighlight[];
    confidence: {
      score: number;
      dataPointCount: number;
      historicalHitRate: number;
    };
    masterContext: MasterContext | null;
    userProfile: Record<string, unknown> | null;
  }
): Promise<ActionPlan[]> {
  try {
    const payload = JSON.stringify(context, null, 2);
    const prompt = `以下はInstagram運用の総合分析データです。優先度の高いアクションプランを最大3件生成し、必ず次のJSON形式のみで回答してください。\n\n分析データ:\n${payload}\n\n出力形式:\n{\n  "actionPlans": [\n    {\n      "id": "string（ユニーク）",\n      "title": "string",\n      "description": "string",\n      "priority": "high" | "medium" | "low",\n      "focusArea": "string",\n      "expectedImpact": "string",\n      "recommendedActions": ["string", ...]\n    }\n  ]\n}\n\n制約:\n- JSON以外の文字列や説明は一切出力しない\n- recommendedActionsは日本語の具体的な提案を少なくとも2つ含める\n- priorityはhigh/medium/lowのいずれか\n- idは重複しないようにする`;

    const response = await callOpenAI(prompt);
    const parsed = JSON.parse(response);
    const plansSource = Array.isArray(parsed?.actionPlans)
      ? parsed.actionPlans
      : Array.isArray(parsed)
        ? parsed
        : [];

    const typedPlanSource = plansSource as Array<Record<string, unknown>>;

    const plans: ActionPlan[] = typedPlanSource
      .map((plan, index): ActionPlan | null => {
        if (!plan || typeof plan !== "object") {
          return null;
        }

        const recommendedActions = Array.isArray(plan.recommendedActions)
          ? (plan.recommendedActions as unknown[]).filter(
              (action): action is string => typeof action === "string" && action.trim().length > 0
            )
          : [];

        if (!plan.title || recommendedActions.length === 0) {
          return null;
        }

        return {
          id:
            typeof plan.id === "string" && plan.id.trim().length > 0
              ? plan.id
              : `ai-plan-${index}`,
          title: String(plan.title),
          description: typeof plan.description === "string" ? plan.description : "",
          priority: sanitizeActionPlanPriority(
            typeof plan.priority === "string" ? plan.priority : undefined
          ),
          focusArea: typeof plan.focusArea === "string" ? plan.focusArea : "全体",
          expectedImpact:
            typeof plan.expectedImpact === "string"
              ? plan.expectedImpact
              : "改善インパクトの詳細は未設定です。",
          recommendedActions,
        };
      })
      .filter((plan): plan is ActionPlan => Boolean(plan));

    return plans;
  } catch (error) {
    console.error("AIアクションプラン生成エラー:", error);
    return [];
  }
}

