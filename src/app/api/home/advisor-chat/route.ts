import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import * as admin from "firebase-admin";
import { requireAuthContext } from "@/lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { adminDb } from "@/lib/firebase-admin";
import { getInstagramAlgorithmBrief } from "@/lib/ai/instagram-algorithm-brief";
import { getMonthlyActionFocus } from "@/lib/ai/monthly-action-focus";
import { logImplicitAiAction } from "@/lib/ai/implicit-action-log";
import { AiUsageLimitError, assertAiOutputAvailable, consumeAiOutput } from "@/lib/server/ai-usage-limit";

interface AdvisorChatRequest {
  message?: unknown;
  context?: {
    selectedProductId?: unknown;
    selectedProductName?: unknown;
    advisorProductId?: unknown;
    advisorProductName?: unknown;
    postType?: unknown;
    draftTitle?: unknown;
    draftContent?: unknown;
    imageAttached?: unknown;
    advisorIntent?: unknown;
    advisorSource?: unknown;
    advisorPostType?: unknown;
    selectedAdvisorProductId?: unknown;
    advisorProductConfigured?: unknown;
  };
}

interface ImageIdea {
  title: string;
  direction: string;
  composition: string;
  tone: string;
  overlayText: string;
}

interface StoredAdvisorMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  createdAtMs: number;
}

