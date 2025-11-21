import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildPostGenerationPrompt } from "../../../../utils/aiPromptBuilder";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import { buildAIContext } from "@/lib/ai/context";
import { AIGenerationResponse, SnapshotReference, AIReference } from "@/types/ai";

// OpenAI APIの初期化
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

interface PostGenerationRequest {
  prompt: string;
  postType: "feed" | "reel" | "story";
  planData: {
    title: string;
    targetFollowers: number;
    currentFollowers: number;
    planPeriod: string;
    targetAudience: string;
    category: string;
    strategies: string[];
    aiPersona: {
      tone: string;
      style: string;
      personality: string;
      interests: string[];
    };
    simulation: {
      postTypes: {
        reel: { weeklyCount: number; followerEffect: number };
        feed: { weeklyCount: number; followerEffect: number };
        story: { weeklyCount: number; followerEffect: number };
      };
    };
  };
  scheduledDate?: string;
  scheduledTime?: string;
  action?: "suggestTime" | "generatePost";
  autoGenerate?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "ai-post-generation", limit: 30, windowSeconds: 60 },
      auditEventName: "ai_post_generation",
    });

    const body: PostGenerationRequest = await request.json();
    let { prompt } = body;
    const { postType, planData, scheduledDate, scheduledTime, action = "generatePost" } = body;

    let userProfile: Awaited<ReturnType<typeof buildAIContext>>["userProfile"];
    let latestPlan: Awaited<ReturnType<typeof buildAIContext>>["latestPlan"];
    let snapshotReferences: SnapshotReference[];
    let aiReferences: AIReference[];
    
    try {
      const contextResult = await buildAIContext(userId, { snapshotLimit: 3, includeMasterContext: true });
      userProfile = contextResult.userProfile;
      latestPlan = contextResult.latestPlan;
      snapshotReferences = contextResult.snapshotReferences;
      aiReferences = contextResult.references;
    } catch (contextError) {
      console.error("AIコンテキスト構築エラー:", contextError);
      // コンテキスト構築に失敗しても、planDataがあれば続行
      if (!planData) {
        return NextResponse.json(
          { error: "ユーザー情報の取得に失敗しました。運用計画データが必要です。" },
          { status: 500 }
        );
      }
      userProfile = null;
      latestPlan = null;
      snapshotReferences = [] as SnapshotReference[];
      aiReferences = [] as AIReference[];
    }

    // planDataの検証（自動生成の場合）
    if (body.autoGenerate && !planData && !latestPlan) {
      return NextResponse.json(
        { error: "自動生成には運用計画データが必要です。運用計画ページで計画を作成してください。" },
        { status: 400 }
      );
    }

    const planContext = latestPlan ?? planData ?? null;

    // 時間提案の場合
    if (action === "suggestTime") {
      try {
        // 過去の分析データを取得してエンゲージメントが高かった時間帯を分析
        const analyticsSnapshot = await adminDb
          .collection("analytics")
          .where("userId", "==", userId)
          .limit(50)
          .get();

        if (!analyticsSnapshot.empty) {
          // 時間帯別のエンゲージメント率を計算
          const timeSlotEngagement: Record<string, { totalEngagement: number; count: number }> = {};

          analyticsSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            const publishedTime = data.publishedTime;

            if (publishedTime && data.reach > 0) {
              const hour = publishedTime.split(":")[0];
              const engagement =
                (((data.likes || 0) + (data.comments || 0) + (data.shares || 0)) / data.reach) *
                100;

              if (!timeSlotEngagement[hour]) {
                timeSlotEngagement[hour] = { totalEngagement: 0, count: 0 };
              }

              timeSlotEngagement[hour].totalEngagement += engagement;
              timeSlotEngagement[hour].count += 1;
            }
          });

          // 平均エンゲージメント率が最も高い時間帯を取得
          let bestHour = "";
          let bestEngagement = 0;

          Object.entries(timeSlotEngagement).forEach(([hour, data]) => {
            const avgEngagement = data.totalEngagement / data.count;
            if (avgEngagement > bestEngagement) {
              bestEngagement = avgEngagement;
              bestHour = hour;
            }
          });

          if (bestHour) {
            const suggestedTime = `${bestHour}:00`;
            return NextResponse.json({
              success: true,
              data: {
                suggestedTime,
                postType,
                reason: `過去のデータ分析により、${bestHour}時台のエンゲージメント率が最も高いです（平均${bestEngagement.toFixed(2)}%）`,
                basedOnData: true,
              },
            });
          }
        }
      } catch (error) {
        console.error("データ分析エラー:", error);
        // エラー時はデフォルトロジックにフォールバック
      }

      // デフォルトの最適時間（初回または分析データがない場合）
      const optimalTimes = {
        feed: ["09:00", "12:00", "18:00", "20:00"],
        reel: ["07:00", "12:00", "19:00", "21:00"],
        story: ["08:00", "13:00", "18:00", "22:00"],
      };

      const times = optimalTimes[postType];
      const suggestedTime = times[Math.floor(Math.random() * times.length)];

      return NextResponse.json({
        success: true,
        data: {
          suggestedTime,
          postType,
          reason: `${postType === "feed" ? "フィード" : postType === "reel" ? "リール" : "ストーリーズ"}の一般的な最適時間です`,
          basedOnData: false,
        },
      });
    }

    // 投稿文生成の場合
    if (!prompt.trim()) {
      return NextResponse.json({ error: "投稿のテーマを入力してください" }, { status: 400 });
    }

    // OpenAI APIキーのチェック
    if (!openai) {
      return NextResponse.json(
        { 
          error: "OpenAI APIキーが設定されていません。管理者にお問い合わせください。",
        },
        { status: 500 }
      );
    }

    // 自動生成の場合、テーマを自動選択
    if (body.autoGenerate && body.prompt === "auto") {
      const autoThemes = [
        "今日の一枚📸",
        "おはようございます！今日も素敵な一日をお過ごしください✨",
        "ありがとうございます🙏",
        "フォローありがとうございます！",
        "いいねありがとうございます💕",
        "コメントありがとうございます！",
        "お疲れ様でした！",
        "素敵な週末をお過ごしください🌅",
        "新商品のご紹介✨",
        "お客様の声をご紹介します💬",
        "スタッフの日常をご紹介📷",
      ];

      // ランダムでテーマを選択
      prompt = autoThemes[Math.floor(Math.random() * autoThemes.length)];
    }

    // ✅ プロンプトビルダーを使用（PDCA - Do）
    let systemPrompt: string;

    if (userProfile) {
      // ✅ ユーザープロファイル + 運用計画を参照
      systemPrompt = buildPostGenerationPrompt(userProfile, "instagram", postType);

      // 運用計画の要約を追加
      if (latestPlan) {
        const createdAt = latestPlan.createdAt as { toDate?: () => Date };
        const createdDate = createdAt?.toDate?.()?.toLocaleDateString?.() || "不明";
        const planType = (latestPlan.planType as string) || "AI生成";
        const strategy = (latestPlan.generatedStrategy as string) || "運用計画を参照してください";

      systemPrompt += `

【運用計画の参照（PDCA - Plan）】
この投稿は、以下の運用計画に基づいて生成されます：
- 計画タイプ: ${planType}
- 作成日: ${createdDate}
- 戦略の概要: ${strategy.substring(0, 200)}...

運用計画との一貫性を保ちながら、投稿を生成してください。`;
      }

      // 投稿タイプ別の追加指示
      const postTypeLabel =
        postType === "reel" ? "リール" : postType === "story" ? "ストーリーズ" : "フィード";
      const textLengthGuide =
        postType === "story"
          ? "20-50文字程度、1-2行の短い一言二言"
          : postType === "reel"
            ? "50-150文字程度、エンゲージメント重視"
            : "200-400文字程度";

      systemPrompt += `

【投稿生成の指示】
- 投稿タイプ: ${postTypeLabel}
${postType === "story" ? "- **重要**: ストーリーは短い文（20-50文字、1-2行）にしてください" : ""}
- 投稿日時: ${scheduledDate ? `${scheduledDate} ${scheduledTime}` : "未設定"}
- テーマ: ${prompt}

以下の形式で返してください:
- タイトル: 簡潔で魅力的なタイトル
- 本文: 計画に沿った投稿文（${textLengthGuide}）
- ハッシュタグ: 関連するハッシュタグの配列（5-10個）`;
    } else {
      const resolvedPlanData = planContext as PostGenerationRequest["planData"] | null;

      if (!resolvedPlanData) {
        return NextResponse.json({ error: "運用計画データが必要です" }, { status: 400 });
      }

      const strategy =
        resolvedPlanData.strategies[
          Math.floor(Math.random() * resolvedPlanData.strategies.length)
        ];
      const targetGrowth = Math.round(
        ((resolvedPlanData.targetFollowers - resolvedPlanData.currentFollowers) /
          resolvedPlanData.targetFollowers) *
          100
      );
      const weeklyTarget = resolvedPlanData.simulation.postTypes[postType].weeklyCount;
      const followerEffect = resolvedPlanData.simulation.postTypes[postType].followerEffect;

      systemPrompt = `あなたはInstagramの運用をサポートするAIアシスタントです。ユーザーの運用計画に基づいて、効果的な投稿文を生成してください。

運用計画の詳細:
- 計画名: ${resolvedPlanData.title}
- 目標フォロワー: ${resolvedPlanData.targetFollowers.toLocaleString()}人
- 現在のフォロワー: ${resolvedPlanData.currentFollowers.toLocaleString()}人
- 達成率: ${targetGrowth}%
- 計画期間: ${resolvedPlanData.planPeriod}
- ターゲットオーディエンス: ${resolvedPlanData.targetAudience}
- カテゴリ: ${resolvedPlanData.category}
- 戦略: ${resolvedPlanData.strategies.join(", ")}

AIペルソナ:
- トーン: ${resolvedPlanData.aiPersona.tone}
- スタイル: ${resolvedPlanData.aiPersona.style}
- パーソナリティ: ${resolvedPlanData.aiPersona.personality}
- 興味: ${resolvedPlanData.aiPersona.interests.join(", ")}

投稿設定:
- 投稿タイプ: ${postType === "reel" ? "リール" : postType === "story" ? "ストーリーズ" : "フィード"}
- 週間投稿数: ${weeklyTarget}回
- 期待効果: +${followerEffect}人/投稿
- 投稿日時: ${scheduledDate ? `${scheduledDate} ${scheduledTime}` : "未設定"}

生成する投稿文の要件:
1. 運用計画の戦略（${strategy}）を意識した内容
2. AIペルソナに沿った${resolvedPlanData.aiPersona.tone}で${resolvedPlanData.aiPersona.style}なスタイル
3. ${resolvedPlanData.targetAudience}との繋がりを深める内容
4. 目標達成への意識を適度に含める
5. エンゲージメントを促進する要素を含める
6. 適切なハッシュタグ（5-10個）を含める
${postType === "story" ? "7. **重要**: ストーリーは短い文（20-50文字、1-2行）にする" : ""}

投稿文は以下の形式で返してください:
- タイトル: 簡潔で魅力的なタイトル
- 本文: 計画に沿った投稿文${postType === "story" ? "（20-50文字程度、2行以内の短い一言二言）" : "（200-400文字程度）"}
- ハッシュタグ: 関連するハッシュタグの配列`;
    }

    if (snapshotReferences.length > 0) {
      const snapshotSummary = snapshotReferences
        .map(
          (snapshot) =>
            `- [${snapshot.status === "gold" ? "成功" : snapshot.status === "negative" ? "反省" : "参考"}] ${
              snapshot.title || "無題の投稿"
            }（ER: ${snapshot.metrics?.engagementRate?.toFixed?.(1) ?? "-"}%, 保存率: ${
              snapshot.metrics?.saveRate?.toFixed?.(1) ?? "-"
            }%）`,
        )
        .join("\n");

      systemPrompt += `

【成功/改善パターンの参照】
以下の投稿の要素を踏まえて、成功要因を活かしつつ改善点を避けてください:
${snapshotSummary}`;
    }

    const userPrompt = `以下のテーマで${postType === "reel" ? "リール" : postType === "story" ? "ストーリーズ" : "フィード"}投稿文を生成してください:

テーマ: ${prompt}

${userProfile ? "上記のクライアント情報と運用計画に基づいて、効果的な投稿文を作成してください。" : "上記の運用計画とAIペルソナに基づいて、効果的な投稿文を作成してください。"}`;

    let chatCompletion;
    try {
      chatCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });
    } catch (openaiError: unknown) {
      console.error("OpenAI API呼び出しエラー:", openaiError);
      
      // OpenAI APIキーエラーの場合
      if (openaiError instanceof Error) {
        if (openaiError.message.includes("API key") || openaiError.message.includes("401")) {
          return NextResponse.json(
            { 
              error: "OpenAI APIキーの設定に問題があります。管理者にお問い合わせください。",
              details: process.env.NODE_ENV === "development" ? openaiError.message : undefined,
            },
            { status: 500 }
          );
        }
        if (openaiError.message.includes("rate limit") || openaiError.message.includes("429")) {
          return NextResponse.json(
            { error: "APIの利用制限に達しました。しばらく待ってから再度お試しください。" },
            { status: 429 }
          );
        }
      }
      
      // その他のOpenAIエラー
      throw openaiError;
    }

    const aiResponse = chatCompletion.choices[0].message.content;

    if (!aiResponse) {
      return NextResponse.json({ error: "AI投稿文の生成に失敗しました" }, { status: 500 });
    }

    // AIレスポンスを解析してタイトル、本文、ハッシュタグを抽出
    const lines = aiResponse.split("\n").filter((line) => line.trim());

    let title = "";
    let content = "";
    let hashtags: string[] = [];

    let currentSection = "";
    for (const line of lines) {
      if (line.includes("タイトル:") || line.includes("タイトル：")) {
        title = line.replace(/タイトル[:：]\s*/, "").trim();
        currentSection = "title";
      } else if (line.includes("本文:") || line.includes("本文：")) {
        currentSection = "content";
        content = line.replace(/本文[:：]\s*/, "").trim();
      } else if (line.includes("ハッシュタグ:") || line.includes("ハッシュタグ：")) {
        currentSection = "hashtags";
        const hashtagText = line.replace(/ハッシュタグ[:：]\s*/, "").trim();
        hashtags = hashtagText.split(/[,\s]+/).filter((tag) => tag.trim());
      } else if (currentSection === "content" && line.trim()) {
        content += "\n" + line.trim();
      } else if (currentSection === "hashtags" && line.trim()) {
        const additionalHashtags = line.split(/[,\s]+/).filter((tag) => tag.trim());
        hashtags.push(...additionalHashtags);
      }
    }

    // フォールバック: パースに失敗した場合の処理
    if (!title || !content) {
      title = `${prompt}${userProfile ? ` - ${userProfile.name}` : ""}`;
      content = aiResponse;
      hashtags = [
        postType === "reel" ? "リール" : postType === "story" ? "ストーリーズ" : "インスタグラム",
        "成長",
        prompt.replace(/\s+/g, ""),
        "エンゲージメント",
        "フォロワー",
        "目標達成",
      ];
    }

    // ハッシュタグに#を追加（まだない場合）
    hashtags = hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));

    const generationPayload: AIGenerationResponse = {
      draft: {
        title,
        body: content,
        hashtags,
      },
      insights: [],
      imageHints: [],
      references: aiReferences,
      metadata: {
        model: "gpt-4o-mini",
        generatedAt: new Date().toISOString(),
        promptVersion: "post-generation:v1",
      },
      rawText: aiResponse,
    };

    return NextResponse.json({
      success: true,
      data: {
        title,
        content,
        hashtags,
        metadata: {
          postType,
          generatedAt: generationPayload.metadata?.generatedAt,
          basedOnPlan: Boolean(latestPlan),
          ...(userProfile && { clientName: userProfile.name }),
          ...(latestPlan && { planType: latestPlan.planType as string }),
          snapshotReferences: snapshotReferences.map((snapshot) => ({
            id: snapshot.id,
            status: snapshot.status,
            score: snapshot.score,
          })),
        },
        snapshotReferences,
        generation: generationPayload,
      },
    });
  } catch (error) {
    console.error("AI投稿文生成エラー:", error);
    
    // エラーの詳細をログに記録
    if (error instanceof Error) {
      console.error("エラーメッセージ:", error.message);
      console.error("エラースタック:", error.stack);
    }
    
    // より詳細なエラーメッセージを返す
    const errorMessage = error instanceof Error ? error.message : "不明なエラーが発生しました";
    const { status, body } = buildErrorResponse(error);
    
    return NextResponse.json(
      {
        ...body,
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status }
    );
  }
}
