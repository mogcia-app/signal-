import { useState } from 'react';
import { PlanFormData } from '../types/plan';

export const useAIDiagnosis = () => {
  const [showAiAdvice, setShowAiAdvice] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // AI診断開始
  const handleStartAiDiagnosis = async (formData: PlanFormData) => {
    setIsAiLoading(true);
    setAiError('');
    
    try {
      // 🔐 Firebase認証トークンを取得
      const { auth } = await import('../../../../lib/firebase');
      const currentUser = auth.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : null;

      // BFF APIを呼び出し
      const response = await fetch('/api/instagram/ai-diagnosis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          planData: formData,
          currentData: formData
        })
      });

      if (response.ok) {
        // AI診断結果を取得（現在はモック）
        setShowAiAdvice(true);
      } else {
        const errorData = await response.json();
        setAiError(errorData.error || 'AI診断でエラーが発生しました');
      }
    } catch (error) {
      console.error('AI診断エラー:', error);
      setAiError('AI診断でエラーが発生しました');
    } finally {
      setIsAiLoading(false);
    }
  };

  // AI戦略を保存
  const handleSaveAdviceAndContinue = () => {
    console.log('AI戦略を保存（計画保存時にgeneratedStrategyも保存される）');
    // generatedStrategyはusePlanForm内で管理され、savePlan()時に一緒に保存される
    // setShowAiAdvice(false); ← 削除：保存後も表示し続ける
  };

  // AI診断結果をクリア
  const clearAiAdvice = () => {
    setShowAiAdvice(false);
    setAiError('');
  };

  return {
    showAiAdvice,
    isAiLoading,
    aiError,
    handleStartAiDiagnosis,
    handleSaveAdviceAndContinue,
    clearAiAdvice
  };
};
