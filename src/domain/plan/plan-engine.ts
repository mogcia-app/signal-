/**
 * PlanEngine（ビジネスロジック層）
 * 
 * 責務: PlanInput → StrategyPlan → ExecutionState の変換
 * 
 * 重要: これは「transformer」ではなく「ビジネスロジック層」です
 */

import { PlanInput } from "./plan-input"
import { StrategyPlan } from "./strategy-plan"
import { ExecutionState } from "./execution-state"
import { UserProfile } from "@/types/user"
import { getCurrentWeekIndex } from "@/lib/plans/weekly-plans"
import { getLocalDate, getLocalDateForDate } from "@/lib/utils/timezone"

export class PlanEngine {
  /**
   * PlanInputからStrategyPlanを生成
   * 
   * これは既存の plan-generate ロジックをドメインロジックとして抽出したもの
   * 
   * 重要: このメソッドは保存されたシミュレーション結果（plan.simulationResult）を参照しません。
   * AI生成には、PlanInputから再計算したシミュレーション結果のみを使用します。
   * 保存されたシミュレーション結果は、ホームページの必要KPI表示用のみに使用されます。
   */
  static async buildStrategy(
    input: PlanInput,
    userProfile: UserProfile,
    lastMonthPerformance: {
      monthlyReach: number
      engagementRate: number
      profileViews: number
      saves: number
      newFollowers: number
      postCount: number
    } | null = null
  ): Promise<StrategyPlan> {
    // シミュレーション計算（PlanInputから再計算。保存されたシミュレーション結果は使用しない）
    const simulation = await this.generateSimulation(input, lastMonthPerformance)
    
    // AI生成サービスをインポート（循環依存を避けるため動的インポート）
    const { PlanAIGenerationService } = await import("./services/plan-ai-service")
    
    // AIでコンテンツ計画を生成
    const aiResult = await PlanAIGenerationService.generateWeeklyPlans(input, {
      weeklyIncreases: simulation.weeklyIncreases,
      calculatedExpectedResults: simulation.expectedResults,
      weeklyPostsNum: simulation.weeklyPostsNum,
      weeklyReelPosts: simulation.weeklyReelPosts,
      monthlyFeedPosts: simulation.monthlyFeedPosts,
      reelPosts: simulation.reelPosts,
      storyPosts: simulation.storyPosts,
    })
    
    // 投稿スケジュールを設定（AI生成またはデフォルト）
    const postingDays = aiResult.postingSchedule.feedPosts.map(p => ({
      day: p.day,
      time: p.time,
      type: p.type || "feed",
    }))
    
    const storyDays = aiResult.postingSchedule.storyPosts.map(p => ({
      day: p.day,
      time: p.time,
    }))
    
    // 期間を計算
    const startDate = new Date(input.startDate)
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)
    
    // StrategyPlanを構築
    const strategy: StrategyPlan = {
      id: "temp-id", // 保存時に実際のIDが割り当てられる
      planInputId: "temp-input-id",
      userId: input.userId,
      snsType: input.snsType,
      weeklyPlans: aiResult.weeklyPlans,
      schedule: {
        weeklyFrequency: `週${Math.round(simulation.weeklyPostsNum)}回`,
        feedPosts: simulation.monthlyFeedPosts,
        reelPosts: simulation.reelPosts,
        storyPosts: simulation.storyPosts,
        postingDays,
        storyDays,
      },
      expectedResults: aiResult.expectedResults || simulation.expectedResults,
      difficulty: simulation.difficulty,
      monthlyGrowthRate: `${simulation.monthlyGrowthRate.toFixed(1)}%`,
      features: aiResult.features,
      suggestedContentTypes: aiResult.suggestedContentTypes,
      startDate,
      endDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    return strategy
  }
  
