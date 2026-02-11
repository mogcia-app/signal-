/**
 * PlanAIGenerationService（AI生成サービス層）
 * 
 * 責務: AIによるコンテンツ計画生成
 * PlanEngineから分離して、AI依存を明確化
 */

import OpenAI from "openai"
import { PlanInput } from "../plan-input"
import { StrategyPlan } from "../strategy-plan"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface AIGenerationResult {
  postingSchedule: {
    feedPosts: Array<{ day: string; time: string; type?: string }>
    storyPosts: Array<{ day: string; time: string }>
  }
  weeklyPlans: StrategyPlan["weeklyPlans"]
  expectedResults?: StrategyPlan["expectedResults"]
  features?: string[]
  suggestedContentTypes?: string[]
}

export class PlanAIGenerationService {
  private static readonly DEFAULT_DAYS = ["月曜", "火曜", "水曜", "木曜", "金曜", "土曜", "日曜"] as const

  private static toWeeklyCount(value: number): number {
    return Math.max(0, Math.round(value))
  }

  private static dayIndex(day: string): number {
    const normalized = (day || "").replace("曜日", "").replace("曜", "").trim()
    const idx = ["月", "火", "水", "木", "金", "土", "日"].indexOf(normalized)
    return idx === -1 ? 7 : idx
  }

  private static normalizeWeeklyPlans(
    weeklyPlansInput: unknown[],
    input: PlanInput,
    simulationResult: {
      weeklyIncreases: number[]
      weeklyPostsNum: number
      weeklyReelPosts: number
    }
  ): StrategyPlan["weeklyPlans"] {
    const feedPerWeek = this.toWeeklyCount(simulationResult.weeklyPostsNum)
    const reelPerWeek = this.toWeeklyCount(simulationResult.weeklyReelPosts)
    const themes = [
      "ブランド紹介・認知度アップ",
      "お客様の声・信頼構築",
      "業界ノウハウ・専門性アピール",
      "エンゲージメント強化・交流",
    ]

    const normalizedWeeks: StrategyPlan["weeklyPlans"] = []
    let cumulativeFollowers = input.currentFollowers

    for (let week = 1; week <= 4; week++) {
      const source = (weeklyPlansInput.find((wp) => {
        const weekNo = (wp as { week?: number })?.week
        return weekNo === week
      }) ||
        weeklyPlansInput[week - 1] ||
        {}) as {
        targetFollowers?: number
        increase?: number
        theme?: string
        feedPosts?: Array<{ day?: string; content?: string; type?: string }>
        storyContent?: string | string[]
      }

      const weeklyIncrease = simulationResult.weeklyIncreases[week - 1] || 0
      cumulativeFollowers += weeklyIncrease

      const rawPosts = Array.isArray(source.feedPosts) ? source.feedPosts : []
      const normalizedRaw = rawPosts.map((post, idx) => ({
        day: post.day || this.DEFAULT_DAYS[idx % this.DEFAULT_DAYS.length],
        content: post.content || "投稿コンテンツ",
        type: post.type === "reel" ? "reel" as const : "feed" as const,
      }))

      const dedupeByDay = (posts: Array<{ day: string; content: string; type: "feed" | "reel" }>) => {
        const seen = new Set<string>()
        return posts.filter((p) => {
          if (seen.has(p.day)) return false
          seen.add(p.day)
          return true
        })
      }

      const feedPosts = dedupeByDay(normalizedRaw.filter((p) => p.type === "feed"))
      const reelPosts = dedupeByDay(normalizedRaw.filter((p) => p.type === "reel"))
      const usedDays = new Set<string>([...feedPosts, ...reelPosts].map((p) => p.day))

      const getNextAvailableDay = (seed: number) => {
        for (let i = 0; i < this.DEFAULT_DAYS.length; i++) {
          const candidate = this.DEFAULT_DAYS[(seed + i) % this.DEFAULT_DAYS.length]
          if (!usedDays.has(candidate)) {
            return candidate
          }
        }
        return this.DEFAULT_DAYS[seed % this.DEFAULT_DAYS.length]
      }

      while (feedPosts.length < feedPerWeek) {
        const idx = feedPosts.length + reelPosts.length
        const day = getNextAvailableDay(idx)
        feedPosts.push({
          day,
          content: `${source.theme || themes[week - 1]}（フィード）`,
          type: "feed",
        })
        usedDays.add(day)
      }

      while (reelPosts.length < reelPerWeek) {
        const idx = reelPosts.length + feedPerWeek
        const day = getNextAvailableDay(idx)
        reelPosts.push({
          day,
          content: `${source.theme || themes[week - 1]}（リール）`,
          type: "reel",
        })
        usedDays.add(day)
      }

      const combinedPosts = [...feedPosts.slice(0, feedPerWeek), ...reelPosts.slice(0, reelPerWeek)]
        .sort((a, b) => this.dayIndex(a.day) - this.dayIndex(b.day))

      normalizedWeeks.push({
        week,
        targetFollowers: source.targetFollowers || cumulativeFollowers,
        increase: source.increase || weeklyIncrease,
        theme: source.theme || themes[week - 1],
        feedPosts: combinedPosts,
        storyContent: source.storyContent || [],
      })
    }

    return normalizedWeeks
  }

