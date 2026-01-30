/**
 * Domain層: アクションプラン生成（AIなし）
 * フォールバック用のアクションプラン生成
 */

import type {
  AnalysisAlert,
  PostTypeHighlight,
  ActionPlanPriority,
} from "../../types";

export interface ActionPlan {
  id: string;
  title: string;
  description: string;
  focusArea: string;
  priority: ActionPlanPriority;
  recommendedActions: string[];
  expectedImpact: string;
}

/**
 * フォールバックアクションプランを生成（AIなし）
 */
export function generateFallbackActionPlans(
  alerts: AnalysisAlert[],
  postTypeHighlights: PostTypeHighlight[]
): ActionPlan[] {
  const plans: ActionPlan[] = [];

  const criticalOrWarningAlerts = alerts.filter(
    (alert) => alert.severity === "critical" || alert.severity === "warning"
  );

  criticalOrWarningAlerts.slice(0, 2).forEach((alert, index) => {
    plans.push({
      id: `alert-plan-${alert.id}-${index}`,
      title:
        alert.severity === "critical"
          ? `${alert.metric}の緊急改善`
          : `${alert.metric}の優先改善`,
      description: alert.message,
      priority: alert.severity === "critical" ? "high" : "medium",
      focusArea: alert.metric,
      expectedImpact:
        alert.severity === "critical"
          ? "直ちに改善しないと成長が鈍化する可能性があります。"
          : "早期に対処することで指標の落ち込みを食い止められます。",
      recommendedActions: [
        alert.metric.includes("投稿")
          ? "投稿頻度とコンテンツテーマを見直す"
          : "直近の投稿を振り返り、トーンやクリエイティブを調整する",
        "効果が高かった投稿のパターンを再利用する",
      ],
    });
  });

  const weakHighlights = postTypeHighlights.filter((highlight) => highlight.status === "weak");
  const strongHighlights = postTypeHighlights.filter((highlight) => highlight.status === "strong");

  if (weakHighlights.length > 0) {
    const weak = weakHighlights[0];
    plans.push({
      id: `highlight-plan-${weak.id}`,
      title: `${weak.label}の改善施策`,
      description: weak.message,
      priority: "medium",
      focusArea: weak.label,
      expectedImpact: "投稿タイプのバランスを整え、エンゲージメント低下を抑えられます。",
      recommendedActions: [
        `${weak.label}の投稿内容やフォーマットを見直す`,
        "好調な投稿タイプの要素を取り入れてABテストする",
      ],
    });
  }

  if (strongHighlights.length > 0) {
    const strong = strongHighlights[0];
    plans.push({
      id: `double-down-${strong.id}`,
      title: `${strong.label}を強化する`,
      description: strong.message,
      priority: "medium",
      focusArea: strong.label,
      expectedImpact: "成果が出ている投稿タイプを伸ばし、フォロワー増加につなげます。",
      recommendedActions: [
        `${strong.label}の投稿頻度を増やし、成功パターンを再利用する`,
        "広告やキャンペーンと連動させてリーチを拡大する",
      ],
    });
  }

  if (plans.length === 0) {
    plans.push({
      id: "baseline-plan",
      title: "次の打ち手を検討しましょう",
      description:
        "顕著なリスクは見つかりませんでした。投稿計画とコンテンツの質を維持しながら、小さな改善を継続してください。",
      priority: "low",
      focusArea: "全体運用",
      expectedImpact: "運用の安定性を保ちながら、成長の基盤を築きます。",
      recommendedActions: [
        "これまでの成功投稿を振り返り、学びを整理する",
        "投稿カレンダーを定期的に見直して改善点を洗い出す",
      ],
    });
  }

  return plans;
}

export type { AnalysisAlert, PostTypeHighlight, ActionPlanPriority };

