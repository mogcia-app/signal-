"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { Loader2, MessageCircleReply, Sparkle, Copy, Check, AlertTriangle, ChevronDown } from "lucide-react";

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
  const [isToneDropdownOpen, setIsToneDropdownOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ReplySuggestion[]>([]);
  const [guidance, setGuidance] = useState<string | undefined>(undefined);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showAdminWarning, setShowAdminWarning] = useState(false);

  // 連続フィードバックの追跡
  const feedbackHistoryRef = useRef<Array<{ category: string; timestamp: number }>>([]);
  const toneDropdownRef = useRef<HTMLDivElement>(null);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toneDropdownRef.current && !toneDropdownRef.current.contains(event.target as Node)) {
        setIsToneDropdownOpen(false);
      }
    };

    if (isToneDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isToneDropdownOpen]);

  const placeholder = useMemo(
    () =>
      "例：いつも投稿楽しみにしています！",
    [],
  );

  // コメント内容を分析してフィードバックを生成
  const analyzeComment = (comment: string): { feedback: string | null; category: string } => {
    const trimmed = comment.trim();
    const length = trimmed.length;

    if (length === 0) {
      return { feedback: null, category: "" };
    }

    // 短すぎる場合
    if (length < 10) {
      return {
        feedback: `コメントが短すぎるようです（${length}文字）。具体的な内容や感情（嬉しい、ありがとう、質問など）を含めると、より適切な返信案が生成されます。例えば「いつも楽しみにしています」ではなく「いつも投稿楽しみにしています！今回のレシピも真似してみました！」のように書くと良いでしょう。`,
        category: "too_short",
      };
    }

    // 長すぎる場合
    if (length > 500) {
      return {
        feedback: `コメントが長すぎるようです（${length}文字）。重要なポイントを100-200文字程度にまとめると、より焦点の絞られた返信案が生成されます。特に伝えたい内容や質問を明確にすることで、AIが適切な返信を提案しやすくなります。`,
        category: "too_long",
      };
    }

    // 感情や意図が不明確
    const hasEmotion = /[！？。！?]/g.test(trimmed) || 
      /ありがとう|嬉しい|感謝|質問|教えて|知りたい|気になる|興味/g.test(trimmed);
    
    if (!hasEmotion && length < 30) {
      return {
        feedback: `コメントに感情や意図が不明確なようです。以下のような情報を含めると、より適切な返信案が生成されます：\n• どの投稿についてのコメントか（「この投稿」「先日の投稿」など）\n• 具体的な感情や感想（「嬉しい」「参考になった」など）\n• 質問や要望がある場合は、その内容\n• 相手との関係性（「初めての方」「常連のお客様」など）`,
        category: "unclear_intent",
      };
    }

    // 問題なし
    return { feedback: null, category: "" };
  };

  const handleGenerate = async () => {
    const trimmedComment = commentText.trim();
    
    if (!trimmedComment) {
      setError("コメント内容を入力してください。");
      return;
    }

    // コメント内容を分析
    const analysis = analyzeComment(trimmedComment);
    setFeedback(analysis.feedback);

    // 連続フィードバックの追跡
    if (analysis.feedback) {
      const now = Date.now();
      feedbackHistoryRef.current.push({ category: analysis.category, timestamp: now });
      
      // 3分以内の同じカテゴリのフィードバックをカウント
      const recentSameCategory = feedbackHistoryRef.current.filter(
        (f) => f.category === analysis.category && (now - f.timestamp) < 180000
      );

      if (recentSameCategory.length >= 3) {
        setShowAdminWarning(true);
      } else {
        setShowAdminWarning(false);
      }
    } else {
      // フィードバックがない場合は履歴をリセット（成功したということ）
      feedbackHistoryRef.current = [];
      setShowAdminWarning(false);
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
      
      // 成功した場合は、同じカテゴリのフィードバックが続かなかった場合は履歴をクリア
      if (!feedback) {
        feedbackHistoryRef.current = [];
        setShowAdminWarning(false);
      }
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
    <div className="bg-white border border-slate-200 flex flex-col h-full">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <MessageCircleReply className="w-5 h-5 text-[#ff8a15]" />
          コメント返信アシスト
        </h3>
        <p className="text-sm text-gray-700 mt-1">
          コメントやDMに対する返信をAIが即座に提案します。文章はそのままコピペしてもOKです。
        </p>
      </div>

      <div className="p-4 space-y-4 flex-1 flex flex-col">
        <div>
          <label className="block text-xs font-bold text-gray-900 mb-2">受け取ったコメント</label>
          <textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            rows={2}
            className="w-full border border-gray-300 px-3 py-1.5 text-sm bg-white focus:border-[#ff8a15] focus:outline-none leading-tight"
            placeholder={placeholder}
          />
        </div>

        <div className="relative" ref={toneDropdownRef}>
          <label className="block text-xs font-bold text-gray-900 mb-2">返信トーンの希望</label>
          <button
            type="button"
            onClick={() => setIsToneDropdownOpen(!isToneDropdownOpen)}
            className="w-full border border-gray-300 px-3 py-2 text-sm bg-white focus:border-[#ff8a15] focus:outline-none flex items-center justify-between"
          >
            <span>
              {toneOptions.find((opt) => opt.value === tone)?.label || "選択してください"}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isToneDropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {isToneDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
              {toneOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setTone(option.value);
                    setIsToneDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    tone === option.value ? "bg-orange-50 text-orange-700" : "text-gray-700"
                  }`}
                >
                  <p className="font-bold">{option.label}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{option.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-2 px-4 bg-[#FF8A15] text-white text-sm font-medium hover:bg-[#e67a0f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkle className="w-4 h-4" />}
          {isGenerating ? "AI返信を生成中..." : "AIに返信案をつくってもらう"}
        </button>

        {error ? (
          <div className="border border-red-200 bg-white text-red-700 text-xs px-3 py-2">{error}</div>
        ) : null}

        {showAdminWarning ? (
          <div className="border border-orange-300 bg-orange-50 text-orange-800 text-xs px-3 py-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold mb-1">同じような改善提案が3回続いています</p>
                <p>コメント内容を改善しても、期待する返信案が得られない場合は、AI設定（トーン、マナー・ルールなど）が適切でない可能性があります。マイアカウントページでAI設定を確認するか、管理者にお問い合わせください。</p>
              </div>
            </div>
          </div>
        ) : null}

        {feedback ? (
          <div className="border border-blue-200 bg-blue-50 text-blue-800 text-xs px-3 py-2">
            <p className="font-bold mb-1">💡 より良い返信案を得るために</p>
            <p className="whitespace-pre-wrap">{feedback}</p>
            <p className="mt-2 text-blue-700">このフィードバックを参考に、コメント内容をより具体的にしてみてください。</p>
          </div>
        ) : null}

        {guidance ? (
          <div className="border border-dashed border-gray-300 bg-white text-xs text-gray-700 px-3 py-2">
            {guidance}
          </div>
        ) : null}

        {suggestions.length > 0 ? (
          <div className="space-y-3 flex-1 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div key={`suggestion-${index}`} className="border border-gray-200 p-3 bg-white">
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

