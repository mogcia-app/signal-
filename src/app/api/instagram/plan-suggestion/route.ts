import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { PlanFormData, SimulationResult, AIPlanSuggestion } from "@/app/instagram/plan/types/plan";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * AI計画提案を生成するプロンプト
 */
function buildPlanSuggestionPrompt(
  formData: PlanFormData,
  simulationResult: SimulationResult,
  userProfile?: {
    businessType?: string;
    description?: string;
    catchphrase?: string;
    targetMarket?: string;
  },
  planStartDate?: Date
): string {
  const weeklyFeedPosts = formData.weeklyFeedPosts;
  const weeklyReelPosts = formData.weeklyReelPosts;
  const weeklyStoryPosts = formData.weeklyStoryPosts;
  const periodMonths = formData.periodMonths;
  const mainGoal = formData.mainGoal || "フォロワーを増やしたい";
  const targetAudience = formData.targetAudience || "";
  const contentTypes = formData.contentTypes || [];
  const preferredPostingTimes = formData.preferredPostingTimes || [];
  const regionRestriction = formData.regionRestriction;
  const contentTypeOther = formData.contentTypeOther;

  // 投稿頻度の詳細説明（AIに正確に伝える）
  const postingFrequencyDetails = [];
  if (weeklyFeedPosts > 0) {
    postingFrequencyDetails.push(`フィード投稿: 週${weeklyFeedPosts}回（必ずこの回数で提案してください）`);
  } else {
    postingFrequencyDetails.push(`フィード投稿: 週0回（フィード投稿は提案しないでください）`);
  }
  if (weeklyReelPosts > 0) {
    postingFrequencyDetails.push(`リール投稿: 週${weeklyReelPosts}回（必ずこの回数で提案してください）`);
  } else {
    postingFrequencyDetails.push(`リール投稿: 週0回（リール投稿は提案しないでください）`);
  }
  if (weeklyStoryPosts > 0) {
    if (weeklyStoryPosts === 7) {
      postingFrequencyDetails.push(`ストーリーズ投稿: 週${weeklyStoryPosts}回（毎日投稿。dailyタスクとして提案してください）`);
    } else {
      postingFrequencyDetails.push(`ストーリーズ投稿: 週${weeklyStoryPosts}回（必ずこの回数で提案してください）`);
    }
  } else {
    postingFrequencyDetails.push(`ストーリーズ投稿: 週0回（ストーリーズ投稿は提案しないでください）`);
  }

  // コンテンツタイプの説明
  const contentTypeLabels: Record<string, string> = {
    product: "商品・サービスの紹介",
    customerVoice: "お客様の声",
    staffDaily: "スタッフの日常",
    knowledge: "豆知識・ノウハウ",
    event: "イベント・キャンペーン情報",
    beforeAfter: "ビフォーアフター",
    behindScenes: "舞台裏・制作過程",
    other: "その他",
  };

  const contentTypesText = contentTypes
    .map((type) => contentTypeLabels[type] || type)
    .join("、");

  // 投稿時間の説明
  const timeLabels: Record<string, string> = {
    ai: "AIに任せる",
    morning: "午前中（9:00〜12:00）",
    noon: "昼（12:00〜15:00）",
    evening: "夕方（15:00〜18:00）",
    night: "夜（18:00〜21:00）",
    lateNight: "深夜（21:00〜24:00）",
  };

  const postingTimesText =
    preferredPostingTimes.length > 0
      ? preferredPostingTimes.map((time) => timeLabels[time] || time).join("、")
      : "指定なし";

  // 地域制限の説明
  const regionText = regionRestriction?.enabled
    ? `地域を限定: ${regionRestriction.prefecture || ""}${regionRestriction.city ? ` ${regionRestriction.city}` : ""}`
    : "地域制限なし";

  // その他の投稿内容
  const contentTypeOtherText = contentTypeOther ? `（その他: ${contentTypeOther}）` : "";

  const isAIPreferred = preferredPostingTimes.includes("ai");

  return `あなたはInstagramマーケティングの専門家です。以下の情報を基に、具体的で実行可能な週次タスクと月次目標を提案してください。

## ユーザー情報
${userProfile?.catchphrase ? `- キャッチコピー: ${userProfile.catchphrase}` : ""}
${userProfile?.description ? `- 事業内容: ${userProfile.description}` : ""}
${userProfile?.businessType ? `- 事業種別: ${userProfile.businessType}` : ""}
${userProfile?.targetMarket ? `- ターゲット市場: ${userProfile.targetMarket}` : ""}
${formData.targetAudience ? `- 投稿を見てもらいたい人: ${formData.targetAudience}` : ""}

## 目標設定
- 主な目標: ${mainGoal}
- 現在のフォロワー数: ${formData.currentFollowers.toLocaleString()}人
- 目標フォロワー数: ${formData.targetFollowers.toLocaleString()}人
- 達成期間: ${periodMonths}ヶ月
- 達成難易度: ${simulationResult.difficultyMessage}
- 計画開始日: ${planStartDate ? `${planStartDate.getFullYear()}年${planStartDate.getMonth() + 1}月${planStartDate.getDate()}日` : "今日"}

## 投稿設定（重要: この設定を必ず守ってください）
${postingFrequencyDetails.map((detail) => `- ${detail}`).join("\n")}
- 投稿内容: ${contentTypesText || "指定なし"}${contentTypeOtherText}
- 投稿時間の希望: ${postingTimesText}
${isAIPreferred ? "- 投稿時間はAIが最適な時間を提案してください" : ""}
- 地域設定: ${regionText}

## シミュレーション結果
- 必要月間成長率: ${simulationResult.requiredMonthlyGrowthRate}%
- 達成難易度スコア: ${simulationResult.difficultyScore}%
- 週あたりの推定時間: ${simulationResult.estimatedWeeklyMinutes}分

## 必要な取り組み
${simulationResult.requiredActions.map((action) => `- ${action}`).join("\n")}

---

## 出力形式

以下のJSON形式で出力してください。日本語で回答してください。

\`\`\`json
{
  "monthlyStrategy": [
    {
      "week": 1,
      "theme": "認知度を上げる",
      "actions": [
        "ストーリーズを毎日投稿",
        "フィード投稿を週3回",
        "ハッシュタグを活用"
      ]
    },
    {
      "week": 2,
      "theme": "エンゲージメントを高める",
      "actions": [
        "リール投稿を週1回追加",
        "コメント返信を必ず行う",
        "アンケート機能を活用"
      ]
    },
    {
      "week": 3,
      "theme": "フォロワーを増やす",
      "actions": [
        "フォロワー外へのリーチを増やす",
        "保存される投稿を意識",
        "コラボ投稿を検討"
      ]
    },
    {
      "week": 4,
      "theme": "フォロワーを増やす",
      "actions": [
        "フォロワー外へのリーチを増やす",
        "保存される投稿を意識",
        "コラボ投稿を検討"
      ]
    }
  ],
  "weeklyPlans": [
    {
      "week": 1,
      "startDate": "1/27",
      "endDate": "2/2",
      "tasks": [
        {
          "day": "月曜",
          "type": "feed",
          "description": "新メニューのご紹介",
          "time": "13:00"
        },
        {
          "day": "火曜",
          "type": "story",
          "description": "今日のおすすめコーヒー",
          "time": "11:00"
        },
        {
          "day": "水曜",
          "type": "feed",
          "description": "お客様の声",
          "time": "13:00"
        },
        {
          "day": "木曜",
          "type": "story",
          "description": "スタッフの日常",
          "time": "11:00"
        },
        {
          "day": "金曜",
          "type": "feed+reel",
          "description": "コーヒーの淹れ方",
          "time": "13:00"
        },
        {
          "day": "土曜",
          "type": "story",
          "description": "週末のリラックスタイム",
          "time": "11:00"
        },
        {
          "day": "日曜",
          "type": "story",
          "description": "来週の予定",
          "time": "11:00"
        }
      ]
    }
  ],
  "monthlyGoals": [
    {
      "metric": "投稿へのいいね",
      "target": "50個以上"
    },
    {
      "metric": "コメント数",
      "target": "10個以上"
    },
    {
      "metric": "プロフィール閲覧",
      "target": "週20回以上"
    }
  ],
  "keyMessage": "毎日ストーリーを投稿して、お客さんとの接点を増やしましょう！"
}
\`\`\`

## 注意事項（必ず守ってください）
1. **投稿頻度の厳守**: 上記の投稿頻度設定を必ず守ってください。週${weeklyFeedPosts}回のフィード投稿、週${weeklyReelPosts}回のリール投稿、週${weeklyStoryPosts}回のストーリーズ投稿を正確に反映してください。設定されていない投稿タイプは提案に含めないでください。

2. **monthlyStrategy（月次戦略）**: ${periodMonths}ヶ月間の計画なので、${periodMonths * 4}週分の戦略を提案してください。各週にはテーマ（例: "認知度を上げる"）と3つ程度の具体的なアクションを含めてください。
   - **重要**: 月次戦略のアクションは、必ず投稿頻度設定（週${weeklyFeedPosts}回のフィード投稿、週${weeklyReelPosts}回のリール投稿、週${weeklyStoryPosts}回のストーリーズ投稿）に沿った内容にしてください。
   - 例: 週${weeklyFeedPosts}回のフィード投稿を設定している場合、「フィード投稿を週${weeklyFeedPosts}回」と記載してください。
   - 投稿頻度設定を無視した戦略は提案しないでください。

3. **weeklyPlans（週次計画）**: ${periodMonths}ヶ月間の計画なので、${periodMonths * 4}週分の詳細計画を提案してください。各週のtasksには、その週の全ての投稿を曜日ごとに含めてください。
   - **重要**: 投稿頻度設定を必ず守ってください。週${weeklyFeedPosts}回のフィード投稿、週${weeklyReelPosts}回のリール投稿、週${weeklyStoryPosts}回のストーリーズ投稿を正確に反映してください。
   - 開始日と終了日は、計画開始日（${planStartDate ? `${planStartDate.getFullYear()}年${planStartDate.getMonth() + 1}月${planStartDate.getDate()}日` : "今日"}）から計算してください。第1週は開始日から7日後まで、第2週は8日後から14日後まで、というように計算してください。
   - 各タスクには必ずtimeフィールドで投稿時間を含めてください
   - typeは"feed"、"reel"、"story"、"feed+reel"（フィードとリールの両方）のいずれかを使用してください
   - ストーリーズが毎日の場合は、毎日のタスクとして含めてください

4. **ストーリーズの毎日投稿**: ストーリーズが週7回（毎日）の場合は、weeklyPlansでは毎日のタスクとして含めてください。

5. **月次目標は初心者向けに**: monthlyGoalsは、初心者にもわかりやすい具体的な数値で提案してください。
   - ❌ 避ける: 「エンゲージメント率: 10%以上」「リーチ率: 5%以上」など専門用語
   - ✅ 推奨: 「投稿へのいいね: 50個以上」「コメント数: 10個以上」「プロフィール閲覧: 週20回以上」など具体的な数値
   - 現在のフォロワー数（${formData.currentFollowers.toLocaleString()}人）を考慮して、現実的な目標を設定してください。

6. **投稿時間の提案**: ${isAIPreferred ? "ユーザーが「AIに任せる」を選択しているため、recommendedPostingTimesに最適な投稿時間を提案してください。また、weeklyTasksとweeklyPlansの各タスクにもtimeフィールドで具体的な時間（例: \"9:00\"）を提案してください。" : "ユーザーが投稿時間を指定している場合は、その時間帯を考慮してください。"}

7. **keyMessage**: ユーザーが最も意識すべきことを簡潔に（50文字以内）で伝えてください。

8. **提案の具体性**: 提案は具体的で実行可能なものにしてください。ユーザーのターゲット（${targetAudience || formData.targetAudience || "未指定"}）や事業内容を考慮してください。

9. **投稿内容の反映**: 投稿内容（${contentTypesText || "指定なし"}${contentTypeOtherText}）を考慮して、適切なタスク内容を提案してください。`;
}

