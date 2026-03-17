"use client";

import { WEEK_DAYS, type MonthlyCalendarPlanItem, type PurposeKey, type WeekDay } from "../types";

const toLocalISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizePurposeKey = (value: string): PurposeKey => {
  const normalized = String(value || "").trim();
  if (normalized === "求人・リクルート強化" || normalized === "採用・リクルーティング強化") {return "recruit";}
  if (normalized === "商品・サービスの販売促進") {return "sales";}
  if (normalized === "ファンを作りたい") {return "fan";}
  if (normalized === "来店・問い合わせを増やしたい") {return "inquiry";}
  if (normalized === "企業イメージ・ブランディング") {return "branding";}
  return "awareness";
};

const DIRECTION_LIBRARY: Record<PurposeKey, Record<"feed" | "reel" | "story", string[]>> = {
  awareness: {
    feed: ["商品紹介系", "活用シーン系", "比較・選び方系", "ブランド認知系"],
    reel: ["商品紹介系", "使い方デモ系", "現場の様子", "体験レビュー系"],
    story: ["Q&A系", "商品紹介系", "お知らせ系", "質問募集系"],
  },
  recruit: {
    feed: ["働き方紹介系", "社員インタビュー系", "募集職種紹介系", "社風紹介系"],
    reel: ["職場の雰囲気系", "1日の流れ系", "仕事のリアル系", "先輩の声系"],
    story: ["応募前Q&A系", "社風アンケート系", "募集情報系", "質問募集系"],
  },
  sales: {
    feed: ["商品紹介系", "比較・選び方系", "活用シーン系", "導入事例系"],
    reel: ["使い方デモ系", "ビフォーアフター系", "購入前チェック系", "体験レビュー系"],
    story: ["購入前Q&A系", "おすすめ案内系", "期間限定案内系", "投票系"],
  },
  fan: {
    feed: ["ブランドストーリー系", "お客様の声系", "活用シーン系", "コミュニティ系"],
    reel: ["現場の様子", "スタッフストーリー系", "共感テーマ系", "制作裏側系"],
    story: ["ファン投票系", "質問募集系", "現場の様子", "次回テーマ募集系"],
  },
  inquiry: {
    feed: ["よくある質問系", "導入事例系", "比較・選び方系", "相談の流れ系"],
    reel: ["相談前チェック系", "問い合わせ導線系", "導入事例系", "失敗回避系"],
    story: ["相談受付案内系", "疑問募集系", "Q&A系", "お問い合わせ導線系"],
  },
  branding: {
    feed: ["ブランドストーリー系", "ブランド背景系", "品質こだわり系", "価値観紹介系"],
    reel: ["世界観ムービー系", "制作裏側系", "こだわり紹介系", "ブランド背景系"],
    story: ["価値観アンケート系", "ブランドQ&A系", "現場の様子", "次回予告系"],
  },
};

const getPostTypesForCalendarDay = (
  dayLabel: WeekDay,
  params: {
    quickPlanFeedDays: WeekDay[];
    quickPlanReelDays: WeekDay[];
    quickPlanStoryDays: WeekDay[];
  }
): Array<"feed" | "reel" | "story"> => {
  const types: Array<"feed" | "reel" | "story"> = [];
  if (params.quickPlanFeedDays.includes(dayLabel)) {types.push("feed");}
  if (params.quickPlanReelDays.includes(dayLabel)) {types.push("reel");}
  if (params.quickPlanStoryDays.includes(dayLabel)) {types.push("story");}
  return types;
};

const getDefaultTimeByType = (postType: "feed" | "reel" | "story"): string => {
  if (postType === "reel") {return "20:00";}
  if (postType === "story") {return "12:00";}
  return "19:00";
};

const pickDirection = (params: {
  purpose: string;
  postType: "feed" | "reel" | "story";
  dateIso: string;
  usedInDay: Set<string>;
}): string => {
  const purposeKey = normalizePurposeKey(params.purpose);
  const candidates = DIRECTION_LIBRARY[purposeKey][params.postType];
  if (!candidates || candidates.length === 0) {return "投稿方針";}

  const date = new Date(params.dateIso);
  const daySeed = Number.isNaN(date.getTime()) ? 0 : date.getDate();
  const startIndex = daySeed % candidates.length;

  for (let i = 0; i < candidates.length; i += 1) {
    const next = candidates[(startIndex + i) % candidates.length];
    if (!params.usedInDay.has(next)) {return next;}
  }
  return candidates[startIndex] || candidates[0] || "投稿方針";
};

export function buildMonthlyCalendarPlan(params: {
  startDate: string;
  purpose: string;
  quickPlanFeedDays: WeekDay[];
  quickPlanReelDays: WeekDay[];
  quickPlanStoryDays: WeekDay[];
}): {
  items: MonthlyCalendarPlanItem[];
  endDate: string;
} {
  const parsedStartDate = new Date(params.startDate);
  if (Number.isNaN(parsedStartDate.getTime())) {
    return { items: [], endDate: "" };
  }

  const startDateOnly = new Date(
    parsedStartDate.getFullYear(),
    parsedStartDate.getMonth(),
    parsedStartDate.getDate()
  );
  const endDateOnly = new Date(
    startDateOnly.getFullYear(),
    startDateOnly.getMonth() + 1,
    startDateOnly.getDate() - 1
  );

  const candidates: Array<{
    dateIso: string;
    dayLabel: WeekDay;
    postType: "feed" | "reel" | "story";
  }> = [];

  for (
    let cursor = new Date(startDateOnly);
    cursor <= endDateOnly;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
  ) {
    const dayLabel = WEEK_DAYS[cursor.getDay()];
    const postTypes = getPostTypesForCalendarDay(dayLabel, {
      quickPlanFeedDays: params.quickPlanFeedDays,
      quickPlanReelDays: params.quickPlanReelDays,
      quickPlanStoryDays: params.quickPlanStoryDays,
    });
    if (postTypes.length === 0) {continue;}
    postTypes.forEach((postType) => {
      candidates.push({
        dateIso: toLocalISODate(cursor),
        dayLabel,
        postType,
      });
    });
  }

  const usedDirectionsByDate = new Map<string, Set<string>>();
  const items: MonthlyCalendarPlanItem[] = candidates.map((candidate) => {
    const usedInDay = usedDirectionsByDate.get(candidate.dateIso) || new Set<string>();
    const direction = pickDirection({
      purpose: params.purpose,
      postType: candidate.postType,
      dateIso: candidate.dateIso,
      usedInDay,
    });
    usedInDay.add(direction);
    usedDirectionsByDate.set(candidate.dateIso, usedInDay);

    return {
      ...candidate,
      suggestedTime: getDefaultTimeByType(candidate.postType),
      title: direction,
      direction,
    };
  });

  return {
    items,
    endDate: toLocalISODate(endDateOnly),
  };
}
