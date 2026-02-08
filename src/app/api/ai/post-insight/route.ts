import { NextRequest, NextResponse } from "next/server";
import { getMasterContext } from "../monthly-analysis/infra/firestore/master-context";
import type { PostLearningSignal } from "../monthly-analysis/types";
import { adminDb } from "@/lib/firebase-admin";
import { getUserProfile } from "@/lib/server/user-profile";
import { fetchAIDirection } from "@/lib/ai/context";
import * as admin from "firebase-admin";

interface PostInsightRequest {
  userId?: string;
  postId?: string;
  forceRefresh?: boolean;
}

async function callOpenAIForPostInsight(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
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
  return data.choices?.[0]?.message?.content ?? "";
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

    const prompt = `以下のInstagram投稿データを分析し、JSON形式で出力してください。

${aiDirection && aiDirection.lockedAt ? `【今月のAI方針（最優先・必須参照）】
- メインテーマ: ${aiDirection.mainTheme}
- 避けるべき焦点: ${aiDirection.avoidFocus.join(", ")}
- 優先KPI: ${aiDirection.priorityKPI}
- 投稿ルール: ${aiDirection.postingRules.join(", ")}

**重要**: この投稿が上記の「今月のAI方針」と一致しているか、乖離しているかを必ず評価してください。

` : ""}【分析のポイント】
- 投稿内容・ハッシュタグ・投稿日時を確認
- 分析ページで入力された分析データ（いいね数、コメント数、リーチ数など）を評価
- 計画の目標フォロワー数・KPI・ターゲット層と比較
- 現在のフォロワー数と目標の差を考慮
- 事業内容・ターゲット市場を踏まえた提案
${aiDirection && aiDirection.lockedAt ? `- **今月のAI方針との一致/乖離を評価**` : ""}

【目標達成見込みの評価基準】
以下の3つの観点から総合的に評価してください：
1. **計画との整合性**: 運用計画の目標（フォロワー増加、エンゲージメント向上など）に対して、この投稿がどの程度貢献しているか
2. **今月のAI方針との整合性**: メインテーマ、優先KPI、避けるべき焦点、投稿ルールに沿っているか
3. **投稿パフォーマンス**: リーチ、いいね、コメント、保存、シェアなどの数値が目標達成に寄与しているか

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
${aiDirection && aiDirection.lockedAt ? `- **今月のAI方針「${aiDirection.mainTheme}」を必ず考慮して、「nextActions」を提案してください。月次レポートの提案と一貫性を持たせてください。**` : ""}

投稿データ:
${JSON.stringify(payload, null, 2)}`;

    const rawResponse = await callOpenAIForPostInsight(prompt);
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
      },
    });
  } catch (error) {
    console.error("投稿AIサマリー生成エラー:", error);
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

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
