/**
 * ホームページの状態管理ストア
 * Zustandを使用して状態を一元管理
 */

import { create } from "zustand";
import { authFetch } from "@/utils/authFetch";
import type { AIPlanSuggestion } from "@/app/instagram/plan/types/plan";

// 型定義
interface WeeklyKPIs {
  thisWeek: {
    likes: number;
    comments: number;
    followers: number;
  };
  lastWeek: {
    likes: number;
    comments: number;
    followers: number;
  };
  changes?: {
    likes: number;
    comments: number;
    followers: number;
  };
}

interface TodayTask {
  id: string;
  type: string;
  title: string;
  content: string;
  scheduledTime: Date | string;
}

interface WeeklyScheduleTask {
  day: string;
  date?: string;
  time: string;
  type: string;
  description: string;
}

interface WeeklySchedule {
  week: number;
  theme: string;
  actions: string[];
  tasks: WeeklyScheduleTask[];
  startDate?: string;
  endDate?: string;
}

interface CurrentPlan {
  id: string;
  title: string;
  strategy: string;
  startDate: Date | string;
  endDate: Date | string | null;
  weeklyTasks: never[]; // 使用されていない（空配列）
  monthlyGoals: never[]; // 使用されていない（空配列）
  aiSuggestion: AIPlanSuggestion | null;
  planPeriod?: string;
}

interface MonthlyProgress {
  strategy: string;
  progress: number;
  totalDays: number;
  completedDays: number;
}

export interface DashboardData {
  todayTasks?: TodayTask[];
  weeklyKPIs?: WeeklyKPIs;
  weeklySchedule?: WeeklySchedule;
  currentPlan?: CurrentPlan | null;
  monthlyProgress?: MonthlyProgress | null;
  currentWeekTasks?: Array<{ day: string; task: string }>;
  currentMonthGoals?: Array<{ metric?: string; target?: string; goal?: string; description?: string }>;
  aiSuggestion?: AIPlanSuggestion | null;
}

export interface AISection {
  todayTasks: Array<{
    time: string;
    type: string;
    description: string;
    tip?: string;
    generatedContent?: string;
    generatedHashtags?: string[];
  }>;
  tomorrowPreparation: Array<{ time: string; type: string; description: string; preparation: string }>;
  monthlyGoals: Array<{ metric: string; target: string; progress?: number }>;
  weeklySchedule: {
    week: number;
    theme: string;
    actions: string[];
    tasks: Array<{ day: string; date?: string; time: string; type: string; description: string }>;
    startDate?: string;
    endDate?: string;
  } | null;
}

interface HomeStore {
  // ダッシュボードデータ
  dashboardData: DashboardData | null;
  isLoadingDashboard: boolean;
  setDashboardData: (data: DashboardData | null) => void;
  setIsLoadingDashboard: (loading: boolean) => void;

  // AI生成セクション
  aiSections: AISection | null;
  isLoadingAiSections: boolean;
  setAiSections: (sections: AISection | null) => void;
  setIsLoadingAiSections: (loading: boolean) => void;

  // UI状態
  showPlanCreatedBanner: boolean;
  setShowPlanCreatedBanner: (show: boolean) => void;
  copiedTaskIndex: number | null;
  setCopiedTaskIndex: (index: number | null) => void;
  savingTaskIndex: number | null;
  setSavingTaskIndex: (index: number | null) => void;

  // その他KPI入力
  otherFollowerCount: number | "";
  otherProfileVisits: number | "";
  otherExternalLinkTaps: number | "";
  isSavingOtherKPI: boolean;
  isLoadingOtherKPI: boolean;
  setOtherFollowerCount: (count: number | "") => void;
  setOtherProfileVisits: (visits: number | "") => void;
  setOtherExternalLinkTaps: (taps: number | "") => void;
  setIsSavingOtherKPI: (saving: boolean) => void;
  setIsLoadingOtherKPI: (loading: boolean) => void;