  /**
   * StrategyPlanからExecutionStateを生成
   * 
   * 現在の日付を基準に、今日やること、明日の準備、今週の予定を生成
   */
  static startExecution(
    strategy: StrategyPlan,
    _currentDate: Date = new Date(),
    timezone: string = "Asia/Tokyo"
  ): ExecutionState {
    const localDate = getLocalDate(timezone)
    const [year, month, day] = localDate.split("-").map(Number)
    const today = new Date(year, month - 1, day)
    
    // 週番号を取得
    const weekIndex = getCurrentWeekIndex(strategy.startDate, localDate, timezone)
    const currentWeek = weekIndex + 1
    
    console.log("[PlanEngine.startExecution] 週番号計算:", {
      startDate: strategy.startDate,
      localDate,
      weekIndex,
      currentWeek,
      weeklyPlansCount: strategy.weeklyPlans.length,
      weeklyPlansWeeks: strategy.weeklyPlans.map(wp => wp.week),
    })
    
    // 現在の週の計画を取得
    const currentWeekPlan = strategy.weeklyPlans.find(wp => wp.week === currentWeek)
    
    console.log("[PlanEngine.startExecution] 現在の週の計画:", {
      currentWeek,
      found: !!currentWeekPlan,
      feedPostsCount: currentWeekPlan?.feedPosts.length || 0,
      feedPosts: currentWeekPlan?.feedPosts.map(p => ({ day: p.day, content: p.content, type: p.type })) || [],
    })
    
    // StrategyPlanから直接タスクを抽出
    // 現在の週の計画から今日のタスクを取得
    const todayDayNameShort = ["日", "月", "火", "水", "木", "金", "土"][today.getDay()]
    const todayDayNameLong = `${todayDayNameShort}曜`
    
    console.log("[PlanEngine.startExecution] 今日の情報:", {
      today: localDate,
      todayDayNameShort,
      todayDayNameLong,
      todayDayOfWeek: today.getDay(),
    })
    
    // 現在の週の計画から今日のタスクを抽出（「火」と「火曜」の両方に対応）
    const todayTasksRaw = currentWeekPlan ? currentWeekPlan.feedPosts
      .filter(post => {
        const postDay = post.day || ""
        // 「火」「火曜」「火曜日」など、様々な形式に対応
        const normalizedPostDay = postDay.replace("曜日", "").replace("曜", "").trim()
        const normalizedTodayDay = todayDayNameShort.trim()
        // より柔軟なマッチング: 正規化した文字列で比較
        const matches = postDay === todayDayNameShort || 
               postDay === todayDayNameLong || 
               postDay.includes(todayDayNameShort) ||
               normalizedPostDay === normalizedTodayDay ||
               postDay.replace("曜", "") === todayDayNameShort ||
               postDay.replace("曜日", "") === todayDayNameShort
        
        // デバッグログ: マッチング結果を記録
        if (currentWeekPlan.feedPosts.length > 0) {
          console.log("[PlanEngine.startExecution] 曜日マッチング:", {
            postDay,
            todayDayNameShort,
            todayDayNameLong,
            normalizedPostDay,
            normalizedTodayDay,
            matches,
          })
        }
        
        return matches
      })
      .map((post) => {
        // postingDaysから時間を取得（dayの形式が異なる可能性があるため、柔軟にマッチング）
        const postingDay = strategy.schedule.postingDays.find(pd => {
          const pdDay = pd.day || ""
          const postDay = post.day || ""
          const normalizedPdDay = pdDay.replace("曜日", "").replace("曜", "").trim()
          const normalizedPostDay = postDay.replace("曜日", "").replace("曜", "").trim()
          return pdDay === postDay || 
                 pdDay.includes(postDay.replace("曜", "")) || 
                 postDay.includes(pdDay.replace("曜", "")) ||
                 normalizedPdDay === normalizedPostDay
        })
        return {
          day: post.day || todayDayNameLong,
          type: (post.type || "feed") as "feed" | "reel" | "story",
          description: post.content || "投稿",
          time: postingDay?.time || "12:00",
        }
      }) : []
    
    console.log("[PlanEngine.startExecution] 今日のタスク抽出結果:", {
      todayTasksRawCount: todayTasksRaw.length,
      todayTasksRaw: todayTasksRaw.map(t => ({ day: t.day, type: t.type, description: t.description, time: t.time })),
      feedPostsDays: currentWeekPlan?.feedPosts.map(p => ({ day: p.day, content: p.content })) || [],
      feedPostsCount: currentWeekPlan?.feedPosts.length || 0,
      todayDayNameShort,
      todayDayNameLong,
      currentWeek,
      currentWeekPlanExists: !!currentWeekPlan,
    })
    
    const todayTasks = todayTasksRaw.map((task) => ({
      type: task.type,
      description: task.description || `${task.type === "feed" ? "フィード" : task.type === "reel" ? "リール" : "ストーリーズ"}投稿`,
      time: task.time,
      day: task.day,
    }))
    
    // 明日の準備
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDayNameShort = ["日", "月", "火", "水", "木", "金", "土"][tomorrow.getDay()]
    const tomorrowDayNameLong = `${tomorrowDayNameShort}曜`
    const tomorrowLocalDate = getLocalDateForDate(tomorrow, timezone)
    const tomorrowWeekIndex = getCurrentWeekIndex(strategy.startDate, tomorrowLocalDate, timezone)
    const tomorrowWeekNumber = tomorrowWeekIndex + 1
    const tomorrowWeekPlan = strategy.weeklyPlans.find(wp => wp.week === tomorrowWeekNumber)
    
    const tomorrowTasksRaw = tomorrowWeekPlan ? tomorrowWeekPlan.feedPosts
      .filter(post => {
        const postDay = post.day || ""
        // 「火」「火曜」「火曜日」など、様々な形式に対応
        const normalizedPostDay = postDay.replace("曜日", "").replace("曜", "").trim()
        const normalizedTomorrowDay = tomorrowDayNameShort.trim()
        // より柔軟なマッチング: 正規化した文字列で比較
        const matches = postDay === tomorrowDayNameShort || 
               postDay === tomorrowDayNameLong || 
               postDay.includes(tomorrowDayNameShort) ||
               normalizedPostDay === normalizedTomorrowDay ||
               postDay.replace("曜", "") === tomorrowDayNameShort ||
               postDay.replace("曜日", "") === tomorrowDayNameShort
        return matches
      })
      .map((post) => {
        // postingDaysから時間を取得（dayの形式が異なる可能性があるため、柔軟にマッチング）
        const postingDay = strategy.schedule.postingDays.find(pd => {
          const pdDay = pd.day || ""
          const postDay = post.day || ""
          const normalizedPdDay = pdDay.replace("曜日", "").replace("曜", "").trim()
          const normalizedPostDay = postDay.replace("曜日", "").replace("曜", "").trim()
          return pdDay === postDay || 
                 pdDay.includes(postDay.replace("曜", "")) || 
                 postDay.includes(pdDay.replace("曜", "")) ||
                 normalizedPdDay === normalizedPostDay
        })
        return {
          day: post.day || tomorrowDayNameLong,
          type: (post.type || "feed") as "feed" | "reel" | "story",
          description: post.content || "投稿",
          time: postingDay?.time || "12:00",
        }
      }) : []
    const tomorrowPreparation = tomorrowTasksRaw.map((task) => ({
      type: task.type,
      description: task.description || `${task.type === "feed" ? "フィード" : task.type === "reel" ? "リール" : "ストーリーズ"}投稿の準備`,
      time: task.time,
      day: task.day,
    }))
    
    // 今週の予定
    const weeklySchedule = currentWeekPlan ? {
      week: currentWeekPlan.week,
      theme: currentWeekPlan.theme || null,
      targetFollowers: currentWeekPlan.targetFollowers,
      increase: currentWeekPlan.increase,
      tasks: currentWeekPlan.feedPosts.map((post) => {
        // postingDaysから時間を取得（dayの形式が異なる可能性があるため、柔軟にマッチング）
        const postingDay = strategy.schedule.postingDays.find(pd => {
          const pdDay = pd.day || ""
          const postDay = post.day || ""
          const normalizedPdDay = pdDay.replace("曜日", "").replace("曜", "").trim()
          const normalizedPostDay = postDay.replace("曜日", "").replace("曜", "").trim()
          return pdDay === postDay || 
                 pdDay.includes(postDay.replace("曜", "")) || 
                 postDay.includes(pdDay.replace("曜", "")) ||
                 normalizedPdDay === normalizedPostDay
        })
        return {
          day: post.day,
          type: (post.type || "feed") as "feed" | "reel" | "story",
          description: post.content,
          time: postingDay?.time || "",
        }
      }),
      storyContent: currentWeekPlan.storyContent,
    } : null
    
    // 今月の目標
    const monthlyGoals = strategy.expectedResults.newFollowers > 0 ? [{
      metric: "フォロワー数",
      target: `${strategy.expectedResults.newFollowers.toLocaleString()}人`,
    }] : []
    
    return {
      strategyPlanId: strategy.id,
      userId: strategy.userId,
      currentWeek,
      currentDate: today,
      todayTasks,
      tomorrowPreparation,
      weeklySchedule,
      monthlyGoals,
      lastUpdated: new Date(),
    }
  }
  
