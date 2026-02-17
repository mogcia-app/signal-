import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import { syncPlanFollowerProgress } from "../../../../lib/plans/sync-follower-progress";
import { getMasterContext } from "../../ai/monthly-analysis/infra/firestore/master-context";
import { getUserProfile } from "@/lib/server/user-profile";
import type { PostLearningSignal } from "../../ai/monthly-analysis/types";
import { COLLECTIONS } from "@/repositories/collections";
import {
  computeSuggestionOutcomeScore,
  recordSuggestionOutcome,
} from "@/lib/ai/suggestion-learning";
import { uploadPostImageDataUrl } from "@/lib/server/post-image-storage";
import * as admin from "firebase-admin";

// 注意: follower_countsは更新しない（homeページで入力された値はそのまま保持）
// analyticsのfollowerIncreaseは各投稿ごとに保存され、集計は表示側（kpi-breakdown等）で行う

/**
 * AIアドバイスを自動生成して保存する（非同期処理）
 * マスターコンテキストがまだ生成されていない場合は、エラーを無視
 */
async function _generateAndSaveAIAdvice(
  userId: string,
  postId: string,
  category: string,
  postTitle: string,
  postHashtags: string[]
): Promise<void> {
  try {
    // マスターコンテキストを取得（forceRefresh: falseでキャッシュを優先）
    const masterContext = await getMasterContext(userId, { forceRefresh: false });

    // マスターコンテキストがまだ生成されていない場合は、エラーを無視
    if (!masterContext?.postPatterns?.signals?.length) {
      console.log(`[AIアドバイス自動生成] マスターコンテキストがまだ生成されていません (userId: ${userId}, postId: ${postId})`);
      return;
    }

    const rawSignal = masterContext.postPatterns.signals.find((item) => item.postId === postId);
    if (!rawSignal) {
      console.log(`[AIアドバイス自動生成] 対象の投稿分析データが見つかりません (userId: ${userId}, postId: ${postId})`);
      return;
    }

    const signal = rawSignal as Partial<PostLearningSignal>;

    // 分析データを取得
    const analyticsDoc = await adminDb
      .collection(COLLECTIONS.ANALYTICS)
      .where("userId", "==", userId)
      .where("postId", "==", postId)
      .limit(1)
      .get();

    const analyticsData = analyticsDoc.empty ? null : analyticsDoc.docs[0].data();

    // 計画データを取得
    const planDoc = await adminDb
      .collection(COLLECTIONS.PLANS)
      .where("userId", "==", userId)
      .where("snsType", "==", "instagram")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    const planData = planDoc.empty ? null : planDoc.docs[0].data();

    // ユーザープロフィールを取得
    const userProfile = await getUserProfile(userId);

    // AIアドバイス生成のためのプロンプトを構築
    const metrics = signal.metrics || {
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

    const payload = {
      post: {
        id: signal.postId ?? postId,
        title: postTitle || signal.title || "タイトル未設定",
        content: "",
        hashtags: postHashtags,
        category: category || signal.category || "feed",
        scheduledDate: null,
        scheduledTime: "",
      },
      analytics: analyticsData
        ? {
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
          }
        : null,
      feedback: {
        sentiment: null,
        memo: "",
      },
      metrics,
      comparisons: signal.comparisons || {
        reachDiff: 0,
        engagementRateDiff: 0,
        savesRateDiff: 0,
        commentsRateDiff: 0,
        clusterPerformanceDiff: 0,
      },
      significance: signal.significance || {
        reach: "neutral",
        engagement: "neutral",
        savesRate: "neutral",
        commentsRate: "neutral",
      },
      cluster: signal.cluster || {
        id: "",
        label: "未分類",
        centroidDistance: 0,
        baselinePerformance: signal.engagementRate ?? 0,
        similarPosts: [],
      },
      sentiment: {
        score: signal.sentimentScore ?? 0,
        label: signal.sentimentLabel ?? "neutral",
      },
      plan: planData
        ? {
            targetFollowers: planData.targetFollowers || 0,
            targetAudience: planData.targetAudience || planData.formData?.targetAudience || "",
            kpi: {
              targetFollowers: planData.targetFollowers || 0,
              strategies: Array.isArray(planData.strategies) ? planData.strategies : [],
              postCategories: Array.isArray(planData.postCategories) ? planData.postCategories : [],
            },
          }
        : null,
      currentFollowers: planData?.actualFollowers ?? planData?.currentFollowers ?? 0,
      businessInfo: userProfile?.businessInfo
        ? {
            industry: userProfile.businessInfo.industry || "",
            companySize: userProfile.businessInfo.companySize || "",
            businessType: userProfile.businessInfo.businessType || "",
            description: userProfile.businessInfo.description || "",
            targetMarket: Array.isArray(userProfile.businessInfo.targetMarket)
              ? userProfile.businessInfo.targetMarket
              : userProfile.businessInfo.targetMarket
                ? [userProfile.businessInfo.targetMarket]
                : [],
            catchphrase: userProfile.businessInfo.catchphrase || "",
            goals: Array.isArray(userProfile.businessInfo.goals) ? userProfile.businessInfo.goals : [],
            challenges: Array.isArray(userProfile.businessInfo.challenges)
              ? userProfile.businessInfo.challenges
              : [],
          }
        : null,
    };

    // 現在のフォロワー数と目標フォロワー数を取得
    const currentFollowers = planData?.actualFollowers ?? planData?.currentFollowers ?? 0;
    const targetFollowers = planData?.targetFollowers ?? 0;
    const followerIncrease = analyticsData?.followerIncrease ?? 0;

    const prompt = `以下のInstagram投稿データを分析し、JSON形式で出力してください。

【分析のポイント】
- 投稿内容・ハッシュタグ・投稿日時を確認
- 分析ページで入力された分析データ（いいね数、コメント数、リーチ数、フォロワー増加数など）を評価
- フィードバック（満足度・メモ）を考慮
- 計画の目標フォロワー数・KPI・ターゲット層と比較
- **重要**: 現在のフォロワー数（${currentFollowers}人）と目標フォロワー数（${targetFollowers}人）の差を正確に考慮してください
- **重要**: この投稿によるフォロワー増加数（${followerIncrease}人）を正確に参照してください
- 事業内容・ターゲット市場を踏まえた提案

出力形式:
{
  "summary": "投稿全体の一言まとめ（30-60文字程度）",
  "strengths": ["この投稿の良かった部分1", "この投稿の良かった部分2"],
  "improvements": ["改善すべきポイント1", "改善すべきポイント2"],
  "nextActions": ["次は何をすべきか？（次の一手）1", "次は何をすべきか？（次の一手）2"]
}
条件:
- 箇条書きは2-3個に収める
- 具体的かつ実行しやすい表現にする
- 日本語で記述する
- 事業内容・ターゲット層・計画の目標を踏まえた提案にする
- 分析データの数値を具体的に参照する

投稿データ:
${JSON.stringify(payload, null, 2)}`;

    // OpenAI APIを呼び出し
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.log("[AIアドバイス自動生成] OpenAI API key not configured");
      return;
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
            content: `あなたはInstagram運用のエキスパートアナリストです。投稿データ、分析データ、フィードバック、計画情報、事業内容を総合的に分析し、この投稿の良かった部分、改善すべきポイント、次は何をすべきか（次の一手）を具体的に提案してください。出力はJSONのみ。`,
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
    const rawResponse = data.choices?.[0]?.message?.content ?? "";
    const trimmed = rawResponse.trim();

    // JSONを抽出
    let jsonText = trimmed;
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1];
    } else {
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
          const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
          }
        }
      }
    }

    const parsed = JSON.parse(jsonText) as {
      summary?: string;
      strengths?: string[];
      improvements?: string[];
      nextActions?: string[];
    };

    // ai_post_summariesコレクションに保存
    const docId = `${userId}_${postId}`;
    const now = new Date().toISOString();
    await adminDb.collection(COLLECTIONS.AI_POST_SUMMARIES).doc(docId).set(
      {
        userId,
        postId,
        category: category || "feed",
        postTitle: postTitle || undefined,
        summary: typeof parsed.summary === "string" ? parsed.summary : "",
        insights: Array.isArray(parsed.strengths)
          ? parsed.strengths.filter((item: unknown): item is string => typeof item === "string")
          : [],
        recommendedActions: [
          ...(Array.isArray(parsed.improvements)
            ? parsed.improvements.filter((item: unknown): item is string => typeof item === "string")
            : []),
          ...(Array.isArray(parsed.nextActions)
            ? parsed.nextActions.filter((item: unknown): item is string => typeof item === "string")
            : []),
        ],
        generatedAt: now,
        postHashtags: Array.isArray(postHashtags) ? postHashtags : undefined,
        postPublishedAt: analyticsData?.publishedAt?.toDate?.()?.toISOString() || null,
        updatedAt: now,
      },
      { merge: true }
    );

    console.log(`[AIアドバイス自動生成] 成功 (userId: ${userId}, postId: ${postId})`);
  } catch (error) {
    // エラーをログに記録するだけで、呼び出し元には影響しない
    console.error(`[AIアドバイス自動生成] エラー (userId: ${userId}, postId: ${postId}):`, error);
    throw error;
  }
}

