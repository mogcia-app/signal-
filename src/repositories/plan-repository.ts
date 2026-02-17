/**
 * PlanRepository（データアクセス層）
 * 
 * 責務: Firestoreへのアクセスを統一
 * PlanInput, StrategyPlan, ExecutionStateの保存・取得を担当
 * 
 * 設計原則:
 * 1. 型安全性: すべてのデータ取得時にバリデーションを実行
 * 2. データ整合性: ユーザーID検証を必須化
 * 3. 原子性: 状態遷移はトランザクションで実行
 * 4. 新旧分離: 新しいアーキテクチャと古いアーキテクチャを明確に分離
 */

import { adminDb } from "@/lib/firebase-admin"
import * as admin from "firebase-admin"
import { PlanInput, validatePlanInput } from "@/domain/plan/plan-input"
import { StrategyPlan } from "@/domain/plan/strategy-plan"
import { calculateLastMonthPerformance } from "@/domain/plan/usecases/calculate-last-month-performance"

/**
 * Firestoreから取得したplanDataの型定義
 */
interface FirestorePlanData {
  userId?: string
  snsType?: string
  status?: string
  formData?: Record<string, unknown>
  planData?: unknown
  simulationResult?: unknown
  startDate?: admin.firestore.Timestamp | Date | string
  endDate?: admin.firestore.Timestamp | Date | string
  createdAt?: admin.firestore.Timestamp | Date
  updatedAt?: admin.firestore.Timestamp | Date
}

export class PlanRepository {
  /**
   * アクティブなPlanInputを取得（新しいアーキテクチャ）
   * 
   * 型安全性とデータ整合性を保証:
   * - ユーザーID検証を実行
   * - PlanInputのバリデーションを実行
   * - 型安全なデータ変換
   */
  static async getActivePlanInput(userId: string, snsType: string = "instagram"): Promise<PlanInput | null> {
    try {
      // ユーザードキュメントを取得
      const userDoc = await adminDb.collection("users").doc(userId).get()
      if (!userDoc.exists) {
        console.warn(`[PlanRepository] ユーザーが見つかりません: ${userId}`)
        return null
      }
      
      const userData = userDoc.data()
      const activePlanId = userData?.activePlanId
      
      if (!activePlanId || typeof activePlanId !== "string") {
        return null
      }
      
      // 計画ドキュメントを取得
      const planDoc = await adminDb.collection("plans").doc(activePlanId).get()
      if (!planDoc.exists) {
        console.warn(`[PlanRepository] 計画が見つかりません: ${activePlanId}`)
        return null
      }
      
      const planData = planDoc.data() as FirestorePlanData | undefined
      if (!planData) {
        console.warn(`[PlanRepository] 計画データが空です: ${activePlanId}`)
        return null
      }
      
      // ユーザーID検証（重要: 別ユーザーの計画を取得しないようにする）
      if (planData.userId !== userId) {
        console.error(`[PlanRepository] ユーザーID不一致: 要求=${userId}, 計画=${planData.userId}`)
        throw new Error("データ整合性エラー: 計画の所有者が一致しません")
      }
      
      // snsType検証
      if (planData.snsType !== snsType) {
        console.warn(`[PlanRepository] SNSタイプ不一致: 要求=${snsType}, 計画=${planData.snsType}`)
        return null
      }
      
      // status検証（activeでない計画は取得しない）
      if (planData.status !== "active") {
        console.warn(`[PlanRepository] 計画がアクティブではありません: ${activePlanId}, status=${planData.status}`)
        return null
      }
      
      // formDataからPlanInputを構築
      const formData = planData.formData || {}
      
      // startDateの取得と変換（型安全）
      let startDateStr: string
      if (formData.startDate && typeof formData.startDate === "string") {
        startDateStr = formData.startDate
      } else if (planData.startDate) {
        const startDateObj = this.parseFirestoreDate(planData.startDate)
        if (startDateObj && !isNaN(startDateObj.getTime())) {
          startDateStr = startDateObj.toISOString().split("T")[0]
        } else {
          console.warn(`[PlanRepository] 無効なstartDate: ${planData.startDate}`)
          startDateStr = new Date().toISOString().split("T")[0]
        }
      } else {
        startDateStr = new Date().toISOString().split("T")[0]
      }
      
      // PlanInputを構築（型安全）
      const planInput: PlanInput = {
        userId,
        snsType,
        currentFollowers: this.parseNumber(formData.currentFollowers, 0),
        targetFollowers: this.parseNumber(formData.targetFollowers, 0),
        operationPurpose: this.parseString(formData.operationPurpose, ""),
        weeklyPosts: this.parseWeeklyPosts(formData.weeklyPosts),
        reelCapability: this.parseWeeklyPosts(formData.reelCapability),
        storyFrequency: this.parseStoryFrequency(formData.storyFrequency),
        targetAudience: this.parseOptionalString(formData.targetAudience),
        postingTime: this.parseOptionalString(formData.postingTime),
        regionRestriction: this.parseOptionalString(formData.regionRestriction),
        regionName: this.parseOptionalString(formData.regionName),
        startDate: startDateStr,
      }
      
      // バリデーション
      if (!validatePlanInput(planInput)) {
        console.error(`[PlanRepository] PlanInputのバリデーション失敗: ${activePlanId}`, planInput)
        throw new Error("データ整合性エラー: PlanInputのバリデーションに失敗しました")
      }
      
      return planInput
    } catch (error) {
      console.error(`[PlanRepository.getActivePlanInput] エラー:`, error)
      throw error
    }
  }
  
