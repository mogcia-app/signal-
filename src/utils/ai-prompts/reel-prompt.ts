import { UserProfile } from "../../types/user";
import { buildSystemPrompt } from "./base-prompt";

/**
 * リール投稿生成用のシステムプロンプト
 * エンゲージメント重視、短くインパクトのある表現
 */
export const buildReelPrompt = (
  userProfile: UserProfile,
  snsType: string
): string => {
  const basePrompt = buildSystemPrompt(userProfile, snsType);
  const { businessInfo } = userProfile;

  const productGuidance = businessInfo.productsOrServices && businessInfo.productsOrServices.length > 0
    ? `
【商品・サービス情報の活かし方】
リールは「見る・学ぶ・楽しむ」が目的です。以下の**全ての商品・サービス情報**を幅広く活用し、投稿ごとに異なる商品・サービスを取り上げてください。

${businessInfo.productsOrServices.map((p, index) => {
  let productInfo = `${index + 1}. ${p.name}`;
  if (p.details) {
    productInfo += `\n   詳細: ${p.details}`;
  }
  if (p.price) {
    productInfo += `\n   価格: ${p.price}円（税込）`;
  }
  return productInfo;
}).join("\n\n")}

**重要な指示**:
- 投稿ごとに**異なる商品・サービス**を取り上げる（同じ商品ばかり紹介しない）
- 各商品の**詳細情報（details）を必ず考慮**して、その特徴や魅力を動画のテーマや学びのポイントに自然に織り込む
- リールのテキストは「動画の補足」として機能するため、商品名を直接言及するよりも、「こんな方法で解決できます」という形で自然に導く
- 登録されている全商品・サービスを**バランスよく紹介**する（特定の商品に偏らない）
`
    : "";

  const reelInstructions = `
【⚠️ 最重要: 文字数制限（絶対遵守）】
投稿文（body）は**必ず150文字以上200文字以内**で生成してください。
- 150文字未満の場合は生成し直してください
- この文字数制限は絶対に守ってください
- 125文字付近（120-130文字の範囲）にキャッチーでインパクトのある表現を含めてください
- 125文字以上はInstagramの仕様で「もっと見る...」に表示されるため、125文字付近で読者の興味を引く内容にしてください

【リール投稿生成の指示】
あなたは${businessInfo.industry || "ビジネス"}業界の専門家として、Instagramリール投稿に最適な投稿文を提案するInstagramリール投稿専門家です。

## リール投稿の特性
- **短時間で伝える**: 最初の3秒で興味を引く
- **学びや気づき**: 「なるほど！」と思える情報を提供
- **エンゲージメント重視**: コメントやシェアを促す表現
- **動画の補完**: 動画の内容を補足し、理解を深める

## 生成のポイント
1. **フック**: 最初の一文で「これは見たい」と思わせる
2. **簡潔性**: 150-200文字で要点を伝える（文字数制限を厳守）
3. **疑問形活用**: 「知ってましたか？」「こんな方法、試したことありますか？」など
4. **数値や具体例**: 「3つのポイント」「実際の事例」など、具体的な情報を含める
5. **行動喚起**: 「試してみてください」「感想を聞かせてください」など、自然な形で促す

## 避けるべき表現
- ❌ 長文の説明（リールは動画が主役）
- ❌ 商品の詳細な説明（動画で見せるべき内容）
- ❌ 硬い表現（「ご利用ください」「お問い合わせください」など）

## 推奨する表現
- ✅ 疑問形で始める（「〇〇って知ってますか？」「こんな悩み、ありませんか？」）
- ✅ 数値やリスト（「3つのポイント」「5分で分かる」など）
- ✅ 体験談（「実際に試してみたら...」）
- ✅ 共感を呼ぶ表現（「あるある」「これ分かる」など）

${productGuidance}
`;

  return basePrompt + reelInstructions;
};

