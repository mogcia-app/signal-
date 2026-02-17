import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuthContext } from "@/lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { adminDb } from "@/lib/firebase-admin";
import { PURPOSE_TITLE_TEMPLATES, normalizePurposeKey } from "@/lib/ai/home-title-templates";

type PostType = "feed" | "reel" | "story";

interface HomePostGenerationRequest {
  prompt: string;
  postType: PostType;
  scheduledDate?: string;
  scheduledTime?: string;
  imageData?: string;
  imageContext?: string;
  generationVariant?: "random" | "advice";
  forcedProductId?: string;
  action?: "suggestTime" | "generatePost";
  autoGenerate?: boolean;
  mode?: "default" | "calendarTitle";
  avoidTitles?: string[];
  targetAudience?: string;
  regionRestriction?: "none" | "restricted" | string;
  regionName?: string;
  kpiFocus?: string;
  operationPurpose?: string;
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const defaultTimes: Record<PostType, string[]> = {
  feed: ["09:00", "12:00", "19:00", "21:00"],
  reel: ["07:00", "12:00", "20:00", "22:00"],
  story: ["08:00", "13:00", "18:00", "21:00"],
};

const autoThemes = [
  "今日の気づきをシェア",
  "よくある悩みへの回答",
  "お客様からの質問に回答",
  "おすすめの使い方を紹介",
  "ビフォーアフター事例",
  "今週の振り返り",
  "来週に向けた一言アドバイス",
];

const buildBusinessContext = (businessInfo: Record<string, unknown> | null | undefined): string[] => {
  if (!businessInfo || typeof businessInfo !== "object") {return [];}

  const lines: string[] = [];
  const industry = String(businessInfo.industry || "").trim();
  const catchphrase = String(businessInfo.catchphrase || "").trim();
  const description = String(businessInfo.description || "").trim();

  if (industry) {lines.push(`業種: ${industry}`);}
  if (catchphrase) {lines.push(`キャッチコピー: ${catchphrase}`);}
  if (description) {lines.push(`事業内容: ${description}`);}

  const targetMarketRaw = businessInfo.targetMarket;
  if (Array.isArray(targetMarketRaw)) {
    const targets = targetMarketRaw.map((v) => String(v || "").trim()).filter(Boolean);
    if (targets.length > 0) {lines.push(`ターゲット市場: ${targets.join("、")}`);}
  } else {
    const target = String(targetMarketRaw || "").trim();
    if (target) {lines.push(`ターゲット市場: ${target}`);}
  }

  const products = Array.isArray(businessInfo.productsOrServices)
    ? (businessInfo.productsOrServices as Array<Record<string, unknown>>)
    : [];
  if (products.length > 0) {
    lines.push("商品・サービス情報:");
    products.slice(0, 5).forEach((item, index) => {
      const name = String(item.name || "").trim();
      const details = String(item.details || "").trim();
      const price = String(item.price || "").trim();
      if (!name && !details && !price) {return;}

      const chunks = [name, details, price ? `価格:${price}` : ""].filter(Boolean);
      lines.push(`${index + 1}. ${chunks.join(" / ")}`);
    });
  }

  return lines;
};

const normalizeProductLabel = (value: string): string => {
  return String(value || "")
    .replace(/\s*[-ー–]\s*\d+\s*(g|kg|ml|l|個|本|枚)$/i, "")
    .replace(/\s*\(\s*\d+\s*(g|kg|ml|l|個|本|枚)\s*\)$/i, "")
    .trim();
};

interface ProductCandidate {
  key: string;
  id: string;
  name: string;
  details: string;
  price: string;
}

const buildProductCandidates = (businessInfo: Record<string, unknown> | null | undefined): ProductCandidate[] => {
  if (!businessInfo || typeof businessInfo !== "object") {return [];}
  const products = Array.isArray(businessInfo.productsOrServices)
    ? (businessInfo.productsOrServices as Array<Record<string, unknown>>)
    : [];

  return products
    .map((item, index) => {
      const name = normalizeProductLabel(String(item.name || "").trim());
      if (!name) {return null;}
      const id = String(item.id || "").trim() || `item-${index + 1}`;
      return {
        key: `P${String(index + 1).padStart(2, "0")}`,
        id,
        name,
        details: String(item.details || "").trim(),
        price: String(item.price || "").trim(),
      } as ProductCandidate;
    })
    .filter((item): item is ProductCandidate => item !== null);
};

const pickRandomProduct = (products: ProductCandidate[]): ProductCandidate | null => {
  if (products.length === 0) {return null;}
  const idx = Math.floor(Math.random() * products.length);
  return products[idx] || null;
};

const pickProductById = (products: ProductCandidate[], productId?: string): ProductCandidate | null => {
  const key = String(productId || "").trim();
  if (!key) {return null;}
  return products.find((product) => product.id === key || product.name === key || product.key === key) || null;
};

interface LatestAdviceReference {
  postId: string;
  postTitle: string;
  generatedAt: string;
  recommendedActions: string[];
}

const toIsoStringSafe = (value: unknown): string => {
  if (!value) {return "";}
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const maybeTs = value as { toDate?: () => Date };
    const date = maybeTs.toDate?.();
    if (date && !Number.isNaN(date.getTime())) {return date.toISOString();}
  }
  return "";
};

