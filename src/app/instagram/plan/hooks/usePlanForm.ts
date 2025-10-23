import { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/auth-context';
import { PlanFormData, SimulationResult } from '../types/plan';

export const usePlanForm = () => {
  const { user } = useAuth();
  
  // 計画の読み込み状態
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [loadedPlanId, setLoadedPlanId] = useState<string | null>(null);
  const [planStartDate, setPlanStartDate] = useState<Date | null>(null);
  const [planEndDate, setPlanEndDate] = useState<Date | null>(null);
  const [isPlanExpired, setIsPlanExpired] = useState(false);
  
  // フォーム状態管理
  const [formData, setFormData] = useState<PlanFormData>({
    planPeriod: '1ヶ月',
    currentFollowers: '',
    followerGain: '',
    goalCategory: '',
    otherGoal: '',
    targetAudience: '',
    aiHelpRequest: '',
    pastLearnings: '',
    brandConcept: '',
    colorVisual: '',
    tone: '',
    weeklyFocus: '',
    feedFreq: '',
    reelFreq: '',
    storyFreq: '',
    saveGoal: '',
    likeGoal: '',
    reachGoal: '',
    referenceAccounts: '',
    hashtagStrategy: '',
    constraints: '',
    freeMemo: ''
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

  // フォーム入力ハンドラー
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log('フォーム入力変更:', { name, value });
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      console.log('新しいフォームデータ:', newData);
      return newData;
    });
  };

  // 戦略選択ハンドラー
  const handleStrategyToggle = (strategy: string) => {
    setSelectedStrategies(prev =>
      prev.includes(strategy)
        ? prev.filter(s => s !== strategy)
        : [...prev, strategy]
    );
  };

  // カテゴリ選択ハンドラー
  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // フォームリセット
  const resetForm = () => {
    setFormData({
      planPeriod: '1ヶ月',
      currentFollowers: '',
      followerGain: '',
      goalCategory: '',
      otherGoal: '',
      targetAudience: '',
      aiHelpRequest: '',
      pastLearnings: '',
      brandConcept: '',
      colorVisual: '',
      tone: '',
      weeklyFocus: '',
      feedFreq: '',
      reelFreq: '',
      storyFreq: '',
      saveGoal: '',
      likeGoal: '',
      reachGoal: '',
      referenceAccounts: '',
      hashtagStrategy: '',
      constraints: '',
      freeMemo: ''
    });
    setSelectedStrategies([]);
    setSelectedCategories([]);
  };

  // フォームバリデーション
  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!formData.followerGain) {
      errors.push('目標フォロワー数を入力してください');
    }

    if (!formData.planPeriod) {
      errors.push('期間を選択してください');
    }

    if (!formData.currentFollowers) {
      errors.push('現在のフォロワー数を入力してください');
    }

    if (!formData.goalCategory) {
      errors.push('KPIカテゴリを選択してください');
    }

    if (selectedStrategies.length === 0) {
      errors.push('施策を1つ以上選択してください');
    }

    if (selectedCategories.length === 0) {
      errors.push('投稿カテゴリを1つ以上選択してください');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // 計画保存関数
  const savePlan = async () => {
    if (!user?.uid) {
      setSaveError('ユーザーがログインしていません');
      return false;
    }

    const validation = validateForm();
    if (!validation.isValid) {
      setSaveError(validation.errors.join(', '));
      return false;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const idToken = await user.getIdToken();
      
      // 計画データの構築
      const planData = {
        userId: user.uid,
        snsType: 'instagram',
        status: 'active',
        title: 'Instagram成長計画',
        targetFollowers: parseInt(formData.currentFollowers, 10) + parseInt(formData.followerGain, 10),
        currentFollowers: parseInt(formData.currentFollowers, 10) || 0,
        planPeriod: formData.planPeriod,
        targetAudience: formData.targetAudience || '未設定',
        category: formData.goalCategory || '未設定',
        strategies: selectedStrategies,
        postCategories: selectedCategories,
        
        // ★ シミュレーション結果（APIから返された完全なデータ）
        simulationResult: simulationResult || null,
        
        // ★ フォームデータ全体を保存
        formData: {
          ...formData,
          strategyValues: selectedStrategies,
          postCategories: selectedCategories
        },
        
        // ★ AI戦略
        generatedStrategy,
        
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(planData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '計画の保存に失敗しました');
      }

      setSaveSuccess(true);
      return true;
    } catch (error) {
      console.error('計画保存エラー:', error);
      setSaveError(error instanceof Error ? error.message : '計画の保存に失敗しました');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // シミュレーション結果を設定する関数
  const setSimulationResultData = (result: SimulationResult | null) => {
    setSimulationResult(result);
  };

  // ✅ 保存された計画を読み込む
  const loadSavedPlan = async () => {
    if (!user?.uid) return;

    setIsLoadingPlan(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/plans?userId=${user.uid}&snsType=instagram&status=active`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.plans && data.plans.length > 0) {
          const latestPlan = data.plans[0]; // 最新の計画
          
          // フォームデータを復元
          if (latestPlan.formData) {
            setFormData(latestPlan.formData as PlanFormData);
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
          
          const endDate = calculateEndDate(createdAt, latestPlan.formData?.planPeriod || '1ヶ月');
          setPlanEndDate(endDate);
          
          // 期間切れチェック
          const isExpired = endDate < new Date();
          setIsPlanExpired(isExpired);
          
          console.log('✅ 保存された計画を読み込みました', { isExpired });
        }
      }
    } catch (error) {
      console.error('計画読み込みエラー:', error);
    } finally {
      setIsLoadingPlan(false);
    }
  };

  // 計画期間から終了日を計算
  const calculateEndDate = (startDate: Date, period: string): Date => {
    const endDate = new Date(startDate);
    
    switch (period) {
      case '1ヶ月':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case '3ヶ月':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case '6ヶ月':
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case '1年':
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
    if (loadedPlanId && user?.uid) {
      try {
        const idToken = await user.getIdToken();
        await fetch(`/api/plans/${loadedPlanId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ status: 'archived' })
        });
      } catch (error) {
        console.error('計画アーカイブエラー:', error);
      }
    }
    
    // フォームをリセット
    resetForm();
    setSimulationResult(null);
    setLoadedPlanId(null);
    setPlanStartDate(null);
    setPlanEndDate(null);
    setIsPlanExpired(false);
  };

  // ✅ 初回マウント時に保存された計画を読み込む
  useEffect(() => {
    if (user?.uid) {
      loadSavedPlan();
    }
  }, [user?.uid]);

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
    resetForm,
    validateForm,
    savePlan,
    setSimulationResultData,
    loadSavedPlan,
    resetPlan
  };
};
