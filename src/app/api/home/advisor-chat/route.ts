import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuthContext } from "@/lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";

interface AdvisorChatRequest {
  message?: unknown;
  context?: {
    selectedProductId?: unknown;
    selectedProductName?: unknown;
    postType?: unknown;
    draftTitle?: unknown;
    draftContent?: unknown;
    imageAttached?: unknown;
  };
}

interface ImageIdea {
  title: string;
  concept: string;
  composition: string;
  overlayText: string;
  prompt: string;
  hook: string;
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const normalizeText = (value: unknown): string => String(value || "").trim();

const normalizeForMatch = (value: string): string =>
  String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[‐‑‒–—―ー]/g, "-")
    .replace(/[-_ ]?\d+\s*(g|kg|ml|l|個|本|枚)$/i, "")
    .trim();

const extractProductNames = (businessInfo: unknown): string[] => {
  if (!businessInfo || typeof businessInfo !== "object") {return [];}
  const raw = (businessInfo as { productsOrServices?: unknown }).productsOrServices;
  if (!Array.isArray(raw)) {return [];}
  return raw
    .map((item) => normalizeText((item as { name?: unknown })?.name))
    .filter(Boolean)
    .slice(0, 10);
};

const includesAny = (text: string, tokens: string[]): boolean => {
  const normalized = text.toLowerCase();
  return tokens.some((token) => normalized.includes(token.toLowerCase()));
};

const inferProductFromMessage = (message: string, productNames: string[]): string => {
  const normalizedMessage = normalizeForMatch(message);
  const matched = productNames.find((name) => {
    const rawName = normalizeText(name);
    const normalizedRawName = normalizeForMatch(rawName);
    if (!normalizedRawName) {return false;}
    if (normalizedMessage.includes(normalizedRawName)) {return true;}

    const baseName = normalizeForMatch(rawName.replace(/[-_ ]?\d+\s*(g|kg|ml|l|個|本|枚)$/i, ""));
    return baseName.length >= 2 && normalizedMessage.includes(baseName);
  });
  return matched ? normalizeText(matched) : "";
};

