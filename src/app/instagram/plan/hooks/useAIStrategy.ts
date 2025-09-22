import { useState } from 'react';
import { PlanFormData, SimulationResult } from '../types/plan';

interface AIStrategyState {
  strategy: string | null;
  isLoading: boolean;
  error: string | null;
}

interface UseAIStrategyReturn {
  strategyState: AIStrategyState;
  generateStrategy: (formData: PlanFormData, simulationResult: SimulationResult | null) => Promise<void>;
  clearStrategy: () => void;
}

export function useAIStrategy(): UseAIStrategyReturn {
  const [strategyState, setStrategyState] = useState<AIStrategyState>({
    strategy: null,
    isLoading: false,
    error: null,
  });

  const generateStrategy = async (
    formData: PlanFormData, 
    simulationResult: SimulationResult | null
  ): Promise<void> => {
    setStrategyState({
      strategy: null,
      isLoading: true,
      error: null,
    });

    try {
      // セキュアなAPIキーを取得
      const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY;
      
      console.log('API Key check:', {
        hasApiKey: !!apiKey,
        keyLength: apiKey?.length || 0,
        keyPrefix: apiKey?.substring(0, 8) + '...' || 'undefined'
      });
      
      if (!apiKey) {
        throw new Error('API key not configured');
      }
      
      const response = await fetch('/api/instagram/ai-strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          formData,
          simulationResult,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      setStrategyState({
        strategy: data.strategy,
        isLoading: false,
        error: null,
      });

    } catch (error) {
      console.error('AI Strategy generation error:', error);
      
      setStrategyState({
        strategy: null,
        isLoading: false,
        error: error instanceof Error ? error.message : '戦略生成に失敗しました',
      });
    }
  };

  const clearStrategy = () => {
    setStrategyState({
      strategy: null,
      isLoading: false,
      error: null,
    });
  };

  return {
    strategyState,
    generateStrategy,
    clearStrategy,
  };
}
