import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { PlanFormData, SimulationResult, AIPlanSuggestion } from "@/app/instagram/plan/types/plan";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 投稿を週内に均等分散する関数
 */
function distributePosts(count: number, totalDays: number): number[] {
  if (count === 0) return [];
  if (count >= totalDays) return Array.from({ length: totalDays }, (_, i) => i);
  
  const interval = Math.floor(totalDays / count);
  return Array.from({ length: count }, (_, i) => i * interval);
}

/**
 * 週次計画の例を動的生成する関数
 */
function generateWeeklyTasksExample(
  feed: number,
  reel: number,
  story: number
): string {
  const examples: string[] = [];
  const days = ["月曜", "火曜", "水曜", "木曜", "金曜", "土曜", "日曜"];
  
  // フィード投稿を分散配置
  const feedDays = distributePosts(feed, 7);
  // リール投稿を分散配置
  const reelDays = distributePosts(reel, 7);
  // ストーリーズ投稿を分散配置（7の場合は毎日）
  const storyDays = story === 7 ? [0, 1, 2, 3, 4, 5, 6] : distributePosts(story, 7);
  
  // すべての投稿を日付順に並べる
  const allPosts: Array<{ day: number; type: string; label: string }> = [];
  
  feedDays.forEach((day) => {
    allPosts.push({ day, type: "feed", label: "フィード投稿" });
  });
  reelDays.forEach((day) => {
    allPosts.push({ day, type: "reel", label: "リール投稿" });
  });
  storyDays.forEach((day) => {
    allPosts.push({ day, type: "story", label: "ストーリーズ投稿" });
  });
  
  // 日付順にソート
  allPosts.sort((a, b) => a.day - b.day);
  
  // 例を生成
  allPosts.forEach((post) => {
    const time = post.type === "feed" ? "13:00" : post.type === "reel" ? "18:00" : "11:00";
    examples.push(
      `        { "day": "${days[post.day]}", "type": "${post.type}", "description": "${post.label}のテーマ", "time": "${time}" }`
    );
  });
  
  return examples.join(",\n");
}

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
  const { weeklyFeedPosts, weeklyReelPosts, weeklyStoryPosts, periodMonths } = formData;
  
  // 計画開始日を取得（指定されていない場合は今日）
  const startDate = planStartDate || new Date();
  
  // 各週の日付を計算
  const weeklyDates = [];
  for (let week = 1; week <= periodMonths * 4; week++) {
    const weekDates = calculateWeekDates(week, startDate);
    weeklyDates.push(weekDates);
  }
  const mainGoal = formData.mainGoal || "フォロワーを増やしたい";
  const targetAudience = formData.targetAudience || "";
  const contentTypes = formData.contentTypes || [];
  const preferredPostingTimes = formData.preferredPostingTimes || [];
  const regionRestriction = formData.regionRestriction;
  const contentTypeOther = formData.contentTypeOther;
  
  // 週の総投稿数を計算
  const totalWeeklyPosts = weeklyFeedPosts + weeklyReelPosts + weeklyStoryPosts;

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
  
  // 週次計画の例を生成
  const weeklyTasksExample = generateWeeklyTasksExample(weeklyFeedPosts, weeklyReelPosts, weeklyStoryPosts);
  
  // 月次戦略のアクション例を生成
  const monthlyStrategyActions = [];
  if (weeklyFeedPosts > 0) {
    monthlyStrategyActions.push(`"フィード投稿を週${weeklyFeedPosts}回行う"`);
  }
  if (weeklyReelPosts > 0) {
    monthlyStrategyActions.push(`"リール投稿を週${weeklyReelPosts}回行う"`);
  }
  if (weeklyStoryPosts > 0) {
    monthlyStrategyActions.push(
      `"ストーリーズを週${weeklyStoryPosts}回投稿する${weeklyStoryPosts === 7 ? "（毎日）" : ""}"`
    );
  }
  if (monthlyStrategyActions.length === 0) {
    monthlyStrategyActions.push('"投稿頻度に基づいたアクション"');
  }

  return `あなたはInstagramマーケティングの専門家です。

## 【最重要】投稿頻度の設定（絶対に守ること）

**この週の投稿構成を必ず守ってください：**
- フィード投稿: ${weeklyFeedPosts}回${weeklyFeedPosts === 0 ? "（提案に含めないでください）" : ""}
- リール投稿: ${weeklyReelPosts}回${weeklyReelPosts === 0 ? "（提案に含めないでください）" : ""}
- ストーリーズ投稿: ${weeklyStoryPosts}回${weeklyStoryPosts === 0 ? "（提案に含めないでください）" : weeklyStoryPosts === 7 ? "（毎日投稿）" : ""}
- **合計: ${totalWeeklyPosts}回/週**

## ユーザー情報
${userProfile?.catchphrase ? `- キャッチコピー: ${userProfile.catchphrase}` : ""}
${userProfile?.description ? `- 事業内容: ${userProfile.description}` : ""}
${userProfile?.businessType ? `- 事業種別: ${userProfile.businessType}` : ""}
${userProfile?.targetMarket ? `- ターゲット市場: ${userProfile.targetMarket}` : ""}
- 主な目標: ${mainGoal}
- 投稿を見てもらいたい人: ${targetAudience || "未指定"}
- 現在のフォロワー数: ${formData.currentFollowers.toLocaleString()}人
- 目標フォロワー数: ${formData.targetFollowers.toLocaleString()}人
- 達成期間: ${periodMonths}ヶ月
- 達成難易度: ${simulationResult.difficultyMessage}
- 投稿内容: ${contentTypesText || "指定なし"}${contentTypeOtherText}
- 投稿時間の希望: ${postingTimesText}
${isAIPreferred ? "- 投稿時間はAIが最適な時間を提案してください" : ""}
- 地域設定: ${regionText}
- 計画開始日: ${planStartDate ? `${planStartDate.getFullYear()}年${planStartDate.getMonth() + 1}月${planStartDate.getDate()}日` : "今日"}

## 出力形式

以下のJSON形式で出力してください。日本語で回答してください。

\`\`\`json
{
  "monthlyStrategy": [
    {
      "week": 1,
      "theme": "認知度を上げる",
      "actions": [
        ${monthlyStrategyActions.join(",\n        ")},
        "ハッシュタグを20〜30個使用してリーチを増やす",
        "ストーリーズで日替わりのおすすめを紹介する"
      ]
    },
    {
      "week": 2,
      "theme": "エンゲージメントを高める",
      "actions": [
        ${monthlyStrategyActions.join(",\n        ")},
        "コメント返信を必ず行い、フォロワーとの対話を増やす",
        "ストーリーズでアンケート機能を活用する"
      ]
    },
    {
      "week": 3,
      "theme": "フォロワーを増やす",
      "actions": [
        ${monthlyStrategyActions.join(",\n        ")},
        "保存される投稿を意識したコンテンツを作成する",
        "フォロワー外へのリーチを増やすコンテンツを投稿する"
      ]
    },
    {
      "week": 4,
      "theme": "ブランドの信頼性を高める",
      "actions": [
        ${monthlyStrategyActions.join(",\n        ")},
        "お客様の声やレビューを紹介する",
        "スタッフの日常や舞台裏を共有する"
      ]
    }
  ],
  "weeklyPlans": [
${weeklyDates.map((dates, index) => {
  const week = index + 1;
  const tasksExample = week === 1 ? weeklyTasksExample : generateWeeklyTasksExample(weeklyFeedPosts, weeklyReelPosts, weeklyStoryPosts);
  return `    {
      "week": ${week},
      "startDate": "${dates.startDate}",
      "endDate": "${dates.endDate}",
      "tasks": [
${tasksExample}
      ]
    }`;
}).join(",\n")}
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
  ]
}
\`\`\`

**重要**: 上記の例は参考です。実際の出力では、ユーザーが設定した投稿頻度（週${weeklyFeedPosts}回のフィード投稿、週${weeklyReelPosts}回のリール投稿、週${weeklyStoryPosts}回のストーリーズ投稿）を**必ず**反映してください。

## 重要な指示

1. **weeklyPlans.tasks配列は必ず${totalWeeklyPosts}個のオブジェクトを含めてください**
   - type="feed"のオブジェクトが${weeklyFeedPosts}個
   - type="reel"のオブジェクトが${weeklyReelPosts}個
   - type="story"のオブジェクトが${weeklyStoryPosts}個
   - ${weeklyFeedPosts === 0 ? "（フィード投稿は含めないでください）" : ""}
   - ${weeklyReelPosts === 0 ? "（リール投稿は含めないでください）" : ""}
   - ${weeklyStoryPosts === 0 ? "（ストーリーズ投稿は含めないでください）" : ""}
   - ${weeklyStoryPosts === 7 ? "（ストーリーズは毎日投稿してください）" : ""}

2. **各週のtasksは月曜から日曜の順番で並べてください**

3. **${periodMonths}ヶ月 = ${periodMonths * 4}週分のweeklyPlansを生成してください**

4. **monthlyStrategy**: ${periodMonths * 4}週分の戦略を提案してください。
   - 各週にはテーマ（例: "認知度を上げる"、"エンゲージメントを高める"）と3〜4個の具体的なアクションを含めてください。
   - **重要**: 各週のactionsには、以下の2種類を含めてください：
     1. 投稿頻度の確認（例: "フィード投稿を週${weeklyFeedPosts}回行う"）${weeklyReelPosts > 0 ? `、"リール投稿を週${weeklyReelPosts}回行う"` : ""}${weeklyStoryPosts > 0 ? `、"ストーリーズを週${weeklyStoryPosts}回投稿する${weeklyStoryPosts === 7 ? "（毎日）" : ""}"` : ""}
     2. その週のテーマに応じた具体的な戦略的アクション（例: "ハッシュタグを20〜30個使用する"、"コメント返信を必ず行う"、"アンケート機能を活用する"、"保存される投稿を意識する"など）
   - **各週で異なるテーマと戦略的アクションを提案してください。** 投稿頻度の確認は各週で同じでも構いませんが、戦略的アクションは週ごとに変化させてください。

5. **monthlyGoals**: 初心者にもわかりやすい具体的な数値で提案してください（例: 「投稿へのいいね: 50個以上」）。現在のフォロワー数（${formData.currentFollowers.toLocaleString()}人）を考慮してください。

**生成前に必ずチェック：**
- [ ] 各週のtasks配列の長さ = ${totalWeeklyPosts}
- [ ] type="feed"の数 = ${weeklyFeedPosts}
- [ ] type="reel"の数 = ${weeklyReelPosts}
- [ ] type="story"の数 = ${weeklyStoryPosts}`;
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

