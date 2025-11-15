export interface ABTestPreset {
  id: string;
  name: string;
  description: string;
  variants: Array<{
    label: string;
    summary: string;
    recommendedUse: string;
  }>;
}

export const AB_TEST_PRESETS: ABTestPreset[] = [
  {
    id: "hook-style",
    name: "冒頭フック比較",
    description: "導入1行目を変えたときの保存率・離脱率の差分を検証",
    variants: [
      {
        label: "Beforeフック",
        summary: "課題や失敗談から入るストーリー型",
        recommendedUse: "悩み解決系、教育コンテンツ",
      },
      {
        label: "Afterフック",
        summary: "成果やベネフィットを先に見せる結論先出し型",
        recommendedUse: "ビフォアフター、実績紹介",
      },
    ],
  },
  {
    id: "cta-highlight",
    name: "CTA比較",
    description: "投稿最後のCTA表現で反応がどう変わるかを検証",
    variants: [
      {
        label: "コミュニティ誘導",
        summary: "コメントやDMで会話を促すCTA",
        recommendedUse: "コミュニティ形成・親密度強化",
      },
      {
        label: "保存シグナル",
        summary: "保存/スクショを促す一言を添えるCTA",
        recommendedUse: "Tips系、チェックリスト系投稿",
      },
      {
        label: "サイト誘導",
        summary: "LPやフォームに誘導するCTA",
        recommendedUse: "キャンペーン、予約案内",
      },
    ],
  },
  {
    id: "visual-style",
    name: "ビジュアルテイスト比較",
    description: "投稿で使う画像テイストを変えてリーチ/保存率を比較",
    variants: [
      {
        label: "ミニマル",
        summary: "余白を活かしたシンプルなデザイン",
        recommendedUse: "高単価商品、ブランド系投稿",
      },
      {
        label: "インフォグラフィック",
        summary: "図解と箇条書きで情報を整理",
        recommendedUse: "Tips、ハウツー、数値訴求",
      },
    ],
  },
];

