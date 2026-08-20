/**
 * Instagram分析データのパースユーティリティ
 */

export function parseInstagramNumber(value: string | null | undefined): number | null {
  const raw = String(value || "")
    .replace(/[０-９＋－]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[−ー]/g, "-")
    .replace(/,/g, "")
    .trim();
  const match = raw.match(/([+-]?\d+(?:\.\d+)?)\s*([万億kKＫ]?)/);
  if (!match) {
    return null;
  }

  const base = Number(match[1]);
  if (!Number.isFinite(base)) {
    return null;
  }
  const unit = match[2];
  if (unit === "億") {
    return Math.round(base * 100000000);
  }
  if (unit === "万") {
    return Math.round(base * 10000);
  }
  if (unit === "k" || unit === "K" || unit === "Ｋ") {
    return Math.round(base * 1000);
  }
  return Math.round(base);
}

export function parseInstagramPercent(value: string | null | undefined): number | null {
  const raw = String(value || "")
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/,/g, "")
    .trim();
  const match = raw.match(/(\d+(?:\.\d+)?)\s*%?/);
  if (!match) {
    return null;
  }
  const percent = Number(match[1]);
  return Number.isFinite(percent) ? percent : null;
}

function readNumberForLabel(line: string, nextLine: string | null, labels: string[]): number | null {
  const matchedLabel = labels.find((label) => line.includes(label));
  if (!matchedLabel) {
    return null;
  }
  const inlineValue = line
    .replace(matchedLabel, "")
    .replace(/[：:]/g, " ")
    .trim();
  return parseInstagramNumber(inlineValue) ?? parseInstagramNumber(nextLine);
}

interface ParsedInstagramBaseData {
  hasData: boolean;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  reposts: number | null;
  followerIncrease: number | null;
  profileVisits: number | null;
  externalLinkTaps: number | null;
  profileFollows: number | null;
}

export interface ParsedInstagramReelData extends ParsedInstagramBaseData {
  reelReachFollowerPercent: number | null;
  reelReachedAccounts: number | null;
  reelInteractionCount: number | null;
  reelInteractionFollowerPercent: number | null;
  reelReachSourceProfile: number | null;
  reelReachSourceReel: number | null;
  reelReachSourceExplore: number | null;
  reelReachSourceSearch: number | null;
  reelReachSourceOther: number | null;
}

export interface ParsedInstagramFeedData extends ParsedInstagramBaseData {
  reachFollowerPercent: number | null;
  interactionCount: number | null;
  interactionFollowerPercent: number | null;
  reachedAccounts: number | null;
  reachSourceFeed: number | null;
  reachSourceProfile: number | null;
  reachSourceExplore: number | null;
  reachSourceSearch: number | null;
  reachSourceOther: number | null;
}

function parseCommonPostMetrics(params: {
  result: ParsedInstagramBaseData;
  line: string;
  nextLine: string | null;
  prevLine: string | null;
}) {
  const { result, line, nextLine, prevLine } = params;

  const likes = readNumberForLabel(line, nextLine, ["いいね数", "いいね", "「いいね！」"]);
  if (likes !== null) {
    result.likes = likes;
    result.hasData = true;
  }

  const comments = !prevLine?.includes("インタラクション")
    ? readNumberForLabel(line, nextLine, ["コメント数", "コメント"])
    : null;
  if (comments !== null) {
    result.comments = comments;
    result.hasData = true;
  }

  const saves = readNumberForLabel(line, nextLine, ["保存数", "保存済み", "保存"]);
  if (saves !== null) {
    result.saves = saves;
    result.hasData = true;
  }

  const shares = readNumberForLabel(line, nextLine, ["シェア数", "シェア", "送信数", "送信"]);
  if (shares !== null) {
    result.shares = shares;
    result.hasData = true;
  }

  const reposts = readNumberForLabel(line, nextLine, ["リポスト数", "リポスト", "再投稿数", "再投稿"]);
  if (reposts !== null) {
    result.reposts = reposts;
    result.hasData = true;
  }

  const profileVisits = readNumberForLabel(line, nextLine, [
    "プロフィールへのアクセス",
    "プロフィールアクセス",
    "プロフィールのアクセス",
    "プロフィールへのアクセス数",
  ]);
  if (profileVisits !== null) {
    result.profileVisits = profileVisits;
    result.hasData = true;
  }

  const externalLinkTaps = readNumberForLabel(line, nextLine, [
    "外部リンクのタップ数",
    "外部リンクタップ",
    "リンクのタップ数",
    "リンククリック",
  ]);
  if (externalLinkTaps !== null) {
    result.externalLinkTaps = externalLinkTaps;
    result.hasData = true;
  }

  const follows = readNumberForLabel(line, nextLine, [
    "フォロワー増加数",
    "フォロワー増加",
    "フォロー数",
    "フォロー",
  ]);
  if (follows !== null) {
    result.profileFollows = follows;
    result.followerIncrease = follows;
    result.hasData = true;
  }
}

