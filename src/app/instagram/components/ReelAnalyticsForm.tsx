"use client";

import React, { useState, type ReactNode } from "react";
import Image from "next/image";
import { InputData } from "./types";
import { useAuth } from "../../../contexts/auth-context";
import { authFetch } from "../../../utils/authFetch";
import { parseInstagramReelData } from "../../../utils/instagram-data-parser";
import { ReelAnalyticsToast } from "./ReelAnalyticsToast";
import { ReelAnalyticsPasteSection } from "./ReelAnalyticsPasteSection";
import { ReelAnalyticsBasicInfo } from "./ReelAnalyticsBasicInfo";
import { ReelAnalyticsReactionData } from "./ReelAnalyticsReactionData";
import { ReelAnalyticsOverview } from "./ReelAnalyticsOverview";
import { ReelAnalyticsReachSources } from "./ReelAnalyticsReachSources";
import { ReelAnalyticsReachedAccounts } from "./ReelAnalyticsReachedAccounts";
import { ReelAnalyticsSkipRate } from "./ReelAnalyticsSkipRate";
import { ReelAnalyticsPlayTime } from "./ReelAnalyticsPlayTime";
import { ReelAnalyticsCommentLogs } from "./ReelAnalyticsCommentLogs";
import { ReelAnalyticsAudience } from "./ReelAnalyticsAudience";
import { ReelAnalyticsAIAdvice } from "./ReelAnalyticsAIAdvice";

interface ReelAnalyticsFormProps {
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
  aiInsightsTitle?: string;
  aiInsightsDescription?: string;
}

