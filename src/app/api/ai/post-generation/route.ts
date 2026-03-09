import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import { buildAIContext } from "@/lib/ai/context";
import { buildLabContext } from "@/lib/ai/lab-context";
import {
  buildPlaybookPromptSnippet,
  selectInstagramPlaybookSections,
  type InstagramPlaybookSelection,
} from "@/lib/ai/instagram-playbook-rag";
import {
  buildSuggestionPriorityPrompt,
  createSuggestionLearningMeta,
  fetchTopSuggestionPatterns,
} from "@/lib/ai/suggestion-learning";
import { COLLECTIONS } from "@/repositories/collections";
import { AIGenerationResponse, SnapshotReference, AIReference } from "@/types/ai";
import { assertFeatureEnabled } from "@/lib/server/feature-guard";

/**
 * ユーザー名から固定の企業ハッシュタグを生成
 * ブランド名をそのまま使用（「公式」は追加しない）
 */
function generateFixedBrandHashtag(userName: string | null | undefined): string {
  if (!userName) {
    return "企業";
  }
  // 空白を除去してブランド名をそのまま返す
  return userName.replace(/\s+/g, "");
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
    await assertFeatureEnabled("ai.generate");

    const body: PostGenerationRequest = await request.json();
    let { prompt } = body;
    const { postType, planData, scheduledDate, scheduledTime, action = "generatePost", feedOptions, writingStyle } = body;

    let userProfile: Awaited<ReturnType<typeof buildAIContext>>["userProfile"];
    let latestPlan: Awaited<ReturnType<typeof buildAIContext>>["latestPlan"];
    let snapshotReferences: SnapshotReference[];
    let aiReferences: AIReference[];
    
    try {
      // パフォーマンス最適化: 投稿生成に不要なデータは取得しない
      const contextResult = await buildAIContext(userId, { 
        snapshotLimit: 1, // 3→1に削減（参考投稿は1件で十分）
        includeMasterContext: false, // 投稿生成には不要
        includeActionLogs: false, // 投稿生成には不要
        includeAbTests: false, // 投稿生成には不要
      });
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

    const labContext = await buildLabContext({
      userId,
      latestPlan: (latestPlan || null) as Record<string, unknown> | null,
      requestPlanData: (planData || null) as Record<string, unknown> | null,
    });

    // 時間提案の場合
    if (action === "suggestTime") {
      try {
        // 過去の分析データを取得してエンゲージメントが高かった時間帯を分析
        const analyticsSnapshot = await adminDb
          .collection(COLLECTIONS.ANALYTICS)
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

    let playbookSelection: InstagramPlaybookSelection | null = null;
    let playbookSnippet = "";
    try {
      playbookSelection = await selectInstagramPlaybookSections({
        prompt,
        postType,
        maxSections: 3,
      });
      playbookSnippet = buildPlaybookPromptSnippet(playbookSelection);
    } catch (playbookError) {
      console.error("Instagram playbook 読み込みエラー:", playbookError);
    }

    let suggestionPrioritySnippet = "";
    try {
      const topPatterns = await fetchTopSuggestionPatterns({
        userId,
        postType,
        limit: 3,
      });
      suggestionPrioritySnippet = buildSuggestionPriorityPrompt(topPatterns);
    } catch (patternError) {
      console.error("提案パターン読み込みエラー:", patternError);
    }

    const suggestionMeta = createSuggestionLearningMeta({
      postType,
      feedPostType: feedOptions?.feedPostType,
      playbookSectionIds: playbookSelection?.sections?.map((section) => section.id) || [],
    });

    const postTypeLabel =
      postType === "reel" ? "リール" : postType === "story" ? "ストーリーズ" : "フィード";
    const textLengthGuide =
      postType === "story"
        ? "20-50文字程度、1-2行の短い一言二言"
        : postType === "feed" && feedOptions?.textVolume
          ? FEED_TEXT_RULES[feedOptions.textVolume]
          : postType === "feed" && writingStyle === "sincere"
            ? FEED_TEXT_RULES.long
            : "150-200文字程度";
    const feedRoleInstruction =
      postType === "feed" && feedOptions
        ? `- フィード投稿の役割: ${FEED_TYPE_LABELS[feedOptions.feedPostType]}（${FEED_TYPE_GUIDE[feedOptions.feedPostType]}）
- 文字量: ${textLengthGuide}
- 画像枚数: ${feedOptions.imageCount || 1}枚`
        : "";
    const styleInstruction =
      !feedOptions && writingStyle === "casual"
        ? "- スタイル: カジュアル（親しみやすく、フレンドリー）"
        : !feedOptions && writingStyle === "sincere"
          ? "- スタイル: 誠実（丁寧で信頼感）"
          : "";

    const systemPrompt: string = `${labContext.promptBlock}

${playbookSnippet ? `${playbookSnippet}\n` : ""}${suggestionPrioritySnippet ? `${suggestionPrioritySnippet}\n` : ""}【重要: 入力制約】
- 生成時に参照してよい運用判断材料は上記 LabContext のみ
- 運用計画・分析アドバイス・月次アクションの生データを推測して補完しない
- 判断は must-do / avoid / kpi_focus / style_rules だけで行う

【投稿生成条件】
- 投稿タイプ: ${postTypeLabel}
- テーマ: ${prompt}
- 投稿日時: ${scheduledDate ? `${scheduledDate} ${scheduledTime}` : "未設定"}
${feedRoleInstruction}
${styleInstruction}

【⚠️ 最重要: 文字数制限（絶対遵守）】
${postType === "feed" || postType === "reel" ? `投稿文（body）は**必ず150文字以上200文字以内**で生成してください。
- 150文字未満の場合は生成し直してください
- この文字数制限は絶対に守ってください
- 125文字付近（120-130文字の範囲）にキャッチーでインパクトのある表現を含めてください` : "投稿文（body）は20-50文字、1-2行で生成してください"}

必ず以下のJSON形式のみを返してください。JSON以外のテキストは一切含めないでください。

{
  "title": "簡潔で魅力的なタイトル",
  "body": "投稿文（${postType === "feed" || postType === "reel" ? "**必ず150文字以上200文字以内、125文字付近にキャッチーなフレーズを含める**" : textLengthGuide}）",
  "contentType": "product | testimonial | staff | knowledge | event | beforeafter | behind | other のいずれか1つ（任意）",
  "hashtags": [
    {
      "tag": "トレンド・検索されやすいハッシュタグ（#は不要）",
      "category": "trending",
      "reason": "選定理由（20文字以内）"
    },
    {
      "tag": "補助的ハッシュタグ1（#は不要）",
      "category": "supporting",
      "reason": "選定理由（20文字以内）"
    },
    {
      "tag": "補助的ハッシュタグ2（#は不要）",
      "category": "supporting",
      "reason": "選定理由（20文字以内）"
    },
    {
      "tag": "補助的ハッシュタグ3（#は不要）",
      "category": "supporting",
      "reason": "選定理由（20文字以内）"
    }
  ]
}

重要: 企業ハッシュタグは固定で使用されるため、上記4つのハッシュタグのみを生成してください。
重要: JSON以外のテキストは一切出力しないでください。`;

    const userPrompt = `以下のテーマで${postType === "reel" ? "リール" : postType === "story" ? "ストーリーズ" : "フィード"}投稿文を生成してください:

テーマ: ${prompt}

${postType === "feed" || postType === "reel" ? "**最重要**: 投稿文（body）は必ず150文字以上200文字以内で生成してください。150文字未満の場合は生成し直してください。**この文字数制限は絶対に守ってください。**" : ""}
上記の LabContext と条件に基づいて、効果的な投稿文を作成してください。`;

    // textVolumeに応じてmax_tokensを動的に設定
    const maxTokens = postType === "feed" && feedOptions?.textVolume
      ? FEED_MAX_TOKENS[feedOptions.textVolume]
      : postType === "story"
        ? 400  // ストーリーは短いが、JSON構造を含めて400トークンに増加
        : 1000; // その他は1000トークン

    let chatCompletion;
    try {
      chatCompletion = await openai.chat.completions.create(
        {
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
        },
        {
          timeout: 30000, // 30秒でタイムアウト
        }
      );
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
      contentType?: string;
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
        // より柔軟なJSON抽出パターン（複数行、ネストされたJSONに対応）
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("JSON形式が見つかりません");
        }
        parsedData = JSON.parse(jsonMatch[0]);
      } catch (fallbackParseError) {
        console.error("JSONパースエラー（直接パース失敗）:", directParseError);
        console.error("JSONパースエラー（フォールバックも失敗）:", fallbackParseError);
        console.error("AIレスポンス（全文）:", aiResponse);
        console.error("AIレスポンス（長さ）:", aiResponse.length, "文字");
        console.error("投稿タイプ:", postType);
        console.error("max_tokens:", maxTokens);
        
        // ストーリーズの場合、より詳細なエラーメッセージを返す
        if (postType === "story") {
          return NextResponse.json(
            { 
              error: "AIの応答を解析できませんでした。再度お試しください。",
              details: process.env.NODE_ENV === "development" 
                ? `ストーリーズ投稿生成エラー: ${fallbackParseError instanceof Error ? fallbackParseError.message : String(fallbackParseError)}` 
                : undefined,
            },
            { status: 500 }
          );
        }
        
        return NextResponse.json(
          { error: "AIの応答を解析できませんでした。再度お試しください。" },
          { status: 500 }
        );
      }
    }

    let title = parsedData.title || "";
    let content = parsedData.body || "";
    
    // リールとフィードの場合は150-200文字以内に制限
    if (postType === "reel" || postType === "feed") {
      if (postType === "feed" && feedOptions?.textVolume) {
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
        // リールまたはfeedOptionsがないフィードは150-200文字以内に制限
        const minLength = 150;
        const maxLength = 200;
        
        if (content.length < minLength) {
          console.warn(`生成された投稿文が短すぎます（${content.length}文字）。目標: ${minLength}-${maxLength}文字`);
        } else if (content.length > maxLength) {
          let truncated = content.substring(0, maxLength);
          const lastPeriod = truncated.lastIndexOf("。");
          const lastNewline = truncated.lastIndexOf("\n");
          const lastBreak = Math.max(lastPeriod, lastNewline);
          // 最小文字数の80%以上は確保
          const minLengthThreshold = Math.floor(minLength * 0.8);
          if (lastBreak > minLengthThreshold) {
            truncated = truncated.substring(0, lastBreak + 1);
          }
          content = truncated;
          console.log(`投稿文を${maxLength}文字に切り詰めました（元: ${content.length}文字 → 現在: ${truncated.length}文字）`);
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
      references: [
        ...aiReferences,
        {
          id: `suggestion:${suggestionMeta.suggestionId}`,
          sourceType: "manual",
          label: `提案パターン: ${suggestionMeta.patternLabel}`,
          summary: "この提案の学習トラッキングID",
          metadata: {
            suggestionId: suggestionMeta.suggestionId,
            patternKey: suggestionMeta.patternKey,
            patternLabel: suggestionMeta.patternLabel,
            postType: suggestionMeta.postType,
          },
        } as AIReference,
      ],
      metadata: {
        model: "gpt-4o-mini",
        generatedAt: new Date().toISOString(),
        promptVersion: "post-generation:v1",
        fallbackUsed: fallbackUsed,
        labContext: {
          mustDo: labContext.mustDo,
          avoid: labContext.avoid,
          kpiFocus: labContext.kpiFocus,
          styleRules: labContext.styleRules,
        },
        playbook: playbookSelection
          ? {
              updatedAt: playbookSelection.updatedAt,
              sections: playbookSelection.sections.map((section) => ({
                id: section.id,
                title: section.title,
                score: section.score,
              })),
            }
          : undefined,
        suggestion: {
          id: suggestionMeta.suggestionId,
          patternKey: suggestionMeta.patternKey,
          patternLabel: suggestionMeta.patternLabel,
          postType: suggestionMeta.postType,
        },
      },
      rawText: aiResponse,
    };

    // 投稿時間が空欄の場合、時間提案を取得
    let suggestedTime: string | null = null;
    let timeSuggestionReason: string | null = null;
    if (!scheduledTime && scheduledDate) {
      try {
        // 過去の分析データを取得してエンゲージメントが高かった時間帯を分析
        const analyticsSnapshot = await adminDb
          .collection(COLLECTIONS.ANALYTICS)
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
            suggestedTime = `${bestHour}:00`;
            timeSuggestionReason = `過去のデータ分析により、${bestHour}時台のエンゲージメント率が最も高いです（平均${bestEngagement.toFixed(2)}%）`;
          }
        }
      } catch (error) {
        console.error("時間提案エラー:", error);
        // エラー時はデフォルトロジックにフォールバック
      }

      // デフォルトの最適時間（初回または分析データがない場合）
      if (!suggestedTime) {
        const optimalTimes = {
          feed: ["09:00", "12:00", "18:00", "20:00"],
          reel: ["07:00", "12:00", "19:00", "21:00"],
          story: ["08:00", "13:00", "18:00", "22:00"],
        };

        const times = optimalTimes[postType];
        suggestedTime = times[Math.floor(Math.random() * times.length)];
        timeSuggestionReason = `${postType === "feed" ? "フィード" : postType === "reel" ? "リール" : "ストーリーズ"}の一般的な最適時間です`;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        title,
        content,
        hashtags,
        contentType: parsedData.contentType || null,
        ...(suggestedTime && {
          suggestedTime,
          timeSuggestionReason,
        }),
        metadata: {
          postType,
          generatedAt: generationPayload.metadata?.generatedAt,
          basedOnPlan: Boolean(latestPlan),
          fallbackUsed: generationPayload.metadata?.fallbackUsed || false,
          labContext: generationPayload.metadata?.labContext,
          playbook: generationPayload.metadata?.playbook,
          suggestion: generationPayload.metadata?.suggestion,
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