export const parseInstagramFeedData = (text: string): ParsedInstagramFeedData => {
  const result: ParsedInstagramFeedData = {
    hasData: false,
    reach: null,
    reachFollowerPercent: null,
    interactionCount: null,
    interactionFollowerPercent: null,
    likes: null,
    comments: null,
    saves: null,
    shares: null,
    reposts: null,
    followerIncrease: null,
    reachedAccounts: null,
    profileVisits: null,
    externalLinkTaps: null,
    reachSourceFeed: null,
    reachSourceProfile: null,
    reachSourceExplore: null,
    reachSourceSearch: null,
    reachSourceOther: null,
    profileFollows: null,
  };

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i < lines.length - 1 ? lines[i + 1] : null;
    const prevLine = i > 0 ? lines[i - 1] : null;

    const reach = line.includes("リーチしたアカウント")
      ? null
      : readNumberForLabel(line, nextLine, ["ビュー", "閲覧数", "リーチ"]);
    if (reach !== null) {
      result.reach = reach;
      result.hasData = true;
    }

    if (
      line === "フォロワー以外" &&
      nextLine &&
      prevLine &&
      (prevLine === "ビュー" || prevLine.includes("閲覧数") || prevLine.includes("リーチ"))
    ) {
      const percent = parseInstagramPercent(nextLine);
      if (percent !== null) {
        result.reachFollowerPercent = percent;
        result.hasData = true;
      }
    }

    const feedSource = readNumberForLabel(line, nextLine, ["ホーム", "フィード"]);
    if (feedSource !== null) {
      result.reachSourceFeed = feedSource;
      result.hasData = true;
    }

    if (
      line.includes("プロフィール") &&
      !line.includes("プロフィールへの") &&
      prevLine !== "プロフィールのアクティビティ" &&
      !prevLine?.includes("プロフィールへの")
    ) {
      const value = readNumberForLabel(line, nextLine, ["プロフィール"]);
      if (value !== null) {
        result.reachSourceProfile = value;
        result.hasData = true;
      }
    }

    const explore = readNumberForLabel(line, nextLine, ["発見", "発見タブ"]);
    if (explore !== null) {
      result.reachSourceExplore = explore;
      result.hasData = true;
    }

    const search = readNumberForLabel(line, nextLine, ["検索"]);
    if (search !== null) {
      result.reachSourceSearch = search;
      result.hasData = true;
    }

    if (line.includes("その他") && !prevLine?.includes("フォロワー")) {
      const value = readNumberForLabel(line, nextLine, ["その他"]);
      if (value !== null) {
        result.reachSourceOther = value;
        result.hasData = true;
      }
    }

    const reachedAccounts = readNumberForLabel(line, nextLine, ["リーチしたアカウント数", "リーチしたアカウント"]);
    if (reachedAccounts !== null) {
      result.reachedAccounts = reachedAccounts;
      result.hasData = true;
    }

    const interactionCount =
      line === "インタラクション" || /^インタラクション[：:\s]/.test(line)
        ? readNumberForLabel(line, nextLine, ["インタラクション"])
        : null;
    if (interactionCount !== null) {
      result.interactionCount = interactionCount;
      result.hasData = true;
    }

    if (line === "フォロワー以外" && prevLine === "インタラクション" && nextLine) {
      const percent = parseInstagramPercent(nextLine);
      if (percent !== null) {
        result.interactionFollowerPercent = percent;
        result.hasData = true;
      }
    }

    parseCommonPostMetrics({ result, line, nextLine, prevLine });
  }

  return result;
};

