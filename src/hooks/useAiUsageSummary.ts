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

export const PRACTICAL_UNLIMITED_AI_LIMIT = 1000;

export function isAiUsageUnlimited(limit: number | null | undefined): boolean {
  return limit === null || (typeof limit === "number" && limit >= PRACTICAL_UNLIMITED_AI_LIMIT);
}

export function formatAiRemainingLabel(
  usage: AiUsageSummary | null | undefined,
  options?: { loading?: boolean; prefix?: string }
): string {
  const prefix = options?.prefix ?? "今月のAI残回数: ";
  if (options?.loading) {
    return `${prefix}読み込み中...`;
  }
  if (isAiUsageUnlimited(usage?.limit)) {
    return `${prefix}無制限`;
  }
  return `${prefix}${Math.max(usage?.remaining || 0, 0)}回`;
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
