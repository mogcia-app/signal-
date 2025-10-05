import { useState } from 'react';
import { useAuth } from '../../../../contexts/auth-context';
import { PlanFormData, SimulationResult } from '../types/plan';

export const usePlanForm = () => {
  const { user } = useAuth();
  
  // フォーム状態管理
  const [formData, setFormData] = useState<PlanFormData>({
    goalName: '',
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

  // フォーム入力ハンドラー
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
      goalName: '',
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
        title: formData.goalName || 'Instagram成長計画',
        targetFollowers: parseInt(formData.currentFollowers, 10) + parseInt(formData.followerGain, 10),
        currentFollowers: parseInt(formData.currentFollowers, 10) || 0,
        planPeriod: formData.planPeriod,
        targetAudience: formData.targetAudience || '未設定',
        category: formData.goalCategory || '未設定',
        strategies: selectedStrategies,
        simulation: {
          postTypes: {
            reel: { weeklyCount: parseInt(formData.reelFreq, 10) || 0, followerEffect: 5 },
            feed: { weeklyCount: parseInt(formData.feedFreq, 10) || 0, followerEffect: 3 },
            story: { weeklyCount: parseInt(formData.storyFreq, 10) || 0, followerEffect: 2 }
          }
        },
        aiPersona: {
          tone: formData.tone || '親しみやすい',
          style: formData.colorVisual || 'モダン',
          personality: formData.brandConcept || 'フレンドリー',
          interests: selectedCategories
        },
        // シミュレーション結果を含める（現在の型に合わせて簡略化）
        simulationResult: simulationResult ? {
          targetDate: simulationResult.targetDate,
          monthlyTarget: simulationResult.monthlyTarget,
          weeklyTarget: simulationResult.weeklyTarget,
          feasibilityLevel: simulationResult.feasibilityLevel,
          feasibilityBadge: simulationResult.feasibilityBadge,
          postsPerWeek: simulationResult.postsPerWeek,
          monthlyPostCount: simulationResult.monthlyPostCount,
          workloadMessage: simulationResult.workloadMessage,
          mainAdvice: simulationResult.mainAdvice,
          improvementTips: simulationResult.improvementTips
        } : null,
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

  return {
    formData,
    selectedStrategies,
    selectedCategories,
    isSaving,
    saveError,
    saveSuccess,
    simulationResult,
    handleInputChange,
    handleStrategyToggle,
    handleCategoryToggle,
    resetForm,
    validateForm,
    savePlan,
    setSimulationResultData
  };
};
