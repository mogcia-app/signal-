"use client";

import { Bot, Send } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import toast from "react-hot-toast";
import { formatAiRemainingLabel } from "@/hooks/useAiUsageSummary";
import type { AiUsageSummary } from "@/hooks/useAiUsageSummary";
import type { HomeAdvisorMessage } from "../types";

interface ProductOption {
  id?: string;
  name?: string;
}

interface AdvisorSectionProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleOpen: () => void;
  aiUsage: AiUsageSummary | null;
  isAiUsageLoading: boolean;
  refreshUsage: () => Promise<void>;
  advisorMessages: HomeAdvisorMessage[];
  showAdvisorProductConfigCard: boolean;
  advisorPostType: "feed" | "reel" | "story";
  setAdvisorPostType: Dispatch<SetStateAction<"feed" | "reel" | "story">>;
  onboardingProducts: ProductOption[];
  selectedAdvisorProductId: string;
  setSelectedAdvisorProductId: Dispatch<SetStateAction<string>>;
  selectedAdvisorProductName?: string;
  onSubmitAdvisorProduct: () => void;
  isAdvisorLoading: boolean;
  advisorSuggestedQuestions: string[];
  sendAdvisorMessage: (message: string) => Promise<void>;
  advisorInput: string;
  setAdvisorInput: Dispatch<SetStateAction<string>>;
  advisorInputPlaceholder: string;
  advisorInputDisabled: boolean;
}

export function AdvisorSection({
  isOpen,
  onClose,
  onToggleOpen,
  aiUsage,
  isAiUsageLoading,
  refreshUsage,
  advisorMessages,
  showAdvisorProductConfigCard,
  advisorPostType,
  setAdvisorPostType,
  onboardingProducts,
  selectedAdvisorProductId,
  setSelectedAdvisorProductId,
  selectedAdvisorProductName,
  onSubmitAdvisorProduct,
  isAdvisorLoading,
  advisorSuggestedQuestions,
  sendAdvisorMessage,
  advisorInput,
  setAdvisorInput,
  advisorInputPlaceholder,
  advisorInputDisabled,
}: AdvisorSectionProps) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {isOpen && (
        <div className="w-[min(94vw,430px)] lg:w-[430px] h-[min(86vh,820px)] border border-gray-200 bg-white shadow-lg flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-orange-600" />
              <p className="text-xs font-semibold text-gray-800">投稿チャットβ</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              閉じる
            </button>
          </div>
          <div className="border-b border-gray-200 px-3 py-2">
            <div className="flex items-center justify-end gap-3">
              <p className="text-[11px] text-gray-700">
                {formatAiRemainingLabel(aiUsage, { loading: isAiUsageLoading })}
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
                      onSubmitAdvisorProduct();
                    }}
                    disabled={isAdvisorLoading}
                    className="w-full py-2 bg-[#FF8A15] text-white text-xs hover:bg-[#e67a0f] disabled:opacity-60"
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
        onClick={onToggleOpen}
        className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FF8A15] to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg hover:opacity-95"
      >
        <Bot size={18} />
        投稿チャットβ
      </button>
    </div>
  );
}
