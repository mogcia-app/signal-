import type { EditableTimelineItem } from "../types";

export interface TimelineRowViewModel {
  dateIso: string;
  dateLabel: string;
  dayLabel: string;
  isToday: boolean;
  items: EditableTimelineItem[];
}

export const getTimelineTypeLabel = (type?: string): string => {
  if (type === "reel") {return "リール";}
  if (type === "story") {return "ストーリー";}
  return "フィード";
};

export const getDirectionLabel = (value?: string): string =>
  String(value || "").trim().replace(/系$/, "") || "商品紹介";

export const getDirectionGuideSteps = (
  directionRaw: string,
  type: "feed" | "reel" | "story"
): string[] => {
  const direction = getDirectionLabel(directionRaw);
  if (direction.includes("比較")) {
    return [
      "1枚目: 比較軸を明記（例: 価格/使いやすさ/効果）",
      "2-3枚目: 2つの違いを図で見せる",
      "最後: どんな人に向くかを1文で結論",
    ];
  }
  if (direction.includes("商品紹介")) {
    return [
      "1枚目: 商品名+ベネフィットを大きく表示",
      "2枚目: 特徴を3つだけ箇条書き",
      "最後: 保存/プロフィール誘導を入れる",
    ];
  }
  if (direction.includes("活用シーン")) {
    return [
      "1枚目: 使う場面を具体的に提示",
      "2枚目: 使い方手順を短く見せる",
      "最後: 真似しやすい一言CTAを入れる",
    ];
  }
  if (direction.includes("Q&A")) {
    return [
      "1つ目: よくある質問をそのまま載せる",
      "2つ目: 回答を結論→理由の順で書く",
      "最後: 次に聞きたい質問を募集する",
    ];
  }
  if (direction.includes("質問募集")) {
    return [
      "質問は2択か3択で答えやすくする",
      "回答期限を当日中に設定する",
      "回答後のフォロー投稿を予告する",
    ];
  }
  if (direction.includes("ブランド")) {
    return [
      "1枚目: ブランドの価値観を一文で表示",
      "2枚目: 価値観が伝わる具体エピソード",
      "最後: 共感コメントを促す質問を置く",
    ];
  }
  if (direction.includes("レビュー")) {
    return [
      "冒頭: 使用前の悩みを先に提示",
      "中盤: 使用後の変化を具体的に示す",
      "最後: 同じ悩みの人向けにCTAを入れる",
    ];
  }
  if (direction.includes("導入事例")) {
    return [
      "事例の前提条件を最初に明記",
      "導入後の変化を数字で1つ示す",
      "再現ポイントを3つに絞って載せる",
    ];
  }
  if (direction.includes("社員") || direction.includes("社風") || direction.includes("働")) {
    return [
      "1枚目: 仕事内容を一言で示す",
      "2枚目: チームの雰囲気が伝わる写真/動画",
      "最後: 応募前に聞きたいことを促す",
    ];
  }
  if (type === "reel") {
    return [
      "冒頭3秒でテーマを明言する",
      "1カット1メッセージでテンポを保つ",
      "最後に保存/フォローCTAを入れる",
    ];
  }
  if (type === "story") {
    return [
      "1枚目で問いかけを置く",
      "2枚目で回答しやすい選択肢を出す",
      "3枚目で次アクションを案内する",
    ];
  }
  return [
    "1枚目で結論を先に見せる",
    "2枚目で理由を3点に絞る",
    "最後に保存したくなる一言を入れる",
  ];
};

export const getShortGuideText = (
  directionRaw: string,
  type: "feed" | "reel" | "story"
): string => {
  const firstStep = getDirectionGuideSteps(directionRaw, type)[0] || "";
  return firstStep.replace(/^(?:\d+枚目|\d+つ目|冒頭|中盤|最後)\s*:\s*/, "");
};

export const getTimelineTypeBadgeClass = (type?: string): string => {
  if (type === "reel") {return "border-transparent bg-gradient-to-r from-[#4486ff] to-[#70c8ff] text-white font-bold";}
  if (type === "story") {return "border-transparent bg-gradient-to-r from-[#f4b400] to-[#ffcc33] text-white font-bold";}
  return "border-transparent bg-gradient-to-r from-[#ea6868] to-[#dc3131] text-white font-bold";
};

export const buildTomorrowPreparationsFromTimeline = (items: EditableTimelineItem[]) =>
  items.map((item) => ({
    type: item.type,
    description: item.label,
    preparation: `${normalizeTimeToHHmm(item.time) !== "--:--" ? normalizeTimeToHHmm(item.time) : "時間未設定"}に向けて投稿準備`,
  }));

export const normalizeTimeToHHmm = (value?: string): string => {
  const raw = String(value || "").trim();
  if (!raw || raw === "--:--") {return "--:--";}

  const hhmm = raw.match(/(\d{1,2}):(\d{2})/);
  if (hhmm) {
    return `${hhmm[1].padStart(2, "0")}:${hhmm[2]}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return raw;
};

export const getTimeSortValue = (time: string): number => {
  const normalized = normalizeTimeToHHmm(time);
  if (normalized === "--:--") {return Number.MAX_SAFE_INTEGER;}
  const [hourStr, minuteStr] = normalized.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {return Number.MAX_SAFE_INTEGER;}
  return hour * 60 + minute;
};

export const buildRollingTimelineRows = (params: {
  today: Date;
  items: EditableTimelineItem[];
  toLocalISODate: (date: Date) => string;
  weekDays: readonly string[];
  days?: number;
}): TimelineRowViewModel[] => {
  const totalDays = params.days ?? 5;
  const todayDateOnly = new Date(params.today.getFullYear(), params.today.getMonth(), params.today.getDate());
  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(
      todayDateOnly.getFullYear(),
      todayDateOnly.getMonth(),
      todayDateOnly.getDate() + index
    );
    const dateIso = params.toLocalISODate(date);
    return {
      dateIso,
      dayLabel: params.weekDays[date.getDay()] || "",
      dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
      isToday: index === 0,
      items: params.items
        .filter((item) => item.dateIso === dateIso)
        .sort((a, b) => getTimeSortValue(a.time) - getTimeSortValue(b.time)),
    };
  });
};
