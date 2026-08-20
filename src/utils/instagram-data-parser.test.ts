import { parseInstagramFeedData, parseInstagramNumber, parseInstagramReelData } from "@/utils/instagram-data-parser";

describe("instagram-data-parser", () => {
  test("parses formatted Instagram numbers", () => {
    expect(parseInstagramNumber("1,234")).toBe(1234);
    expect(parseInstagramNumber("1.2万")).toBe(12000);
    expect(parseInstagramNumber("1.5K")).toBe(1500);
    expect(parseInstagramNumber("いいね数: 987")).toBe(987);
    expect(parseInstagramNumber("フォロワー増加 -2")).toBe(-2);
  });

  test("parses reel metrics when labels and values are copied on the same line", () => {
    const parsed = parseInstagramReelData(`
      ビュー 1,234
      リーチしたアカウント数: 987
      インタラクション 123
      いいね数 45
      コメント 6
      保存数 7
      シェア数 8
      リポスト 2
      プロフィールへのアクセス 9
      外部リンクのタップ数 10
      フォロー数 11
    `);

    expect(parsed).toMatchObject({
      hasData: true,
      reach: 1234,
      reelReachedAccounts: 987,
      reelInteractionCount: 123,
      likes: 45,
      comments: 6,
      saves: 7,
      shares: 8,
      reposts: 2,
      followerIncrease: 11,
      profileVisits: 9,
      externalLinkTaps: 10,
      profileFollows: 11,
    });
  });

  test("parses reel metrics when labels and values are on separate lines", () => {
    const parsed = parseInstagramReelData(`
      ビュー
      1.2万
      いいね
      1,234
      コメント
      56
      保存数
      78
      シェア数
      90
    `);

    expect(parsed.reach).toBe(12000);
    expect(parsed.likes).toBe(1234);
    expect(parsed.comments).toBe(56);
    expect(parsed.saves).toBe(78);
    expect(parsed.shares).toBe(90);
  });

  test("parses feed metrics copied with common Instagram label variants", () => {
    const parsed = parseInstagramFeedData(`
      リーチ
      260
      リーチしたアカウント
      240
      いいね
      6
      コメント
      0
      シェア
      3
      保存済み
      4
      リポスト
      1
      フォロワー増加
      +2
      発見
      12
      検索
      5
    `);

    expect(parsed).toMatchObject({
      hasData: true,
      reach: 260,
      reachedAccounts: 240,
      likes: 6,
      comments: 0,
      shares: 3,
      saves: 4,
      reposts: 1,
      followerIncrease: 2,
      reachSourceExplore: 12,
      reachSourceSearch: 5,
    });
  });
});