const buildImageIdeasForProduct = (productName: string, postType: string): ImageIdea[] => {
  const normalizedProduct = normalizeText(productName) || "商品";
  const typeLabel = postType === "reel" ? "リール" : postType === "story" ? "ストーリーズ" : "フィード";

  return [
    {
      title: `${typeLabel}案1: 王道商品訴求`,
      concept: `${normalizedProduct}の魅力を正面から伝える定番案`,
      composition: "商品を中央に配置、背景は単色で高級感を出す",
      overlayText: `${normalizedProduct}で始める、今日の一杯`,
      prompt: `${normalizedProduct}のパッケージを中央配置。背景は無地でミニマル。柔らかい自然光。高級感のあるコーヒー商品写真。日本のカフェの雰囲気。正方形構図。高精細。`,
      hook: `「${normalizedProduct}、最初の一口で印象が変わる。」`,
    },
    {
      title: `${typeLabel}案2: 利用シーン訴求`,
      concept: "生活シーンに溶け込む使い方を見せる案",
      composition: "机上にカップと商品を配置、朝の自然光で撮影",
      overlayText: "忙しい朝でも、満足感のある一杯を",
      prompt: `${normalizedProduct}とコーヒーカップを木の机の上に配置。朝の窓光。生活感のある商品写真。暖色トーン。質感はリアル。SNS投稿向け。`,
      hook: "「この一杯が、朝の集中を変える。」",
    },
    {
      title: `${typeLabel}案3: 比較・選び方訴求`,
      concept: "選ぶ理由を直感的に伝える比較案",
      composition: "商品と関連アイテムを左右配置、余白に比較ポイント",
      overlayText: `${normalizedProduct}が選ばれる3つの理由`,
      prompt: `${normalizedProduct}とコーヒー豆、抽出器具を左右に並べる。比較しやすいクリーンなレイアウト。明るいスタジオ光。余白を活かした日本的ミニマルデザイン。広告ビジュアル。`,
      hook: `「迷ったら、まず${normalizedProduct}から。」`,
    },
  ];
};

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "home-advisor-chat", limit: 40, windowSeconds: 60 },
      auditEventName: "home_advisor_chat",
    });

    const body = (await request.json()) as AdvisorChatRequest;
    const message = normalizeText(body?.message);
    if (!message) {
      return NextResponse.json({ success: false, error: "message is required" }, { status: 400 });
    }

    const userProfile = await getUserProfile(uid);
    const productNames = extractProductNames(userProfile?.businessInfo);
    const selectedProductName = normalizeText(body?.context?.selectedProductName);
    const inferredProductName = inferProductFromMessage(message, productNames);
    const resolvedProductName = selectedProductName || inferredProductName;
    const postType = normalizeText(body?.context?.postType) || "feed";
    const draftTitle = normalizeText(body?.context?.draftTitle);
    const draftContent = normalizeText(body?.context?.draftContent);
    const imageAttached = Boolean(body?.context?.imageAttached);

    const imageConsult = includesAny(message, ["画像", "写真", "素材", "ビジュアル", "サムネ"]);
    const copyConsult = includesAny(message, ["投稿文", "キャプション", "本文", "タイトル", "文面"]);

    if (imageConsult && productNames.length > 1 && !resolvedProductName) {
      return NextResponse.json({
        success: true,
        data: {
          reply: `どの商品についての画像を作りたいですか？\n候補: ${productNames.slice(0, 5).join(" / ")}`,
          suggestedQuestions: productNames.slice(0, 3).map((name) => `${name}の画像案を3つください`),
        },
      });
    }

    if (imageConsult && resolvedProductName) {
      const ideas = buildImageIdeasForProduct(resolvedProductName, postType);
      const reply = [
        `${resolvedProductName}向けの画像案を3つ提案します。`,
        ...ideas.flatMap((idea, index) => [
          ``,
          `${index + 1}. ${idea.title}`,
          `コンセプト: ${idea.concept}`,
          `構図: ${idea.composition}`,
          `画像内テキスト案: ${idea.overlayText}`,
          `画像生成プロンプト: ${idea.prompt}`,
          `冒頭フック案: ${idea.hook}`,
        ]),
        "",
        "この案をAI生成に反映しますか？",
      ].join("\n");

      return NextResponse.json({
        success: true,
        data: {
          reply,
          suggestedQuestions: [
            "1案目でAI生成に反映したい",
            "2案目でAI生成に反映したい",
            "別トーンでもう3案ください",
          ],
        },
      });
    }

    if (copyConsult && !draftTitle && !draftContent) {
      return NextResponse.json({
        success: true,
        data: {
          reply: "この投稿文について、どこを直したいですか？（冒頭フック / 長さ / CTA / トーン）",
          suggestedQuestions: [
            "冒頭フックを強くしたい",
            "CTAをもう少し自然にしたい",
            "短く読みやすくしたい",
          ],
        },
      });
    }

    if (!openai) {
      return NextResponse.json({
        success: true,
        data: {
          reply: "投稿目的・商品・投稿タイプを教えていただければ、具体案を作成します。",
          suggestedQuestions: [
            "どの画像を作ればいい？",
            "この投稿文の改善点は？",
          ],
        },
      });
    }

    const systemPrompt = [
      "あなたはInstagram運用の実務コーチです。",
      "回答は日本語で2-5文、具体的・実行可能にしてください。",
      "必要なら質問は1つだけ返してください。",
      "画像相談では、構図/被写体/テキストの方向性まで提案してください。",
      "投稿文相談では、冒頭フック・価値訴求・CTAの観点で改善提案してください。",
      "専門用語の説明は不要。すぐ実行できる回答を返してください。",
    ].join("\n");

    const userPrompt = [
      `ユーザー質問: ${message}`,
      `投稿タイプ: ${postType}`,
      `選択中の商品: ${resolvedProductName || "未選択"}`,
      `商品候補: ${productNames.join(" / ") || "なし"}`,
      `画像添付: ${imageAttached ? "あり" : "なし"}`,
      draftTitle ? `下書きタイトル: ${draftTitle}` : "",
      draftContent ? `下書き本文: ${draftContent.slice(0, 800)}` : "",
      "出力はJSON: {\"reply\": string, \"suggestedQuestions\": string[]}",
    ]
      .filter(Boolean)
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const text = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(text) as { reply?: unknown; suggestedQuestions?: unknown };
    const reply = normalizeText(parsed.reply);
    const suggestedQuestions = Array.isArray(parsed.suggestedQuestions)
      ? parsed.suggestedQuestions.map((q) => normalizeText(q)).filter(Boolean).slice(0, 3)
      : [];

    return NextResponse.json({
      success: true,
      data: {
        reply: reply || "投稿目的に合わせて、具体案を3つに分けて提案できます。何を優先しますか？",
        suggestedQuestions,
      },
    });
  } catch (error) {
    console.error("home advisor chat error:", error);
    return NextResponse.json({ success: false, error: "チャット応答の生成に失敗しました" }, { status: 500 });
  }
}