const fetchLatestAdviceReference = async (userId: string): Promise<LatestAdviceReference | null> => {
  const snapshot = await adminDb
    .collection("ai_post_summaries")
    .where("userId", "==", userId)
    .orderBy("generatedAt", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) {return null;}
  const data = snapshot.docs[0].data() as {
    postId?: unknown;
    postTitle?: unknown;
    generatedAt?: unknown;
    createdAt?: unknown;
    recommendedActions?: unknown;
  };
  const recommendedActions = Array.isArray(data.recommendedActions)
    ? data.recommendedActions.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3)
    : [];

  let postId = String(data?.postId || "");
  let postTitle = String(data?.postTitle || "").trim();
  let generatedAt = toIsoStringSafe(data?.generatedAt) || toIsoStringSafe(data?.createdAt);

  if ((!postTitle || !generatedAt) && postId) {
    const analyticsSnapshot = await adminDb
      .collection("analytics")
      .where("userId", "==", userId)
      .where("postId", "==", postId)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get()
      .catch(() => null);
    if (analyticsSnapshot && !analyticsSnapshot.empty) {
      const analyticsData = analyticsSnapshot.docs[0].data();
      if (!postTitle) {postTitle = String(analyticsData?.title || "").trim();}
      if (!generatedAt) {
        const createdAt = analyticsData?.createdAt;
        generatedAt = toIsoStringSafe(createdAt);
      }
    }
  }

  if (!postId || !postTitle || !generatedAt) {
    const latestAnalytics = await adminDb
      .collection("analytics")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get()
      .catch(() => null);
    if (latestAnalytics && !latestAnalytics.empty) {
      const analyticsData = latestAnalytics.docs[0].data();
      if (!postId) {postId = String(analyticsData?.postId || latestAnalytics.docs[0].id || "");}
      if (!postTitle) {postTitle = String(analyticsData?.title || "").trim();}
      if (!generatedAt) {generatedAt = toIsoStringSafe(analyticsData?.createdAt);}
    }
  }

  if (!postTitle && !generatedAt && recommendedActions.length === 0) {
    return null;
  }

  return { postId, postTitle, generatedAt, recommendedActions };
};

const ensureProductInTitle = (title: string, productName: string): string => {
  const normalizedTitle = String(title || "").trim();
  const normalizedProduct = String(productName || "").trim();
  if (!normalizedProduct) {return normalizedTitle;}
  const compactTitle = normalizedTitle.replace(/\s+/g, "").toLowerCase();
  const compactProduct = normalizedProduct.replace(/\s+/g, "").toLowerCase();
  if (compactTitle.includes(compactProduct)) {return normalizedTitle;}
  return `${normalizedProduct} ${normalizedTitle}`.trim();
};

