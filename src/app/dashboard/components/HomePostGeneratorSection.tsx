"use client";

import Image from "next/image";
import { Bot } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { formatAiRemainingLabel } from "@/hooks/useAiUsageSummary";
import type { AiUsageSummary } from "@/hooks/useAiUsageSummary";
import type { HomeGeneratedCandidate, HomeGenerationProgressState } from "../types";

interface ProductOption {
  id?: string;
  name?: string;
}

interface AttachedImage {
  name: string;
  previewUrl: string;
  dataUrl: string;
}

interface HomePostGeneratorSectionProps {
  postComposerRef: React.RefObject<HTMLDivElement | null>;
  aiUsage: AiUsageSummary | null;
  isAiUsageLoading: boolean;
  refreshUsage: () => Promise<void>;
  homePostScheduledDate: string;
  setHomePostScheduledDate: React.Dispatch<React.SetStateAction<string>>;
  homePostScheduledTime: string;
  setHomePostScheduledTime: React.Dispatch<React.SetStateAction<string>>;
  handleHomeImageChange: (file: File | null) => Promise<void>;
  homeAttachedImage: AttachedImage | null;
  setHomeAttachedImage: React.Dispatch<React.SetStateAction<AttachedImage | null>>;
  setHomeImageContext: React.Dispatch<React.SetStateAction<string>>;
  homeDraftTitle: string;
  setHomeDraftTitle: React.Dispatch<React.SetStateAction<string>>;
  homeDraftContent: string;
  setHomeDraftContent: React.Dispatch<React.SetStateAction<string>>;
  homeDraftHashtagsText: string;
  setHomeDraftHashtagsText: React.Dispatch<React.SetStateAction<string>>;
  saveHomeDraft: () => Promise<void>;
  isSavingHomeDraft: boolean;
  copyGeneratedPost: () => Promise<void>;
  hasAppliedHomeCandidate: boolean;
  homePostType: "feed" | "reel" | "story";
  setHomePostType: React.Dispatch<React.SetStateAction<"feed" | "reel" | "story">>;
  onboardingProducts: ProductOption[];
  homeSelectedProductId: string;
  setHomeSelectedProductId: React.Dispatch<React.SetStateAction<string>>;
  homePostPrompt: string;
  setHomePostPrompt: React.Dispatch<React.SetStateAction<string>>;
  homeImageContext: string;
  homeGeneratedCandidates: HomeGeneratedCandidate[];
  generatePostInHome: () => Promise<void>;
  isGeneratingHomePost: boolean;
  homeGenerationProgress: HomeGenerationProgressState | null;
  renderHomeGenerationLoader: (params: {
    message: string;
    subMessage: string;
    progress: number;
  }) => ReactNode;
  homeSelectedCandidateVariant: "random" | "advice" | null;
  setHomeSelectedCandidateVariant: React.Dispatch<React.SetStateAction<"random" | "advice" | null>>;
  homeRecommendedCandidateVariant: "random" | "advice" | null;
  applyGeneratedCandidate: (candidate: HomeGeneratedCandidate) => void;
}

export function HomePostGeneratorSection({
  postComposerRef,
  aiUsage,
  isAiUsageLoading,
  refreshUsage,
  homePostScheduledDate,
  setHomePostScheduledDate,
  homePostScheduledTime,
  setHomePostScheduledTime,
  handleHomeImageChange,
  homeAttachedImage,
  setHomeAttachedImage,
  setHomeImageContext,
  homeDraftTitle,
  setHomeDraftTitle,
  homeDraftContent,
  setHomeDraftContent,
  homeDraftHashtagsText,
  setHomeDraftHashtagsText,
  saveHomeDraft,
  isSavingHomeDraft,
  copyGeneratedPost,
  hasAppliedHomeCandidate,
  homePostType,
  setHomePostType,
  onboardingProducts,
  homeSelectedProductId,
  setHomeSelectedProductId,
  homePostPrompt,
  setHomePostPrompt,
  homeImageContext,
  homeGeneratedCandidates,
  generatePostInHome,
  isGeneratingHomePost,
  homeGenerationProgress,
  renderHomeGenerationLoader,
  homeSelectedCandidateVariant,
  setHomeSelectedCandidateVariant,
  homeRecommendedCandidateVariant,
  applyGeneratedCandidate,
}: HomePostGeneratorSectionProps) {
  return (
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
          <div className="w-full px-1 py-1 sm:w-auto sm:min-w-[220px]">
            <div className="flex items-center justify-between gap-3 sm:justify-end">
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
        </div>
      </div>
      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-6 border border-gray-200 bg-white p-4 sm:p-6 lg:p-8 space-y-4">
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
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
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
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  void saveHomeDraft();
                }}
                disabled={isSavingHomeDraft}
                className="w-full px-4 py-2 bg-gradient-to-r from-[#FF8A15] to-orange-500 text-white text-sm hover:from-[#e67a0f] hover:to-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto"
              >
                {isSavingHomeDraft ? "保存中..." : "保存"}
              </button>
              <button
                onClick={() => {
                  void copyGeneratedPost();
                }}
                className="w-full px-3 py-2 border border-gray-300 text-xs text-gray-700 hover:bg-gray-50 transition-colors sm:w-auto sm:py-1.5"
              >
                この投稿文をコピー
              </button>
            </div>
            {!hasAppliedHomeCandidate && (
              <p className="text-xs text-gray-500">右側で候補を選んで「反映」を押すと自動入力されます。</p>
            )}
          </section>

          <aside className="lg:col-span-6 border border-gray-200 bg-white p-4 sm:p-6 lg:p-8 space-y-4">
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
                <p className="text-[11px] text-gray-500">マイページの商品・サービス情報が未設定です</p>
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
                onClick={() => {
                  void generatePostInHome();
                }}
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
                          参照元: {candidate.adviceReference?.postTitle || "直近の分析投稿"}{" "}
                          (
                          {candidate.adviceReference?.generatedAt
                            ? new Date(candidate.adviceReference.generatedAt).toLocaleString("ja-JP")
                            : "日時未取得"}
                          )
                        </p>
                      )}
                      <p className="text-sm font-semibold text-gray-900 break-words">{candidate.title || "タイトル未生成"}</p>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed break-words">{candidate.content || "本文未生成"}</p>
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
                  onClick={() => {
                    void generatePostInHome();
                  }}
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
  );
}
