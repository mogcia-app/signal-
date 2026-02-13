/**
 * Instagram分析データのパースユーティリティ
 */

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
    if (line === "ビュー" && nextLine && /^\d+$/.test(nextLine)) {
      result.reach = parseInt(nextLine, 10);
      result.hasData = true;
    }

    // フォロワー以外（閲覧数の） - ビューの下にある場合
    if (line === "フォロワー以外" && nextLine && prevLine && (prevLine === "ビュー" || prevLine.includes("閲覧数"))) {
      const percent = parseFloat(nextLine.replace("%", ""));
      if (!isNaN(percent)) {
        result.reelReachFollowerPercent = percent;
        result.hasData = true;
      }
    }

    // プロフィール（閲覧ソース）
    if (line === "プロフィール" && nextLine && /^\d+$/.test(nextLine) && prevLine !== "プロフィールのアクティビティ" && !prevLine?.includes("プロフィールへの")) {
      result.reelReachSourceProfile = parseInt(nextLine, 10);
      result.hasData = true;
    }

    // リール（閲覧ソース）
    if (line === "リール" && nextLine && /^\d+$/.test(nextLine) && !prevLine?.includes("閲覧")) {
      result.reelReachSourceReel = parseInt(nextLine, 10);
      result.hasData = true;
    }

    // 発見（閲覧ソース）
    if (line === "発見" && nextLine && /^\d+$/.test(nextLine)) {
      result.reelReachSourceExplore = parseInt(nextLine, 10);
      result.hasData = true;
    }

    // 検索（閲覧ソース）
    if (line === "検索" && nextLine && /^\d+$/.test(nextLine)) {
      result.reelReachSourceSearch = parseInt(nextLine, 10);
      result.hasData = true;
    }

    // その他（閲覧ソース）
    if (line === "その他" && nextLine && /^\d+$/.test(nextLine) && !prevLine?.includes("フォロワー")) {
      result.reelReachSourceOther = parseInt(nextLine, 10);
      result.hasData = true;
    }

    // リーチしたアカウント数
    if (line.includes("リーチしたアカウント数") && nextLine && /^\d+$/.test(nextLine)) {
      result.reelReachedAccounts = parseInt(nextLine, 10);
      result.hasData = true;
    }

    // インタラクション数（単独の行）
    if (line === "インタラクション" && nextLine && /^\d+$/.test(nextLine)) {
      result.reelInteractionCount = parseInt(nextLine, 10);
      result.hasData = true;
    }

    // インタラクションのフォロワー以外
    if (line === "フォロワー以外" && prevLine === "インタラクション" && nextLine) {
      const percent = parseFloat(nextLine.replace("%", ""));
      if (!isNaN(percent)) {
        result.reelInteractionFollowerPercent = percent;
        result.hasData = true;
      }
    }

    // いいね
    if ((line.includes("いいね") || line === "「いいね！」") && nextLine && /^\d+$/.test(nextLine)) {
      result.likes = parseInt(nextLine, 10);
      result.hasData = true;
    }

    // コメント
    if (line === "コメント" && nextLine && /^\d+$/.test(nextLine) && !prevLine?.includes("インタラクション")) {
      result.comments = parseInt(nextLine, 10);
      result.hasData = true;
    }

    // 保存数
    if (line === "保存数" && nextLine && /^\d+$/.test(nextLine)) {
      result.saves = parseInt(nextLine, 10);
      result.hasData = true;
    }

    // シェア数
    if (line === "シェア数" && nextLine && /^\d+$/.test(nextLine)) {
      result.shares = parseInt(nextLine, 10);
      result.hasData = true;
    }

    // プロフィールへのアクセス
    if (line === "プロフィールへのアクセス" && nextLine && /^\d+$/.test(nextLine)) {
      result.profileVisits = parseInt(nextLine, 10);
      result.hasData = true;
    }

    // 外部リンクのタップ数
    if (line === "外部リンクのタップ数" && nextLine && /^\d+$/.test(nextLine)) {
      result.externalLinkTaps = parseInt(nextLine, 10);
      result.hasData = true;
    }

    // フォロー数
    if (line === "フォロー数" && nextLine && /^\d+$/.test(nextLine)) {
      result.profileFollows = parseInt(nextLine, 10);
      result.hasData = true;
    }
  }

  return result;
};

















