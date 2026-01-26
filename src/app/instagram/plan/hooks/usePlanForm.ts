import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../../../contexts/auth-context";
import { PlanFormData, SimulationResult } from "../types/plan";
import { authFetch } from "../../../../utils/authFetch";
import { logger } from "../utils/logger";

export const usePlanForm = () => {
  const { user } = useAuth();
  const isAuthReady = useMemo(() => Boolean(user), [user]);

  // 計画の読み込み状態
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [loadedPlanId, setLoadedPlanId] = useState<string | null>(null);
  const [planStartDate, setPlanStartDate] = useState<Date | null>(null);
  const [planEndDate, setPlanEndDate] = useState<Date | null>(null);
  const [isPlanExpired, setIsPlanExpired] = useState(false);

  // フォーム状態管理（新バージョン：ステップ式ウィザード対応）
  const [formData, setFormData] = useState<PlanFormData>({
    // ステップ1: 基本情報
    planPeriod: "1ヶ月",
    startDate: "", // 空文字列で初期化（undefinedを避ける）
    
    // ステップ2: 目標設定
    mainGoal: "",
    currentFollowers: "",
    targetFollowers: "",
    targetFollowersAuto: false,
    
    // ステップ3: 投稿頻度
    availableTime: "",
    reelCapability: "",
    storyFrequency: "",
    postingTimePreference: [], // 空配列で初期化
    
    // ステップ4: ターゲット設定
    targetAudience: "",
    targetRegion: "",
    targetRegionEnabled: false, // falseで初期化（undefinedを避ける）
    
    // ステップ5: 投稿内容
    postContentTypes: [], // 空配列で初期化
    avoidContent: "",
    
    // 任意項目: アカウント情報
    accountCreationDate: "",
    currentEngagementRate: "",
    
    // 旧フィールド（後方互換性のため保持）
    followerGain: "",
    goalCategory: "",
    otherGoal: "",
    aiHelpRequest: "",
    pastLearnings: "",
    brandConcept: "",
    colorVisual: "",
    tone: "",
    weeklyFocus: "",
    feedFreq: "",
    reelFreq: "",
    storyFreq: "",
    saveGoal: "",
    likeGoal: "",
    reachGoal: "",
    referenceAccounts: "",
    hashtagStrategy: "",
    constraints: "",
    freeMemo: "",
  });

  // 戦略とカテゴリの選択状態
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // 保存状態管理
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // シミュレーション結果の状態管理
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [generatedStrategy, setGeneratedStrategy] = useState<string | null>(null); // ★ AI戦略を保持

  // 計画の特定フィールドをFirebaseに更新する関数（formDataの最新値を使用）
  const updatePlanFieldInFirebase = useCallback(async (field: string, value: string | string[] | boolean, currentFormData: PlanFormData) => {
    if (!isAuthReady || !loadedPlanId) return;

    try {
      // 最新のformDataを使って更新（API呼び出しを避ける）
      await authFetch(`/api/plans/${loadedPlanId}`, {
        method: "PATCH",
        body: JSON.stringify({
          formData: {
            ...currentFormData,
            [field]: value,
          },
        }),
      });
      logger.log(`✅ ${field}をFirebaseに保存しました`);
    } catch (error) {
      logger.error(`❌ ${field}の保存エラー:`, error);
      throw error;
    }
  }, [isAuthReady, loadedPlanId]);

  // フォーム入力ハンドラー（新バージョン：直接フィールド指定に対応）
  const handleInputChange = (
    fieldOrEvent: keyof PlanFormData | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    value?: string | string[] | boolean
  ) => {
    if (typeof fieldOrEvent === 'string') {
      // 新しい形式：直接フィールド名と値を指定
      setFormData((prev) => {
        const newData = {
          ...prev,
          [fieldOrEvent]: value,
        };
        logger.log(`📝 mainGoalを変更: ${value}`, { loadedPlanId, isAuthReady });
        // mainGoalが変更された場合、既存の計画があればFirebaseに即座に保存
        if (fieldOrEvent === 'mainGoal' && typeof value === 'string' && loadedPlanId && isAuthReady) {
          // 最新のformDataを使って更新
          updatePlanFieldInFirebase('mainGoal', value, newData).catch((error) => {
            logger.error('mainGoalの保存に失敗しました:', error);
          });
        } else if (fieldOrEvent === 'mainGoal' && typeof value === 'string') {
          logger.warn('⚠️ mainGoalの保存をスキップ:', { loadedPlanId, isAuthReady, value });
        }
        return newData;
      });
    } else {
      // 旧形式：イベントオブジェクトから取得（後方互換性）
      const { name, value: eventValue } = fieldOrEvent.target;
      setFormData((prev) => {
        const newData = {
          ...prev,
          [name]: eventValue,
        };
        logger.log(`📝 mainGoalを変更（イベント）: ${eventValue}`, { loadedPlanId, isAuthReady });
        // mainGoalが変更された場合、既存の計画があればFirebaseに即座に保存
        if (name === 'mainGoal' && typeof eventValue === 'string' && loadedPlanId && isAuthReady) {
          // 最新のformDataを使って更新
          updatePlanFieldInFirebase('mainGoal', eventValue, newData).catch((error) => {
            logger.error('mainGoalの保存に失敗しました:', error);
          });
        } else if (name === 'mainGoal' && typeof eventValue === 'string') {
          console.warn('⚠️ mainGoalの保存をスキップ（イベント）:', { loadedPlanId, isAuthReady, eventValue });
        }
        return newData;
      });
    }
  };

  // 戦略選択ハンドラー
  const handleStrategyToggle = (strategy: string) => {
    setSelectedStrategies((prev) =>
      prev.includes(strategy) ? prev.filter((s) => s !== strategy) : [...prev, strategy]
    );
  };

  // カテゴリ選択ハンドラー
  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  // フォームリセット
  const resetForm = () => {
    setFormData({
      planPeriod: "1ヶ月",
      currentFollowers: "",
      followerGain: "",
      goalCategory: "",
      otherGoal: "",
      targetAudience: "",
      aiHelpRequest: "",
      pastLearnings: "",
      brandConcept: "",
      colorVisual: "",
      tone: "",
      weeklyFocus: "",
      feedFreq: "",
      reelFreq: "",
      storyFreq: "",
      saveGoal: "",
      likeGoal: "",
      reachGoal: "",
      referenceAccounts: "",
      hashtagStrategy: "",
      constraints: "",
      freeMemo: "",
    });
    setSelectedStrategies([]);
    setSelectedCategories([]);
  };

  // フォームバリデーション（新バージョン：ステップ式ウィザード対応）
  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // ステップ1: 基本情報
    if (!formData.planPeriod) {
      errors.push("期間を選択してください");
    }
    if (!formData.startDate) {
      errors.push("開始日を選択してください");
    }

    // ステップ2: 目標設定
    if (!formData.currentFollowers) {
      errors.push("現在のフォロワー数を入力してください");
    }
    // 新形式: targetFollowers または 旧形式: followerGain
    if (!formData.targetFollowers && !formData.followerGain) {
      errors.push("目標フォロワー数を入力してください");
    }
    // 新形式: mainGoal または 旧形式: goalCategory
    if (!formData.mainGoal && !formData.goalCategory) {
      errors.push("一番叶えたいこと（KPIカテゴリ）を選択してください");
    }

    // ステップ3: 投稿頻度（新形式のみ）
    if (!formData.availableTime && !formData.feedFreq) {
      // 新形式のフィールドが未設定で、旧形式のフィールドも未設定の場合
      // バリデーションエラーにはしない（後方互換性のため）
    }

    // ステップ4: ターゲット設定
    if (!formData.targetAudience) {
      errors.push("ターゲット層を入力してください");
    }

    // ステップ5: 投稿内容
    // 新形式: postContentTypes または 旧形式: selectedStrategies/selectedCategories
    const contentTypes = formData.postContentTypes || [];
    const strategies = selectedStrategies.length > 0 ? selectedStrategies : contentTypes;
    const categories = selectedCategories.length > 0 ? selectedCategories : contentTypes;
    
    if (strategies.length === 0 && categories.length === 0 && contentTypes.length === 0) {
      errors.push("投稿したい内容を1つ以上選択してください");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  // 計画保存関数
  const savePlan = async () => {
    if (!isAuthReady) {
      setSaveError("ユーザーがログインしていません");
      return false;
    }

    const validation = validateForm();
    if (!validation.isValid) {
      setSaveError(validation.errors.join(", "));
      return false;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      if (!user) {
        setSaveError("ユーザー情報を取得できませんでした");
        setIsSaving(false);
        return false;
      }

      // フォロワー増加数を計算（新形式対応）
      const current = parseInt(formData.currentFollowers || "0", 10);
      const target = parseInt(formData.targetFollowers || "0", 10);
      const followerGain = target > current ? target - current : parseInt(formData.followerGain || "0", 10);
      
      // 目標カテゴリを取得（新形式対応）
      const goalCategory = formData.mainGoal || formData.goalCategory || "未設定";
      
      // 戦略とカテゴリを取得（新形式対応）
      const strategies = selectedStrategies.length > 0 
        ? selectedStrategies 
        : (formData.postContentTypes || []);
      const postCategories = selectedCategories.length > 0 
        ? selectedCategories 
        : (formData.postContentTypes || []);

      // 開始日を取得（新形式対応）
      const startDate = formData.startDate 
        ? new Date(formData.startDate) 
        : new Date();

      // 計画データの構築
      const planData = {
        userId: user.uid,
        snsType: "instagram",
        status: "active",
        title: "Instagram成長計画",
        targetFollowers: target > 0 ? target : (current + followerGain),
        currentFollowers: current || 0,
        planPeriod: formData.planPeriod,
        targetAudience: formData.targetAudience || "未設定",
        category: goalCategory,
        strategies: strategies,
        postCategories: postCategories,

        // ★ シミュレーション結果（APIから返された完全なデータ）
        simulationResult: simulationResult || null,

        // ★ フォームデータ全体を保存
        formData: {
          ...formData,
          followerGain: followerGain.toString(), // 計算した値を保存
          goalCategory: goalCategory, // 新形式の値を保存
          strategyValues: strategies,
          postCategories: postCategories,
        },

        // ★ AI戦略
        generatedStrategy,

        createdAt: startDate,
        updatedAt: new Date(),
      };

      const response = await authFetch("/api/plans", {
        method: "POST",
        body: JSON.stringify(planData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "計画の保存に失敗しました");
      }

      const responseData = await response.json();

      // 保存された計画IDを設定
      if (responseData.planId || responseData.id) {
        const savedPlanId = responseData.planId || responseData.id;
        setLoadedPlanId(savedPlanId);
        logger.log("[PlanForm] 計画が保存されました:", {
          planId: savedPlanId,
          status: "active",
          planPeriod: formData.planPeriod,
          targetFollowers: target > 0 ? target : (current + followerGain),
        });

        // 計画の開始日と終了日を設定（新形式対応）
        const startDate = formData.startDate 
          ? new Date(formData.startDate) 
          : new Date();
        setPlanStartDate(startDate);

        const endDate = calculateEndDate(startDate, formData.planPeriod);
        setPlanEndDate(endDate);

        // 期間切れチェック
        const isExpired = endDate < new Date();
        setIsPlanExpired(isExpired);
      }

      setSaveSuccess(true);
      logger.log("[PlanForm] 計画保存成功:", { success: true });
      return true;
    } catch (error) {
      logger.error("計画保存エラー:", error);
      setSaveError(error instanceof Error ? error.message : "計画の保存に失敗しました");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // シミュレーション結果を設定する関数
  const setSimulationResultData = (result: SimulationResult | null) => {
    setSimulationResult(result);
  };

  // シミュレーション結果をplanに保存する関数
  const updateSimulationResultInPlan = async (result: SimulationResult | null) => {
    if (!isAuthReady || !loadedPlanId || !result) {
      return;
    }

    try {
      // 既存のplanのsimulationResultを更新
      const response = await authFetch(`/api/plans/${loadedPlanId}`, {
        method: "PATCH",
        body: JSON.stringify({
          simulationResult: result,
        }),
      });

      if (!response.ok) {
        logger.error("シミュレーション結果の更新に失敗しました");
        return;
      }

      logger.log("シミュレーション結果をplanに保存しました");
    } catch (error) {
      logger.error("シミュレーション結果更新エラー:", error);
    }
  };

  // ✅ 保存された計画を読み込む
  const loadSavedPlan = useCallback(async () => {
    if (!isAuthReady) {return;}

    setIsLoadingPlan(true);
    try {
      const response = await authFetch(`/api/plans?snsType=instagram&status=active`);

      if (response.ok) {
        const data = await response.json();
        if (data.plans && data.plans.length > 0) {
          const latestPlan = data.plans[0]; // 最新の計画

          // フォームデータを復元（既存のformDataとマージして、ユーザーが入力中の値を保持）
          if (latestPlan.formData) {
            const restoredFormData = latestPlan.formData as PlanFormData;
            logger.log("✅ 計画を読み込みました - mainGoal:", restoredFormData.mainGoal);
            // 既存のformDataとマージ（ユーザーが入力中の値は保持）
            setFormData((prev) => ({
              ...restoredFormData,
              // ユーザーが既に入力している値は保持（空でない限り）
              mainGoal: prev.mainGoal || restoredFormData.mainGoal || "",
              currentFollowers: prev.currentFollowers || restoredFormData.currentFollowers || "",
              targetFollowers: prev.targetFollowers || restoredFormData.targetFollowers || "",
            }));
          }

          // 戦略とカテゴリを復元
          if (latestPlan.formData?.strategyValues) {
            setSelectedStrategies(latestPlan.formData.strategyValues as string[]);
          }
          if (latestPlan.formData?.postCategories) {
            setSelectedCategories(latestPlan.formData.postCategories as string[]);
          }

          // シミュレーション結果を復元
          if (latestPlan.simulationResult) {
            setSimulationResult(latestPlan.simulationResult as SimulationResult);
          }

          // ★ AI戦略を復元
          if (latestPlan.generatedStrategy) {
            setGeneratedStrategy(latestPlan.generatedStrategy as string);
          }

          // 計画ID、開始日、終了日を設定
          setLoadedPlanId(latestPlan.id);

          // 計画期間から開始日・終了日を計算
          const createdAt = latestPlan.createdAt?.toDate?.() || new Date(latestPlan.createdAt);
          setPlanStartDate(createdAt);

          const endDate = calculateEndDate(createdAt, latestPlan.formData?.planPeriod || "1ヶ月");
          setPlanEndDate(endDate);

          // 期間切れチェック
          const isExpired = endDate < new Date();
          setIsPlanExpired(isExpired);

          logger.log("✅ 保存された計画を読み込みました", { isExpired });
        }
      }
    } catch (error) {
      logger.error("計画読み込みエラー:", error);
    } finally {
      setIsLoadingPlan(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // 計画期間から終了日を計算
  const calculateEndDate = (startDate: Date, period: string): Date => {
    const endDate = new Date(startDate);

    switch (period) {
      case "1ヶ月":
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case "3ヶ月":
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case "6ヶ月":
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case "1年":
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }

    return endDate;
  };

  // 計画をリセット（新しい計画を立てる）
  const resetPlan = async () => {
    // 既存の計画をアーカイブ
    if (loadedPlanId && isAuthReady) {
      try {
        await authFetch(`/api/plans/${loadedPlanId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "archived" }),
        });
      } catch (error) {
        logger.error("計画アーカイブエラー:", error);
      }
    }

    // フォームをリセット
    resetForm();
    setSimulationResult(null);
    setGeneratedStrategy("");
    setLoadedPlanId(null);
    setPlanStartDate(null);
    setPlanEndDate(null);
    setIsPlanExpired(false);
  };

  // ✅ 初回マウント時に保存された計画を読み込む（無効化）
  // useEffect(() => {
  //   if (isAuthReady) {
  //     loadSavedPlan();
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [isAuthReady]);


  // selectedStrategiesとselectedCategoriesを直接設定する関数（新形式対応）
  const setSelectedStrategiesDirect = (strategies: string[]) => {
    setSelectedStrategies(strategies);
  };

  const setSelectedCategoriesDirect = (categories: string[]) => {
    setSelectedCategories(categories);
  };

  return {
    formData,
    selectedStrategies,
    selectedCategories,
    isSaving,
    saveError,
    saveSuccess,
    simulationResult,
    generatedStrategy, // ★ 追加
    setGeneratedStrategy, // ★ 追加
    isLoadingPlan,
    loadedPlanId,
    planStartDate,
    planEndDate,
    isPlanExpired,
    handleInputChange,
    handleStrategyToggle,
    handleCategoryToggle,
    setSelectedStrategiesDirect, // 新形式対応
    setSelectedCategoriesDirect, // 新形式対応
    resetForm,
    validateForm,
    savePlan,
    setSimulationResultData,
    updateSimulationResultInPlan,
    loadSavedPlan,
    resetPlan,
  };
};