interface AdvisorFlowState {
  advisorIntent: string;
  advisorSource: string;
  advisorPostType: string;
  selectedAdvisorProductId: string;
  advisorProductConfigured: boolean;
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
const ADVISOR_SESSION_COLLECTION = "home_advisor_sessions";
const ADVISOR_SESSION_TTL_HOURS = 24;
const ADVISOR_SESSION_MAX_MESSAGES = 40;

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

const inferProductFromTextWithConfidence = (
  text: string,
  productNames: string[]
): { name: string; confidence: number; secondConfidence: number } => {
  const normalizedText = normalizeForMatch(text);
  if (!normalizedText || productNames.length === 0) {
    return { name: "", confidence: 0, secondConfidence: 0 };
  }

  const scored = productNames
    .map((rawName) => {
      const name = normalizeText(rawName);
      const normalizedName = normalizeForMatch(name);
      const baseName = normalizeForMatch(name.replace(/[-_ ]?\d+\s*(g|kg|ml|l|個|本|枚)$/i, ""));
      if (!normalizedName) {
        return { name, score: 0 };
      }
      if (normalizedText.includes(normalizedName)) {
        return { name, score: 1 };
      }
      if (baseName.length >= 3 && normalizedText.includes(baseName)) {
        return { name, score: 0.92 };
      }

      const tokens = name
        .split(/[\s\-_/]+/)
        .map((token) => normalizeForMatch(token))
        .filter((token) => token.length >= 2);
      if (tokens.length === 0) {
        return { name, score: 0 };
      }
      const matchedCount = tokens.filter((token) => normalizedText.includes(token)).length;
      const score = matchedCount / tokens.length;
      return { name, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const second = scored[1];
  return {
    name: best?.name || "",
    confidence: best?.score || 0,
    secondConfidence: second?.score || 0,
  };
};

const formatImageIdeasReply = (productName: string, ideas: ImageIdea[]): string =>
  [
    `${productName}向けの画像案を1つ提案します。`,
    ...ideas.flatMap((idea, index) => [
      ``,
      `${index + 1}. ${idea.title}`,
      `画像の方向性: ${idea.direction}`,
      `構図: ${idea.composition}`,
      `色味・雰囲気: ${idea.tone}`,
      `画像内テキスト案: ${idea.overlayText}`,
    ]),
  ].join("\n");

const normalizeSuggestedQuestions = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => normalizeText(item)).filter(Boolean).slice(0, 8)
    : [];

const normalizeFlowState = (context: AdvisorChatRequest["context"]): AdvisorFlowState => ({
  advisorIntent: normalizeText(context?.advisorIntent),
  advisorSource: normalizeText(context?.advisorSource),
  advisorPostType: normalizeText(context?.advisorPostType),
  selectedAdvisorProductId:
    normalizeText(context?.selectedAdvisorProductId) || normalizeText(context?.advisorProductId),
  advisorProductConfigured: Boolean(context?.advisorProductConfigured),
});

const normalizeStoredMessages = (value: unknown): StoredAdvisorMessage[] =>
  Array.isArray(value)
    ? value
        .map((item) => {
          const row = item as Partial<StoredAdvisorMessage>;
          const role = row.role === "assistant" ? "assistant" : row.role === "user" ? "user" : null;
          const text = normalizeText(row.text);
          const createdAtMs = Number(row.createdAtMs || 0);
          if (!role || !text || !Number.isFinite(createdAtMs) || createdAtMs <= 0) {
            return null;
          }
          return {
            id: normalizeText(row.id) || `${role}-${createdAtMs}`,
            role,
            text,
            createdAtMs,
          };
        })
        .filter((item): item is StoredAdvisorMessage => Boolean(item))
        .slice(-ADVISOR_SESSION_MAX_MESSAGES)
    : [];

const extractImageSubjectFromReply = (text: string): string => {
  const normalized = normalizeText(text);
  const match = normalized.match(/^(.+?)向けの画像案を1つ提案します。/);
  return match ? normalizeText(match[1]) : "";
};

const saveAdvisorSession = async (params: {
  uid: string;
  userMessage: string;
  assistantReply: string;
  suggestedQuestions: string[];
  flowState: AdvisorFlowState;
}) => {
  const { uid, userMessage, assistantReply, suggestedQuestions, flowState } = params;
  const docRef = adminDb.collection(ADVISOR_SESSION_COLLECTION).doc(uid);
  const nowMs = Date.now();
  const expiresAtMs = nowMs + ADVISOR_SESSION_TTL_HOURS * 60 * 60 * 1000;

  const existing = await docRef.get();
  const existingMessages = normalizeStoredMessages(existing.data()?.messages);
  const nextMessages = [
    ...existingMessages,
    {
      id: `user-${nowMs}`,
      role: "user" as const,
      text: userMessage,
      createdAtMs: nowMs,
    },
    {
      id: `assistant-${nowMs + 1}`,
      role: "assistant" as const,
      text: assistantReply,
      createdAtMs: nowMs + 1,
    },
  ].slice(-ADVISOR_SESSION_MAX_MESSAGES);

  await docRef.set(
    {
      uid,
      messages: nextMessages,
      suggestedQuestions: suggestedQuestions.slice(0, 8),
      flowState,
      expiresAt: admin.firestore.Timestamp.fromMillis(expiresAtMs),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: existing.exists
        ? existing.data()?.createdAt || admin.firestore.FieldValue.serverTimestamp()
        : admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
};

const buildBusinessInfoPrompt = (userProfile: unknown): string => {
  const businessInfo = (userProfile as { businessInfo?: Record<string, unknown> } | null)?.businessInfo;
  if (!businessInfo || typeof businessInfo !== "object") {
    return "事業情報: 未設定";
  }

  const info = businessInfo as Record<string, unknown>;
  const description = normalizeText(info.description);
  const products = Array.isArray(info.productsOrServices)
    ? info.productsOrServices
        .map((item) => {
          const row = item as { name?: unknown; details?: unknown; price?: unknown };
          const name = normalizeText(row.name);
          const details = normalizeText(row.details);
          const price = normalizeText(row.price);
          if (!name) {return "";}
          const extras = [details, price ? `価格: ${price}` : ""].filter(Boolean).join(" / ");
          return extras ? `${name}（${extras}）` : name;
        })
        .filter(Boolean)
        .slice(0, 8)
    : [];

  return [
    `事業内容: ${description || "未設定"}`,
    `商品・サービス: ${products.join(" / ") || "未設定"}`,
  ].join("\n");
};

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "home-advisor-chat-history", limit: 60, windowSeconds: 60 },
      auditEventName: "home_advisor_chat_history",
    });

    const doc = await adminDb.collection(ADVISOR_SESSION_COLLECTION).doc(uid).get();
    if (!doc.exists) {
      return NextResponse.json({ success: true, data: { messages: [], suggestedQuestions: [], flowState: null } });
    }

    const raw = doc.data() as Record<string, unknown>;
    const expiresAtRaw = raw.expiresAt as admin.firestore.Timestamp | undefined;
    const expired = !expiresAtRaw || expiresAtRaw.toMillis() <= Date.now();
    if (expired) {
      await doc.ref.delete().catch(() => undefined);
      return NextResponse.json({ success: true, data: { messages: [], suggestedQuestions: [], flowState: null } });
    }

    const messages = normalizeStoredMessages(raw.messages);
    const suggestedQuestions = normalizeSuggestedQuestions(raw.suggestedQuestions);
    const flowStateRaw = (raw.flowState || {}) as Partial<AdvisorFlowState>;
    const flowState = {
      advisorIntent: normalizeText(flowStateRaw.advisorIntent),
      advisorSource: normalizeText(flowStateRaw.advisorSource),
      advisorPostType: normalizeText(flowStateRaw.advisorPostType),
      selectedAdvisorProductId: normalizeText(flowStateRaw.selectedAdvisorProductId),
      advisorProductConfigured: Boolean(flowStateRaw.advisorProductConfigured),
    };

    return NextResponse.json({
      success: true,
      data: { messages, suggestedQuestions, flowState },
    });
  } catch (error) {
    console.error("home advisor chat history error:", error);
    return NextResponse.json({ success: false, error: "履歴の取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "home-advisor-chat", limit: 40, windowSeconds: 60 },
      auditEventName: "home_advisor_chat",
    });

    const body = (await request.json()) as AdvisorChatRequest;
    const message = normalizeText(body?.message);
    const flowState = normalizeFlowState(body?.context);
    const advisorIntent = normalizeText(body?.context?.advisorIntent) || flowState.advisorIntent;
    const advisorSource = normalizeText(body?.context?.advisorSource) || flowState.advisorSource;
    if (!message) {
      return NextResponse.json({ success: false, error: "message is required" }, { status: 400 });
    }

    const finalize = async (
      reply: string,
      suggestedQuestions: string[],
      options?: { consumeQuota?: boolean; userProfile?: Awaited<ReturnType<typeof getUserProfile>> }
    ) => {
      if (options?.consumeQuota) {
        await consumeAiOutput({
          uid,
          userProfile: options.userProfile,
          feature: "home_advisor_chat",
        });
        await logImplicitAiAction({
          uid,
          feature: "home_advisor_chat",
          title: monthlyActionFocus?.title || "投稿チャットβ",
          action: monthlyActionFocus?.action || message,
          focusMonth: monthlyActionFocus?.month || "",
          metadata: {
            advisorIntent,
            advisorSource,
            suggestedQuestions: suggestedQuestions.slice(0, 2),
          },
        });
      }
      await saveAdvisorSession({
        uid,
        userMessage: message,
        assistantReply: reply,
        suggestedQuestions,
        flowState,
      }).catch((error) => {
        console.error("home advisor chat save error:", error);
      });
      return NextResponse.json({
        success: true,
        data: { reply, suggestedQuestions: suggestedQuestions.slice(0, 8) },
      });
    };

    const userProfile = await getUserProfile(uid);
    const algorithmBrief = await getInstagramAlgorithmBrief();
    const monthlyActionFocus = await getMonthlyActionFocus(uid);
    const monthlyActionFocusPrompt = monthlyActionFocus?.promptText || "";
    const businessInfoPrompt = buildBusinessInfoPrompt(userProfile);
    const productNames = extractProductNames(userProfile?.businessInfo);
    const advisorProductName = normalizeText(body?.context?.advisorProductName);
    const isAnotherToneRequest = /別トーンでもう1案ください/.test(message);
    const sessionDoc = await adminDb.collection(ADVISOR_SESSION_COLLECTION).doc(uid).get();
    const sessionMessages = normalizeStoredMessages(sessionDoc.data()?.messages);
    const previousImageSubject = [...sessionMessages]
      .reverse()
      .map((msg) => (msg.role === "assistant" ? extractImageSubjectFromReply(msg.text) : ""))
      .find(Boolean) || "";
    const postType = normalizeText(body?.context?.postType) || "feed";
    const draftTitle = normalizeText(body?.context?.draftTitle);
    const draftContent = normalizeText(body?.context?.draftContent);
    const sourceText = [message, draftTitle, draftContent].filter(Boolean).join("\n");
    const inferredMatch = inferProductFromTextWithConfidence(sourceText, productNames);
    const inferredProductName = inferredMatch.name || inferProductFromMessage(sourceText, productNames);
    const AUTO_MATCH_THRESHOLD = 0.9;
    const CONFIRM_MATCH_THRESHOLD = 0.55;
    const isHighConfidenceAutoMatch =
      !advisorProductName &&
      inferredProductName &&
      inferredMatch.confidence >= AUTO_MATCH_THRESHOLD &&
      inferredMatch.secondConfidence < inferredMatch.confidence;
    const needsMatchConfirmation =
      !advisorProductName &&
      inferredProductName &&
      inferredMatch.confidence >= CONFIRM_MATCH_THRESHOLD &&
      inferredMatch.confidence < AUTO_MATCH_THRESHOLD &&
      inferredMatch.secondConfidence < inferredMatch.confidence;
    const fallbackProductFromSession =
      isAnotherToneRequest && previousImageSubject !== "投稿文内容" ? previousImageSubject : "";
    const resolvedProductName =
      advisorProductName || (isHighConfidenceAutoMatch ? inferredProductName : "") || fallbackProductFromSession;
    const imageAttached = Boolean(body?.context?.imageAttached);

    const isImageIntent =
      advisorIntent === "image-fit" || advisorIntent === "composition" || advisorIntent === "overlay-text";
    const isVideoIntent = advisorIntent === "video-idea";
    const imageConsult = isImageIntent || includesAny(message, ["画像", "写真", "素材", "ビジュアル", "サムネ"]);
    const videoConsult = isVideoIntent || includesAny(message, ["動画", "リール", "映像", "ショート", "ムービー"]);

    if ((imageConsult || videoConsult) && needsMatchConfirmation) {
      return await finalize(
        `投稿文から「${inferredProductName}」の可能性が高いです。この商品を前提に提案して進めますか？`,
        [`${inferredProductName}で進める`, "他の相談もする"]
      );
    }

    if (imageConsult) {
      let ideas: ImageIdea[] | null = null;
      const imageSubject = resolvedProductName || "投稿文内容";
      if (openai) {
        await assertAiOutputAvailable({
          uid,
          userProfile,
        });
        try {
          const imageSystemPrompt = [
            "あなたはInstagram投稿の画像ディレクターです。",
            "ユーザーの投稿文・質問文・商品名に必ず沿って、テンプレではなく具体案を出してください。",
            "最新Instagram運用参照の内容を優先し、反応設計を前提に提案してください。",
            "今月の注力施策がある場合は、その施策に沿う構図・方向性を優先してください。",
            "必ず1案だけ出してください。",
            "title, direction, composition, tone, overlayText を日本語で埋めてください。",
            "出力はJSONのみ: {\"idea\": ImageIdea}",
          ].join("\n");

          const imageUserPrompt = [
            `【オンボーディング事業情報】\n${businessInfoPrompt}`,
            `【最新Instagram運用参照（固定ファイル）】\n${algorithmBrief}`,
            monthlyActionFocusPrompt ? `【今月の注力施策】\n${monthlyActionFocusPrompt}` : "",
            `商品名: ${resolvedProductName || "未指定（投稿文から推定して提案）"}`,
            `投稿タイプ: ${postType}`,
            `ユーザー質問: ${message}`,
            draftTitle ? `投稿文タイトル: ${draftTitle}` : "",
            draftContent ? `投稿文本文: ${draftContent.slice(0, 1200)}` : "",
            "投稿文の温度感・キーワード・訴求意図を必ず反映してください。",
          ]
            .filter(Boolean)
            .join("\n");

          const imageCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.9,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: imageSystemPrompt },
              { role: "user", content: imageUserPrompt },
            ],
          });

