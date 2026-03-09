import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import { requireAuthContext } from "../../../../lib/server/auth-context";
import { assertFeatureEnabled } from "@/lib/server/feature-guard";

type CommentReplyBody = {
  comment: string;
  tone?: "friendly" | "polite" | "energetic" | "professional" | string;
  postContext?: {
    postTitle?: string | null;
    postContent?: string | null;
    postType?: "feed" | "reel" | "story" | string | null;
    hashtags?: string[] | null;
  };
};

type CommentReplySuggestion = {
  reply: string;
  keyPoints?: string[];
  toneUsed?: string;
};

type CommentReplyResponse = {
  suggestions: CommentReplySuggestion[];
  guidance?: string;
};

const createFallbackReply = (body: CommentReplyBody): CommentReplyResponse => {
  const { comment, tone = "friendly", postContext } = body;
  const snippet = comment.length > 60 ? `${comment.slice(0, 57)}...` : comment;
  const toneLabel =
    tone === "polite"
      ? "丁寧"
      : tone === "energetic"
        ? "元気"
        : tone === "professional"
          ? "誠実"
          : "親しみやすい";

  const baseReply =
    `コメントありがとうございます！` +
    `いただいた内容「${snippet}」を踏まえて、` +
    (postContext?.postTitle ? `「${postContext.postTitle}」の投稿について ` : "") +
    `丁寧にお返事しますね。`;

  return {
    suggestions: [
      {
        reply:
          tone === "polite"
            ? `${baseReply}\n詳細を共有いただき、とても励みになります。これからも役立つ情報をお届けできるよう努めますので、引き続きよろしくお願いいたします。`
            : tone === "energetic"
              ? `${baseReply}\n嬉しいお言葉ありがとうございます✨ これからもワクワクする投稿を増やしていきますので、ぜひお楽しみに！`
              : tone === "professional"
                ? `${baseReply}\nご指摘いただいた点について社内でも共有し、今後の改善に活かしてまいります。ほかにも気になる点がありましたら、お気軽にお知らせください。`
                : `${baseReply}\nうれしいご感想をいただき、本当にありがとうございます😊 これからも皆さんに喜んでいただける投稿を目指して頑張ります！`,
        keyPoints: [
          "コメントへの感謝",
          postContext?.postTitle ? `対象投稿「${postContext.postTitle}」に言及` : "投稿内容への言及",
          "今後も継続する姿勢を表明",
        ],
        toneUsed: toneLabel,
      },
      {
        reply:
          tone === "polite"
            ? `心温まるコメントを賜り、誠にありがとうございます。今回の投稿が少しでもお役に立てたのであれば光栄です。今後も皆さまのお声を大切にしながら運用してまいります。`
            : tone === "energetic"
              ? `わぁー！とっても嬉しいリアクションありがとうございます！🔥 これからも「いいね！」したくなる内容をどんどん発信していきますね！`
              : tone === "professional"
                ? `貴重なフィードバックをありがとうございます。今後の発信では、今回いただいた視点を踏まえつつ、より実践的な情報をお届けできるよう改善してまいります。`
                : `素敵なコメントありがとうございます！皆さんの声が次の投稿づくりのヒントになっています。もしリクエストがあればぜひ教えてくださいね😊`,
        toneUsed: toneLabel,
      },
    ],
    guidance:
      "AIキーが未設定の環境なので、汎用的な返信サンプルを表示しています。実際の返信時には、コメント内容に合わせて調整するのがおすすめです。",
  };
};

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function POST(request: NextRequest) {
  let requestBody: CommentReplyBody | null = null;

  try {
    await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "ai-comment-reply", limit: 20, windowSeconds: 60 },
      auditEventName: "ai_comment_reply",
    });
    await assertFeatureEnabled("ai.generate");

    requestBody = (await request.json()) as CommentReplyBody;
    const body = requestBody;
    const comment = body?.comment?.trim();

    if (!comment) {
      return NextResponse.json(
        { success: false, error: "コメント内容は必須です。" },
        { status: 400 },
      );
    }

    if (!openaiClient) {
      return NextResponse.json(
        { success: true, ...createFallbackReply(body) },
        { status: 200 },
      );
    }

    const tone = body.tone ?? "friendly";
    const postContext = body.postContext ?? {};

    const promptUserPayload = {
      comment,
      tone,
      postContext: {
        postTitle: postContext.postTitle ?? "",
        postContent: postContext.postContent ?? "",
        postType: postContext.postType ?? "feed",
        hashtags: Array.isArray(postContext.hashtags) ? postContext.hashtags.slice(0, 10) : [],
      },
    };

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "あなたはInstagram運用を支援するカスタマーサポートAIです。コメントをくれたユーザーへの返信案を日本語で考えます。ユーザーの感情を汲み取りつつ、ブランドらしさを保ち、句読点や絵文字の使い方にも配慮してください。出力は必ずJSON形式で返してください。",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "generate_reply_suggestions",
            input: promptUserPayload,
            outputFormat: {
              suggestions: [
                {
                  reply: "string - 実際に送れる返信案。",
                  keyPoints:
                    "string[] - 返信のポイントや意図を説明する短いメモ。省略可。",
                  toneUsed: "string - 採用したトーンの説明。省略可。",
                },
              ],
              guidance: "string - 返信時の注意点や追加アドバイス。省略可。",
            },
            instructions: [
              "最大3件の返信案を生成してください。",
              "元のコメントの感情や意図を要約して、返信で触れてください。",
              "具体的な投稿タイトルやハッシュタグがある場合は自然な形で活用します。",
              "営業色が強くなりすぎないよう配慮しつつ、次の行動へのポジティブな誘導があれば提案してください。",
            ],
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { success: true, ...createFallbackReply(body) },
        { status: 200 },
      );
    }

    let parsed: CommentReplyResponse | null = null;
    try {
      parsed = JSON.parse(content) as CommentReplyResponse;
    } catch (error) {
      console.error("AI comment reply JSON parse error:", error, "raw:", content);
    }

    if (!parsed?.suggestions?.length) {
      return NextResponse.json(
        { success: true, ...createFallbackReply(body) },
        { status: 200 },
      );
    }

    return NextResponse.json({ success: true, ...parsed }, { status: 200 });
  } catch (error) {
    console.error("AI comment reply error:", error);

    const normalizedMessage =
      error instanceof Error ? error.message : "コメント返信の生成に失敗しました。";
    const status = typeof error === "object" && error && "status" in error ? (error as { status?: number }).status : undefined;

    if (status === 401 || /incorrect api key/i.test(normalizedMessage)) {
      return NextResponse.json(
        {
          success: true,
          ...createFallbackReply(requestBody ?? { comment: "", tone: "friendly" }),
          guidance:
            "OpenAI APIキーが無効のため、汎用的な返信サンプルを表示しています。管理者にキーの設定をご確認ください。",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: normalizedMessage || "コメント返信の生成に失敗しました。時間をおいて再度お試しください。",
      },
      { status: 500 },
    );
  }
}