  /**
   * PlanInputを保存（新しいアーキテクチャ）
   * 
   * データ整合性を保証:
   * - バリデーションを実行
   * - 既存計画を削除（同一ユーザー・同一SNSは常に最新1件のみ保持）
   * - ユーザーのactivePlanIdを更新（トランザクション）
   * - StrategyPlan（weeklyPlansを含む）をplanDataに保存
   */
  static async savePlanInput(
    planInput: PlanInput,
    simulationResult?: Record<string, unknown> | null,
    strategyPlan?: StrategyPlan | null
  ): Promise<string> {
    try {
      // バリデーション
      if (!validatePlanInput(planInput)) {
        throw new Error("PlanInputのバリデーションに失敗しました")
      }
      
      // 既存の計画を取得（同じユーザー、同じSNSタイプ）
      const existingPlans = await adminDb
        .collection("plans")
        .where("userId", "==", planInput.userId)
        .where("snsType", "==", planInput.snsType)
        .get()
      
      // トランザクションで実行（原子性を保証）
      return await adminDb.runTransaction(async (transaction) => {
        // 既存の計画を削除
        existingPlans.docs.forEach((doc) => {
          transaction.delete(doc.ref)
        })
        
        // 新しいPlanInputを保存
        const startDate = admin.firestore.Timestamp.fromDate(new Date(planInput.startDate))
        const endDate = new Date(planInput.startDate)
        endDate.setMonth(endDate.getMonth() + 1) // デフォルト1ヶ月
        const endDateTimestamp = admin.firestore.Timestamp.fromDate(endDate)
        
        const planRef = adminDb.collection("plans").doc()
        
        // PlanInputをformDataとして保存（undefinedを除外）
        const cleanedPlanInput = this.removeUndefined(planInput as unknown as Record<string, unknown>)
        
        // StrategyPlanをplanDataとして保存（weeklyPlansを含む）
        const planDataToSave = strategyPlan ? {
          weeklyPlans: strategyPlan.weeklyPlans,
          schedule: strategyPlan.schedule,
          expectedResults: strategyPlan.expectedResults,
          difficulty: strategyPlan.difficulty,
          monthlyGrowthRate: strategyPlan.monthlyGrowthRate,
          features: strategyPlan.features,
          suggestedContentTypes: strategyPlan.suggestedContentTypes,
          startDate: strategyPlan.startDate,
          endDate: strategyPlan.endDate,
        } : null

        transaction.set(planRef, {
          userId: planInput.userId,
          snsType: planInput.snsType,
          planType: "manual",
          status: "active",
          aiGenerationStatus: "completed",
          aiGenerationCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
          startDate,
          endDate: endDateTimestamp,
          formData: cleanedPlanInput,
          planData: planDataToSave,
          simulationResult: simulationResult || null,
          timezone: "Asia/Tokyo",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        
        // ユーザーのactivePlanIdを更新（原子性を保証）
        const userRef = adminDb.collection("users").doc(planInput.userId)
        transaction.update(userRef, {
          activePlanId: planRef.id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        
        return planRef.id
      })
    } catch (error) {
      console.error(`[PlanRepository.savePlanInput] エラー:`, error)
      throw error
    }
  }
  
  /**
   * 計画を削除（物理削除）
   */
  static async deletePlan(userId: string, planId: string): Promise<void> {
    try {
      // 計画ドキュメントを取得
      const planDoc = await adminDb.collection("plans").doc(planId).get()
      if (!planDoc.exists) {
        throw new Error("計画が見つかりません")
      }
      
      const planData = planDoc.data() as FirestorePlanData | undefined
      if (!planData) {
        throw new Error("計画データが空です")
      }
      
      // ユーザーID検証
      if (planData.userId !== userId) {
        throw new Error("データ整合性エラー: 計画の所有者が一致しません")
      }
      
      // ユーザードキュメントを取得
      const userDoc = await adminDb.collection("users").doc(userId).get()
      if (!userDoc.exists) {
        throw new Error("ユーザーが見つかりません")
      }
      
      const userData = userDoc.data()
      const activePlanId = userData?.activePlanId
      
      // トランザクションで実行
      await adminDb.runTransaction(async (transaction) => {
        // 計画を物理削除
        transaction.delete(planDoc.ref)
        
        // 削除された計画がactivePlanIdの場合、ユーザーのactivePlanIdをnullに設定
        if (activePlanId === planId) {
          const userRef = adminDb.collection("users").doc(userId)
          transaction.update(userRef, {
            activePlanId: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          })
        }
      })
    } catch (error) {
      console.error(`[PlanRepository.deletePlan] エラー:`, error)
      throw error
    }
  }
  
  /**
   * 先月の実績データを取得
   */
  static async getLastMonthPerformance(
    userId: string,
    startDate: Date
  ): Promise<{
    monthlyReach: number
    engagementRate: number
    profileViews: number
    saves: number
    newFollowers: number
    postCount: number
  } | null> {
    try {
      // 先月の範囲を計算
      const lastMonthStart = new Date(startDate)
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)
      lastMonthStart.setDate(1)
      lastMonthStart.setHours(0, 0, 0, 0)
      
      const lastMonthEnd = new Date(startDate)
      lastMonthEnd.setDate(0) // 先月の最終日
      lastMonthEnd.setHours(23, 59, 59, 999)
      
      const lastMonthStartTimestamp = admin.firestore.Timestamp.fromDate(lastMonthStart)
      const lastMonthEndTimestamp = admin.firestore.Timestamp.fromDate(lastMonthEnd)
      
      // 先月のanalyticsデータを取得
      const lastMonthAnalytics = await adminDb
        .collection("analytics")
        .where("userId", "==", userId)
        .where("publishedAt", ">=", lastMonthStartTimestamp)
        .where("publishedAt", "<=", lastMonthEndTimestamp)
        .get()
      
      if (lastMonthAnalytics.empty) {
        return null // 先月のデータがない
      }

      const entries = lastMonthAnalytics.docs.map((doc) => {
        const data = doc.data()
        return {
          reach: Number(data.reach || 0),
          likes: Number(data.likes || 0),
          comments: Number(data.comments || 0),
          shares: Number(data.shares || 0),
          saves: Number(data.saves || 0),
          profileVisits: Number(data.profileVisits || 0),
          followerIncrease: Number(data.followerIncrease || 0),
        }
      })

      return calculateLastMonthPerformance(entries)
    } catch (error) {
      console.error("[PlanRepository.getLastMonthPerformance] エラー:", error)
      return null
    }
  }
  
  // ==================== プライベートヘルパーメソッド ====================
  
  /**
   * Firestoreの日付をDateオブジェクトに変換
   */
  private static parseFirestoreDate(date: admin.firestore.Timestamp | Date | string | undefined): Date | null {
    if (!date) {return null}
    if (date instanceof Date) {return date}
    if (typeof date === "string") {return new Date(date)}
    if (date && typeof date === "object" && "toDate" in date) {
      return (date as admin.firestore.Timestamp).toDate()
    }
    return null
  }
  
  /**
   * 数値を安全にパース
   */
  private static parseNumber(value: unknown, defaultValue: number): number {
    if (typeof value === "number") {return value}
    if (typeof value === "string") {
      const parsed = Number(value)
      return isNaN(parsed) ? defaultValue : parsed
    }
    return defaultValue
  }
  
  /**
   * 文字列を安全にパース
   */
  private static parseString(value: unknown, defaultValue: string): string {
    if (typeof value === "string") {return value}
    return defaultValue
  }
  
  /**
   * オプショナル文字列を安全にパース
   */
  private static parseOptionalString(value: unknown): string | undefined {
    if (typeof value === "string" && value.trim() !== "") {return value}
    return undefined
  }
  
  /**
   * 週次投稿頻度を安全にパース
   */
  private static parseWeeklyPosts(value: unknown): PlanInput["weeklyPosts"] {
    if (value === "none" || value === "weekly-1-2" || value === "weekly-3-4" || value === "daily") {
      return value
    }
    return "weekly-1-2" // デフォルト値
  }
  
  /**
   * ストーリーズ頻度を安全にパース
   */
  private static parseStoryFrequency(value: unknown): PlanInput["storyFrequency"] {
    if (value === "none" || value === "weekly-1-2" || value === "weekly-3-4" || value === "daily") {
      return value
    }
    return "none" // デフォルト値
  }
  
  /**
   * undefinedのフィールドを除外
   */
  private static removeUndefined(obj: Record<string, unknown>): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = value
      }
    }
    return cleaned
  }
  