  private static normalizePostingSchedule(
    postingScheduleInput: unknown,
    weeklyPlans: StrategyPlan["weeklyPlans"],
    storyPostsPerWeek: number
  ): AIGenerationResult["postingSchedule"] {
    const parsed = (postingScheduleInput || {}) as {
      feedPosts?: Array<{ day?: string; time?: string; type?: string }>
      storyPosts?: Array<{ day?: string; time?: string }>
    }

    const week1 = weeklyPlans.find((wp) => wp.week === 1)
    const week1Posts = week1?.feedPosts || []
    const scheduleMap = new Map(
      (Array.isArray(parsed.feedPosts) ? parsed.feedPosts : [])
        .filter((p) => p.day)
        .map((p) => [`${p.day}|${p.type === "reel" ? "reel" : "feed"}`, p.time || "13:00"])
    )

    const feedPosts = week1Posts.map((post) => {
      const type = post.type === "reel" ? "reel" : "feed"
      const key = `${post.day}|${type}`
      return {
        day: post.day,
        type,
        time: scheduleMap.get(key) || (type === "reel" ? "19:00" : "13:00"),
      }
    })

    let storyPosts = Array.isArray(parsed.storyPosts)
      ? parsed.storyPosts
          .filter((p) => p.day)
          .map((p) => ({ day: p.day || "月曜", time: p.time || "11:00" }))
      : []

    if (storyPosts.length === 0 && storyPostsPerWeek > 0) {
      storyPosts = Array.from({ length: storyPostsPerWeek }).map((_, idx) => ({
        day: this.DEFAULT_DAYS[idx % this.DEFAULT_DAYS.length],
        time: "11:00",
      }))
    }

    return { feedPosts, storyPosts }
  }

  /**
   * AIでコンテンツ計画を生成
   */
  static async generateWeeklyPlans(
    input: PlanInput,
    simulationResult: {
      weeklyIncreases: number[]
      calculatedExpectedResults: StrategyPlan["expectedResults"]
      weeklyPostsNum: number
      weeklyReelPosts: number
      monthlyFeedPosts: number
      reelPosts: number
      storyPosts: number
    }
  ): Promise<AIGenerationResult> {
    const prompt = this.buildPrompt(input, simulationResult)

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "あなたはInstagramマーケティングの専門家です。JSON形式のみで回答してください。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      })

      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new Error("AI response is empty")
      }

      const parsed = JSON.parse(content)

      const weeklyPlans = this.normalizeWeeklyPlans(
        Array.isArray(parsed.weeklyPlans) ? parsed.weeklyPlans : [],
        input,
        simulationResult
      )
      const postingSchedule = this.normalizePostingSchedule(
        parsed.postingSchedule,
        weeklyPlans,
        simulationResult.storyPosts
      )

