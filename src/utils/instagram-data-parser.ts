/**
 * Instagram分析データのパースユーティリティ
 */

export function parseInstagramNumber(value: string | null | undefined): number | null {
  const raw = String(value || "")
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/,/g, "")
    .trim();
  const match = raw.match(/(\d+(?:\.\d+)?)\s*([万億kKＫ]?)/);
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

export interface ParsedInstagramReelData {
  hasData: boolean;
  reach: number | null;
  reelReachFollowerPercent: number | null;
  reelReachedAccounts: number | null;
  reelInteractionCount: number | null;
  reelInteractionFollowerPercent: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  reelReachSourceProfile: number | null;
  reelReachSourceReel: number | null;
  reelReachSourceExplore: number | null;
  reelReachSourceSearch: number | null;
  reelReachSourceOther: number | null;
  profileVisits: number | null;
  externalLinkTaps: number | null;
  profileFollows: number | null;
}

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

    // いいね
    const likes = readNumberForLabel(line, nextLine, ["いいね数", "いいね", "「いいね！」"]);
    if (likes !== null) {
      result.likes = likes;
      result.hasData = true;
    }

    // コメント
    const comments = !prevLine?.includes("インタラクション")
      ? readNumberForLabel(line, nextLine, ["コメント数", "コメント"])
      : null;
    if (comments !== null) {
      result.comments = comments;
      result.hasData = true;
    }

    // 保存数
    const saves = readNumberForLabel(line, nextLine, ["保存数", "保存"]);
    if (saves !== null) {
      result.saves = saves;
      result.hasData = true;
    }

    // シェア数
    const shares = readNumberForLabel(line, nextLine, ["シェア数", "シェア"]);
    if (shares !== null) {
      result.shares = shares;
      result.hasData = true;
    }

    // プロフィールへのアクセス
    const profileVisits = readNumberForLabel(line, nextLine, ["プロフィールへのアクセス", "プロフィールアクセス"]);
    if (profileVisits !== null) {
      result.profileVisits = profileVisits;
      result.hasData = true;
    }

    // 外部リンクのタップ数
    const externalLinkTaps = readNumberForLabel(line, nextLine, ["外部リンクのタップ数", "外部リンクタップ"]);
    if (externalLinkTaps !== null) {
      result.externalLinkTaps = externalLinkTaps;
      result.hasData = true;
    }

    // フォロー数
    const follows = readNumberForLabel(line, nextLine, ["フォロー数"]);
    if (follows !== null) {
      result.profileFollows = follows;
      result.hasData = true;
    }
  }

  return result;
};





















