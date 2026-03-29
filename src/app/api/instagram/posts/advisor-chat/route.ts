import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import { getAdminDb } from "@/lib/firebase-admin";
import { getInstagramAlgorithmBrief } from "@/lib/ai/instagram-algorithm-brief";
import { getMonthlyActionFocusPrompt } from "@/lib/ai/monthly-action-focus";
import { logImplicitAiAction } from "@/lib/ai/implicit-action-log";
import { requireAuthContext } from "@/lib/server/auth-context";
import { AiUsageLimitError, assertAiOutputAvailable, consumeAiOutput } from "@/lib/server/ai-usage-limit";
import {
  acquireAiRequestLock,
  buildAiRequestKey,
  completeAiRequestLock,
  failAiRequestLock,
} from "@/lib/server/ai-idempotency";
import { getUserProfile } from "@/lib/server/user-profile";

interface AdvisorChatRequest {
  message?: unknown;
  selectedPostId?: unknown;
  idempotencyKey?: unknown;
}

interface AnalyticsDoc {
  postId?: unknown;
  title?: unknown;
  content?: unknown;
  likes?: unknown;
  comments?: unknown;
  shares?: unknown;
  reposts?: unknown;
  saves?: unknown;
  followerIncrease?: unknown;
  engagementRate?: unknown;
  interactionCount?: unknown;
  reachedAccounts?: unknown;
  profileVisits?: unknown;
  profileFollows?: unknown;
  externalLinkTaps?: unknown;
  reelInteractionCount?: unknown;
  reelReachedAccounts?: unknown;
  reelPlayTime?: unknown;
  reelAvgPlayTime?: unknown;
  reelSkipRate?: unknown;
  reelNormalSkipRate?: unknown;
  publishedAt?: unknown;
  publishedTime?: unknown;
  createdAt?: unknown;
  category?: unknown;
}

interface GeneratedAdvice {
  why: string;
  action: string;
}

interface ComparisonContext {
  summary: string;
  sampleSize: number;
  strongerMetric: string | null;
  weakerMetric: string | null;
  hasReliableComparison: boolean;
}

type AdvisorIntent = "why_grew" | "fix" | "next_change" | "other";

const normalizeText = (value: unknown): string => String(value || "").trim();
const SUGGESTED_QUESTIONS = ["なぜ伸びた？", "次の一手は？"];
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
const containsEngagementTerm = (value: string): boolean =>
  /エンゲージメント|engagement/i.test(String(value || ""));
const containsHashtagTerm = (value: string): boolean =>
  /ハッシュタグ|#|タグ\b/i.test(String(value || ""));
const looksAbstract = (value: string): boolean =>
  /価値のある|関心を得|工夫が必要|改善余地|重要です|強化し|活用し|最適化/i.test(String(value || ""));
const containsAwkwardTerm = (value: string): boolean =>
  /配信/.test(String(value || ""));
const isStrategicAction = (value: string): boolean =>
  /次回は/.test(value) && /判定/.test(value) && /(投稿|リール|フィード|ストーリーズ|テーマ|型|切り口|構成|訴求|指標)/.test(value);

const detectIntent = (message: string): AdvisorIntent => {
  const lower = message.toLowerCase();
  if (lower.includes("なぜ伸") || lower.includes("なんで伸") || lower.includes("why")) {
    return "why_grew";
  }
  if (lower.includes("何を直") || lower.includes("どこを直") || lower.includes("改善")) {
    return "fix";
  }
  if (
    lower.includes("次回何を変") ||
    lower.includes("次に何を変") ||
    lower.includes("次回") ||
    lower.includes("次の一手")
  ) {
    return "next_change";
  }
  return "other";
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toDate = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "object" && value && "toDate" in value) {
    const converted = (value as { toDate?: () => Date }).toDate?.();
    return converted && !Number.isNaN(converted.getTime()) ? converted : null;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const formatPostType = (value: string): string => {
  if (value === "reel") {
    return "リール";
  }
  if (value === "story") {
    return "ストーリーズ";
  }
  return "フィード";
};

const normalizeContent = (value: unknown): string => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) {
    return "未設定";
  }
  return text.length > 240 ? `${text.slice(0, 240)}...` : text;
};

const formatDateJa = (date: Date | null): string => {
  if (!date) {
    return "未設定";
  }
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
};

