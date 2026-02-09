import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import { buildAIContext, fetchAIDirection } from "@/lib/ai/context";

export const dynamic = 'force-dynamic';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

interface VisualSuggestionsRequest {
  content: string;
  hashtags: string[];
  postType: "feed" | "reel" | "story";
  scheduledDate?: string;
  scheduledTime?: string;
}

interface VisualSuggestionsResponse {
  atmosphere: string;
  composition: string;
  colorScheme: string;
  textOverlay?: string;
  avoidElements?: string[];
  videoStructure?: {
    opening: string;
    development: string;
    twist: string;
    conclusion: string;
  };
  storyStructure?: {
    slides: Array<{ order: number; content: string }>;
  };
  rationale?: string;
  basedOnLearning?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "ai-visual-suggestions", limit: 30, windowSeconds: 60 },
      auditEventName: "ai_visual_suggestions",
    });

    const body: VisualSuggestionsRequest = await request.json();
    const { content, hashtags, postType, scheduledDate, scheduledTime } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "投稿文は必須です。" },
        { status: 400 }
      );
    }

    if (!openai) {
      return NextResponse.json(
        { error: "AI機能が利用できません。" },
        { status: 500 }
      );
    }

    // ユーザー情報とコンテキストを取得
    let userProfile: Awaited<ReturnType<typeof buildAIContext>>["userProfile"] = null;
    let learningData = "";
    let businessInfo = "";

    try {
      const contextResult = await buildAIContext(userId, {
        snapshotLimit: 3,
        includeMasterContext: true,
      });
      userProfile = contextResult.userProfile;

      // 過去の成功パターンから学習データを構築
      if (contextResult.snapshotReferences && contextResult.snapshotReferences.length > 0) {
        const successfulPosts = contextResult.snapshotReferences
          .filter((snapshot) => snapshot.status === "gold")
          .slice(0, 3);

        if (successfulPosts.length > 0) {
          learningData = `【過去の成功パターン】
以下の投稿で効果的だった画像・動画の特徴：
${successfulPosts
  .map(
    (post, index) =>
      `${index + 1}. ${post.summary || "投稿内容"} - エンゲージメント率: ${post.score || "高"}`
  )
  .join("\n")}`;
        }
      }

      // ビジネス情報を構築
      if (userProfile?.businessInfo) {
        const biz = userProfile.businessInfo;
        businessInfo = `【ビジネス情報】
- 業種: ${biz.industry || "未設定"}
- ターゲット市場: ${Array.isArray(biz.targetMarket) ? biz.targetMarket.join(", ") : "未設定"}
- 事業内容: ${biz.description || "未設定"}`;
      }
    } catch (contextError) {
      console.error("コンテキスト構築エラー:", contextError);
      // コンテキストが取得できなくても続行
    }

    // ai_direction（今月のAI方針）を取得
    const aiDirection = await fetchAIDirection(userId);

    // 投稿タイプに応じた構造を決定
    const structureField =
      postType === "reel"
        ? `"videoStructure": {
    "opening": "オープニング（0-3秒）の推奨内容",
    "development": "展開（3-10秒）の推奨内容",
    "twist": "転換（10-15秒）の推奨内容",
    "conclusion": "クロージング（15-30秒）の推奨内容"
  },`
        : postType === "story"
          ? `"storyStructure": {
    "slides": [
      {"order": 1, "content": "1枚目の推奨内容"},
      {"order": 2, "content": "2枚目の推奨内容"}
    ]
  },`
          : "";

    // プロンプトを構築
    const prompt = `あなたはInstagram運用のビジュアルアドバイザーです。
以下の情報から、最適な画像・動画の推奨事項を提案してください。

【投稿情報】
- 投稿文: ${content}
- ハッシュタグ: ${hashtags.join(", ") || "なし"}
- 投稿タイプ: ${postType}
${scheduledDate ? `- 投稿予定日: ${scheduledDate}` : ""}
${scheduledTime ? `- 投稿予定時刻: ${scheduledTime}` : ""}

${businessInfo}

${learningData ? `${learningData}\n` : ""}${aiDirection && aiDirection.lockedAt
        ? `【今月のAI方針】
- メインテーマ: ${aiDirection.mainTheme}
- 優先KPI: ${aiDirection.priorityKPI}
- 避けるべき焦点: ${aiDirection.avoidFocus.join(", ")}
- 投稿ルール: ${aiDirection.postingRules.join(", ")}

`
        : ""}【出力形式】
以下のJSON形式で出力してください。必ず有効なJSONのみを返してください：
{
  "atmosphere": "推奨される雰囲気（1-2文で具体的に）",
  "composition": "推奨される構図（1-2文で具体的に）",
  "colorScheme": "推奨される色合い（1-2文で具体的に。具体的な色名やカラーコードは記載しない）",
  ${postType === "feed" ? `"textOverlay": "テキストオーバーレイの推奨（任意）",` : ""}
  "avoidElements": ["避けるべき要素1", "避けるべき要素2"],
  ${structureField}
  "rationale": "推奨理由（1-2文）",
  "basedOnLearning": ${learningData ? "true" : "false"}
}

**重要**: 
- 実際の画像や動画を分析できないため、投稿文とハッシュタグから推測して提案してください
- 具体的で実用的なアドバイスを提供してください
- JSONのみを返し、説明文は含めないでください`;

    // OpenAI APIを呼び出し
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "あなたはInstagram運用のビジュアルアドバイザーです。投稿文とハッシュタグから推測して、最適な画像・動画の推奨事項を提案してください。出力は必ず有効なJSONのみです。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error("AIからの応答がありません");
    }

    // JSONをパース
    let suggestions: VisualSuggestionsResponse;
    try {
      suggestions = JSON.parse(aiResponse) as VisualSuggestionsResponse;
    } catch (parseError) {
      console.error("JSONパースエラー:", parseError);
      // フォールバック: 基本的な推奨事項を返す
      suggestions = {
        atmosphere: "投稿文のトーンに合わせた明るく親しみやすい雰囲気",
        composition: "投稿内容を視覚的に表現できる構図",
        colorScheme: "ブランドカラー（#FF8A15）を取り入れた統一感のある色合い",
        avoidElements: ["暗い雰囲気", "文字が多すぎる画像"],
        rationale: "投稿文とハッシュタグから推測した推奨事項です",
        basedOnLearning: false,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        suggestions,
      },
    });
  } catch (error) {
    console.error("ビジュアル推奨事項生成エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(
      {
        ...body,
        error: error instanceof Error ? error.message : "不明なエラーが発生しました",
      },
      { status }
    );
  }
}