  // ==================== 非推奨メソッド（後方互換性のため残す） ====================
  
  /**
   * アクティブなStrategyPlanを取得
   * 
   * @deprecated 新しいアーキテクチャでは使用しない
   * StrategyPlanはPlanInputから動的に生成されるため、このメソッドは使用しない
   * 後方互換性のため残すが、planData.planDataがnullの場合はnullを返す
   * 
   * 注意: このメソッドは削除予定です。新しいコードでは使用しないでください。
   */
  static async getActiveStrategyPlan(userId: string, _snsType: string = "instagram"): Promise<StrategyPlan | null> {
    console.warn("[PlanRepository.getActiveStrategyPlan] 非推奨メソッドが呼び出されました。新しいアーキテクチャでは使用しないでください。")
    
    const userDoc = await adminDb.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return null
    }
    
    const userData = userDoc.data()
    const activePlanId = userData?.activePlanId
    
    if (!activePlanId) {
      return null
    }
    
    const planDoc = await adminDb.collection("plans").doc(activePlanId).get()
    if (!planDoc.exists) {
      return null
    }
    
    const planData = planDoc.data() as FirestorePlanData | undefined
    if (!planData) {
      return null
    }
    
    // ユーザーID検証
    if (planData.userId !== userId) {
      console.error(`[PlanRepository.getActiveStrategyPlan] ユーザーID不一致: 要求=${userId}, 計画=${planData.userId}`)
      return null
    }
    
    // 新しいアーキテクチャでは、planData.planDataはnull
    if (!planData.planData) {
      return null
    }
    
    // 古いデータ用の処理（後方互換性のため）
    // 注意: この処理は削除予定です
    throw new Error("getActiveStrategyPlanは非推奨です。PlanInputから動的に生成してください。")
  }
  
  /**
   * StrategyPlanを保存
   * 
   * @deprecated 新しいアーキテクチャでは使用しない
   * StrategyPlanは動的に生成されるため、保存しない
   * 後方互換性のため残すが、使用しないでください
   * 
   * 注意: このメソッドは削除予定です。新しいコードでは使用しないでください。
   */
  static async saveStrategyPlan(
    _userId: string,
    _planInput: PlanInput,
    _strategy: Omit<StrategyPlan, "id" | "planInputId" | "userId" | "snsType" | "createdAt" | "updatedAt">
  ): Promise<string> {
    console.warn("[PlanRepository.saveStrategyPlan] 非推奨メソッドが呼び出されました。新しいアーキテクチャでは使用しないでください。")
    throw new Error("saveStrategyPlanは非推奨です。PlanInputのみを保存してください。")
  }
}