const formatTime = (value: unknown): string => {
  const text = String(value || "").trim();
  if (!text) {
    return "未設定";
  }
  const hhmm = text.match(/^(\d{1,2}):(\d{2})/);
  if (!hhmm) {
    return text;
  }
  return `${hhmm[1].padStart(2, "0")}:${hhmm[2]}`;
};

const normalizeImageUrl = (value: unknown): string | null => {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }
  if (text.startsWith("http://") || text.startsWith("https://") || text.startsWith("data:image/")) {
    return text;
  }
  return null;
};

const buildContentSnippet = (content: string): string => {
  const text = String(content || "").trim();
  if (!text || text === "未設定") {
    return "投稿文の主題";
  }
  const punct = text.search(/[。！？\n]/);
  if (punct > 0 && punct <= 42) {
    return text.slice(0, punct);
  }
  if (text.length <= 42) {
    return text;
  }
  return `${text.slice(0, 42)}…`;
};

const tokenize = (value: string): string[] => {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return [];
  }
  return normalized
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .slice(0, 30);
};

const overlapScore = (a: string[], b: string[]): number => {
  if (a.length === 0 || b.length === 0) {
    return 0;
  }
  const bSet = new Set(b);
  return a.reduce((sum, token) => sum + (bSet.has(token) ? 1 : 0), 0);
};

const signed = (value: number): string => (value > 0 ? `+${value}` : `${value}`);

const buildComparisonContext = (params: {
  selectedPostId: string;
  postType: "feed" | "reel" | "story";
  currentTitle: string;
  currentContent: string;
  current: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    reposts: number;
    followerIncrease: number;
  };
  history: AnalyticsDoc[];
}): ComparisonContext => {
  const currentTokens = tokenize(`${params.currentTitle} ${params.currentContent}`);
  const candidates = params.history
    .filter((item) => normalizeText(item.postId) !== params.selectedPostId)
    .filter((item) => {
      const category = normalizeText(item.category).toLowerCase();
      return !category || category === params.postType;
    })
    .map((item) => {
      const title = normalizeText(item.title);
      const content = normalizeText(item.content);
      const score = overlapScore(currentTokens, tokenize(`${title} ${content}`));
      const createdAt = toDate(item.createdAt)?.getTime() || toDate(item.publishedAt)?.getTime() || 0;
      return { item, score, createdAt };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.createdAt - a.createdAt;
    });

  const scored = candidates.filter((row) => row.score >= 2);
  const picked = scored.slice(0, 5);
  const sampleSize = picked.length;
  if (sampleSize === 0) {
    return {
      summary: "比較対象の類似投稿が不足しているため、今回は単体指標を優先して評価しました。",
      sampleSize: 0,
      strongerMetric: null,
      weakerMetric: null,
      hasReliableComparison: false,
    };
  }

  const avg = picked.reduce(
    (acc, row) => {
      acc.likes += toNumber(row.item.likes);
      acc.comments += toNumber(row.item.comments);
      acc.shares += toNumber(row.item.shares);
      acc.saves += toNumber(row.item.saves);
      acc.reposts += toNumber(row.item.reposts);
      acc.followerIncrease += toNumber(row.item.followerIncrease);
      return acc;
    },
    { likes: 0, comments: 0, shares: 0, saves: 0, reposts: 0, followerIncrease: 0 },
  );

  const baseline = {
    likes: Math.round((avg.likes / sampleSize) * 10) / 10,
    comments: Math.round((avg.comments / sampleSize) * 10) / 10,
    shares: Math.round((avg.shares / sampleSize) * 10) / 10,
    saves: Math.round((avg.saves / sampleSize) * 10) / 10,
    reposts: Math.round((avg.reposts / sampleSize) * 10) / 10,
    followerIncrease: Math.round((avg.followerIncrease / sampleSize) * 10) / 10,
  };

  const diffs = [
    { key: "いいね", value: Math.round((params.current.likes - baseline.likes) * 10) / 10 },
    { key: "コメント", value: Math.round((params.current.comments - baseline.comments) * 10) / 10 },
    { key: "シェア", value: Math.round((params.current.shares - baseline.shares) * 10) / 10 },
    { key: "保存", value: Math.round((params.current.saves - baseline.saves) * 10) / 10 },
    { key: "リポスト", value: Math.round((params.current.reposts - baseline.reposts) * 10) / 10 },
    { key: "フォロワー増加", value: Math.round((params.current.followerIncrease - baseline.followerIncrease) * 10) / 10 },
  ];
  const stronger = [...diffs].sort((a, b) => b.value - a.value)[0];
  const weaker = [...diffs].sort((a, b) => a.value - b.value)[0];

  const summary =
    `類似投稿${sampleSize}件平均との差分は、保存${signed(Math.round((params.current.saves - baseline.saves) * 10) / 10)}、` +
    `シェア${signed(Math.round((params.current.shares - baseline.shares) * 10) / 10)}、` +
    `フォロワー増加${signed(Math.round((params.current.followerIncrease - baseline.followerIncrease) * 10) / 10)}です。`;

  return {
    summary,
    sampleSize,
    strongerMetric: stronger?.key || null,
    weakerMetric: weaker?.key || null,
    hasReliableComparison: true,
  };
};