/**
 * AI生成結果を検証する
 */
function validateWeeklyPlans(
  weeklyPlans: any[],
  expectedFeed: number,
  expectedReel: number,
  expectedStory: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  weeklyPlans.forEach((week) => {
    const tasks = week.tasks || [];
    
    // 実際の投稿数をカウント
    const actualFeed = tasks.filter((p: any) => p.type === "feed" || p.type === "feed+reel").length;
    const actualReel = tasks.filter((p: any) => p.type === "reel" || p.type === "feed+reel").length;
    const actualStory = tasks.filter((p: any) => p.type === "story").length;
    
    if (actualFeed !== expectedFeed) {
      errors.push(
        `第${week.week}週: フィード投稿数が不一致（期待: ${expectedFeed}、実際: ${actualFeed}）`
      );
    }
    if (actualReel !== expectedReel) {
      errors.push(
        `第${week.week}週: リール投稿数が不一致（期待: ${expectedReel}、実際: ${actualReel}）`
      );
    }
    if (actualStory !== expectedStory) {
      errors.push(
        `第${week.week}週: ストーリーズ投稿数が不一致（期待: ${expectedStory}、実際: ${actualStory}）`
      );
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
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

  // 計画開始日（formDataから取得、なければ今日）
  const planStartDate = formData.startDate 
    ? new Date(formData.startDate)
    : new Date();

  const prompt = buildPlanSuggestionPrompt(formData, simulationResult, userProfile, planStartDate);

  // 最大3回リトライ
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "あなたはInstagramマーケティングの専門家です。ユーザーの目標達成をサポートするため、具体的で実行可能な提案を行ってください。\n\n【最重要】ユーザーが設定した投稿頻度（週あたりのフィード投稿数、リール投稿数、ストーリーズ投稿数）を絶対に守ってください。投稿頻度設定を無視した提案は絶対に行わないでください。生成したJSONは、必ず投稿頻度設定と一致しているか自己検証してから出力してください。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3, // 一貫性を高めるため低めに設定
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
      if (!parsedContent.monthlyStrategy || !Array.isArray(parsedContent.monthlyStrategy)) {
        throw new Error("monthlyStrategyが不正です");
      }
      if (!parsedContent.weeklyPlans || !Array.isArray(parsedContent.weeklyPlans)) {
        throw new Error("weeklyPlansが不正です");
      }

      // 投稿頻度の検証
      const validation = validateWeeklyPlans(
        parsedContent.weeklyPlans,
        formData.weeklyFeedPosts,
        formData.weeklyReelPosts,
        formData.weeklyStoryPosts
      );

      if (!validation.isValid) {
        console.warn(`AI生成の試行 ${attempts + 1}/${maxAttempts} で検証エラー:`, validation.errors);
        attempts++;
        
        if (attempts >= maxAttempts) {
          throw new Error(
            `${maxAttempts}回試行しましたが、正しい投稿頻度で生成できませんでした。エラー: ${validation.errors.join(", ")}`
          );
        }
        
        // 次の試行前に少し待機
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

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
        recommendedPostingTimes: parsedContent.recommendedPostingTimes,
        strategyUrl: parsedContent.strategyUrl,
      };
    } catch (error) {
      attempts++;
      console.warn(`AI生成の試行 ${attempts}/${maxAttempts} 失敗:`, error);
      
      if (attempts >= maxAttempts) {
        console.error("OpenAI API エラー:", error);
        throw new Error(
          `${maxAttempts}回試行しましたが、正しい形式で生成できませんでした: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
      
      // 次の試行前に少し待機
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error("予期しないエラー");
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