const ReelAnalyticsForm: React.FC<ReelAnalyticsFormProps> = ({
  data,
  onChange,
  onSave,
  isLoading,
  postData,
  aiInsightsSection,
  aiInsightsTitle = "AI分析（リールまとめ）",
  aiInsightsDescription,
}) => {
  const { user } = useAuth();
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
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
      const parsed = parseInstagramReelData(text);
      
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
      if (parsed.reelReachFollowerPercent !== null) {
        updatedData.reelReachFollowerPercent = String(parsed.reelReachFollowerPercent);
      }
      if (parsed.reelReachedAccounts !== null) {
        updatedData.reelReachedAccounts = String(parsed.reelReachedAccounts);
      }
      if (parsed.reelInteractionCount !== null) {
        updatedData.reelInteractionCount = String(parsed.reelInteractionCount);
      }
      if (parsed.reelInteractionFollowerPercent !== null) {
        updatedData.reelInteractionFollowerPercent = String(parsed.reelInteractionFollowerPercent);
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
      if (parsed.reelReachSourceProfile !== null) {
        updatedData.reelReachSourceProfile = String(parsed.reelReachSourceProfile);
      }
      if (parsed.reelReachSourceReel !== null) {
        updatedData.reelReachSourceReel = String(parsed.reelReachSourceReel);
      }
      if (parsed.reelReachSourceExplore !== null) {
        updatedData.reelReachSourceExplore = String(parsed.reelReachSourceExplore);
      }
      if (parsed.reelReachSourceSearch !== null) {
        updatedData.reelReachSourceSearch = String(parsed.reelReachSourceSearch);
      }
      if (parsed.reelReachSourceOther !== null) {
        updatedData.reelReachSourceOther = String(parsed.reelReachSourceOther);
      }
      if (parsed.profileVisits !== null) {
        updatedData.profileVisits = String(parsed.profileVisits);
      }
      if (parsed.externalLinkTaps !== null) {
        updatedData.externalLinkTaps = String(parsed.externalLinkTaps);
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

  // Instagram分析データの解析関数は utils/instagram-data-parser.ts からインポート済み

  const handleInputChange = (field: keyof InputData, value: string) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  const handleAudienceGenderChange = (field: keyof InputData["audience"]["gender"], value: string) => {
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

  const handleAddCommentThread = () => {
    const updated = [...(data.commentThreads ?? []), { comment: "", reply: "" }];
    onChange({
      ...data,
      commentThreads: updated,
    });
  };

  const handleCommentThreadChange = (
    index: number,
    field: "comment" | "reply",
    value: string,
  ) => {
    const updated = [...(data.commentThreads ?? [])];
    if (!updated[index]) {
      updated[index] = { comment: "", reply: "" };
    }
    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    onChange({
      ...data,
      commentThreads: updated,
    });
  };

  const handleRemoveCommentThread = (index: number) => {
    const updated = [...(data.commentThreads ?? [])];
    updated.splice(index, 1);
    onChange({
      ...data,
      commentThreads: updated,
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
        try {
          errorText = await response.text();
        } catch (e) {
          // レスポンスの読み取りに失敗した場合は無視
        }
        console.error("AIアドバイス生成エラー詳細:", {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          errorText,
        });
        throw new Error(`AIアドバイス生成エラー: ${response.status}${errorText ? ` - ${errorText}` : ""}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "AIアドバイスの生成に失敗しました");
      }

      const insightData = result.data;
      
      // デバッグログ（本番環境では削除可能）
      console.log("[ReelAnalyticsForm] AIアドバイス受信:", {
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
              category: postData.postType || "reel",
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
            category: postData.postType || "reel",
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
      : null;
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
            sentiment: sentimentMap[aiAdvice.goalAchievementProspect], // 後方互換性のため
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
      setIsAutoSaved(false);
      
      // AIアドバイス生成を開始
      handleGenerateAdvice(true).finally(() => {
        setIsAutoGeneratingAdvice(false);
      });
    } else if (aiAdvice && user?.uid && postData?.id) {
      // 既にAIアドバイスがある場合、保存済みフラグを設定
      setIsAutoSaved(true);
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

  return (
    <>
      {/* トースト通知 */}
      {toastMessage && (
        <ReelAnalyticsToast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}
      
      <div className="bg-white border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
          <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
          リール分析データ入力
        </h2>
        <p className="text-sm text-gray-600">リール投稿のパフォーマンスデータを入力してください</p>
      </div>

      <div className="space-y-4">
        {/* 投稿情報 */}
        <div className="p-4 bg-gray-50 space-y-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">投稿情報</h3>
          <ReelAnalyticsBasicInfo
            data={data}
            onInputChange={handleInputChange}
            postData={postData}
            onShowToast={(message, type) => {
              setToastMessage({ message, type });
              setTimeout(() => setToastMessage(null), 3000);
            }}
          />
        </div>

        {/* Instagram分析データの貼り付け */}
        <ReelAnalyticsPasteSection
          onPaste={handlePasteInstagramData}
          pasteSuccess={pasteSuccess}
        />

        {/* リール反応データ */}
        <ReelAnalyticsReactionData
          data={data}
          onInputChange={handleInputChange}
        />

        {/* 概要 */}
        <ReelAnalyticsOverview
          data={data}
          onInputChange={handleInputChange}
        />

        {/* 閲覧数の上位ソース */}
        <ReelAnalyticsReachSources
          data={data}
          onInputChange={handleInputChange}
        />

        {/* リーチしたアカウント */}
        <ReelAnalyticsReachedAccounts
          data={data}
          onInputChange={handleInputChange}
        />

        {/* スキップ率 */}
        <ReelAnalyticsSkipRate
          data={data}
          onInputChange={handleInputChange}
        />

        {/* 再生時間 */}
        <ReelAnalyticsPlayTime
          data={data}
          onInputChange={handleInputChange}
        />

        {/* コメントと返信ログ */}
        <ReelAnalyticsCommentLogs
          data={data}
          onCommentThreadChange={handleCommentThreadChange}
          onAddCommentThread={handleAddCommentThread}
          onRemoveCommentThread={handleRemoveCommentThread}
        />

        {/* オーディエンス分析入力 */}
        <ReelAnalyticsAudience
          data={data}
          onAudienceGenderChange={handleAudienceGenderChange}
          onAudienceAgeChange={handleAudienceAgeChange}
        />

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
        <ReelAnalyticsAIAdvice
          aiAdvice={aiAdvice}
          isGenerating={isGeneratingAdvice}
          isAutoGenerating={isAutoGeneratingAdvice}
          error={adviceError}
          onGenerate={() => handleGenerateAdvice(false)}
          sentiment={null}
          hasPostData={!!postData?.id}
          isAutoSaved={isAutoSaved}
        />

        {/* AI分析セクション */}
        {aiInsightsSection ? (
          <div className="p-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
              <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
              {aiInsightsTitle}
            </h3>
            {aiInsightsDescription ? (
              <p className="text-xs text-gray-500 mb-3">{aiInsightsDescription}</p>
            ) : null}
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

export default ReelAnalyticsForm;
