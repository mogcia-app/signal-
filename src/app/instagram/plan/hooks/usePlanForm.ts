import { useState } from 'react';
import { PlanFormData } from '../types/plan';

export const usePlanForm = () => {
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

  return {
    formData,
    selectedStrategies,
    selectedCategories,
    handleInputChange,
    handleStrategyToggle,
    handleCategoryToggle,
    resetForm,
    validateForm
  };
};
