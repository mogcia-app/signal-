import { PlanFormData, SimulationResult } from "../types/plan";

export interface DynamicAdvice {
  id: string;
  title: string;
  content: string;
  priority: "high" | "medium" | "low";
  category: "strategy" | "timing" | "content" | "engagement" | "growth";
}

// 計画内容に基づいて動的アドバイスを生成
export function generateDynamicAdvice(
  formData: PlanFormData,
  simulationResult: SimulationResult | null
): DynamicAdvice[] {
  const advice: DynamicAdvice[] = [];

  if (!formData) {return advice;}

  const currentFollowers = parseInt(formData.currentFollowers || "0", 10) || 0;
  const targetFollowers = formData.targetFollowers 
    ? parseInt(formData.targetFollowers, 10)
    : formData.followerGain
    ? currentFollowers + parseInt(formData.followerGain, 10)
    : currentFollowers;
  const followerGain = targetFollowers - currentFollowers;
  const planPeriod = formData.planPeriod;
  const monthlyGrowth =
    followerGain / (planPeriod === "1ヶ月" ? 1 : planPeriod === "3ヶ月" ? 3 : 6);

  // フォロワー数に基づく戦略アドバイス
  if (currentFollowers < 100) {
    advice.push({
      id: "small-audience-strategy",
      title: "小規模フォロワー基盤の構築",
      content:
        "フォロワー数100人未満の段階では、一貫した投稿頻度とエンゲージメント向上に集中しましょう。質の高いコンテンツを継続的に投稿し、既存フォロワーとの関係を深めることが重要です。",
      priority: "high",
      category: "strategy",
    });
  } else if (currentFollowers < 1000) {
    advice.push({
      id: "growth-phase-strategy",
      title: "成長期の戦略的アプローチ",
      content:
        "100-1000人のフォロワー層では、リールコンテンツの活用とハッシュタグ戦略の最適化が効果的です。トレンドに敏感に反応し、エンゲージメント率の向上を目指しましょう。",
      priority: "high",
      category: "growth",
    });
  } else if (currentFollowers < 10000) {
    advice.push({
      id: "expansion-strategy",
      title: "拡大期のブランド構築",
      content:
        "1000人以上のフォロワー層では、ブランドアイデンティティの確立とストーリーテリングが重要です。一貫したビジュアルスタイルと独自の価値提供を心がけましょう。",
      priority: "medium",
      category: "strategy",
    });
  }

  // 目標達成期間に基づくアドバイス
  if (planPeriod === "1ヶ月") {
    advice.push({
      id: "short-term-strategy",
      title: "短期間での目標達成戦略",
      content:
        "1ヶ月での大幅な成長は困難です。現実的な目標設定（月10-20%の成長）と、高エンゲージメントコンテンツの集中投稿を推奨します。リール投稿を週3-4回に増やすことを検討してください。",
      priority: "high",
      category: "timing",
    });
  } else if (planPeriod === "3ヶ月") {
    advice.push({
      id: "medium-term-strategy",
      title: "中期戦略での着実な成長",
      content:
        "3ヶ月期間では、バランスの取れた投稿戦略が効果的です。リール・フィード・ストーリーを組み合わせ、段階的なフォロワー獲得を目指しましょう。月間15-25%の成長が現実的です。",
      priority: "medium",
      category: "timing",
    });
  } else if (planPeriod === "6ヶ月") {
    advice.push({
      id: "long-term-strategy",
      title: "長期戦略での持続的成長",
      content:
        "6ヶ月期間では、持続可能な投稿ペースとコミュニティ構築に重点を置きましょう。月間10-15%の着実な成長を目指し、フォロワーとの長期的な関係構築を重視してください。",
      priority: "low",
      category: "timing",
    });
  }

  // シミュレーション結果に基づくアドバイス
  if (simulationResult) {
    const feasibilityLevel = simulationResult.feasibilityLevel;

    if (feasibilityLevel === "very_challenging" || feasibilityLevel === "challenging") {
      advice.push({
        id: "goal-adjustment",
        title: "目標の現実的な調整",
        content:
          "現在の目標は非常に挑戦的です。期間の延長または目標値の段階的調整を検討することをお勧めします。まずは月間10-15%の成長を目指し、基盤を固めてから次のステップに進みましょう。",
        priority: "high",
        category: "strategy",
      });
    }

    if (feasibilityLevel === "very_realistic" || feasibilityLevel === "realistic") {
      advice.push({
        id: "optimization-opportunity",
        title: "さらなる最適化の機会",
        content:
          "現在の目標は現実的です。この機会に投稿品質の向上やエンゲージメント戦略の強化に取り組み、目標を上回る成果を目指しましょう。",
        priority: "medium",
        category: "strategy",
      });
    }

    // 投稿負荷に基づくアドバイス
    const monthlyPosts = simulationResult.monthlyPostCount;
    if (monthlyPosts > 30) {
      advice.push({
        id: "high-workload-warning",
        title: "高負荷投稿スケジュールの注意",
        content:
          "月30回以上の投稿は高負荷です。コンテンツの質を保つため、事前準備とスケジュール管理を徹底しましょう。バッチ作業で効率化を図ることをお勧めします。",
        priority: "high",
        category: "timing",
      });
    }
  }

  // 成長率に基づくアドバイス
  if (monthlyGrowth > 0.3) {
    // 30%以上の成長率
    advice.push({
      id: "aggressive-growth",
      title: "積極的成長戦略の注意点",
      content:
        "月間30%以上の成長は非常に積極的です。一時的な成長よりも持続可能な成長を重視し、フォロワーの質を維持することに注意してください。",
      priority: "high",
      category: "growth",
    });
  } else if (monthlyGrowth < 0.05) {
    // 5%未満の成長率
    advice.push({
      id: "conservative-growth",
      title: "保守的成長戦略の最適化",
      content:
        "月間5%未満の成長は保守的です。より積極的なコンテンツ戦略やエンゲージメント向上施策を検討し、成長ペースを上げることをお勧めします。",
      priority: "medium",
      category: "growth",
    });
  }

  // コンテンツ戦略のアドバイス
  if (targetFollowers > currentFollowers * 2) {
    // 2倍以上の成長目標
    advice.push({
      id: "content-diversification",
      title: "コンテンツ多様化の必要性",
      content:
        "大幅な成長目標には多様なコンテンツ戦略が必要です。リール、フィード、ストーリーを効果的に組み合わせ、各フォーマットの特性を活かした投稿を心がけましょう。",
      priority: "medium",
      category: "content",
    });
  }

  // エンゲージメント戦略のアドバイス
  advice.push({
    id: "engagement-strategy",
    title: "エンゲージメント向上の基本戦略",
    content:
      "フォロワーとの積極的な交流を心がけましょう。コメントへの返信、ストーリーでの質問、フォロワーの投稿へのリアクションなど、双方向のコミュニケーションが成長の鍵となります。",
    priority: "medium",
    category: "engagement",
  });

  // 優先度順にソート
  return advice.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// アドバイスのカテゴリ別フィルタリング
export function filterAdviceByCategory(
  advice: DynamicAdvice[],
  category: DynamicAdvice["category"]
): DynamicAdvice[] {
  return advice.filter((item) => item.category === category);
}

// 優先度別フィルタリング
export function filterAdviceByPriority(
  advice: DynamicAdvice[],
  priority: DynamicAdvice["priority"]
): DynamicAdvice[] {
  return advice.filter((item) => item.priority === priority);
}

// アドバイスの要約生成
export function generateAdviceSummary(advice: DynamicAdvice[]): string {
  if (advice.length === 0) {return "現在、特定のアドバイスはありません。";}

  const highPriorityCount = advice.filter((a) => a.priority === "high").length;
  const categories = [...new Set(advice.map((a) => a.category))];

  let summary = `${advice.length}件のアドバイスを生成しました。`;

  if (highPriorityCount > 0) {
    summary += ` 特に重要な項目が${highPriorityCount}件あります。`;
  }

  summary += ` 戦略、タイミング、コンテンツ、エンゲージメント、成長の${categories.length}つのカテゴリに分類されています。`;

  return summary;
}
