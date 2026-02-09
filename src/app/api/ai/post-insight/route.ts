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
    audience: any;
    reachSource: any;
  } | null;
  payload: any;
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

async function callOpenAIForPostInsight(prompt: string, systemPrompt?: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const defaultSystemPrompt = `あなたはInstagram運用のエキスパートアナリストです。投稿データ、分析データ、フィードバック、計画情報、事業内容を総合的に分析し、この投稿の良かった部分、改善すべきポイント、次は何をすべきか（次の一手）を具体的に提案してください。出力はJSONのみ。`;

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
          content: prompt,
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
  const { aiDirection, currentFollowers, planInfo, analyticsMetrics, payload } = params;

  return `以下のInstagram投稿データを分析し、JSON形式で出力してください。

${aiDirection && aiDirection.lockedAt ? `【今月のAI方針（最優先・必須参照）】
- メインテーマ: ${aiDirection.mainTheme}
- 避けるべき焦点: ${aiDirection.avoidFocus.join(", ")}
- 優先KPI: ${aiDirection.priorityKPI}
- 投稿ルール: ${aiDirection.postingRules.join(", ")}

**重要**: この投稿が上記の「今月のAI方針」と一致しているか、乖離しているかを必ず評価してください。

` : ""}【あなたの役割】
あなたはInstagram運用のトレーナーです。投稿の質を向上させるための具体的な指導を行ってください。

【分析のポイント】
- 投稿内容・ハッシュタグ・投稿日時を確認
- 分析ページで入力された分析データ（いいね数、コメント数、リーチ数、フォロワー増加数など）を評価
- 計画の目標フォロワー数・KPI・ターゲット層と比較
- **重要**: 現在のフォロワー数（${currentFollowers}人）と目標フォロワー数（${planInfo?.targetFollowers || 0}人）の差を正確に考慮してください
- **重要**: この投稿によるフォロワー増加数（${analyticsMetrics?.followerIncrease || 0}人）を正確に参照してください。フォロワー増加数が記入されている場合は、それを考慮して評価してください
- **重要**: リーチ数、いいね数、コメント数など、目標値が設定されていない項目については、「目標に対して低い」「目標に達していない」という評価は行わないでください。これらの項目には目標値が存在しないため、目標との比較はできません
- 事業内容・ターゲット市場を踏まえた提案
${aiDirection && aiDirection.lockedAt ? `- **今月のAI方針との一致/乖離を評価**` : ""}

【データの扱いに関する重要事項】
- **データがない項目について**: 分析ページに項目がない、または値が0の場合は、その項目について「データがない」または「未入力」として扱い、改善を求める指摘は行わないでください
- **フォロワー増加数について**: フォロワー増加数が記入されている場合は、その数値を正確に参照し、目標達成の評価に反映してください
- **エンゲージメント率について**: エンゲージメント率は分析ページに項目がないため、エンゲージメント率に関する言及は一切行わないでください
- **リーチ数、いいね数、コメント数などについて**: これらの項目には目標値が設定されていません。したがって、「目標に対して低い」「目標に達していない」「目標に対して高い」などの目標との比較評価は行わないでください。数値そのものの評価や、より良い結果を得るための改善提案は可能ですが、目標値との比較は絶対に行わないでください

【目標達成見込みの評価基準】
以下の3つの観点から総合的に評価してください：
1. **計画との整合性**: 運用計画の目標（フォロワー増加のみ。リーチ数、いいね数、コメント数などに目標値は設定されていない）に対して、この投稿がどの程度貢献しているか
2. **今月のAI方針との整合性**: メインテーマ、優先KPI、避けるべき焦点、投稿ルールに沿っているか
3. **投稿パフォーマンス**: リーチ、いいね、コメント、保存、シェアなどの数値を評価しますが、これらの項目には目標値が設定されていないため、目標との比較は行わず、数値そのものや改善の余地を評価してください

評価結果：
- **high（高）**: 計画や今月の方針に沿っており、目標達成が見込める投稿
- **medium（中）**: 部分的に計画に沿っているが、改善の余地がある投稿
- **low（低）**: 計画や今月の方針から乖離しており、目標達成が困難な投稿

出力形式:
{
  "summary": "投稿全体の一言まとめ（30-60文字程度）",
  "strengths": ["この投稿の良かった部分1", "この投稿の良かった部分2"],
  "improvements": ["改善すべきポイント1", "改善すべきポイント2"],
  "nextActions": ["次は何をすべきか？（次の一手）1", "次は何をすべきか？（次の一手）2"]${aiDirection && aiDirection.lockedAt ? `,
  "directionAlignment": "一致" | "乖離" | "要注意",
  "directionComment": "今月のAI方針との関係性を1文で説明（例: 「今月の重点「${aiDirection.mainTheme}」に沿った投稿です」または「今月の重点からズレています」）"
}` : ""},
  "goalAchievementProspect": "high" | "medium" | "low",
  "goalAchievementReason": "目標達成見込みの評価理由（計画内容、今月のAI方針、投稿パフォーマンスを総合的に評価した結果を1-2文で説明）"
}
条件:
- 箇条書きは2-3個に収める
- 具体的かつ実行しやすい表現にする
- 日本語で記述する
- 事業内容・ターゲット層・計画の目標を踏まえた提案にする
- 分析データの数値を具体的に参照する
- **重要**: フォロワー増加数が記入されている場合は、その数値を正確に参照し、「目標未達成」という評価は行わないでください。フォロワー増加数が大きい場合は、それを評価に含めてください
- **重要**: データがない項目（値が0またはnull、または分析ページに項目がない）については、改善を求める指摘は行わないでください
- **重要**: エンゲージメント率は分析ページに項目がないため、エンゲージメント率に関する言及は一切行わないでください。エンゲージメント率についての評価、改善提案、言及は一切含めないでください
- **最重要**: リーチ数、いいね数、コメント数、保存数、シェア数など、目標値が設定されていない項目については、「目標に対して低い」「目標に達していない」「目標に対して高い」などの目標との比較評価は絶対に行わないでください。これらの項目には目標値が存在しないため、目標との比較は不可能です。改善提案をする場合は、「より多くのリーチを獲得するために」「リーチを増やすために」という形で、目標値との比較ではなく、数値の向上を目指す提案としてください
${aiDirection && aiDirection.lockedAt ? `- **今月のAI方針「${aiDirection.mainTheme}」を必ず考慮して、「nextActions」を提案してください。月次レポートの提案と一貫性を持たせてください。**` : ""}

投稿データ:
${JSON.stringify(payload, null, 2)}`;
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
  if (significance.reach === "higher") higherCount++;
  if (significance.engagement === "higher") higherCount++;
  if (significance.savesRate === "higher") higherCount++;
  if (significance.commentsRate === "higher") higherCount++;
  score += higherCount * 5;

  // "lower"が多いほど減点
  let lowerCount = 0;
  if (significance.reach === "lower") lowerCount++;
  if (significance.engagement === "lower") lowerCount++;
  if (significance.savesRate === "lower") lowerCount++;
  if (significance.commentsRate === "lower") lowerCount++;
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
  "goalAchievementProspect": "high" | "medium" | "low",
  "goalAchievementReason": "目標達成見込みの評価理由（パターン一致度に基づく。1-2文）"
}