const sanitizeWhy = (value: string): string =>
  String(value || "")
    .replace(/配信/g, "投稿")
    .replace(/ハッシュタグ|#\S*/g, "")
    .trim();

const sanitizeAction = (value: string): string =>
  String(value || "")
    .replace(/配信/g, "投稿")
    .replace(/ハッシュタグ|#\S*/g, "")
    .trim();

const isThinWhy = (value: string): boolean => {
  const text = String(value || "").trim();
  if (text.length < 90) {
    return true;
  }
  const hasMetricToken = /(いいね|保存|シェア|コメント|リポスト|フォロワー増加)\s*[-+]?\d+/.test(text);
  return !hasMetricToken;
};

const buildAdviceFromData = (params: {
  postType: "feed" | "reel" | "story";
  postContent: string;
  comparisonContext: ComparisonContext;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reposts: number;
  followerIncrease: number;
}): GeneratedAdvice => {
  const { postType, postContent, comparisonContext, likes, comments, shares, saves, reposts, followerIncrease } = params;
  const snippet = buildContentSnippet(postContent);
  const metrics = [
    { key: "保存", value: saves },
    { key: "シェア", value: shares },
    { key: "コメント", value: comments },
    { key: "リポスト", value: reposts },
    { key: "いいね", value: likes },
  ].sort((a, b) => b.value - a.value);
  const top = metrics[0];
  const second = metrics[1];
  const weakest = metrics[metrics.length - 1];
  const contentType =
    top.key === "保存"
      ? "チェックリスト型"
      : top.key === "シェア"
        ? "比較・共有型"
        : top.key === "コメント"
          ? "意見募集型"
          : followerIncrease > 0
            ? "フォロー転換型"
            : "結論先出し型";
  const channelText = postType === "reel" ? "リール" : postType === "story" ? "ストーリーズ" : "フィード";

  const compareText = comparisonContext.hasReliableComparison ? `${comparisonContext.summary} ` : "";
  const why =
    followerIncrease > 0
      ? `${compareText}投稿文「${snippet}」に対して${top.key}${top.value}と${second.key}${second.value}が同時に反応し、読むだけで終わらない行動導線が成立しました。特にフォロワー増加${followerIncrease}まで波及しており、訴求内容とCTAの接続が機能したことが伸長要因です。`
      : `${compareText}投稿文「${snippet}」に対して${top.key}${top.value}と${second.key}${second.value}が同時に反応し、反応行動へ繋がる導線が機能しました。類似投稿平均との差分でも優位指標が確認でき、今回の訴求構成が有効だったと判断できます。`;

  const targetMetric =
    comparisonContext.hasReliableComparison && comparisonContext.weakerMetric
      ? comparisonContext.weakerMetric
      : weakest.key;
  const action = `次回は${channelText}で「${snippet}」と近いテーマを${contentType}として再現し、今回強かった${top.key}をもう一度取りにいってください。判定は次回投稿で${top.key}を維持しつつ、弱かった${targetMetric}が今回値を上回れば継続です。`;

  return { why, action };
};

const generateGrowthAdvice = async (params: {
  title: string;
  postType: "feed" | "reel" | "story";
  postContent: string;
  publishedDate: string;
  publishedTime: string;
  imageUrl?: string | null;
  comparisonContext: ComparisonContext;
  analytics: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    reposts: number;
    followerIncrease: number;
    interactionCount: number;
  };
  algorithmBrief: string;
  monthlyActionFocusPrompt: string;
}): Promise<GeneratedAdvice> => {
  if (!openai) {
    return buildAdviceFromData({
      postType: params.postType,
      postContent: params.postContent,
      comparisonContext: params.comparisonContext,
      likes: params.analytics.likes,
      comments: params.analytics.comments,
      shares: params.analytics.shares,
      saves: params.analytics.saves,
      reposts: params.analytics.reposts,
      followerIncrease: params.analytics.followerIncrease,
    });
  }

  const systemPrompt = [
    "あなたはInstagram運用の実務コーチです。",
    "保存済み分析データのみを根拠に、推測せずに答えてください。",
    "出力はJSONのみ: {\"why\": string, \"action\": string}",
    "whyは『なぜ伸びたか』への回答として2〜4文で具体的に述べてください。投稿文と数値をつないで因果を説明してください。",
    "whyには最低2つの数値（例: いいね34、保存21）を必ず含め、類似投稿との差分にも1文で触れてください。",
    "「配信」という語は使わず、必ず「投稿」と表現してください。",
    "投稿日時の生データ（YYYY/MM/DD HH:mm）は繰り返し記載しないでください。",
    "actionは投稿文の書き方指示ではなく、次回どんな投稿方針で再検証するかの戦略提案にしてください。",
    "actionは必ず「次回は〜。判定は〜。」の形にしてください。",
    "actionでは文字数、CTA文言、語尾修正などの細かい執筆指示は避け、テーマ・型・訴求・投稿形式・狙う指標に言及してください。",
    "「エンゲージメント」「エンゲージメント率」という語は一切使わないでください。",
    "ハッシュタグ・タグ・#記号には一切触れないでください。",
    "抽象語（価値がある、関心が高い、工夫が必要 等）だけで終わらせないでください。",
  ].join("\n");

  const userPrompt = [
    `対象投稿: ${params.title || "タイトル未設定"}`,
    `投稿タイプ: ${formatPostType(params.postType)}`,
    `投稿日: ${params.publishedDate}`,
    `投稿時間: ${params.publishedTime}`,
    `投稿文: ${params.postContent}`,
    `比較学習: ${params.comparisonContext.summary}`,
    `いいね: ${params.analytics.likes}`,
    `コメント: ${params.analytics.comments}`,
    `シェア: ${params.analytics.shares}`,
    `保存: ${params.analytics.saves}`,
    `リポスト: ${params.analytics.reposts}`,
    `フォロワー増加: ${params.analytics.followerIncrease}`,
    `インタラクション: ${params.analytics.interactionCount}`,
    "",
    "【最新Instagram運用参照（固定ファイル）】",
    params.algorithmBrief,
    params.monthlyActionFocusPrompt ? `\n【今月の注力施策】\n${params.monthlyActionFocusPrompt}` : "",
  ].join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: params.imageUrl
            ? [
                { type: "text", text: userPrompt },
                { type: "image_url", image_url: { url: params.imageUrl } },
              ]
            : [{ type: "text", text: userPrompt }],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let parsed = JSON.parse(raw) as { why?: unknown; action?: unknown };
    let why = sanitizeWhy(normalizeText(parsed.why));
    let action = sanitizeAction(normalizeText(parsed.action));

    if (!why || !action) {
      const repair = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "以下をJSONに整形してください。出力形式: {\"why\": string, \"action\": string}。空文字は禁止。whyは1〜2文、actionは「次回は〜。判定は〜。」。",
          },
          { role: "user", content: raw || "{}" },
        ],
      });
      const repairedRaw = repair.choices[0]?.message?.content || "{}";
      parsed = JSON.parse(repairedRaw) as { why?: unknown; action?: unknown };
      why = sanitizeWhy(normalizeText(parsed.why));
      action = sanitizeAction(normalizeText(parsed.action));
    }

    if (!why || containsHashtagTerm(why) || containsAwkwardTerm(why) || looksAbstract(why)) {
      why = buildAdviceFromData({
        postType: params.postType,
        postContent: params.postContent,
        comparisonContext: params.comparisonContext,
        likes: params.analytics.likes,
        comments: params.analytics.comments,
        shares: params.analytics.shares,
        saves: params.analytics.saves,
        reposts: params.analytics.reposts,
        followerIncrease: params.analytics.followerIncrease,
      }).why;
    }
    if (isThinWhy(why)) {
      const enriched = buildAdviceFromData({
        postType: params.postType,
        postContent: params.postContent,
        comparisonContext: params.comparisonContext,
        likes: params.analytics.likes,
        comments: params.analytics.comments,
        shares: params.analytics.shares,
        saves: params.analytics.saves,
        reposts: params.analytics.reposts,
        followerIncrease: params.analytics.followerIncrease,
      }).why;
      why = enriched;
    }

    if (!action || containsHashtagTerm(action) || !isStrategicAction(action) || containsEngagementTerm(action)) {
      action = buildAdviceFromData({
        postType: params.postType,
        postContent: params.postContent,
        comparisonContext: params.comparisonContext,
        likes: params.analytics.likes,
        comments: params.analytics.comments,
        shares: params.analytics.shares,
        saves: params.analytics.saves,
        reposts: params.analytics.reposts,
        followerIncrease: params.analytics.followerIncrease,
      }).action;
    }

    return { why, action };
  } catch (error) {
    console.error("instagram posts advisor ai generation error:", error);
    return buildAdviceFromData({
      postType: params.postType,
      postContent: params.postContent,
      comparisonContext: params.comparisonContext,
      likes: params.analytics.likes,
      comments: params.analytics.comments,
      shares: params.analytics.shares,
      saves: params.analytics.saves,
      reposts: params.analytics.reposts,
      followerIncrease: params.analytics.followerIncrease,
    });
  }
};

