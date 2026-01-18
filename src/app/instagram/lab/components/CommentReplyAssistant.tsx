"use client";

import React, { useMemo, useState } from "react";
import { Loader2, MessageCircleReply, Sparkle, Copy, Check } from "lucide-react";

import { authFetch } from "../../../../utils/authFetch";

type CommentReplyAssistantProps = {
  postTitle?: string;
  postContent?: string;
  postType: "feed" | "reel" | "story";
  hashtags?: string[];
};

type ReplySuggestion = {
  reply: string;
  keyPoints?: string[];
  toneUsed?: string;
};

type CommentReplyResponse = {
  success: boolean;
  suggestions?: ReplySuggestion[];
  guidance?: string;
  error?: string;
};

const toneOptions: Array<{ value: string; label: string; description: string }> = [
  { value: "friendly", label: "親しみやすい", description: "柔らかくフレンドリーに返信したいとき" },
  { value: "polite", label: "丁寧・フォーマル", description: "敬語でしっかりお礼や説明をしたいとき" },
  { value: "energetic", label: "元気・カジュアル", description: "テンション高めに盛り上げたいとき" },
  { value: "professional", label: "誠実・落ち着き", description: "クレームや真剣な相談に落ち着いて対応したいとき" },
];

export const CommentReplyAssistant: React.FC<CommentReplyAssistantProps> = ({
  postTitle,
  postContent,
  postType,
  hashtags,
}) => {
  const [commentText, setCommentText] = useState("");
  const [tone, setTone] = useState<string>("friendly");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ReplySuggestion[]>([]);
  const [guidance, setGuidance] = useState<string | undefined>(undefined);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const placeholder = useMemo(
    () =>
      "例：\nいつも投稿楽しみにしています！今回のレシピも真似してみました！\n\nまたは\nこの商品、どこで買えますか？価格が知りたいです。",
    [],
  );

  const handleGenerate = async () => {
    if (!commentText.trim()) {
      setError("コメント内容を入力してください。");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setCopiedIndex(null);
    setGuidance(undefined);
    setSuggestions([]);

    try {
      const response = await authFetch("/api/ai/comment-reply", {
        method: "POST",
        body: JSON.stringify({
          comment: commentText.trim(),
          tone,
          postContext: {
            postTitle: postTitle ?? "",
            postContent: postContent ?? "",
            postType,
            hashtags: Array.isArray(hashtags) ? hashtags : [],
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || "AI返信の生成に失敗しました。");
      }

      const data = (await response.json()) as CommentReplyResponse;
      if (!data.success) {
        throw new Error(data.error || "AI返信の生成に失敗しました。");
      }

      setSuggestions(data.suggestions ?? []);
      setGuidance(data.guidance);
    } catch (err) {
      console.error("Comment reply assistant error:", err);
      setError(err instanceof Error ? err.message : "AI返信の生成に失敗しました。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (reply: string, index: number) => {
    try {
      await navigator.clipboard.writeText(reply);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((prev) => (prev === index ? null : prev)), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
      setError("クリップボードへのコピーに失敗しました。");
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-full flex flex-col">
      <div className="border-b border-slate-100 px-4 py-3 rounded-t-xl">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <MessageCircleReply className="w-4 h-4 text-orange-500" />
          コメント返信アシスト
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          コメントやDMに対する返信をAIが即座に提案します。文章はそのままコピペしてもOKです。
        </p>
      </div>

      <div className="p-4 space-y-4 flex-1 flex flex-col">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">受け取ったコメント</label>
          <textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            rows={5}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            placeholder={placeholder}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">返信トーンの希望</label>
          <div className="grid grid-cols-2 gap-2">
            {toneOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTone(option.value)}
                className={`border px-3 py-2 text-xs text-left rounded transition-colors ${
                  tone === option.value
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-gray-300 hover:border-orange-300 text-gray-700"
                }`}
              >
                <p className="font-semibold">{option.label}</p>
                <p className="text-[11px] text-gray-500 mt-1">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex items-center justify-center gap-2 w-full rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkle className="w-4 h-4" />}
          {isGenerating ? "AI返信を生成中..." : "AIに返信案をつくってもらう"}
        </button>

        {error ? (
          <div className="border border-red-200 bg-red-50 text-red-700 text-xs px-3 py-2 rounded">{error}</div>
        ) : null}

        {guidance ? (
          <div className="border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-600 px-3 py-2 rounded">
            {guidance}
          </div>
        ) : null}

        {suggestions.length > 0 ? (
          <div className="space-y-3 flex-1 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div key={`suggestion-${index}`} className="border border-gray-200 rounded p-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs font-semibold text-gray-700">返信案 {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => handleCopy(suggestion.reply, index)}
                    className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 transition-colors"
                  >
                    {copiedIndex === index ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        コピーしました
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        コピー
                      </>
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{suggestion.reply}</p>
                {suggestion.keyPoints?.length ? (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold text-gray-500 mb-1">ポイント</p>
                    <ul className="list-disc list-inside text-[11px] text-gray-500 space-y-0.5">
                      {suggestion.keyPoints.map((point, pointIndex) => (
                        <li key={`point-${index}-${pointIndex}`}>{point}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {suggestion.toneUsed ? (
                  <p className="text-[11px] text-gray-400 mt-2">想定トーン: {suggestion.toneUsed}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CommentReplyAssistant;

