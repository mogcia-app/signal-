import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildPostGenerationPrompt, buildFeedPrompt, buildReelPrompt, buildStoryPrompt } from "../../../../utils/aiPromptBuilder";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import { buildAIContext } from "@/lib/ai/context";
import { AIGenerationResponse, SnapshotReference, AIReference } from "@/types/ai";
import { UserProfile } from "@/types/user";

/**
 * ユーザー名から固定の企業ハッシュタグを生成
 */
function generateFixedBrandHashtag(userName: string | null | undefined): string {
  if (!userName) {
    return "企業公式";
  }
  // 空白を除去し、「公式」が含まれていない場合は追加
  const normalizedName = userName.replace(/\s+/g, "").replace(/公式$/, "");
  return normalizedName.endsWith("公式") ? normalizedName : `${normalizedName}公式`;
}

// OpenAI APIの初期化
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

// フィード投稿の文字数ルール（マップ定義）
const FEED_TEXT_RULES = {
  short: "80〜120文字程度",
  medium: "150〜200文字程度",
  long: "250〜400文字程度",
} as const;

// フィード投稿の文字数に応じたmax_tokens設定（日本語は1文字≈2トークン、JSON構造分も考慮）
const FEED_MAX_TOKENS = {
  short: 300,   // 80-120文字 + JSON構造分
  medium: 500,  // 150-200文字 + JSON構造分
  long: 800,    // 250-400文字 + JSON構造分
} as const;

// フィード投稿タイプのガイド（マップ定義）
const FEED_TYPE_GUIDE = {
  value: "ノウハウ・Tips・保存したくなる有益情報を中心に",
  empathy: "悩み・あるある・感情に寄り添う共感重視の内容で",
  story: "体験談や背景をストーリー仕立てで",
  credibility: "実績・事例・数字を用いて信頼感を高める内容で",
  promo: "商品・サービスの魅力を伝え、行動を促す内容で",
  brand: "写真＋一言、ビジュアル重視、価値観・ポリシーを表現する内容で",
} as const;

// フィード投稿タイプの日本語ラベル
const FEED_TYPE_LABELS = {
  value: "情報有益型",
  empathy: "共感型",
  story: "ストーリー型",
  credibility: "実績・信頼型",
  promo: "告知・CTA型",
  brand: "ブランド・世界観型",
} as const;

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
  feedOptions?: {
    feedPostType: "value" | "empathy" | "story" | "credibility" | "promo" | "brand";
    textVolume: "short" | "medium" | "long";
    imageCount?: number; // 使用する画像の枚数
  };
  // 後方互換性のため残す（非推奨）
  writingStyle?: "casual" | "sincere";
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
    const { postType, planData, scheduledDate, scheduledTime, action = "generatePost", feedOptions, writingStyle } = body;

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
      // ✅ 投稿タイプ別のプロンプト生成関数を使用
      if (postType === "feed") {
        systemPrompt = buildFeedPrompt(userProfile, "instagram");
      } else if (postType === "reel") {
        systemPrompt = buildReelPrompt(userProfile, "instagram");
      } else if (postType === "story") {
        systemPrompt = buildStoryPrompt(userProfile, "instagram");
      } else {
        // フォールバック（後方互換性）
        systemPrompt = buildPostGenerationPrompt(userProfile, "instagram", postType);
      }

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
      
      // 文字数ガイドを決定（feedOptions優先、後方互換性のためwritingStyleも考慮）
      let textLengthGuide: string;
      if (postType === "story") {
        textLengthGuide = "20-50文字程度、1-2行の短い一言二言";
      } else if (postType === "reel") {
        textLengthGuide = "50-150文字程度、エンゲージメント重視";
      } else if (postType === "feed") {
        // feedOptionsが指定されている場合はそれを使用
        if (feedOptions?.textVolume) {
          textLengthGuide = FEED_TEXT_RULES[feedOptions.textVolume];
        } else if (writingStyle === "casual") {
          // 後方互換性: writingStyleをtextVolumeに変換
          textLengthGuide = FEED_TEXT_RULES.medium;
        } else if (writingStyle === "sincere") {
          textLengthGuide = FEED_TEXT_RULES.long;
        } else {
          textLengthGuide = FEED_TEXT_RULES.short;
        }
      } else {
        textLengthGuide = "100-150文字程度、詳細で魅力的な内容";
      }

      systemPrompt += `

【投稿生成の指示】
- 投稿タイプ: ${postTypeLabel}
${postType === "story" ? "- **重要**: ストーリーは短い文（20-50文字、1-2行）にしてください" : ""}
${postType === "feed" && feedOptions ? `
- **重要**: フィード投稿の役割指定
  - 投稿タイプ: ${FEED_TYPE_LABELS[feedOptions.feedPostType]}（${FEED_TYPE_GUIDE[feedOptions.feedPostType]}）
  - 文字量: ${textLengthGuide}
  - 画像枚数: ${feedOptions.imageCount || 1}枚
