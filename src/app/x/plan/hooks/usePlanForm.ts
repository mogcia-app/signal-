import { useState } from 'react';
import { useAuth } from '../../../../contexts/auth-context';
import { PlanFormData, SimulationResult } from '../types/plan';
import { authFetch } from '../../../../utils/authFetch';

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
    tweetFreq: '',
    threadFreq: '',
    replyFreq: '',
    retweetGoal: '',
    replyGoal: '',
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

  // 戦略トグルハンドラー
  const handleStrategyToggle = (strategy: string) => {
    setSelectedStrategies(prev => 
      prev.includes(strategy) 
        ? prev.filter(s => s !== strategy)
        : [...prev, strategy]
    );
  };

  // カテゴリトグルハンドラー
  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // 計画保存ハンドラー
  const savePlan = async (): Promise<boolean> => {
    if (!user) {
      setSaveError('ユーザーがログインしていません');
      return false;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await authFetch('/api/x/plans', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.uid,
          formData,
          selectedStrategies,
          selectedCategories,
          simulationResult
        }),
      });

      if (!response.ok) {
        throw new Error('計画の保存に失敗しました');
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
  const setSimulationResultData = (result: SimulationResult) => {
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
    savePlan,
    setSimulationResultData
  };
};
