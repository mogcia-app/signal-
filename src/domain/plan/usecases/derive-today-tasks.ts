export type TodayTaskPriority = "high" | "medium" | "low";

export type TodayTask = {
  id: string;
  type: "story" | "comment" | "feed" | "reel";
  title: string;
  description: string;
  recommendedTime?: string;
  content?: string;
  hashtags?: string[];
  count?: number;
  reason?: string;
  priority: TodayTaskPriority;
};

export function normalizeDayLabel(day: string): string {
  return day.replace(/曜日|曜/g, "").trim();
}

export function dayLabelToIndex(day: string): number {
  const normalized = normalizeDayLabel(day);
  const map: Record<string, number> = {
    日: 0,
    月: 1,
    火: 2,
    水: 3,
    木: 4,
    金: 5,
    土: 6,
  };

  return map[normalized] ?? -1;
}

/**
 * 週間頻度から今日投稿すべきか判定
 */
export function shouldPostToday(frequency: string, dayOfWeek: number): boolean {
  if (!frequency) {
    return false;
  }

  // 週3回の場合: 月、水、金
  if (frequency.includes("3") || frequency === "週3回") {
    return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
  }

  // 週4回の場合: 月、火、木、金
  if (frequency.includes("4") || frequency === "週4回") {
    return dayOfWeek === 1 || dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 5;
  }

  // 週5回の場合: 月〜金
  if (frequency.includes("5") || frequency === "週5回") {
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }

  // 毎日
  if (frequency.includes("毎日") || frequency === "毎日") {
    return true;
  }

  return false;
}

/**
 * AI戦略からストーリーズの内容を抽出
 */
export function extractStoryContentFromStrategy(
  strategy: string,
  _dayName: string
): { title: string; content: string } {
  if (!strategy) {
    return {
      title: "今日のストーリーズ投稿",
      content: "今日の日常をシェアしましょう。",
    };
  }

  const thisWeekMatch = strategy.match(/今週やること[：:]\s*([^\n]+)/);
  if (thisWeekMatch) {
    return {
      title: thisWeekMatch[1].trim(),
      content: thisWeekMatch[1].trim(),
    };
  }

  return {
    title: "今日のストーリーズ投稿",
    content: "今日の日常をシェアしましょう。",
  };
}

/**
 * AI戦略からフィード投稿の内容を抽出
 */
export function extractFeedContentFromStrategy(
  strategy: string,
  _dayName: string
): { title: string; content: string } {
  if (!strategy) {
    return {
      title: "フィード投稿",
      content: "",
    };
  }

  const thisWeekMatch = strategy.match(/今週やること[：:]\s*([^\n]+)/);
  if (thisWeekMatch) {
    return {
      title: thisWeekMatch[1].trim(),
      content: "",
    };
  }

  return {
    title: "フィード投稿",
    content: "",
  };
}

/**
 * 優先度順にソート（high > medium > low）
 */
export function sortTasksByPriority(tasks: TodayTask[]): TodayTask[] {
  const priorityOrder: Record<TodayTaskPriority, number> = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}
