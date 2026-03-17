"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import SNSLayout from "../../components/sns-layout";
import { useAuth } from "../../contexts/auth-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAiUsageSummary } from "@/hooks/useAiUsageSummary";

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

import { BotStatusCard } from "../../components/bot-status-card";
import { AdvisorSection } from "./components/AdvisorSection";
import { MonthlyCalendarSection } from "./components/MonthlyCalendarSection";
import { OverviewSection } from "./components/OverviewSection";
import { PlanCardSection } from "./components/PlanCardSection";
import { HomePostGeneratorSection } from "./components/HomePostGeneratorSection";
import { useHomePostGenerator } from "./hooks/use-home-post-generator";
import { buildMarkedDays } from "./lib/calendar-view";
import { getMonthlyAlgorithmTheme } from "./lib/monthly-algorithm-theme";
import { createQuickPlanFlow, resetQuickPlanFlow } from "./lib/quick-plan-orchestration";
import {
  buildRollingTimelineRows,
  buildTomorrowPreparationsFromTimeline,
  getDirectionLabel,
  getShortGuideText,
  getTimelineTypeBadgeClass,
  getTimelineTypeLabel,
} from "./lib/timeline-view";
import { useMonthlyCalendarSection } from "./hooks/use-monthly-calendar-section";
import { useQuickPlanSection } from "./hooks/use-quick-plan-section";
import { useTimelinePostGenerator } from "./hooks/use-timeline-post-generator";
import { WeeklyPlansSection } from "./components/WeeklyPlansSection";
import { useHomeAdvisor } from "./hooks/use-home-advisor";
import { useDashboardOverview } from "./hooks/use-dashboard-overview";
import { useWeeklyPlansSection } from "./hooks/use-weekly-plans-section";
import {
  WEEK_DAYS,
  type WeekDay,
} from "./types";

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

  const [showPlanCreatedBanner, setShowPlanCreatedBanner] = useState(false);
  const {
    dashboardData,
    isLoadingDashboard,
    aiDirection,
    monthlyKPIs,
    monthlyResults,
    isLoadingMonthlyKPIs,
    homeUnanalyzedPosts,
    tomorrowPreparations,
    isLoadingHomeUnanalyzedPosts,
    isLoadingTodayTasks,
    clearOverviewLists,
    fetchDashboard,
  } = useDashboardOverview({
    userId: user?.uid,
  });
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
  const {
    weeklyPlans,
    isLoadingWeeklyPlans,
    setPendingAiGenerationNoticePlanId,
    clearPendingAiGenerationNotice,
    clearWeeklyPlans,
  } = useWeeklyPlansSection({
    userId: user?.uid,
    currentPlanId: dashboardData?.currentPlan?.id,
    currentPlanAiGenerationStatus: dashboardData?.currentPlan?.aiGenerationStatus,
  });


  const getWeeklyCountLabel = (count: number): string => {
    const safe = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    if (safe <= 0) {return "未設定";}
    if (safe >= 7) {return "週7回（毎日）";}
    return `週${safe}回`;
  };

  const sortWeekDays = (days: WeekDay[]): WeekDay[] =>
    [...days].sort((a, b) => WEEK_DAYS.indexOf(a) - WEEK_DAYS.indexOf(b));

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

  const {
    quickPlanPurpose,
    setQuickPlanPurpose,
    quickPlanTargetFollowers,
    setQuickPlanTargetFollowers,
    quickPlanFeedDays,
    setQuickPlanFeedDays,
    quickPlanReelDays,
    setQuickPlanReelDays,
    quickPlanStoryDays,
    setQuickPlanStoryDays,
    quickPlanStartDate,
    setQuickPlanStartDate,
    quickPlanDetailOpen,
    setQuickPlanDetailOpen,
    quickPlanTargetAudience,
    setQuickPlanTargetAudience,
    quickPlanPostingTime,
    setQuickPlanPostingTime,
    quickPlanRegionRestriction,
    setQuickPlanRegionRestriction,
    quickPlanRegionName,
    setQuickPlanRegionName,
    isCreatingQuickPlan,
    setIsCreatingQuickPlan,
    isResettingPlan,
    setIsResettingPlan,
    isResetConfirming,
    setIsResetConfirming,
    showHomePlanForm,
    setShowHomePlanForm,
    parseSavedWeekDays,
    getPostingTimeLabel,
    toggleFeedDay,
    toggleReelDay,
    toggleStoryDay,
    openHomePlanForm,
    handleEditCurrentPlan,
    resetQuickPlanForm,
  } = useQuickPlanSection({
    today,
    currentPlan: dashboardData?.currentPlan,
    planCardRef,
    setIsPlanCardHighlighted,
  });

  const createQuickPlanInline = async () => {
    await createQuickPlanFlow({
      userId: user?.uid,
      quickPlanPurpose,
      quickPlanTargetFollowers,
      quickPlanFeedDays,
      quickPlanReelDays,
      quickPlanStoryDays,
      quickPlanStartDate,
      quickPlanTargetAudience,
      quickPlanPostingTime,
      quickPlanRegionRestriction,
      quickPlanRegionName,
      onStart: (runId, flowStart) => {
        setIsCreatingQuickPlan(true);
        setGuidedFlowStartMs(flowStart);
        setGuidedFlowNowMs(flowStart);
        perfRunRef.current = {
          runId,
          startedAtMs: performance.now(),
        };
        console.log(`[HomePerf] start runId=${runId}`);
      },
      onPlanSaved: (planId) => {
        const currentRun = perfRunRef.current;
        const currentRunId = currentRun?.runId;
        if (currentRun && currentRunId) {
          currentRun.planSaveMs = performance.now() - currentRun.startedAtMs;
          console.log(
            `[HomePerf] runId=${currentRunId} plan_save_ms=${currentRun.planSaveMs.toFixed(1)}`
          );
        }
        setPendingAiGenerationNoticePlanId(planId);
        setShowHomePlanForm(false);
        setIsWeeklyPlanMarkedOnCalendar(true);
        const startDate = new Date(quickPlanStartDate);
        if (!Number.isNaN(startDate.getTime())) {
          focusCalendarDate(startDate);
        }
        setMonthlyCalendarPlan([]);
        setSelectedCalendarDateIso(null);
      },
      onPlanGenerated: async (planId) => {
        const runId = perfRunRef.current?.runId || null;
        const aiStartMs = performance.now();
        await generateMonthlyPlanFromAI({
          planId,
          startDate: quickPlanStartDate,
        });
        if (runId && perfRunRef.current?.runId === runId) {
          perfRunRef.current.monthlyAiGenerateMs = performance.now() - aiStartMs;
          console.log(
            `[HomePerf] runId=${runId} monthly_ai_generate_ms=${perfRunRef.current.monthlyAiGenerateMs.toFixed(1)}`
          );
        }
        await fetchDashboard();
      },
      onError: (error) => {
        console.error("クイック計画保存エラー:", error);
      },
      onFinally: () => {
        setIsCreatingQuickPlan(false);
      },
    });
  };

  const resetHomePlanCompletely = async () => {
    const planId = typeof dashboardData?.currentPlan?.id === "string" ? dashboardData.currentPlan.id : "";
    if (!planId) {
      setIsResetConfirming(false);
      toast.error("削除対象の計画が見つかりません");
      return;
    }

    setIsResettingPlan(true);
    await resetQuickPlanFlow({
      planId,
      clearPendingAiGenerationNotice,
      clearMonthlyCalendarState,
      resetQuickPlanForm,
      resetCalendarToToday,
      resetHomePostGenerator,
      clearWeeklyPlans,
      clearOverviewLists,
      fetchDashboard,
      setShowHomePlanForm,
      onError: (error) => {
        console.error("完全リセットエラー:", error);
      },
      onFinally: () => {
        setIsResettingPlan(false);
        setIsResetConfirming(false);
      },
    });
  };

  const {
    homePostType,
    setHomePostType,
    homePostScheduledDate,
    setHomePostScheduledDate,
    homePostScheduledTime,
    setHomePostScheduledTime,
    homePostPrompt,
    setHomePostPrompt,
    isGeneratingHomePost,
    homeGenerationProgress,
    isSavingHomeDraft,
    homeDraftTitle,
    setHomeDraftTitle,
    homeDraftContent,
    setHomeDraftContent,
    homeDraftHashtagsText,
    setHomeDraftHashtagsText,
    homeGeneratedCandidates,
    homeRecommendedCandidateVariant,
    hasAppliedHomeCandidate,
    setHasAppliedHomeCandidate,
    homeSelectedCandidateVariant,
    setHomeSelectedCandidateVariant,
    homeImageContext,
    setHomeImageContext,
    homeSelectedProductId,
    setHomeSelectedProductId,
    homeAttachedImage,
    setHomeAttachedImage,
    generatePostInHome,
    copyGeneratedPost,
    applyGeneratedCandidate,
    handleHomeImageChange,
    saveHomeDraft,
    resetHomePostGenerator,
  } = useHomePostGenerator({
    dashboardCurrentPlan: dashboardData?.currentPlan
      ? {
          operationPurpose: String(dashboardData.currentPlan.operationPurpose || ""),
          targetAudience: String(dashboardData.currentPlan.targetAudience || ""),
          regionRestriction: String(dashboardData.currentPlan.regionRestriction || ""),
          regionName: String(dashboardData.currentPlan.regionName || ""),
        }
      : null,
    quickPlanPurpose,
    quickPlanTargetAudience,
    quickPlanRegionRestriction,
    quickPlanRegionName,
    getKpiFocusFromPurpose,
    pickRandomBusinessHourTime,
  });
  const selectedProductName = onboardingProducts.find((product, index) => {
    const productSelectKey = String(product?.id || product?.name || `idx-${index}`);
    return productSelectKey === homeSelectedProductId;
  })?.name;

  const {
    calendarViewYear,
    calendarViewMonth,
    calendarCells,
    focusCalendarDate,
    resetCalendarToToday,
    isWeeklyPlanMarkedOnCalendar,
    setIsWeeklyPlanMarkedOnCalendar,
    isGeneratingMonthlyCalendarPlan,
    monthlyCalendarPlan,
    setMonthlyCalendarPlan,
    setSelectedCalendarDateIso,
    editableTimelineItems,
    editingTimelineKey,
    setEditingTimelineKey,
    timelineEditDraft,
    setTimelineEditDraft,
    handleStartEditTimeline,
    handleApplyTimelineEdit,
    handleCalendarPrevMonth,
    handleCalendarNextMonth,
    handleCalendarDayClick,
    clearMonthlyCalendarState,
    generateMonthlyPlanFromAI,
  } = useMonthlyCalendarSection({
    currentPlanId: typeof dashboardData?.currentPlan?.id === "string" ? dashboardData.currentPlan.id : undefined,
    quickPlanStartDate,
    quickPlanPurpose,
    currentPlanOperationPurpose: String(dashboardData?.currentPlan?.operationPurpose || ""),
    quickPlanFeedDays,
    quickPlanReelDays,
    quickPlanStoryDays,
    setQuickPlanStartDate,
    setQuickPlanFeedDays,
    setQuickPlanReelDays,
    setQuickPlanStoryDays,
  });

  const {
    isAdvisorOpen,
    advisorInput,
    setAdvisorInput,
    isAdvisorLoading,
    advisorPostType,
    setAdvisorPostType,
    selectedAdvisorProductId,
    setSelectedAdvisorProductId,
    advisorMessages,
    advisorSuggestedQuestions,
    selectedAdvisorProductName,
    showAdvisorProductConfigCard,
    advisorInputDisabled,
    advisorInputPlaceholder,
    sendAdvisorMessage,
    handleAdvisorProductSubmit,
    closeAdvisor,
    toggleAdvisor,
  } = useHomeAdvisor({
    userId: user?.uid,
    userName,
    onboardingProducts,
    homeSelectedProductId,
    selectedProductName,
    homeDraftTitle,
    homeDraftContent,
    homeAttachedImage,
  });
  const {
    generatingTimelinePostKey,
    handleGeneratePostFromTimelineItem,
  } = useTimelinePostGenerator({
    operationPurpose: String(dashboardData?.currentPlan?.operationPurpose || ""),
    targetAudience: String(dashboardData?.currentPlan?.targetAudience || ""),
    regionRestriction: dashboardData?.currentPlan?.regionRestriction === "restricted" ? "restricted" : "none",
    regionName: String(dashboardData?.currentPlan?.regionName || ""),
    quickPlanPurpose,
    quickPlanTargetAudience,
    quickPlanRegionRestriction,
    quickPlanRegionName,
    getKpiFocusFromPurpose,
    setHomePostType,
    setHomePostScheduledDate,
    setHomePostScheduledTime,
    setHomePostPrompt,
    setHomeDraftTitle,
    setHomeDraftContent,
    setHomeDraftHashtagsText,
    setHasAppliedHomeCandidate,
    postComposerRef,
  });

  const planStartDateObj = new Date(quickPlanStartDate);
  const planStartDateOnly = !Number.isNaN(planStartDateObj.getTime())
    ? new Date(planStartDateObj.getFullYear(), planStartDateObj.getMonth(), planStartDateObj.getDate())
    : null;
  const planEndDateOnly = planStartDateOnly
    ? new Date(planStartDateOnly.getFullYear(), planStartDateOnly.getMonth() + 1, planStartDateOnly.getDate() - 1)
    : null;

  const markedDays = buildMarkedDays({
    weeklyFeedPosts: weeklyPlans?.currentWeekPlan?.feedPosts || [],
    calendarViewYear,
    calendarViewMonth,
    planStartDateOnly,
    planEndDateOnly,
    weekDays: WEEK_DAYS,
    quickPlanFeedDays,
    quickPlanReelDays,
    quickPlanStoryDays,
    isWeeklyPlanMarkedOnCalendar,
    monthlyCalendarPlan,
  });

  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const rollingTimelineRows = buildRollingTimelineRows({
    today,
    items: editableTimelineItems,
    toLocalISODate,
    weekDays: WEEK_DAYS,
  });
  const timelineTotalCount = rollingTimelineRows.reduce((sum, row) => sum + row.items.length, 0);
  const tomorrowDateOnly = new Date(
    todayDateOnly.getFullYear(),
    todayDateOnly.getMonth(),
    todayDateOnly.getDate() + 1
  );
  const tomorrowIso = toLocalISODate(tomorrowDateOnly);
  const hasCalendarPlan = monthlyCalendarPlan.length > 0;
  const timelineTomorrowItems = editableTimelineItems.filter((item) => item.dateIso === tomorrowIso);
  const syncedTomorrowPreparations = buildTomorrowPreparationsFromTimeline(timelineTomorrowItems);
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
  const monthlyAlgorithmTheme = getMonthlyAlgorithmTheme(
    String(dashboardData?.currentPlan?.operationPurpose || "")
  );

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

        <div className="grid grid-cols-1 xl:[grid-template-columns:minmax(0,1fr)_420px] gap-6 items-start">
          <div className="min-w-0 space-y-6">
            <OverviewSection
              monthlyAlgorithmTheme={monthlyAlgorithmTheme}
              aiDirection={aiDirection}
              monthlyKPIsAvailable={Boolean(monthlyKPIs) || isLoadingMonthlyKPIs}
              isLoadingMonthlyKPIs={isLoadingMonthlyKPIs}
              monthlyResults={monthlyResults}
              showPlanCreatedBanner={showPlanCreatedBanner}
              onClosePlanCreatedBanner={() => setShowPlanCreatedBanner(false)}
              currentPlan={dashboardData?.currentPlan}
              isLoadingHomeUnanalyzedPosts={isLoadingHomeUnanalyzedPosts}
              homeUnanalyzedPosts={homeUnanalyzedPosts}
              isLoadingTomorrowPreparations={isLoadingTomorrowPreparations}
              visibleTomorrowPreparations={visibleTomorrowPreparations}
              removeMarkdown={removeMarkdown}
              getTimelineTypeBadgeClass={getTimelineTypeBadgeClass}
              onOpenMonthlyReport={() => router.push("/instagram/report")}
              onOpenAnalysis={({ postId, type }) => {
                const analysisHref =
                  type === "feed"
                    ? `/analytics/feed?postId=${postId}`
                    : type === "reel"
                      ? `/instagram/analytics/reel?postId=${postId}`
                      : "/instagram/posts";
                router.push(analysisHref);
              }}
              onApplyPreparationToGenerator={setGeneratorFromTask}
            />

            {/* 投稿生成 */}
            <HomePostGeneratorSection
              postComposerRef={postComposerRef}
              aiUsage={aiUsage}
              isAiUsageLoading={isAiUsageLoading}
              refreshUsage={refreshUsage}
              homePostScheduledDate={homePostScheduledDate}
              setHomePostScheduledDate={setHomePostScheduledDate}
              homePostScheduledTime={homePostScheduledTime}
              setHomePostScheduledTime={setHomePostScheduledTime}
              handleHomeImageChange={handleHomeImageChange}
              homeAttachedImage={homeAttachedImage}
              setHomeAttachedImage={setHomeAttachedImage}
              setHomeImageContext={setHomeImageContext}
              homeDraftTitle={homeDraftTitle}
              setHomeDraftTitle={setHomeDraftTitle}
              homeDraftContent={homeDraftContent}
              setHomeDraftContent={setHomeDraftContent}
              homeDraftHashtagsText={homeDraftHashtagsText}
              setHomeDraftHashtagsText={setHomeDraftHashtagsText}
              saveHomeDraft={saveHomeDraft}
              isSavingHomeDraft={isSavingHomeDraft}
              copyGeneratedPost={copyGeneratedPost}
              hasAppliedHomeCandidate={hasAppliedHomeCandidate}
              homePostType={homePostType}
              setHomePostType={setHomePostType}
              onboardingProducts={onboardingProducts}
              homeSelectedProductId={homeSelectedProductId}
              setHomeSelectedProductId={setHomeSelectedProductId}
              homePostPrompt={homePostPrompt}
              setHomePostPrompt={setHomePostPrompt}
              homeImageContext={homeImageContext}
              homeGeneratedCandidates={homeGeneratedCandidates}
              generatePostInHome={generatePostInHome}
              isGeneratingHomePost={isGeneratingHomePost}
              homeGenerationProgress={homeGenerationProgress}
              renderHomeGenerationLoader={renderHomeGenerationLoader}
              homeSelectedCandidateVariant={homeSelectedCandidateVariant}
              setHomeSelectedCandidateVariant={setHomeSelectedCandidateVariant}
              homeRecommendedCandidateVariant={homeRecommendedCandidateVariant}
              applyGeneratedCandidate={applyGeneratedCandidate}
            />
          </div>

          <div className="hidden min-w-0 space-y-6 md:block">
            {/* 右カラム: 計画導線 */}
            <PlanCardSection
              planCardRef={planCardRef}
              isPlanCardHighlighted={isPlanCardHighlighted}
              showPlanGateLoader={showPlanGateLoader}
              planGateProgress={planGateProgress}
              renderGateLoader={renderGateLoader}
              currentPlan={dashboardData?.currentPlan}
              isLoadingDashboard={isLoadingDashboard}
              showHomePlanForm={showHomePlanForm}
              quickPlanPurpose={quickPlanPurpose}
              setQuickPlanPurpose={setQuickPlanPurpose}
              quickPlanTargetFollowers={quickPlanTargetFollowers}
              setQuickPlanTargetFollowers={setQuickPlanTargetFollowers}
              quickPlanFeedDays={quickPlanFeedDays}
              quickPlanReelDays={quickPlanReelDays}
              quickPlanStoryDays={quickPlanStoryDays}
              quickPlanStartDate={quickPlanStartDate}
              setQuickPlanStartDate={setQuickPlanStartDate}
              quickPlanDetailOpen={quickPlanDetailOpen}
              setQuickPlanDetailOpen={setQuickPlanDetailOpen}
              quickPlanTargetAudience={quickPlanTargetAudience}
              setQuickPlanTargetAudience={setQuickPlanTargetAudience}
              quickPlanPostingTime={quickPlanPostingTime}
              setQuickPlanPostingTime={setQuickPlanPostingTime}
              quickPlanRegionRestriction={quickPlanRegionRestriction}
              setQuickPlanRegionRestriction={setQuickPlanRegionRestriction}
              quickPlanRegionName={quickPlanRegionName}
              setQuickPlanRegionName={setQuickPlanRegionName}
              isCreatingQuickPlan={isCreatingQuickPlan}
              isResettingPlan={isResettingPlan}
              isResetConfirming={isResetConfirming}
              setIsResetConfirming={setIsResetConfirming}
              getWeeklyCountLabel={getWeeklyCountLabel}
              parseSavedWeekDays={parseSavedWeekDays}
              sortWeekDays={sortWeekDays}
              getPostingTimeLabel={getPostingTimeLabel}
              toggleFeedDay={toggleFeedDay}
              toggleReelDay={toggleReelDay}
              toggleStoryDay={toggleStoryDay}
              onOpenPlanForm={openHomePlanForm}
              onEditCurrentPlan={handleEditCurrentPlan}
              onCreateQuickPlan={() => {
                void createQuickPlanInline();
              }}
              onResetHomePlan={() => {
                void resetHomePlanCompletely();
              }}
            />

            {/* 右カラム: 今月カレンダー */}
            <MonthlyCalendarSection
              calendarViewYear={calendarViewYear}
              calendarViewMonth={calendarViewMonth}
              handleCalendarPrevMonth={handleCalendarPrevMonth}
              handleCalendarNextMonth={handleCalendarNextMonth}
              showCalendarGateLoader={showCalendarGateLoader}
              calendarGateProgress={calendarGateProgress}
              renderGateLoader={renderGateLoader}
              calendarCells={calendarCells}
              today={today}
              markedDays={markedDays}
              handleCalendarDayClick={handleCalendarDayClick}
              isGeneratingMonthlyCalendarPlan={isGeneratingMonthlyCalendarPlan}
              isWeeklyPlanMarkedOnCalendar={isWeeklyPlanMarkedOnCalendar}
              planStartDateOnly={planStartDateOnly}
              planEndDateOnly={planEndDateOnly}
            />

            {/* 右カラム: タイムライン */}
            <WeeklyPlansSection
              showWeeklyGateLoader={showWeeklyGateLoader}
              weeklyGateProgress={weeklyGateProgress}
              renderGateLoader={renderGateLoader}
              timelineTotalCount={timelineTotalCount}
              isLoadingWeeklyPlans={isLoadingWeeklyPlans}
              rollingTimelineRows={rollingTimelineRows}
              generatingTimelinePostKey={generatingTimelinePostKey}
              editingTimelineKey={editingTimelineKey}
              timelineEditDraft={timelineEditDraft}
              setTimelineEditDraft={setTimelineEditDraft}
              setEditingTimelineKey={setEditingTimelineKey}
              getDirectionLabel={getDirectionLabel}
              getShortGuideText={getShortGuideText}
              getTimelineTypeBadgeClass={getTimelineTypeBadgeClass}
              getTimelineTypeLabel={getTimelineTypeLabel}
              handleStartEditTimeline={handleStartEditTimeline}
              handleGeneratePostFromTimelineItem={handleGeneratePostFromTimelineItem}
              handleApplyTimelineEdit={handleApplyTimelineEdit}
            />
          </div>

        </div>
      </div>
      <AdvisorSection
        isOpen={isAdvisorOpen}
        onClose={closeAdvisor}
        onToggleOpen={toggleAdvisor}
        aiUsage={aiUsage}
        isAiUsageLoading={isAiUsageLoading}
        refreshUsage={refreshUsage}
        advisorMessages={advisorMessages}
        showAdvisorProductConfigCard={showAdvisorProductConfigCard}
        advisorPostType={advisorPostType}
        setAdvisorPostType={setAdvisorPostType}
        onboardingProducts={onboardingProducts}
        selectedAdvisorProductId={selectedAdvisorProductId}
        setSelectedAdvisorProductId={setSelectedAdvisorProductId}
        selectedAdvisorProductName={selectedAdvisorProductName}
        onSubmitAdvisorProduct={handleAdvisorProductSubmit}
        isAdvisorLoading={isAdvisorLoading}
        advisorSuggestedQuestions={advisorSuggestedQuestions}
        sendAdvisorMessage={sendAdvisorMessage}
        advisorInput={advisorInput}
        setAdvisorInput={setAdvisorInput}
        advisorInputPlaceholder={advisorInputPlaceholder}
        advisorInputDisabled={advisorInputDisabled}
      />
    </SNSLayout>
  );
}
