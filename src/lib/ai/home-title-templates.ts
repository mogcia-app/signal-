export type PostType = "feed" | "reel" | "story";

export type PurposeKey = "awareness" | "recruit" | "sales" | "fan" | "inquiry" | "branding";

type PurposeTemplateSet = Record<PostType, string[]>;

export const PURPOSE_TITLE_TEMPLATES: Record<PurposeKey, PurposeTemplateSet> = {
  awareness: {
    feed: [
      "はじめての{product}入門",
      "{product}の魅力が伝わる3ポイント",
      "{product}を知るための基本ガイド",
    ],
    reel: [
      "30秒でわかる{product}とは",
      "{product}の魅力を1分で体感",
      "{product}を知る最初の1本",
    ],
    story: [
      "{product}ってどんな特徴？",
      "{product}の気になる点アンケート",
      "{product}の疑問を募集",
    ],
  },
  recruit: {
    feed: [
      "{subject}の1日",
      "未経験から始める{subject}",
      "{subject}に向いている人",
      "{subject}のやりがい",
    ],
    reel: [
      "1分でわかる{subject}",
      "{subject}のリアル",
      "{subject}の裏側",
    ],
    story: [
      "{subject}、気になる？",
      "応募前の疑問に回答",
      "{subject}って実際どう？",
    ],
  },
  sales: {
    feed: [
      "{product}を選ぶ理由",
      "{product}の人気ポイント",
      "{product}のおすすめシーン",
    ],
    reel: [
      "{product}の開封レビュー",
      "{product}の香りと味わい",
      "{product}を試した感想",
    ],
    story: [
      "{product}どっちが気になる？",
      "{product}本日のおすすめ",
      "{product}購入前に知りたいこと",
    ],
  },
  fan: {
    feed: [
      "{product}が好きになる理由",
      "{product}をもっと楽しむアイデア",
      "{product}と過ごす特別な時間",
    ],
    reel: [
      "{product}がもっと好きになる1分",
      "{product}ファンの共感ポイント",
      "{product}を楽しむルーティン",
    ],
    story: [
      "{product}の好きなポイントは？",
      "{product}ファン投票",
      "{product}の楽しみ方をシェア",
    ],
  },
  inquiry: {
    feed: [
      "{product}の相談が増えた理由",
      "{product}の導入事例",
      "{product}の問い合わせ前チェック",
    ],
    reel: [
      "{product}の相談が増える導線",
      "{product}のよくある質問",
      "{product}の問い合わせの流れ",
    ],
    story: [
      "{product}で気になることありますか？",
      "{product}の相談受付中",
      "{product}の疑問に回答します",
    ],
  },
  branding: {
    feed: [
      "{product}に込めた想い",
      "{product}が生まれた背景",
      "{product}ブランドの約束",
    ],
    reel: [
      "{product}ブランドの空気感ムービー",
      "{product}を支えるこだわり",
      "{product}ブランドの裏側",
    ],
    story: [
      "{product}の価値観を一言で",
      "{product}らしさ、どれが好き？",
      "{product}ブランドQ&A",
    ],
  },
};

export const normalizePurposeKey = (value: string): PurposeKey => {
  const normalized = String(value || "").trim();
  if (normalized === "求人・リクルート強化" || normalized === "採用・リクルーティング強化") {return "recruit";}
  if (normalized === "商品・サービスの販売促進") {return "sales";}
  if (normalized === "ファンを作りたい") {return "fan";}
  if (normalized === "来店・問い合わせを増やしたい") {return "inquiry";}
  if (normalized === "企業イメージ・ブランディング") {return "branding";}
  return "awareness";
};
