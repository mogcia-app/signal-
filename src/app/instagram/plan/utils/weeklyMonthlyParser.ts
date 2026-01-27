/**
 * AI戦略テキストから週次タスクと月次目標を抽出するユーティリティ
 */

interface WeeklyTask {
  week: number;
  tasks: string[];
}

interface MonthlyGoal {
  month: number;
  goals: Array<{ goal: string; description?: string }>;
}

/**
 * AI戦略テキストからすべての週次タスクを抽出
 */
export function extractAllWeeklyTasks(
  strategyText: string,
  formData: Record<string, unknown>
): WeeklyTask[] {
  const weeklyTasks: WeeklyTask[] = [];

  if (!strategyText) {
    return weeklyTasks;
  }

  // 「今週やること」「第X週」などのパターンを探す
  const weekPatterns = [
    /第(\d+)週[：:]\s*([^\n]+(?:\n[^\n]+)*?)(?=第\d+週|今月|$)/g,
    /今週やること[：:]\s*([^\n]+(?:\n[^\n]+)*?)(?=来週|今月|$)/g,
  ];

  for (const pattern of weekPatterns) {
    let match;
    while ((match = pattern.exec(strategyText)) !== null) {
      const weekNumber = match[1] ? parseInt(match[1], 10) : 1;
      const taskText = match[2] || match[1] || "";

      // タスクをリスト形式で抽出（「-」「・」「*」で始まる行）
      const taskLines = taskText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => {
          return (
            line.startsWith("-") ||
            line.startsWith("・") ||
            line.startsWith("*") ||
            line.match(/^\d+\./)
          );
        })
        .map((line) => line.replace(/^[-・*]\s*/, "").replace(/^\d+\.\s*/, "").trim())
        .filter((line) => line.length > 0);

      if (taskLines.length > 0) {
        weeklyTasks.push({
          week: weekNumber,
          tasks: taskLines,
        });
      }
    }
  }

  // 週次タスクが見つからない場合、デフォルトのタスクを生成
  if (weeklyTasks.length === 0) {
    const periodMonths = (formData.periodMonths as number) || 3;
    const totalWeeks = periodMonths * 4;

    for (let week = 1; week <= totalWeeks; week++) {
      weeklyTasks.push({
        week,
        tasks: [
          `第${week}週: フィード投稿${formData.weeklyFeedPosts || 3}回`,
          `第${week}週: リール投稿${formData.weeklyReelPosts || 1}回`,
          `第${week}週: ストーリーズ投稿${formData.weeklyStoryPosts || 7}回`,
        ],
      });
    }
  }

  return weeklyTasks;
}

/**
 * AI戦略テキストからすべての月次目標を抽出
 */
export function extractAllMonthlyGoals(
  strategyText: string,
  formData: Record<string, unknown>
): MonthlyGoal[] {
  const monthlyGoals: MonthlyGoal[] = [];

  if (!strategyText) {
    return monthlyGoals;
  }

  // 「今月の目標」「1ヶ月目」などのパターンを探す
  const monthPatterns = [
    /(\d+)ヶ月目[：:]\s*([^\n]+(?:\n[^\n]+)*?)(?=\d+ヶ月目|今週|$)/g,
    /今月の目標[：:]\s*([^\n]+(?:\n[^\n]+)*?)(?=来月|今週|$)/g,
  ];

  for (const pattern of monthPatterns) {
    let match;
    while ((match = pattern.exec(strategyText)) !== null) {
      const monthNumber = match[1] ? parseInt(match[1], 10) : 1;
      const goalText = match[2] || match[1] || "";

      // 目標をリスト形式で抽出
      const goalLines = goalText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => {
          return (
            line.startsWith("-") ||
            line.startsWith("・") ||
            line.startsWith("*") ||
            line.match(/^\d+\./)
          );
        })
        .map((line) => line.replace(/^[-・*]\s*/, "").replace(/^\d+\.\s*/, "").trim())
        .filter((line) => line.length > 0);

      if (goalLines.length > 0) {
        monthlyGoals.push({
          month: monthNumber,
          goals: goalLines.map((goal) => {
            // 「:」で区切って目標と説明を分離
            const parts = goal.split(":");
            return {
              goal: parts[0]?.trim() || goal,
              description: parts[1]?.trim(),
            };
          }),
        });
      }
    }
  }

  // 月次目標が見つからない場合、デフォルトの目標を生成
  if (monthlyGoals.length === 0) {
    const periodMonths = (formData.periodMonths as number) || 3;

    for (let month = 1; month <= periodMonths; month++) {
      monthlyGoals.push({
        month,
        goals: [
          {
            goal: `第${month}ヶ月: フォロワー数を増やす`,
            description: `計画に基づいた投稿を継続して、フォロワー数を着実に増やしていきます。`,
          },
        ],
      });
    }
  }

  return monthlyGoals;
}