      return {
        postingSchedule,
        weeklyPlans,
        expectedResults: parsed.expectedResults || simulationResult.calculatedExpectedResults,
        features: parsed.features || [],
        suggestedContentTypes: parsed.suggestedContentTypes || [],
      }
    } catch (error) {
      console.error("AI生成エラー:", error)
      // フォールバック: デフォルト計画を返す
      return this.generateFallbackPlan(input, simulationResult)
    }
  }

  /**
   * プロンプトを構築
   */
  private static buildPrompt(
    input: PlanInput,
    simulationResult: {
      weeklyIncreases: number[]
      calculatedExpectedResults: StrategyPlan["expectedResults"]
      weeklyPostsNum: number
      weeklyReelPosts: number
      monthlyFeedPosts: number
      reelPosts: number
      storyPosts: number
    }
  ): string {
    const { weeklyIncreases, calculatedExpectedResults, weeklyPostsNum, weeklyReelPosts, monthlyFeedPosts, reelPosts, storyPosts } = simulationResult

    // 投稿頻度の文字列表現
    const weeklyPostsText = input.weeklyPosts === "none" ? "投稿しない" 
      : input.weeklyPosts === "weekly-1-2" ? "週に1〜2回" 
      : input.weeklyPosts === "weekly-3-4" ? "週に3〜4回" 
      : input.weeklyPosts === "daily" ? "毎日" 
      : `週${weeklyPostsNum}回`

    const reelCapabilityText = input.reelCapability === "none" ? "投稿しない"
      : input.reelCapability === "weekly-1-2" ? "週に1〜2回"
      : input.reelCapability === "weekly-3-4" ? "週に3〜4回"
      : input.reelCapability === "daily" ? "毎日"
      : "その他"

    const postingTimeText = input.postingTime === "morning" ? "午前中（9:00〜12:00）"
      : input.postingTime === "noon" ? "昼（12:00〜15:00）"
      : input.postingTime === "evening" ? "夕方（15:00〜18:00）"
      : input.postingTime === "night" ? "夜（18:00〜21:00）"
      : input.postingTime === "midnight" ? "深夜（21:00〜24:00）"
      : "AIが最適な時間を提案"

    // 計画開始日の曜日を取得（AIに伝えるため）
    const startDate = new Date(input.startDate)
    const startDayOfWeek = startDate.getDay()
    const dayNames = ["日", "月", "火", "水", "木", "金", "土"]
    const startDayName = dayNames[startDayOfWeek]

    return `Instagramマーケティングの専門家として、4週間のコンテンツ計画を生成してください。

【基本情報】
目的: ${input.operationPurpose}
フォロワー: ${input.currentFollowers}人 → ${input.targetFollowers}人
投稿頻度: フィード週${Math.round(weeklyPostsNum)}回、リール週${Math.round(weeklyReelPosts)}回${storyPosts > 0 ? `、ストーリーズ週${storyPosts}回` : ""}
${input.targetAudience ? `ターゲット: ${input.targetAudience}` : ""}
${input.postingTime ? `希望時間帯: ${postingTimeText}` : ""}
計画開始日: ${startDayName}曜日

【出力形式（JSONのみ）】
{
  "postingSchedule": {
    "feedPosts": [
      {"day": "火曜", "time": "19:00", "type": "feed"}
    ],
    "storyPosts": ${storyPosts > 0 ? `[{"day": "月曜", "time": "11:00"}]` : "[]"}
  },
  "weeklyPlans": [
    {
      "week": 1,
      "targetFollowers": ${input.currentFollowers + weeklyIncreases[0]},
      "increase": ${weeklyIncreases[0]},
      "theme": "テーマ名",
      "feedPosts": [
        {"day": "火曜", "content": "具体的な投稿内容", "type": "feed"}
      ],
      "storyContent": ${storyPosts > 0 ? `["月曜: 内容", "火曜: 内容"]` : "[]"}
    }
  ],
  "expectedResults": {
    "monthlyReach": ${calculatedExpectedResults.monthlyReach},
    "engagementRate": "${calculatedExpectedResults.engagementRate}",
    "profileViews": ${calculatedExpectedResults.profileViews},
    "saves": ${calculatedExpectedResults.saves},
    "newFollowers": ${calculatedExpectedResults.newFollowers}
  },
  "features": ["週${weeklyPostsNum}回投稿", "${input.operationPurpose}に最適な構成"],
  "suggestedContentTypes": ["種類1", "種類2", "種類3"]
}

【必須要件（厳守）】
1. 計画開始日は${startDayName}曜日です。週の開始日を${startDayName}曜日として計算してください。
2. postingSchedule.feedPostsには、フィード週${Math.round(weeklyPostsNum)}回とリール週${Math.round(weeklyReelPosts)}回の合計回数分を設定し、各投稿に"type"を含めてください。
3. 各週のfeedPostsには必ず"day"（例: "火曜"）、"content"、"type"（"feed"または"reel"）の3つを含めてください。"type"が欠けている投稿は無効です。
4. 各週で必ずリール週${Math.round(weeklyReelPosts)}回（type:"reel"）を含めてください。各週の残りはフィード（type:"feed"）にしてください。
5. 各週のテーマは"${input.operationPurpose}"に沿った内容にしてください。
6. suggestedContentTypesに3〜5個の投稿種類を提案してください。

【重要】"day"フィールドと"type"フィールドが欠けている投稿は生成しないでください。すべての投稿に必ず"day"、"content"、"type"を含めてください。`
  }

  /**
   * フォールバック: デフォルト計画を生成
   */
  private static generateFallbackPlan(
    input: PlanInput,
    simulationResult: {
      weeklyIncreases: number[]
      calculatedExpectedResults: StrategyPlan["expectedResults"]
      weeklyPostsNum: number
      weeklyReelPosts: number
      monthlyFeedPosts: number
      reelPosts: number
      storyPosts: number
    }
  ): AIGenerationResult {
    const { weeklyIncreases, calculatedExpectedResults, weeklyPostsNum, reelPosts, storyPosts } = simulationResult

    // デフォルトの投稿スケジュール
    const postingDays: Array<{ day: string; time: string; type: string }> = []
    const roundedWeeklyPosts = Math.round(weeklyPostsNum)
    if (roundedWeeklyPosts >= 1) postingDays.push({ day: "火曜", time: "19:00", type: "feed" })
    if (roundedWeeklyPosts >= 2) postingDays.push({ day: "金曜", time: "12:00", type: "feed" })
    if (roundedWeeklyPosts >= 3) postingDays.push({ day: "月曜", time: "13:00", type: "feed" })
    if (roundedWeeklyPosts >= 4) postingDays.push({ day: "水曜", time: "15:00", type: "feed" })
    if (roundedWeeklyPosts >= 5) postingDays.push({ day: "木曜", time: "18:00", type: "feed" })
    if (roundedWeeklyPosts >= 6) postingDays.push({ day: "土曜", time: "12:00", type: "feed" })
    if (roundedWeeklyPosts >= 7) postingDays.push({ day: "日曜", time: "14:00", type: "feed" })

    const storyDays: Array<{ day: string; time: string }> = []
    if (storyPosts > 0) {
      const storyDayNames = ["月", "火", "水", "木", "金", "土", "日"]
      for (let i = 0; i < storyPosts; i++) {
        storyDays.push({ day: `${storyDayNames[i]}曜`, time: "11:00" })
      }
    }

    // デフォルトの週次計画
    const week1Target = input.currentFollowers + weeklyIncreases[0]
    const week2Target = week1Target + weeklyIncreases[1]
    const week3Target = week2Target + weeklyIncreases[2]

    const weeklyPlans: StrategyPlan["weeklyPlans"] = [
      {
        week: 1,
        targetFollowers: week1Target,
        increase: weeklyIncreases[0],
        theme: "ブランド紹介・認知度アップ",
        feedPosts: postingDays.slice(0, roundedWeeklyPosts).map((day, idx) => ({
          day: day.day,
          content: idx === 0 ? "ブランドストーリー(カルーセル)" : "提供サービス一覧",
          type: day.type === "reel" ? "reel" : undefined,
        })),
        storyContent: storyPosts > 0 && storyDays.length > 0 
          ? storyDays.map((d, idx) => `${d.day}: ${idx === 0 ? "今週のテーマ予告" : idx === 1 ? "ブランドの歴史・創業秘話" : "週の振り返り"}`)
          : [],
      },
      {
        week: 2,
        targetFollowers: week2Target,
        increase: weeklyIncreases[1],
        theme: "お客様の声・信頼構築",
        feedPosts: postingDays.slice(0, roundedWeeklyPosts).map((day, idx) => ({
          day: day.day,
          content: idx === 0 ? "お客様インタビュー" : "ビフォーアフター事例",
          type: (reelPosts > 0 && idx === postingDays.length - 1) ? "reel" : undefined,
        })),
        storyContent: storyPosts > 0 && storyDays.length > 0
          ? storyDays.map((d, idx) => `${d.day}: ${idx === 0 ? "今週のテーマ紹介" : idx === 1 ? "製造現場の裏側" : "スタッフメッセージ"}`)
          : [],
      },
      {
        week: 3,
        targetFollowers: week3Target,
        increase: weeklyIncreases[2],
        theme: "業界ノウハウ・専門性アピール",
        feedPosts: postingDays.slice(0, roundedWeeklyPosts).map((day, idx) => ({
          day: day.day,
          content: idx === 0 ? "業界トレンド解説" : "お役立ち情報",
          type: (reelPosts > 1 && idx === postingDays.length - 1) ? "reel" : undefined,
        })),
        storyContent: storyPosts > 0 && storyDays.length > 0
          ? storyDays.map((d, idx) => `${d.day}: ${idx === 0 ? "今週の注目製品" : idx === 1 ? "製品の使い方ヒント" : "お客様の反応シェア"}`)
          : [],
      },
      {
        week: 4,
        targetFollowers: input.targetFollowers,
        increase: weeklyIncreases[3],
        theme: "エンゲージメント強化・交流",
        feedPosts: postingDays.slice(0, roundedWeeklyPosts).map((day, idx) => ({
          day: day.day,
          content: idx === 0 ? "フォロワー参加型企画" : "1ヶ月振り返り",
          type: (reelPosts > 2 && idx === postingDays.length - 1) ? "reel" : undefined,
        })),
        storyContent: storyPosts > 0 && storyDays.length > 0
          ? storyDays.map((d, idx) => `${d.day}: ${idx === 0 ? "来月の予告" : idx === 1 ? "スタッフが語るビジョン" : "1ヶ月の感謝メッセージ"}`)
          : [],
      },
    ]

    // デフォルトのfeatures
    const features = [
      `週${weeklyPostsNum}回投稿(フィード${Math.max(0, roundedWeeklyPosts - Math.floor(reelPosts / 4))}回+リール月${reelPosts}回)`,
      "1日平均15分の作業時間",
      `${input.operationPurpose}に最適なコンテンツ構成`,
      ...(storyPosts > 0 ? ["ストーリーズで日常的な接点を維持"] : []),
    ]

    // デフォルトのsuggestedContentTypes
    const contentTypeMap: Record<string, string[]> = {
      "認知拡大": ["商品・サービスの紹介", "ブランドストーリー", "企業理念", "イベント・キャンペーン情報"],
      "採用・リクルーティング強化": ["スタッフの日常", "社員インタビュー", "オフィス環境紹介", "募集職種案内", "先輩メッセージ"],
      "商品・サービスの販売促進": ["商品・サービスの紹介", "お客様の声", "ビフォーアフター", "使用例・活用方法"],
      "ファンを作りたい": ["スタッフの日常", "舞台裏・制作過程", "お客様の声", "コミュニティ活動"],
      "来店・問い合わせを増やしたい": ["イベント・キャンペーン情報", "店舗情報", "お客様の声", "限定情報"],
      "企業イメージ・ブランディング": ["企業理念", "ブランドストーリー", "社会貢献活動", "舞台裏・制作過程"],
    }
    const suggestedContentTypes = contentTypeMap[input.operationPurpose] || ["商品・サービスの紹介", "お客様の声", "スタッフの日常"]

    return {
      postingSchedule: {
        feedPosts: postingDays,
        storyPosts: storyDays,
      },
      weeklyPlans,
      expectedResults: calculatedExpectedResults,
      features,
      suggestedContentTypes,
    }
  }
}
