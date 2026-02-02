/**
 * 投稿エディター用ユーティリティ関数
 */

/**
 * プロンプト内容を分析してフィードバックを生成
 * @param prompt プロンプト文字列
 * @returns フィードバックとカテゴリ
 */
export const analyzePrompt = (prompt: string): { feedback: string | null; category: string } => {
  const trimmed = prompt.trim();
  const length = trimmed.length;

  // 空の場合
  if (length === 0) {
    return { feedback: null, category: "" };
  }

  // 短すぎる場合
  if (length < 10) {
    return {
      feedback: `プロンプトが短すぎるようです（${length}文字）。以下のような情報を含めると、より具体的で効果的な投稿文が生成されます：\n• 何について投稿したいか（商品、イベント、日常など）\n• 伝えたいメッセージや感情（「感動した」「おすすめしたい」など）\n• ターゲット層（「若い女性」「ビジネスパーソン」など）\n• 具体的な内容（「新商品のコーヒー豆、深煎りでコクがある」など）\n\n例：「新商品のコーヒー豆を紹介したい。深煎りでコクがあり、朝の時間にぴったり。30代の女性向けに、日常の小さな幸せを感じられる投稿にしてほしい」`,
      category: "too_short",
    };
  }

  // 曖昧な表現が多い
  const vagueWords = /(いい|良い|すごい|すごく|なんか|なんとなく|ちょっと|まあ|適当|いい感じ)/g;
  const vagueCount = (trimmed.match(vagueWords) || []).length;
  
  if (vagueCount >= 2 && length < 50) {
    return {
      feedback: `プロンプトに曖昧な表現が多いようです。「いい感じ」「すごい」などの抽象的な言葉ではなく、具体的な情報を含めると、より効果的な投稿文が生成されます：\n• 商品の場合：価格、特徴、使った感想、おすすめポイント\n• イベントの場合：日時、場所、参加方法、どんな内容か\n• 日常の場合：何が起きたか、なぜ印象的だったか、何を感じたか\n• ターゲット層：誰に伝えたいのか、どんな価値を提供したいのか`,
      category: "vague",
    };
  }

  // 具体的な情報が不足
  const hasSpecificInfo = /\d+|(日時|場所|価格|特徴|感想|おすすめ)/g.test(trimmed);
  if (!hasSpecificInfo && length < 40) {
    return {
      feedback: `プロンプトに具体的な情報が不足しているようです。以下のような詳細を追加すると、より魅力的な投稿文が生成されます：\n• 数字やデータ（「1000円」「3日間限定」「累計1万個販売」など）\n• 具体的な特徴や違い（「他にはない香り」「30分で完成」など）\n• 実体験や感想（「使ってみたら」「実際に感じたことは」など）\n• ターゲット層との接点（「忙しい朝に」「仕事帰りに」など）`,
      category: "lack_details",
    };
  }

  // 問題なし
  return { feedback: null, category: "" };
};

/**
 * ハッシュタグを正規化する
 * @param hashtags ハッシュタグの配列
 * @returns 正規化されたハッシュタグの配列
 */
export const normalizeHashtags = (hashtags: string[]): string[] => {
  return hashtags
    .map((tag) => tag.trim().replace(/^#+/, "")) // 先頭の#を削除
    .filter((tag) => tag.length > 0) // 空文字列を除外
    .map((tag) => `#${tag}`); // #を追加
};

/**
 * ハッシュタグを追加する（重複チェック付き）
 * @param currentHashtags 現在のハッシュタグ配列
 * @param newHashtag 追加するハッシュタグ
 * @param maxCount 最大数（デフォルト: 無制限）
 * @returns 追加後のハッシュタグ配列、またはnull（追加できない場合）
 */
export const addHashtag = (
  currentHashtags: string[],
  newHashtag: string,
  maxCount?: number
): string[] | null => {
  const normalized = newHashtag.trim().replace(/^#+/, "");
  
  if (normalized.length === 0) {
    return null;
  }

  // 最大数チェック
  if (maxCount !== undefined && currentHashtags.length >= maxCount) {
    return null;
  }

  // 重複チェック
  const normalizedCurrent = currentHashtags.map((tag) => tag.replace(/^#+/, "").toLowerCase());
  if (normalizedCurrent.includes(normalized.toLowerCase())) {
    return null;
  }

  return [...currentHashtags, `#${normalized}`];
};

