"use client";

import React, { useState, type ReactNode } from "react";
import Image from "next/image";
import { Heart, MessageCircle, Share, Save, ThumbsUp, ThumbsDown, CheckCircle, X, Plus, Trash2, Sparkles, Clipboard } from "lucide-react";
import { InputData } from "./types";
import { useAuth } from "../../../contexts/auth-context";
import { authFetch } from "../../../utils/authFetch";

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
  const [sentiment, setSentiment] = useState<"satisfied" | "dissatisfied" | null>(null);
  const [memo, setMemo] = useState("");
  const [aiAdvice, setAiAdvice] = useState<{
    summary: string;
    strengths: string[];
    improvements: string[];
    nextActions: string[];
  } | null>(null);
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);
  const [adviceError, setAdviceError] = useState<string | null>(null);
  const [pasteSuccess, setPasteSuccess] = useState<string | null>(null);

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

  // Instagram分析データの解析（リール用）
  const parseInstagramReelData = (text: string) => {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line);
    const result: {
      hasData: boolean;
      reach: number | null;
      reelReachFollowerPercent: number | null;
      reelReachedAccounts: number | null;
      reelInteractionCount: number | null;
      reelInteractionFollowerPercent: number | null;
      likes: number | null;
      comments: number | null;
      saves: number | null;
      shares: number | null;
      reelReachSourceProfile: number | null;
      reelReachSourceReel: number | null;
      reelReachSourceExplore: number | null;
      reelReachSourceSearch: number | null;
      reelReachSourceOther: number | null;
      profileVisits: number | null;
      externalLinkTaps: number | null;
      profileFollows: number | null;
    } = {
      hasData: false,
      reach: null,
      reelReachFollowerPercent: null,
      reelReachedAccounts: null,
      reelInteractionCount: null,
      reelInteractionFollowerPercent: null,
      likes: null,
      comments: null,
      saves: null,
      shares: null,
      reelReachSourceProfile: null,
      reelReachSourceReel: null,
      reelReachSourceExplore: null,
      reelReachSourceSearch: null,
      reelReachSourceOther: null,
      profileVisits: null,
      externalLinkTaps: null,
      profileFollows: null,
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];
      const prevLine = lines[i - 1];

      // ビュー/閲覧数
      if ((line === "ビュー" || line.includes("閲覧数")) && nextLine && /^\d+$/.test(nextLine)) {
        result.reach = parseInt(nextLine, 10);
        result.hasData = true;
      }

      // フォロワー以外（閲覧数の） - ビューの下にある場合
      if (line === "フォロワー以外" && nextLine && prevLine && (prevLine === "ビュー" || prevLine.includes("閲覧数"))) {
        const percent = parseFloat(nextLine.replace("%", ""));
        if (!isNaN(percent)) {
          result.reelReachFollowerPercent = percent;
          result.hasData = true;
        }
      }

      // プロフィール（閲覧ソース）
      if (line === "プロフィール" && nextLine && /^\d+$/.test(nextLine) && prevLine !== "プロフィールのアクティビティ" && !prevLine?.includes("プロフィールへの")) {
        result.reelReachSourceProfile = parseInt(nextLine, 10);
        result.hasData = true;
      }

      // リール（閲覧ソース）
      if (line === "リール" && nextLine && /^\d+$/.test(nextLine) && !prevLine?.includes("閲覧")) {
        result.reelReachSourceReel = parseInt(nextLine, 10);
        result.hasData = true;
      }

      // 発見（閲覧ソース）
      if (line === "発見" && nextLine && /^\d+$/.test(nextLine)) {
        result.reelReachSourceExplore = parseInt(nextLine, 10);
        result.hasData = true;
      }

      // 検索（閲覧ソース）
      if (line === "検索" && nextLine && /^\d+$/.test(nextLine)) {
        result.reelReachSourceSearch = parseInt(nextLine, 10);
        result.hasData = true;
      }

      // その他（閲覧ソース）
      if (line === "その他" && nextLine && /^\d+$/.test(nextLine) && !prevLine?.includes("フォロワー")) {
        result.reelReachSourceOther = parseInt(nextLine, 10);
        result.hasData = true;
      }

      // リーチしたアカウント数
      if (line.includes("リーチしたアカウント数") && nextLine && /^\d+$/.test(nextLine)) {
        result.reelReachedAccounts = parseInt(nextLine, 10);
        result.hasData = true;
      }

      // インタラクション数（単独の行）
      if (line === "インタラクション" && nextLine && /^\d+$/.test(nextLine)) {
        result.reelInteractionCount = parseInt(nextLine, 10);
        result.hasData = true;
      }

      // インタラクションのフォロワー以外
      if (line === "フォロワー以外" && prevLine === "インタラクション" && nextLine) {
        const percent = parseFloat(nextLine.replace("%", ""));
        if (!isNaN(percent)) {
          result.reelInteractionFollowerPercent = percent;
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

  const handleGenerateAdvice = async () => {
    if (!user?.uid || !postData?.id) {
      setAdviceError("ユーザー情報または投稿情報が不足しています");
      return;
    }

    setIsGeneratingAdvice(true);
    setAdviceError(null);

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
      setAiAdvice({
        summary: insightData.summary,
        strengths: insightData.strengths || [],
        improvements: insightData.improvements || [],
        nextActions: insightData.nextActions || [],
      });
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

    onSave({ sentiment, memo });
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

          {postData ? (
            /* 投稿データが渡された場合：読み取り専用表示 */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">タイトル</label>
                <div className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-800">
                  {postData.title || "タイトルなし"}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">内容</label>
                <div className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-800 min-h-[80px] whitespace-pre-wrap">
                  {postData.content || "内容なし"}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ハッシュタグ</label>
                <div className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-800">
                  {postData.hashtags && postData.hashtags.length > 0
                    ? postData.hashtags.join(" ")
                    : "ハッシュタグなし"}
                </div>
              </div>
            </div>
          ) : (
            /* 投稿データがない場合：手動入力 */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">タイトル</label>
                <input
                  type="text"
                  value={data.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
                  placeholder="リール投稿のタイトルを入力"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">内容</label>
                <textarea
                  value={data.content}
                  onChange={(e) => handleInputChange("content", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
                  rows={3}
                  placeholder="リール投稿の内容を入力"
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
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">カテゴリ</label>
            <select
              value={data.category}
              onChange={(e) =>
                handleInputChange("category", e.target.value as "reel" | "feed" | "story")
              }
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
            >
              <option value="reel">リール</option>
              <option value="feed">フィード</option>
              <option value="story">ストーリー</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">サムネイル画像</label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // ファイルサイズチェック（2MB制限）
                    if (file.size > 2 * 1024 * 1024) {
                      setToastMessage({ message: "画像ファイルは2MB以下にしてください。", type: 'error' });
                      setTimeout(() => setToastMessage(null), 3000);
                      return;
                    }

                    // 画像を圧縮してBase64に変換
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    const img = new window.Image();

                    img.onload = () => {
                      // 最大サイズを200x200に制限
                      const maxSize = 200;
                      let { width, height } = img;

                      if (width > height) {
                        if (width > maxSize) {
                          height = (height * maxSize) / width;
                          width = maxSize;
                        }
                      } else {
                        if (height > maxSize) {
                          width = (width * maxSize) / height;
                          height = maxSize;
                        }
                      }

                      canvas.width = width;
                      canvas.height = height;
                      ctx?.drawImage(img, 0, 0, width, height);

                      const base64 = canvas.toDataURL("image/jpeg", 0.8);
                      handleInputChange("thumbnail", base64);
                    };

                    img.src = URL.createObjectURL(file);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            {data.thumbnail && (
              <div className="mt-2">
                <Image
                  src={data.thumbnail}
                  alt="サムネイル"
                  width={100}
                  height={100}
                  className="object-cover"
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">投稿日</label>
              <input
                type="date"
                value={data.publishedAt}
                onChange={(e) => handleInputChange("publishedAt", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">投稿時間</label>
              <input
                type="time"
                value={data.publishedTime}
                onChange={(e) => handleInputChange("publishedTime", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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

        {/* リール反応データ */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">リール反応データ</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
                <Heart className="w-4 h-4 mr-2 text-[#ff8a15]" />
                いいね数
              </label>
              <input
                type="number"
                min="0"
                value={data.likes}
                onChange={(e) => handleInputChange("likes", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
                <MessageCircle className="w-4 h-4 mr-2 text-[#ff8a15]" />
                コメント数
              </label>
              <input
                type="number"
                min="0"
                value={data.comments}
                onChange={(e) => handleInputChange("comments", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
                <Share className="w-4 h-4 mr-2 text-[#ff8a15]" />
                シェア数
              </label>
              <input
                type="number"
                min="0"
                value={data.shares}
                onChange={(e) => handleInputChange("shares", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
                <Share className="w-4 h-4 mr-2 text-[#ff8a15]" />
                リポスト数
              </label>
              <input
                type="number"
                min="0"
                value={data.reposts}
                onChange={(e) => handleInputChange("reposts", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
                <Save className="w-4 h-4 mr-2 text-[#ff8a15]" />
                保存数
              </label>
              <input
                type="number"
                min="0"
                value={data.saves}
                onChange={(e) => handleInputChange("saves", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
                <Plus className="w-4 h-4 mr-2 text-[#ff8a15]" />
                フォロワー増加数
              </label>
              <input
                type="number"
                min="0"
                value={data.followerIncrease}
                onChange={(e) => handleInputChange("followerIncrease", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* 概要 */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">概要</h3>
          <div className="space-y-4">
            {/* 閲覧数・フォロワー外 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">閲覧数</label>
                <input
                  type="number"
                  min="0"
                  value={data.reach}
                  onChange={(e) => handleInputChange("reach", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">フォロワー外</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={data.reelReachFollowerPercent}
                  onChange={(e) => handleInputChange("reelReachFollowerPercent", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0"
                />
              </div>
            </div>
            {/* インタラクション数・フォロワー外 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  インタラクション数
                </label>
                <input
                  type="number"
                  min="0"
                  value={data.reelInteractionCount}
                  onChange={(e) => handleInputChange("reelInteractionCount", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">フォロワー外</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={data.reelInteractionFollowerPercent}
                  onChange={(e) =>
                    handleInputChange("reelInteractionFollowerPercent", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 閲覧数の上位ソース */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">閲覧数の上位ソース</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">プロフィール</label>
              <input
                type="number"
                min="0"
                value={data.reelReachSourceProfile}
                onChange={(e) => handleInputChange("reelReachSourceProfile", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">リール</label>
              <input
                type="number"
                min="0"
                value={data.reelReachSourceReel}
                onChange={(e) => handleInputChange("reelReachSourceReel", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">発見</label>
              <input
                type="number"
                min="0"
                value={data.reelReachSourceExplore}
                onChange={(e) => handleInputChange("reelReachSourceExplore", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">検索</label>
              <input
                type="number"
                min="0"
                value={data.reelReachSourceSearch}
                onChange={(e) => handleInputChange("reelReachSourceSearch", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">その他</label>
              <input
                type="number"
                min="0"
                value={data.reelReachSourceOther}
                onChange={(e) => handleInputChange("reelReachSourceOther", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* リーチしたアカウント */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">リーチしたアカウント</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              リーチしたアカウント数
            </label>
            <input
              type="number"
              min="0"
              value={data.reelReachedAccounts}
              onChange={(e) => handleInputChange("reelReachedAccounts", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0"
            />
          </div>
        </div>

        {/* スキップ率 */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">スキップ率</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                リールのスキップ率
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.reelSkipRate}
                onChange={(e) => handleInputChange("reelSkipRate", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                通常のスキップ率
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.reelNormalSkipRate}
                onChange={(e) => handleInputChange("reelNormalSkipRate", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* 再生時間 */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">再生時間</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(["reelPlayTime", "reelAvgPlayTime"] as Array<keyof InputData>).map((field) => {
              const totalSeconds = Number(data[field]) || 0;
              const hours = Math.floor(totalSeconds / 3600);
              const minutes = Math.floor((totalSeconds % 3600) / 60);
              const seconds = totalSeconds % 60;
              return (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {field === "reelPlayTime" ? "再生時間" : "平均再生時間"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={hours}
                    onChange={(e) => {
                      const h = Math.max(0, Number(e.target.value));
                      handleInputChange(field, String(h * 3600 + minutes * 60 + seconds));
                    }}
                    className="w-1/3 px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="時"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={minutes}
                    onChange={(e) => {
                      const m = Math.max(0, Math.min(59, Number(e.target.value)));
                      handleInputChange(field, String(hours * 3600 + m * 60 + seconds));
                    }}
                    className="w-1/3 px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="分"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={seconds}
                    onChange={(e) => {
                      const s = Math.max(0, Math.min(59, Number(e.target.value)));
                      handleInputChange(field, String(hours * 3600 + minutes * 60 + s));
                    }}
                    className="w-1/3 px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="秒"
                  />
                </div>
              </div>
            )})}
          </div>
        </div>

        {/* コメントと返信ログ */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#ff8a15]" />
              コメントと返信ログ
            </h3>
            <button
              type="button"
              onClick={handleAddCommentThread}
              className="inline-flex items-center text-xs font-semibold text-[#ff8a15] hover:text-[#e6760f] transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              コメントを追加
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            受け取ったコメント内容と返信内容を記録すると、AIが顧客との会話傾向を学習しやすくなります。
          </p>

          {data.commentThreads && data.commentThreads.length > 0 ? (
            <div className="space-y-3">
              {data.commentThreads.map((thread, index) => (
                <div key={`comment-thread-${index}`} className="border border-gray-200 bg-gray-50 p-4 space-y-3">
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
                      placeholder="返信した内容やフォローアップのポイントを入力"
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
          ) : (
            <p className="text-xs text-gray-500">
              まだコメントログはありません。右上の「コメントを追加」から記録を始めましょう。
            </p>
          )}
        </div>

        {/* オーディエンス分析入力 */}
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

        {/* この投稿についてのフィードバックを書きましょう */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">この投稿についてのフィードバックを書きましょう</h3>
          <div className="space-y-4">
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setSentiment("satisfied")}
                className={`flex items-center px-4 py-2 border ${
                  sentiment === "satisfied"
                    ? "bg-green-100 border-green-500 text-green-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                満足
              </button>
              <button
                type="button"
                onClick={() => setSentiment("dissatisfied")}
                className={`flex items-center px-4 py-2 border ${
                  sentiment === "dissatisfied"
                    ? "bg-red-100 border-red-500 text-red-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                不満足
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">メモ</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15]"
                rows={2}
                placeholder="投稿についてのフィードバックを入力..."
              />
            </div>
          </div>
        </div>

        {/* AIアドバイスセクション */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center">
              <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
              AIアドバイス
            </h3>
            <button
              type="button"
              onClick={handleGenerateAdvice}
              disabled={isGeneratingAdvice || !sentiment || !postData?.id}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#ff8a15] hover:bg-[#e6760f] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#ff8a15] transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              {isGeneratingAdvice ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  AIアドバイスを生成
                </>
              )}
            </button>
          </div>

          {adviceError && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-xs">
              {adviceError}
            </div>
          )}

          {aiAdvice ? (
            <div className="space-y-4 bg-gray-50 p-4">
              <div className="border-l-4 border-gray-400 pl-4">
                <p className="text-sm text-gray-800 leading-relaxed">{aiAdvice.summary}</p>
              </div>
              {aiAdvice.strengths.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">強み</h4>
                  <ul className="list-disc list-inside text-xs text-gray-700 space-y-1 pl-2">
                    {aiAdvice.strengths.map((item, idx) => (
                      <li key={`strength-${idx}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiAdvice.improvements.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">改善ポイント</h4>
                  <ul className="list-disc list-inside text-xs text-gray-700 space-y-1 pl-2">
                    {aiAdvice.improvements.map((item, idx) => (
                      <li key={`improve-${idx}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiAdvice.nextActions.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">次のアクション</h4>
                  <ul className="list-disc list-inside text-xs text-gray-700 space-y-1 pl-2">
                    {aiAdvice.nextActions.map((item, idx) => (
                      <li key={`action-${idx}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 p-4 text-xs text-gray-500">
              {sentiment
                ? "「AIアドバイスを生成」ボタンをクリックして、この投稿の分析とアドバイスを取得できます。"
                : "まず、上記のフィードバック（満足/不満足）を選択してください。"}
            </div>
          )}
        </div>

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

        {/* 保存ボタン */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-2 bg-[#ff8a15] text-white hover:bg-[#e6760f] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                保存中...
              </>
            ) : (
              "リール分析データを保存"
            )}
          </button>
        </div>
      </div>
      </div>
    </>
  );
};

export default ReelAnalyticsForm;
