"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { authFetch } from "@/utils/authFetch";
import { createIdempotencyKey } from "@/utils/idempotency";
import type { HomeGeneratedCandidate, HomeGenerationProgressState } from "../types";

const HOME_DRAFT_IMAGE_DATA_MAX_BYTES = 3_000_000;

interface AttachedImage {
  name: string;
  previewUrl: string;
  dataUrl: string;
}

interface UseHomePostGeneratorParams {
  dashboardCurrentPlan?: {
    operationPurpose?: string;
    targetAudience?: string;
    regionRestriction?: string;
    regionName?: string;
  } | null;
  quickPlanPurpose: string;
  quickPlanTargetAudience: string;
  quickPlanRegionRestriction: "none" | "restricted";
  quickPlanRegionName: string;
  getKpiFocusFromPurpose: (purpose: string) => string;
  pickRandomBusinessHourTime: () => string;
}

export function useHomePostGenerator({
  dashboardCurrentPlan,
  quickPlanPurpose,
  quickPlanTargetAudience,
  quickPlanRegionRestriction,
  quickPlanRegionName,
  getKpiFocusFromPurpose,
  pickRandomBusinessHourTime,
}: UseHomePostGeneratorParams) {
  const [homePostType, setHomePostType] = useState<"feed" | "reel" | "story">("feed");
  const [homePostScheduledDate, setHomePostScheduledDate] = useState("");
  const [homePostScheduledTime, setHomePostScheduledTime] = useState("");
  const [homePostPrompt, setHomePostPrompt] = useState("");
  const [isGeneratingHomePost, setIsGeneratingHomePost] = useState(false);
  const [homeGenerationProgress, setHomeGenerationProgress] = useState<HomeGenerationProgressState | null>(null);
  const [isSavingHomeDraft, setIsSavingHomeDraft] = useState(false);
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
  const [homeAttachedImage, setHomeAttachedImage] = useState<AttachedImage | null>(null);
  const homePostGenerationInFlightRef = useRef(false);

  const generatePostInHome = async () => {
    if (isGeneratingHomePost || homePostGenerationInFlightRef.current) {return;}
    homePostGenerationInFlightRef.current = true;
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
            if (response.status === 202 && result?.code === "request_in_progress") {
              throw new Error("REQUEST_IN_PROGRESS");
            }
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
            if (lastError.message === "REQUEST_IN_PROGRESS") {
              throw lastError;
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
      const operationPurpose = String(dashboardCurrentPlan?.operationPurpose || "").trim() || quickPlanPurpose;
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
        operationPurpose,
        kpiFocus: getKpiFocusFromPurpose(operationPurpose),
        targetAudience: String(dashboardCurrentPlan?.targetAudience || "").trim() || quickPlanTargetAudience.trim(),
        regionRestriction:
          dashboardCurrentPlan?.regionRestriction === "restricted" ? "restricted" : quickPlanRegionRestriction,
        regionName: String(dashboardCurrentPlan?.regionName || "").trim() || quickPlanRegionName.trim(),
      };

      const randomResult = await requestHomePostGeneration({
        ...basePayload,
        generationVariant: "random",
        idempotencyKey: createIdempotencyKey("home-post-random"),
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
        idempotencyKey: createIdempotencyKey("home-post-advice"),
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
      const recommendedCandidate = candidates[Math.floor(Math.random() * candidates.length)]?.variant ?? null;
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
      } else if (errorMessage === "REQUEST_IN_PROGRESS") {
        toast("すでに投稿生成を処理中です。完了まで少しお待ちください。");
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
      homePostGenerationInFlightRef.current = false;
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
    const text = [homeDraftTitle.trim(), homeDraftContent.trim(), hashtags].filter(Boolean).join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      toast.success("投稿案をコピーしました");
    } catch (error) {
      console.error("投稿案コピーエラー:", error);
      toast.error("コピーに失敗しました");
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

  const resetHomePostGenerator = () => {
    setHomePostType("feed");
    setHomePostScheduledDate("");
    setHomePostScheduledTime("");
    setHomePostPrompt("");
    setHomeDraftTitle("");
    setHomeDraftContent("");
    setHomeDraftHashtagsText("");
    setHomeGeneratedCandidates([]);
    setHasAppliedHomeCandidate(false);
    setHomeSelectedCandidateVariant(null);
    setHomeRecommendedCandidateVariant(null);
    setHomeImageContext("");
    setHomeSelectedProductId("");
    if (homeAttachedImage?.previewUrl) {
      URL.revokeObjectURL(homeAttachedImage.previewUrl);
    }
    setHomeAttachedImage(null);
  };

  useEffect(() => {
    return () => {
      if (homeAttachedImage?.previewUrl) {
        URL.revokeObjectURL(homeAttachedImage.previewUrl);
      }
    };
  }, [homeAttachedImage]);

  return {
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
  };
}
