/**
 * StrategyPlan（戦略計画）
 * 
 * 責務: AI + ロジックが生成した「運用設計図」
 * 使用箇所: Simulation（シミュレーション計算）、AI Advice（プロンプト生成）
 */

export interface StrategyPlan {
  id: string
  planInputId: string
  userId: string
  snsType: string
  
  // 戦略設計
  weeklyPlans: Array<{
    week: number
    targetFollowers: number
    increase: number
    theme: string
    feedPosts: Array<{ day: string; content: string; type?: string }>
    storyContent: string | string[]
  }>
  
  schedule: {
    weeklyFrequency: string
    feedPosts: number
    reelPosts: number
    storyPosts: number
    postingDays: Array<{ day: string; time: string; type?: string }>
    storyDays: Array<{ day: string; time: string }>
  }
  
  expectedResults: {
    monthlyReach: number
    engagementRate: string
    profileViews: number
    saves: number
    newFollowers: number
  }
  
  difficulty: {
    stars: string
    label: string
    industryRange: string
    achievementRate: number
  }
  
  monthlyGrowthRate: string
  features?: string[]
  suggestedContentTypes?: string[]
  
  startDate: Date
  endDate: Date
  createdAt: Date
  updatedAt: Date
}







