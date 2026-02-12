import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface ImageInsightRequest {
  postType: "feed" | "reel" | "story";
  imageData: string;
  textContext?: {
    title?: string;
    content?: string;
    hashtags?: string;
  };
  metrics?: Record<string, string | number | undefined>;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "ai-image-insight", limit: 20, windowSeconds: 60 },
      auditEventName: "ai_image_insight",
    });

    if (!openai) {
      return NextResponse.json({ error: "AI機能が利用できません。" }, { status: 500 });
    }

    const body = (await request.json()) as ImageInsightRequest;
    const { postType, imageData, textContext, metrics } = body;

    if (!imageData || !imageData.startsWith("data:image/")) {
      return NextResponse.json({ error: "有効な画像データが必要です。" }, { status: 400 });
    }

    const metricsText = Object.entries(metrics || {})
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => `- ${key}: ${value}`)
      .join("\n");

    const prompt = `
あなたはInstagram運用の画像分析アシスタントです。
投稿タイプ: ${postType}

投稿タイトル: ${textContext?.title || ""}
投稿文: ${textContext?.content || ""}
既存ハッシュタグ: ${textContext?.hashtags || ""}

分析数値:
${metricsText || "(未入力)"}

以下を日本語で提案してください。JSONのみ返してください。
{
  "summary": "総評(1-2文)",
  "suggestedCaption": "画像に合う改善投稿文案(80-220文字)",
  "suggestedHashtags": ["ハッシュタグ1", "ハッシュタグ2", "ハッシュタグ3", "ハッシュタグ4", "ハッシュタグ5"]
}

条件:
- 画像の視認性・構図・文字量・色・訴求軸を見て分析
- 投稿タイプ(${postType})に合わせる
- ハッシュタグは重複を避け、先頭の#は付けない
- 必ず有効なJSONのみ
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content:
            "あなたはSNS画像分析の専門家です。出力はJSONのみ。推測で断定せず実務的に提案してください。",
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: imageData,
              },
            },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("AI応答が空です");
    }

    const parsed = JSON.parse(raw);

    return NextResponse.json({
      success: true,
      data: {
        summary: parsed.summary || "",
        suggestedCaption: parsed.suggestedCaption || "",
        suggestedHashtags: Array.isArray(parsed.suggestedHashtags) ? parsed.suggestedHashtags : [],
      },
    });
  } catch (error) {
    console.error("画像分析APIエラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(
      {
        ...body,
        error: error instanceof Error ? error.message : "画像分析に失敗しました",
      },
      { status }
    );
  }
}
