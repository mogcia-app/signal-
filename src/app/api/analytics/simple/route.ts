import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import { syncPlanFollowerProgress } from "../../../../lib/plans/sync-follower-progress";
import { getMasterContext } from "../../ai/monthly-analysis/infra/firestore/master-context";
import { getUserProfile } from "@/lib/server/user-profile";
import type { PostLearningSignal } from "../../ai/monthly-analysis/types";
import * as admin from "firebase-admin";

/**
 * analyticsコレクションのfollowerIncreaseの合計を計算
 * 注意: follower_countsは更新しない（homeページで入力された値はそのまま保持）
 */
async function calculateMonthlyFollowerIncreaseFromAnalytics(userId: string, publishedAt: Date): Promise<number> {
  try {
    // 投稿日から月を取得
    const month = `${publishedAt.getFullYear()}-${String(publishedAt.getMonth() + 1).padStart(2, "0")}`;
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
    const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
    const endTimestamp = admin.firestore.Timestamp.fromDate(endDate);

    // 今月のanalyticsデータからfollowerIncreaseの合計を計算
    const monthlyAnalyticsSnapshot = await adminDb
      .collection("analytics")
      .where("userId", "==", userId)
      .where("snsType", "==", "instagram")
      .where("publishedAt", ">=", startTimestamp)
      .where("publishedAt", "<=", endTimestamp)
      .get();

    const monthlyFollowerIncrease = monthlyAnalyticsSnapshot.docs.reduce((sum, doc) => {
      const value = Number(doc.data().followerIncrease) || 0;
      return sum + value;
    }, 0);

    return monthlyFollowerIncrease;
  } catch (error) {
    console.error("analyticsフォロワー増加数計算エラー:", error);
    return 0;
  }
}

/**
 * AIアドバイスを自動生成して保存する（非同期処理）
 * マスターコンテキストがまだ生成されていない場合は、エラーを無視
 */
