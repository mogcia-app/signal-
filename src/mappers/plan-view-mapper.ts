/**
 * PlanViewModelMapper（ViewModel変換層）
 * 
 * 責務: StrategyPlan, ExecutionState → UI表示用のViewModelに変換
 * 
 * 使用箇所: APIレスポンス、UIコンポーネント
 */

import { StrategyPlan } from "@/domain/plan/strategy-plan"
import { ExecutionState } from "@/domain/plan/execution-state"

/**
 * 計画表示用のViewModel（既存のplan形式との互換性を保つ）
 */
export interface PlanViewModel {
  startDate: string
  endDate: string
  currentFollowers: number
  targetFollowers: number
  followerIncrease: number
  operationPurpose: string
  monthlyGrowthRate: string
  difficulty: {
    stars: string
    label: string
    industryRange: string
    achievementRate: number
  }
  schedule: {
    weeklyFrequency: string
    feedPosts: number
    feedPostsWithReel: number
    reelPosts: number
    storyPosts: number
    postingDays: Array<{ day: string; time: string; type?: string }>
    storyDays: Array<{ day: string; time: string }>
  }
  weeklyPlans: Array<{
    week: number
    targetFollowers: number
    increase: number
    theme: string
    feedPosts: Array<{ day: string; content: string; type?: string }>
    storyContent: string | string[]
  }>
  expectedResults: {
    monthlyReach: number
    engagementRate: string
    profileViews: number
    saves: number
    newFollowers: number
  }
  features?: string[]
  suggestedContentTypes?: string[]
}

export class PlanViewModelMapper {
  /**
   * StrategyPlanをPlanViewModelに変換
   * 
   * 既存のAPIレスポンス形式との互換性を保つ
   */
  static toPlanViewModel(
    strategy: StrategyPlan,
    planInput: {
      currentFollowers: number
      targetFollowers: number
      operationPurpose: string
    }
  ): PlanViewModel {
    return {
      startDate: strategy.startDate.toISOString().split("T")[0],
      endDate: strategy.endDate.toISOString().split("T")[0],
      currentFollowers: planInput.currentFollowers,
      targetFollowers: planInput.targetFollowers,
      followerIncrease: planInput.targetFollowers - planInput.currentFollowers,
      operationPurpose: planInput.operationPurpose,
      monthlyGrowthRate: strategy.monthlyGrowthRate,
      difficulty: strategy.difficulty,
      schedule: {
        weeklyFrequency: strategy.schedule.weeklyFrequency,
        feedPosts: strategy.schedule.feedPosts,
        feedPostsWithReel: strategy.schedule.feedPosts, // 既存形式との互換性
        reelPosts: strategy.schedule.reelPosts,
        storyPosts: strategy.schedule.storyPosts,
        postingDays: strategy.schedule.postingDays,
        storyDays: strategy.schedule.storyDays,
      },
      weeklyPlans: strategy.weeklyPlans,
      expectedResults: strategy.expectedResults,
      features: strategy.features,
      suggestedContentTypes: strategy.suggestedContentTypes,
    }
  }

  /**
   * ExecutionStateをHome表示用のViewModelに変換
   * 
   * 既存のAPIレスポンス形式との互換性を保つ
   */
  static toHomeViewModel(executionState: ExecutionState) {
    return {
      todayTasks: executionState.todayTasks,
      tomorrowPreparation: executionState.tomorrowPreparation,
      monthlyGoals: executionState.monthlyGoals,
      weeklySchedule: executionState.weeklySchedule,
      aiDirection: executionState.aiDirection || null,
    }
  }
}



