import { NextRequest, NextResponse } from "next/server";
import { getMasterContext } from "../monthly-analysis/infra/firestore/master-context";
import type { PostLearningSignal } from "../monthly-analysis/types";
import { adminDb } from "@/lib/firebase-admin";
import { getUserProfile } from "@/lib/server/user-profile";
import { fetchAIDirection } from "@/lib/ai/context";

interface PostInsightRequest {
  userId?: string;
  postId?: string;
  forceRefresh?: boolean;
}

interface CoachingModePromptParams {
  aiDirection: Awaited<ReturnType<typeof fetchAIDirection>>;
  currentFollowers: number;
  planInfo: {
    targetFollowers: number;
    targetAudience: string;
    kpi: {
      targetFollowers: number;
      strategies: string[];
      postCategories: string[];
    };
  } | null;
  analyticsMetrics: {
    likes: number;
    comments: number;
    shares: number;
    reach: number;
    saves: number;
    followerIncrease: number;
    engagementRate: number;
    reachFollowerPercent: number;
    interactionCount: number;
    interactionFollowerPercent: number;
    audience: Record<string, unknown> | null;
    reachSource: Record<string, unknown> | null;
  } | null;
  payload: {
    post?: {
      title?: string;
      category?: string;
      hasImageData?: boolean;
      [key: string]: unknown;
    };
    analytics?: {
      reposts?: number;
      [key: string]: unknown;
    } | null;
    [key: string]: unknown;
  };
  benchmark: BenchmarkResult;
}

interface LearningModePromptParams extends CoachingModePromptParams {
  signal: Partial<PostLearningSignal>;
  cluster: PostLearningSignal["cluster"];
  comparisons: PostLearningSignal["comparisons"];
  significance: PostLearningSignal["significance"];
  winningPatterns: {
    topPerformers: Array<{
      title: string;
      followerIncrease: number;
      reach: number;
      category: string;
    }>;
    clusterPatterns: Array<{
      label: string;
      count: number;
      avgFollowerIncrease: number;
      avgReach: number;
      avgEngagement: number;
      examples: string[];
    }>;
  } | null;
}

type ReactionMetrics = {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  followerIncrease: number;
  reposts: number;
};

type BenchmarkResult = {
  sampleSize: number;
  averages: ReactionMetrics & { score: number };
  current: ReactionMetrics & { score: number };
  scoreDiffPercent: number | null;
  scoreLabel: "higher" | "lower" | "same" | "learning";
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizePostId = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
};

