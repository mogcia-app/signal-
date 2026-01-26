import { useState } from "react";
import { PlanFormData, SimulationResult } from "../types/plan";
import { authFetch } from "../../../../utils/authFetch";

interface AIStrategyState {
  strategy: string | null;
  isLoading: boolean;
  error: string | null;
}

interface UseAIStrategyReturn {
  strategyState: AIStrategyState;
  generateStrategy: (
    formData: PlanFormData,
    selectedStrategies: string[],
    selectedCategories: string[],
    simulationResult: SimulationResult | null
  ) => Promise<string | null>;
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
    selectedStrategies: string[],
    selectedCategories: string[],
    simulationResult: SimulationResult | null
  ): Promise<string | null> => {
    setStrategyState({
      strategy: null,
      isLoading: true,
      error: null,
    });

    try {
      const response = await authFetch("/api/instagram/ai-strategy", {
        method: "POST",
        body: JSON.stringify({
          formData,
          selectedStrategies,
          selectedCategories,
          simulationResult,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const strategy = data.strategy || null;

      setStrategyState({
        strategy: strategy,
        isLoading: false,
        error: null,
      });

      return strategy;
    } catch (error) {
      console.error("AI Strategy generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "戦略生成に失敗しました";

      setStrategyState({
        strategy: null,
        isLoading: false,
        error: errorMessage,
      });

      return null;
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
