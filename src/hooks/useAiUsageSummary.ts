"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/utils/authFetch";

export interface AiUsageSummary {
  month: string;
  limit: number | null;
  used: number;
  remaining: number | null;
  breakdown?: Record<string, number>;
}

export function useAiUsageSummary(enabled = true) {
  const [usage, setUsage] = useState<AiUsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshUsage = useCallback(async () => {
    if (!enabled) {return;}
    setIsLoading(true);
    try {
      const response = await authFetch("/api/ai/usage-summary");
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success || !result?.data) {
        return;
      }
      setUsage(result.data as AiUsageSummary);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refreshUsage();
  }, [refreshUsage]);

  return {
    usage,
    isLoading,
    refreshUsage,
    setUsage,
  };
}
