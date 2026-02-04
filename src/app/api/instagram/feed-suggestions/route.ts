import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import {
  buildPostPatternPromptSection,
  getMasterContext,
} from "../../ai/monthly-analysis/infra/firestore/master-context";

export async function POST(request: NextRequest) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "instagram-feed-suggestions", limit: 30, windowSeconds: 60 },
      auditEventName: "instagram_feed_suggestions",
    });

    const body = await request.json();
    const { content, businessInfo, feedOptions } = body;

    if (!content || !businessInfo) {
      return NextResponse.json({ error: "必要なパラメータが不足しています" }, { status: 400 });
    }

    // ビジネス情報からコンテキストを構築
    const businessContext = buildBusinessContext(businessInfo);
    const masterContext = await getMasterContext(userId);
    const patternContext = buildPostPatternPromptSection(masterContext?.postPatterns);

    // AIプロンプトを構築
    const prompt = buildSuggestionsPrompt(content, businessContext, patternContext, feedOptions);

    // OpenAI APIを呼び出して提案を生成
    const suggestionsResponse = await generateSuggestionsWithAI(prompt);

    const rationale = buildSuggestionRationale(masterContext, businessInfo);

    return NextResponse.json({
      suggestions: suggestionsResponse,
      ...(rationale ? { rationale } : {}),
    });
  } catch (error) {
    console.error("フィードAIヒント生成エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

function buildBusinessContext(businessInfo: Record<string, unknown>): string {
  const context = [];

  if (businessInfo.companySize) {
    context.push(`会社規模: ${businessInfo.companySize}`);
  }

  if (businessInfo.targetMarket && Array.isArray(businessInfo.targetMarket)) {
    context.push(
      `ターゲット市場: ${Array.isArray(businessInfo.targetMarket) ? businessInfo.targetMarket.join(", ") : businessInfo.targetMarket}`
    );
  }

  if (businessInfo.goals && Array.isArray(businessInfo.goals)) {
    context.push(
      `目標: ${Array.isArray(businessInfo.goals) ? businessInfo.goals.join(", ") : businessInfo.goals}`
    );
  }

  if (businessInfo.challenges && Array.isArray(businessInfo.challenges)) {
    context.push(
      `課題: ${Array.isArray(businessInfo.challenges) ? businessInfo.challenges.join(", ") : businessInfo.challenges}`
    );
  }

  if (businessInfo.features && Array.isArray(businessInfo.features)) {
    context.push(
      `機能: ${Array.isArray(businessInfo.features) ? businessInfo.features.join(", ") : businessInfo.features}`
    );
  }

  if (businessInfo.industry) {
    context.push(`業種: ${businessInfo.industry}`);
  }

  return context.join("\n");
}

// フィード投稿タイプの日本語ラベル
const FEED_TYPE_LABELS = {
  value: "情報有益型",
  empathy: "共感型",
  story: "ストーリー型",
  credibility: "実績・信頼型",
  promo: "告知・CTA型",
  brand: "ブランド・世界観型",
} as const;

function buildSuggestionsPrompt(
  content: string,
  context: string,
  patternContext?: string,
  feedOptions?: {
    feedPostType: "value" | "empathy" | "story" | "credibility" | "promo" | "brand";
    textVolume: "short" | "medium" | "long";
    imageCount: number;
  }
) {
  const feedOptionsSection = feedOptions
    ? `
【投稿設定】
- 投稿の目的: ${FEED_TYPE_LABELS[feedOptions.feedPostType]}
- 文章量: ${feedOptions.textVolume === "short" ? "軽め（80-120文字）" : feedOptions.textVolume === "medium" ? "ふつう（150-200文字）" : "しっかり（250-400文字）"}
- 使用する画像の枚数: ${feedOptions.imageCount}枚

重要: 上記の投稿設定を考慮して、特に「${FEED_TYPE_LABELS[feedOptions.feedPostType]}」の目的に合った画像のアイデアを提案してください。
`
    : "";

  return `
あなたはInstagramフィード投稿の専門家です。以下の投稿文とビジネス情報を基に、AIが生成した投稿文に合う画像の枚数やサムネイルのアイデアとフィードのヒントを簡潔に提案してください。

【投稿文】
${content}

【ビジネス情報】
${context}

${patternContext ?? ""}
${feedOptionsSection}

【要求事項】
1. ${feedOptions ? `指定された画像枚数（${feedOptions.imageCount}枚）を考慮し、` : ""}投稿文の内容に合った画像の枚数を提案（1枚〜10枚の範囲）
2. Instagramフィードの特徴（正方形、高品質）を考慮
3. ビジネス情報を参考に、ターゲット層に響く内容
4. ${feedOptions ? `「${FEED_TYPE_LABELS[feedOptions.feedPostType]}」の目的に沿った` : ""}エンゲージメントを高めるための具体的なアイデア（3-5個）

【出力形式】
以下の形式で回答し、各セクションは2-3行にまとめてください：

📸 画像の枚数
${feedOptions ? `[指定された${feedOptions.imageCount}枚を考慮し、` : "[数値]枚"}${feedOptions ? "その理由も含めて]" : ""}

🖼️ サムネイルのアイデア
[${feedOptions ? `「${FEED_TYPE_LABELS[feedOptions.feedPostType]}」の目的に合った` : ""}具体的なアイデア。2-3行で簡潔に]

💡 フィードのヒント
1. [${feedOptions ? `「${FEED_TYPE_LABELS[feedOptions.feedPostType]}」に適した` : ""}エンゲージメント向上の具体的な方法]
2. [撮影や構図のコツ]
3. [投稿タイミングやターゲティング]

🏷️ ハッシュタグのヒント
- 企業ハッシュタグ: 固定で使用されます（ユーザー名から自動生成されるため、提案不要）
- 投稿内容に合わせて、トレンドハッシュタグ1個と補助的ハッシュタグ3個を選定してください（合計4個）
`;
}

async function generateSuggestionsWithAI(prompt: string) {
  const { default: OpenAI } = await import("openai");

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY,
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AIからの応答がありません");
    }

    return content;
  } catch (error) {
    console.error("OpenAI API エラー:", error);
    throw error;
  }
}

function buildSuggestionRationale(
  masterContext: Awaited<ReturnType<typeof getMasterContext>>,
  businessInfo: Record<string, unknown>
) {
  const lines: string[] = [];

  const goldSummary = masterContext?.postPatterns?.summaries?.gold?.summary;
  if (goldSummary) {
    lines.push(`成功パターン: ${goldSummary}`);
  }

  const recommendation = masterContext?.recommendations?.find((item) => typeof item === "string" && item.trim().length > 0);
  if (recommendation) {
    lines.push(`推奨アクション: ${recommendation}`);
  }

  const cautionSummary = masterContext?.postPatterns?.summaries?.red?.summary;
  if (cautionSummary) {
    lines.push(`回避ポイント: ${cautionSummary}`);
  }

  if (lines.length < 2) {
    const insight = masterContext?.personalizedInsights?.find((item) => typeof item === "string" && item.trim().length > 0);
    if (insight) {
      lines.push(`学習インサイト: ${insight}`);
    }
  }

  if (lines.length === 0) {
    const goals = Array.isArray(businessInfo.goals) ? businessInfo.goals : [];
    if (goals.length > 0) {
      lines.push(`目標フォーカス: ${goals.slice(0, 2).join(" / ")}`);
    }

    const targetMarket = Array.isArray(businessInfo.targetMarket) ? businessInfo.targetMarket : [];
    if (targetMarket.length > 0) {
      lines.push(`ターゲット: ${targetMarket.slice(0, 2).join(" / ")}`);
    }
  }

  return lines.slice(0, 3).join("\n");
}