async function generateAndSaveAIAdvice(
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
      .collection("analytics")
      .where("userId", "==", userId)
      .where("postId", "==", postId)
      .limit(1)
      .get();

    const analyticsData = analyticsDoc.empty ? null : analyticsDoc.docs[0].data();

    // 計画データを取得
    const planDoc = await adminDb
      .collection("plans")
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
        sentiment: analyticsData?.sentiment || null,
        memo: analyticsData?.sentimentMemo || "",
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
      currentFollowers: 0,
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

    const prompt = `以下のInstagram投稿データを分析し、JSON形式で出力してください。

【分析のポイント】
- 投稿内容・ハッシュタグ・投稿日時を確認
- 分析ページで入力された分析データ（いいね数、コメント数、リーチ数など）を評価
- フィードバック（満足度・メモ）を考慮
- 計画の目標フォロワー数・KPI・ターゲット層と比較
- 現在のフォロワー数と目標の差を考慮
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
    await adminDb.collection("ai_post_summaries").doc(docId).set(
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
      .collection("analytics")
      .where("userId", "==", uid)
      .orderBy("publishedAt", "desc")
      .get();

    const analyticsData = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        publishedAt: data.publishedAt?.toDate?.()?.toISOString() ?? data.publishedAt,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
      };
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
      sentiment,
      sentimentMemo,
    } = body;

    const resolvedUserId = bodyUserId ?? uid;
    if (resolvedUserId !== uid) {
      return NextResponse.json(
        { success: false, error: "Forbidden: cannot create analytics for another user." },
        { status: 403 },
      );
    }

    const now = new Date();
    const analyticsData = {
      userId: uid,
      postId: postId || null,
      snsType: "instagram",
      postType: category || "feed",
      likes: Number.parseInt(likes) || 0,
      comments: Number.parseInt(comments) || 0,
      shares: Number.parseInt(shares) || 0,
      reposts: Number.parseInt(reposts) || 0,
      reach: Number.parseInt(reach) || 0,
      saves: Number.parseInt(saves) || 0,
      followerIncrease: Number.parseInt(followerIncrease) || 0,
      engagementRate: 0,
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      publishedTime: publishedTime || "",
      title: title || "",
      content: content || "",
      hashtags: hashtags || [],
      thumbnail: thumbnail || "",
      category: category || "feed",
      reachFollowerPercent: Number.parseFloat(reachFollowerPercent) || 0,
      interactionCount: Number.parseInt(interactionCount) || 0,
      interactionFollowerPercent: Number.parseFloat(interactionFollowerPercent) || 0,
      reachSourceProfile: Number.parseInt(reachSourceProfile) || 0,
      reachSourceFeed: Number.parseInt(reachSourceFeed) || 0,
      reachSourceExplore: Number.parseInt(reachSourceExplore) || 0,
      reachSourceSearch: Number.parseInt(reachSourceSearch) || 0,
      reachSourceOther: Number.parseInt(reachSourceOther) || 0,
      reachedAccounts: Number.parseInt(reachedAccounts) || 0,
      profileVisits: Number.parseInt(profileVisits) || 0,
      profileFollows: Number.parseInt(profileFollows) || 0,
      externalLinkTaps: Number.parseInt(externalLinkTaps) || 0,
      reelReachFollowerPercent: Number.parseFloat(reelReachFollowerPercent) || 0,
      reelInteractionCount: Number.parseInt(reelInteractionCount) || 0,
      reelInteractionFollowerPercent: Number.parseFloat(reelInteractionFollowerPercent) || 0,
      reelReachSourceProfile: Number.parseInt(reelReachSourceProfile) || 0,
      reelReachSourceReel: Number.parseInt(reelReachSourceReel) || 0,
      reelReachSourceExplore: Number.parseInt(reelReachSourceExplore) || 0,
      reelReachSourceSearch: Number.parseInt(reelReachSourceSearch) || 0,
      reelReachSourceOther: Number.parseInt(reelReachSourceOther) || 0,
      reelReachedAccounts: Number.parseInt(reelReachedAccounts) || 0,
      reelSkipRate: Number.parseFloat(reelSkipRate) || 0,
      reelNormalSkipRate: Number.parseFloat(reelNormalSkipRate) || 0,
      reelPlayTime: Number.parseInt(reelPlayTime) || 0,
      reelAvgPlayTime: Number.parseFloat(reelAvgPlayTime) || 0,
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
      sentiment: sentiment || null,
      sentimentMemo: sentimentMemo || "",
      createdAt: now,
      updatedAt: now,
    };

    const analyticsCollection = adminDb.collection("analytics");

    if (analyticsData.postId) {
      const existingSnapshot = await analyticsCollection
        .where("userId", "==", uid)
        .where("postId", "==", analyticsData.postId)
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        const existingDoc = existingSnapshot.docs[0];
        const existingData = existingDoc.data();
        await existingDoc.ref.update({
          ...analyticsData,
          createdAt: existingData.createdAt ?? now,
        });
        await syncPlanFollowerProgress(uid);
        // follower_countsは更新しない（homeページで入力された値はそのまま保持）

        // 更新時もAIアドバイスを自動生成・保存
        // 非同期で実行（エラーが発生しても保存処理は成功として返す）
        generateAndSaveAIAdvice(uid, analyticsData.postId, category || "feed", title || "", hashtags || []).catch(
          (error) => {
            console.error("AIアドバイス自動生成エラー（非同期）:", error);
            // エラーをログに記録するだけで、ユーザーには影響しない
          }
        );

        return NextResponse.json({
          success: true,
          id: existingDoc.id,
          message: "Analytics data updated successfully",
        });
      }
    }

    const docRef = await analyticsCollection.add(analyticsData);
    await syncPlanFollowerProgress(uid);
    // follower_countsは更新しない（homeページで入力された値はそのまま保持）

    // postIdがある場合、バックグラウンドでAIアドバイスを自動生成・保存
    if (postId) {
      // 非同期で実行（エラーが発生しても保存処理は成功として返す）
      generateAndSaveAIAdvice(uid, postId, category || "feed", title || "", hashtags || []).catch(
        (error) => {
          console.error("AIアドバイス自動生成エラー（非同期）:", error);
          // エラーをログに記録するだけで、ユーザーには影響しない
        }
      );
    }

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