const canAnalyzeImageUrl = async (imageUrl: string | null): Promise<boolean> => {
  if (!imageUrl) {
    return false;
  }
  if (imageUrl.startsWith("data:image/")) {
    return true;
  }
  if (!/^https?:\/\//.test(imageUrl)) {
    return false;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(imageUrl, {
      method: "HEAD",
      signal: controller.signal,
      cache: "no-store",
    });
    const contentType = response.headers.get("content-type") || "";
    return response.ok && contentType.startsWith("image/");
  } catch (_error) {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

const clampPercent = (value: number): number => Math.max(-999, Math.min(999, value));

const calcReactionScore = (metrics: ReactionMetrics): number => {
  return (
    metrics.likes * 1 +
    metrics.comments * 2 +
    metrics.shares * 3 +
    metrics.saves * 2 +
    metrics.followerIncrease * 4 +
    metrics.reposts * 2
  );
};

const buildBenchmarkSummary = (benchmark: BenchmarkResult): string => {
  if (benchmark.sampleSize < 3 || benchmark.scoreDiffPercent === null) {
    return `判定基準: 比較対象が${benchmark.sampleSize}件のため学習中（3件以上で比較判定）`;
  }

  const diffText =
    benchmark.scoreDiffPercent > 0
      ? `+${benchmark.scoreDiffPercent}%`
      : `${benchmark.scoreDiffPercent}%`;

  const toneText =
    benchmark.scoreLabel === "higher"
      ? "直近平均より反応が高めです"
      : benchmark.scoreLabel === "lower"
        ? "直近平均より反応が低めです"
        : "直近平均と同水準です";

  return `判定基準: 直近${benchmark.sampleSize}投稿平均との差（反応スコア ${diffText}）${toneText}`;
};

const isVagueText = (value: string): boolean => {
  const text = String(value || "").trim();
  if (!text) {
    return true;
  }
  const vagueKeywords = [
    "魅力的",
    "工夫",
    "見直す",
    "改善",
    "強化",
    "意識",
    "検討",
    "最適化",
    "クオリティ",
    "わかりやすく",
  ];
  const hasVague = vagueKeywords.some((keyword) => text.includes(keyword));
  const hasSpecificNumber = /\d+/.test(text);
  return hasVague && !hasSpecificNumber;
};

const concreteActionTemplates = (postType: string): string[] => {
  if (postType === "reel") {
    return [
      "冒頭3秒で商品名とベネフィットを12文字以内のテロップで表示してみてください",
      "15〜30秒の中で1カット2秒以内を目安に編集し、最後に保存CTAを1行入れてください",
    ];
  }
  if (postType === "story") {
    return [
      "1枚目に結論を15文字以内で配置し、2枚目で詳細を補足する2枚構成にしてみてください",
      "質問スタンプで二択を入れ、回答しやすい短文の問いかけを添えてください",
    ];
  }
  return [
    "1枚目は主役の商品を画面の70%で中央配置し、余白を上下10%残してみてください",
    "キャプション冒頭20文字以内でベネフィットを1つ明記し、文末に質問を1つ入れてください",
  ];
};

const concreteImageAdviceTemplates = (postType: string): string[] => {
  if (postType === "reel") {
    return [
      "冒頭カットは手元アップで質感を見せ、次のカットで商品全体が分かる引き画に切り替えてください",
      "テロップは1行12文字以内・2行までに絞り、背景とのコントラストを高めてください",
    ];
  }
  return [
    "主役の商品を中央に置き、背景は単色か木目で情報を増やしすぎない構図にしてみてください",
    "明るさを+10〜15程度上げ、文字は1行12文字以内にすると内容が伝わりやすくなります",
  ];
};

const enforceConcreteItems = (
  items: string[] | undefined,
  postType: string,
  fallbackTemplates: string[],
  limit = 2,
): string[] => {
  const normalized = (Array.isArray(items) ? items : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  const concreted = normalized.map((item, index) =>
    isVagueText(item) ? fallbackTemplates[index % fallbackTemplates.length] : item
  );

  const deduped: string[] = [];
  const keys = new Set<string>();
  for (const item of concreted) {
    const key = item.replace(/[。\s]/g, "");
    if (!key || keys.has(key)) {
      continue;
    }
    keys.add(key);
    deduped.push(item);
  }

  const withFallback = deduped.length > 0 ? deduped : concreteActionTemplates(postType);
  return withFallback.slice(0, limit);
};

async function callOpenAIForPostInsight(
  prompt: string,
  systemPrompt?: string,
  imageUrl?: string | null,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const defaultSystemPrompt = `あなたはInstagram運用のエキスパートアナリストです。投稿データ、分析データ、フィードバック、計画情報、事業内容を総合的に分析し、この投稿の良かった部分、改善すべきポイント、次は何をすべきか（次の一手）を具体的に提案してください。出力はJSONのみ。`;

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [{ type: "text", text: prompt }];

  if (
    imageUrl &&
    (imageUrl.startsWith("http://") ||
      imageUrl.startsWith("https://") ||
      imageUrl.startsWith("data:image/"))
  ) {
    userContent.push({
      type: "image_url",
      image_url: { url: imageUrl },
    });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content: systemPrompt || defaultSystemPrompt,
        },
        {
          role: "user",
          content: userContent,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// Coaching Mode（初月）：投稿の質の指導
function buildCoachingModePrompt(params: CoachingModePromptParams): string {
  const { analyticsMetrics, payload, benchmark } = params;
  const postType = payload?.post?.category || "feed";
  const hasImage = Boolean(payload?.post?.hasImageData);
  const reactionMetrics = {
    likes: analyticsMetrics?.likes ?? 0,
    comments: analyticsMetrics?.comments ?? 0,
    shares: analyticsMetrics?.shares ?? 0,
    saves: analyticsMetrics?.saves ?? 0,
    followerIncrease: analyticsMetrics?.followerIncrease ?? 0,
    reposts: (payload?.analytics?.reposts as number | undefined) ?? 0,
  };

  return `以下のInstagram分析データを見て、JSON形式で出力してください。

【重要】
- 根拠に使ってよいのは「反応データの数値」のみです
- 投稿文、ハッシュタグ、運用計画、事業情報、方針データは評価に使わないでください
- 閲覧数（リーチ）は評価対象にしないでください。リーチへの言及は禁止です
- 目標値との比較表現（例: 目標未達）は使わないでください
- 数字が0の場合も、断定的に否定せず「次に試す改善案」を提案してください
- 文体は初心者にもわかるやさしい日本語にしてください
- 文末はアドバイザーらしく「〜してみてください」「〜がおすすめです」を基本にしてください

【対象投稿タイプ】
${postType}

【反応データ（この数値だけを根拠にする）】
${JSON.stringify(reactionMetrics, null, 2)}

【判定基準（サーバー側計算済み）】
${JSON.stringify(benchmark, null, 2)}
- summary は必ず「判定基準: ...」で始めてください
- 「反応が少ない/多い」は sampleSize が3件以上のときのみ使用してください
- sampleSize が3件未満の場合は「学習中」と表現してください

【画像アドバイスの条件】
${hasImage ? `- 画像は提供されています。${postType}として「この画像で何が伝わるか」「どう改善すると良いか」を具体的に2-4点で出してください
- 抽象表現は避け、撮影・構図・明るさ・文字量など、実際に試せる助言にしてください` : "- 画像は提供されていません。imageAdvice は空配列にしてください"}

出力形式:
{
  "summary": "判定基準: ... で始まる要点（基準と評価を1文で明示）",
  "strengths": ["この投稿の良かった部分1", "この投稿の良かった部分2"],
  "improvements": ["改善すべきポイント1", "改善すべきポイント2"],
  "nextActions": ["次に試す具体アクション1", "次に試す具体アクション2"],
  "imageAdvice": ["画像に関する具体アドバイス1", "画像に関する具体アドバイス2（画像が無い場合は空配列）"],
  "goalAchievementProspect": "high" | "medium" | "low",
  "goalAchievementReason": "数値から見た見込み理由（1-2文）"
}
条件:
- 箇条書きは2-3個に収める
- 数値を適切に参照する（目安: 具体行動には文字数・秒数・比率のいずれかを1つ以上入れる）
- improvements と nextActions は内容が重複しないようにしてください
- 日本語で記述する`;
}

// サーバー側でパターン一致スコアを計算
function calculatePatternScore(
  cluster: PostLearningSignal["cluster"],
  comparisons: PostLearningSignal["comparisons"],
  significance: PostLearningSignal["significance"],
  winningPatterns: LearningModePromptParams["winningPatterns"],
  analyticsMetrics: { followerIncrease: number; reach: number } | null
): { score: number; match: "match" | "partial" | "mismatch"; rank: "core" | "edge" | "outlier" } {
  let score = 0;
  const maxScore = 100;

  // 1. クラスターパフォーマンス差（最大30点）
  // clusterPerformanceDiffが正の値なら、成功パターンに近い
  if (comparisons.clusterPerformanceDiff > 0) {
    score += Math.min(30, comparisons.clusterPerformanceDiff * 10);
  } else if (comparisons.clusterPerformanceDiff < -0.1) {
    score -= Math.min(20, Math.abs(comparisons.clusterPerformanceDiff) * 10);
  }

  // 2. クラスター中心からの距離（最大20点）
  // centroidDistanceが小さいほど、クラスターの中心に近い = パターンに一致
  if (cluster && cluster.id && cluster.centroidDistance >= 0) {
    // 距離が0に近いほど高スコア（逆比例）
    const distanceScore = Math.max(0, 20 - (cluster.centroidDistance * 5));
    score += distanceScore;
  }

  // 3. 統計的有意性（最大20点）
  // "higher"が多いほど成功パターンに近い
  let higherCount = 0;
  if (significance.reach === "higher") {higherCount++;}
  if (significance.engagement === "higher") {higherCount++;}
  if (significance.savesRate === "higher") {higherCount++;}
  if (significance.commentsRate === "higher") {higherCount++;}
  score += higherCount * 5;

  // "lower"が多いほど減点
  let lowerCount = 0;
  if (significance.reach === "lower") {lowerCount++;}
  if (significance.engagement === "lower") {lowerCount++;}
  if (significance.savesRate === "lower") {lowerCount++;}
  if (significance.commentsRate === "lower") {lowerCount++;}
  score -= lowerCount * 3;

  // 4. 勝ちパターンとの一致度（最大30点）
  if (winningPatterns && analyticsMetrics) {
    // トップクラスターパターンとの一致
    const currentFollowerIncrease = analyticsMetrics.followerIncrease || 0;
    const currentReach = analyticsMetrics.reach || 0;

    // トップパフォーマーとの比較
    if (winningPatterns.topPerformers.length > 0) {
      const avgTopFollowerIncrease = winningPatterns.topPerformers.reduce((sum, p) => sum + p.followerIncrease, 0) / winningPatterns.topPerformers.length;
      const avgTopReach = winningPatterns.topPerformers.reduce((sum, p) => sum + p.reach, 0) / winningPatterns.topPerformers.length;

      // フォロワー増加数が平均の80%以上なら一致とみなす
      if (currentFollowerIncrease >= avgTopFollowerIncrease * 0.8) {
        score += 15;
      } else if (currentFollowerIncrease >= avgTopFollowerIncrease * 0.5) {
        score += 8;
      }

      // リーチが平均の80%以上なら一致とみなす
      if (currentReach >= avgTopReach * 0.8) {
        score += 10;
      } else if (currentReach >= avgTopReach * 0.5) {
        score += 5;
      }
    }

    // クラスターパターンとの一致
    if (winningPatterns.clusterPatterns.length > 0 && cluster && cluster.id) {
      const matchingPattern = winningPatterns.clusterPatterns.find(p => p.label === cluster.label);
      if (matchingPattern) {
        // 同じクラスターに属していれば追加スコア
        score += 5;
      }
    }
  }

  // 5. 類似投稿数（最大5点）
  // 類似投稿が多いほど、パターンに一致している
  if (cluster && cluster.similarPosts.length > 0) {
    score += Math.min(5, cluster.similarPosts.length);
  }

  // スコアを0-100の範囲に正規化
  score = Math.max(0, Math.min(maxScore, score));

  // 判定結果を決定
  let match: "match" | "partial" | "mismatch";
  let rank: "core" | "edge" | "outlier";

  if (score >= 70) {
    match = "match";
    rank = "core";
  } else if (score >= 40) {
    match = "partial";
    rank = "edge";
  } else {
    match = "mismatch";
    rank = "outlier";
  }

  return { score: Math.round(score), match, rank };
}

// Learning Mode（2ヶ月目以降）：アカウントの傾向と照合
function buildLearningModePrompt(params: LearningModePromptParams): { prompt: string; systemPrompt: string; patternScore: number; patternMatch: "match" | "partial" | "mismatch"; patternRank: "core" | "edge" | "outlier" } {
  const { aiDirection, analyticsMetrics, payload, cluster, comparisons, significance, winningPatterns } = params;

  // サーバー側でパターンスコアと判定結果を計算
  const patternResult = calculatePatternScore(cluster, comparisons, significance, winningPatterns, analyticsMetrics);

  // サーバー側で計算した判定結果を構造化データとして渡す
  // AIには判定結果とスコアを渡し、説明を求める
  const patternAnalysis = {
    // 判定結果（サーバー側で決定済み）
    patternScore: patternResult.score,
    patternMatch: patternResult.match,
    patternRank: patternResult.rank,
    // 判定の根拠となるデータ（参考情報として）
    cluster: cluster && cluster.id ? {
      label: cluster.label,
      baselinePerformance: cluster.baselinePerformance,
      centroidDistance: cluster.centroidDistance,
      similarPostCount: cluster.similarPosts.length,
    } : null,
    comparisons: {
      clusterPerformanceDiff: comparisons.clusterPerformanceDiff,
      reachDiff: comparisons.reachDiff,
      savesRateDiff: comparisons.savesRateDiff,
      commentsRateDiff: comparisons.commentsRateDiff,
    },
    significance: {
      reach: significance.reach,
      engagement: significance.engagement,
      savesRate: significance.savesRate,
      commentsRate: significance.commentsRate,
    },
    winningPatterns: winningPatterns ? {
      topClusterPatterns: winningPatterns.clusterPatterns.map(p => ({
        label: p.label,
        avgFollowerIncrease: p.avgFollowerIncrease,
        avgReach: p.avgReach,
      })),
      topPerformers: winningPatterns.topPerformers.map(p => ({
        followerIncrease: p.followerIncrease,
        reach: p.reach,
        category: p.category,
      })),
    } : null,
  };

  const systemPrompt = `あなたはSNSアドバイザーではありません。
あなたはデータ解釈システムです。

あなたの第一目的は、サーバー側で計算された判定結果（patternScore, patternMatch, patternRank）を
人間が理解できる言葉に翻訳することです。

**重要**: あなたはパターンを判定してはいけません。
patternScoreを解釈し、なぜその判定になったのかを説明してください。

必ず以下の順序で思考してください：
1. patternScoreの意味を解釈（なぜこのスコアなのか）
2. patternMatchの判定理由を説明（過去投稿データの数値に基づく）
3. patternRankの意味を説明（core/edge/outlierの意味）
4. 例外の場合のみ改善提案（mismatchまたはoutlierの場合）

出力はJSONのみ。`;

  const prompt = `以下の判定結果を解釈し、人間が理解できる言葉に翻訳してください。

【判定結果（サーバー側で計算済み）】
- patternScore: ${patternResult.score}/100
- patternMatch: ${patternResult.match}
- patternRank: ${patternResult.rank}

【判定の根拠データ】
${JSON.stringify(patternAnalysis, null, 2)}

【投稿データ】
- タイトル: ${payload.post?.title || "タイトル未設定"}
- カテゴリ: ${payload.post?.category || "feed"}
- フォロワー増加数: ${analyticsMetrics?.followerIncrease || 0}人
- リーチ: ${analyticsMetrics?.reach || 0}
- いいね: ${analyticsMetrics?.likes || 0}
- コメント: ${analyticsMetrics?.comments || 0}
- 保存: ${analyticsMetrics?.saves || 0}

${aiDirection && aiDirection.lockedAt ? `【今月のAI方針】
- メインテーマ: ${aiDirection.mainTheme}
- 優先KPI: ${aiDirection.priorityKPI}
` : ""}

【出力形式】
{
  "patternReason": "判定理由（patternScore ${patternResult.score}、patternMatch ${patternResult.match}、patternRank ${patternResult.rank}の意味を、過去投稿データの数値に基づいて具体的に説明。1-2文）",
  "patternBasedPrediction": "今後フォロワーが増える見込み" | "伸びにくい" | "判断保留",
  "summary": "投稿全体の一言まとめ（30-60文字程度）",
  "strengths": ["この投稿の良かった部分（パターン一致の観点から）"],
  "improvements": ["改善すべきポイント（パターン不一致の場合のみ）"],
  "nextActions": ["次の投稿戦略（パターンに基づく具体的な提案）"]${aiDirection && aiDirection.lockedAt ? `,
  "directionAlignment": "一致" | "乖離" | "要注意",
  "directionComment": "今月のAI方針との関係性（1文）"
}` : ""},
  "imageAdvice": ["画像改善アドバイス1", "画像改善アドバイス2（画像が無い場合は空配列）"],
  "goalAchievementProspect": "high" | "medium" | "low",
  "goalAchievementReason": "目標達成見込みの評価理由（パターン一致度に基づく。1-2文）"
}

【重要】
- patternReasonは必ず出力してください（patternScore ${patternResult.score}、patternMatch ${patternResult.match}、patternRank ${patternResult.rank}の意味を説明）
- 判定は既にサーバー側で決定されています。あなたはその判定結果を解釈し、説明してください
- 判定を変更したり、独自の判定をしてはいけません
- エンゲージメント率に関する言及は一切行わないでください
- リーチ数、いいね数、コメント数など、目標値が設定されていない項目については、「目標に対して低い」などの目標との比較評価は行わないでください
- 文体は初心者にも分かる、やさしい日本語にしてください。強い否定・断定（例: 「全く反響がない」「成功の見込みが低い」）は使わないでください
- データが少ない場合は「現時点では判断材料が限られるため、まずはテスト投稿で傾向を確認しましょう」のように、前向きな表現にしてください`;

  return { 
    prompt, 
    systemPrompt, 
    patternScore: patternResult.score, 
    patternMatch: patternResult.match, 
    patternRank: patternResult.rank 
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PostInsightRequest;
    const { userId, postId, forceRefresh } = body;

    if (!userId || !postId) {
      return NextResponse.json(
        { success: false, error: "userId と postId は必須です" },
        { status: 400 }
      );
    }

    // 並列でデータを取得
    const [
      masterContext,
      postDoc,
      analyticsDoc,
      analyticsHistoryDoc,
      planDoc,
      followerCountDoc,
      userProfile,
    ] = await Promise.all([
      getMasterContext(userId, { forceRefresh }),
      adminDb.collection("posts").doc(postId).get(),
      adminDb.collection("analytics").where("userId", "==", userId).where("postId", "==", postId).limit(1).get(),
      adminDb.collection("analytics").where("userId", "==", userId).limit(50).get(),
      adminDb.collection("plans").where("userId", "==", userId).where("snsType", "==", "instagram").where("status", "==", "active").orderBy("createdAt", "desc").limit(1).get(),
      adminDb.collection("follower_counts").where("userId", "==", userId).where("snsType", "==", "instagram").orderBy("date", "desc").limit(1).get(),
      getUserProfile(userId),
    ]);

    const rawSignal = masterContext?.postPatterns?.signals?.find((item) => item.postId === postId);
    const signal = (rawSignal ?? {}) as Partial<PostLearningSignal>;

    const metrics: PostLearningSignal["metrics"] = signal.metrics
      ? {
          reach: signal.metrics.reach ?? 0,
          saves: signal.metrics.saves ?? 0,
          likes: signal.metrics.likes ?? 0,
          comments: signal.metrics.comments ?? 0,
          shares: signal.metrics.shares ?? 0,
          savesRate: signal.metrics.savesRate ?? 0,
          commentsRate: signal.metrics.commentsRate ?? 0,
          likesRate: signal.metrics.likesRate ?? 0,
          reachToFollowerRatio: signal.metrics.reachToFollowerRatio ?? 0,
          velocityScore: signal.metrics.velocityScore ?? 0,
          totalEngagement: signal.metrics.totalEngagement ?? 0,
          earlyEngagement: signal.metrics.earlyEngagement ?? null,
          watchTimeSeconds: signal.metrics.watchTimeSeconds ?? null,
          linkClicks: signal.metrics.linkClicks ?? null,
          impressions: signal.metrics.impressions ?? null,
        }
      : {
          reach: signal.reach ?? 0,
          saves: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          savesRate: 0,
          commentsRate: 0,
          likesRate: 0,
          reachToFollowerRatio: 0,
          velocityScore: 0,
          totalEngagement: signal.engagementRate ?? 0,
          earlyEngagement: null,
          watchTimeSeconds: null,
          linkClicks: null,
          impressions: null,
        };

    const comparisons: PostLearningSignal["comparisons"] = signal.comparisons
      ? {
          reachDiff: signal.comparisons.reachDiff ?? 0,
          engagementRateDiff: signal.comparisons.engagementRateDiff ?? 0,
          savesRateDiff: signal.comparisons.savesRateDiff ?? 0,
          commentsRateDiff: signal.comparisons.commentsRateDiff ?? 0,
          clusterPerformanceDiff: signal.comparisons.clusterPerformanceDiff ?? 0,
        }
      : {
          reachDiff: 0,
          engagementRateDiff: 0,
          savesRateDiff: 0,
          commentsRateDiff: 0,
          clusterPerformanceDiff: 0,
        };

    const significance: PostLearningSignal["significance"] = signal.significance
      ? {
          reach: signal.significance.reach ?? "neutral",
          engagement: signal.significance.engagement ?? "neutral",
          savesRate: signal.significance.savesRate ?? "neutral",
          commentsRate: signal.significance.commentsRate ?? "neutral",
        }
      : {
          reach: "neutral",
          engagement: "neutral",
          savesRate: "neutral",
          commentsRate: "neutral",
        };

    const cluster: PostLearningSignal["cluster"] = signal.cluster
      ? {
          id: signal.cluster.id ?? "",
          label: signal.cluster.label ?? "未分類",
          centroidDistance: signal.cluster.centroidDistance ?? 0,
          baselinePerformance: signal.cluster.baselinePerformance ?? 0,
          similarPosts: Array.isArray(signal.cluster.similarPosts)
            ? signal.cluster.similarPosts.map((similar) => ({
                postId: similar.postId ?? "",
                title: similar.title ?? "タイトル不明",
                performanceScore: similar.performanceScore ?? 0,
                publishedAt: similar.publishedAt ?? null,
              }))
            : [],
        }
      : {
          id: "",
          label: "未分類",
          centroidDistance: 0,
          baselinePerformance: signal.engagementRate ?? 0,
          similarPosts: [],
        };

    // 投稿データを取得
    const postData = postDoc.exists ? postDoc.data() : null;
    const postTitle = postData?.title || signal.title || "タイトル未設定";
    const postContent = postData?.content || "";
    const postHashtags = Array.isArray(postData?.hashtags) ? postData.hashtags : (Array.isArray(signal.hashtags) ? signal.hashtags : []);
    const postScheduledDate = postData?.scheduledDate?.toDate?.() || postData?.scheduledDate || postData?.publishedAt?.toDate?.() || postData?.publishedAt || null;
    const postScheduledTime = postData?.scheduledTime || postData?.publishedTime || "";

    // 分析データを取得
    const normalizedRequestedPostId = normalizePostId(postId);
    const matchedAnalyticsFromHistory = analyticsHistoryDoc.docs
      .map((doc) => doc.data())
      .find((item) => normalizePostId(item.postId) === normalizedRequestedPostId);

    const analyticsData =
      (!analyticsDoc.empty ? analyticsDoc.docs[0].data() : null) ||
      matchedAnalyticsFromHistory ||
      (postData?.analytics ? postData.analytics : null);
    const analyticsMetrics = analyticsData ? {
      likes: analyticsData.likes || 0,
      comments: analyticsData.comments || 0,
      shares: analyticsData.shares || 0,
      reach: analyticsData.reach || 0,
      saves: analyticsData.saves || 0,
      followerIncrease: analyticsData.followerIncrease || 0,
      reposts: analyticsData.reposts || 0,
      engagementRate: analyticsData.engagementRate || 0,
      reachFollowerPercent: analyticsData.reachFollowerPercent || 0,
      interactionCount: analyticsData.interactionCount || 0,
      interactionFollowerPercent: analyticsData.interactionFollowerPercent || 0,
      audience: analyticsData.audience || null,
      reachSource: analyticsData.reachSource || null,
    } : null;

    const currentCategory =
      signal.category ??
      (typeof analyticsData?.category === "string" ? analyticsData.category : null) ??
      postData?.postType ??
      "feed";
    const currentReactionMetrics: ReactionMetrics = {
      likes: toNumber(analyticsData?.likes),
      comments: toNumber(analyticsData?.comments),
      shares: toNumber(analyticsData?.shares),
      saves: toNumber(analyticsData?.saves),
      followerIncrease: toNumber(analyticsData?.followerIncrease),
      reposts: toNumber(analyticsData?.reposts),
    };

    const categoryAnalytics: Array<Record<string, unknown>> = analyticsHistoryDoc.docs
      .map((doc) => doc.data())
      .filter((item) => {
        const itemPostId = normalizePostId(item.postId);
        const itemCategory = typeof item.category === "string" ? item.category : "";
        if (itemPostId === normalizedRequestedPostId) {
          return false;
        }
        if (!itemCategory) {
          return true;
        }
        return itemCategory === currentCategory;
      })
      .slice(0, 10);

    const sampleSize = categoryAnalytics.length;
    const avgMetrics: ReactionMetrics = categoryAnalytics.reduce<ReactionMetrics>(
      (acc, item) => ({
        likes: acc.likes + toNumber(item.likes),
        comments: acc.comments + toNumber(item.comments),
        shares: acc.shares + toNumber(item.shares),
        saves: acc.saves + toNumber(item.saves),
        followerIncrease: acc.followerIncrease + toNumber(item.followerIncrease),
        reposts: acc.reposts + toNumber(item.reposts),
      }),
      { likes: 0, comments: 0, shares: 0, saves: 0, followerIncrease: 0, reposts: 0 }
    );

    const averages: ReactionMetrics =
      sampleSize > 0
        ? {
            likes: Math.round((avgMetrics.likes / sampleSize) * 10) / 10,
            comments: Math.round((avgMetrics.comments / sampleSize) * 10) / 10,
            shares: Math.round((avgMetrics.shares / sampleSize) * 10) / 10,
            saves: Math.round((avgMetrics.saves / sampleSize) * 10) / 10,
            followerIncrease: Math.round((avgMetrics.followerIncrease / sampleSize) * 10) / 10,
            reposts: Math.round((avgMetrics.reposts / sampleSize) * 10) / 10,
          }
        : { likes: 0, comments: 0, shares: 0, saves: 0, followerIncrease: 0, reposts: 0 };

    const currentScore = calcReactionScore(currentReactionMetrics);
    const averageScore = calcReactionScore(averages);
    const scoreDiffPercent =
      sampleSize >= 3
        ? averageScore === 0
          ? currentScore > 0
            ? 100
            : 0
          : clampPercent(Math.round(((currentScore - averageScore) / averageScore) * 100))
        : null;

    const benchmark: BenchmarkResult = {
      sampleSize,
      averages: {
        ...averages,
        score: Math.round(averageScore),
      },
      current: {
        ...currentReactionMetrics,
        score: Math.round(currentScore),
      },
      scoreDiffPercent,
      scoreLabel:
        sampleSize < 3 || scoreDiffPercent === null
          ? "learning"
          : scoreDiffPercent >= 15
            ? "higher"
            : scoreDiffPercent <= -15
              ? "lower"
              : "same",
    };

    // フィードバックデータを取得
    const feedbackSentiment = analyticsData?.sentiment || null;
    const feedbackMemo = analyticsData?.sentimentMemo || "";

    // 計画データを取得
    const planData = planDoc.empty ? null : planDoc.docs[0].data();
    const planInfo = planData ? {
      targetFollowers: planData.targetFollowers || 0,
      targetAudience: planData.targetAudience || planData.formData?.targetAudience || "",
      kpi: {
        targetFollowers: planData.targetFollowers || 0,
        strategies: Array.isArray(planData.strategies) ? planData.strategies : [],
        postCategories: Array.isArray(planData.postCategories) ? planData.postCategories : [],
      },
    } : null;

    // 現在のフォロワー数を取得
    let currentFollowers = 0;
    if (!followerCountDoc.empty) {
      const followerData = followerCountDoc.docs[0].data();
      currentFollowers = followerData.followers || followerData.startFollowers || 0;
    } else if (userProfile?.businessInfo?.initialFollowers) {
      currentFollowers = userProfile.businessInfo.initialFollowers;
    }

    // 事業内容を取得
    const businessInfo = userProfile?.businessInfo ? {
      industry: userProfile.businessInfo.industry || "",
      companySize: userProfile.businessInfo.companySize || "",
      businessType: userProfile.businessInfo.businessType || "",
      description: userProfile.businessInfo.description || "",
      targetMarket: Array.isArray(userProfile.businessInfo.targetMarket) 
        ? userProfile.businessInfo.targetMarket 
        : (userProfile.businessInfo.targetMarket ? [userProfile.businessInfo.targetMarket] : []),
      catchphrase: userProfile.businessInfo.catchphrase || "",
      goals: Array.isArray(userProfile.businessInfo.goals) ? userProfile.businessInfo.goals : [],
      challenges: Array.isArray(userProfile.businessInfo.challenges) ? userProfile.businessInfo.challenges : [],
    } : null;

    const aiImageUrl =
      (typeof analyticsData?.thumbnail === "string" && analyticsData.thumbnail.trim().length > 0
        ? analyticsData.thumbnail.trim()
        : null) ||
      (typeof postData?.imageUrl === "string" && postData.imageUrl.trim().length > 0
        ? postData.imageUrl.trim()
        : null);
    const hasAnalyzableImage = await canAnalyzeImageUrl(aiImageUrl);

    const payload = {
      // 投稿情報
      post: {
        id: signal.postId ?? postId,
        title: postTitle,
        content: postContent,
        hashtags: postHashtags,
        category: signal.category ?? postData?.postType ?? "feed",
        imageUrl: typeof postData?.imageUrl === "string" ? postData.imageUrl : null,
        hasImageData: hasAnalyzableImage,
        scheduledDate: postScheduledDate ? (postScheduledDate instanceof Date ? postScheduledDate.toISOString().split("T")[0] : String(postScheduledDate).split("T")[0]) : null,
        scheduledTime: postScheduledTime,
      },
      // 分析データ（分析ページで入力したデータ）
      analytics: analyticsMetrics,
      // フィードバック
      feedback: {
        sentiment: feedbackSentiment,
        memo: feedbackMemo,
      },
      // メトリクス（masterContextから）
      metrics,
      comparisons,
      significance,
      cluster,
      sentiment: {
        score: signal.sentimentScore ?? 0,
        label: signal.sentimentLabel ?? "neutral",
      },
      // 計画情報
      plan: planInfo,
      // 現在のフォロワー数
      currentFollowers,
      // 事業内容
      businessInfo,
    };

    // ai_direction（今月のAI方針）を取得
    const aiDirection = await fetchAIDirection(userId);

    // モード判定：投稿数に基づいてcoaching mode / learning modeを切り替え
    const isLearningMode = false;

    // アカウントの勝ちパターンを抽出（learning mode用）
    const winningPatterns = isLearningMode && masterContext?.postPatterns?.signals
      ? (() => {
          // フォロワー増加数が高い投稿を抽出
          const topPerformers = masterContext.postPatterns.signals
            .filter((s: PostLearningSignal) => (s.followerIncrease || 0) > 0)
            .sort((a: PostLearningSignal, b: PostLearningSignal) => (b.followerIncrease || 0) - (a.followerIncrease || 0))
            .slice(0, 5);
          
          // クラスター分析から勝ちパターンを抽出
          const clusterPatterns = masterContext.postPatterns.signals
            .filter((s: PostLearningSignal) => s.cluster?.baselinePerformance && s.cluster.baselinePerformance > 0)
            .reduce((acc: Record<string, {
              label: string;
              count: number;
              avgFollowerIncrease: number;
              avgReach: number;
              avgEngagement: number;
              examples: string[];
            }>, s: PostLearningSignal) => {
              const label = s.cluster?.label || "未分類";
              if (!acc[label]) {
                acc[label] = {
                  label,
                  count: 0,
                  avgFollowerIncrease: 0,
                  avgReach: 0,
                  avgEngagement: 0,
                  examples: [] as string[],
                };
              }
              acc[label].count++;
              acc[label].avgFollowerIncrease += s.followerIncrease || 0;
              acc[label].avgReach += s.reach || 0;
              acc[label].avgEngagement += s.engagementRate || 0;
              if (s.title && acc[label].examples.length < 3) {
                acc[label].examples.push(s.title);
              }
              return acc;
            }, {} as Record<string, {
              label: string;
              count: number;
              avgFollowerIncrease: number;
              avgReach: number;
              avgEngagement: number;
              examples: string[];
            }>);

          // 平均値を計算
          Object.values(clusterPatterns).forEach(pattern => {
            pattern.avgFollowerIncrease = pattern.avgFollowerIncrease / pattern.count;
            pattern.avgReach = pattern.avgReach / pattern.count;
            pattern.avgEngagement = pattern.avgEngagement / pattern.count;
          });

          return {
            topPerformers: topPerformers.map((s: PostLearningSignal) => ({
              title: s.title || "タイトル不明",
              followerIncrease: s.followerIncrease || 0,
              reach: s.reach || 0,
              category: s.category || "feed",
            })),
            clusterPatterns: Object.values(clusterPatterns)
              .sort((a: { avgFollowerIncrease: number }, b: { avgFollowerIncrease: number }) => b.avgFollowerIncrease - a.avgFollowerIncrease)
              .slice(0, 3),
          };
        })()
      : null;

    // プロンプトをモードに応じて生成
    let prompt: string;
    let systemPrompt: string | undefined;
    let serverPatternScore: number | null = null;
    let serverPatternMatch: "match" | "partial" | "mismatch" | null = null;
    let serverPatternRank: "core" | "edge" | "outlier" | null = null;
    
    if (isLearningMode) {
      const learningPrompt = buildLearningModePrompt({
        aiDirection,
        currentFollowers,
        planInfo,
        analyticsMetrics,
        payload,
        benchmark,
        signal,
        cluster,
        comparisons,
        significance,
        winningPatterns,
      });
      prompt = learningPrompt.prompt;
      systemPrompt = learningPrompt.systemPrompt;
      serverPatternScore = learningPrompt.patternScore;
      serverPatternMatch = learningPrompt.patternMatch;
      serverPatternRank = learningPrompt.patternRank;
    } else {
      prompt = buildCoachingModePrompt({
        aiDirection,
        currentFollowers,
        planInfo,
        analyticsMetrics,
        payload,
        benchmark,
      });
    }

    const rawResponse = await callOpenAIForPostInsight(prompt, systemPrompt, aiImageUrl);
    const trimmed = rawResponse.trim();
    
    // JSONを抽出（マークダウンコードブロックや余分なテキストを処理）
    let jsonText = trimmed;
    
    // マークダウンコードブロックからJSONを抽出
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1];
    } else {
      // コードブロックがない場合、最初の{から最後の}までを抽出
      const firstBrace = trimmed.indexOf("{");
      if (firstBrace !== -1) {
        let braceCount = 0;
        let lastBrace = -1;
        for (let i = firstBrace; i < trimmed.length; i++) {
          if (trimmed[i] === "{") {
            braceCount++;
          }
          if (trimmed[i] === "}") {
            braceCount--;
            if (braceCount === 0) {
              lastBrace = i;
              break;
            }
          }
        }
        if (lastBrace !== -1) {
          jsonText = trimmed.slice(firstBrace, lastBrace + 1);
        } else {
          // 最後の}が見つからない場合、正規表現で試す
          const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
          }
        }
      }
    }
    
    // JSONパース（エラーハンドリング付き）
    let parsed: {
      summary?: string;
      strengths?: string[];
      improvements?: string[];
      nextActions?: string[];
      directionAlignment?: "一致" | "乖離" | "要注意";
      directionComment?: string;
      goalAchievementProspect?: "high" | "medium" | "low";
      goalAchievementReason?: string;
      patternMatch?: "match" | "partial" | "mismatch" | "一致" | "部分一致" | "不一致";
      patternConfidence?: number;
      patternBasedPrediction?: "今後フォロワーが増える見込み" | "伸びにくい" | "判断保留";
      patternReason?: string;
      winningPattern?: string;
      imageAdvice?: string[];
    };
    
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSONパースエラー:", parseError);
      console.error("元のレスポンス:", rawResponse);
      console.error("抽出したJSON:", jsonText);
      throw new Error("AIの応答を解析できませんでした。再度お試しください。");
    }

    const mentionsReach = (value: string): boolean => /リーチ|閲覧数/.test(value);
    const stripReachMentions = (items: string[] | undefined): string[] =>
      (Array.isArray(items) ? items : []).filter((item) => typeof item === "string" && !mentionsReach(item));
    const normalizeForCompare = (value: string): string =>
      value
        .replace(/[・。\s]/g, "")
        .replace(/(必要があります|してみてください|がおすすめです|を見直す|を強化する|を取り入れる)/g, "");
    const dedupeBySimilarity = (items: string[]): string[] => {
      const seen = new Set<string>();
      const result: string[] = [];
      for (const raw of items) {
        const item = String(raw || "").trim();
        if (!item) {continue;}
        const key = normalizeForCompare(item);
        if (!key || seen.has(key)) {continue;}
        seen.add(key);
        result.push(item);
      }
      return result;
    };

    const sanitizedStrengths = stripReachMentions(parsed.strengths);
    const sanitizedImprovements = stripReachMentions(parsed.improvements);
    const sanitizedNextActions = stripReachMentions(parsed.nextActions);
    const sanitizedImageAdvice = stripReachMentions(parsed.imageAdvice);

    const benchmarkSummary = buildBenchmarkSummary(benchmark);
    const hasAnyReaction =
      currentReactionMetrics.likes > 0 ||
      currentReactionMetrics.comments > 0 ||
      currentReactionMetrics.shares > 0 ||
      currentReactionMetrics.saves > 0 ||
      currentReactionMetrics.followerIncrease > 0 ||
      currentReactionMetrics.reposts > 0;
    const rawSummary = typeof parsed.summary === "string" && !mentionsReach(parsed.summary)
      ? parsed.summary.trim()
      : "";
    const claimsAllZero = /全て0|すべて0|すべてが0|反応データ.*0/.test(rawSummary);
    const safeSummary = hasAnyReaction && claimsAllZero ? "" : rawSummary;
    parsed.summary = safeSummary.startsWith("判定基準:")
      ? safeSummary
      : `${benchmarkSummary}${safeSummary ? `。${safeSummary}` : ""}`;
    parsed.goalAchievementReason = typeof parsed.goalAchievementReason === "string" && !mentionsReach(parsed.goalAchievementReason)
      ? parsed.goalAchievementReason
      : "入力された反応データをもとに、改善余地があるポイントを確認しました。次回は改善アクションを試して比較するのがおすすめです。";
    parsed.strengths = dedupeBySimilarity(sanitizedStrengths);
    parsed.improvements = enforceConcreteItems(
      dedupeBySimilarity(sanitizedImprovements),
      payload?.post?.category || "feed",
      concreteActionTemplates(payload?.post?.category || "feed"),
      2,
    );
    parsed.nextActions = enforceConcreteItems(
      dedupeBySimilarity(sanitizedNextActions),
      payload?.post?.category || "feed",
      concreteActionTemplates(payload?.post?.category || "feed"),
      2,
    );
    parsed.imageAdvice = payload?.post?.hasImageData
      ? enforceConcreteItems(
          sanitizedImageAdvice,
          payload?.post?.category || "feed",
          concreteImageAdviceTemplates(payload?.post?.category || "feed"),
          2,
        )
      : [];

    // improvements（課題）と nextActions（実行策）が重複しないように分離
    const improvementKeys = new Set((parsed.improvements || []).map((item) => normalizeForCompare(item)));
    parsed.nextActions = (parsed.nextActions || []).filter((item) => !improvementKeys.has(normalizeForCompare(item)));

    if ((parsed.strengths?.length ?? 0) === 0) {
      parsed.strengths = benchmark.sampleSize < 3
        ? ["比較対象はまだ少ないですが、今回の数値を基準として次回の改善比較ができる状態です"]
        : ["直近平均との差を確認できるため、改善の優先順位をつけやすい状態です"];
    }
    if ((parsed.improvements?.length ?? 0) === 0) {
      parsed.improvements = concreteActionTemplates(payload?.post?.category || "feed").slice(0, 1);
    }
    if ((parsed.nextActions?.length ?? 0) === 0) {
      parsed.nextActions = concreteActionTemplates(payload?.post?.category || "feed").slice(1, 2);
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: typeof parsed.summary === "string" ? parsed.summary : "",
        strengths: Array.isArray(parsed.strengths)
          ? parsed.strengths.filter((item: unknown): item is string => typeof item === "string")
          : [],
        improvements: Array.isArray(parsed.improvements)
          ? parsed.improvements.filter((item: unknown): item is string => typeof item === "string")
          : [],
        nextActions: Array.isArray(parsed.nextActions)
          ? parsed.nextActions.filter((item: unknown): item is string => typeof item === "string")
          : [],
        directionAlignment: parsed.directionAlignment || null,
        directionComment: typeof parsed.directionComment === "string" ? parsed.directionComment : null,
        goalAchievementProspect: (parsed.goalAchievementProspect === "high" || parsed.goalAchievementProspect === "medium" || parsed.goalAchievementProspect === "low") 
          ? parsed.goalAchievementProspect 
          : null,
        goalAchievementReason: typeof parsed.goalAchievementReason === "string" ? parsed.goalAchievementReason : null,
        // learning mode用の追加フィールド（サーバー側で決定した値を優先）
        patternMatch: isLearningMode ? serverPatternMatch : null,
        patternScore: isLearningMode ? serverPatternScore : null,
        patternRank: isLearningMode ? serverPatternRank : null,
        patternConfidence: isLearningMode ? serverPatternScore : null, // patternScoreと同じ値
        patternBasedPrediction: isLearningMode && (
          parsed.patternBasedPrediction === "今後フォロワーが増える見込み" ||
          parsed.patternBasedPrediction === "伸びにくい" ||
          parsed.patternBasedPrediction === "判断保留"
        )
          ? parsed.patternBasedPrediction
          : null,
        patternReason: isLearningMode && typeof parsed.patternReason === "string" ? parsed.patternReason : null,
        winningPattern: isLearningMode && typeof parsed.winningPattern === "string" ? parsed.winningPattern : null,
        imageAdvice: Array.isArray(parsed.imageAdvice)
          ? parsed.imageAdvice.filter((item: unknown): item is string => typeof item === "string")
          : [],
      },
    });
  } catch (error) {
    console.error("投稿AIサマリー生成エラー:", error);
    
    // エラーの詳細をログに記録
    if (error instanceof Error) {
      console.error("エラーメッセージ:", error.message);
      console.error("エラースタック:", error.stack);
    } else {
      console.error("エラーオブジェクト:", JSON.stringify(error, null, 2));
    }
    
    const message = error instanceof Error ? error.message : "投稿AIサマリーの生成に失敗しました";

    if (
      message.includes("OpenAI API key not configured") ||
      message.includes("Incorrect API key")
    ) {
      const fallback = {
        summary:
          "投稿データは取得できていますが、AI要約の生成環境がまだ整っていないため暫定的なメッセージを表示しています。",
        strengths: [
          "投稿の指標データやフィードバック情報は正常に保存されています。",
          "次回のAI要約では、これらのデータをもとに強みと改善点を深掘りできます。",
        ],
        improvements: [
          "AI要約を利用するには、管理者によるシステム設定が完了するまでお待ちください。",
          "設定が完了次第、再度「AIサマリーを生成」ボタンから最新の要約を取得できます。",
        ],
        nextActions: [
          "必要に応じて管理者へ「AIサマリー機能の有効化」をご依頼ください。",
          "運用記録やフィードバックの入力を継続し、準備が整ったタイミングで再試行してください。",
        ],
        imageAdvice: [],
      };

      return NextResponse.json({
        success: true,
        data: fallback,
        warning:
          "OpenAI API キーが未設定または無効なため、フォールバックのサマリーを返しました。環境変数 OPENAI_API_KEY を設定してください。",
        requiresSetup: true,
      });
    }

    // エラーメッセージを安全に返す（機密情報を除外）
    const safeMessage = message.length > 200 ? "投稿AIサマリーの生成に失敗しました" : message;
    
    return NextResponse.json(
      {
        success: false,
        error: safeMessage,
      },
      { status: 500 }
    );
  }
}