  /**
   * 次の週に進める
   */
  static nextWeek(state: ExecutionState, strategy: StrategyPlan): ExecutionState {
    const nextWeekState = {
      ...state,
      currentWeek: state.currentWeek + 1,
      currentDate: new Date(state.currentDate.getTime() + 7 * 24 * 60 * 60 * 1000),
    }
    return this.startExecution(strategy, nextWeekState.currentDate)
  }
  
  /**
   * シミュレーション計算
   * 
   * 既存のシミュレーションロジックをここに移動
   */
  static async generateSimulation(
    input: PlanInput,
    lastMonthPerformance: {
      monthlyReach: number
      engagementRate: number
      profileViews: number
      saves: number
      newFollowers: number
      postCount: number
    } | null
  ): Promise<{
    monthlyGrowthRate: number
    difficulty: {
      stars: string
      label: string
      industryRange: string
      achievementRate: number
    }
    expectedResults: {
      monthlyReach: number
      engagementRate: string
      profileViews: number
      saves: number
      newFollowers: number
    }
    weeklyIncreases: number[]
    monthlyFeedPosts: number
    reelPosts: number
    storyPosts: number
    weeklyPostsNum: number
    weeklyReelPosts: number
  }> {
    // 投稿頻度の計算
    const weeklyPostsNum = this.convertWeeklyPostsToNumber(input.weeklyPosts)
    const monthlyFeedPosts = Math.round(weeklyPostsNum * 4)
    
    const weeklyReelPosts = this.convertWeeklyPostsToNumber(input.reelCapability)
    const reelPosts = Math.round(weeklyReelPosts * 4)
    
    const storyPosts = this.convertStoryFrequencyToNumber(input.storyFrequency)
    
    // 目標フォロワー数と成長率
    const followerIncrease = input.targetFollowers - input.currentFollowers
    const monthlyGrowthRate = (followerIncrease / input.currentFollowers) * 100
    
    // 週ごとの増加数を計算
    const weeklyIncreases: number[] = []
    for (let i = 0; i < 4; i++) {
      const baseIncrease = Math.floor(followerIncrease / 4)
      const remainder = i < (followerIncrease % 4) ? 1 : 0
      weeklyIncreases.push(baseIncrease + remainder)
    }
    
    // 予想される成果を計算
    const totalMonthlyPosts = monthlyFeedPosts + reelPosts
    let expectedResults: StrategyPlan["expectedResults"]
    
    if (lastMonthPerformance) {
      // 2ヶ月目以降：先月の実績を基に予想値を計算
      const lastMonthPostCount = lastMonthPerformance.postCount || 1
      const postCountRatio = totalMonthlyPosts / lastMonthPostCount
      const reelMultiplier = reelPosts > 0 ? 1.15 : 1.0
      
      const monthlyReach = Math.round(lastMonthPerformance.monthlyReach * postCountRatio * reelMultiplier)
      
      const baseEngagementRate = lastMonthPerformance.engagementRate
      const engagementBoost = reelPosts > 0 ? 0.3 : 0
      const minEngagementRate = Math.max(2.0, baseEngagementRate - 0.5 + engagementBoost)
      const maxEngagementRate = Math.min(8.0, baseEngagementRate + 0.5 + engagementBoost)
      const engagementRate = `${minEngagementRate.toFixed(1)}〜${maxEngagementRate.toFixed(1)}%`
      
      const profileViews = Math.round(lastMonthPerformance.profileViews * postCountRatio)
      
      const reelSavesMultiplier = reelPosts > 0 ? 1.3 : 1.0
      const saves = Math.round(lastMonthPerformance.saves * postCountRatio * reelSavesMultiplier)
      
      expectedResults = {
        monthlyReach,
        engagementRate,
        profileViews,
        saves,
        newFollowers: followerIncrease,
      }
    } else {
      // 初月：業界平均値的な予想値
      const baseReachMultiplier = 2.5
      const postFrequencyMultiplier = Math.min(1.5, 1 + (totalMonthlyPosts / 20))
      const reelMultiplier = reelPosts > 0 ? 1.3 : 1.0
      const monthlyReach = Math.round(input.currentFollowers * baseReachMultiplier * postFrequencyMultiplier * reelMultiplier)
      
      const baseEngagementRate = 4.0
      const engagementBoost = reelPosts > 0 ? 0.5 : 0
      const minEngagementRate = Math.max(3.0, baseEngagementRate - 0.5 + engagementBoost)
      const maxEngagementRate = Math.min(6.5, baseEngagementRate + 1.0 + engagementBoost)
      const engagementRate = `${minEngagementRate.toFixed(1)}〜${maxEngagementRate.toFixed(1)}%`
      
      const profileVisitRate = 0.05
      const profileViews = Math.round(monthlyReach * profileVisitRate)
      
      const baseSavesPerPost = 8
      const reelSavesMultiplier = reelPosts > 0 ? 1.5 : 1.0
      const saves = Math.round(totalMonthlyPosts * baseSavesPerPost * reelSavesMultiplier)
      
      expectedResults = {
        monthlyReach,
        engagementRate,
        profileViews,
        saves,
        newFollowers: followerIncrease,
      }
    }
    
    // 達成難易度を計算
    const industryAverage = {
      "認知拡大": { min: 3.0, max: 6.0 },
      "採用・リクルーティング強化": { min: 4.0, max: 7.0 },
      "商品・サービスの販売促進": { min: 2.5, max: 5.5 },
      "ファンを作りたい": { min: 3.5, max: 6.5 },
      "来店・問い合わせを増やしたい": { min: 3.0, max: 6.0 },
      "企業イメージ・ブランディング": { min: 2.0, max: 5.0 },
    }
    
    const industryRange = industryAverage[input.operationPurpose as keyof typeof industryAverage] || { min: 3.0, max: 6.0 }
    const isWithinRange = monthlyGrowthRate >= industryRange.min && monthlyGrowthRate <= industryRange.max
    const difficultyStars = isWithinRange ? "★★★☆☆" : monthlyGrowthRate < industryRange.min ? "★☆☆☆☆" : "★★★★★"
    const difficultyLabel = isWithinRange ? "標準" : monthlyGrowthRate < industryRange.min ? "簡単" : "やや高め"
    
    // 達成確率を計算
    let achievementRate: number
    if (monthlyGrowthRate < industryRange.min) {
      const rate = Math.max(85, Math.min(95, 95 - (industryRange.min - monthlyGrowthRate) * 2))
      achievementRate = Math.round(rate)
    } else if (monthlyGrowthRate > industryRange.max) {
      const excessRate = monthlyGrowthRate - industryRange.max
      const rate = Math.max(30, Math.min(58, 58 - excessRate * 3))
      achievementRate = Math.round(rate)
    } else {
      achievementRate = 72
    }
    
    return {
      monthlyGrowthRate,
      difficulty: {
        stars: difficultyStars,
        label: difficultyLabel,
        industryRange: `${industryRange.min}〜${industryRange.max}%`,
        achievementRate,
      },
      expectedResults,
      weeklyIncreases,
      monthlyFeedPosts,
      reelPosts,
      storyPosts,
      weeklyPostsNum,
      weeklyReelPosts,
    }
  }
  