/**
 * AI計画提案を生成
 */
/**
 * 週ごとの開始日と終了日を計算
 */
function calculateWeekDates(weekNumber: number, startDate: Date): { startDate: string; endDate: string } {
  const weekStart = new Date(startDate);
  weekStart.setDate(weekStart.getDate() + (weekNumber - 1) * 7);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const formatDate = (date: Date) => {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };
  
  return {
    startDate: formatDate(weekStart),
    endDate: formatDate(weekEnd),
  };
}

async function generateAIPlanSuggestion(
  formData: PlanFormData,
  simulationResult: SimulationResult,
  userId: string
): Promise<AIPlanSuggestion> {
  // ユーザープロファイルを取得
  let userProfile: {
    businessType?: string;
    description?: string;
    catchphrase?: string;
    targetMarket?: string;
  } = {};

  try {
    const profile = await getUserProfile(userId);
    if (profile?.businessInfo) {
      userProfile = {
        businessType: profile.businessInfo.businessType,
        description: profile.businessInfo.description,
        catchphrase: profile.businessInfo.catchphrase,
        targetMarket: Array.isArray(profile.businessInfo.targetMarket)
          ? profile.businessInfo.targetMarket.join("、")
          : profile.businessInfo.targetMarket || "",
      };
    }
  } catch (error) {
    console.warn("ユーザープロファイル取得エラー:", error);
  }

  // 計画開始日（今日）
  const planStartDate = new Date();

  const prompt = buildPlanSuggestionPrompt(formData, simulationResult, userProfile, planStartDate);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "あなたはInstagramマーケティングの専門家です。ユーザーの目標達成をサポートするため、具体的で実行可能な提案を行ってください。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AIからの応答が空です");
    }

    // JSONをパース
    let parsedContent: any;
    try {
      // コードブロックを除去
      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsedContent = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("JSONパースエラー:", parseError);
      console.error("元のコンテンツ:", content);
      throw new Error("AI応答のパースに失敗しました");
    }

    // 型チェックとバリデーション
    if (!parsedContent.monthlyGoals || !Array.isArray(parsedContent.monthlyGoals)) {
      throw new Error("monthlyGoalsが不正です");
    }
    if (!parsedContent.keyMessage || typeof parsedContent.keyMessage !== "string") {
      throw new Error("keyMessageが不正です");
    }
    if (!parsedContent.monthlyStrategy || !Array.isArray(parsedContent.monthlyStrategy)) {
      throw new Error("monthlyStrategyが不正です");
    }
    if (!parsedContent.weeklyPlans || !Array.isArray(parsedContent.weeklyPlans)) {
      throw new Error("weeklyPlansが不正です");
    }

    // 計画開始日（今日）
    const planStartDate = new Date();

    // 週ごとの日付を計算して更新
    const weeklyPlansWithDates = parsedContent.weeklyPlans.map((plan: any) => {
      const weekDates = calculateWeekDates(plan.week, planStartDate);
      return {
        ...plan,
        startDate: weekDates.startDate,
        endDate: weekDates.endDate,
      };
    });

    return {
      weeklyTasks: parsedContent.weeklyTasks || [],
      monthlyStrategy: parsedContent.monthlyStrategy || [],
      weeklyPlans: weeklyPlansWithDates,
      monthlyGoals: parsedContent.monthlyGoals,
      keyMessage: parsedContent.keyMessage,
      recommendedPostingTimes: parsedContent.recommendedPostingTimes,
      strategyUrl: parsedContent.strategyUrl,
    };
  } catch (error) {
    console.error("OpenAI API エラー:", error);
    throw new Error(
      `AI提案の生成に失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * POST: AI計画提案を生成
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await requireAuthContext(request);
    const userId = authContext.uid;

    const body = await request.json();
    const { formData, simulationResult } = body;

    if (!formData || !simulationResult) {
      return NextResponse.json(
        { error: "formDataとsimulationResultが必要です" },
        { status: 400 }
      );
    }

    const suggestion = await generateAIPlanSuggestion(formData, simulationResult, userId);

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error("AI計画提案エラー:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "AI計画提案の生成に失敗しました",
      },
      { status: 500 }
    );
  }
}

