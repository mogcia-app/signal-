"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { authFetch } from "@/utils/authFetch";
import { createIdempotencyKey } from "@/utils/idempotency";
import type { AdvisorIntent, AdvisorSource, HomeAdvisorMessage } from "../types";

interface ProductOption {
  id?: string;
  name?: string;
}

interface AttachedImage {
  name: string;
  previewUrl: string;
  dataUrl: string;
}

interface UseHomeAdvisorParams {
  userId?: string;
  userName: string;
  onboardingProducts: ProductOption[];
  homeSelectedProductId: string;
  selectedProductName?: string;
  homeDraftTitle: string;
  homeDraftContent: string;
  homeAttachedImage: AttachedImage | null;
}

const ADVISOR_INITIAL_QUESTIONS = ["画像作成のコツを教えて", "動画作成のコツを教えて"];
const ADVISOR_MODE_QUESTIONS = ["投稿文章から作成します", "既存の商品から作成"];
const ADVISOR_FOLLOWUP_QUESTIONS = ["別トーンでもう1案ください", "他の相談もする"];

const stripMarkdown = (text: string): string =>
  String(text || "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/__/g, "")
    .replace(/_/g, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/~~/g, "")
    .trim();

export function useHomeAdvisor({
  userId,
  userName,
  onboardingProducts,
  homeSelectedProductId,
  selectedProductName,
  homeDraftTitle,
  homeDraftContent,
  homeAttachedImage,
}: UseHomeAdvisorParams) {
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
    ...ADVISOR_INITIAL_QUESTIONS,
  ]);
  const advisorSendInFlightRef = useRef(false);

  const selectedAdvisorProductName = onboardingProducts.find((product, index) => {
    const productSelectKey = String(product?.id || product?.name || `idx-${index}`);
    return productSelectKey === selectedAdvisorProductId;
  })?.name;

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

  const resetAdvisorFlow = useCallback(() => {
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
    setAdvisorSuggestedQuestions(ADVISOR_INITIAL_QUESTIONS);
  }, [userName]);

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
    if (!message || isAdvisorLoading || advisorSendInFlightRef.current) {return;}

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
        ADVISOR_MODE_QUESTIONS
      );
      return;
    }

    if (message === "動画作成のコツを教えて") {
      setAdvisorIntent("video-idea");
      setAdvisorSource("undecided");
      setAdvisorProductConfigured(false);
      appendAdvisorAssistantMessage(
        "動画作成のコツについてのご相談ですね！次に、作成方法を選んでください。",
        ADVISOR_MODE_QUESTIONS
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
    advisorSendInFlightRef.current = true;
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
          idempotencyKey: createIdempotencyKey("home-advisor-chat"),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (response.status === 202 && result?.code === "request_in_progress") {
        setAdvisorMessages((prev) => [
          ...prev,
          {
            id: `advisor-system-${Date.now()}`,
            role: "assistant",
            text: "前の回答を生成中です。完了まで少しお待ちください。",
          },
        ]);
        return;
      }
      if (!response.ok || !result?.success || !result?.data?.reply) {
        throw new Error(result?.error || "チャット応答の取得に失敗しました");
      }

      const assistantMessage: HomeAdvisorMessage = {
        id: `advisor-assistant-${Date.now()}`,
        role: "assistant",
        text: stripMarkdown(String(result.data.reply)),
      };
      setAdvisorMessages((prev) => [...prev, assistantMessage]);
      const nextSuggestedQuestions = normalizeAdvisorQuestions(result.data.suggestedQuestions);
      const isImageReply = isImageProposalReply(assistantMessage.text);
      const isVideoReply = isVideoProposalReply(assistantMessage.text);
      if (isImageReply || isVideoReply) {
        setAdvisorProductConfigured(true);
        setAdvisorSuggestedQuestions(ADVISOR_FOLLOWUP_QUESTIONS);
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
      advisorSendInFlightRef.current = false;
    }
  };

  const handleAdvisorProductSubmit = () => {
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
  };

  useEffect(() => {
    if (!isAdvisorOpen || !userId || hasLoadedAdvisorHistory) {return;}

    const loadAdvisorHistory = async () => {
      try {
        const response = await authFetch("/api/home/advisor-chat");
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result?.success || !result?.data) {
          resetAdvisorFlow();
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
              text: role === "assistant" ? stripMarkdown(text) : text,
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
            setAdvisorSuggestedQuestions(ADVISOR_FOLLOWUP_QUESTIONS);
          } else {
            const restoredQuestions = normalizeAdvisorQuestions(result.data.suggestedQuestions);
            setAdvisorSuggestedQuestions(
              restoredQuestions.length > 0 ? restoredQuestions : ADVISOR_INITIAL_QUESTIONS
            );
          }
        } else {
          resetAdvisorFlow();
        }
      } catch (error) {
        console.error("ホーム相談チャット履歴復元エラー:", error);
        resetAdvisorFlow();
      } finally {
        setHasLoadedAdvisorHistory(true);
      }
    };

    void loadAdvisorHistory();
  }, [hasLoadedAdvisorHistory, isAdvisorOpen, resetAdvisorFlow, userId]);

  const closeAdvisor = () => {
    setIsAdvisorOpen(false);
    setHasLoadedAdvisorHistory(false);
  };

  const toggleAdvisor = () => {
    setIsAdvisorOpen((prev) => {
      const next = !prev;
      if (!next) {
        setHasLoadedAdvisorHistory(false);
      }
      return next;
    });
  };

  const showAdvisorProductConfigCard = advisorSource === "product" && !advisorProductConfigured;
  const advisorInputDisabled = isAdvisorLoading || showAdvisorProductConfigCard;
  const advisorInputPlaceholder =
    advisorSource === "draft"
      ? "投稿文章を入力して送信してください"
      : showAdvisorProductConfigCard
        ? "吹き出し内で投稿タイプと商品・サービスを設定してください"
        : "相談内容を入力してください";

  return {
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
  };
}
