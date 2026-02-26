"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import SNSLayout from "../../components/sns-layout";
import { useAuth } from "../../contexts/auth-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAiUsageSummary } from "@/hooks/useAiUsageSummary";
import { authFetch } from "../../utils/authFetch";
import { handleError } from "../../utils/error-handling";
import { ERROR_MESSAGES } from "../../constants/error-messages";
import { TrendingUp, X, Target, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Bot, Send } from "lucide-react";

// マークダウン記法を削除する関数
const removeMarkdown = (text: string): string => {
  if (!text) {return text;}
  return text
    .replace(/\*\*/g, "") // **太字**
    .replace(/\*/g, "") // *斜体*
    .replace(/__/g, "") // __太字__
    .replace(/_/g, "") // _斜体_
    .replace(/#{1,6}\s/g, "") // # 見出し
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // [リンクテキスト](URL)
    .replace(/`([^`]+)`/g, "$1") // `コード`
    .replace(/~~/g, "") // ~~取り消し線~~
    .trim();
};

const toLocalISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

import { SkeletonLoader } from "../../components/ui/SkeletonLoader";
import { BotStatusCard } from "../../components/bot-status-card";
import type {
  DashboardData,
  DashboardResponse,
} from "../../types/home";

interface MonthlyResult {
  metric: string;
  value: number;
  change: number | undefined;
  icon: string;
  format?: "number" | "percent";
}

interface EditableTimelineItem {
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

interface MonthlyCalendarPlanItem {
  dateIso: string;
  dayLabel: WeekDay;
  postType: "feed" | "reel" | "story";
  suggestedTime: string;
  title: string;
  direction?: string;
  hook?: string;
}

interface HomeGeneratedCandidate {
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

interface HomeAdvisorMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

type AdvisorIntent = "image-fit" | "composition" | "overlay-text" | "video-idea";
type AdvisorSource = "undecided" | "draft" | "product";

// Keep payload safely below serverless request size limits in production.
const HOME_DRAFT_IMAGE_DATA_MAX_BYTES = 3_000_000;

interface HomeUnanalyzedPost {
  id: string;
  title: string;
  type: "feed" | "reel" | "story";
  imageUrl?: string | null;
  createdAt?: string;
  status?: string;
}
interface HomeGenerationProgressState {
  progress: number;
  message: string;
  subMessage: string;
}

type MonthlyFocusEvaluationStatus = "achieved" | "not_achieved" | "no_data";

interface MonthlyActionFocusData {
  month: string;
  title: string;
  description: string;
  action: string;
  kpiKey: "likes" | "comments" | "shares" | "saves" | "reach" | "followerIncrease";
  kpiLabel: string;
  promptText: string;
  evaluation: {
    status: MonthlyFocusEvaluationStatus;
    summary: string;
  } | null;
}

const WEEK_DAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;
type WeekDay = (typeof WEEK_DAYS)[number];

type PurposeKey = "awareness" | "recruit" | "sales" | "fan" | "inquiry" | "branding";

const normalizePurposeKey = (value: string): PurposeKey => {
  const normalized = String(value || "").trim();
  if (normalized === "求人・リクルート強化" || normalized === "採用・リクルーティング強化") {return "recruit";}
  if (normalized === "商品・サービスの販売促進") {return "sales";}
  if (normalized === "ファンを作りたい") {return "fan";}
  if (normalized === "来店・問い合わせを増やしたい") {return "inquiry";}
  if (normalized === "企業イメージ・ブランディング") {return "branding";}
  return "awareness";
};

const DIRECTION_LIBRARY: Record<PurposeKey, Record<"feed" | "reel" | "story", string[]>> = {
  awareness: {
    feed: ["商品紹介系", "活用シーン系", "比較・選び方系", "ブランド認知系"],
    reel: ["商品紹介系", "使い方デモ系", "現場の様子", "体験レビュー系"],
    story: ["Q&A系", "商品紹介系", "お知らせ系", "質問募集系"],
  },
  recruit: {
    feed: ["働き方紹介系", "社員インタビュー系", "募集職種紹介系", "社風紹介系"],
    reel: ["職場の雰囲気系", "1日の流れ系", "仕事のリアル系", "先輩の声系"],
    story: ["応募前Q&A系", "社風アンケート系", "募集情報系", "質問募集系"],
  },
  sales: {
    feed: ["商品紹介系", "比較・選び方系", "活用シーン系", "導入事例系"],
    reel: ["使い方デモ系", "ビフォーアフター系", "購入前チェック系", "体験レビュー系"],
    story: ["購入前Q&A系", "おすすめ案内系", "期間限定案内系", "投票系"],
  },
  fan: {
    feed: ["ブランドストーリー系", "お客様の声系", "活用シーン系", "コミュニティ系"],
    reel: ["現場の様子", "スタッフストーリー系", "共感テーマ系", "制作裏側系"],
    story: ["ファン投票系", "質問募集系", "現場の様子", "次回テーマ募集系"],
  },
  inquiry: {
    feed: ["よくある質問系", "導入事例系", "比較・選び方系", "相談の流れ系"],
    reel: ["相談前チェック系", "問い合わせ導線系", "導入事例系", "失敗回避系"],
    story: ["相談受付案内系", "疑問募集系", "Q&A系", "お問い合わせ導線系"],
  },
  branding: {
    feed: ["ブランドストーリー系", "ブランド背景系", "品質こだわり系", "価値観紹介系"],
    reel: ["世界観ムービー系", "制作裏側系", "こだわり紹介系", "ブランド背景系"],
    story: ["価値観アンケート系", "ブランドQ&A系", "現場の様子", "次回予告系"],
  },
};

const pickRandomBusinessHourTime = (): string => {
  const hour = 9 + Math.floor(Math.random() * 9); // 09:00-17:59
  const minute = Math.random() < 0.5 ? 0 : 30;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

export default function HomePage() {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { usage: aiUsage, isLoading: isAiUsageLoading, refreshUsage } = useAiUsageSummary(Boolean(user?.uid));
  const router = useRouter();

  // 今日の日付を取得
  const today = new Date();

  // ユーザー名を取得
  const userName = userProfile?.name || user?.displayName || "ユーザー";

  // 状態管理
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [showPlanCreatedBanner, setShowPlanCreatedBanner] = useState(false);
  // AI方向性（重点方針）のstate
  const [aiDirection, setAiDirection] = useState<{
    month: string;
    mainTheme: string;
    lockedAt: string | null;
  } | null>(null);
  const [, setIsLoadingAiDirection] = useState(false);
  
  // 今月のKPIデータ
  const [monthlyKPIs, setMonthlyKPIs] = useState<{
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
  } | null>(null);
  const [isLoadingMonthlyKPIs, setIsLoadingMonthlyKPIs] = useState(true);
  const [monthlyActionFocus, setMonthlyActionFocus] = useState<MonthlyActionFocusData | null>(null);
  const [isLoadingMonthlyActionFocus, setIsLoadingMonthlyActionFocus] = useState(false);

  // 週次コンテンツ計画
  const [weeklyPlans, setWeeklyPlans] = useState<{
    currentWeek: number;
    currentWeekPlan: {
      week: number;
      targetFollowers: number;
      increase: number;
      theme: string;
      feedPosts: Array<{
        day: string;
        content: string;
        type?: string;
        title?: string;
        displayText?: string;
        date?: string;
        dayName?: string;
        time?: string;
      }>;
      storyContent: string[];
    } | null;
    allWeeklyPlans: Array<{
      week: number;
      targetFollowers: number;
      increase: number;
      theme: string;
      feedPosts: Array<{
        day: string;
        content: string;
        type?: string;
        title?: string;
        displayText?: string;
        date?: string;
        dayName?: string;
        time?: string;
      }>;
      storyContent: string[];
    }>;
    schedule: {
      weeklyFrequency: string;
      postingDays: Array<{ day: string; time: string; type?: string }>;
      storyDays: Array<{ day: string; time: string }>;
    };
  } | null>(null);
  const [isLoadingWeeklyPlans, setIsLoadingWeeklyPlans] = useState(false);

  // 分析待ち投稿と明日の準備
  const [homeUnanalyzedPosts, setHomeUnanalyzedPosts] = useState<HomeUnanalyzedPost[]>([]);
  const [tomorrowPreparations, setTomorrowPreparations] = useState<Array<{
    type: string;
    description: string;
    content?: string;
    hashtags?: string[];
    preparation: string;
  }>>([]);
  const [isLoadingHomeUnanalyzedPosts, setIsLoadingHomeUnanalyzedPosts] = useState(false);
  const [isLoadingTodayTasks, setIsLoadingTodayTasks] = useState(false);
  const [quickPlanPurpose, setQuickPlanPurpose] = useState<string>("認知拡大");
  const [quickPlanTargetFollowers, setQuickPlanTargetFollowers] = useState<number | "">("");
  const [quickPlanFeedDays, setQuickPlanFeedDays] = useState<WeekDay[]>([]);
  const [quickPlanReelDays, setQuickPlanReelDays] = useState<WeekDay[]>([]);
  const [quickPlanStoryDays, setQuickPlanStoryDays] = useState<WeekDay[]>([]);
  const [quickPlanStartDate, setQuickPlanStartDate] = useState<string>(toLocalISODate(today));
  const [quickPlanDetailOpen, setQuickPlanDetailOpen] = useState(false);
  const [quickPlanTargetAudience, setQuickPlanTargetAudience] = useState<string>("");
  const [quickPlanPostingTime, setQuickPlanPostingTime] = useState<string>("");
  const [quickPlanRegionRestriction, setQuickPlanRegionRestriction] = useState<"none" | "restricted">("none");
  const [quickPlanRegionName, setQuickPlanRegionName] = useState<string>("");
  const [isCreatingQuickPlan, setIsCreatingQuickPlan] = useState(false);
  const [isResettingPlan, setIsResettingPlan] = useState(false);
  const [isResetConfirming, setIsResetConfirming] = useState(false);
  const [showHomePlanForm, setShowHomePlanForm] = useState(false);
  const [calendarViewYear, setCalendarViewYear] = useState<number>(today.getFullYear());
  const [calendarViewMonth, setCalendarViewMonth] = useState<number>(today.getMonth());
  const [isWeeklyPlanMarkedOnCalendar, setIsWeeklyPlanMarkedOnCalendar] = useState(false);
  const [isGeneratingMonthlyCalendarPlan, setIsGeneratingMonthlyCalendarPlan] = useState(false);
  const [monthlyCalendarPlan, setMonthlyCalendarPlan] = useState<MonthlyCalendarPlanItem[]>([]);
  const [_selectedCalendarDateIso, setSelectedCalendarDateIso] = useState<string | null>(null);
  const [editableTimelineItems, setEditableTimelineItems] = useState<EditableTimelineItem[]>([]);
  const [editingTimelineKey, setEditingTimelineKey] = useState<string | null>(null);
  const [timelineEditDraft, setTimelineEditDraft] = useState<{
    dateIso: string;
    type: "feed" | "reel" | "story";
  }>({
    dateIso: "",
    type: "feed",
  });
  const [generatingTimelinePostKey, setGeneratingTimelinePostKey] = useState<string | null>(null);
  const [homePostType, setHomePostType] = useState<"feed" | "reel" | "story">("feed");
  const [homePostScheduledDate, setHomePostScheduledDate] = useState("");
  const [homePostScheduledTime, setHomePostScheduledTime] = useState("");
  const [homePostPrompt, setHomePostPrompt] = useState("");
  const [isGeneratingHomePost, setIsGeneratingHomePost] = useState(false);
  const [homeGenerationProgress, setHomeGenerationProgress] = useState<HomeGenerationProgressState | null>(null);
  const [isSavingHomeDraft, setIsSavingHomeDraft] = useState(false);
  const [pendingAiGenerationNoticePlanId, setPendingAiGenerationNoticePlanId] = useState<string | null>(null);
  const [homeDraftTitle, setHomeDraftTitle] = useState("");
  const [homeDraftContent, setHomeDraftContent] = useState("");
  const [homeDraftHashtagsText, setHomeDraftHashtagsText] = useState("");
  const [homeGeneratedCandidates, setHomeGeneratedCandidates] = useState<HomeGeneratedCandidate[]>([]);
  const [homeRecommendedCandidateVariant, setHomeRecommendedCandidateVariant] =
    useState<"random" | "advice" | null>(null);
  const [hasAppliedHomeCandidate, setHasAppliedHomeCandidate] = useState(false);
  const [homeSelectedCandidateVariant, setHomeSelectedCandidateVariant] = useState<"random" | "advice" | null>(null);
  const [homeImageContext, setHomeImageContext] = useState("");
  const [homeSelectedProductId, setHomeSelectedProductId] = useState("");
  const [homeAttachedImage, setHomeAttachedImage] = useState<{ name: string; previewUrl: string; dataUrl: string } | null>(null);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [advisorInput, setAdvisorInput] = useState("");
  const [isAdvisorLoading, setIsAdvisorLoading] = useState(false);
  const [advisorIntent, setAdvisorIntent] = useState<AdvisorIntent>("image-fit");
  const [advisorSource, setAdvisorSource] = useState<AdvisorSource>("undecided");
  const [advisorPostType, setAdvisorPostType] = useState<"feed" | "reel" | "story">("feed");
  const [selectedAdvisorProductId, setSelectedAdvisorProductId] = useState("");
  const [advisorProductConfigured, setAdvisorProductConfigured] = useState(false);
  const [hasLoadedAdvisorHistory, setHasLoadedAdvisorHistory] = useState(false);
  const [advisorMessages, setAdvisorMessages] = useState<HomeAdvisorMessage[]>([
    {
      id: "advisor-initial",
      role: "assistant",
      text: `こんにちは${userName}さん\nどのようなことでお困りですか？`,
    },
  ]);
  const [advisorSuggestedQuestions, setAdvisorSuggestedQuestions] = useState<string[]>([
    "画像作成のコツを教えて",
    "動画作成のコツを教えて",
  ]);
  const planCardRef = useRef<HTMLDivElement | null>(null);
  const postComposerRef = useRef<HTMLDivElement | null>(null);
  const [isPlanCardHighlighted, setIsPlanCardHighlighted] = useState(false);
  const [guidedFlowStartMs, setGuidedFlowStartMs] = useState<number | null>(null);
  const [guidedFlowNowMs, setGuidedFlowNowMs] = useState<number>(Date.now());
  const perfRunRef = useRef<{
    runId: string;
    startedAtMs: number;
    planSaveMs?: number;
    monthlyAiGenerateMs?: number;
    weeklyPlanVisibleMs?: number;
  } | null>(null);
  const onboardingProducts = Array.isArray((userProfile as { businessInfo?: { productsOrServices?: Array<{ id?: string; name?: string; details?: string; price?: string }> } } | null)?.businessInfo?.productsOrServices)
    ? ((userProfile as { businessInfo?: { productsOrServices?: Array<{ id?: string; name?: string; details?: string; price?: string }> } }).businessInfo?.productsOrServices || [])
    : [];
  const selectedProductName = onboardingProducts.find((product, index) => {
    const productSelectKey = String(product?.id || product?.name || `idx-${index}`);
    return productSelectKey === homeSelectedProductId;
  })?.name;
  const selectedAdvisorProductName = onboardingProducts.find((product, index) => {
    const productSelectKey = String(product?.id || product?.name || `idx-${index}`);
    return productSelectKey === selectedAdvisorProductId;
  })?.name;

  const getWeeklyCountLabel = (count: number): string => {
    const safe = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    if (safe <= 0) {return "未設定";}
    if (safe >= 7) {return "週7回（毎日）";}
    return `週${safe}回`;
  };

  const sortWeekDays = (days: WeekDay[]): WeekDay[] =>
    [...days].sort((a, b) => WEEK_DAYS.indexOf(a) - WEEK_DAYS.indexOf(b));

  const getPostingTimeLabel = (value: unknown): string => {
    if (value === "morning") {return "午前中（9:00〜12:00）";}
    if (value === "noon") {return "昼（12:00〜15:00）";}
    if (value === "evening") {return "夕方（15:00〜18:00）";}
    if (value === "night") {return "夜（18:00〜21:00）";}
    if (value === "late-night") {return "深夜（21:00〜24:00）";}
    if (!String(value || "").trim()) {return "AIに任せる";}
    return String(value);
  };

  const getKpiFocusFromPurpose = (purpose: string): string => {
    const normalized = String(purpose || "").trim();
    switch (normalized) {
      case "認知拡大":
        return "いいね";
      case "採用・リクルーティング強化":
        return "プロフィール遷移";
      case "商品・サービスの販売促進":
        return "保存率";
      case "ファンを作りたい":
        return "保存率";
      case "来店・問い合わせを増やしたい":
        return "プロフィール遷移";
      case "企業イメージ・ブランディング":
        return "リーチ";
      default:
        return "保存率";
    }
  };

  useEffect(() => {
    if (guidedFlowStartMs === null) {return;}
    const id = window.setInterval(() => {
      setGuidedFlowNowMs(Date.now());
    }, 120);
    return () => window.clearInterval(id);
  }, [guidedFlowStartMs]);

  const parseSavedWeekDays = (value: unknown): WeekDay[] => {
    if (!Array.isArray(value)) {return [];}
    return value.filter((day): day is WeekDay => WEEK_DAYS.includes(day as WeekDay));
  };

  const toGeneratorType = (type: string): "feed" | "reel" | "story" => {
    if (type === "reel") {return "reel";}
    if (type === "story") {return "story";}
    return "feed";
  };

  const setGeneratorFromTask = (params: {
    type: string;
    prompt: string;
    recommendedTime?: string;
    useTomorrowDate?: boolean;
  }) => {
    const prompt = params.prompt.trim();
    setHomePostType(toGeneratorType(params.type));
    setHomePostPrompt(prompt);

    const targetDate = new Date();
    if (params.useTomorrowDate) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    setHomePostScheduledDate(toLocalISODate(targetDate));

    if (params.recommendedTime && params.recommendedTime !== "推奨時間未設定") {
      const match = params.recommendedTime.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        const hh = match[1].padStart(2, "0");
        const mm = match[2];
        setHomePostScheduledTime(`${hh}:${mm}`);
      }
    }

    toast.success("投稿生成に反映しました");
  };

  const saveMonthlyCalendarPlanToFirestore = async (
    planId: string,
    params: {
      startDate: string;
      endDate: string;
      items: MonthlyCalendarPlanItem[];
    }
  ) => {
    const response = await authFetch("/api/home/monthly-calendar-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId,
        startDate: params.startDate,
        endDate: params.endDate,
        items: params.items,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error || "月間予定の保存に失敗しました");
    }
  };

  const fetchMonthlyCalendarPlanFromFirestore = async (planId: string) => {
    const response = await authFetch(`/api/home/monthly-calendar-plan?planId=${encodeURIComponent(planId)}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error || "月間予定の取得に失敗しました");
    }
    const result = await response.json();
    if (!result?.success || !result?.data) {
      setMonthlyCalendarPlan([]);
      setSelectedCalendarDateIso(null);
      setIsWeeklyPlanMarkedOnCalendar(false);
      return;
    }

    const items: MonthlyCalendarPlanItem[] = Array.isArray(result.data.items)
      ? result.data.items.filter(
          (item: unknown): item is MonthlyCalendarPlanItem =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as { dateIso?: unknown }).dateIso === "string" &&
            WEEK_DAYS.includes((item as { dayLabel?: unknown }).dayLabel as WeekDay) &&
            ((item as { postType?: unknown }).postType === "feed" ||
              (item as { postType?: unknown }).postType === "reel" ||
              (item as { postType?: unknown }).postType === "story") &&
            typeof (item as { suggestedTime?: unknown }).suggestedTime === "string" &&
            typeof (item as { title?: unknown }).title === "string" &&
            ((item as { direction?: unknown }).direction === undefined ||
              typeof (item as { direction?: unknown }).direction === "string") &&
            ((item as { hook?: unknown }).hook === undefined ||
              typeof (item as { hook?: unknown }).hook === "string")
        )
      : [];

    setMonthlyCalendarPlan(items);
    setSelectedCalendarDateIso(items[0]?.dateIso || null);
    setIsWeeklyPlanMarkedOnCalendar(items.length > 0);

    if (typeof result.data.startDate === "string") {
      setQuickPlanStartDate(result.data.startDate);
      const parsedStartDate = new Date(result.data.startDate);
      if (!Number.isNaN(parsedStartDate.getTime())) {
        setCalendarViewYear(parsedStartDate.getFullYear());
        setCalendarViewMonth(parsedStartDate.getMonth());
      }
    }

    const feed = new Set<WeekDay>();
    const reel = new Set<WeekDay>();
    const story = new Set<WeekDay>();
    items.forEach((item) => {
      if (item.postType === "feed") {feed.add(item.dayLabel);}
      if (item.postType === "reel") {reel.add(item.dayLabel);}
      if (item.postType === "story") {story.add(item.dayLabel);}
    });
    setQuickPlanFeedDays(Array.from(feed));
    setQuickPlanReelDays(Array.from(reel));
    setQuickPlanStoryDays(Array.from(story));
  };

  // ダッシュボードデータを取得
  const fetchDashboard = async () => {
    try {
      setIsLoadingDashboard(true);
      const response = await authFetch("/api/home/dashboard");
      if (response.ok) {
        const data = (await response.json()) as DashboardResponse;
        if (data.success && data.data) {
          setDashboardData(data.data);
        } else {
          const errorMessage = handleError(
            data.error || ERROR_MESSAGES.DASHBOARD_FETCH_FAILED,
            ERROR_MESSAGES.DASHBOARD_FETCH_FAILED
          );
          toast.error(errorMessage);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = handleError(
          errorData.error || ERROR_MESSAGES.DASHBOARD_FETCH_FAILED,
          ERROR_MESSAGES.DASHBOARD_FETCH_FAILED
        );
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("ダッシュボードデータ取得エラー:", error);
      const errorMessage = handleError(
        error,
        ERROR_MESSAGES.DASHBOARD_FETCH_FAILED
      );
      toast.error(errorMessage);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  useEffect(() => {
    const currentPlan = dashboardData?.currentPlan;
    if (!currentPlan || !pendingAiGenerationNoticePlanId) {return;}
    if (currentPlan.id !== pendingAiGenerationNoticePlanId) {return;}
    if (currentPlan.aiGenerationStatus !== "completed") {return;}
    toast.success("AIが計画を生成しました");
    setPendingAiGenerationNoticePlanId(null);
  }, [dashboardData?.currentPlan, pendingAiGenerationNoticePlanId]);

  // ダッシュボードデータとAI生成セクションを並列取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingDashboard(true);
        
        console.log("[Home] API呼び出し開始");
        const dashboardResponse = await authFetch("/api/home/dashboard");

        console.log("[Home] APIレスポンス取得:", {
          dashboardOk: dashboardResponse.ok,
          dashboardStatus: dashboardResponse.status,
        });

        // ダッシュボードデータの処理
        if (dashboardResponse.ok) {
          const dashboardData = (await dashboardResponse.json()) as DashboardResponse;
          if (dashboardData.success && dashboardData.data) {
            setDashboardData(dashboardData.data);
            
          } else {
            const errorMessage = handleError(
              dashboardData.error || "ダッシュボードデータの取得に失敗しました",
              "ダッシュボードデータの取得に失敗しました"
            );
            toast.error(errorMessage);
          }
        } else {
          const errorData = await dashboardResponse.json().catch(() => ({}));
          const errorMessage = handleError(
            errorData.error || "ダッシュボードデータの取得に失敗しました",
            "ダッシュボードデータの取得に失敗しました"
          );
          toast.error(errorMessage);
        }

      } catch (error) {
        console.error("データ取得エラー:", error);
        const errorMessage = handleError(
          error,
          ERROR_MESSAGES.DASHBOARD_FETCH_FAILED
        );
        toast.error(errorMessage);
      } finally {
        setIsLoadingDashboard(false);
      }
    };

    fetchData();
     
  }, []); // 初回マウント時のみ実行

  useEffect(() => {
    const planId = typeof dashboardData?.currentPlan?.id === "string" ? dashboardData.currentPlan.id : "";
    if (!planId) {
      setMonthlyCalendarPlan([]);
      setSelectedCalendarDateIso(null);
      setIsWeeklyPlanMarkedOnCalendar(false);
      setQuickPlanFeedDays([]);
      setQuickPlanReelDays([]);
      setQuickPlanStoryDays([]);
      return;
    }
    fetchMonthlyCalendarPlanFromFirestore(planId).catch((error) => {
      console.error("月間予定取得エラー:", error);
    });
     
  }, [dashboardData?.currentPlan?.id]);

  // AI方向性（重点方針）を取得（今月または来月の確定済みを取得）
  useEffect(() => {
    const fetchAiDirection = async () => {
      if (!user?.uid) {return;}
      
      try {
        setIsLoadingAiDirection(true);
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
        
        console.log("[Home] AI方向性取得開始:", { currentMonth, nextMonthStr, uid: user.uid });
        
        // まず来月のデータを取得（月次レポートでは来月の重点方針を設定するため）
        let response = await authFetch(`/api/ai-direction?month=${nextMonthStr}`);
        let result = null;
        
        if (response.ok) {
          result = await response.json();
          if (result.success && result.data && result.data.lockedAt) {
            console.log("[Home] 来月のAI方向性を取得:", result.data);
            setAiDirection({
              month: result.data.month,
              mainTheme: result.data.mainTheme,
              lockedAt: result.data.lockedAt,
            });
            return;
          }
        }
        
        // 来月のデータがない場合は、今月のデータを取得
        response = await authFetch(`/api/ai-direction?month=${currentMonth}`);
        if (response.ok) {
          result = await response.json();
          if (result.success && result.data && result.data.lockedAt) {
            console.log("[Home] 今月のAI方向性を取得:", result.data);
            setAiDirection({
              month: result.data.month,
              mainTheme: result.data.mainTheme,
              lockedAt: result.data.lockedAt,
            });
            return;
          }
        }
        
        // どちらもない場合は、最新のai_directionを取得（過去3ヶ月以内）
        response = await authFetch(`/api/ai-direction`);
        if (response.ok) {
          result = await response.json();
          console.log("[Home] 最新のAI方向性取得結果:", result);
          if (result.success && result.data && result.data.lockedAt) {
            console.log("[Home] 最新のAI方向性を設定:", result.data);
            setAiDirection({
              month: result.data.month,
              mainTheme: result.data.mainTheme,
              lockedAt: result.data.lockedAt,
            });
          } else {
            console.log("[Home] AI方向性が確定されていません:", result);
            setAiDirection(null);
          }
        } else {
          console.error("[Home] AI方向性取得失敗:", response.status);
          setAiDirection(null);
        }
      } catch (error) {
        console.error("AI方向性取得エラー:", error);
        setAiDirection(null);
      } finally {
        setIsLoadingAiDirection(false);
      }
    };

    fetchAiDirection();
  }, [user?.uid]);

  useEffect(() => {
    const fetchMonthlyActionFocus = async () => {
      if (!user?.uid) {
        setMonthlyActionFocus(null);
        return;
      }

      try {
        setIsLoadingMonthlyActionFocus(true);
        const response = await authFetch("/api/home/monthly-action-focus");
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result?.success) {
          setMonthlyActionFocus(null);
          return;
        }
        setMonthlyActionFocus((result.data || null) as MonthlyActionFocusData | null);
      } catch (error) {
        console.error("今月の施策テーマ取得エラー:", error);
        setMonthlyActionFocus(null);
      } finally {
        setIsLoadingMonthlyActionFocus(false);
      }
    };

    void fetchMonthlyActionFocus();
  }, [user?.uid]);

  // 週次コンテンツ計画を取得
  useEffect(() => {
    const fetchWeeklyPlans = async () => {
      if (!user?.uid) {return;}
      
      try {
        setIsLoadingWeeklyPlans(true);
        const response = await authFetch("/api/home/weekly-plans");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setWeeklyPlans(data.data);
          }
        }
      } catch (error) {
        console.error("週次計画取得エラー:", error);
      } finally {
        setIsLoadingWeeklyPlans(false);
      }
    };

    fetchWeeklyPlans();
  }, [user?.uid]);

  useEffect(() => {
    if (!isAdvisorOpen || !user?.uid || hasLoadedAdvisorHistory) {return;}

    const loadAdvisorHistory = async () => {
      try {
        const response = await authFetch("/api/home/advisor-chat");
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result?.success || !result?.data) {
          setAdvisorIntent("image-fit");
          setAdvisorSource("undecided");
          setAdvisorPostType("feed");
          setSelectedAdvisorProductId("");
          setAdvisorProductConfigured(false);
          setAdvisorMessages([
            {
              id: `advisor-initial-${Date.now()}`,
              role: "assistant",
              text: `こんにちは${userName}さん\nどのようなことでお困りですか？`,
            },
          ]);
          setAdvisorSuggestedQuestions(["画像作成のコツを教えて", "動画作成のコツを教えて"]);
          return;
        }

        const messagesRaw = Array.isArray(result.data.messages) ? result.data.messages : [];
        const messages = messagesRaw
          .map((item: unknown) => {
            const row = item as { id?: unknown; role?: unknown; text?: unknown };
            const role = row.role === "assistant" ? "assistant" : row.role === "user" ? "user" : null;
            const text = String(row.text || "").trim();
            if (!role || !text) {return null;}
            return {
              id: String(row.id || `${role}-${Date.now()}`),
              role,
              text,
            } as HomeAdvisorMessage;
          })
          .filter((item: HomeAdvisorMessage | null): item is HomeAdvisorMessage => Boolean(item));

        const flowState = (result.data.flowState || {}) as {
          advisorIntent?: unknown;
          advisorSource?: unknown;
          advisorPostType?: unknown;
          selectedAdvisorProductId?: unknown;
          advisorProductConfigured?: unknown;
        };
        const restoredIntent = String(flowState.advisorIntent || "").trim();
        const restoredSource = String(flowState.advisorSource || "").trim();
        const restoredPostType = String(flowState.advisorPostType || "").trim();
        const restoredSelectedProductId = String(flowState.selectedAdvisorProductId || "").trim();

        if (restoredIntent === "image-fit" || restoredIntent === "composition" || restoredIntent === "overlay-text" || restoredIntent === "video-idea") {
          setAdvisorIntent(restoredIntent as AdvisorIntent);
        }
        if (restoredSource === "undecided" || restoredSource === "draft" || restoredSource === "product") {
          setAdvisorSource(restoredSource as AdvisorSource);
        }
        if (restoredPostType === "feed" || restoredPostType === "reel" || restoredPostType === "story") {
          setAdvisorPostType(restoredPostType);
        }
        setSelectedAdvisorProductId(restoredSelectedProductId);
        setAdvisorProductConfigured(Boolean(flowState.advisorProductConfigured));

        if (messages.length > 0) {
          setAdvisorMessages(messages);
          const lastAssistantText = [...messages].reverse().find((msg) => msg.role === "assistant")?.text || "";
          if (isImageProposalReply(lastAssistantText) || isVideoProposalReply(lastAssistantText)) {
            setAdvisorProductConfigured(true);
            setAdvisorSuggestedQuestions(["別トーンでもう1案ください", "他の相談もする"]);
          } else {
            const restoredQuestions = normalizeAdvisorQuestions(result.data.suggestedQuestions);
            setAdvisorSuggestedQuestions(
              restoredQuestions.length > 0 ? restoredQuestions : ["画像作成のコツを教えて", "動画作成のコツを教えて"]
            );
          }
        } else {
          setAdvisorIntent("image-fit");
          setAdvisorSource("undecided");
          setAdvisorPostType("feed");
          setSelectedAdvisorProductId("");
          setAdvisorProductConfigured(false);
          setAdvisorMessages([
            {
              id: `advisor-initial-${Date.now()}`,
              role: "assistant",
              text: `こんにちは${userName}さん\nどのようなことでお困りですか？`,
            },
          ]);
          setAdvisorSuggestedQuestions(["画像作成のコツを教えて", "動画作成のコツを教えて"]);
        }
      } catch (error) {
        console.error("ホーム相談チャット履歴復元エラー:", error);
        setAdvisorIntent("image-fit");
        setAdvisorSource("undecided");
        setAdvisorPostType("feed");
        setSelectedAdvisorProductId("");
        setAdvisorProductConfigured(false);
        setAdvisorMessages([
          {
            id: `advisor-initial-${Date.now()}`,
            role: "assistant",
            text: `こんにちは${userName}さん\nどのようなことでお困りですか？`,
          },
        ]);
        setAdvisorSuggestedQuestions(["画像作成のコツを教えて", "動画作成のコツを教えて"]);
      } finally {
        setHasLoadedAdvisorHistory(true);
      }
    };

    void loadAdvisorHistory();
  }, [hasLoadedAdvisorHistory, isAdvisorOpen, user?.uid, userName]);

  // 明日の準備を取得
  useEffect(() => {
    const fetchTodayTasks = async () => {
      if (!user?.uid) {return;}
      
      try {
        setIsLoadingTodayTasks(true);
        const response = await authFetch("/api/home/today-tasks");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setTomorrowPreparations(data.data.tomorrowPreparations || []);
          }
        }
      } catch (error) {
        console.error("明日の準備取得エラー:", error);
      } finally {
        setIsLoadingTodayTasks(false);
      }
    };

    fetchTodayTasks();
  }, [user?.uid]);

  // 分析待ちの投稿を取得
  useEffect(() => {
    const fetchHomeUnanalyzedPosts = async () => {
      if (!user?.uid) {return;}

      try {
        setIsLoadingHomeUnanalyzedPosts(true);
        const response = await authFetch("/api/posts/with-analytics", {
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setHomeUnanalyzedPosts([]);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result?.success && result?.data) {
          setHomeUnanalyzedPosts((result.data.unanalyzedPosts || []) as HomeUnanalyzedPost[]);
        } else {
          setHomeUnanalyzedPosts([]);
        }
      } catch (error) {
        console.error("分析待ち投稿取得エラー:", error);
        setHomeUnanalyzedPosts([]);
      } finally {
        setIsLoadingHomeUnanalyzedPosts(false);
      }
    };

    fetchHomeUnanalyzedPosts();
  }, [user?.uid]);

  useEffect(() => {
    const handleAnalyticsUpdated = async () => {
      if (!user?.uid) {return;}
      try {
        const response = await authFetch("/api/posts/with-analytics", {
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setHomeUnanalyzedPosts([]);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result?.success && result?.data) {
          setHomeUnanalyzedPosts((result.data.unanalyzedPosts || []) as HomeUnanalyzedPost[]);
        } else {
          setHomeUnanalyzedPosts([]);
        }
      } catch (error) {
        console.error("分析待ち投稿更新エラー:", error);
      }
    };

    window.addEventListener("posts-analytics-updated", handleAnalyticsUpdated);
    return () => {
      window.removeEventListener("posts-analytics-updated", handleAnalyticsUpdated);
    };
  }, [user?.uid]);

  const createQuickPlanInline = async () => {
    if (!user?.uid) {
      toast.error("ログインが必要です");
      return;
    }
    if (!String(quickPlanPurpose || "").trim()) {
      toast.error("投稿の目的を設定してください");
      return;
    }
    if (!String(quickPlanStartDate || "").trim() || Number.isNaN(new Date(quickPlanStartDate).getTime())) {
      toast.error("計画開始日を設定してください");
      return;
    }
    if (quickPlanFeedDays.length === 0 || quickPlanReelDays.length === 0 || quickPlanStoryDays.length === 0) {
      toast.error("フィード・リール・ストーリーズの投稿曜日をすべて設定してください");
      return;
    }

    const runId = `home-plan-${Date.now()}`;
    const flowStart = Date.now();
    setGuidedFlowStartMs(flowStart);
    setGuidedFlowNowMs(flowStart);
    perfRunRef.current = {
      runId,
      startedAtMs: performance.now(),
    };
    console.log(`[HomePerf] start runId=${runId}`);

    setIsCreatingQuickPlan(true);
    try {
      const initialResponse = await authFetch("/api/home/plan-initial-data");
      if (!initialResponse.ok) {
        throw new Error("初期データの取得に失敗しました");
      }
      const initialData = await initialResponse.json() as { currentFollowers?: number };
      const currentFollowers = Number(initialData.currentFollowers || 0);
      if (!Number.isFinite(currentFollowers) || currentFollowers <= 0) {
        throw new Error("現在のフォロワー数を取得できませんでした");
      }

      const requestedIncrease = quickPlanTargetFollowers === "" ? NaN : Number(quickPlanTargetFollowers);
      const hasCustomTarget = Number.isFinite(requestedIncrease);
      if (!hasCustomTarget || requestedIncrease <= 0) {
        throw new Error("増加目標は1以上の値を設定してください");
      }
      const targetFollowers = currentFollowers + requestedIncrease;
      const customIncrease = requestedIncrease;

      const mapDaysToFrequency = (days: WeekDay[]): "none" | "weekly-1-2" | "weekly-3-4" | "daily" => {
        const count = days.length;
        if (count <= 0) {return "none";}
        if (count <= 2) {return "weekly-1-2";}
        if (count <= 4) {return "weekly-3-4";}
        return "daily";
      };
      const weeklyPosts = mapDaysToFrequency(quickPlanFeedDays);
      const reelCapability = mapDaysToFrequency(quickPlanReelDays);
      const storyFrequency = mapDaysToFrequency(quickPlanStoryDays);
      const saveResponse = await authFetch("/api/home/plan-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: quickPlanStartDate,
          currentFollowers,
          targetFollowerIncrease: requestedIncrease,
          targetFollowers,
          targetFollowerOption: "custom",
          customTargetFollowers: String(customIncrease),
          operationPurpose: quickPlanPurpose,
          weeklyPosts,
          reelCapability,
          storyFrequency,
          feedDays: quickPlanFeedDays,
          reelDays: quickPlanReelDays,
          storyDays: quickPlanStoryDays,
          targetAudience: quickPlanTargetAudience.trim(),
          postingTime: quickPlanPostingTime,
          regionRestriction: quickPlanRegionRestriction,
          regionName: quickPlanRegionRestriction === "restricted" ? quickPlanRegionName : undefined,
          simulationResult: null,
        }),
      });

      if (!saveResponse.ok) {
        const err = await saveResponse.json().catch(() => ({}));
        throw new Error(err.error || "計画の保存に失敗しました");
      }
      if (perfRunRef.current?.runId === runId) {
        perfRunRef.current.planSaveMs = performance.now() - perfRunRef.current.startedAtMs;
        console.log(
          `[HomePerf] runId=${runId} plan_save_ms=${perfRunRef.current.planSaveMs.toFixed(1)}`
        );
      }
      const saveResult = await saveResponse.json().catch(() => ({}));
      const planId = typeof saveResult?.planId === "string" ? saveResult.planId : "";
      if (!planId) {
        throw new Error("計画IDの取得に失敗しました");
      }
      setPendingAiGenerationNoticePlanId(planId);

      toast.success("ホームから計画を保存しました");
      setShowHomePlanForm(false);
      setIsWeeklyPlanMarkedOnCalendar(true);
      const startDate = new Date(quickPlanStartDate);
      if (!Number.isNaN(startDate.getTime())) {
        setCalendarViewYear(startDate.getFullYear());
        setCalendarViewMonth(startDate.getMonth());
      }
      setMonthlyCalendarPlan([]);
      setSelectedCalendarDateIso(null);
      await generateMonthlyPlanFromAI({
        planId,
        startDate: quickPlanStartDate,
        purpose: quickPlanPurpose,
      });
      await fetchDashboard();
    } catch (error) {
      console.error("クイック計画保存エラー:", error);
      toast.error(error instanceof Error ? error.message : "計画保存に失敗しました");
    } finally {
      setIsCreatingQuickPlan(false);
    }
  };

  const resetHomePlanCompletely = async () => {
    const planId = typeof dashboardData?.currentPlan?.id === "string" ? dashboardData.currentPlan.id : "";
    if (!planId) {
      setIsResetConfirming(false);
      toast.error("削除対象の計画が見つかりません");
      return;
    }

    setIsResettingPlan(true);
    try {
      const response = await authFetch(`/api/home/plan-delete?planId=${encodeURIComponent(planId)}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || "計画のリセットに失敗しました");
      }

      setShowHomePlanForm(false);
      setIsWeeklyPlanMarkedOnCalendar(false);
      setIsGeneratingMonthlyCalendarPlan(false);
      setPendingAiGenerationNoticePlanId(null);
      setMonthlyCalendarPlan([]);
      setSelectedCalendarDateIso(null);
      setEditableTimelineItems([]);
      setEditingTimelineKey(null);
      setTimelineEditDraft({ dateIso: "", type: "feed" });

      const nextToday = new Date();
      setQuickPlanTargetFollowers("");
      setQuickPlanFeedDays([]);
      setQuickPlanReelDays([]);
      setQuickPlanStoryDays([]);
      setQuickPlanStartDate(toLocalISODate(nextToday));
      setQuickPlanTargetAudience("");
      setQuickPlanPostingTime("");
      setQuickPlanRegionRestriction("none");
      setQuickPlanRegionName("");
      setCalendarViewYear(nextToday.getFullYear());
      setCalendarViewMonth(nextToday.getMonth());

      setHomePostType("feed");
      setHomePostScheduledDate("");
      setHomePostScheduledTime("");
      setHomePostPrompt("");
      setHomeDraftTitle("");
      setHomeDraftContent("");
      setHomeDraftHashtagsText("");
      setHomePostScheduledTime("");
      setHomeGeneratedCandidates([]);
      setHasAppliedHomeCandidate(false);
      setHomeImageContext("");
      setHomeSelectedProductId("");
      if (homeAttachedImage?.previewUrl) {
        URL.revokeObjectURL(homeAttachedImage.previewUrl);
      }
      setHomeAttachedImage(null);

      setWeeklyPlans(null);
      setHomeUnanalyzedPosts([]);
      setTomorrowPreparations([]);
      await fetchDashboard();
      toast.success("計画を完全リセットしました");
    } catch (error) {
      console.error("完全リセットエラー:", error);
      toast.error(error instanceof Error ? error.message : "計画のリセットに失敗しました");
    } finally {
      setIsResettingPlan(false);
      setIsResetConfirming(false);
    }
  };

  const focusHomePlanCard = () => {
    planCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setIsPlanCardHighlighted(true);
    window.setTimeout(() => setIsPlanCardHighlighted(false), 1200);
  };

  useEffect(() => {
    if (dashboardData?.currentPlan) {
      setShowHomePlanForm(false);
    }
  }, [dashboardData?.currentPlan]);

  const toggleDaySelection = (
    value: WeekDay,
    setter: React.Dispatch<React.SetStateAction<WeekDay[]>>
  ) => {
    setter((prev) => (prev.includes(value) ? prev.filter((day) => day !== value) : [...prev, value]));
  };

  const getPostTypesForCalendarDay = (dayLabel: WeekDay): Array<"feed" | "reel" | "story"> => {
    const types: Array<"feed" | "reel" | "story"> = [];
    if (quickPlanFeedDays.includes(dayLabel)) {types.push("feed");}
    if (quickPlanReelDays.includes(dayLabel)) {types.push("reel");}
    if (quickPlanStoryDays.includes(dayLabel)) {types.push("story");}
    return types;
  };

  const getDefaultTimeByType = (postType: "feed" | "reel" | "story"): string => {
    if (postType === "reel") {return "20:00";}
    if (postType === "story") {return "12:00";}
    return "19:00";
  };

  const pickDirection = (params: {
    purpose: string;
    postType: "feed" | "reel" | "story";
    dateIso: string;
    usedInDay: Set<string>;
  }): string => {
    const purposeKey = normalizePurposeKey(params.purpose);
    const candidates = DIRECTION_LIBRARY[purposeKey][params.postType];
    if (!candidates || candidates.length === 0) {return "投稿方針";}

    const date = new Date(params.dateIso);
    const daySeed = Number.isNaN(date.getTime()) ? 0 : date.getDate();
    const startIndex = daySeed % candidates.length;

    for (let i = 0; i < candidates.length; i += 1) {
      const next = candidates[(startIndex + i) % candidates.length];
      if (!params.usedInDay.has(next)) {return next;}
    }
    return candidates[startIndex] || candidates[0] || "投稿方針";
  };

  const generateMonthlyPlanFromAI = async (params: {
    planId: string;
    startDate: string;
    purpose: string;
  }) => {
    const runId = perfRunRef.current?.runId || null;
    const aiStartMs = performance.now();
    const parsedStartDate = new Date(params.startDate);
    if (Number.isNaN(parsedStartDate.getTime())) {return;}
    const startDateOnly = new Date(
      parsedStartDate.getFullYear(),
      parsedStartDate.getMonth(),
      parsedStartDate.getDate()
    );
    const endDateOnly = new Date(
      startDateOnly.getFullYear(),
      startDateOnly.getMonth() + 1,
      startDateOnly.getDate() - 1
    );

    const candidates: Array<{
      dateIso: string;
      dayLabel: WeekDay;
      postType: "feed" | "reel" | "story";
    }> = [];
    for (
      let cursor = new Date(startDateOnly);
      cursor <= endDateOnly;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
    ) {
      const dayLabel = WEEK_DAYS[cursor.getDay()];
      const postTypes = getPostTypesForCalendarDay(dayLabel);
      if (postTypes.length === 0) {continue;}
      postTypes.forEach((postType) => {
        candidates.push({
          dateIso: toLocalISODate(cursor),
          dayLabel,
          postType,
        });
      });
    }

    if (candidates.length === 0) {
      setMonthlyCalendarPlan([]);
      setSelectedCalendarDateIso(null);
      return;
    }

    setIsGeneratingMonthlyCalendarPlan(true);
    try {
      const activePurpose = String(dashboardData?.currentPlan?.operationPurpose || "").trim() || quickPlanPurpose;
      const usedDirectionsByDate = new Map<string, Set<string>>();
      const finalized: MonthlyCalendarPlanItem[] = candidates.map((candidate) => {
        const usedInDay = usedDirectionsByDate.get(candidate.dateIso) || new Set<string>();
        const direction = pickDirection({
          purpose: activePurpose,
          postType: candidate.postType,
          dateIso: candidate.dateIso,
          usedInDay,
        });
        usedInDay.add(direction);
        usedDirectionsByDate.set(candidate.dateIso, usedInDay);
        return {
          ...candidate,
          suggestedTime: getDefaultTimeByType(candidate.postType),
          title: direction,
          direction,
        };
      });

      setMonthlyCalendarPlan(finalized);
      setSelectedCalendarDateIso(finalized[0]?.dateIso || null);
      await saveMonthlyCalendarPlanToFirestore(params.planId, {
        startDate: params.startDate,
        endDate: toLocalISODate(endDateOnly),
        items: finalized,
      });
      if (runId && perfRunRef.current?.runId === runId) {
        perfRunRef.current.monthlyAiGenerateMs = performance.now() - aiStartMs;
        console.log(
          `[HomePerf] runId=${runId} monthly_ai_generate_ms=${perfRunRef.current.monthlyAiGenerateMs.toFixed(1)}`
        );
      }
      toast.success("1ヶ月分の投稿予定を生成しました");
    } catch (error) {
      console.error("月間カレンダー予定生成エラー:", error);
      toast.error(error instanceof Error ? error.message : "投稿予定の生成に失敗しました");
    } finally {
      setIsGeneratingMonthlyCalendarPlan(false);
    }
  };

  const handleCalendarDayClick = (day: number | null) => {
    if (!day) {return;}
    const clickedDate = new Date(calendarViewYear, calendarViewMonth, day);
    if (Number.isNaN(clickedDate.getTime())) {return;}
    const dateIso = toLocalISODate(clickedDate);
    const hasPlan = monthlyCalendarPlan.some((item) => item.dateIso === dateIso);
    if (!hasPlan) {return;}
    setSelectedCalendarDateIso(dateIso);
  };

  const handleCalendarPrevMonth = () => {
    if (calendarViewMonth === 0) {
      setCalendarViewYear((prev) => prev - 1);
      setCalendarViewMonth(11);
      return;
    }
    setCalendarViewMonth((prev) => prev - 1);
  };

  const handleCalendarNextMonth = () => {
    if (calendarViewMonth === 11) {
      setCalendarViewYear((prev) => prev + 1);
      setCalendarViewMonth(0);
      return;
    }
    setCalendarViewMonth((prev) => prev + 1);
  };

  const generatePostInHome = async () => {
    setIsGeneratingHomePost(true);
    setHomeRecommendedCandidateVariant(null);
    setHomeGenerationProgress({
      progress: 10,
      message: "初稿を作成中",
      subMessage: "パターンAを生成しています",
    });
    try {
      const requestHomePostGeneration = async (payload: Record<string, unknown>) => {
        let lastError: Error | null = null;
        let hadRetriableFailure = false;
        for (let attempt = 1; attempt <= 2; attempt += 1) {
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), 45000);
          try {
            const response = await authFetch("/api/home/post-generation", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
            const result = await response.json();
            if (!response.ok || !result?.success || !result?.data) {
              const message = String(result?.error || "投稿生成に失敗しました");
              const retriable = response.status >= 500 || response.status === 429;
              if (retriable && attempt < 2) {
                hadRetriableFailure = true;
                await new Promise((resolve) => window.setTimeout(resolve, 700));
                continue;
              }
              if (retriable) {
                hadRetriableFailure = true;
              }
              throw new Error(message);
            }
            return result;
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
              lastError = new Error("GENERATION_TIMEOUT");
              hadRetriableFailure = true;
            } else {
              lastError = error instanceof Error ? error : new Error("投稿生成に失敗しました");
            }
            if (/failed to fetch|network|timeout|fetch/i.test(lastError.message)) {
              hadRetriableFailure = true;
            }
            if (attempt < 2) {
              await new Promise((resolve) => window.setTimeout(resolve, 700));
              continue;
            }
          } finally {
            window.clearTimeout(timeoutId);
          }
        }
        if (lastError?.message === "GENERATION_TIMEOUT") {
          throw new Error("GENERATION_TIMEOUT");
        }
        if (hadRetriableFailure) {
          throw new Error("NETWORK_UNSTABLE");
        }
        throw lastError || new Error("投稿生成に失敗しました");
      };

      const fallbackPrompt = homeAttachedImage?.dataUrl
        ? "添付画像に合う投稿文"
        : "おまかせで投稿文を作成";
      const basePayload = {
        prompt: homePostPrompt.trim() || fallbackPrompt,
        postType: homePostType,
        scheduledDate: homePostScheduledDate || undefined,
        scheduledTime: homePostScheduledTime || undefined,
        imageData: homeAttachedImage?.dataUrl || undefined,
        imageContext: homeImageContext.trim() || undefined,
        forcedProductId: homeSelectedProductId || undefined,
        action: "generatePost" as const,
        autoGenerate: false,
        operationPurpose:
          String(dashboardData?.currentPlan?.operationPurpose || "").trim() || quickPlanPurpose,
        kpiFocus: getKpiFocusFromPurpose(
          String(dashboardData?.currentPlan?.operationPurpose || "").trim() || quickPlanPurpose
        ),
        targetAudience:
          String(dashboardData?.currentPlan?.targetAudience || "").trim() || quickPlanTargetAudience.trim(),
        regionRestriction:
          dashboardData?.currentPlan?.regionRestriction === "restricted" ? "restricted" : quickPlanRegionRestriction,
        regionName:
          String(dashboardData?.currentPlan?.regionName || "").trim() || quickPlanRegionName.trim(),
      };

      const randomResult = await requestHomePostGeneration({
          ...basePayload,
          generationVariant: "random",
      });

      const selectedProductId = String(randomResult?.data?.selectedProduct?.id || "").trim();
      const selectedKpiTag = String(randomResult?.data?.kpiTag || "").trim();
      setHomeGenerationProgress({
        progress: 55,
        message: "改善案を作成中",
        subMessage: "過去データを反映しています",
      });
      const adviceResult = await requestHomePostGeneration({
          ...basePayload,
          generationVariant: "advice",
          forcedProductId: selectedProductId || undefined,
          kpiFocus: selectedKpiTag || String(basePayload.kpiFocus || ""),
          avoidTitles: [String(randomResult?.data?.title || "").trim()].filter(Boolean),
      });

      setHomeGenerationProgress({
        progress: 85,
        message: "最終チェック中",
        subMessage: "表現を確認しています",
      });
      await new Promise((resolve) => window.setTimeout(resolve, 250));

      const toCandidate = (
        data: {
          title?: unknown;
          content?: unknown;
          hashtags?: unknown;
          suggestedTime?: unknown;
          postHints?: unknown;
          adviceReference?: { postId?: unknown; postTitle?: unknown; generatedAt?: unknown } | null;
        },
        variant: "random" | "advice",
        label: string
      ): HomeGeneratedCandidate => {
        const hashtagsText = Array.isArray(data?.hashtags)
          ? data.hashtags.map((tag: unknown) => String(tag).replace(/^#+/, "")).join(", ")
          : "";
        return {
          variant,
          label,
          title: String(data?.title || ""),
          content: String(data?.content || ""),
          hashtagsText,
          suggestedTime: data?.suggestedTime ? String(data.suggestedTime) : "",
          postHints: Array.isArray(data?.postHints)
            ? data.postHints.map((hint: unknown) => String(hint || "").trim()).filter(Boolean).slice(0, 3)
            : [],
          adviceReference: data?.adviceReference
            ? {
                postId: String(data.adviceReference.postId || ""),
                postTitle: String(data.adviceReference.postTitle || ""),
                generatedAt: String(data.adviceReference.generatedAt || ""),
              }
            : null,
        };
      };

      const candidates = [
        toCandidate(randomResult.data, "random", "パターンA ランダム生成"),
        toCandidate(adviceResult.data, "advice", "パターンB 分析アドバイス反映"),
      ];
      setHomeGeneratedCandidates(candidates);
      const recommendedCandidate =
        candidates[Math.floor(Math.random() * candidates.length)]?.variant ?? null;
      setHomeRecommendedCandidateVariant(recommendedCandidate);
      setHomeSelectedCandidateVariant(null);
      setHasAppliedHomeCandidate(false);
      setHomeDraftTitle("");
      setHomeDraftContent("");
      setHomeDraftHashtagsText("");
      setHomeGenerationProgress({
        progress: 100,
        message: "生成完了",
        subMessage: "2パターンを用意しました",
      });
      toast.success("投稿案を2パターン生成しました");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage === "GENERATION_TIMEOUT") {
        console.warn("ホーム投稿生成タイムアウト");
        toast.error("AI生成がタイムアウトしました。時間をおいて再試行してください。");
      } else if (
        errorMessage === "NETWORK_UNSTABLE" ||
        /failed to fetch|network|timeout|fetch/i.test(errorMessage)
      ) {
        console.warn("ホーム投稿生成ネットワーク不安定:", error);
        toast.error("ネットワークが不安定です。通信環境を確認して再試行してください。");
      } else {
        console.error("ホーム投稿生成エラー:", error);
        toast.error(errorMessage || "投稿生成に失敗しました");
      }
    } finally {
      setIsGeneratingHomePost(false);
      setTimeout(() => setHomeGenerationProgress(null), 250);
    }
  };

  const copyGeneratedPost = async () => {
    if (!homeDraftTitle.trim() && !homeDraftContent.trim() && !homeDraftHashtagsText.trim()) {
      toast.error("コピーする下書きがありません");
      return;
    }
    const hashtags = homeDraftHashtagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => `#${String(tag).replace(/^#+/, "")}`)
      .join(" ");
    const text = [
      homeDraftTitle.trim(),
      homeDraftContent.trim(),
      hashtags,
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      toast.success("投稿案をコピーしました");
    } catch (error) {
      console.error("投稿案コピーエラー:", error);
      toast.error("コピーに失敗しました");
    }
  };

  const getAdvisorInitialMessage = () => `こんにちは${userName}さん\nどのようなことでお困りですか？`;
  const advisorInitialQuestions = ["画像作成のコツを教えて", "動画作成のコツを教えて"];
  const advisorModeQuestions = ["投稿文章から作成します", "既存の商品から作成"];
  const advisorFollowupQuestions = ["別トーンでもう1案ください", "他の相談もする"];

  const normalizeAdvisorQuestions = (input: unknown): string[] =>
    Array.isArray(input)
      ? input.map((v) => String(v || "").trim()).filter(Boolean).slice(0, 3)
      : [];

  const isImageProposalReply = (text: string): boolean => {
    const normalized = String(text || "");
    return (
      /向けの画像案を1つ提案します。/.test(normalized) ||
      (normalized.includes("画像の方向性:") &&
        normalized.includes("構図:") &&
        normalized.includes("色味・雰囲気:") &&
        normalized.includes("画像内テキスト案:"))
    );
  };

  const isVideoProposalReply = (text: string): boolean => {
    const normalized = String(text || "");
    return (
      normalized.includes("動画の方向性") &&
      normalized.includes("動画構成(起承転結的な)") &&
      normalized.includes("冒頭3秒の見せ方") &&
      normalized.includes("撮影時のコツ")
    );
  };

  const resetAdvisorFlow = () => {
    setAdvisorIntent("image-fit");
    setAdvisorSource("undecided");
    setAdvisorPostType("feed");
    setSelectedAdvisorProductId("");
    setAdvisorProductConfigured(false);
    setAdvisorMessages([
      {
        id: `advisor-initial-${Date.now()}`,
        role: "assistant",
        text: getAdvisorInitialMessage(),
      },
    ]);
    setAdvisorSuggestedQuestions(advisorInitialQuestions);
  };

  const appendAdvisorAssistantMessage = (text: string, questions: string[]) => {
    setAdvisorMessages((prev) => [
      ...prev,
      {
        id: `advisor-assistant-${Date.now()}`,
        role: "assistant",
        text,
      },
    ]);
    setAdvisorSuggestedQuestions(questions);
  };

  const sendAdvisorMessage = async (
    rawMessage: string,
    options?: {
      forceAdvisorProductConfigured?: boolean;
      overrideAdvisorIntent?: AdvisorIntent;
      overrideAdvisorSource?: AdvisorSource;
    }
  ) => {
    const message = rawMessage.trim();
    if (!message || isAdvisorLoading) {return;}

    if (message === "他の相談もする") {
      resetAdvisorFlow();
      return;
    }

    if (message === "画像作成のコツを教えて") {
      setAdvisorIntent("image-fit");
      setAdvisorSource("undecided");
      setAdvisorProductConfigured(false);
      appendAdvisorAssistantMessage(
        "画像作成のコツについてのご相談ですね！次に、作成方法を選んでください。",
        advisorModeQuestions
      );
      return;
    }

    if (message === "動画作成のコツを教えて") {
      setAdvisorIntent("video-idea");
      setAdvisorSource("undecided");
      setAdvisorProductConfigured(false);
      appendAdvisorAssistantMessage(
        "動画作成のコツについてのご相談ですね！次に、作成方法を選んでください。",
        advisorModeQuestions
      );
      return;
    }

    if (message === "投稿文章から作成します") {
      setAdvisorSource("draft");
      setAdvisorProductConfigured(true);
      appendAdvisorAssistantMessage(
        "投稿文章から作成します。投稿文章があれば、そのままテキスト欄に入力して送信してください。",
        []
      );
      return;
    }

    if (message === "既存の商品から作成") {
      setAdvisorSource("product");
      setAdvisorProductConfigured(false);
      appendAdvisorAssistantMessage(
        "既存の商品からの作成ですね！投稿タイプと商品・サービスを選んで、「この条件で提案」を押してください。",
        []
      );
      return;
    }

    const userMessage: HomeAdvisorMessage = {
      id: `advisor-user-${Date.now()}`,
      role: "user",
      text: message,
    };
    setAdvisorMessages((prev) => [...prev, userMessage]);
    setAdvisorInput("");
    setAdvisorSuggestedQuestions([]);
    setIsAdvisorLoading(true);

    try {
      const response = await authFetch("/api/home/advisor-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          context: {
            selectedProductId: homeSelectedProductId || undefined,
            selectedProductName: selectedProductName || undefined,
            postType: advisorPostType,
            draftTitle: homeDraftTitle.trim() || undefined,
            draftContent: homeDraftContent.trim() || undefined,
            imageAttached: Boolean(homeAttachedImage),
            advisorIntent: options?.overrideAdvisorIntent || advisorIntent,
            advisorSource: options?.overrideAdvisorSource || advisorSource,
            advisorPostType: advisorPostType,
            selectedAdvisorProductId: selectedAdvisorProductId || undefined,
            advisorProductId: selectedAdvisorProductId || undefined,
            advisorProductName: selectedAdvisorProductName || undefined,
            advisorProductConfigured: options?.forceAdvisorProductConfigured ?? advisorProductConfigured,
          },
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success || !result?.data?.reply) {
        throw new Error(result?.error || "チャット応答の取得に失敗しました");
      }

      const assistantMessage: HomeAdvisorMessage = {
        id: `advisor-assistant-${Date.now()}`,
        role: "assistant",
        text: String(result.data.reply),
      };
      setAdvisorMessages((prev) => [...prev, assistantMessage]);
      const nextSuggestedQuestions = normalizeAdvisorQuestions(result.data.suggestedQuestions);
      const isImageReply = isImageProposalReply(assistantMessage.text);
      const isVideoReply = isVideoProposalReply(assistantMessage.text);
      if (isImageReply || isVideoReply) {
        setAdvisorProductConfigured(true);
        setAdvisorSuggestedQuestions(advisorFollowupQuestions);
      } else {
        setAdvisorSuggestedQuestions(nextSuggestedQuestions);
      }
    } catch (error) {
      console.error("ホーム相談チャットエラー:", error);
      setAdvisorMessages((prev) => [
        ...prev,
        {
          id: `advisor-error-${Date.now()}`,
          role: "assistant",
          text: "応答に失敗しました。もう一度送信してください。",
        },
      ]);
    } finally {
      setIsAdvisorLoading(false);
    }
  };

  const applyGeneratedCandidate = (candidate: HomeGeneratedCandidate) => {
    setHomeDraftTitle(candidate.title);
    setHomeDraftContent(candidate.content);
    setHomeDraftHashtagsText(candidate.hashtagsText);
    if (candidate.suggestedTime) {
      setHomePostScheduledTime(candidate.suggestedTime);
    }
    setHasAppliedHomeCandidate(true);
    setHomeSelectedCandidateVariant(candidate.variant);
    toast.success("選択した候補を反映しました");
  };

  const handleHomeImageChange = async (file: File | null) => {
    if (!file) {return;}
    try {
      if (homeAttachedImage?.previewUrl) {
        URL.revokeObjectURL(homeAttachedImage.previewUrl);
      }
      const previewUrl = URL.createObjectURL(file);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
        reader.readAsDataURL(file);
      });
      setHomeAttachedImage({ name: file.name, previewUrl, dataUrl });
    } catch (error) {
      console.error("画像読み込みエラー:", error);
      toast.error("画像の読み込みに失敗しました");
    }
  };

  const saveHomeDraft = async () => {
    if (!homeDraftContent.trim()) {
      toast.error("保存する本文を入力してください");
      return;
    }

    setIsSavingHomeDraft(true);
    try {
      const hashtags = homeDraftHashtagsText
        .split(",")
        .map((tag) => tag.trim().replace(/^#+/, ""))
        .filter(Boolean);

      const rawImageData = homeAttachedImage?.dataUrl || null;
      const imageDataBytes = rawImageData ? new Blob([rawImageData]).size : 0;
      const imageDataForSave =
        rawImageData && imageDataBytes <= HOME_DRAFT_IMAGE_DATA_MAX_BYTES ? rawImageData : null;
      if (rawImageData && !imageDataForSave) {
        toast("画像サイズが大きすぎるため、画像なしで保存します。", { icon: "⚠️" });
      }

      const fallbackTitle = homeDraftContent.trim().slice(0, 30);
      const resolvedScheduledTime = homePostScheduledTime || pickRandomBusinessHourTime();
      if (!homePostScheduledTime) {
        setHomePostScheduledTime(resolvedScheduledTime);
      }
      const response = await authFetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: homeDraftTitle.trim() || fallbackTitle || "ホーム投稿下書き",
          content: homeDraftContent.trim(),
          hashtags,
          postType: homePostType,
          scheduledDate: homePostScheduledDate || undefined,
          scheduledTime: resolvedScheduledTime,
          status: "created",
          imageUrl: null,
          imageData: imageDataForSave,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result?.code === "IMAGE_DATA_TOO_LARGE") {
          throw new Error("画像サイズが大きすぎるため保存できませんでした。画像を小さくして再試行してください。");
        }
        throw new Error(result?.error || "下書き保存に失敗しました");
      }

      toast.success("作成済みとして保存しました");
    } catch (error) {
      console.error("ホーム下書き保存エラー:", error);
      toast.error(error instanceof Error ? error.message : "下書き保存に失敗しました");
    } finally {
      setIsSavingHomeDraft(false);
    }
  };

  useEffect(() => {
    return () => {
      if (homeAttachedImage?.previewUrl) {
        URL.revokeObjectURL(homeAttachedImage.previewUrl);
      }
    };
  }, [homeAttachedImage]);

  // 計画削除を検知してデータを再取得（ページフォーカス時）
  // 注意: 頻繁なリロードを避けるため、フォーカスイベントでの自動リロードは無効化
  // useEffect(() => {
  //   const handleFocus = () => {
  //     // ページがフォーカスされたときにデータを再取得
  //     fetchDashboard();
  //     fetchOtherKPI();
  //   };

  //   window.addEventListener("focus", handleFocus);
  //   return () => window.removeEventListener("focus", handleFocus);
  // }, []);

  // 初回ロード時にKPIデータを取得
  useEffect(() => {
    if (user) {
      fetchMonthlyKPIs();
    }
  }, [user]);

  // 今月のKPIデータを取得
  const fetchMonthlyKPIs = async () => {
    try {
      setIsLoadingMonthlyKPIs(true);
      const response = await authFetch("/api/home/monthly-kpis");
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setMonthlyKPIs(result.data);
        }
      } else {
        console.error("今月のKPIデータ取得エラー:", response.status);
      }
    } catch (error) {
      console.error("今月のKPIデータ取得エラー:", error);
    } finally {
      setIsLoadingMonthlyKPIs(false);
    }
  };


  // 今月の成果データ（月単位のKPIデータから取得）
  const monthlyResults: MonthlyResult[] = monthlyKPIs
    ? [
        {
          metric: "いいね数",
          value: monthlyKPIs.thisMonth.likes || 0,
          change: monthlyKPIs.changes?.likes,
          icon: "🩷",
        },
        {
          metric: "コメント数",
          value: monthlyKPIs.thisMonth.comments || 0,
          change: monthlyKPIs.changes?.comments,
          icon: "💬",
        },
        {
          metric: "シェア数",
          value: Number(monthlyKPIs.thisMonth.shares || 0),
          change: monthlyKPIs.changes?.shares,
          icon: "📤",
        },
        {
          metric: "リポスト数",
          value: Number(monthlyKPIs.thisMonth.reposts || 0),
          change: monthlyKPIs.changes?.reposts,
          icon: "🔁",
        },
        {
          metric: "保存数",
          value: Number(monthlyKPIs.thisMonth.saves || 0),
          change: monthlyKPIs.changes?.saves,
          icon: "💾",
        },
        {
          metric: "フォロワー増加数",
          value: Number(monthlyKPIs.thisMonth.followerIncrease || 0),
          change: monthlyKPIs.changes?.followerIncrease,
          icon: "📈",
        },
      ]
    : [
        { metric: "いいね数", value: 0, change: undefined, icon: "🩷" },
        { metric: "コメント数", value: 0, change: undefined, icon: "💬" },
        { metric: "シェア数", value: 0, change: undefined, icon: "📤" },
        { metric: "リポスト数", value: 0, change: undefined, icon: "🔁" },
        { metric: "保存数", value: 0, change: undefined, icon: "💾" },
        { metric: "フォロワー増加数", value: 0, change: undefined, icon: "📈" },
      ];

  const firstDayOfMonth = new Date(calendarViewYear, calendarViewMonth, 1).getDay();
  const daysInMonth = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();
  const calendarCells: Array<number | null> = [
    ...Array.from({ length: firstDayOfMonth }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const planStartDateObj = new Date(quickPlanStartDate);
  const planStartDateOnly = !Number.isNaN(planStartDateObj.getTime())
    ? new Date(planStartDateObj.getFullYear(), planStartDateObj.getMonth(), planStartDateObj.getDate())
    : null;
  const planEndDateOnly = planStartDateOnly
    ? new Date(planStartDateOnly.getFullYear(), planStartDateOnly.getMonth() + 1, planStartDateOnly.getDate() - 1)
    : null;

  const scheduledDays = new Set<number>(
    (weeklyPlans?.currentWeekPlan?.feedPosts || [])
      .map((post) => {
        const raw = String(post.date || "").trim();
        if (!raw) {return null;}
        const dateObj = /^\d{4}-\d{2}-\d{2}$/.test(raw)
          ? new Date(raw)
          : raw.includes("/")
            ? new Date(`${calendarViewYear}/${raw}`)
            : null;
        if (!dateObj || Number.isNaN(dateObj.getTime())) {return null;}
        const normalizedDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
        if (normalizedDate.getFullYear() !== calendarViewYear || normalizedDate.getMonth() !== calendarViewMonth) {
          return null;
        }
        if (planStartDateOnly && normalizedDate < planStartDateOnly) {
          return null;
        }
        if (planEndDateOnly && normalizedDate > planEndDateOnly) {
          return null;
        }
        return normalizedDate.getDate();
      })
      .filter((day): day is number => typeof day === "number")
  );

  const selectedWeekDays = new Set<WeekDay>([
    ...quickPlanFeedDays,
    ...quickPlanReelDays,
    ...quickPlanStoryDays,
  ]);
  const selectedWeekPatternDays = new Set<number>(
    isWeeklyPlanMarkedOnCalendar
      ? Array.from({ length: daysInMonth }, (_, idx) => idx + 1).filter((day) => {
          const targetDate = new Date(calendarViewYear, calendarViewMonth, day);
          const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
          if (planStartDateOnly && targetDateOnly < planStartDateOnly) {
            return false;
          }
          if (planEndDateOnly && targetDateOnly > planEndDateOnly) {
            return false;
          }
          const dayLabel = WEEK_DAYS[targetDate.getDay()];
          return selectedWeekDays.has(dayLabel);
        })
      : []
  );
  const generatedPlanDays = new Set<number>(
    monthlyCalendarPlan
      .map((item) => new Date(item.dateIso))
      .filter((date) => !Number.isNaN(date.getTime()))
      .filter((date) => date.getFullYear() === calendarViewYear && date.getMonth() === calendarViewMonth)
      .map((date) => date.getDate())
  );
  const markedDays =
    monthlyCalendarPlan.length > 0
      ? generatedPlanDays
      : new Set<number>([...scheduledDays, ...selectedWeekPatternDays]);

  const normalizeTimeToHHmm = (value?: string): string => {
    const raw = String(value || "").trim();
    if (!raw || raw === "--:--") {return "--:--";}

    const hhmm = raw.match(/(\d{1,2}):(\d{2})/);
    if (hhmm) {
      return `${hhmm[1].padStart(2, "0")}:${hhmm[2]}`;
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }

    return raw;
  };
  const getTimelineTypeLabel = (type?: string) => {
    if (type === "reel") {return "リール";}
    if (type === "story") {return "ストーリー";}
    return "フィード";
  };
  const getDirectionLabel = (value?: string): string => String(value || "").trim().replace(/系$/, "") || "商品紹介";
  const getDirectionGuideSteps = (directionRaw: string, type: "feed" | "reel" | "story"): string[] => {
    const direction = getDirectionLabel(directionRaw);
    if (direction.includes("比較")) {
      return [
        "1枚目: 比較軸を明記（例: 価格/使いやすさ/効果）",
        "2-3枚目: 2つの違いを図で見せる",
        "最後: どんな人に向くかを1文で結論",
      ];
    }
    if (direction.includes("商品紹介")) {
      return [
        "1枚目: 商品名+ベネフィットを大きく表示",
        "2枚目: 特徴を3つだけ箇条書き",
        "最後: 保存/プロフィール誘導を入れる",
      ];
    }
    if (direction.includes("活用シーン")) {
      return [
        "1枚目: 使う場面を具体的に提示",
        "2枚目: 使い方手順を短く見せる",
        "最後: 真似しやすい一言CTAを入れる",
      ];
    }
    if (direction.includes("Q&A")) {
      return [
        "1つ目: よくある質問をそのまま載せる",
        "2つ目: 回答を結論→理由の順で書く",
        "最後: 次に聞きたい質問を募集する",
      ];
    }
    if (direction.includes("質問募集")) {
      return [
        "質問は2択か3択で答えやすくする",
        "回答期限を当日中に設定する",
        "回答後のフォロー投稿を予告する",
      ];
    }
    if (direction.includes("ブランド")) {
      return [
        "1枚目: ブランドの価値観を一文で表示",
        "2枚目: 価値観が伝わる具体エピソード",
        "最後: 共感コメントを促す質問を置く",
      ];
    }
    if (direction.includes("レビュー")) {
      return [
        "冒頭: 使用前の悩みを先に提示",
        "中盤: 使用後の変化を具体的に示す",
        "最後: 同じ悩みの人向けにCTAを入れる",
      ];
    }
    if (direction.includes("導入事例")) {
      return [
        "事例の前提条件を最初に明記",
        "導入後の変化を数字で1つ示す",
        "再現ポイントを3つに絞って載せる",
      ];
    }
    if (direction.includes("社員") || direction.includes("社風") || direction.includes("働")) {
      return [
        "1枚目: 仕事内容を一言で示す",
        "2枚目: チームの雰囲気が伝わる写真/動画",
        "最後: 応募前に聞きたいことを促す",
      ];
    }
    if (type === "reel") {
      return [
        "冒頭3秒でテーマを明言する",
        "1カット1メッセージでテンポを保つ",
        "最後に保存/フォローCTAを入れる",
      ];
    }
    if (type === "story") {
      return [
        "1枚目で問いかけを置く",
        "2枚目で回答しやすい選択肢を出す",
        "3枚目で次アクションを案内する",
      ];
    }
    return [
      "1枚目で結論を先に見せる",
      "2枚目で理由を3点に絞る",
      "最後に保存したくなる一言を入れる",
    ];
  };
  const getShortGuideText = (directionRaw: string, type: "feed" | "reel" | "story"): string => {
    const firstStep = getDirectionGuideSteps(directionRaw, type)[0] || "";
    return firstStep.replace(/^(?:\d+枚目|\d+つ目|冒頭|中盤|最後)\s*:\s*/, "");
  };
  const getTimelineTypeBadgeClass = (type?: string): string => {
    if (type === "reel") {return "border-transparent bg-gradient-to-r from-[#4486ff] to-[#70c8ff] text-white font-bold";}
    if (type === "story") {return "border-transparent bg-gradient-to-r from-[#f4b400] to-[#ffcc33] text-white font-bold";}
    return "border-transparent bg-gradient-to-r from-[#ea6868] to-[#dc3131] text-white font-bold";
  };
  const getTimeSortValue = (time: string): number => {
    const normalized = normalizeTimeToHHmm(time);
    if (normalized === "--:--") {return Number.MAX_SAFE_INTEGER;}
    const [hourStr, minuteStr] = normalized.split(":");
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    if (Number.isNaN(hour) || Number.isNaN(minute)) {return Number.MAX_SAFE_INTEGER;}
    return hour * 60 + minute;
  };
  const formatIsoToDateLabel = (iso: string): string => {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {return "--/--";}
    return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
  };
  const timelineBaseItems: EditableTimelineItem[] = React.useMemo(
    () =>
      monthlyCalendarPlan.map((item) => ({
        key: `${item.dateIso}|${item.postType}|${item.suggestedTime}|${item.direction || item.title}|${item.hook || ""}`,
        dayLabel: item.dayLabel,
        dateLabel: formatIsoToDateLabel(item.dateIso),
        dateIso: item.dateIso,
        time: normalizeTimeToHHmm(item.suggestedTime),
        label: item.direction || item.title,
        type: item.postType,
        direction: item.direction || item.title,
        hook: item.hook,
      })),
    [monthlyCalendarPlan]
  );
  const timelineSourceSignature = monthlyCalendarPlan
    .map((item) => `${item.dateIso}|${item.postType}|${item.suggestedTime}|${item.direction || item.title}|${item.hook || ""}`)
    .join("||");

  useEffect(() => {
    setEditableTimelineItems(timelineBaseItems);
    setEditingTimelineKey(null);
  }, [timelineBaseItems, timelineSourceSignature]);

  const toMonthlyPlanItemsFromEditable = (items: EditableTimelineItem[]): MonthlyCalendarPlanItem[] => {
    const typeOrder: Record<EditableTimelineItem["type"], number> = {
      feed: 0,
      reel: 1,
      story: 2,
    };
    return [...items]
      .map((item) => ({
        dateIso: item.dateIso,
        dayLabel: item.dayLabel,
        postType: item.type,
        suggestedTime: normalizeTimeToHHmm(item.time),
        title: item.direction || item.label,
        direction: item.direction || item.label,
        hook: item.hook,
      }))
      .sort((a, b) => {
        const dateDiff = new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime();
        if (dateDiff !== 0) {return dateDiff;}
        const timeDiff = getTimeSortValue(a.suggestedTime) - getTimeSortValue(b.suggestedTime);
        if (timeDiff !== 0) {return timeDiff;}
        return (typeOrder[a.postType] || 0) - (typeOrder[b.postType] || 0);
      });
  };

  const persistEditableTimelineItems = async (items: EditableTimelineItem[]) => {
    setEditableTimelineItems(items);
    const monthlyItems = toMonthlyPlanItemsFromEditable(items);
    setMonthlyCalendarPlan(monthlyItems);
    setSelectedCalendarDateIso((prev) => {
      if (prev && monthlyItems.some((row) => row.dateIso === prev)) {return prev;}
      return monthlyItems[0]?.dateIso || null;
    });
    setIsWeeklyPlanMarkedOnCalendar(monthlyItems.length > 0);

    const planId = typeof dashboardData?.currentPlan?.id === "string" ? dashboardData.currentPlan.id : "";
    if (!planId) {return;}

    const parsedStartDate = new Date(quickPlanStartDate);
    if (Number.isNaN(parsedStartDate.getTime())) {return;}
    const startDateOnly = new Date(
      parsedStartDate.getFullYear(),
      parsedStartDate.getMonth(),
      parsedStartDate.getDate()
    );
    const endDateOnly = new Date(
      startDateOnly.getFullYear(),
      startDateOnly.getMonth() + 1,
      startDateOnly.getDate() - 1
    );

    await saveMonthlyCalendarPlanToFirestore(planId, {
      startDate: toLocalISODate(startDateOnly),
      endDate: toLocalISODate(endDateOnly),
      items: monthlyItems,
    });
  };

  const handleStartEditTimeline = (item: EditableTimelineItem) => {
    setEditingTimelineKey(item.key);
    setTimelineEditDraft({
      dateIso: item.dateIso || toLocalISODate(new Date()),
      type: item.type,
    });
  };

  const handleApplyTimelineEdit = async (itemKey: string) => {
    if (!timelineEditDraft.dateIso) {
      toast.error("投稿日を選択してください");
      return;
    }
    const parsed = new Date(timelineEditDraft.dateIso);
    if (Number.isNaN(parsed.getTime())) {
      toast.error("投稿日が不正です");
      return;
    }
    const parsedDateOnly = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    if (planStartDateOnly && parsedDateOnly < planStartDateOnly) {
      toast.error("計画開始日より前には変更できません");
      return;
    }
    if (planEndDateOnly && parsedDateOnly > planEndDateOnly) {
      toast.error("計画期間を超える日付には変更できません");
      return;
    }

    const nextDayLabel = WEEK_DAYS[parsed.getDay()];
    const nextItems = editableTimelineItems.map((item) =>
      item.key === itemKey
        ? {
            ...item,
            dateIso: timelineEditDraft.dateIso,
            dateLabel: formatIsoToDateLabel(timelineEditDraft.dateIso),
            dayLabel: nextDayLabel,
            type: timelineEditDraft.type,
          }
        : item
    );

    try {
      await persistEditableTimelineItems(nextItems);
      setEditingTimelineKey(null);
      toast.success("予定を更新しました");
    } catch (error) {
      console.error("タイムライン更新保存エラー:", error);
      toast.error(error instanceof Error ? error.message : "予定の保存に失敗しました");
    }
  };

  const handleGeneratePostFromTimelineItem = async (item: EditableTimelineItem) => {
    setGeneratingTimelinePostKey(item.key);
    try {
      const activePurpose = String(dashboardData?.currentPlan?.operationPurpose || "").trim() || quickPlanPurpose;
      const directionText = String(item.direction || item.label || "").trim() || "投稿方針";
      const hookText = String(item.hook || "").trim();
      const primaryGuide = getShortGuideText(directionText, item.type).trim();
      const emphasisText = hookText || primaryGuide;
      const promptText = emphasisText
        ? `${activePurpose}向けの${directionText}。特に${emphasisText}`
        : `${activePurpose}向けの${directionText}`;
      const response = await authFetch("/api/home/post-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          postType: item.type,
          scheduledDate: item.dateIso || undefined,
          scheduledTime: item.time !== "--:--" ? item.time : undefined,
          action: "generatePost",
          operationPurpose: activePurpose,
          kpiFocus: getKpiFocusFromPurpose(
            activePurpose
          ),
          targetAudience:
            String(dashboardData?.currentPlan?.targetAudience || "").trim() || quickPlanTargetAudience.trim(),
          regionRestriction:
            dashboardData?.currentPlan?.regionRestriction === "restricted" ? "restricted" : quickPlanRegionRestriction,
          regionName:
            String(dashboardData?.currentPlan?.regionName || "").trim() || quickPlanRegionName.trim(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success || !result?.data) {
        throw new Error(result?.error || "投稿文生成に失敗しました");
      }

      setHomePostType(item.type);
      if (item.dateIso) {setHomePostScheduledDate(item.dateIso);}
      if (item.time !== "--:--") {setHomePostScheduledTime(item.time);}
      setHomePostPrompt(promptText);
      setHomeDraftTitle(String(result.data.title || directionText || ""));
      setHomeDraftContent(String(result.data.content || ""));
      setHomeDraftHashtagsText(
        Array.isArray(result.data.hashtags)
          ? result.data.hashtags.map((tag: unknown) => String(tag).replace(/^#+/, "")).join(", ")
          : ""
      );
      setHomePostScheduledTime(result.data.suggestedTime ? String(result.data.suggestedTime) : "");
      setHasAppliedHomeCandidate(true);
      postComposerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      toast.success("投稿文を生成しました");
    } catch (error) {
      console.error("タイムライン投稿文生成エラー:", error);
      toast.error(error instanceof Error ? error.message : "投稿文生成に失敗しました");
    } finally {
      setGeneratingTimelinePostKey(null);
    }
  };

  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const rollingTimelineDates = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(todayDateOnly.getFullYear(), todayDateOnly.getMonth(), todayDateOnly.getDate() + index);
    return {
      dateIso: toLocalISODate(date),
      dayLabel: WEEK_DAYS[date.getDay()],
      dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
      isToday: index === 0,
    };
  });
  const rollingTimelineRows = rollingTimelineDates.map((day) => ({
    dayLabel: day.dayLabel,
    dateIso: day.dateIso,
    dateLabel: day.dateLabel,
    isToday: day.isToday,
    items: editableTimelineItems
      .filter((item) => item.dateIso === day.dateIso)
      .sort((a, b) => getTimeSortValue(a.time) - getTimeSortValue(b.time)),
  }));
  const timelineTotalCount = rollingTimelineRows.reduce((sum, row) => sum + row.items.length, 0);
  const tomorrowDateOnly = new Date(
    todayDateOnly.getFullYear(),
    todayDateOnly.getMonth(),
    todayDateOnly.getDate() + 1
  );
  const tomorrowIso = toLocalISODate(tomorrowDateOnly);
  const hasCalendarPlan = monthlyCalendarPlan.length > 0;
  const timelineTomorrowItems = editableTimelineItems.filter((item) => item.dateIso === tomorrowIso);
  const syncedTomorrowPreparations = timelineTomorrowItems.map((item) => ({
    type: item.type,
    description: item.label,
    preparation: `${normalizeTimeToHHmm(item.time) !== "--:--" ? normalizeTimeToHHmm(item.time) : "時間未設定"}に向けて投稿準備`,
  }));
  const visibleTomorrowPreparations = hasCalendarPlan ? syncedTomorrowPreparations : tomorrowPreparations;
  const isLoadingTomorrowPreparations = !hasCalendarPlan && isLoadingTodayTasks;

  const PLAN_GATE_MS = 20_000;
  const CALENDAR_GATE_MS = 52_000;
  const WEEKLY_GATE_MS = 70_000;
  const guidedElapsedMs = guidedFlowStartMs !== null ? Math.max(0, guidedFlowNowMs - guidedFlowStartMs) : 0;
  const planGateProgress = Math.min(100, (guidedElapsedMs / PLAN_GATE_MS) * 100);
  const calendarGateProgress = Math.min(100, (guidedElapsedMs / CALENDAR_GATE_MS) * 100);
  const weeklyGateProgress = Math.min(100, (guidedElapsedMs / WEEKLY_GATE_MS) * 100);
  const showPlanGateLoader = guidedFlowStartMs !== null && guidedElapsedMs < PLAN_GATE_MS;
  const showCalendarGateLoader = guidedFlowStartMs !== null && guidedElapsedMs < CALENDAR_GATE_MS;
  const showWeeklyGateLoader = guidedFlowStartMs !== null && guidedElapsedMs < WEEKLY_GATE_MS;
  const showAdvisorProductConfigCard = advisorSource === "product" && !advisorProductConfigured;
  const advisorInputDisabled = isAdvisorLoading || showAdvisorProductConfigCard;
  const advisorInputPlaceholder =
    advisorSource === "draft"
      ? "投稿文章を入力して送信してください"
      : showAdvisorProductConfigCard
        ? "吹き出し内で投稿タイプと商品・サービスを設定してください"
        : "相談内容を入力してください";
  const monthlyFocusHeadlineRaw = String(
    monthlyActionFocus?.action || monthlyActionFocus?.description || monthlyActionFocus?.title || ""
  ).trim();
  const monthlyFocusHeadline = monthlyFocusHeadlineRaw.replace(/^実行手順:\s*/u, "").trim();
  const monthlyFocusHasContent = monthlyFocusHeadline.length > 0;
  const monthlyFocusStatus = monthlyActionFocus?.evaluation?.status || "no_data";
  const monthlyFocusStatusLabel =
    monthlyFocusStatus === "achieved" ? "達成" : monthlyFocusStatus === "not_achieved" ? "未達" : "判定不可";
  const monthlyFocusStatusClass =
    monthlyFocusStatus === "achieved"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : monthlyFocusStatus === "not_achieved"
        ? "bg-orange-50 text-orange-700 border-orange-200"
        : "bg-gray-50 text-gray-600 border-gray-200";

  const renderGateLoader = (params: {
    message: string;
    subMessage: string;
    progress: number;
  }) => <BotStatusCard title={params.message} subtitle={params.subMessage} progress={params.progress} />;

  const renderHomeGenerationLoader = (params: {
    message: string;
    subMessage: string;
    progress: number;
  }) => <BotStatusCard title={params.message} subtitle={params.subMessage} progress={params.progress} />;

  useEffect(() => {
    const perf = perfRunRef.current;
    if (!perf || perf.weeklyPlanVisibleMs !== undefined) {return;}
    if (timelineTotalCount <= 0) {return;}

    perf.weeklyPlanVisibleMs = performance.now() - perf.startedAtMs;
    console.log(
      `[HomePerf] runId=${perf.runId} weekly_plan_visible_ms=${perf.weeklyPlanVisibleMs.toFixed(1)}`
    );
    console.log(
      `[HomePerf] summary runId=${perf.runId} plan_save_ms=${(perf.planSaveMs ?? 0).toFixed(1)} monthly_ai_generate_ms=${(perf.monthlyAiGenerateMs ?? 0).toFixed(1)} weekly_plan_visible_ms=${(perf.weeklyPlanVisibleMs ?? 0).toFixed(1)}`
    );
  }, [timelineTotalCount]);

  useEffect(() => {
    if (guidedFlowStartMs === null) {return;}
    if (guidedElapsedMs < WEEKLY_GATE_MS) {return;}
    setGuidedFlowStartMs(null);
  }, [guidedElapsedMs, guidedFlowStartMs]);

  return (
    <SNSLayout customTitle="ダッシュボード" customDescription="運用計画・投稿文生成・今月の成果をひと目で確認">
      <div className="w-full px-4 sm:px-6 md:px-8 py-6 bg-gray-50 min-h-screen">
        {/* 挨拶セクション */}
        <div className="mb-6">
          <h1 className="text-2xl font-light text-gray-900 mb-1">
            <span className="inline-block animate-fade-in-up" style={{ animationDelay: '0s' }}>こんにちは </span>
            <span className="inline-block animate-fade-in-up" style={{ animationDelay: '0.3s' }}>{userName}</span>
            <span className="inline-block animate-fade-in-up" style={{ animationDelay: '0.4s' }}>さん</span>
          </h1>
        </div>

        <div className="mb-6 border border-orange-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-orange-200 bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3">
            <h2 className="text-sm font-semibold tracking-[0.08em] text-white">今月の重点テーマ</h2>
          </div>
          <div className="px-5 py-4 space-y-2">
            {isLoadingMonthlyActionFocus ? (
              <p className="text-sm text-gray-500">読み込み中...</p>
            ) : monthlyFocusHasContent ? (
              <>
                <p className="text-sm text-gray-900">{monthlyFocusHeadline}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center border px-2.5 py-1 text-xs font-medium ${monthlyFocusStatusClass}`}>
                    {monthlyFocusStatusLabel}
                  </span>
                  <span className="text-xs text-gray-600">
                    {monthlyActionFocus?.evaluation?.summary || "先月施策Aは判定不可（データ不足）"}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-600">今月の振り返りを生成してください</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:[grid-template-columns:minmax(0,1fr)_420px] gap-6 items-start">
          <div className="min-w-0 space-y-6">
            {/* 重点方針バナー（今月または来月） */}
            {aiDirection && aiDirection.lockedAt && aiDirection.mainTheme && (() => {
              const now = new Date();
              const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
              const isCurrentMonth = aiDirection.month === currentMonth;
              const monthLabel = isCurrentMonth ? "今月" : "来月";
              
              return (
                <div className="bg-white border-2 border-gray-200 p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Target className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-base font-bold text-gray-900">
                          {monthLabel}の重点方針
                        </h2>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 font-medium">
                          {aiDirection.month.split("-")[0]}年{parseInt(aiDirection.month.split("-")[1])}月
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed mb-3">
                        {removeMarkdown(aiDirection.mainTheme)}
                      </p>
                      <button
                        onClick={() => router.push("/instagram/report")}
                        className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors underline"
                      >
                        月次レポートを見る →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 今月の成果 */}
            {(monthlyKPIs || isLoadingMonthlyKPIs) && (
              <div className="bg-white border border-gray-200 p-6">
                <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
                  <span>📊</span>
                  今月の成果
                </h2>
                {isLoadingMonthlyKPIs ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="border border-gray-200  p-4">
                        <SkeletonLoader height="1rem" width="40%" className="mb-2" />
                        <SkeletonLoader height="2rem" width="60%" className="mb-2" />
                        <SkeletonLoader height="0.75rem" width="50%" />
                      </div>
                    ))}
                  </div>
                ) : monthlyResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {monthlyResults.map((result, index) => (
                    <div key={index} className="border border-gray-200  p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-light text-gray-600">{result.metric}</div>
                        <span className="text-2xl">{result.icon}</span>
                      </div>
                      <div className="text-2xl font-light text-gray-900 mb-1">
                        {result.format === "percent" ? `${result.value.toFixed(1)}%` : result.value.toLocaleString()}
                      </div>
                      {result.change !== undefined && result.change !== 0 && (
                        <div className={`text-xs font-light flex items-center gap-1 ${
                          result.change > 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          <TrendingUp className={`w-3 h-3 ${result.change < 0 ? "rotate-180" : ""}`} />
                          {result.change > 0 ? "+" : ""}{result.change.toFixed(1)}%
                          <span className="text-gray-500">（前月比）</span>
                            </div>
                          )}
                      {result.change === undefined && (
                        <div className="text-xs font-light text-gray-400">
                          前月データなし
                        </div>
                      )}
                      {result.change === 0 && (
                        <div className="text-xs font-light text-gray-400">
                          前月と変動なし
                        </div>
                      )}
                    </div>
                  ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    データがありません
                  </p>
                )}
              </div>
            )}

            {/* 計画作成直後のバナー */}
            {showPlanCreatedBanner && (
              <div className="bg-gradient-to-r from-[#FF8A15] to-orange-500 border border-orange-300 p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-light mb-2">✨ 運用プランができました！</h2>
                    <p className="text-sm font-light opacity-90 mb-4">
                      これから{dashboardData?.currentPlan?.planPeriod || "3ヶ月"}、このプランで一緒に頑張りましょう！🔥
                    </p>
                    <button
                      onClick={() => setShowPlanCreatedBanner(false)}
                      className="text-sm font-light underline hover:no-underline"
                      aria-label="ダッシュボードに戻る"
                    >
                      ダッシュボードに戻る
                    </button>
                  </div>
                  <button
                    onClick={() => setShowPlanCreatedBanner(false)}
                    className="text-white hover:opacity-70 transition-opacity"
                    aria-label="バナーを閉じる"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* 分析待ちの投稿 / 明日の準備 */}
            {dashboardData?.currentPlan && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 p-6">
                  <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
                    <span>📌</span>
                    分析待ちの投稿
                  </h2>
                  {isLoadingHomeUnanalyzedPosts ? (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      <SkeletonLoader height="1rem" width="100%" className="mb-1" />
                      <SkeletonLoader height="1rem" width="90%" className="mb-1" />
                      <SkeletonLoader height="1rem" width="80%" />
                    </div>
                  ) : homeUnanalyzedPosts.length > 0 ? (
                    <div className="space-y-3">
                      {homeUnanalyzedPosts.map((post) => {
                        const postTypeLabel = post.type === "feed" ? "フィード" : post.type === "reel" ? "リール" : "ストーリー";
                        const postTypeBadgeClass = getTimelineTypeBadgeClass(post.type);
                        const analysisHref =
                          post.type === "feed"
                            ? `/analytics/feed?postId=${post.id}`
                            : post.type === "reel"
                              ? `/instagram/analytics/reel?postId=${post.id}`
                              : "/instagram/posts";
                        return (
                          <div key={post.id} className="border border-gray-200 bg-gray-50 p-3">
                            <div className="flex gap-3">
                              <div className="w-14 h-14 bg-gray-100 flex-shrink-0 relative overflow-hidden">
                                {post.imageUrl ? (
                                  <Image
                                    src={post.imageUrl}
                                    alt={post.title || "投稿画像"}
                                    fill
                                    className="object-cover"
                                    sizes="56px"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">画像なし</div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
                                    {post.title || "タイトル未設定"}
                                  </h3>
                                  <span className={`text-[11px] border px-2 py-0.5 whitespace-nowrap ${postTypeBadgeClass}`}>
                                    {postTypeLabel}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  作成日: {post.createdAt || "未設定"}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-end">
                              <button
                                onClick={() => router.push(analysisHref)}
                                className="text-xs px-3 py-1.5 bg-gradient-to-r from-[#FF8A15] to-orange-500 text-white font-semibold hover:opacity-90 transition-opacity"
                              >
                                {post.type === "story" ? "投稿一覧で確認" : "今すぐ分析"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 py-4">分析待ちの投稿はありません</p>
                  )}
                </div>

                <div className="bg-white border border-gray-200 p-6">
                  <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
                    <span>🔮</span>
                    明日の準備
                  </h2>
                  {isLoadingTomorrowPreparations ? (
                    <div className="space-y-3">
                      <SkeletonLoader height="1rem" width="100%" className="mb-1" />
                      <SkeletonLoader height="1rem" width="90%" className="mb-1" />
                    </div>
                  ) : visibleTomorrowPreparations.length > 0 ? (
                    <div className="space-y-3">
                      {visibleTomorrowPreparations.map((prep, index) => (
                        <div key={index} className="border-l-2 border-gray-300 pl-4 py-2">
                          <div className="flex items-start justify-between mb-1">
                            <span className={`text-[11px] border px-2 py-0.5 whitespace-nowrap ${getTimelineTypeBadgeClass(prep.type)}`}>
                              {prep.type === "feed" ? "フィード投稿" : prep.type === "reel" ? "リール投稿" : "ストーリーズ投稿"}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2 font-medium">{prep.description}</p>
                          <p className="text-xs text-gray-500">{prep.preparation}</p>
                          {(prep.type === "feed" || prep.type === "reel" || prep.type === "story") && (
                            <button
                              onClick={() =>
                                setGeneratorFromTask({
                                  type: prep.type,
                                  prompt: prep.description || prep.preparation || "",
                                  useTomorrowDate: true,
                                })
                              }
                              className="mt-2 inline-flex items-center px-2.5 py-1 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              投稿生成に反映
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 py-4">
                      今週の予定から次の投稿を確認できます
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 投稿生成 */}
            <div ref={postComposerRef} className="border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-8 py-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-light text-gray-900 tracking-tight flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                        <Bot className="h-4 w-4" />
                      </span>
                      AI投稿文生成
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">テーマや商品の情報に合わせて、AIがすぐ使えるInstagram投稿案を提案します</p>
                  </div>
                  <div className="px-1 py-1 min-w-[220px]">
                    <div className="flex items-center justify-end gap-3">
                      <p className="text-[11px] text-gray-700">
                        {isAiUsageLoading
                          ? "今月のAI残回数: 読み込み中..."
                          : aiUsage?.remaining === null
                            ? "今月のAI残回数: 無制限"
                            : `今月のAI残回数: ${Math.max(aiUsage?.remaining || 0, 0)}回`}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          void refreshUsage();
                        }}
                        className="text-[11px] text-gray-500 hover:text-gray-700"
                      >
                        更新
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <section className="lg:col-span-6 border border-gray-200 bg-white p-6 sm:p-8 space-y-4">
                    <h3 className="text-lg font-light text-gray-900 tracking-tight">投稿内容</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">投稿日</label>
                      <input
                        type="date"
                        value={homePostScheduledDate}
                        onChange={(e) => setHomePostScheduledDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">投稿時間</label>
                      <input
                        type="time"
                        value={homePostScheduledTime}
                        onChange={(e) => setHomePostScheduledTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 text-sm bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">画像（任意）</label>
                    <p className="mb-1 text-[11px] text-gray-500">2.0MB以下推奨（3.0MB超は画像なしで保存）</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        void handleHomeImageChange(e.target.files?.[0] || null);
                      }}
                      className="w-full text-sm text-gray-700 file:mr-3 file:px-3 file:py-2 file:border file:border-gray-200 file:bg-gray-50 file:text-gray-700"
                    />
                    {homeAttachedImage && (
                      <div className="mt-3 border border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-gray-600 truncate">{homeAttachedImage.name}</p>
                          <button
                            type="button"
                            onClick={() => {
                              if (homeAttachedImage.previewUrl) {
                                URL.revokeObjectURL(homeAttachedImage.previewUrl);
                              }
                              setHomeAttachedImage(null);
                              setHomeImageContext("");
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            画像を外す
                          </button>
                        </div>
                        <div className="w-full aspect-square bg-white border border-gray-200 overflow-hidden">
                          <Image
                            src={homeAttachedImage.previewUrl}
                            alt="添付画像プレビュー"
                            width={640}
                            height={640}
                            unoptimized
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">タイトル</label>
                    <input
                      type="text"
                      value={homeDraftTitle}
                      onChange={(e) => setHomeDraftTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 text-sm bg-white"
                      placeholder="候補を反映すると自動で入ります"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">本文</label>
                    <textarea
                      value={homeDraftContent}
                      onChange={(e) => setHomeDraftContent(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 text-sm bg-white"
                      placeholder="候補を反映すると自動で入ります"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ハッシュタグ（カンマ区切り）</label>
                    <input
                      type="text"
                      value={homeDraftHashtagsText}
                      onChange={(e) => setHomeDraftHashtagsText(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 text-sm bg-white"
                      placeholder="例: カフェ, 新商品, 渋谷"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveHomeDraft}
                      disabled={isSavingHomeDraft}
                      className="px-4 py-2 bg-gradient-to-r from-[#FF8A15] to-orange-500 text-white text-sm hover:from-[#e67a0f] hover:to-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSavingHomeDraft ? "保存中..." : "保存"}
                    </button>
                    <button
                      onClick={copyGeneratedPost}
                      className="px-3 py-1.5 border border-gray-300 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      この投稿文をコピー
                    </button>
                  </div>
                  {!hasAppliedHomeCandidate && (
                    <p className="text-xs text-gray-500">右側で候補を選んで「反映」を押すと自動入力されます。</p>
                  )}
                  </section>

                  <aside className="lg:col-span-6 border border-gray-200 bg-white p-6 sm:p-8 space-y-4">
                    <h3 className="text-lg font-light text-gray-900 tracking-tight">生成設定</h3>
                    <div className="border border-gray-200 bg-white p-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-800">
                        投稿タイプ <span className="text-sm text-[#b42318]">*</span>
                      </p>
                      <select
                        value={homePostType}
                        onChange={(e) => setHomePostType(e.target.value as "feed" | "reel" | "story")}
                        className="w-full px-3 py-2 border border-gray-300 text-sm text-gray-700 bg-white"
                      >
                        <option value="feed">フィード</option>
                        <option value="reel">リール</option>
                        <option value="story">ストーリー</option>
                      </select>
                    </div>
                    <div className="border border-gray-200 bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-800">商品・サービス</p>
                        <span className="text-[11px] text-gray-500">
                          {homeSelectedProductId ? "選択中" : "未選択"}
                        </span>
                      </div>
                      {onboardingProducts.length > 0 ? (
                        <select
                          value={homeSelectedProductId}
                          onChange={(e) => setHomeSelectedProductId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 text-sm text-gray-700 bg-white"
                        >
                          <option value="">選択しない</option>
                          {onboardingProducts.map((product, index) => {
                            const productSelectKey = String(product?.id || product?.name || `idx-${index}`);
                            return (
                              <option key={productSelectKey} value={productSelectKey}>
                                {String(product?.name || "商品名未設定")}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <p className="text-[11px] text-gray-500">オンボーディングの商品・サービス情報が未設定です</p>
                      )}
                    </div>

                    <div className="border border-gray-200 bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-800">テーマ</p>
                        {homePostPrompt.trim() ? (
                          <button
                            type="button"
                            onClick={() => setHomePostPrompt("")}
                            className="text-[11px] text-gray-500 hover:text-gray-700"
                          >
                            クリア
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-500">未入力OK</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600">1文で方向性だけ指定すると精度が上がります。</p>
                      <textarea
                        value={homePostPrompt}
                        onChange={(e) => setHomePostPrompt(e.target.value)}
                        rows={2}
                        placeholder="例: 新商品の魅力を30代女性向けに伝えたい"
                        className="w-full px-3 py-2 border border-gray-300 text-sm resize-none min-h-[44px] bg-white"
                      />
                    </div>

                    {homeAttachedImage && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">画像補足（1行）</label>
                        <input
                          type="text"
                          value={homeImageContext}
                          onChange={(e) => setHomeImageContext(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 text-sm bg-white"
                          placeholder="画像の詳細を教えてください"
                        />
                      </div>
                    )}
                    {homeGeneratedCandidates.length === 0 && (
                      <button
                        onClick={generatePostInHome}
                        disabled={isGeneratingHomePost}
                        className="w-full px-4 py-2 bg-gradient-to-r from-[#FF8A15] to-orange-500 text-white text-sm hover:from-[#e67a0f] hover:to-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isGeneratingHomePost ? "生成中..." : "AI生成"}
                      </button>
                    )}
                    {homeGeneratedCandidates.length === 0 && isGeneratingHomePost && homeGenerationProgress && (
                      <div className="mt-2">
                        {renderHomeGenerationLoader({
                          message: homeGenerationProgress.message,
                          subMessage: homeGenerationProgress.subMessage,
                          progress: homeGenerationProgress.progress,
                        })}
                      </div>
                    )}

                    {homeGeneratedCandidates.length > 0 && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3">
                        {homeGeneratedCandidates.map((candidate) => (
                          <div
                            key={candidate.variant}
                            className={`relative border p-3 space-y-2 transition-colors ${
                              homeSelectedCandidateVariant === candidate.variant
                                ? "border-orange-400 bg-gradient-to-r from-orange-50 to-white"
                                : "border-gray-200 bg-white"
                            }`}
                          >
                            {homeRecommendedCandidateVariant === candidate.variant && (
                              <span className="absolute -top-2 right-2 text-[10px] px-2 py-0.5 text-white bg-gradient-to-r from-[#FF8A15] to-orange-500 shadow-sm">
                                おすすめ
                              </span>
                            )}
                            <div className="flex items-center gap-2">
                              <p className="text-[11px] text-gray-600">{candidate.label}</p>
                            </div>
                            {candidate.variant === "advice" &&
                              (candidate.adviceReference?.postTitle || candidate.adviceReference?.generatedAt) && (
                              <p className="text-[11px] text-gray-600 bg-amber-50 border border-amber-200 px-2 py-1">
                                参照元: {candidate.adviceReference?.postTitle || "直近の分析投稿"}
                                {" "}
                                (
                                {candidate.adviceReference?.generatedAt
                                  ? new Date(candidate.adviceReference.generatedAt).toLocaleString("ja-JP")
                                  : "日時未取得"}
                                )
                              </p>
                            )}
                            <p className="text-sm font-semibold text-gray-900">{candidate.title || "タイトル未生成"}</p>
                            <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{candidate.content || "本文未生成"}</p>
                            <p className="text-[11px] text-gray-600">
                              {(candidate.hashtagsText || "")
                                .split(",")
                                .map((tag) => tag.trim())
                                .filter(Boolean)
                                .slice(0, 5)
                                .map((tag) => `#${tag.replace(/^#+/, "")}`)
                                .join(" ")}
                            </p>
                            <button
                              type="button"
                              onClick={() => setHomeSelectedCandidateVariant(candidate.variant)}
                              className={`px-2.5 py-1 text-xs transition-colors ${
                                homeSelectedCandidateVariant === candidate.variant
                                  ? "border border-orange-500 bg-orange-500 text-white"
                                  : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              {homeSelectedCandidateVariant === candidate.variant ? "選択中" : "この案を選択"}
                            </button>
                          </div>
                        ))}
                        </div>
                        <button
                          type="button"
                          disabled={!homeSelectedCandidateVariant}
                          onClick={() => {
                            const selected = homeGeneratedCandidates.find(
                              (candidate) => candidate.variant === homeSelectedCandidateVariant
                            );
                            if (selected) {
                              applyGeneratedCandidate(selected);
                            }
                          }}
                          className="w-full px-4 py-2 bg-gradient-to-r from-[#FF8A15] to-orange-500 text-white text-sm hover:from-[#e67a0f] hover:to-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          反映
                        </button>
                        <button
                          type="button"
                          onClick={generatePostInHome}
                          disabled={isGeneratingHomePost}
                          className="w-full px-4 py-2 bg-gradient-to-r from-[#FF8A15] to-orange-500 text-white text-sm hover:from-[#e67a0f] hover:to-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isGeneratingHomePost ? "生成中..." : "AI再生成"}
                        </button>
                        {isGeneratingHomePost && homeGenerationProgress && (
                          <div className="mt-2">
                            {renderHomeGenerationLoader({
                              message: homeGenerationProgress.message,
                              subMessage: homeGenerationProgress.subMessage,
                              progress: homeGenerationProgress.progress,
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </aside>
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-6">
            {/* 右カラム: 計画導線 */}
            <div
              ref={planCardRef}
              className={`bg-white border p-6 transition-shadow ${
                isPlanCardHighlighted
                  ? "border-orange-300 shadow-[0_0_0_3px_rgba(255,138,21,0.18)]"
                  : "border-gray-200"
              }`}
            >
            <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-3">
              <span>🧭</span>
              運用計画
            </h2>
            <p className="text-sm text-gray-500 mb-3">1ヶ月の計画を立てましょう</p>
            {(() => {
              const currentPlan = dashboardData?.currentPlan;
              const shouldShowPlanForm = showHomePlanForm;
              return (
                <>
            {showPlanGateLoader && (
              <div className="mb-3">
                {renderGateLoader({
                  message: "計画を保存中です。",
                  subMessage: "保存完了までしばらくお待ちください。",
                  progress: planGateProgress,
                })}
              </div>
            )}
            {!showPlanGateLoader && !dashboardData?.currentPlan && !isLoadingDashboard && (
              <div className="mb-2 border border-orange-500 bg-gradient-to-r from-[#FF8A15] to-orange-500">
                <div className="px-5 py-7">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-orange-100">
                        <span className="inline-block h-2 w-2 bg-white" />
                        QUICK START
                      </div>
                      <h3 className="text-sm font-semibold text-white">運用計画を作成しましょう</h3>
                      <p className="mt-1 text-xs text-orange-50">
                        ホーム内で完結して作成できます。保存後はカレンダーと週次計画へ自動反映されます。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowHomePlanForm(true);
                        focusHomePlanCard();
                      }}
                      className="shrink-0 px-4 py-2 text-xs font-semibold bg-white text-[#d96a00] hover:bg-orange-50 transition-colors"
                    >
                      作成する
                    </button>
                  </div>
                </div>
              </div>
            )}
            {!showPlanGateLoader && currentPlan && !showHomePlanForm && (
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span />
                </div>
                {(() => {
                  const increase = Number(currentPlan.targetFollowerIncrease || 0) > 0
                    ? Number(currentPlan.targetFollowerIncrease || 0)
                    : Math.max(0, Number(currentPlan.targetFollowers || 0) - Number(currentPlan.currentFollowers || 0));
                  const feedDays = sortWeekDays(parseSavedWeekDays(currentPlan.feedDays));
                  const reelDays = sortWeekDays(parseSavedWeekDays(currentPlan.reelDays));
                  const storyDays = sortWeekDays(parseSavedWeekDays(currentPlan.storyDays));
                  const startDateText =
                    typeof currentPlan.startDate === "string"
                      ? currentPlan.startDate.split("T")[0]
                      : currentPlan.startDate instanceof Date
                        ? toLocalISODate(currentPlan.startDate)
                        : "未設定";

                  return (
                    <div className="relative overflow-hidden border border-orange-200 bg-white p-5">
                      <div className="relative">
                        <div className="mb-4 flex items-center justify-between">
                          <span className="text-[11px] tracking-[0.2em] text-orange-700">PLAN SNAPSHOT</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setQuickPlanPurpose(String(currentPlan.operationPurpose || "認知拡大"));
                                const savedTargetFollowers = Number(currentPlan.targetFollowers || 0);
                                const savedCurrentFollowers = Number(currentPlan.currentFollowers || 0);
                                const savedIncrease = Number(currentPlan.targetFollowerIncrease || 0);
                                const restoredIncrease = savedIncrease > 0 ? savedIncrease : Math.max(0, savedTargetFollowers - savedCurrentFollowers);
                                setQuickPlanTargetFollowers(restoredIncrease > 0 ? restoredIncrease : "");
                                setQuickPlanStartDate(
                                  typeof currentPlan.startDate === "string"
                                    ? currentPlan.startDate.split("T")[0]
                                    : currentPlan.startDate instanceof Date
                                      ? toLocalISODate(currentPlan.startDate)
                                      : quickPlanStartDate
                                );
                                setQuickPlanPostingTime(String(currentPlan.postingTime || ""));
                                setQuickPlanRegionRestriction(
                                  currentPlan.regionRestriction === "restricted" ? "restricted" : "none"
                                );
                                setQuickPlanRegionName(String(currentPlan.regionName || ""));
                                setQuickPlanTargetAudience(String(currentPlan.targetAudience || ""));
                                setQuickPlanFeedDays(parseSavedWeekDays(currentPlan.feedDays));
                                setQuickPlanReelDays(parseSavedWeekDays(currentPlan.reelDays));
                                setQuickPlanStoryDays(parseSavedWeekDays(currentPlan.storyDays));
                                setShowHomePlanForm(true);
                                focusHomePlanCard();
                              }}
                              className="px-2 py-1 text-xs border border-orange-300 text-orange-700 bg-white hover:bg-orange-50"
                            >
                              編集する
                            </button>
                          </div>
                        </div>

                        <div className="mb-4 bg-[#FF8A15] px-4 py-4 text-white shadow-sm">
                          <p className="text-[11px] font-bold text-white">増加目標</p>
                          <p className="mt-1 text-4xl font-semibold leading-none">+{increase.toLocaleString()}</p>
                          <p className="mt-1 text-xs font-bold text-white">followers / month</p>
                        </div>

                        <div className="space-y-3 text-sm text-gray-800">
                          <div>
                            <p className="text-[11px] text-gray-500 mb-1">投稿頻度</p>
                            <div className="flex flex-wrap gap-1.5 text-xs">
                              <span className="px-2.5 py-1 bg-orange-50 text-orange-800">
                                フィード {getWeeklyCountLabel(feedDays.length)}
                              </span>
                              <span className="px-2.5 py-1 bg-orange-50 text-orange-800">
                                リール {getWeeklyCountLabel(reelDays.length)}
                              </span>
                              <span className="px-2.5 py-1 bg-orange-50 text-orange-800">
                                ストーリーズ {getWeeklyCountLabel(storyDays.length)}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2 text-xs">
                            <div>
                              <p className="text-gray-500 mb-1">投稿曜日</p>
                              <div className="space-y-1.5">
                                {[
                                  { label: "フィード", days: feedDays },
                                  { label: "リール", days: reelDays },
                                  { label: "ストーリーズ", days: storyDays },
                                ].map((item) => (
                                  <div key={item.label} className="flex items-center gap-2">
                                    <span className="w-20 text-gray-600">{item.label}</span>
                                    {item.days.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {item.days.map((day) => (
                                          <span key={`${item.label}-${day}`} className="px-1.5 py-0.5 bg-gray-100 text-gray-700">
                                            {day}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">未設定</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <p><span className="text-gray-500">投稿時間帯</span> {getPostingTimeLabel(currentPlan.postingTime)}</p>
                            <p><span className="text-gray-500">開始日</span> {startDateText}</p>
                            {String(currentPlan.targetAudience || "").trim() && (
                              <p><span className="text-gray-500">ターゲット属性</span> {String(currentPlan.targetAudience)}</p>
                            )}
                            {currentPlan.regionRestriction === "restricted" && String(currentPlan.regionName || "").trim() && (
                              <p><span className="text-gray-500">地域限定</span> {String(currentPlan.regionName)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            {!showPlanGateLoader && shouldShowPlanForm && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">投稿の目的 *</label>
                <select
                  value={quickPlanPurpose}
                  onChange={(e) => setQuickPlanPurpose(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 text-sm"
                >
                  <option value="認知拡大">認知拡大</option>
                  <option value="採用・リクルーティング強化">採用・リクルーティング強化</option>
                  <option value="商品・サービスの販売促進">商品・サービスの販売促進</option>
                  <option value="ファンを作りたい">ファンを作りたい</option>
                  <option value="来店・問い合わせを増やしたい">来店・問い合わせを増やしたい</option>
                  <option value="企業イメージ・ブランディング">企業イメージ・ブランディング</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">増加目標フォロワー数</label>
                <input
                  type="number"
                  min="1"
                  value={quickPlanTargetFollowers}
                  onChange={(e) => setQuickPlanTargetFollowers(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="例: 15"
                  className="w-full px-3 py-2 border border-gray-300 text-sm"
                />
                <p className="mt-1 text-[11px] text-gray-500">現在フォロワー数に加算して目標値を計算します</p>
              </div>
              <div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">フィード投稿できそうな曜日（複数選択）</label>
                  <div className="grid grid-cols-7 gap-1">
                    {WEEK_DAYS.map((day) => {
                      const active = quickPlanFeedDays.includes(day);
                      return (
                        <button
                          key={`feed-day-${day}`}
                          type="button"
                          onClick={() => toggleDaySelection(day, setQuickPlanFeedDays)}
                          className={`px-2 py-2 border text-xs transition-colors ${
                            active ? "border-[#FF8A15] bg-orange-50 text-[#FF8A15] font-semibold" : "border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">選択: 週{quickPlanFeedDays.length}回</p>
                </div>
              </div>
              <div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">リール投稿できそうな曜日（複数選択）</label>
                  <div className="grid grid-cols-7 gap-1">
                    {WEEK_DAYS.map((day) => {
                      const active = quickPlanReelDays.includes(day);
                      return (
                        <button
                          key={`reel-day-${day}`}
                          type="button"
                          onClick={() => toggleDaySelection(day, setQuickPlanReelDays)}
                          className={`px-2 py-2 border text-xs transition-colors ${
                            active ? "border-[#FF8A15] bg-orange-50 text-[#FF8A15] font-semibold" : "border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">選択: 週{quickPlanReelDays.length}回</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ストーリーズ投稿できそうな曜日（複数選択）</label>
                <div className="grid grid-cols-7 gap-1">
                  {WEEK_DAYS.map((day) => {
                    const active = quickPlanStoryDays.includes(day);
                    return (
                      <button
                        key={`story-day-${day}`}
                        type="button"
                        onClick={() => toggleDaySelection(day, setQuickPlanStoryDays)}
                        className={`px-2 py-2 border text-xs transition-colors ${
                          active ? "border-[#FF8A15] bg-orange-50 text-[#FF8A15] font-semibold" : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-[11px] text-gray-500">選択: 週{quickPlanStoryDays.length}回</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">計画開始日</label>
                <input
                  type="date"
                  value={quickPlanStartDate}
                  onChange={(e) => setQuickPlanStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 text-sm"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setQuickPlanDetailOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 text-sm text-gray-700"
                >
                  <span>詳細設定（オプション）</span>
                  {quickPlanDetailOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {quickPlanDetailOpen && (
                  <div className="mt-2 space-y-3 border border-gray-200 p-3 bg-gray-50">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">ターゲット属性</label>
                      <input
                        type="text"
                        value={quickPlanTargetAudience}
                        onChange={(e) => setQuickPlanTargetAudience(e.target.value)}
                        placeholder="例: 30代のママさん"
                        className="w-full px-3 py-2 border border-gray-300 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">投稿時間帯</label>
                      <select
                        value={quickPlanPostingTime}
                        onChange={(e) => setQuickPlanPostingTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 text-sm bg-white"
                      >
                        <option value="">AIに任せる</option>
                        <option value="morning">午前中（9:00〜12:00）</option>
                        <option value="noon">昼（12:00〜15:00）</option>
                        <option value="evening">夕方（15:00〜18:00）</option>
                        <option value="night">夜（18:00〜21:00）</option>
                        <option value="late-night">深夜（21:00〜24:00）</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">地域限定の有無</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="radio"
                            name="quickPlanRegionRestriction"
                            value="none"
                            checked={quickPlanRegionRestriction === "none"}
                            onChange={() => {
                              setQuickPlanRegionRestriction("none");
                              setQuickPlanRegionName("");
                            }}
                          />
                          地域は限定しない
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="radio"
                            name="quickPlanRegionRestriction"
                            value="restricted"
                            checked={quickPlanRegionRestriction === "restricted"}
                            onChange={() => setQuickPlanRegionRestriction("restricted")}
                          />
                          地域を限定する
                        </label>
                      </div>
                      {quickPlanRegionRestriction === "restricted" && (
                        <input
                          type="text"
                          value={quickPlanRegionName}
                          onChange={(e) => setQuickPlanRegionName(e.target.value)}
                          placeholder="例: 東京都 渋谷区"
                          className="mt-2 w-full px-3 py-2 border border-gray-300 text-sm bg-white"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={createQuickPlanInline}
                disabled={isCreatingQuickPlan}
                className="w-full py-2.5 px-4 bg-[#FF8A15] text-white text-sm font-medium hover:bg-[#e67a0f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCreatingQuickPlan ? "保存中..." : "計画を立てて保存"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isResetConfirming) {
                    setIsResetConfirming(true);
                    return;
                  }
                  void resetHomePlanCompletely();
                }}
                disabled={isResettingPlan}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-500 to-red-600 text-white text-sm font-medium hover:from-rose-600 hover:to-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isResettingPlan ? "リセット中..." : isResetConfirming ? "もう一度押してリセット確定" : "計画を完全リセット"}
              </button>
              {isResetConfirming && !isResettingPlan && (
                <button
                  type="button"
                  onClick={() => setIsResetConfirming(false)}
                  className="w-full py-2 text-xs text-gray-600 hover:text-gray-800"
                >
                  キャンセル
                </button>
              )}
            </div>
            )}
                </>
              );
            })()}
            </div>

            {/* 右カラム: 今月カレンダー */}
            <div className="bg-white border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-light text-gray-900 flex items-center gap-2">
                <span>📅</span>
                {calendarViewYear}年{calendarViewMonth + 1}月
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCalendarPrevMonth}
                  className="p-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50"
                  aria-label="先月へ移動"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCalendarNextMonth}
                  className="p-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50"
                  aria-label="来月へ移動"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            {showCalendarGateLoader ? (
              renderGateLoader({
                message: "カレンダーを生成中です。",
                subMessage: "1ヶ月分の内容を作成しています。",
                progress: calendarGateProgress,
              })
            ) : (
              <>
            <div className="grid grid-cols-7 gap-2 text-center text-sm mb-3 text-gray-600 font-medium">
              {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2 text-base">
              {calendarCells.map((day, idx) => (
                (() => {
                  const isEmpty = day === null;
                  const isToday =
                    day !== null &&
                    calendarViewYear === today.getFullYear() &&
                    calendarViewMonth === today.getMonth() &&
                    day === today.getDate();
                  const isMarked = day !== null && markedDays.has(day);

                  return (
                    <button
                      type="button"
                      onClick={() => handleCalendarDayClick(day)}
                      disabled={!day || !isMarked}
                      key={`cal-${idx}`}
                      aria-current={isToday ? "date" : undefined}
                      className={`relative h-11 flex items-center justify-center border font-medium transition-colors ${
                        isEmpty
                          ? "border-transparent bg-transparent cursor-default"
                          : isToday && isMarked
                            ? "border-[#FF8A15] bg-orange-50 text-[#FF8A15] ring-1 ring-orange-300"
                            : isToday
                              ? "border-[#FF8A15] bg-orange-50 text-[#FF8A15]"
                              : isMarked
                                ? "border-orange-300 bg-white text-gray-900 hover:bg-orange-50 cursor-pointer"
                                : "border-gray-100 text-gray-400 cursor-default"
                      }`}
                    >
                      <span>{day ?? ""}</span>
                      {isMarked && (
                        <span
                          className={`absolute bottom-1 h-1.5 w-1.5 ${
                            isToday ? "bg-[#FF8A15]" : "bg-orange-400"
                          }`}
                        />
                      )}
                    </button>
                  );
                })()
              ))}
            </div>
            {isGeneratingMonthlyCalendarPlan && (
              <div className="mt-3 border border-orange-200 bg-orange-50 px-3 py-2">
                <p className="text-xs text-orange-700">1ヶ月分の予定をAIが生成中...</p>
              </div>
            )}
            {isWeeklyPlanMarkedOnCalendar && planStartDateOnly && planEndDateOnly && (
              <p className="mt-3 text-[11px] text-gray-500">
                計画期間: {planStartDateOnly.getFullYear()}/{planStartDateOnly.getMonth() + 1}/{planStartDateOnly.getDate()} 〜 {planEndDateOnly.getFullYear()}/{planEndDateOnly.getMonth() + 1}/{planEndDateOnly.getDate()}
              </p>
            )}
              </>
            )}
            </div>

            {/* 右カラム: タイムライン */}
            <div className="bg-white border border-gray-200 p-6">
            {showWeeklyGateLoader ? (
              renderGateLoader({
                message: "週次計画を生成中です。",
                subMessage: "今後5日間の予定を準備しています。",
                progress: weeklyGateProgress,
              })
            ) : (
              <>
            <div className="mb-4 border border-orange-500 bg-gradient-to-r from-[#FF8A15] to-orange-500 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[11px] tracking-[0.08em] text-orange-100">UPCOMING 5 DAYS</h2>
                  <p className="text-base font-semibold text-white">今後5日間の投稿予定</p>
                </div>
                <p className="text-base font-semibold text-white">{timelineTotalCount}件</p>
              </div>
            </div>
            {isLoadingWeeklyPlans ? (
              <div className="space-y-3">
                <SkeletonLoader height="1rem" width="100%" />
                <SkeletonLoader height="1rem" width="90%" />
                <SkeletonLoader height="1rem" width="80%" />
              </div>
            ) : timelineTotalCount > 0 ? (
              <div className="space-y-3">
                {rollingTimelineRows.map((row, idx) => (
                  <div
                    key={`timeline-row-${row.dateIso}-${idx}`}
                    className={`border ${
                      row.isToday ? "border-orange-300 bg-orange-50/30" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="grid grid-cols-[62px_1fr]">
                      <div className="border-r border-gray-200 px-2 py-3 text-center bg-gray-50/60">
                        <p className={`text-base font-semibold leading-none ${row.isToday ? "text-orange-700" : "text-gray-700"}`}>{row.dateLabel}</p>
                        <p className="text-[11px] text-gray-500">{row.dayLabel}</p>
                        <p className="text-[10px] text-orange-700 font-medium">{row.isToday ? "TODAY" : ""}</p>
                      </div>
                      <div className="px-3 py-3 space-y-2">
                        {row.items.length > 0 ? (
                          row.items.map((item) => (
                            <div key={item.key} className="border border-gray-200 bg-white px-3 py-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-900">
                                    {item.time}
                                  </p>
                                  <p className="mt-0.5 text-xs text-gray-700">
                                    {getDirectionLabel(item.direction || item.label)}
                                  </p>
                                  <p className="mt-1 text-[11px] text-gray-500">
                                    {getShortGuideText(item.direction || item.label, item.type)}
                                  </p>
                                  {String(item.hook || "").trim() && (
                                    <p className="mt-1 text-xs text-orange-700 line-clamp-1">
                                      冒頭フック: {String(item.hook).trim()}
                                    </p>
                                  )}
                                </div>
                                <span className={`text-[10px] border px-2 py-0.5 whitespace-nowrap ${getTimelineTypeBadgeClass(item.type)}`}>
                                  {getTimelineTypeLabel(item.type)}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditTimeline(item)}
                                  className="px-2 py-1 text-[11px] border border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                  変更
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleGeneratePostFromTimelineItem(item)}
                                  disabled={generatingTimelinePostKey === item.key}
                                  className="px-2 py-1 text-[11px] bg-[#FF8A15] text-white hover:bg-[#e67a0f] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {generatingTimelinePostKey === item.key ? "生成中..." : "投稿文生成"}
                                </button>
                              </div>
                              {editingTimelineKey === item.key && (
                                <div className="mt-2 border border-gray-200 bg-gray-50 p-2 space-y-2">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <input
                                      type="date"
                                      value={timelineEditDraft.dateIso}
                                      onChange={(e) =>
                                        setTimelineEditDraft((prev) => ({
                                          ...prev,
                                          dateIso: e.target.value,
                                        }))
                                      }
                                      className="w-full px-2 py-1.5 border border-gray-300 text-xs bg-white"
                                    />
                                    <select
                                      value={timelineEditDraft.type}
                                      onChange={(e) =>
                                        setTimelineEditDraft((prev) => ({
                                          ...prev,
                                          type: e.target.value as "feed" | "reel" | "story",
                                        }))
                                      }
                                      className="w-full px-2 py-1.5 border border-gray-300 text-xs bg-white"
                                    >
                                      <option value="feed">フィード</option>
                                      <option value="reel">リール</option>
                                      <option value="story">ストーリーズ</option>
                                    </select>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        void handleApplyTimelineEdit(item.key);
                                      }}
                                      className="px-2 py-1 text-[11px] bg-[#FF8A15] text-white hover:bg-[#e67a0f]"
                                    >
                                      適用
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingTimelineKey(null)}
                                      className="px-2 py-1 text-[11px] border border-gray-300 text-gray-700 hover:bg-white"
                                    >
                                      キャンセル
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-gray-400 py-1">予定なし</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
                <p className="text-sm text-gray-500">予定が入るとここに表示されます</p>
            )}
              </>
            )}
            </div>
          </div>

        </div>
      </div>
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
        {isAdvisorOpen && (
          <div className="w-[min(94vw,430px)] lg:w-[430px] h-[min(86vh,820px)] border border-gray-200 bg-white shadow-lg flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-orange-600" />
                <p className="text-xs font-semibold text-gray-800">投稿チャットβ</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAdvisorOpen(false);
                  setHasLoadedAdvisorHistory(false);
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                閉じる
              </button>
            </div>
            <div className="border-b border-gray-200 px-3 py-2">
              <div className="flex items-center justify-end gap-3">
                <p className="text-[11px] text-gray-700">
                  {isAiUsageLoading
                    ? "今月のAI残回数: 読み込み中..."
                    : aiUsage?.remaining === null
                      ? "今月のAI残回数: 無制限"
                      : `今月のAI残回数: ${Math.max(aiUsage?.remaining || 0, 0)}回`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    void refreshUsage();
                  }}
                  className="text-[11px] text-gray-500 hover:text-gray-700"
                >
                  更新
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 px-3 py-3 bg-gray-50">
              {advisorMessages.map((msg) => (
                <div key={msg.id} className={`flex items-end gap-2 ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}>
                  {msg.role === "assistant" && (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white border border-orange-200 text-orange-600 flex-shrink-0">
                      <Bot className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <div
                    className={`max-w-[88%] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-2xl ${
                      msg.role === "assistant"
                        ? "border border-gray-200 bg-white text-gray-700"
                        : "bg-gradient-to-r from-[#FF8A15] to-orange-500 text-white"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {showAdvisorProductConfigCard && (
                <div className="flex items-end gap-2 justify-start">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white border border-orange-200 text-orange-600 flex-shrink-0">
                    <Bot className="w-3.5 h-3.5" />
                  </span>
                  <div className="max-w-[92%] border border-gray-200 bg-white px-3 py-3 text-xs text-gray-700 space-y-2">
                    <p className="text-[11px] text-gray-500">既存の商品から作成</p>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">投稿タイプ</label>
                      <select
                        value={advisorPostType}
                        onChange={(e) => setAdvisorPostType(e.target.value as "feed" | "reel" | "story")}
                        className="w-full px-2 py-2 border border-gray-300 text-xs bg-white"
                      >
                        <option value="feed">フィード</option>
                        <option value="reel">リール</option>
                        <option value="story">ストーリー</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">商品・サービス</label>
                      <select
                        value={selectedAdvisorProductId}
                        onChange={(e) => setSelectedAdvisorProductId(e.target.value)}
                        className="w-full px-2 py-2 border border-gray-300 text-xs bg-white"
                      >
                        <option value="">選択してください</option>
                        {onboardingProducts.map((product, index) => {
                          const productSelectKey = String(product?.id || product?.name || `idx-${index}`);
                          return (
                            <option key={productSelectKey} value={productSelectKey}>
                              {String(product?.name || "商品名未設定")}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedAdvisorProductName) {
                          toast.error("商品・サービスを選択してください");
                          return;
                        }
                        setAdvisorProductConfigured(true);
                        const intentLabel = advisorIntent === "video-idea" ? "動画" : "画像";
                        const postTypeLabel =
                          advisorPostType === "reel" ? "リール" : advisorPostType === "story" ? "ストーリー" : "フィード";
                        void sendAdvisorMessage(
                          `${selectedAdvisorProductName}の${postTypeLabel}向け${intentLabel}案をください`,
                          { forceAdvisorProductConfigured: true, overrideAdvisorSource: "product" }
                        );
                      }}
                      className="w-full py-2 bg-[#FF8A15] text-white text-xs hover:bg-[#e67a0f]"
                    >
                      この条件で提案
                    </button>
                  </div>
                </div>
              )}
              {isAdvisorLoading && (
                <div className="flex items-end gap-2 justify-start">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white border border-orange-200 text-orange-600 flex-shrink-0">
                    <Bot className="w-3.5 h-3.5" />
                  </span>
                  <div className="max-w-[88%] px-3 py-2 text-sm text-gray-500 border border-gray-200 bg-white rounded-2xl">
                    回答中...
                  </div>
                </div>
              )}
              {advisorSuggestedQuestions.length > 0 && (
                <div className="flex items-end gap-2 justify-start">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white border border-orange-200 text-orange-600 flex-shrink-0">
                    <Bot className="w-3.5 h-3.5" />
                  </span>
                  <div className="max-w-[92%] border border-gray-200 bg-white px-3 py-2 rounded-2xl">
                    <p className="text-[11px] text-gray-500 mb-1">選択してください</p>
                    <div className="flex flex-wrap gap-1.5">
                      {advisorSuggestedQuestions.map((question) => (
                        <button
                          key={question}
                          type="button"
                          onClick={() => {
                            void sendAdvisorMessage(question);
                          }}
                          disabled={isAdvisorLoading}
                          className="px-2 py-1 text-[11px] border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-60"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 p-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={advisorInput}
                  onChange={(e) => setAdvisorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void sendAdvisorMessage(advisorInput);
                    }
                  }}
                  placeholder={advisorInputPlaceholder}
                  disabled={advisorInputDisabled}
                  className="flex-1 px-3 py-2.5 border border-gray-300 text-sm bg-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    void sendAdvisorMessage(advisorInput);
                  }}
                  disabled={advisorInputDisabled || !advisorInput.trim()}
                  className="inline-flex items-center justify-center w-9 h-9 bg-gradient-to-r from-[#FF8A15] to-orange-500 text-white disabled:opacity-60"
                  aria-label="相談を送信"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setIsAdvisorOpen((prev) => {
              const next = !prev;
              if (!next) {
                setHasLoadedAdvisorHistory(false);
              }
              return next;
            });
          }}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FF8A15] to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg hover:opacity-95"
        >
          <Bot size={18} />
          投稿チャットβ
        </button>
      </div>
    </SNSLayout>
  );
}
