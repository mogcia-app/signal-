// src/app/dashboard/types.ts

export const WEEK_DAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

export type PurposeKey = 
  "awareness" | "recruit" | "sales" | "fan" | "inquiry" | "branding";

export type AdvisorIntent = 
  "image-fit" | "composition" | "overlay-text" | "video-idea";

export type AdvisorSource = "undecided" | "draft" | "product";

export interface MonthlyResult {
  metric: string;
  value: number;
  change: number | undefined;
  icon: string;
  format?: "number" | "percent";
}

export interface MonthlyKpisData {
  thisMonth: {
    likes: number;
    comments: number;
    shares: number;
    reposts: number;
    saves: number;
    followerIncrease: number;
    followers: number;
    postExecutionRate?: number;
    saveRate?: number;
    profileTransitionRate?: number;
  };
  previousMonth: {
    likes: number;
    comments: number;
    shares: number;
    reposts: number;
    saves: number;
    followerIncrease: number;
    followers: number;
    postExecutionRate?: number;
    saveRate?: number;
    profileTransitionRate?: number;
  };
  changes: {
    likes?: number;
    comments?: number;
    shares?: number;
    reposts?: number;
    saves?: number;
    followerIncrease?: number;
    followers?: number;
    postExecutionRate?: number;
    saveRate?: number;
    profileTransitionRate?: number;
  };
  breakdown: { followerIncreaseFromPosts: number; followerIncreaseFromOther: number };
}

export interface AiDirectionData {
  month: string;
  mainTheme: string;
  lockedAt: string | null;
}

export interface TomorrowPreparationItem {
  type: string;
  description: string;
  content?: string;
  hashtags?: string[];
  preparation: string;
}

export interface EditableTimelineItem {
  key: string;
  dayLabel: WeekDay;
  dateLabel: string;
  dateIso: string;
  time: string;
  label: string;
  type: "feed" | "reel" | "story";
  direction?: string;
  hook?: string;
}

export interface MonthlyCalendarPlanItem {
  dateIso: string;
  dayLabel: WeekDay;
  postType: "feed" | "reel" | "story";
  suggestedTime: string;
  title: string;
  direction?: string;
  hook?: string;
}

export interface HomeGeneratedCandidate {
  variant: "random" | "advice";
  label: string;
  title: string;
  content: string;
  hashtagsText: string;
  suggestedTime: string;
  postHints: string[];
  adviceReference?: {
    postId: string;
    postTitle: string;
    generatedAt: string;
  } | null;
}

export interface HomeAdvisorMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

export interface HomeUnanalyzedPost {
  id: string;
  title: string;
  type: "feed" | "reel" | "story";
  imageUrl?: string | null;
  createdAt?: string;
  status?: string;
}

export interface HomeGenerationProgressState {
  progress: number;
  message: string;
  subMessage: string;
}
