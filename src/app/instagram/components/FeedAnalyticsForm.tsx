"use client";

import React, { useState, type ReactNode } from "react";
import Image from "next/image";
import {
  Heart,
  MessageCircle,
  Share,
  Save,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  X,
  Plus,
  Trash2,
  Sparkles,
  Clipboard,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { InputData } from "./types";
import { useAuth } from "../../../contexts/auth-context";
import { authFetch } from "../../../utils/authFetch";

interface FeedAnalyticsFormProps {
  data: InputData;
  onChange: (data: InputData) => void;
  onSave: (sentimentData?: {
    sentiment: "satisfied" | "dissatisfied" | null;
    memo: string;
  }) => void;
  isLoading: boolean;
  postData?: {
    id: string;
    title: string;
    content: string;
    hashtags: string[];
    postType: "feed" | "reel" | "story";
  } | null;
  aiInsightsSection?: ReactNode;
}

const FeedAnalyticsForm: React.FC<FeedAnalyticsFormProps> = ({
  data,
  onChange,
  onSave,
  isLoading,
  postData,
  aiInsightsSection,
}) => {
  const { user } = useAuth();
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [sentiment, setSentiment] = useState<"satisfied" | "dissatisfied" | null>(null);
  const [memo, setMemo] = useState("");
  const [aiAdvice, setAiAdvice] = useState<{
    summary: string;
    strengths: string[];
    improvements: string[];
    nextActions: string[];
    directionAlignment?: "一致" | "乖離" | "要注意" | null;
    directionComment?: string | null;
    goalAchievementProspect?: "high" | "medium" | "low" | null;
    goalAchievementReason?: string | null;
    // learning mode用のフィールド
    patternMatch?: "match" | "partial" | "mismatch" | null;
    patternScore?: number | null;
    patternRank?: "core" | "edge" | "outlier" | null;
    patternReason?: string | null;
    patternBasedPrediction?: "今後フォロワーが増える見込み" | "伸びにくい" | "判断保留" | null;
    // 洞察情報
    insights?: {
      audienceInsight?: string | null;
      engagementInsight?: string | null;
      reachSourceInsight?: string | null;
    } | null;
  } | null>(null);
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);
  const [isAutoGeneratingAdvice, setIsAutoGeneratingAdvice] = useState(false);
  const [adviceError, setAdviceError] = useState<string | null>(null);
  const [pasteSuccess, setPasteSuccess] = useState<string | null>(null);
  const [isAutoSaved, setIsAutoSaved] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<0 | 1 | 2 | 3>(0); // 0: 確認中, 1: 分析中, 2: 整理中, 3: 完了
  const [showAdviceProgressively, setShowAdviceProgressively] = useState(false);

  // Instagram分析データの貼り付け処理
  const handlePasteInstagramData = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = parseInstagramFeedData(text);
      
      if (!parsed.hasData) {
        setToastMessage({ 
          message: "クリップボードにInstagram分析データが見つかりませんでした。", 
          type: "error" 
        });
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }

      // データをフォームに反映
      const updatedData = { ...data };
      
      if (parsed.reach !== null) {
        updatedData.reach = String(parsed.reach);
      }
      if (parsed.reachFollowerPercent !== null) {
        updatedData.reachFollowerPercent = String(parsed.reachFollowerPercent);
      }
      if (parsed.interactionCount !== null) {
        updatedData.interactionCount = String(parsed.interactionCount);
      }
      if (parsed.interactionFollowerPercent !== null) {
        updatedData.interactionFollowerPercent = String(parsed.interactionFollowerPercent);
      }
      if (parsed.likes !== null) {
        updatedData.likes = String(parsed.likes);
      }
      if (parsed.comments !== null) {
        updatedData.comments = String(parsed.comments);
      }
      if (parsed.saves !== null) {
        updatedData.saves = String(parsed.saves);
      }
      if (parsed.shares !== null) {
        updatedData.shares = String(parsed.shares);
      }
      if (parsed.reachedAccounts !== null) {
        updatedData.reachedAccounts = String(parsed.reachedAccounts);
      }
      if (parsed.profileVisits !== null) {
        updatedData.profileVisits = String(parsed.profileVisits);
      }
      if (parsed.externalLinkTaps !== null) {
        updatedData.externalLinkTaps = String(parsed.externalLinkTaps);
      }
      if (parsed.reachSourceFeed !== null) {
        updatedData.reachSourceFeed = String(parsed.reachSourceFeed);
      }
      if (parsed.reachSourceProfile !== null) {
        updatedData.reachSourceProfile = String(parsed.reachSourceProfile);
      }
      if (parsed.reachSourceOther !== null) {
        updatedData.reachSourceOther = String(parsed.reachSourceOther);
      }
      if (parsed.profileFollows !== null) {
        updatedData.profileFollows = String(parsed.profileFollows);
      }

      onChange(updatedData);
      
      const filledFields = Object.values(parsed).filter(v => v !== null && v !== false).length - 1; // hasDataを除く
      setPasteSuccess(`${filledFields}個のフィールドにデータを入力しました`);
      setToastMessage({ 
        message: `${filledFields}個のフィールドにデータを入力しました`, 
        type: "success" 
      });
      setTimeout(() => {
        setToastMessage(null);
        setPasteSuccess(null);
      }, 3000);
    } catch (error) {
      console.error("貼り付けエラー:", error);
      setToastMessage({ 
        message: "クリップボードの読み取りに失敗しました。", 
        type: "error" 
      });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Instagram分析データの解析（フィード用）
  const parseInstagramFeedData = (text: string) => {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line);
    const result: {
      hasData: boolean;
      reach: number | null;
      reachFollowerPercent: number | null;
      interactionCount: number | null;
      interactionFollowerPercent: number | null;
      likes: number | null;
      comments: number | null;
      saves: number | null;
      shares: number | null;
      reachedAccounts: number | null;
      profileVisits: number | null;
      externalLinkTaps: number | null;
      reachSourceFeed: number | null;
      reachSourceProfile: number | null;
      reachSourceOther: number | null;
      profileFollows: number | null;
    } = {
      hasData: false,
      reach: null,
      reachFollowerPercent: null,
      interactionCount: null,
      interactionFollowerPercent: null,
      likes: null,
      comments: null,
      saves: null,
      shares: null,
      reachedAccounts: null,
      profileVisits: null,
      externalLinkTaps: null,
      reachSourceFeed: null,
      reachSourceProfile: null,
      reachSourceOther: null,
      profileFollows: null,
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];
      const prevLine = lines[i - 1];

      // ビュー/閲覧数/リーチ
      if ((line === "ビュー" || line.includes("閲覧数") || line.includes("リーチ")) && nextLine && /^\d+$/.test(nextLine)) {
        result.reach = parseInt(nextLine, 10);
        result.hasData = true;
      }

      // フォロワー以外（閲覧数の） - ビューの下にある場合
      if (line === "フォロワー以外" && nextLine && prevLine && (prevLine === "ビュー" || prevLine.includes("閲覧数") || prevLine.includes("リーチ"))) {
        const percent = parseFloat(nextLine.replace("%", ""));
        if (!isNaN(percent)) {
          result.reachFollowerPercent = percent;
          result.hasData = true;
        }
      }

      // ホーム → フィード
      if (line === "ホーム" && nextLine && /^\d+$/.test(nextLine)) {
        result.reachSourceFeed = parseInt(nextLine, 10);
        result.hasData = true;
      }

      // プロフィール（閲覧ソース）
      if (line === "プロフィール" && nextLine && /^\d+$/.test(nextLine) && prevLine !== "プロフィールのアクティビティ" && !prevLine?.includes("プロフィールへの")) {
        result.reachSourceProfile = parseInt(nextLine, 10);
        result.hasData = true;
      }

      // その他（閲覧ソース）
      if (line === "その他" && nextLine && /^\d+$/.test(nextLine) && !prevLine?.includes("フォロワー")) {
        result.reachSourceOther = parseInt(nextLine, 10);
        result.hasData = true;
      }

      // リーチしたアカウント数
      if (line.includes("リーチしたアカウント数") && nextLine && /^\d+$/.test(nextLine)) {
        result.reachedAccounts = parseInt(nextLine, 10);
        result.hasData = true;
      }

      // インタラクション数（単独の行）
      if (line === "インタラクション" && nextLine && /^\d+$/.test(nextLine)) {
        result.interactionCount = parseInt(nextLine, 10);
        result.hasData = true;
      }

      // インタラクションのフォロワー以外
      if (line === "フォロワー以外" && prevLine === "インタラクション" && nextLine) {
        const percent = parseFloat(nextLine.replace("%", ""));
        if (!isNaN(percent)) {
          result.interactionFollowerPercent = percent;
          result.hasData = true;
        }
      }

      // いいね
      if ((line.includes("いいね") || line === "「いいね！」") && nextLine && /^\d+$/.test(nextLine)) {
        result.likes = parseInt(nextLine, 10);
        result.hasData = true;
      }

      // コメント
      if (line === "コメント" && nextLine && /^\d+$/.test(nextLine) && !prevLine?.includes("インタラクション")) {
        result.comments = parseInt(nextLine, 10);
        result.hasData = true;
      }

      // 保存数
      if (line === "保存数" && nextLine && /^\d+$/.test(nextLine)) {
        result.saves = parseInt(nextLine, 10);
        result.hasData = true;
      }

      // シェア数
      if (line === "シェア数" && nextLine && /^\d+$/.test(nextLine)) {
        result.shares = parseInt(nextLine, 10);
        result.hasData = true;
      }

      // プロフィールへのアクセス
      if (line === "プロフィールへのアクセス" && nextLine && /^\d+$/.test(nextLine)) {
        result.profileVisits = parseInt(nextLine, 10);
        result.hasData = true;
      }

      // 外部リンクのタップ数
      if (line === "外部リンクのタップ数" && nextLine && /^\d+$/.test(nextLine)) {
        result.externalLinkTaps = parseInt(nextLine, 10);
        result.hasData = true;
      }

      // フォロー数
      if (line === "フォロー数" && nextLine && /^\d+$/.test(nextLine)) {
        result.profileFollows = parseInt(nextLine, 10);
        result.hasData = true;
      }
    }

    return result;
  };

  const handleInputChange = (field: keyof InputData, value: string) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  const handleAudienceGenderChange = (
    field: keyof InputData["audience"]["gender"],
    value: string,
  ) => {
    onChange({
      ...data,
      audience: {
        ...data.audience,
        gender: {
          ...data.audience.gender,
          [field]: value,
        },
      },
    });
  };

  const handleAudienceAgeChange = (field: keyof InputData["audience"]["age"], value: string) => {
    onChange({
      ...data,
      audience: {
        ...data.audience,
        age: {
          ...data.audience.age,
          [field]: value,
        },
      },
    });
  };

  const handleGenerateAdvice = async (autoSave: boolean = false) => {
    if (!user?.uid || !postData?.id) {
      setAdviceError("ユーザー情報または投稿情報が不足しています");
      return;
    }

    setIsGeneratingAdvice(true);
    setAdviceError(null);
    setAnalysisStep(0); // 投稿内容確認中
    setShowAdviceProgressively(false);

    // 段階的な思考プロセスを表示
    setTimeout(() => setAnalysisStep(1), 2000); // 2秒後: 傾向分析中
    setTimeout(() => setAnalysisStep(2), 5000); // 5秒後: 改善ポイント整理中

    try {
      const response = await authFetch("/api/ai/post-insight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          postId: postData.id,
        }),
      });

      if (!response.ok) {
        let errorText = "";
        let errorJson = null;
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            errorJson = await response.json();
            errorText = errorJson?.error || errorJson?.message || JSON.stringify(errorJson);
          } else {
            errorText = await response.text();
          }
        } catch (e) {
          // レスポンスの読み取りに失敗した場合は無視
          errorText = `HTTP ${response.status} ${response.statusText}`;
        }
        console.error("AIアドバイス生成エラー詳細:", {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          errorText,
          errorJson,
        });
        throw new Error(`AIアドバイス生成エラー: ${response.status}${errorText ? ` - ${errorText}` : ""}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "AIアドバイスの生成に失敗しました");
      }

      const insightData = result.data;
      
      // デバッグログ（本番環境では削除可能）
      console.log("[FeedAnalyticsForm] AIアドバイス受信:", {
        hasPatternMatch: !!insightData.patternMatch,
        hasPatternScore: !!insightData.patternScore,
        hasPatternRank: !!insightData.patternRank,
        goalAchievementProspect: insightData.goalAchievementProspect,
        goalAchievementReason: insightData.goalAchievementReason,
      });
      
      const newAiAdvice = {
        summary: insightData.summary,
        strengths: insightData.strengths || [],
        improvements: insightData.improvements || [],
        nextActions: insightData.nextActions || [],
        directionAlignment: insightData.directionAlignment || null,
        directionComment: insightData.directionComment || null,
        goalAchievementProspect: insightData.goalAchievementProspect || null,
        goalAchievementReason: insightData.goalAchievementReason || null,
        // learning mode用のフィールド（存在する場合のみ）
        patternMatch: insightData.patternMatch || null,
        patternScore: insightData.patternScore || null,
        patternRank: insightData.patternRank || null,
        patternReason: insightData.patternReason || null,
        patternBasedPrediction: insightData.patternBasedPrediction || null,
      };
      
      setAnalysisStep(3); // 完了
      setAiAdvice(newAiAdvice);
      
      // 段階的にアドバイスを表示（まずサマリー、その後詳細）
      setTimeout(() => {
        setShowAdviceProgressively(true);
      }, 300);

      // 自動保存が有効な場合、生成後に自動保存
      if (autoSave && user?.uid && postData?.id) {
        try {
          // AIアドバイスを保存
          await authFetch("/api/ai/post-summaries", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.uid,
              postId: postData.id,
              summary: newAiAdvice.summary,
              insights: newAiAdvice.strengths || [],
              recommendedActions: [...(newAiAdvice.improvements || []), ...(newAiAdvice.nextActions || [])],
              category: postData.postType || "feed",
              postTitle: postData.title || "",
              postHashtags: postData.hashtags || [],
            }),
          });

          // goalAchievementProspectを直接保存
          if (newAiAdvice.goalAchievementProspect) {
            const sentimentMap: Record<"high" | "medium" | "low", "positive" | "negative" | "neutral"> = {
              high: "positive",
              medium: "neutral",
              low: "negative",
            };

            const prospect = newAiAdvice.goalAchievementProspect as "high" | "medium" | "low";
            await authFetch("/api/ai/feedback", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId: user.uid,
                postId: postData.id,
                sentiment: sentimentMap[prospect],
                goalAchievementProspect: prospect,
                goalAchievementReason: newAiAdvice.goalAchievementReason || undefined,
                comment: memo?.trim() ? memo.trim() : undefined,
              }),
            });
          }
          setIsAutoSaved(true);
        } catch (error) {
          console.error("AIアドバイス自動保存エラー:", error);
          // 保存に失敗しても続行
        }
      }
    } catch (err) {
      console.error("AIアドバイス生成エラー:", err);
      let errorMessage = "AIアドバイスの生成に失敗しました";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      } else if (err && typeof err === "object" && "message" in err) {
        errorMessage = String(err.message);
      }
      setAdviceError(errorMessage);
    } finally {
      setIsGeneratingAdvice(false);
    }
  };

  const handleSave = async () => {
    try {
      // AIアドバイスを保存
      if (aiAdvice && user?.uid && postData?.id) {
        try {
          await authFetch("/api/ai/post-summaries", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.uid,
              postId: postData.id,
              summary: aiAdvice.summary,
              insights: aiAdvice.strengths || [],
              recommendedActions: [...(aiAdvice.improvements || []), ...(aiAdvice.nextActions || [])],
              category: postData.postType || "feed",
              postTitle: postData.title || "",
              postHashtags: postData.hashtags || [],
            }),
          });
        } catch (error) {
          console.error("AIアドバイス保存エラー:", error);
          // 保存に失敗しても続行
        }
      }

      // 分析データを保存（goalAchievementProspectをsentimentとして保存するため、後方互換性を保つ）
      const sentimentForSave = aiAdvice?.goalAchievementProspect === "high" ? "satisfied" 
        : aiAdvice?.goalAchievementProspect === "low" ? "dissatisfied" 
        : sentiment; // 既存のsentimentがあればそれを使用、なければnull
      await onSave({ sentiment: sentimentForSave as "satisfied" | "dissatisfied" | null, memo });

      // goalAchievementProspectを直接保存（aiAdviceがある場合）
      if (aiAdvice?.goalAchievementProspect && user?.uid && postData?.id) {
        try {
          const sentimentMap: Record<"high" | "medium" | "low", "positive" | "negative" | "neutral"> = {
            high: "positive",
            medium: "neutral",
            low: "negative",
          };

          await authFetch("/api/ai/feedback", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.uid,
              postId: postData.id,
              sentiment: sentimentMap[aiAdvice.goalAchievementProspect as "high" | "medium" | "low"], // 後方互換性のため
              goalAchievementProspect: aiAdvice.goalAchievementProspect,
              goalAchievementReason: aiAdvice.goalAchievementReason || undefined,
              comment: memo?.trim() ? memo.trim() : undefined,
            }),
          });
        } catch (error) {
          console.error("目標達成見込み保存エラー:", error);
          // 保存に失敗しても続行
        }
      }

      // 保存は裏で行い、UIには表示しない
      // 保存成功後、postIdがある場合、自動的にAIアドバイスを生成
      if (user?.uid && postData?.id && !aiAdvice) {
        // 即座にAIアドバイス生成を開始（保存成功メッセージは表示しない）
        setIsAutoGeneratingAdvice(true);
        setAdviceError(null);
        
        // AIアドバイス生成を開始
        handleGenerateAdvice(true).finally(() => {
          setIsAutoGeneratingAdvice(false);
        });
      }
    } catch (error) {
      console.error("保存エラー:", error);
      setToastMessage({ 
        message: "保存に失敗しました", 
        type: "error" 
      });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleAddCommentThread = () => {
    onChange({
      ...data,
      commentThreads: [...data.commentThreads, { comment: "", reply: "" }],
    });
  };

  const handleCommentThreadChange = (
    index: number,
    field: "comment" | "reply",
    value: string
  ) => {
    const updated = data.commentThreads.map((thread, idx) =>
      idx === index
        ? {
            ...thread,
            [field]: value,
          }
        : thread
    );
    onChange({
      ...data,
      commentThreads: updated,
    });
  };

  const handleRemoveCommentThread = (index: number) => {
    const updated = data.commentThreads.filter((_, idx) => idx !== index);
    onChange({
      ...data,
      commentThreads: updated,
    });
  };

  return (
    <>
      {/* トースト通知 */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-md ${
            toastMessage.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {toastMessage.type === 'success' ? (
              <CheckCircle size={20} className="flex-shrink-0" />
            ) : (
              <X size={20} className="flex-shrink-0" />
            )}
            <p className="font-medium flex-1">{toastMessage.message}</p>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-2 text-white hover:text-gray-200 transition-colors flex-shrink-0"
              aria-label="閉じる"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      
      <div className="bg-white shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
          フィード分析データ入力
        </h2>
        <p className="text-sm text-gray-600">
          フィード投稿のパフォーマンスデータを入力してください
        </p>
      </div>

      <div className="space-y-4">
        {/* 投稿情報 */}
        <div className="p-4 bg-gray-50 space-y-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">投稿情報</h3>

          {postData ? (
            <div className="p-3 border border-dashed border-gray-300 bg-white text-xs text-gray-600">
              <p className="font-semibold text-gray-700">投稿プランから自動入力されています。</p>
              <p className="mt-1">
                そのまま保存すると元の投稿プランは更新されません。必要に応じて自由に編集してください。
              </p>
            </div>
          ) : null}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">タイトル</label>
              <input
                type="text"
                value={data.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
                placeholder="フィード投稿のタイトルを入力"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">内容</label>
              <textarea
                value={data.content}
                onChange={(e) => handleInputChange("content", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
                rows={3}
                placeholder="フィード投稿の内容を入力"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">ハッシュタグ</label>
              <input
                type="text"
                value={data.hashtags}
                onChange={(e) => handleInputChange("hashtags", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
                placeholder="#hashtag1 #hashtag2"
                disabled={isLoading}
              />
            </div>
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">投稿日</label>
              <input
                type="date"
                value={data.publishedAt}
                onChange={(e) => handleInputChange("publishedAt", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
                disabled={isLoading}
              />
            </div>
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">投稿時間</label>
              <input
                type="time"
                value={data.publishedTime}
                onChange={(e) => handleInputChange("publishedTime", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Instagram分析データの貼り付け */}
        <div className="p-4 border-t border-gray-200 bg-orange-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Instagram分析データの貼り付け</h3>
            <button
              type="button"
              onClick={handlePasteInstagramData}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-[#ff8a15] hover:bg-[#e6760f] transition-colors gap-1.5"
            >
              <Clipboard size={14} />
              Instagram分析データを貼り付け
            </button>
          </div>
          <p className="text-xs text-gray-600">
            Instagramの分析画面からデータをコピーして、このボタンをクリックすると自動で入力されます。
          </p>
          {pasteSuccess && (
            <p className="text-xs text-green-600 mt-2">{pasteSuccess}</p>
          )}
        </div>

        {/* フィード反応データ */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
            <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
            フィード反応データ
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
                <Heart className="w-4 h-4 mr-2 text-red-500" />
                いいね数
              </label>
              <input
                type="number"
                min="0"
                value={data.likes}
                onChange={(e) => handleInputChange("likes", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
                <MessageCircle className="w-4 h-4 mr-2 text-blue-500" />
                コメント数
              </label>
              <input
                type="number"
                min="0"
                value={data.comments}
                onChange={(e) => handleInputChange("comments", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
                <Share className="w-4 h-4 mr-2 text-green-500" />
                シェア数
              </label>
              <input
                type="number"
                min="0"
                value={data.shares}
                onChange={(e) => handleInputChange("shares", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
                <Share className="w-4 h-4 mr-2 text-orange-500" />
                リポスト数
              </label>
              <input
                type="number"
                min="0"
                value={data.reposts}
                onChange={(e) => handleInputChange("reposts", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
                <Save className="w-4 h-4 mr-2 text-indigo-500" />
                保存数
              </label>
              <input
                type="number"
                min="0"
                value={data.saves}
                onChange={(e) => handleInputChange("saves", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
                <Plus className="w-4 h-4 mr-2 text-green-500" />
                フォロワー増加数
              </label>
              <input
                type="number"
                min="0"
                value={data.followerIncrease || ""}
                onChange={(e) => handleInputChange("followerIncrease", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* コメントと返信ログ */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center">
              <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
              コメントと返信ログ
            </h3>
            <button
              type="button"
              onClick={handleAddCommentThread}
              className="inline-flex items-center px-3 py-1 text-xs font-semibold text-white bg-[#ff8a15] hover:bg-[#e67a0f] transition-colors"
            >
              <Plus className="w-3 h-3 mr-1" />
              コメントを追加
            </button>
          </div>
          {data.commentThreads.length === 0 ? (
            <p className="text-xs text-gray-600">
              コメント内容と返信メモを記録すると、振り返りがスムーズになります。＋ボタンでログを追加してください。
            </p>
          ) : (
            <div className="space-y-4">
              {data.commentThreads.map((thread, index) => (
                <div key={`comment-thread-${index}`} className="border border-gray-200 bg-white p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">コメント内容</label>
                    <textarea
                      value={thread.comment}
                      onChange={(e) => handleCommentThreadChange(index, "comment", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
                      placeholder="ユーザーからのコメント内容を入力"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">返信内容・フォロー対応メモ</label>
                    <textarea
                      value={thread.reply}
                      onChange={(e) => handleCommentThreadChange(index, "reply", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
                      placeholder="返信した内容、フォローアップのポイントなど"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveCommentThread(index)}
                      className="inline-flex items-center text-xs text-gray-500 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 概要 */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
            <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
            概要
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">閲覧数</label>
                  <input
                    type="number"
                    min="0"
                    value={data.reach}
                    onChange={(e) => handleInputChange("reach", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="閲覧数"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    フォロワー外
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={data.reachFollowerPercent || ""}
                    onChange={(e) => handleInputChange("reachFollowerPercent", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="フォロワー外"
                  />
                </div>
              </div>
            </div>
            <div>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    インタラクション数
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={data.interactionCount || ""}
                    onChange={(e) => handleInputChange("interactionCount", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="インタラクション数"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    フォロワー外
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={data.interactionFollowerPercent || ""}
                    onChange={(e) =>
                      handleInputChange("interactionFollowerPercent", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="フォロワー外"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 閲覧上位ソース */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
            <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
            閲覧上位ソース
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">プロフィール</label>
              <input
                type="number"
                min="0"
                value={data.reachSourceProfile || ""}
                onChange={(e) => handleInputChange("reachSourceProfile", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">フィード</label>
              <input
                type="number"
                min="0"
                value={data.reachSourceFeed || ""}
                onChange={(e) => handleInputChange("reachSourceFeed", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">発見</label>
              <input
                type="number"
                min="0"
                value={data.reachSourceExplore || ""}
                onChange={(e) => handleInputChange("reachSourceExplore", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">検索</label>
              <input
                type="number"
                min="0"
                value={data.reachSourceSearch || ""}
                onChange={(e) => handleInputChange("reachSourceSearch", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">その他</label>
              <input
                type="number"
                min="0"
                value={data.reachSourceOther || ""}
                onChange={(e) => handleInputChange("reachSourceOther", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* リーチしたアカウント */}
        <div className="p-4 border-t border-gray-200">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                リーチしたアカウント数
              </label>
              <input
                type="number"
                min="0"
                value={data.reachedAccounts || ""}
                onChange={(e) => handleInputChange("reachedAccounts", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* プロフィールのアクティビティ */}
        <div className="p-4 border-t border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                プロフィールアクセス数
              </label>
              <input
                type="number"
                min="0"
                value={data.profileVisits || ""}
                onChange={(e) => handleInputChange("profileVisits", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                外部リンクタップ数
              </label>
              <input
                type="number"
                min="0"
                value={data.externalLinkTaps || ""}
                onChange={(e) => handleInputChange("externalLinkTaps", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* オーディエンス分析 */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">オーディエンス分析</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {["male", "female", "other"].map((key) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {key === "male" ? "男性 (%)" : key === "female" ? "女性 (%)" : "その他 (%)"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={data.audience.gender[key as keyof InputData["audience"]["gender"]]}
                    onChange={(e) =>
                      handleAudienceGenderChange(
                        key as keyof InputData["audience"]["gender"],
                        e.target.value,
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.keys(data.audience.age).map((key) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{key} (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={data.audience.age[key as keyof InputData["audience"]["age"]]}
                    onChange={(e) =>
                      handleAudienceAgeChange(key as keyof InputData["audience"]["age"], e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* この投稿についてのメモ */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
            <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
            この投稿についてのメモ
          </h3>
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">メモ（オプション）</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
                rows={2}
              placeholder="この投稿についてのメモや気づきを記録してください"
              />
          </div>
        </div>

        {/* AIアドバイスセクション */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
            <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
            AIアドバイス
          </h3>

          {adviceError && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-xs">
              {adviceError}
            </div>
          )}

          {(isAutoGeneratingAdvice || isGeneratingAdvice) ? (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 p-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-600 border-t-transparent"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-900 mb-1">
                    Signal AI があなたの投稿を分析しています
                  </p>
                  <p className="text-xs text-orange-700 leading-relaxed">
                    {analysisStep === 0 && "投稿内容を確認しています…"}
                    {analysisStep === 1 && "投稿内容と伸び方の傾向を分析しています…"}
                    {analysisStep === 2 && "改善ポイントを整理しています…"}
                    {analysisStep === 3 && "分析が完了しました"}
                  </p>
                </div>
              </div>
            </div>
          ) : aiAdvice && showAdviceProgressively ? (
            <div className="space-y-4 bg-gradient-to-br from-gray-50 to-orange-50/30 p-6 border border-orange-100">
              {/* 完了メッセージ */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 p-5 shadow-sm mb-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-gray-900 mb-2">
                      分析が完了しました
                    </h4>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      あなたのアカウントは <span className="font-semibold text-orange-700">{aiAdvice.summary}</span>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* 目標達成見込みの表示 */}
              {aiAdvice.goalAchievementProspect && aiAdvice.goalAchievementReason && (
                <div className={`p-4 shadow-sm ${
                  aiAdvice.goalAchievementProspect === "high"
                    ? "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
                    : aiAdvice.goalAchievementProspect === "medium"
                    ? "bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200"
                    : "bg-gradient-to-r from-red-50 to-rose-50 border border-red-200"
                }`}>
                  <div className="flex items-start gap-3">
                    {aiAdvice.goalAchievementProspect === "high" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : aiAdvice.goalAchievementProspect === "medium" ? (
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h4 className={`text-sm font-semibold mb-2 ${
                        aiAdvice.goalAchievementProspect === "high"
                          ? "text-green-900"
                          : aiAdvice.goalAchievementProspect === "medium"
                          ? "text-yellow-900"
                          : "text-red-900"
                      }`}>
                        {aiAdvice.goalAchievementProspect === "high"
                          ? "目標達成見込み: 高"
                          : aiAdvice.goalAchievementProspect === "medium"
                          ? "目標達成見込み: 中"
                          : "目標達成見込み: 低"}
                      </h4>
                      <p className={`text-sm leading-relaxed ${
                        aiAdvice.goalAchievementProspect === "high"
                          ? "text-green-800"
                          : aiAdvice.goalAchievementProspect === "medium"
                          ? "text-yellow-800"
                          : "text-red-800"
                      }`}>
                        {aiAdvice.goalAchievementReason}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 方針乖離の警告 */}
              {aiAdvice.directionAlignment && aiAdvice.directionAlignment !== "一致" && aiAdvice.directionComment && (
                <div className={`p-4 shadow-sm ${
                  aiAdvice.directionAlignment === "乖離" 
                    ? "bg-gradient-to-r from-red-50 to-rose-50 border border-red-200" 
                    : "bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200"
                }`}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      aiAdvice.directionAlignment === "乖離" 
                        ? "text-red-600" 
                        : "text-yellow-600"
                    }`} />
                    <div className="flex-1">
                      <h4 className={`text-sm font-semibold mb-2 ${
                        aiAdvice.directionAlignment === "乖離" 
                          ? "text-red-900" 
                          : "text-yellow-900"
                      }`}>
                        {aiAdvice.directionAlignment === "乖離" ? "方針乖離の警告" : "要注意"}
                      </h4>
                      <p className={`text-sm leading-relaxed ${
                        aiAdvice.directionAlignment === "乖離" 
                          ? "text-red-800" 
                          : "text-yellow-800"
                      }`}>
                        {aiAdvice.directionComment}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 方針一致の確認 */}
              {aiAdvice.directionAlignment === "一致" && aiAdvice.directionComment && (
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-sm">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-green-900 mb-1.5">
                        今月のAI方針に沿っています
                      </h4>
                      <p className="text-sm text-green-800 leading-relaxed">
                        {aiAdvice.directionComment}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 強みセクション */}
              {aiAdvice.strengths.length > 0 && (
                <div className="bg-white border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 bg-green-500"></div>
                    <h4 className="text-sm font-semibold text-gray-900">強み</h4>
                  </div>
                  <ul className="space-y-2.5">
                    {aiAdvice.strengths.map((item, idx) => (
                      <li key={`strength-${idx}`} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
                        <span className="text-green-500 mt-1.5 flex-shrink-0">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 改善ポイントセクション */}
              {aiAdvice.improvements.length > 0 && (
                <div className="bg-white border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 bg-amber-500"></div>
                    <h4 className="text-sm font-semibold text-gray-900">改善ポイント</h4>
                  </div>
                  <ul className="space-y-2.5">
                    {aiAdvice.improvements.map((item, idx) => (
                      <li key={`improve-${idx}`} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
                        <span className="text-amber-500 mt-1.5 flex-shrink-0">→</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 次のアクションセクション */}
              {aiAdvice.nextActions.length > 0 && (
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 bg-orange-500"></div>
                    <h4 className="text-sm font-semibold text-gray-900">次のアクション</h4>
                  </div>
                  <ul className="space-y-2.5">
                    {aiAdvice.nextActions.map((item, idx) => (
                      <li key={`action-${idx}`} className="flex items-start gap-2.5 text-sm text-gray-800 leading-relaxed">
                        <span className="text-orange-600 mt-1.5 flex-shrink-0 font-bold">▶</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Coaching Mode: 継続分析の価値を伝えるメッセージ */}
              {!aiAdvice.patternMatch && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-purple-900 mb-1">
                        より具体的な提案のために
                      </h4>
                      <p className="text-sm text-purple-800 leading-relaxed">
                        投稿を分析すればするほど、Signal AIはあなたのアカウントの傾向を学習し、より具体的で効果的な提案が可能になります。継続的な分析をおすすめします。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isAutoSaved && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    この分析結果は自動的に保存されています
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 p-4 text-xs text-orange-700">
              <p className="font-medium mb-1">💡 AIに分析してもらう</p>
              <p>ボタンを押すと、Signal AIがあなたの投稿を分析し、改善ポイントを提案します。</p>
            </div>
          )}
        </div>

        {/* AI分析セクション */}
        {aiInsightsSection ? (
          <div className="p-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
              <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
              AI分析（投稿まとめ）
            </h3>
            <div className="bg-white">{aiInsightsSection}</div>
          </div>
        ) : null}

        {/* AI分析ボタン（AIアドバイスが生成されていない場合のみ表示） */}
        {!aiAdvice && (
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={isLoading || isAutoGeneratingAdvice || isGeneratingAdvice}
              className="px-6 py-2 bg-[#ff8a15] text-white hover:bg-[#e6760f] disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium shadow-sm hover:shadow-md transition-all"
            >
              {isLoading || isAutoGeneratingAdvice || isGeneratingAdvice ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {analysisStep === 0 && "投稿内容を確認中..."}
                  {analysisStep === 1 && "傾向を分析中..."}
                  {analysisStep === 2 && "改善ポイントを整理中..."}
                  {analysisStep === 3 && "完了"}
                </>
              ) : (
                "AIに分析してもらう"
              )}
            </button>
          </div>
        )}

      </div>
      </div>
    </>
  );
};

export default FeedAnalyticsForm;