【重要】
- patternReasonは必ず出力してください（patternScore ${patternResult.score}、patternMatch ${patternResult.match}、patternRank ${patternResult.rank}の意味を説明）
- 判定は既にサーバー側で決定されています。あなたはその判定結果を解釈し、説明してください
- 判定を変更したり、独自の判定をしてはいけません
- エンゲージメント率に関する言及は一切行わないでください
- リーチ数、いいね数、コメント数など、目標値が設定されていない項目については、「目標に対して低い」などの目標との比較評価は行わないでください`;

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
      planDoc,
      followerCountDoc,
      userProfile,
    ] = await Promise.all([
      getMasterContext(userId, { forceRefresh }),
      adminDb.collection("posts").doc(postId).get(),
      adminDb.collection("analytics").where("userId", "==", userId).where("postId", "==", postId).limit(1).get(),
      adminDb.collection("plans").where("userId", "==", userId).where("snsType", "==", "instagram").where("status", "==", "active").orderBy("createdAt", "desc").limit(1).get(),
      adminDb.collection("follower_counts").where("userId", "==", userId).where("snsType", "==", "instagram").orderBy("date", "desc").limit(1).get(),
      getUserProfile(userId),
    ]);

    if (!masterContext?.postPatterns?.signals?.length) {
      return NextResponse.json(
        { success: false, error: "投稿分析データがまだ生成されていません" },
        { status: 404 }
      );
    }

    const rawSignal = masterContext.postPatterns.signals.find((item) => item.postId === postId);

    if (!rawSignal) {
      return NextResponse.json(
        { success: false, error: "対象の投稿分析データが見つかりません" },
        { status: 404 }
      );
    }

    const signal = rawSignal as Partial<PostLearningSignal>;

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
    const analyticsData = analyticsDoc.empty ? null : analyticsDoc.docs[0].data();
    const analyticsMetrics = analyticsData ? {
      likes: analyticsData.likes || 0,
      comments: analyticsData.comments || 0,
      shares: analyticsData.shares || 0,
      reach: analyticsData.reach || 0,
      saves: analyticsData.saves || 0,
      followerIncrease: analyticsData.followerIncrease || 0,
      engagementRate: analyticsData.engagementRate || 0,
      reachFollowerPercent: analyticsData.reachFollowerPercent || 0,
      interactionCount: analyticsData.interactionCount || 0,
      interactionFollowerPercent: analyticsData.interactionFollowerPercent || 0,
      audience: analyticsData.audience || null,
      reachSource: analyticsData.reachSource || null,
    } : null;

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

    const payload = {
      // 投稿情報
      post: {
        id: signal.postId ?? "",
        title: postTitle,
        content: postContent,
        hashtags: postHashtags,
        category: signal.category ?? "feed",
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
    const signalCount = masterContext?.postPatterns?.signals?.length || 0;
    const isLearningMode = signalCount >= 5; // 5件以上でlearning mode

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
      });
    }

    const rawResponse = await callOpenAIForPostInsight(prompt, systemPrompt);
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
    };
    
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSONパースエラー:", parseError);
      console.error("元のレスポンス:", rawResponse);
      console.error("抽出したJSON:", jsonText);
      throw new Error("AIの応答を解析できませんでした。再度お試しください。");
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
