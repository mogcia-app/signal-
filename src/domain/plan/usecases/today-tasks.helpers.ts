import type { PostType, ScheduledPostItem, TodayTask, TodayTaskPriority } from "@/domain/plan/usecases/today-tasks.types";

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

export function shouldPostToday(frequency: string, dayOfWeek: number): boolean {
  if (!frequency) {
    return false;
  }

  if (frequency.includes("3") || frequency === "週3回") {
    return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
  }

  if (frequency.includes("4") || frequency === "週4回") {
    return dayOfWeek === 1 || dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 5;
  }

  if (frequency.includes("5") || frequency === "週5回") {
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }

  if (frequency.includes("毎日") || frequency === "毎日") {
    return true;
  }

  return false;
}

export function extractStoryContentFromStrategy(strategy: string, _dayName: string): { title: string; content: string } {
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

export function extractFeedContentFromStrategy(strategy: string, _dayName: string): { title: string; content: string } {
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

export function sortTasksByPriority(tasks: TodayTask[]): TodayTask[] {
  const priorityOrder: Record<TodayTaskPriority, number> = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

function toDateKeyInTimezone(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function filterTodayScheduledPosts(
  scheduledPosts: ScheduledPostItem[],
  localDate: string,
  timezone: string
): ScheduledPostItem[] {
  return scheduledPosts.filter((post) => toDateKeyInTimezone(post.scheduledTime, timezone) === localDate);
}

function toTaskLabel(postType: PostType): string {
  if (postType === "story") {return "ストーリー";}
  if (postType === "reel") {return "リール";}
  return "フィード";
}

export function createScheduledPostTasks(posts: ScheduledPostItem[]): TodayTask[] {
  return posts.map((post) => {
    const scheduledHour = post.scheduledTime.getHours();
    const scheduledMinute = post.scheduledTime.getMinutes();
    const timeStr = `${scheduledHour.toString().padStart(2, "0")}:${scheduledMinute.toString().padStart(2, "0")}`;
    return {
      id: `scheduled-${post.id}`,
      type: post.type,
      title: `${toTaskLabel(post.type)}を投稿する`,
      description: post.title || post.content.substring(0, 50),
      recommendedTime: `${timeStr}予定`,
      content: post.content,
      priority: "high",
    };
  });
}