この役割と文字量を厳守してください。` : ""}
${postType === "feed" && !feedOptions && writingStyle === "casual" ? "- **重要**: フィード投稿文は150-200文字程度で生成してください。カジュアルで親しみやすい表現を使い、フォロワーとの距離感を縮めるような内容にしてください。" : ""}
${postType === "feed" && !feedOptions && writingStyle === "sincere" ? "- **重要**: フィード投稿文は250-400文字程度で生成してください。誠実で丁寧な表現を使い、商品やサービスの魅力、特徴、使い方などを詳しく説明し、フォロワーが信頼感を持てるような内容にしてください。" : ""}
${postType === "feed" && !feedOptions && !writingStyle ? "- **重要**: フィード投稿文は100-150文字程度で生成してください。商品やサービスの魅力、特徴、使い方などを詳しく説明し、フォロワーが興味を持てるような内容にしてください。150文字を超える場合は、重要な情報を残しつつ150文字以内に収めてください。" : ""}
- 投稿日時: ${scheduledDate ? `${scheduledDate} ${scheduledTime}` : "未設定"}
- テーマ: ${prompt}
${!feedOptions && writingStyle === "casual" ? "- スタイル: カジュアル（親しみやすく、フレンドリーな表現）" : ""}
${!feedOptions && writingStyle === "sincere" ? "- スタイル: 誠実（丁寧で信頼感のある表現）" : ""}

必ず以下のJSON形式のみを返してください。JSON以外のテキストは一切含めないでください。

{
  "title": "簡潔で魅力的なタイトル",
  "body": "計画に沿った投稿文（${textLengthGuide}）",
  "hashtags": [
    {
      "tag": "トレンド・検索されやすいハッシュタグ（投稿内容のテーマに沿った、検索されやすい大きなハッシュタグ、#は不要）",
      "category": "trending",
      "reason": "選定理由（20文字以内）"
    },
    {
      "tag": "補助的ハッシュタグ1（投稿内容を補完する、より具体的なハッシュタグ、#は不要）",
      "category": "supporting",
      "reason": "選定理由（20文字以内）"
    },
    {
      "tag": "補助的ハッシュタグ2（投稿内容を補完する、より具体的なハッシュタグ、#は不要）",
      "category": "supporting",
      "reason": "選定理由（20文字以内）"
    },
    {
      "tag": "補助的ハッシュタグ3（投稿内容を補完する、より具体的なハッシュタグ、#は不要）",
      "category": "supporting",
      "reason": "選定理由（20文字以内）"
    }
  ]
}

重要: 企業ハッシュタグは固定で使用されるため、上記4つのハッシュタグのみを生成してください。

重要: JSON以外のテキストは一切出力しないでください。`;
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

      // ユーザープロファイルの商品・サービス情報を含むベースプロンプトを構築
      let basePrompt = "";
      if (userProfile) {
        // 投稿タイプ別のプロンプト生成関数を使用
        if (postType === "feed") {
          basePrompt = buildFeedPrompt(userProfile, "instagram");
        } else if (postType === "reel") {
          basePrompt = buildReelPrompt(userProfile, "instagram");
        } else if (postType === "story") {
          basePrompt = buildStoryPrompt(userProfile, "instagram");
        } else {
          // フォールバック（後方互換性）
          basePrompt = buildPostGenerationPrompt(userProfile, "instagram", postType);
        }
      }

      systemPrompt = `${basePrompt ? `${basePrompt}\n\n` : ""}あなたはInstagramの運用をサポートするAIアシスタントです。ユーザーの運用計画に基づいて、効果的な投稿文を生成してください。

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
${postType === "feed" && feedOptions ? `
- フィード投稿の役割指定:
  - 投稿タイプ: ${FEED_TYPE_LABELS[feedOptions.feedPostType]}（${FEED_TYPE_GUIDE[feedOptions.feedPostType]}）
  - 文字量: ${FEED_TEXT_RULES[feedOptions.textVolume]}
  - 画像枚数: ${feedOptions.imageCount || 1}枚` : ""}

生成する投稿文の要件:
1. 運用計画の戦略（${strategy}）を意識した内容
2. AIペルソナに沿った${resolvedPlanData.aiPersona.tone}で${resolvedPlanData.aiPersona.style}なスタイル
3. ${resolvedPlanData.targetAudience}との繋がりを深める内容
4. 目標達成への意識を適度に含める
5. エンゲージメントを促進する要素を含める
6. 必ず4個のハッシュタグを含める（トレンドハッシュタグ1個、補助的ハッシュタグ3個）。企業ハッシュタグは固定で使用されるため、生成不要です。
${postType === "story" ? "7. **重要**: ストーリーは短い文（20-50文字、1-2行）にする" : ""}
${postType === "feed" && feedOptions ? `7. **重要**: フィード投稿文は必ず${FEED_TEXT_RULES[feedOptions.textVolume]}で生成してください。文字数が指定範囲を超えないよう、厳密に守ってください。${FEED_TYPE_GUIDE[feedOptions.feedPostType]}。この役割と文字量を厳守してください。` : ""}
${postType === "feed" && !feedOptions ? "7. **重要**: フィード投稿文は必ず150文字以内で生成してください。150文字を超える場合は、重要な情報を残しつつ150文字以内に収めてください。" : ""}
${(() => {
  const profile = userProfile as UserProfile | null;
  return profile?.businessInfo?.productsOrServices && Array.isArray(profile.businessInfo.productsOrServices) && profile.businessInfo.productsOrServices.length > 0;
})() ? `
【商品・サービス情報の活かし方（補足）】
ユーザーが商品・サービス名を指定した場合（例：「ランチセットの投稿文を作って」）、上記の「商品・サービス情報」セクションを参考にしてください。
- 商品・サービス名が一致する場合は、その詳細や価格を「自然に織り込む」形で活用してください。
- 機械的に情報を詰め込むのではなく、ストーリーや体験談の中に自然に組み込んでください。
- 価格情報は「必ず含める」のではなく、「テーマに合う場合のみ自然に言及」してください。` : ""}

必ず以下のJSON形式のみを返してください。JSON以外のテキストは一切含めないでください。

{
  "title": "簡潔で魅力的なタイトル",
  "body": "計画に沿った投稿文${postType === "story" ? "（20-50文字程度、2行以内の短い一言二言）" : postType === "feed" && feedOptions ? `（${FEED_TEXT_RULES[feedOptions.textVolume]}）` : postType === "feed" ? "（150文字以内）" : "（100文字以内）"}",
        "hashtags": [
          {
            "tag": "トレンド・検索されやすいハッシュタグ（投稿内容のテーマに沿った、検索されやすい大きなハッシュタグ、#は不要）",
            "category": "trending",
            "reason": "選定理由（20文字以内）"
          },
          {
            "tag": "補助的ハッシュタグ1（投稿内容を補完する、より具体的なハッシュタグ、#は不要）",
            "category": "supporting",
            "reason": "選定理由（20文字以内）"
          },
          {
            "tag": "補助的ハッシュタグ2（投稿内容を補完する、より具体的なハッシュタグ、#は不要）",
            "category": "supporting",
            "reason": "選定理由（20文字以内）"
          },
          {
            "tag": "補助的ハッシュタグ3（投稿内容を補完する、より具体的なハッシュタグ、#は不要）",
            "category": "supporting",
            "reason": "選定理由（20文字以内）"
          }
        ]

重要: 企業ハッシュタグは固定で使用されるため、上記4つのハッシュタグのみを生成してください。
}

重要: JSON以外のテキストは一切出力しないでください。`;
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

    // textVolumeに応じてmax_tokensを動的に設定
    const maxTokens = postType === "feed" && feedOptions?.textVolume
      ? FEED_MAX_TOKENS[feedOptions.textVolume]
      : postType === "story"
        ? 200  // ストーリーは短いので200トークン
        : 1000; // その他は1000トークン

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
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
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

    // JSON形式でパース
    let parsedData: {
      title?: string;
      body?: string;
      hashtags?: Array<{
        tag: string;
        category: "brand" | "trending" | "supporting";
        reason: string;
      }>;
    };

    try {
      // まず直接パースを試す（response_format: json_object が効いている場合）
      parsedData = JSON.parse(aiResponse);
    } catch (directParseError) {
      // 直接パースに失敗した場合、JSONを抽出して試す
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("JSON形式が見つかりません");
        }
        parsedData = JSON.parse(jsonMatch[0]);
      } catch (fallbackParseError) {
        console.error("JSONパースエラー（直接パース失敗）:", directParseError);
        console.error("JSONパースエラー（フォールバックも失敗）:", fallbackParseError);
        console.error("AIレスポンス:", aiResponse);
        return NextResponse.json(
          { error: "AIの応答を解析できませんでした。再度お試しください。" },
          { status: 500 }
        );
      }
    }

    let title = parsedData.title || "";
    let content = parsedData.body || "";
    
    // フィードの場合はtextVolumeに応じた文字数制限を適用
    if (postType === "feed") {
      if (feedOptions?.textVolume) {
        // textVolumeに応じた文字数範囲
        const textVolumeLimits = {
          short: { min: 80, max: 120 },
          medium: { min: 150, max: 200 },
          long: { min: 250, max: 400 },
        };
        const limits = textVolumeLimits[feedOptions.textVolume];
        
        // 文字数が範囲外の場合は調整
        if (content.length < limits.min) {
          // 短すぎる場合はそのまま（AIに再生成させるべきだが、ここでは警告のみ）
          console.warn(`生成された投稿文が短すぎます（${content.length}文字）。目標: ${limits.min}-${limits.max}文字`);
        } else if (content.length > limits.max) {
          // 長すぎる場合は、文の区切り（句点、改行）で切り詰める
          const originalLength = content.length;
          let truncated = content.substring(0, limits.max);
          const lastPeriod = truncated.lastIndexOf("。");
          const lastNewline = truncated.lastIndexOf("\n");
          const lastBreak = Math.max(lastPeriod, lastNewline);
          // 最小文字数の80%以上は確保
          const minLength = Math.floor(limits.min * 0.8);
          if (lastBreak > minLength) {
            truncated = truncated.substring(0, lastBreak + 1);
          }
          content = truncated;
          console.log(`投稿文を${limits.max}文字に切り詰めました（元: ${originalLength}文字 → 現在: ${content.length}文字）`);
        }
      } else {
        // feedOptionsがない場合は150文字以内に制限（後方互換性）
        if (content.length > 150) {
          let truncated = content.substring(0, 150);
          const lastPeriod = truncated.lastIndexOf("。");
          const lastNewline = truncated.lastIndexOf("\n");
          const lastBreak = Math.max(lastPeriod, lastNewline);
          if (lastBreak > 100) {
            truncated = truncated.substring(0, lastBreak + 1);
          }
          content = truncated;
        }
      }
    }
    
    // 固定の企業ハッシュタグを生成
    const fixedBrandHashtag = generateFixedBrandHashtag(userProfile?.name);
    
    let hashtags: string[] = [];
    let hashtagExplanations: Array<{ hashtag: string; category: "brand" | "trending" | "supporting"; reason: string }> = [];

    // 固定の企業ハッシュタグを最初に追加
    hashtags.push(fixedBrandHashtag);
    hashtagExplanations.push({
      hashtag: fixedBrandHashtag,
      category: "brand",
      reason: "企業・ブランドを表す固定ハッシュタグ",
    });

    // AI生成のハッシュタグを抽出（4つ）
    if (parsedData.hashtags && Array.isArray(parsedData.hashtags)) {
      for (const item of parsedData.hashtags) {
        if (item.tag) {
          // #を除去して正規化
          const cleanTag = item.tag.replace(/^#+/, "").trim();
          if (cleanTag && cleanTag.length > 0) {
            hashtags.push(cleanTag);
            // 説明も追加
            hashtagExplanations.push({
              hashtag: cleanTag,
              category: item.category || "supporting",
              reason: (item.reason || "").replace(/\*\*/g, "").replace(/\*/g, "").replace(/_/g, "").trim(),
            });
          }
        }
      }
    }

    // フォールバック: パースに失敗した場合の処理
    let fallbackUsed = false;
    if (!title || !content) {
      fallbackUsed = true;
      title = parsedData.title || `${prompt}${userProfile ? ` - ${userProfile.name}` : ""}`;
      content = parsedData.body || "";
      // フォールバック時も固定の企業ハッシュタグは追加
      if (hashtags.length === 0) {
        // 固定の企業ハッシュタグのみ追加
        const fixedBrandHashtag = generateFixedBrandHashtag(userProfile?.name);
        hashtags = [fixedBrandHashtag];
        hashtagExplanations = [{
          hashtag: fixedBrandHashtag,
          category: "brand" as const,
          reason: "企業・ブランドを表す固定ハッシュタグ",
        }];
      }
    }

    // フィードとリールの場合はハッシュタグを5個までに制限（固定1個 + AI生成4個）
    if (postType === "feed" || postType === "reel") {
      // 固定の企業ハッシュタグ（1個目） + AI生成のハッシュタグ（最大4個）
      const fixedHashtag = hashtags[0]; // 固定の企業ハッシュタグ
      const aiGeneratedHashtags = hashtags.slice(1).slice(0, 4); // AI生成のハッシュタグ（最大4個）
      hashtags = [fixedHashtag, ...aiGeneratedHashtags];
      
      const fixedExplanation = hashtagExplanations[0]; // 固定の企業ハッシュタグの説明
      const aiGeneratedExplanations = hashtagExplanations.slice(1).slice(0, 4); // AI生成のハッシュタグの説明（最大4個）
      hashtagExplanations = [fixedExplanation, ...aiGeneratedExplanations];
    }

    // 5個保証：ハッシュタグが5個未満の場合、補完ロジック（固定1個 + AI生成4個 = 合計5個）
    if ((postType === "feed" || postType === "reel") && hashtags.length < 5) {
      const existingTags = new Set(hashtags);
      
      // AI生成のハッシュタグが4個未満の場合、補完（固定1個 + AI生成4個 = 合計5個）
      let aiGeneratedCount = hashtags.length - 1; // 固定の企業ハッシュタグを除いた数
      
      while (hashtags.length < 5) {
        const index = aiGeneratedCount + 1; // 固定の企業ハッシュタグを除いたインデックス
        let category: "trending" | "supporting" = "supporting";
        let tag = "";
        let reason = "";
        
        if (index === 1) {
          category = "trending";
          tag = "インスタグラム";
          reason = "検索されやすいトレンドハッシュタグ";
        } else {
          category = "supporting";
          tag = `投稿${index - 1}`;
          reason = "投稿内容を補完する補助的ハッシュタグ";
        }
        
        // 重複チェック
        if (!existingTags.has(tag)) {
          hashtags.push(tag);
          hashtagExplanations.push({
            hashtag: tag,
            category,
            reason,
          });
          existingTags.add(tag);
          aiGeneratedCount++;
        } else {
          // 重複している場合は番号を追加
          let counter = 1;
          while (existingTags.has(`${tag}${counter}`)) {
            counter++;
          }
          const uniqueTag = `${tag}${counter}`;
          hashtags.push(uniqueTag);
          hashtagExplanations.push({
            hashtag: uniqueTag,
            category,
            reason,
          });
          existingTags.add(uniqueTag);
          aiGeneratedCount++;
        }
      }
    }

    const generationPayload: AIGenerationResponse = {
      draft: {
        title,
        body: content,
        hashtags,
        hashtagExplanations: hashtagExplanations.length > 0 ? hashtagExplanations : undefined,
      },
      insights: [],
      imageHints: [],
      references: aiReferences,
      metadata: {
        model: "gpt-4o-mini",
        generatedAt: new Date().toISOString(),
        promptVersion: "post-generation:v1",
        fallbackUsed: fallbackUsed,
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
          fallbackUsed: generationPayload.metadata?.fallbackUsed || false,
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