const ensureProductInContent = (content: string, productName: string): string => {
  const normalizedContent = String(content || "").trim();
  const normalizedProduct = String(productName || "").trim();
  if (!normalizedProduct) {return normalizedContent;}
  if (!normalizedContent) {return normalizedContent;}
  const compactContent = normalizedContent.replace(/\s+/g, "").toLowerCase();
  const compactProduct = normalizedProduct.replace(/\s+/g, "").toLowerCase();
  if (compactContent.includes(compactProduct)) {return normalizedContent;}
  return `${normalizedProduct}\n${normalizedContent}`;
};

const buildFallbackHashtags = (params: { postType: PostType; productName: string; kpiTag: string; industry: string }): string[] => {
  const typeTag = params.postType === "reel" ? "リール" : params.postType === "story" ? "ストーリー" : "フィード投稿";
  const base = [
    "Instagram運用",
    typeTag,
    params.productName,
    params.industry,
    params.kpiTag,
    "投稿アイデア",
  ]
    .map((tag) => String(tag || "").replace(/^#+/, "").trim())
    .filter(Boolean);
  const unique: string[] = [];
  for (const tag of base) {
    if (!unique.includes(tag)) {unique.push(tag);}
    if (unique.length >= 5) {break;}
  }
  while (unique.length < 5) {
    unique.push(`ハッシュタグ${unique.length + 1}`);
  }
  return unique.slice(0, 5);
};

const normalizeHashtagToken = (value: string): string =>
  String(value || "")
    .replace(/^#+/, "")
    .trim();

const buildFiveHashtags = (aiHashtags: string[], fallbackHashtags: string[]): string[] => {
  const merged = [...aiHashtags, ...fallbackHashtags].map(normalizeHashtagToken).filter(Boolean);
  const unique: string[] = [];
  for (const tag of merged) {
    if (!unique.includes(tag)) {unique.push(tag);}
    if (unique.length >= 5) {break;}
  }
  while (unique.length < 5) {
    unique.push(`ハッシュタグ${unique.length + 1}`);
  }
  return unique.slice(0, 5);
};

const normalizePostHint = (value: string): string =>
  String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[。]{2,}/g, "。")
    .trim();

const isWeakPostHint = (value: string): boolean => {
  const text = normalizePostHint(value);
  if (!text) {return true;}
  if (text.length < 14) {return true;}
  return /(意識|工夫|魅力|良い|大切|考える|検討|興味を引く言葉|わかりやすく|丁寧に)/.test(text);
};

const buildPostHintFallback = (params: { postType: PostType; hasImage: boolean }): string => {
  if (params.postType === "reel") {
    return params.hasImage
      ? "冒頭3秒で見どころのカットを置き、テロップで『何が変わるか』を先に明示する。"
      : "冒頭3秒で変化が出る動画素材を使い、最後に保存したくなる要点を1つ残す。";
  }
  if (params.postType === "story") {
    return params.hasImage
      ? "1枚目に結論、2枚目に理由を置く構成で、スタンプ導線に繋がる問いを1つ入れる。"
      : "1枚目で要点が伝わる画像を使い、質問スタンプにつながる短い問いかけを添える。";
  }
  return params.hasImage
    ? "1枚目で主役がわかる構図にし、キャプション冒頭で『誰向け・何が得か』を1文で示す。"
    : "1枚目に利用シーンが伝わる画像を置き、保存したくなる具体ポイントを1つ入れる。";
};

const extractBusinessSignals = (businessInfo: Record<string, unknown> | null | undefined): {
  industry: string;
  catchphrase: string;
  description: string;
  productNames: string[];
  targetLabel: string;
} => {
  if (!businessInfo || typeof businessInfo !== "object") {
    return { industry: "", catchphrase: "", description: "", productNames: [], targetLabel: "フォロワー向け" };
  }

  const industry = String(businessInfo.industry || "").trim();
  const catchphrase = String(businessInfo.catchphrase || "").trim();
  const description = String(businessInfo.description || "").trim();
  const productNames = Array.isArray(businessInfo.productsOrServices)
    ? (businessInfo.productsOrServices as Array<Record<string, unknown>>)
        .map((item) => normalizeProductLabel(String(item.name || "").trim()))
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const targetMarketRaw = businessInfo.targetMarket;
  const targetLabel = Array.isArray(targetMarketRaw)
    ? String(targetMarketRaw[0] || "").trim()
    : String(targetMarketRaw || "").trim();

  return {
    industry,
    catchphrase,
    description,
    productNames,
    targetLabel: targetLabel || (industry ? `${industry}に関心がある方` : "フォロワー向け"),
  };
};

const normalizeSuggestedTime = (value: string, fallback: string): string => {
  const raw = String(value || "").trim();
  if (!raw) {return fallback;}
  const hhmm = raw.match(/(\d{1,2}):(\d{2})/);
  if (hhmm) {
    return `${hhmm[1].padStart(2, "0")}:${hhmm[2]}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return fallback;
};

const normalizeTitleKey = (value: string): string =>
  String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[!！✨⭐️☆。、，,・]/g, "")
    .toLowerCase();

const KPI_TAG_MAP: Record<string, string> = {
  "保存率": "保存",
  "保存": "保存",
  "いいね": "いいね",
  "リーチ": "リーチ",
  "プロフィール遷移": "遷移",
  "遷移": "遷移",
  "コメント率": "コメント",
  "コメント": "コメント",
};
const normalizeKpiTag = (value: string): string => {
  const raw = String(value || "").trim();
  if (!raw) {return "保存";}
  return KPI_TAG_MAP[raw] || "保存";
};

const ensureKpiPrefix = (title: string, kpiTag: string): string => {
  const normalized = String(title || "").trim();
  if (!normalized) {return `[${kpiTag}] 投稿タイトル`;}
  const stripped = normalized
    .replace(/^(?:\[[^\]]+\])+/g, "")
    .replace(/^(?:【[^】]+】)+/g, "")
    .trim();
  if (!stripped) {return `[${kpiTag}] 投稿タイトル`;}
  return `[${kpiTag}] ${stripped}`;
};

const removeKpiPrefix = (title: string): string =>
  String(title || "")
    .replace(/^(?:\[[^\]]+\]\s*)+/g, "")
    .trim();

const applyCalendarTitleTemplate = (title: string, postType: PostType): string => {
  const normalized = String(title || "").trim().replace(/[!！✨⭐️☆]+$/g, "");
  if (!normalized) {return normalized;}
  const typeLabel = postType === "reel" ? "リール" : postType === "story" ? "ストーリー" : "投稿";
  const hasValueWord = /(コツ|比較|選|手順|方法|チェック|ポイント|テンプレ|ガイド|事例|解説|診断|質問|投票)/.test(normalized);
  if (hasValueWord) {return normalized;}
  return `${normalized}${typeLabel}のポイント`;
};

const shouldInjectRegionForDate = (scheduledDate?: string): boolean => {
  if (!scheduledDate) {return false;}
  const parsed = new Date(scheduledDate);
  if (Number.isNaN(parsed.getTime())) {return false;}
  return parsed.getDate() % 2 === 0;
};

const injectRegionIntoTitle = (title: string, regionName: string): string => {
  const normalized = String(title || "").trim();
  const region = String(regionName || "").trim();
  if (!normalized || !region) {return normalized;}
  if (normalized.includes(region)) {return normalized;}
  const prefixMatch = normalized.match(/^(\[[^\]]+\]|【[^】]+】)/);
  if (!prefixMatch) {
    return `${region}の${normalized}`;
  }
  const prefix = prefixMatch[0];
  const rest = normalized.slice(prefix.length).trim();
  return `${prefix}${region}の${rest}`;
};

const deriveRecruitSubject = (params: {
  industry: string;
  description: string;
}): string => {
  const industry = params.industry;
  const description = params.description;

  if (industry.includes("不動産") && (description.includes("賃貸") || description.includes("賃貸専門"))) {
    return "賃貸営業";
  }
  if (industry.includes("不動産")) {return "不動産営業";}
  if (industry.includes("飲食") || industry.includes("カフェ")) {return "店舗スタッフ";}
  if (industry) {return `${industry}の仕事`;}
  return "この仕事";
};

const normalizeToPostTitle = (params: {
  title: string;
  postType: PostType;
  productName: string;
  operationPurpose?: string;
  industry?: string;
  description?: string;
  scheduledDate?: string;
  regionName?: string;
}): string => {
  const body = String(params.title || "")
    .replace(/^(?:\[[^\]]+\])+/g, "")
    .replace(/^(?:【[^】]+】)+/g, "")
    .trim();
  const product = params.productName || "コーヒー";
  const region = String(params.regionName || "").trim();
  const purpose = normalizePurposeKey(params.operationPurpose || "");
  const weakWords = ["コツ", "構成", "共通点", "テンプレ", "ポイント共有", "見直し項目", "一番困る", "豆知識", "要点まとめ", "作り方"];
  const isWeak = !body || weakWords.some((word) => body.includes(word));
  if (!isWeak) {return body;}

  const dateSeed = (() => {
    if (!params.scheduledDate) {return 0;}
    const d = new Date(params.scheduledDate);
    return Number.isNaN(d.getTime()) ? 0 : d.getDate();
  })();

  const fillTemplate = (template: string, variables: { subject: string; product: string }): string =>
    template
      .replace(/\{subject\}/g, variables.subject)
      .replace(/\{product\}/g, variables.product);

  if (purpose === "recruit") {
    const subject = deriveRecruitSubject({
      industry: String(params.industry || ""),
      description: String(params.description || ""),
    });
    const recruitList = PURPOSE_TITLE_TEMPLATES.recruit[params.postType] || PURPOSE_TITLE_TEMPLATES.recruit.feed;
    const recruitTemplate = recruitList[dateSeed % recruitList.length] || recruitList[0] || "{subject}の1日";
    const recruitPicked = fillTemplate(recruitTemplate, { subject, product });
    return recruitPicked;
  }
  const templatesByType = PURPOSE_TITLE_TEMPLATES[purpose] || PURPOSE_TITLE_TEMPLATES.awareness;
  const list = templatesByType[params.postType] || templatesByType.feed;
  const template = list[dateSeed % list.length] || list[0] || "{product}のおすすめポイント";
  const picked = fillTemplate(template, {
    subject: deriveRecruitSubject({
      industry: String(params.industry || ""),
      description: String(params.description || ""),
    }),
    product,
  });
  return purpose === "sales" && region ? `${region}の${picked}` : picked;
};

const normalizeGeneratedContent = (value: string): string => {
  return String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\*\*/g, "")
    .replace(/\s+\n/g, "\n")
    .trim();
};

const isMetaExplanationContent = (content: string): boolean => {
  const normalized = String(content || "");
  return /(今日は|ご紹介します|コツを|3つご紹介|ぜひこれら|参考にして)/.test(normalized);
};

const buildCaptionFallback = (params: {
  title: string;
  targetLabel: string;
  productName: string;
  regionName: string;
}): string => {
  const titleBody = String(params.title || "")
    .replace(/^(?:\[[^\]]+\])+/g, "")
    .replace(/^(?:【[^】]+】)+/g, "")
    .trim();
  const product = params.productName || "コーヒー";
  const region = params.regionName ? `${params.regionName}で` : "";
  return `${region}${product}をもっと楽しみたい${params.targetLabel}へ。\n${titleBody}\n\n今日は「すぐ試せる1アクション」を紹介します。\n保存して、次の投稿準備に使ってください。`;
};

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "home-post-generation", limit: 40, windowSeconds: 60 },
      auditEventName: "home_post_generation",
    });

    const body = (await request.json()) as HomePostGenerationRequest;
    const action = body.action || "generatePost";
    const postType = body.postType;

    if (action === "suggestTime") {
      const choices = defaultTimes[postType] || defaultTimes.feed;
      const suggestedTime = choices[Math.floor(Math.random() * choices.length)] || "19:00";
      return NextResponse.json({
        success: true,
        data: {
          suggestedTime,
          postType,
          reason: "ホーム運用向けの推奨時間です",
          basedOnData: false,
        },
      });
    }

    let prompt = String(body.prompt || "").trim();
    const imageContext = String(body.imageContext || "").trim();
    const rawImageData = String(body.imageData || "").trim();
    const normalizedImageData =
      rawImageData && rawImageData.startsWith("data:image/") && rawImageData.length <= 8_000_000
        ? rawImageData
        : "";
    if (body.autoGenerate && prompt === "auto") {
      prompt = autoThemes[Math.floor(Math.random() * autoThemes.length)] || "今日の投稿テーマ";
    }
    if (!prompt && normalizedImageData) {
      prompt = "添付画像に合う投稿文";
    }
    if (!prompt) {
      return NextResponse.json({ error: "投稿テーマを入力してください" }, { status: 400 });
    }

    if (!openai) {
      return NextResponse.json({ error: "OpenAI APIキーが未設定です" }, { status: 500 });
    }

    const suggestedTime = body.scheduledTime || defaultTimes[postType]?.[0] || "19:00";
    const typeLabel = postType === "reel" ? "リール" : postType === "story" ? "ストーリーズ" : "フィード";
    const mode = body.mode || "default";
    const generationVariant = body.generationVariant === "advice" ? "advice" : "random";
    const operationPurpose = String(body.operationPurpose || "").trim();
    const inputTargetAudience = String(body.targetAudience || "").trim();
    const fallbackKpiTag = normalizeKpiTag(String(body.kpiFocus || ""));
    const inputRegionName =
      String(body.regionRestriction || "") === "restricted" ? String(body.regionName || "").trim() : "";
    const avoidTitles = Array.isArray(body.avoidTitles) ? body.avoidTitles.map((v) => String(v || "").trim()).filter(Boolean) : [];
    const avoidTitleKeys = new Set(avoidTitles.map((title) => normalizeTitleKey(title)));
    const userProfile = await getUserProfile(uid);
    const businessInfo = userProfile?.businessInfo ? (userProfile.businessInfo as unknown as Record<string, unknown>) : null;
    const businessContextLines = buildBusinessContext(businessInfo);
    const productCandidates = buildProductCandidates(businessInfo);
    const selectedProduct = pickProductById(productCandidates, body.forcedProductId) || pickRandomProduct(productCandidates);
    const latestAdviceReference =
      generationVariant === "advice" ? await fetchLatestAdviceReference(uid).catch(() => null) : null;
    const businessSignalsBase = extractBusinessSignals(businessInfo);
    const businessSignals = {
      ...businessSignalsBase,
      targetLabel: inputTargetAudience || businessSignalsBase.targetLabel,
    };
    const kpiTag = normalizeKpiTag(fallbackKpiTag);

    const generationPromptText = [
      `投稿タイプ: ${typeLabel}`,
      `投稿テーマ: ${prompt}`,
      operationPurpose ? `投稿目的: ${operationPurpose}` : "",
      body.scheduledDate ? `投稿日: ${body.scheduledDate}` : "",
      `投稿時間: ${suggestedTime}`,
      businessContextLines.length > 0 ? `\n【事業コンテキスト】\n${businessContextLines.join("\n")}` : "",
      inputTargetAudience ? `ターゲット属性: ${inputTargetAudience}` : "",
      `KPIタグ: [${kpiTag}]`,
      inputRegionName ? `地域限定: ${inputRegionName}` : "",
      normalizedImageData
        ? "添付画像があります。画像の被写体・雰囲気・色味・シーンと矛盾しない投稿文にしてください。画像にない事実は断定しないでください。postHintsには必ず画像活用の具体ヒントを1件以上含めてください。"
        : "画像は未添付です。投稿タイプに合う素材（画像/動画）の提案を postHints に必ず1件以上含めてください。",
      normalizedImageData && imageContext
        ? `画像補足情報: ${imageContext}`
        : "",
      selectedProduct
        ? [
            "【商品強制指定】",
            `今回の投稿は ${selectedProduct.key}「${selectedProduct.name}」を主役にしてください。`,
            selectedProduct.details ? `商品説明: ${selectedProduct.details}` : "",
            selectedProduct.price ? `価格情報: ${selectedProduct.price}` : "",
            "タイトルまたは本文冒頭に必ず商品名を含め、他商品の話を主軸にしないでください。",
          ]
            .filter(Boolean)
            .join("\n")
        : "",
      generationVariant === "advice"
        ? [
            "【トーン方針】改善実行トーン",
            "前回分析の改善提案を反映した、実行的で具体的なトーンにしてください。",
            latestAdviceReference?.recommendedActions && latestAdviceReference.recommendedActions.length > 0
              ? `直近AIアドバイス:\n${latestAdviceReference.recommendedActions.map((action) => `- ${action}`).join("\n")}`
              : "直近AIアドバイスは取得できませんでした。改善志向のトーンで生成してください。",
          ]
            .filter(Boolean)
            .join("\n")
        : "【トーン方針】共感重視トーン。読みやすく、前向きで軽やかな表現にしてください。",
      mode === "calendarTitle" && avoidTitles.length > 0
        ? `\n【使用禁止タイトル】\n${avoidTitles.map((title) => `- ${title}`).join("\n")}`
        : "",
      mode !== "calendarTitle" && avoidTitles.length > 0
        ? `\n【使用禁止タイトル】\n${avoidTitles.map((title) => `- ${title}`).join("\n")}\n上記と同じタイトルは使わないでください。`
        : "",
      mode === "calendarTitle"
        ? "タイトルは投稿サムネイルにそのまま使える、商品・ブランド訴求の文にしてください。禁止: ノウハウ見出し（コツ/構成/共通点/テンプレ/作り方/要点まとめ/豆知識）。『誰向けか』より『何を投稿するか』を優先し、商品・サービス名を含めてください。"
        : "本文は実務でそのまま投稿できるキャプションとして作成してください。禁止: 解説口調（今日は〜を紹介します等）、講義文、箇条書きの説明。必須: 冒頭フック1文 + 本文2-4文 + CTA1文。Markdown記法（**）は禁止。",
    ]
      .filter(Boolean)
      .join("\n");

    const generationUserContent: OpenAI.Chat.Completions.ChatCompletionUserMessageParam["content"] =
      normalizedImageData
        ? [
            { type: "text", text: generationPromptText },
            { type: "image_url", image_url: { url: normalizedImageData } },
          ]
        : generationPromptText;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: mode === "calendarTitle" ? 0.45 : 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            mode === "calendarTitle"
              ? "あなたはInstagram運用担当の編集者です。出力はJSONのみ。必ず title, content, hashtags, suggestedTime, postHints を返してください。titleは12-24文字で具体語（題材・対象・行動）を含め、抽象語だけの表現は禁止。禁止例: 新しい月の始まり/新しい発見/知っておきたい。contentは空文字、hashtagsは空配列でよい。postHintsは『1文で実行できる改善指示』を1-3件で返してください。抽象語（意識/工夫/魅力など）だけの文は禁止。"
              : "あなたはInstagram運用担当のアシスタントです。出力はJSONのみ。必ず title, content, hashtags, suggestedTime, postHints を返してください。hashtagsは#なしの配列、最大5件。postHintsは投稿文に沿った『1文で実行できる改善指示』を1-3件で返してください。抽象語（意識/工夫/魅力など）だけの文は禁止。",
        },
        {
          role: "user",
          content: generationUserContent,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(text) as {
      title?: string;
      hook?: string;
      content?: string;
      hashtags?: unknown;
      suggestedTime?: string;
      postHints?: unknown;
    };

    const hashtags = Array.isArray(parsed.hashtags)
      ? parsed.hashtags.map((tag) => String(tag).replace(/^#+/, "")).filter(Boolean)
      : [];
    const fallbackHashtags = buildFallbackHashtags({
      postType,
      productName: selectedProduct?.name || businessSignals.productNames[0] || "",
      kpiTag,
      industry: businessSignals.industry,
    });
    const limitedHashtags = buildFiveHashtags(hashtags, fallbackHashtags);
    const rawTitle = String(parsed.title || prompt).trim().replace(/[!！✨⭐️☆]+$/g, "");
    const draftCalendarTitle = mode === "calendarTitle"
      ? applyCalendarTitleTemplate(
          ensureKpiPrefix(rawTitle, kpiTag),
          postType
        )
      : rawTitle;
    const title = draftCalendarTitle;
    const regionalizedTitle =
      mode !== "calendarTitle" && inputRegionName && shouldInjectRegionForDate(body.scheduledDate)
        ? injectRegionIntoTitle(title, inputRegionName)
        : title;
    const finalTitleBase = removeKpiPrefix(regionalizedTitle);
    const normalizedFinalTitle = normalizeToPostTitle({
      title: finalTitleBase,
      postType,
      productName: selectedProduct?.name || businessSignals.productNames[0] || "",
      operationPurpose,
      industry: businessSignals.industry,
      description: businessSignals.description,
      scheduledDate: body.scheduledDate,
      regionName: inputRegionName,
    });
    const normalizedSuggestedTime = normalizeSuggestedTime(String(parsed.suggestedTime || suggestedTime), suggestedTime);

    const rawContent = String(parsed.content || "");
    const normalizedContent = normalizeGeneratedContent(rawContent);
    const finalContent =
      mode === "calendarTitle"
        ? ""
        : isMetaExplanationContent(normalizedContent)
          ? buildCaptionFallback({
              title: normalizedFinalTitle,
              targetLabel: businessSignals.targetLabel,
              productName: selectedProduct?.name || businessSignals.productNames[0] || "",
              regionName: inputRegionName,
            })
          : normalizedContent;
    const productAdjustedTitle =
      selectedProduct && mode !== "calendarTitle"
        ? ensureProductInTitle(normalizedFinalTitle, selectedProduct.name)
        : normalizedFinalTitle;
    const dedupedTitle =
      mode !== "calendarTitle" && avoidTitleKeys.has(normalizeTitleKey(productAdjustedTitle))
        ? `${productAdjustedTitle} 実践編`
        : productAdjustedTitle;
    const productAdjustedContent =
      selectedProduct && mode !== "calendarTitle"
        ? ensureProductInContent(finalContent, selectedProduct.name)
        : finalContent;
    const aiPostHints = Array.isArray(parsed.postHints)
      ? parsed.postHints
          .map((item) => normalizePostHint(String(item || "")))
          .filter(Boolean)
          .slice(0, 3)
      : [];
    const primaryHint =
      aiPostHints.find((hint) => !isWeakPostHint(hint)) ||
      aiPostHints[0] ||
      buildPostHintFallback({
        postType,
        hasImage: Boolean(normalizedImageData),
      });

    return NextResponse.json({
      success: true,
      data: {
        title: dedupedTitle,
        hook: typeof parsed.hook === "string" && parsed.hook.trim().length > 0 ? parsed.hook.trim() : undefined,
        content: productAdjustedContent,
        hashtags: mode === "calendarTitle" ? [] : limitedHashtags,
        suggestedTime: normalizedSuggestedTime,
        kpiTag,
        generationVariant,
        adviceReference:
          generationVariant === "advice" && latestAdviceReference
            ? {
                postId: latestAdviceReference.postId,
                postTitle: latestAdviceReference.postTitle,
                generatedAt: latestAdviceReference.generatedAt,
              }
            : null,
        selectedProduct: selectedProduct
          ? {
              key: selectedProduct.key,
              id: selectedProduct.id,
              name: selectedProduct.name,
            }
          : null,
        postHints: [primaryHint],
      },
    });
  } catch (error) {
    console.error("ホーム投稿生成エラー:", error);
    return NextResponse.json({ error: "投稿生成に失敗しました" }, { status: 500 });
  }
}
