import { create } from "zustand";
import { authFetch } from "../utils/authFetch";
import { actionLogsApi } from "@/lib/api";
import { isObject, isString, isNumber } from "@/utils/type-guards";
import type { AIActionLog } from "@/types/ai";
import type {
  MasterContextResponse,
  LearningBadge,
  PatternSignal,
} from "../app/learning/types";

type ActionLogEntry = AIActionLog;

interface LearningStore {
  // 状態
  isContextLoading: boolean;
  contextError: string | null;
  contextData: MasterContextResponse | null;
  actionHistory: ActionLogEntry[];

  // セッター
  setIsContextLoading: (loading: boolean) => void;
  setContextError: (error: string | null) => void;
  setContextData: (data: MasterContextResponse | null) => void;
  setActionHistory: (history: ActionLogEntry[]) => void;

  // データ取得関数
  fetchDashboardData: (userId: string) => Promise<void>;
  handleActionLogToggle: (params: {
    userId: string;
    actionId: string;
    title: string;
    focusArea: string;
    applied: boolean;
  }) => Promise<void>;

  // 計算プロパティ
  getActionLogMap: () => Map<string, ActionLogEntry>;
  getGoldSignals: () => PatternSignal[];
  getRedSignals: () => PatternSignal[];
  getAchievements: () => LearningBadge[];

  // リセット
  reset: () => void;
}

export const useLearningStore = create<LearningStore>((set, get) => ({
  // 初期状態
  isContextLoading: false,
  contextError: null,
  contextData: null,
  actionHistory: [],

  // セッター
  setIsContextLoading: (loading) => set({ isContextLoading: loading }),
  setContextError: (error) => set({ contextError: error }),
  setContextData: (data) => set({ contextData: data }),
  setActionHistory: (history) => set({ actionHistory: history }),

  // データ取得関数
  fetchDashboardData: async (userId: string) => {
    set({ isContextLoading: true, contextError: null });

    try {
      const params = new URLSearchParams({
        forceRefresh: "1", // 常に最新データを取得
        limit: "10",
      });

      const response = await authFetch(`/api/learning/dashboard?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Learning dashboard API error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "学習ダッシュボードデータの取得に失敗しました");
      }

      const data = result.data as MasterContextResponse;

      // マスターコンテキストデータを設定
      set({ contextData: data });

      // フィードバック履歴とアクション履歴を設定
      const mappedActions: ActionLogEntry[] = Array.isArray(data.actionHistory)
        ? data.actionHistory
            .filter(isObject)
            .map((entry: Record<string, unknown>) => ({
              id: isString(entry.id) ? entry.id : "",
              actionId: isString(entry.actionId) ? entry.actionId : "",
              title: isString(entry.title) ? entry.title : "未設定",
              focusArea: isString(entry.focusArea) ? entry.focusArea : "全体",
              applied: Boolean(entry.applied),
              resultDelta: isNumber(entry.resultDelta) ? entry.resultDelta : null,
              feedback: isString(entry.feedback) ? entry.feedback : "",
              updatedAt:
                isString(entry.updatedAt)
                  ? entry.updatedAt
                  : isString(entry.createdAt)
                    ? entry.createdAt
                    : null,
            }))
        : [];
      set({ actionHistory: mappedActions });
    } catch (error) {
      console.error("学習ダッシュボードデータ取得エラー:", error);
      const errorMessage =
        error instanceof Error ? error.message : "学習ダッシュボードデータの取得に失敗しました";
      set({
        contextError: errorMessage,
        contextData: null,
        actionHistory: [],
      });
    } finally {
      set({ isContextLoading: false });
    }
  },

  // アクションログのトグル
  handleActionLogToggle: async ({ userId, actionId, title, focusArea, applied }) => {
    try {
      await actionLogsApi.upsert({
        userId,
        actionId,
        title,
        focusArea,
        applied,
      });

      const { actionHistory } = get();
      const actionLogMap = new Map<string, ActionLogEntry>();
      actionHistory.forEach((entry) => {
        actionLogMap.set(entry.actionId, entry);
      });

      const existing = actionLogMap.get(actionId);
      const updated: ActionLogEntry = {
        id: existing?.id ?? `${userId}_${actionId}`,
        actionId,
        title,
        focusArea,
        applied,
        resultDelta: existing?.resultDelta ?? null,
        feedback: existing?.feedback ?? "",
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      set({
        actionHistory: [
          updated,
          ...actionHistory.filter((entry) => entry.actionId !== actionId),
        ],
      });
    } catch (error) {
      console.error("Action log toggle error:", error);
    }
  },

  // 計算プロパティ
  getActionLogMap: () => {
    const { actionHistory } = get();
    const map = new Map<string, ActionLogEntry>();
    actionHistory.forEach((entry) => {
      map.set(entry.actionId, entry);
    });
    return map;
  },

  getGoldSignals: () => {
    const { contextData } = get();
    const patternInsights = contextData?.postPatterns;
    return (patternInsights?.signals ?? [])
      .filter((signal) => signal.tag === "gold")
      .slice(0, 3);
  },

  getRedSignals: () => {
    const { contextData } = get();
    const patternInsights = contextData?.postPatterns;
    return (patternInsights?.signals ?? [])
      .filter((signal) => signal.tag === "red")
      .slice(0, 3);
  },

  getAchievements: () => {
    const { contextData } = get();
    return contextData?.achievements ?? [];
  },

  // リセット
  reset: () => {
    set({
      isContextLoading: false,
      contextError: null,
      contextData: null,
      actionHistory: [],
    });
  },
}));