const buildSummary = (params: {
  postType: "feed" | "reel" | "story";
  postContent: string;
  publishedDate: string;
  publishedTime: string;
  comparisonContext: ComparisonContext;
  analytics: AnalyticsDoc;
  message: string;
  aiGeneratedAdvice?: GeneratedAdvice | null;
}) => {
  const {
    postType,
    postContent: _postContent,
    publishedDate: _publishedDate,
    publishedTime: _publishedTime,
    comparisonContext,
    analytics,
    message,
    aiGeneratedAdvice,
  } = params;
  const intent = detectIntent(message);

  const likes = toNumber(analytics.likes);
  const comments = toNumber(analytics.comments);
  const shares = toNumber(analytics.shares);
  const reposts = toNumber(analytics.reposts);
  const saves = toNumber(analytics.saves);
  const followerIncrease = toNumber(analytics.followerIncrease);

  const interactionCount =
    postType === "reel"
      ? toNumber(analytics.reelInteractionCount) || likes + comments + shares + saves + reposts
      : toNumber(analytics.interactionCount) || likes + comments + shares + saves + reposts;

  const profileVisits = toNumber(analytics.profileVisits);
  const profileFollows = toNumber(analytics.profileFollows);
  const externalLinkTaps = toNumber(analytics.externalLinkTaps);
  const reelSkipRate = toNumber(analytics.reelSkipRate);

  const allCoreZero =
    likes === 0 &&
    comments === 0 &&
    shares === 0 &&
    saves === 0 &&
    reposts === 0 &&
    followerIncrease === 0 &&
    interactionCount === 0;

  let whyReason = buildAdviceFromData({
    postType,
    postContent: _postContent,
    comparisonContext,
    likes,
    comments,
    shares,
    saves,
    reposts,
    followerIncrease,
  }).why;

  const messageLower = message.toLowerCase();
  let action = "次回は冒頭20文字でベネフィットを1つ明示し、末尾に質問を1つ入れてコメント導線を作ってください。";

  if (allCoreZero) {
    action =
      "次回は同テーマをいきなり再投稿せず、ストーリーズで需要確認してから本投稿に戻してください。判定は次回投稿で保存かコメントのどちらかが0を超えれば継続です。";
  } else if (messageLower.includes("なぜ伸") || messageLower.includes("バズ") || messageLower.includes("良かった")) {
    action =
      "次回は今回反応が強かった切り口を別テーマでもう1本再現してください。判定は次回投稿で保存またはシェアが今回水準に近ければ継続です。";
  } else if (messageLower.includes("悪") || messageLower.includes("弱") || messageLower.includes("直")) {
    action =
      "次回は同じテーマでも切り口を1つに絞った別パターンで再検証してください。判定は次回投稿で弱かった指標が今回値を上回れば継続です。";
  } else if (postType === "reel" && reelSkipRate > 0) {
    action =
      "次回は同テーマをリールで再検証しつつ、冒頭で結論が伝わる構成を優先してください。判定は次回投稿でスキップ率が今回より下がれば継続です。";
  } else if (profileVisits > 0 && profileFollows === 0) {
    action =
      "次回はプロフィール遷移後に何を得られるかが明確な訴求テーマで再投稿してください。判定は次回投稿でフォロワー増加が今回値を上回れば継続です。";
  } else if (externalLinkTaps > 0) {
    action =
      "次回はクリック誘導より保存されやすい情報提供型へ寄せて再検証してください。判定は次回投稿で保存が今回値を上回れば継続です。";
  }

  if (aiGeneratedAdvice) {
    whyReason = aiGeneratedAdvice.why;
    action = aiGeneratedAdvice.action;
  }

  const replyLines: string[] = [];
  if (intent === "why_grew") {
    replyLines.push(whyReason);
  } else if (intent === "fix") {
    replyLines.push(whyReason, "", "次の1アクション", action);
  } else if (intent === "next_change") {
    replyLines.push("次の1アクション", action);
  } else {
    replyLines.push(whyReason, "", "次の1アクション", action);
  }
  const reply = replyLines.join("\n");

  return {
    reply,
    suggestedQuestions: SUGGESTED_QUESTIONS,
  };
};