async function syncPostImageFromThumbnail(
  userId: string,
  postId: string | null | undefined,
  thumbnail: unknown,
): Promise<void> {
  if (!postId || typeof thumbnail !== "string" || thumbnail.trim().length === 0) {
    return;
  }

  const normalized = thumbnail.trim();
  const postRef = adminDb.collection(COLLECTIONS.POSTS).doc(postId);
  const postDoc = await postRef.get();
  if (!postDoc.exists) {
    return;
  }

  const postData = postDoc.data() as { userId?: string } | undefined;
  if (postData?.userId !== userId) {
    return;
  }

  if (normalized.startsWith("data:image/")) {
    const uploaded = await uploadPostImageDataUrl({
      userId,
      imageDataUrl: normalized,
    });
    await postRef.update({
      imageUrl: uploaded.imageUrl,
      imageData: null,
      updatedAt: admin.firestore.Timestamp.now(),
    });
    return;
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    await postRef.update({
      imageUrl: normalized,
      updatedAt: admin.firestore.Timestamp.now(),
    });
  }
}

function toNumber(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeNumericString(value: unknown): string {
  return String(value ?? "")
    .replace(/[０-９．，－]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/,/g, "")
    .trim();
}

function toIntSafe(value: unknown): number {
  const normalized = normalizeNumericString(value);
  const matched = normalized.match(/-?\d+/);
  return matched ? Number.parseInt(matched[0], 10) : 0;
}

function toFloatSafe(value: unknown): number {
  const normalized = normalizeNumericString(value);
  const matched = normalized.match(/-?\d+(?:\.\d+)?/);
  return matched ? Number.parseFloat(matched[0]) : 0;
}

function calcInteractionRate(input: {
  likes: unknown;
  comments: unknown;
  shares: unknown;
  saves: unknown;
  reach: unknown;
}): number {
  const likes = toNumber(input.likes);
  const comments = toNumber(input.comments);
  const shares = toNumber(input.shares);
  const saves = toNumber(input.saves);
  const reach = toNumber(input.reach);
  if (reach <= 0) {
    return 0;
  }
  return Number((((likes + comments + shares + saves) / reach) * 100).toFixed(4));
}

async function evaluateAndRecordSuggestionOutcome(input: {
  userId: string;
  postId: string;
  postType: "feed" | "reel" | "story";
  likes: unknown;
  comments: unknown;
  shares: unknown;
  saves: unknown;
  reach: unknown;
  followerIncrease: unknown;
}): Promise<void> {
  try {
    const postDoc = await adminDb.collection(COLLECTIONS.POSTS).doc(input.postId).get();
    if (!postDoc.exists) {
      return;
    }

    const postData = postDoc.data() || {};
    const generationReferences = Array.isArray(postData.generationReferences)
      ? (postData.generationReferences as Array<Record<string, unknown>>)
      : [];
    const suggestionRef = generationReferences.find((ref) => {
      const metadata =
        ref && typeof ref === "object" && ref.metadata && typeof ref.metadata === "object"
          ? (ref.metadata as Record<string, unknown>)
          : null;
      return Boolean(metadata?.suggestionId && metadata?.patternKey);
    });

    if (!suggestionRef) {
      return;
    }

    const metadata = suggestionRef.metadata as Record<string, unknown>;
    const suggestionId = String(metadata.suggestionId || "").trim();
    const patternKey = String(metadata.patternKey || "").trim();
    const patternLabel = String(metadata.patternLabel || patternKey).trim();
    if (!suggestionId || !patternKey) {
      return;
    }

    const currentRate = calcInteractionRate({
      likes: input.likes,
      comments: input.comments,
      shares: input.shares,
      saves: input.saves,
      reach: input.reach,
    });

    const recentSnapshot = await adminDb
      .collection(COLLECTIONS.ANALYTICS)
      .where("userId", "==", input.userId)
      .orderBy("publishedAt", "desc")
      .limit(20)
      .get();
    const baselineRates = recentSnapshot.docs
      .map((doc) => doc.data() || {})
      .filter((data) => data.postId !== input.postId)
      .map((data) =>
        calcInteractionRate({
          likes: data.likes,
          comments: data.comments,
          shares: data.shares,
          saves: data.saves,
          reach: data.reach,
        })
      )
      .filter((rate) => rate > 0);

    const baselineRate =
      baselineRates.length > 0
        ? Number(
            (baselineRates.reduce((sum, rate) => sum + rate, 0) / baselineRates.length).toFixed(4)
          )
        : 0;
    const followerIncrease = toNumber(input.followerIncrease);
    const improved = currentRate >= baselineRate * 1.05 || followerIncrease > 0;
    const adopted = true;
    const score = computeSuggestionOutcomeScore({ adopted, improved });
    const resultDelta = Number((currentRate - baselineRate).toFixed(4));

    await recordSuggestionOutcome({
      userId: input.userId,
      suggestionId,
      patternKey,
      patternLabel,
      postType: input.postType,
      adopted,
      improved,
      score,
      resultDelta,
      feedback: `interactionRate=${currentRate.toFixed(3)} baseline=${baselineRate.toFixed(
        3
      )} followerIncrease=${followerIncrease}`,
    });
  } catch (error) {
    console.error("[Suggestion Learning] outcome recording error:", error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-simple-get", limit: 60, windowSeconds: 60 },
      auditEventName: "analytics_simple_get",
    });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? uid;

    if (userId !== uid) {
      return NextResponse.json(
        { success: false, error: "Forbidden: access to another user's analytics is not allowed." },
        { status: 403 },
      );
    }

    const querySnapshot = await adminDb
      .collection(COLLECTIONS.ANALYTICS)
      .where("userId", "==", uid)
      .orderBy("publishedAt", "desc")
      .get();

    const analyticsData = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      const followerIncrease = data.followerIncrease || 0;
      
      // デバッグログ: すべてのanalyticsデータのfollowerIncreaseを確認（0でも出力）
      console.log("[Analytics Simple GET] フォロワー増加数取得デバッグ:", {
        analyticsId: doc.id,
        postId: data.postId || null,
        followerIncrease,
        rawData: data.followerIncrease,
        rawDataType: typeof data.followerIncrease,
        allDataKeys: Object.keys(data),
        hasFollowerIncrease: 'followerIncrease' in data,
      });
      
      return {
        id: doc.id,
        ...data,
        followerIncrease, // 明示的に設定
        publishedAt: data.publishedAt?.toDate?.()?.toISOString() ?? data.publishedAt,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
      };
    });
    
    // デバッグログ: 全体の集計（GET）
    const totalFollowerIncrease = analyticsData.reduce((sum, a) => sum + (a.followerIncrease || 0), 0);
    console.log("[Analytics Simple GET] フォロワー増加数集計デバッグ:", {
      totalAnalyticsCount: analyticsData.length,
      totalFollowerIncrease,
      analyticsWithFollowerIncrease: analyticsData.filter(a => (a.followerIncrease || 0) > 0).length,
      userId: uid,
    });

    return NextResponse.json({
      success: true,
      data: analyticsData,
    });
  } catch (error) {
    console.error("Analytics fetch error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-simple-post", limit: 20, windowSeconds: 60 },
      auditEventName: "analytics_simple_post",
    });

    const body = await request.json();

    const {
      userId: bodyUserId,
      postId,
      likes,
      comments,
      shares,
      reposts,
      reach,
      saves,
      followerIncrease,
      publishedAt,
      publishedTime,
      title,
      content,
      hashtags,
      thumbnail,
      category,
      reachFollowerPercent,
      interactionCount,
      interactionFollowerPercent,
      reachSourceProfile,
      reachSourceFeed,
      reachSourceExplore,
      reachSourceSearch,
      reachSourceOther,
      reachedAccounts,
      profileVisits,
      profileFollows,
      externalLinkTaps,
      reelReachFollowerPercent,
      reelInteractionCount,
      reelInteractionFollowerPercent,
      reelReachSourceProfile,
      reelReachSourceReel,
      reelReachSourceExplore,
      reelReachSourceSearch,
      reelReachSourceOther,
      reelReachedAccounts,
      reelSkipRate,
      reelNormalSkipRate,
      reelPlayTime,
      reelAvgPlayTime,
      audience,
      reachSource,
      commentThreads,
    } = body;

    const resolvedUserId = bodyUserId ?? uid;
    if (resolvedUserId !== uid) {
      return NextResponse.json(
        { success: false, error: "Forbidden: cannot create analytics for another user." },
        { status: 403 },
      );
    }

    const now = admin.firestore.Timestamp.now();
    // publishedAtをTimestampに統一（Firestoreクエリで正しく動作するため）
    const publishedAtDate = publishedAt ? new Date(publishedAt) : new Date();
    const publishedAtTimestamp = admin.firestore.Timestamp.fromDate(publishedAtDate);
    
    const parsedFollowerIncrease = toIntSafe(followerIncrease);
    
    // デバッグログ: フォロワー増加数の保存前
    console.log("[Analytics Simple] フォロワー増加数保存デバッグ:", {
      userId: uid,
      postId: postId || null,
      rawFollowerIncrease: followerIncrease,
      parsedFollowerIncrease,
      category: category || "feed",
      publishedAt: publishedAt || null,
    });

    const analyticsData = {
      userId: uid,
      postId: postId || null,
      snsType: "instagram",
      postType: category || "feed",
      likes: toIntSafe(likes),
      comments: toIntSafe(comments),
      shares: toIntSafe(shares),
      reposts: toIntSafe(reposts),
      reach: toIntSafe(reach),
      saves: toIntSafe(saves),
      followerIncrease: parsedFollowerIncrease,
      engagementRate: 0,
      publishedAt: publishedAtTimestamp, // Timestamp型で統一
      publishedTime: publishedTime || "",
      title: title || "",
      content: content || "",
      hashtags: hashtags || [],
      thumbnail: thumbnail || "",
      category: category || "feed",
      reachFollowerPercent: toFloatSafe(reachFollowerPercent),
      interactionCount: toIntSafe(interactionCount),
      interactionFollowerPercent: toFloatSafe(interactionFollowerPercent),
      reachSourceProfile: toIntSafe(reachSourceProfile),
      reachSourceFeed: toIntSafe(reachSourceFeed),
      reachSourceExplore: toIntSafe(reachSourceExplore),
      reachSourceSearch: toIntSafe(reachSourceSearch),
      reachSourceOther: toIntSafe(reachSourceOther),
      reachedAccounts: toIntSafe(reachedAccounts),
      profileVisits: toIntSafe(profileVisits),
      profileFollows: toIntSafe(profileFollows),
      externalLinkTaps: toIntSafe(externalLinkTaps),
      reelReachFollowerPercent: toFloatSafe(reelReachFollowerPercent),
      reelInteractionCount: toIntSafe(reelInteractionCount),
      reelInteractionFollowerPercent: toFloatSafe(reelInteractionFollowerPercent),
      reelReachSourceProfile: toIntSafe(reelReachSourceProfile),
      reelReachSourceReel: toIntSafe(reelReachSourceReel),
      reelReachSourceExplore: toIntSafe(reelReachSourceExplore),
      reelReachSourceSearch: toIntSafe(reelReachSourceSearch),
      reelReachSourceOther: toIntSafe(reelReachSourceOther),
      reelReachedAccounts: toIntSafe(reelReachedAccounts),
      reelSkipRate: toFloatSafe(reelSkipRate),
      reelNormalSkipRate: toFloatSafe(reelNormalSkipRate),
      reelPlayTime: toIntSafe(reelPlayTime),
      reelAvgPlayTime: toFloatSafe(reelAvgPlayTime),
      audience: audience || null,
      reachSource: reachSource || null,
      commentThreads: Array.isArray(commentThreads)
        ? commentThreads
            .map((thread: { comment?: string; reply?: string }) => ({
              comment: typeof thread?.comment === "string" ? thread.comment.trim() : "",
              reply: typeof thread?.reply === "string" ? thread.reply.trim() : "",
            }))
            .filter((thread) => thread.comment || thread.reply)
        : [],
      createdAt: now,
      updatedAt: now,
    };

    const analyticsCollection = adminDb.collection(COLLECTIONS.ANALYTICS);

    if (analyticsData.postId) {
      const existingSnapshot = await analyticsCollection
        .where("userId", "==", uid)
        .where("postId", "==", analyticsData.postId)
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        const existingDoc = existingSnapshot.docs[0];
        const existingData = existingDoc.data();
        // createdAtは既存の値を保持（新規作成日時を維持）
        const existingCreatedAt = existingData.createdAt 
          ? (existingData.createdAt instanceof admin.firestore.Timestamp 
              ? existingData.createdAt 
              : admin.firestore.Timestamp.fromDate(existingData.createdAt instanceof Date ? existingData.createdAt : new Date(existingData.createdAt)))
          : now;
        await existingDoc.ref.update({
          ...analyticsData,
          createdAt: existingCreatedAt,
        });
        
        // デバッグログ: 更新後の確認
        const updatedDoc = await existingDoc.ref.get();
        const updatedData = updatedDoc.data();
        console.log("[Analytics Simple] フォロワー増加数更新後デバッグ:", {
          analyticsId: existingDoc.id,
          postId: analyticsData.postId,
          savedFollowerIncrease: updatedData?.followerIncrease,
          expectedFollowerIncrease: parsedFollowerIncrease,
          match: updatedData?.followerIncrease === parsedFollowerIncrease,
        });
        
        await syncPlanFollowerProgress(uid);
        // follower_countsは更新しない（homeページで入力された値はそのまま保持）

        if (analyticsData.postId) {
          await evaluateAndRecordSuggestionOutcome({
            userId: uid,
            postId: analyticsData.postId,
            postType: (category || "feed") as "feed" | "reel" | "story",
            likes,
            comments,
            shares,
            saves,
            reach,
            followerIncrease,
          });
        }

        await syncPostImageFromThumbnail(uid, analyticsData.postId, thumbnail);

        return NextResponse.json({
          success: true,
          id: existingDoc.id,
          message: "Analytics data updated successfully",
        });
      }
    }

    const docRef = await analyticsCollection.add(analyticsData);
    
    // デバッグログ: 新規作成後の確認
    const createdDoc = await docRef.get();
    const createdData = createdDoc.data();
    console.log("[Analytics Simple] フォロワー増加数新規作成後デバッグ:", {
      analyticsId: docRef.id,
      postId: analyticsData.postId,
      savedFollowerIncrease: createdData?.followerIncrease,
      expectedFollowerIncrease: parsedFollowerIncrease,
      match: createdData?.followerIncrease === parsedFollowerIncrease,
    });
    
    await syncPlanFollowerProgress(uid);
    // follower_countsは更新しない（homeページで入力された値はそのまま保持）

    if (postId) {
      await evaluateAndRecordSuggestionOutcome({
        userId: uid,
        postId,
        postType: (category || "feed") as "feed" | "reel" | "story",
        likes,
        comments,
        shares,
        saves,
        reach,
        followerIncrease,
      });
    }

    await syncPostImageFromThumbnail(uid, postId, thumbnail);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: "Analytics data saved successfully",
    });
  } catch (error) {
    console.error("Analytics save error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