  /**
   * 投稿頻度を数値に変換
   */
  private static convertWeeklyPostsToNumber(value: string): number {
    if (value === "none") {return 0}
    if (value === "weekly-1-2") {return 1.5}
    if (value === "weekly-3-4") {return 3.5}
    if (value === "daily") {return 7}
    return 0
  }
  
  /**
   * ストーリーズ頻度を数値に変換
   */
  private static convertStoryFrequencyToNumber(value: string | undefined): number {
    if (!value || value === "none") {return 0}
    if (value === "weekly-1-2") {return 2}
    if (value === "weekly-3-4") {return 4}
    if (value === "daily") {return 7}
    return 0
  }
  
  /**
   * AIプロンプト生成用のコンテキスト
   */
  static buildAIContext(
    strategy: StrategyPlan,
    userProfile: UserProfile
  ): {
    weeklyPlans: StrategyPlan["weeklyPlans"]
    schedule: StrategyPlan["schedule"]
    expectedResults: StrategyPlan["expectedResults"]
    userBusinessInfo: UserProfile["businessInfo"]
  } {
    return {
      weeklyPlans: strategy.weeklyPlans,
      schedule: strategy.schedule,
      expectedResults: strategy.expectedResults,
      userBusinessInfo: userProfile.businessInfo,
    }
  }
}
