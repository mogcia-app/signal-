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
    generatedTitle?: unknown;
    generatedContent?: unknown;
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
      prompt: `${normalizedProduct}のパッケージを中央配置。背景は無地でミニマル。柔らかい自然光。高級感のある商品写真。日本のカフェの雰囲気。正方形構図。高精細。`,
      hook: `「${normalizedProduct}、最初の一口で印象が変わる。」`,
    },
    {
      title: `${typeLabel}案2: 利用シーン訴求`,
      concept: "生活シーンに溶け込む使い方を見せる案",
      composition: "机上に商品を配置、朝の自然光で撮影",
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

const buildCompositionAdvice = (params: {
  productName: string;
  postType: string;
  postTitle: string;
}): string => {
  const product = params.productName || "商品";
  const typeLabel = params.postType === "reel" ? "リール" : params.postType === "story" ? "ストーリーズ" : "フィード";
  const titleSnippet = params.postTitle ? `「${params.postTitle.slice(0, 20)}」` : `「${product}の魅力」`;

  const lines = [
    `${typeLabel}の1枚目、推奨構図を提案します。`,
    ``,
    `◎ 被写体配置: ${product}を画面中央〜やや左に置き、右1/3に余白を確保`,
    `◎ アングル: 正面〜30°斜め俯瞰（商品の形が伝わる角度）`,
    `◎ 背景: 白・ベージュ・グレーの単色、または自然光が差し込む木目テーブル`,
    `◎ テキスト位置: ${titleSnippet}を右上または左下に白抜き文字で配置`,
    ``,
    `NGパターン:`,
    `・被写体が小さすぎて何の商品かわからない`,
    `・背景が雑然として商品が埋もれる`,
    `・テキストが小さすぎてサムネで読めない`,
  ];

  return lines.join("\n");
};

const buildTextOverlayAdvice = (params: {
  productName: string;
  postType: string;
  postTitle: string;
}): string => {
  const product = params.productName || "商品";
  const typeLabel = params.postType === "reel" ? "リール" : params.postType === "story" ? "ストーリーズ" : "フィード";
  const baseText = params.postTitle ? params.postTitle.slice(0, 20) : `${product}の魅力`;

  const lines = [
    `${typeLabel}の1枚目に入れるテキスト案です。`,
    ``,
    `案1（フック型）  ▶ ${baseText}`,
    `案2（問いかけ型）▶ ${product}、選ぶなら？`,
    `案3（数字型）   ▶ 3つの理由で${product}を選ぶ`,
    ``,
    `推奨スタイル:`,
    `・文字数: 10〜20文字以内`,
    `・フォント: 太め（Noto Sans Black等）`,
    `・色: 白または黒で背景とコントラストを確保`,
    `・位置: 上部1/3 または 下部1/3（中央は商品に空ける）`,
  ];

  return lines.join("\n");
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
    const generatedTitle = normalizeText(body?.context?.generatedTitle);
    const generatedContent = normalizeText(body?.context?.generatedContent);
    const imageAttached = Boolean(body?.context?.imageAttached);

    // 実際に使うタイトル・本文（下書き優先、なければ生成済み候補を使用）
    const activeTitle = draftTitle || generatedTitle;
    const activeContent = draftContent || generatedContent;

    const imageConsult = includesAny(message, ["画像", "写真", "素材", "ビジュアル", "サムネ", "どんな画像"]);
    const compositionConsult = includesAny(message, ["構図", "アングル", "フレーミング", "1枚目の構図"]);
    const textOverlayConsult = includesAny(message, ["テキスト入れるなら", "テキスト入れ", "文字入れ", "オーバーレイ", "テキストは"]);

    // 構図相談
    if (compositionConsult) {
      const reply = buildCompositionAdvice({
        productName: resolvedProductName,
        postType,
        postTitle: activeTitle,
      });
      return NextResponse.json({
        success: true,
        data: {
          reply,
          suggestedQuestions: [
            "どんな画像が合う？",
            "テキスト入れるなら何？",
          ],
        },
      });
    }

    // テキストオーバーレイ相談
    if (textOverlayConsult) {
      const reply = buildTextOverlayAdvice({
        productName: resolvedProductName,
        postType,
        postTitle: activeTitle,
      });
      return NextResponse.json({
        success: true,
        data: {
          reply,
          suggestedQuestions: [
            "どんな画像が合う？",
            "1枚目の構図は？",
          ],
        },
      });
    }

    // 画像相談（商品が複数あり未選択の場合）
    if (imageConsult && productNames.length > 1 && !resolvedProductName) {
      return NextResponse.json({
        success: true,
        data: {
          reply: `どの商品についての画像を作りたいですか？\n候補: ${productNames.slice(0, 5).join(" / ")}`,
          suggestedQuestions: productNames.slice(0, 3).map((name) => `${name}の画像案を3つください`),
        },
      });
    }

    // 画像相談（商品確定済み）
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

    if (!openai) {
      return NextResponse.json({
        success: true,
        data: {
          reply: "商品・投稿タイプを教えていただければ、具体案を作成します。",
          suggestedQuestions: [
            "どんな画像が合う？",
            "1枚目の構図は？",
            "テキスト入れるなら何？",
          ],
        },
      });
    }

    const systemPrompt = [
      "あなたはInstagram運用の実務コーチです。",
      "回答は日本語で2-5文、具体的・実行可能にしてください。",
      "必要なら質問は1つだけ返してください。",
      "画像相談では、構図/被写体/テキストの方向性まで提案してください。",
      "専門用語の説明は不要。すぐ実行できる回答を返してください。",
    ].join("\n");

    const userPrompt = [
      `ユーザー質問: ${message}`,
      `投稿タイプ: ${postType}`,
      `選択中の商品: ${resolvedProductName || "未選択"}`,
      `商品候補: ${productNames.join(" / ") || "なし"}`,
      `画像添付: ${imageAttached ? "あり" : "なし"}`,
      activeTitle ? `投稿タイトル: ${activeTitle}` : "",
      activeContent ? `投稿本文: ${activeContent.slice(0, 800)}` : "",
      "出力はJSON: {\"reply\": string, \"suggestedQuestions\": string[]}",
    ]
      .filter(Boolean)
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
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
        reply: reply || "投稿に合わせた具体案を提案できます。何を優先しますか？",
        suggestedQuestions,
      },
    });
  } catch (error) {
    console.error("home advisor chat error:", error);
    return NextResponse.json({ success: false, error: "チャット応答の生成に失敗しました" }, { status: 500 });
  }
}
