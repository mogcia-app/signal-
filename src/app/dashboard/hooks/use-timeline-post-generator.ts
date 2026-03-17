"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { authFetch } from "@/utils/authFetch";
import { createIdempotencyKey } from "@/utils/idempotency";
import type { EditableTimelineItem } from "../types";
import { getShortGuideText } from "../lib/timeline-view";

interface UseTimelinePostGeneratorParams {
  operationPurpose: string;
  targetAudience: string;
  regionRestriction: "none" | "restricted";
  regionName: string;
  quickPlanPurpose: string;
  quickPlanTargetAudience: string;
  quickPlanRegionRestriction: "none" | "restricted";
  quickPlanRegionName: string;
  getKpiFocusFromPurpose: (purpose: string) => string;
  setHomePostType: (value: "feed" | "reel" | "story") => void;
  setHomePostScheduledDate: (value: string) => void;
  setHomePostScheduledTime: (value: string) => void;
  setHomePostPrompt: (value: string) => void;
  setHomeDraftTitle: (value: string) => void;
  setHomeDraftContent: (value: string) => void;
  setHomeDraftHashtagsText: (value: string) => void;
  setHasAppliedHomeCandidate: (value: boolean) => void;
  postComposerRef: React.RefObject<HTMLDivElement | null>;
}

export function useTimelinePostGenerator({
  operationPurpose,
  targetAudience,
  regionRestriction,
  regionName,
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
}: UseTimelinePostGeneratorParams) {
  const [generatingTimelinePostKey, setGeneratingTimelinePostKey] = useState<string | null>(null);
  const timelineGenerationInFlightRef = useRef<Set<string>>(new Set());

  const handleGeneratePostFromTimelineItem = async (item: EditableTimelineItem) => {
    if (generatingTimelinePostKey === item.key || timelineGenerationInFlightRef.current.has(item.key)) {
      return;
    }
    timelineGenerationInFlightRef.current.add(item.key);
    setGeneratingTimelinePostKey(item.key);
    try {
      const activePurpose = String(operationPurpose || "").trim() || quickPlanPurpose;
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
          kpiFocus: getKpiFocusFromPurpose(activePurpose),
          targetAudience: String(targetAudience || "").trim() || quickPlanTargetAudience.trim(),
          regionRestriction: regionRestriction === "restricted" ? "restricted" : quickPlanRegionRestriction,
          regionName: String(regionName || "").trim() || quickPlanRegionName.trim(),
          idempotencyKey: createIdempotencyKey(`home-post-timeline-${item.key}`),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 202 && result?.code === "request_in_progress") {
        toast("この投稿文は現在生成中です。完了まで少しお待ちください。");
        return;
      }
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
      timelineGenerationInFlightRef.current.delete(item.key);
    }
  };

  return {
    generatingTimelinePostKey,
    handleGeneratePostFromTimelineItem,
  };
}