/**
 * Instagram分析データをパースする
 * @param text Instagram分析画面からコピーしたテキスト
 * @returns パースされたデータ
 */
export const parseInstagramReelData = (text: string): ParsedInstagramReelData => {
  const result: ParsedInstagramReelData = {
    hasData: false,
    reach: null,
    reelReachFollowerPercent: null,
    reelReachedAccounts: null,
    reelInteractionCount: null,
    reelInteractionFollowerPercent: null,
    likes: null,
    comments: null,
    saves: null,
    shares: null,
    reposts: null,
    followerIncrease: null,
    reelReachSourceProfile: null,
    reelReachSourceReel: null,
    reelReachSourceExplore: null,
    reelReachSourceSearch: null,
    reelReachSourceOther: null,
    profileVisits: null,
    externalLinkTaps: null,
    profileFollows: null,
  };

  const lines = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i < lines.length - 1 ? lines[i + 1] : null;
    const prevLine = i > 0 ? lines[i - 1] : null;

    // ビュー（閲覧数）
    const viewValue = line.includes("リーチしたアカウント")
      ? null
      : readNumberForLabel(line, nextLine, ["ビュー", "閲覧数", "リーチ"]);
    if (viewValue !== null) {
      result.reach = viewValue;
      result.hasData = true;
    }

    // フォロワー以外（閲覧数の） - ビューの下にある場合
    if (line === "フォロワー以外" && nextLine && prevLine && (prevLine === "ビュー" || prevLine.includes("閲覧数"))) {
      const percent = parseInstagramPercent(nextLine);
      if (percent !== null) {
        result.reelReachFollowerPercent = percent;
        result.hasData = true;
      }
    }

    // プロフィール（閲覧ソース）
    if (
      line.includes("プロフィール") &&
      !line.includes("プロフィールへの") &&
      prevLine !== "プロフィールのアクティビティ" &&
      !prevLine?.includes("プロフィールへの")
    ) {
      const value = readNumberForLabel(line, nextLine, ["プロフィール"]);
      if (value !== null) {
        result.reelReachSourceProfile = value;
        result.hasData = true;
      }
    }

    // リール（閲覧ソース）
    if (line.includes("リール") && !prevLine?.includes("閲覧")) {
      const value = readNumberForLabel(line, nextLine, ["リール"]);
      if (value !== null) {
        result.reelReachSourceReel = value;
        result.hasData = true;
      }
    }

    // 発見（閲覧ソース）
    if (line.includes("発見")) {
      const value = readNumberForLabel(line, nextLine, ["発見"]);
      if (value !== null) {
        result.reelReachSourceExplore = value;
        result.hasData = true;
      }
    }

    // 検索（閲覧ソース）
    if (line.includes("検索")) {
      const value = readNumberForLabel(line, nextLine, ["検索"]);
      if (value !== null) {
        result.reelReachSourceSearch = value;
        result.hasData = true;
      }
    }

    // その他（閲覧ソース）
    if (line.includes("その他") && !prevLine?.includes("フォロワー")) {
      const value = readNumberForLabel(line, nextLine, ["その他"]);
      if (value !== null) {
        result.reelReachSourceOther = value;
        result.hasData = true;
      }
    }

    // リーチしたアカウント数
    const reachedAccounts = readNumberForLabel(line, nextLine, ["リーチしたアカウント数", "リーチしたアカウント"]);
    if (reachedAccounts !== null) {
      result.reelReachedAccounts = reachedAccounts;
      result.hasData = true;
    }

    // インタラクション数（単独の行）
    const interactionCount =
      line === "インタラクション" || /^インタラクション[：:\s]/.test(line)
        ? readNumberForLabel(line, nextLine, ["インタラクション"])
        : null;
    if (interactionCount !== null) {
      result.reelInteractionCount = interactionCount;
      result.hasData = true;
    }

    // インタラクションのフォロワー以外
    if (line === "フォロワー以外" && prevLine === "インタラクション" && nextLine) {
      const percent = parseInstagramPercent(nextLine);
      if (percent !== null) {
        result.reelInteractionFollowerPercent = percent;
        result.hasData = true;
      }
    }

    parseCommonPostMetrics({ result, line, nextLine, prevLine });
  }

  return result;
};


















