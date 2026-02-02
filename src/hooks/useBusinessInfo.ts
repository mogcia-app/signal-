/**
 * ビジネス情報を取得・キャッシュするフック
 * 複数のAPI呼び出しでビジネス情報が必要な場合に使用
 */

import { useState, useCallback, useRef } from "react";
import { authFetch } from "../utils/authFetch";
import { clientCache } from "../utils/cache";

interface BusinessInfo {
  businessInfo: unknown;
}

const BUSINESS_INFO_CACHE_KEY = "business-info";
const CACHE_TTL = 5 * 60 * 1000; // 5分間キャッシュ

export function useBusinessInfo() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const businessInfoRef = useRef<BusinessInfo | null>(null);

  const fetchBusinessInfo = useCallback(async (): Promise<BusinessInfo | null> => {
    // キャッシュから取得を試みる
    const cached = clientCache.get<BusinessInfo>(BUSINESS_INFO_CACHE_KEY);
    if (cached) {
      businessInfoRef.current = cached;
      return cached;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authFetch("/api/user/business-info");

      if (!response.ok) {
        throw new Error("ビジネス情報の取得に失敗しました");
      }

      const data = await response.json() as { businessInfo?: unknown };
      const businessInfo: BusinessInfo = {
        businessInfo: data.businessInfo,
      };

      // キャッシュに保存
      clientCache.set(BUSINESS_INFO_CACHE_KEY, businessInfo, CACHE_TTL);
      businessInfoRef.current = businessInfo;

      return businessInfo;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "ビジネス情報の取得に失敗しました";
      setError(errorMessage);
      console.error("ビジネス情報取得エラー:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    fetchBusinessInfo,
    isLoading,
    error,
    businessInfo: businessInfoRef.current,
  };
}

