/**
 * スケジュール生成の共通フック
 * feed, reel, storyのラボページで共通使用
 */

import { useCallback, useRef } from "react";
import { authFetch } from "../utils/authFetch";
import { handleError } from "../utils/error-handling";
import { useBusinessInfo } from "./useBusinessInfo";
import type { GeneratedSchedule, ScheduleGenerationResponse } from "../app/instagram/lab/types/schedule";

interface ScheduleFeedback {
  feedback: string | null;
  category: string;
}

interface UseScheduleGenerationOptions {
  postType: "feed" | "reel" | "story";
  monthlyPosts: number;
  dailyPosts: number;
  analyzeScheduleSettings: () => ScheduleFeedback;
  scheduleFeedback: string | null;
  setGeneratedSchedule: (schedule: GeneratedSchedule) => void;
  setScheduleFeedback: (feedback: string | null) => void;
  setShowScheduleAdminWarning: (show: boolean) => void;
  setIsGeneratingSchedule: (isGenerating: boolean) => void;
  setSaveMessage: (message: string) => void;
  isAuthReady: boolean;
}

interface ScheduleFeedbackHistory {
  category: string;
  timestamp: number;
}

export function useScheduleGeneration({
  postType,
  monthlyPosts,
  dailyPosts,
  analyzeScheduleSettings,
  scheduleFeedback,
  setGeneratedSchedule,
  setScheduleFeedback,
  setShowScheduleAdminWarning,
  setIsGeneratingSchedule,
  setSaveMessage,
  isAuthReady,
}: UseScheduleGenerationOptions) {
  const scheduleFeedbackHistoryRef = useRef<ScheduleFeedbackHistory[]>([]);
  const { fetchBusinessInfo } = useBusinessInfo();

  const generateSchedule = useCallback(async () => {
    if (!isAuthReady) {
      return;
    }

    // スケジュール設定を分析
    const analysis = analyzeScheduleSettings();
    setScheduleFeedback(analysis.feedback || null);

    // 連続フィードバックの追跡
    if (analysis.feedback) {
      const now = Date.now();
      scheduleFeedbackHistoryRef.current.push({
        category: analysis.category || "unknown",
        timestamp: now,
      });

      // 3分以内の同じカテゴリのフィードバックをカウント
      const recentSameCategory = scheduleFeedbackHistoryRef.current.filter(
        (f) => f.category === analysis.category && now - f.timestamp < 180000
      );

      if (recentSameCategory.length >= 3) {
        setShowScheduleAdminWarning(true);
      } else {
        setShowScheduleAdminWarning(false);
      }
    } else {
      // フィードバックがない場合は履歴をリセット
      scheduleFeedbackHistoryRef.current = [];
      setShowScheduleAdminWarning(false);
    }

    setIsGeneratingSchedule(true);

    try {
      // ビジネス情報を取得（キャッシュ付き）
      const businessInfo = await fetchBusinessInfo();
      if (!businessInfo) {
        throw new Error("ビジネス情報の取得に失敗しました");
      }

      // スケジュール生成APIを呼び出し
      const apiEndpoint = `/api/instagram/${postType}-schedule`;
      const scheduleResponse = await authFetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          monthlyPosts,
          dailyPosts,
          businessInfo: businessInfo.businessInfo,
        }),
      });

      if (!scheduleResponse.ok) {
        const errorText = await scheduleResponse.text();
        throw new Error(
          `スケジュール生成に失敗しました: ${scheduleResponse.status} - ${errorText}`
        );
      }

      const scheduleData = (await scheduleResponse.json()) as ScheduleGenerationResponse;

      if (scheduleData.success && scheduleData.schedule) {
        setGeneratedSchedule(scheduleData.schedule);
        setSaveMessage("スケジュールが生成されました！");

        // 成功した場合は、同じカテゴリのフィードバックが続かなかった場合は履歴をクリア
        if (!scheduleFeedback) {
          scheduleFeedbackHistoryRef.current = [];
          setShowScheduleAdminWarning(false);
        }
      } else {
        throw new Error(
          scheduleData.error || "スケジュールデータの形式が正しくありません"
        );
      }
    } catch (error) {
      console.error("スケジュール生成エラー:", error);
      const errorMessage = handleError(
        error,
        "スケジュール生成に失敗しました"
      );
      setScheduleFeedback(errorMessage);
    } finally {
      setIsGeneratingSchedule(false);
    }
  }, [
    isAuthReady,
    postType,
    monthlyPosts,
    dailyPosts,
    analyzeScheduleSettings,
    scheduleFeedback,
    setGeneratedSchedule,
    setScheduleFeedback,
    setShowScheduleAdminWarning,
    setIsGeneratingSchedule,
    setSaveMessage,
    fetchBusinessInfo,
  ]);

  return { generateSchedule };
}

