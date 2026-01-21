/**
 * Domain層: 投稿パターン分析
 * 評価・解釈・判定を行う
 */

import type { PostPerformanceTag, PostLearningSignal, PatternSummary } from "../../types";
import { collectTopHashtags } from "../metrics/calculations";

/**
 * OpenAI APIを呼び出す（将来domain/ai/client.tsに移動予定）
 */
async function callOpenAI(prompt: string, context?: string): Promise<string> {
  // この関数は将来domain/ai/client.tsに移動予定
  // 今は一時的にここに含める
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not found");
  }

  const messages = [
    {
      role: "system",
      content: `あなたはInstagram分析の専門AIアシスタントです。ユーザーのInstagram運用データを分析し、具体的で実用的なアドバイスを提供します。

分析のポイント：
- データに基づいた客観的な分析
- 具体的で実行可能な改善提案
- ユーザーの成長段階に応じたアドバイス
- 簡潔で分かりやすい説明

${context ? `\nマスターコンテキスト:\n${context}` : ""}`,
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "分析結果を取得できませんでした。";
}

/**
 * フォールバックパターンサマリーを生成（AIなし）
 */
export function buildFallbackPatternSummary(
  tag: PostPerformanceTag,
  posts: PostLearningSignal[]
): PatternSummary {
  const tagLabelMap: Record<PostPerformanceTag, string> = {
    gold: "成功パターン",
    gray: "ユーザー満足は高いが指標が伸びないパターン",
    red: "改善が必要なパターン",
    neutral: "参考パターン",
  };

  const topHashtags = collectTopHashtags(posts);
  const hashtagList = Object.keys(topHashtags);

  let summary = `${tagLabelMap[tag]}が${posts.length}件見つかりました。`;
  if (hashtagList.length > 0) {
    summary += ` よく使われたハッシュタグは${hashtagList.slice(0, 3).join("、")}です。`;
  }

  const defaultCautions =
    tag === "red"
      ? ["CTAの明確化", "投稿構成の見直し", "ハッシュタグの再検証"]
      : tag === "gray"
        ? ["KPIの改善策を併記する", "投稿時間の最適化", "ビジュアル要素の見直し"]
        : [];

  const suggestedAngles =
    tag === "gold"
      ? ["成功パターンの再活用", "構成・トーンのテンプレ化", "CTAの強化"]
      : tag === "gray"
        ? ["主観満足の理由を活かしつつKPI向上施策を試す", "エンゲージメント導線を追加する"]
        : ["投稿内容とターゲットの整合性を再確認する"];

  return {
    tag,
    summary,
    keyThemes: hashtagList.slice(0, 5),
    cautions: defaultCautions,
    suggestedAngles,
  };
}

/**
 * 投稿パターンを要約（AI使用）
 */
export async function summarizePostPatterns(
  tag: PostPerformanceTag,
  posts: PostLearningSignal[]
): Promise<PatternSummary | null> {
  if (posts.length === 0) {
    return null;
  }

  const tagLabelMap: Record<PostPerformanceTag, string> = {
    gold: "成功パターン（指標も満足度も高い投稿）",
    gray: "主観満足度は高いが指標が伸びにくい投稿",
    red: "指標も満足度も低い投稿",
    neutral: "参考レベルの投稿",
  };

  const sample = posts.slice(0, 5).map((post) => ({
    title: post.title,
    category: post.category,
    engagementRate: post.engagementRate,
    reach: post.reach,
    followerIncrease: post.followerIncrease,
    sentimentLabel: post.sentimentLabel,
    sentimentScore: post.sentimentScore,
    hashtags: post.hashtags,
  }));

  const prompt = `以下はInstagram投稿の${tagLabelMap[tag]}一覧です。共通点や活用すべき要素、注意点を整理し、必ず次のJSON形式のみで回答してください。

投稿データ:
${JSON.stringify(sample, null, 2)}

出力形式:
{
  "summary": "全体像（120文字以内）",
  "keyThemes": ["共通する特徴やハッシュタグ", "..."],
  "cautions": ["改善・注意すべき点", "..."],
  "suggestedAngles": ["次回活かす視点", "..."]
}

制約:
- JSON以外のテキストは一切出力しない
- 日本語で記述する
- keyThemes, cautions, suggestedAnglesは空配列でもよいが、存在する場合は具体的に記載する`;

  try {
    const response = await callOpenAI(prompt);
    const jsonText = response.trim().startsWith("{")
      ? response.trim()
      : response.slice(response.indexOf("{"));
    const parsed = JSON.parse(jsonText);

    return {
      tag,
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      keyThemes: Array.isArray(parsed.keyThemes)
        ? parsed.keyThemes.filter((item: unknown): item is string => typeof item === "string")
        : [],
      cautions: Array.isArray(parsed.cautions)
        ? parsed.cautions.filter((item: unknown): item is string => typeof item === "string")
        : [],
      suggestedAngles: Array.isArray(parsed.suggestedAngles)
        ? parsed.suggestedAngles.filter((item: unknown): item is string => typeof item === "string")
        : [],
    };
  } catch (error) {
    console.error("投稿パターン要約生成エラー:", error);
    return buildFallbackPatternSummary(tag, posts);
  }
}

