export type TodayTaskPriority = "high" | "medium" | "low";
export type PostType = "feed" | "reel" | "story";

export type TodayTask = {
  id: string;
  type: "story" | "comment" | "feed" | "reel";
  title: string;
  description: string;
  recommendedTime?: string;
  content?: string;
  hashtags?: string[];
  count?: number;
  reason?: string;
  priority: TodayTaskPriority;
};

export interface ScheduledPostItem {
  id: string;
  type: PostType;
  content: string;
  title: string;
  scheduledTime: Date;
}

export interface TodayTaskAIGenerationRequest {
  taskId: string;
  postType: PostType;
  prompt: string;
}

export interface TomorrowPreparationAIGenerationRequest {
  type: PostType;
  description: string;
  prompt: string;
  preparation: string;
}

export interface FallbackPostAIGenerationRequest {
  task: TodayTask;
  postType: PostType;
  prompt: string;
}

export type PlanDataForGeneration = {
  title: string;
  targetFollowers: number;
  currentFollowers: number;
  planPeriod: string;
  targetAudience: string;
  category: string;
  strategies: string[];
  aiPersona: {
    tone: string;
    style: string;
    personality: string;
    interests: string[];
  };
  simulation: {
    postTypes: {
      reel: { weeklyCount: number; followerEffect: number };
      feed: { weeklyCount: number; followerEffect: number };
      story: { weeklyCount: number; followerEffect: number };
    };
  };
};

export interface DeriveTodayTasksInput {
  currentPlan: Record<string, unknown>;
  localDate: string;
  timezone: string;
  scheduledPosts: ScheduledPostItem[];
  nowMs: number;
}

export interface DeriveTodayTasksOutput {
  baseTasks: TodayTask[];
  aiRequests: TodayTaskAIGenerationRequest[];
  tomorrowRequests: TomorrowPreparationAIGenerationRequest[];
  fallbackRequest: FallbackPostAIGenerationRequest | null;
  regionNameForHashtag: string;
  planDataForGeneration: PlanDataForGeneration;
}