  // データ取得関数
  fetchDashboard: () => Promise<void>;
  fetchAiSections: () => Promise<void>;
  fetchOtherKPI: () => Promise<void>;

  // リセット関数
  reset: () => void;
}

const initialState = {
  dashboardData: null,
  isLoadingDashboard: true,
  aiSections: null,
  isLoadingAiSections: true,
  showPlanCreatedBanner: false,
  copiedTaskIndex: null,
  savingTaskIndex: null,
  otherFollowerCount: "" as number | "",
  otherProfileVisits: "" as number | "",
  otherExternalLinkTaps: "" as number | "",
  isSavingOtherKPI: false,
  isLoadingOtherKPI: false,
};

export const useHomeStore = create<HomeStore>((set) => ({
  ...initialState,

  // ダッシュボードデータ
  setDashboardData: (data) => set({ dashboardData: data }),
  setIsLoadingDashboard: (loading) => set({ isLoadingDashboard: loading }),

  // AI生成セクション
  setAiSections: (sections) => set({ aiSections: sections }),
  setIsLoadingAiSections: (loading) => set({ isLoadingAiSections: loading }),

  // UI状態
  setShowPlanCreatedBanner: (show) => set({ showPlanCreatedBanner: show }),
  setCopiedTaskIndex: (index) => set({ copiedTaskIndex: index }),
  setSavingTaskIndex: (index) => set({ savingTaskIndex: index }),

  // その他KPI入力
  setOtherFollowerCount: (count) => set({ otherFollowerCount: count }),
  setOtherProfileVisits: (visits) => set({ otherProfileVisits: visits }),
  setOtherExternalLinkTaps: (taps) => set({ otherExternalLinkTaps: taps }),
  setIsSavingOtherKPI: (saving) => set({ isSavingOtherKPI: saving }),
  setIsLoadingOtherKPI: (loading) => set({ isLoadingOtherKPI: loading }),

  // データ取得関数
  fetchDashboard: async () => {
    set({ isLoadingDashboard: true });
    try {
      const response = await authFetch("/api/home/dashboard");
      if (response.ok) {
        const data = await response.json() as {
          success?: boolean;
          data?: DashboardData;
        };
        if (data.success && data.data) {
          set({ dashboardData: data.data });
        }
      }
    } catch (error) {
      console.error("ダッシュボードデータ取得エラー:", error);
    } finally {
      set({ isLoadingDashboard: false });
    }
  },

  fetchAiSections: async () => {
    set({ isLoadingAiSections: true });
    try {
      const response = await authFetch("/api/home/ai-generated-sections");
      if (response.ok) {
        const data = await response.json() as {
          success?: boolean;
          data?: AISection;
        };
        if (data.success && data.data) {
          set({ aiSections: data.data });
        }
      }
    } catch (error) {
      console.error("AI生成セクション取得エラー:", error);
    } finally {
      set({ isLoadingAiSections: false });
    }
  },

  fetchOtherKPI: async () => {
    set({ isLoadingOtherKPI: true });
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const response = await authFetch(`/api/follower-counts?month=${month}&snsType=instagram`);
      if (response.ok) {
        const data = await response.json() as {
          success?: boolean;
          data?: {
            followers?: number;
            profileVisits?: number;
            externalLinkTaps?: number;
          };
        };
        if (data.success && data.data) {
          set({
            otherFollowerCount: data.data.followers || "",
            otherProfileVisits: data.data.profileVisits || "",
            otherExternalLinkTaps: data.data.externalLinkTaps || "",
          });
        } else {
          set({
            otherFollowerCount: "",
            otherProfileVisits: "",
            otherExternalLinkTaps: "",
          });
        }
      }
    } catch (error) {
      console.error("その他KPIデータ取得エラー:", error);
    } finally {
      set({ isLoadingOtherKPI: false });
    }
  },

  // リセット
  reset: () => set(initialState),
}));