export async function POST(request: NextRequest) {
  let idempotencyContext: { uid: string; requestKey: string } | null = null;
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "instagram-posts-advisor-chat", limit: 40, windowSeconds: 60 },
      auditEventName: "instagram_posts_advisor_chat",
    });

    const body = (await request.json()) as AdvisorChatRequest;
    const message = normalizeText(body?.message);
    const selectedPostId = normalizeText(body?.selectedPostId);

    if (!message) {
      return NextResponse.json({ success: false, error: "message is required" }, { status: 400 });
    }

    if (!selectedPostId) {
      return NextResponse.json(
        { success: false, error: "selectedPostId is required" },
        { status: 400 },
      );
    }
    const idempotencyKey =
      normalizeText(body?.idempotencyKey) ||
      buildAiRequestKey({
        message,
        selectedPostId,
      });
    const lock = await acquireAiRequestLock({
      uid,
      feature: "instagram_posts_advisor_chat",
      requestKey: idempotencyKey,
    });
    if (lock.state === "completed") {
      return NextResponse.json(lock.payload.body, { status: lock.payload.status });
    }
    if (lock.state === "in_progress") {
      return NextResponse.json(
        {
          success: false,
          code: "request_in_progress",
          error: "同じチャットリクエストを処理中です。しばらく待ってください。",
          retryAfterSeconds: lock.retryAfterSeconds,
        },
        { status: 202 },
      );
    }
    idempotencyContext = { uid, requestKey: idempotencyKey };

    const userProfile = await getUserProfile(uid);
    const algorithmBrief = await getInstagramAlgorithmBrief();
    const monthlyActionFocusPrompt = await getMonthlyActionFocusPrompt(uid);
    const db = getAdminDb();

    const postDoc = await db.collection("posts").doc(selectedPostId).get();
    if (!postDoc.exists) {
      return NextResponse.json({ success: false, error: "post not found" }, { status: 404 });
    }

    const postData = postDoc.data() as Record<string, unknown>;
    if (normalizeText(postData.userId) !== uid) {
      return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
    }

    const analyticsSnapshot = await db
      .collection("analytics")
      .where("userId", "==", uid)
      .where("postId", "==", selectedPostId)
      .get();
    const analyticsHistorySnapshot = await db
      .collection("analytics")
      .where("userId", "==", uid)
      .limit(80)
      .get();

    if (analyticsSnapshot.empty) {
      return NextResponse.json(
        {
          success: true,
          data: {
            reply:
              "この投稿には保存済み分析データがありません。先に分析ページで数値を保存してから、再度質問してください。",
            suggestedQuestions: SUGGESTED_QUESTIONS,
          },
        },
        { status: 200 },
      );
    }

    await assertAiOutputAvailable({
      uid,
      userProfile,
    });

    const latestAnalyticsDoc = analyticsSnapshot.docs
      .map((doc) => ({
        data: doc.data() as AnalyticsDoc,
        createdAt: toDate((doc.data() as AnalyticsDoc).createdAt)?.getTime() || 0,
      }))
      .sort((a, b) => b.createdAt - a.createdAt)[0]?.data;

    if (!latestAnalyticsDoc) {
      return NextResponse.json(
        { success: false, error: "analytics data is unavailable" },
        { status: 500 },
      );
    }

    const postTypeRaw = normalizeText(postData.postType || latestAnalyticsDoc.category || "feed");
    const postType: "feed" | "reel" | "story" =
      postTypeRaw === "reel" ? "reel" : postTypeRaw === "story" ? "story" : "feed";

    const title = normalizeText(postData.title);
    const postContent = normalizeContent(postData.content);
    const publishedDate = formatDateJa(
      toDate(latestAnalyticsDoc.publishedAt) ||
        toDate(postData.publishedAt) ||
        toDate(postData.scheduledDate) ||
        toDate(postData.createdAt),
    );
    const publishedTime = formatTime(
      latestAnalyticsDoc.publishedTime || postData.publishedTime || postData.scheduledTime,
    );
    const intent = detectIntent(message);
    const shouldUseAiForGrowthAdvice = intent === "why_grew" || intent === "next_change";
    const imageUrl = normalizeImageUrl(postData.imageUrl || postData.thumbnail);

    const likes = toNumber(latestAnalyticsDoc.likes);
    const comments = toNumber(latestAnalyticsDoc.comments);
    const shares = toNumber(latestAnalyticsDoc.shares);
    const reposts = toNumber(latestAnalyticsDoc.reposts);
    const saves = toNumber(latestAnalyticsDoc.saves);
    const followerIncrease = toNumber(latestAnalyticsDoc.followerIncrease);
    const comparisonContext = buildComparisonContext({
      selectedPostId,
      postType,
      currentTitle: title,
      currentContent: postContent,
      current: {
        likes,
        comments,
        shares,
        saves,
        reposts,
        followerIncrease,
      },
      history: analyticsHistorySnapshot.docs.map((doc) => doc.data() as AnalyticsDoc),
    });
    const interactionCount =
      postType === "reel"
        ? toNumber(latestAnalyticsDoc.reelInteractionCount) || likes + comments + shares + saves + reposts
        : toNumber(latestAnalyticsDoc.interactionCount) || likes + comments + shares + saves + reposts;

    const aiGeneratedAdvice = shouldUseAiForGrowthAdvice
      ? await generateGrowthAdvice({
          title,
          postType,
          postContent,
          publishedDate,
          publishedTime,
          imageUrl,
          comparisonContext,
          analytics: {
            likes,
            comments,
            shares,
            saves,
            reposts,
            followerIncrease,
            interactionCount,
          },
          algorithmBrief,
          monthlyActionFocusPrompt,
        })
      : null;

    const result = buildSummary({
      postType,
      postContent,
      publishedDate,
      publishedTime,
      comparisonContext,
      analytics: latestAnalyticsDoc,
      message,
      aiGeneratedAdvice,
    });

    const usage = await consumeAiOutput({
      uid,
      userProfile,
      feature: "instagram_posts_advisor_chat",
    });

    await logImplicitAiAction({
      uid,
      feature: "instagram_posts_advisor_chat",
      title: title || "分析チャットβ",
      action: aiGeneratedAdvice?.action || result.reply.split("\n").slice(-2).join(" "),
      metadata: {
        selectedPostId,
        postType,
        question: message,
      },
    });

    const responseBody = { success: true, data: result, usage };
    await completeAiRequestLock({
      uid,
      feature: "instagram_posts_advisor_chat",
      requestKey: idempotencyKey,
      payload: { status: 200, body: responseBody },
    }).catch(() => undefined);
    return NextResponse.json(responseBody);
  } catch (error) {
    if (error instanceof AiUsageLimitError) {
      if (idempotencyContext) {
        await failAiRequestLock({
          uid: idempotencyContext.uid,
          feature: "instagram_posts_advisor_chat",
          requestKey: idempotencyContext.requestKey,
        }).catch(() => undefined);
      }
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
        { status: 429 },
      );
    }
    if (idempotencyContext) {
      await failAiRequestLock({
        uid: idempotencyContext.uid,
        feature: "instagram_posts_advisor_chat",
        requestKey: idempotencyContext.requestKey,
      }).catch(() => undefined);
    }
    console.error("instagram posts advisor chat error:", error);
    return NextResponse.json(
      { success: false, error: "チャット応答の生成に失敗しました" },
      { status: 500 },
    );
  }
}
