import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import {
  buildPostPatternPromptSection,
  getMasterContext,
} from "../../ai/monthly-analysis/route";

export async function POST(request: NextRequest) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "instagram-story-suggestions", limit: 30, windowSeconds: 60 },
      auditEventName: "instagram_story_suggestions",
    });

    const body = await request.json();
    const { content, businessInfo } = body;

    if (!content || !businessInfo) {
      return NextResponse.json({ error: "必要なパラメータが不足しています" }, { status: 400 });
    }

    // ビジネス情報からコンテキストを構築
    const businessContext = buildBusinessContext(businessInfo);
    const masterContext = await getMasterContext(userId);
    const patternContext = buildPostPatternPromptSection(masterContext?.postPatterns);

    // AIプロンプトを構築
    const prompt = buildSuggestionsPrompt(content, businessContext, patternContext);

    // OpenAI APIを呼び出して提案を生成
    const suggestionsResponse = await generateSuggestionsWithAI(prompt);

    const rationale = buildSuggestionRationale(masterContext, businessInfo);

    return NextResponse.json({
      suggestions: suggestionsResponse,
      ...(rationale ? { rationale } : {}),
    });
  } catch (error) {
    console.error("画像・動画提案生成エラー:", error);
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

function buildSuggestionsPrompt(content: string, context: string, patternContext?: string) {
  return `
あなたはInstagramストーリーの専門家です。以下の投稿文に合うストーリーのアイデアを提案してください。

【投稿文】
${content}

【ビジネス情報】
${context}

${patternContext ?? ""}

【要求事項】
1. 投稿文に合ったシンプルなストーリーアイデア（2行以内）
2. Instagramストーリーの特徴（縦長、短時間）を考慮
3. エンゲージメントを高める具体的な方法（1つ）

【出力形式】
以下の形式で回答してください：

📷 ストーリーのアイデア
[2行以内の具体的なアイデア]

💡 エンゲージメント向上のコツ
[1つの具体的な方法を2行以内で]
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