          const imageText = imageCompletion.choices[0]?.message?.content || "{}";
          const parsedImage = JSON.parse(imageText) as { idea?: unknown };
          const parsedIdea = parsedImage?.idea as Partial<ImageIdea> | undefined;
          const idea = parsedIdea
            ? {
                title: normalizeText(parsedIdea.title),
                direction: normalizeText(parsedIdea.direction),
                composition: normalizeText(parsedIdea.composition),
                tone: normalizeText(parsedIdea.tone),
                overlayText: normalizeText(parsedIdea.overlayText),
              }
            : null;
          if (idea && idea.title && idea.direction && idea.composition && idea.tone && idea.overlayText) {
            ideas = [idea];
          }
        } catch (error) {
          console.warn("dynamic image ideas failed:", error);
        }
      }

      if (ideas) {
        const reply = formatImageIdeasReply(imageSubject, ideas);

        return await finalize(reply, [
          "別トーンでもう1案ください",
          "他の相談もする",
        ], { consumeQuota: true, userProfile });
      }

      return await finalize(
        "画像案の生成に失敗しました。投稿文か条件を少し具体化して再送してください。",
        ["投稿文を短く貼り直す", "商品の強みを1つ追加する", "投稿タイプを指定する"]
      );
    }

    if (!openai) {
      return await finalize(
        "投稿目的・商品・投稿タイプを教えていただければ、具体案を作成します。",
        ["どの画像を作ればいい？", "この投稿文の改善点は？"]
      );
    }

    await assertAiOutputAvailable({
      uid,
      userProfile,
    });

    const systemPrompt = [
      "あなたはInstagram運用の実務コーチです。",
      "回答は日本語で2-5文、具体的・実行可能にしてください。",
      "最新Instagram運用参照の内容を優先し、抽象論ではなく施策単位で回答してください。",
      "今月の注力施策がある場合は、それに沿う提案を最優先してください。",
      "必要なら質問は1つだけ返してください。",
      "画像相談の場合は、必ず次の4項目をこの順番で含めてください: 「画像の方向性」「構図」「色味・雰囲気」「画像内テキスト案」。",
      "動画相談の場合は、必ず次の4項目をこの順番で含めてください: 「動画の方向性」「動画構成(起承転結的な)」「冒頭3秒の見せ方」「撮影時のコツ」。",
      "専門用語の説明は不要。すぐ実行できる回答を返してください。",
    ].join("\n");

    const userPrompt = [
      `ユーザー質問: ${message}`,
      `相談タイプ: ${videoConsult ? "動画" : imageConsult ? "画像" : "その他"}`,
      "相談モード: テキスト入力相談",
      `【オンボーディング事業情報】\n${businessInfoPrompt}`,
      `【最新Instagram運用参照（固定ファイル）】\n${algorithmBrief}`,
      monthlyActionFocusPrompt ? `【今月の注力施策】\n${monthlyActionFocusPrompt}` : "",
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
    const suggestedQuestions = normalizeSuggestedQuestions(parsed.suggestedQuestions).slice(0, 3);
    return await finalize(
      reply || "投稿目的に合わせて、具体案を3つに分けて提案できます。何を優先しますか？",
      suggestedQuestions,
      { consumeQuota: true, userProfile }
    );
  } catch (error) {
    if (error instanceof AiUsageLimitError) {
      return NextResponse.json(
        {
          success: false,
          error: `今月のAI出力回数の上限に達しました（${error.month} / ${error.limit ?? "無制限"}回）。`,
          code: "ai_output_limit_exceeded",
          usage: {
            month: error.month,
            limit: error.limit,
            used: error.used,
            remaining: error.remaining,
          },
        },
        { status: 429 }
      );
    }
    console.error("home advisor chat error:", error);
    return NextResponse.json({ success: false, error: "チャット応答の生成に失敗しました" }, { status: 500 });
  }
}
