"use client";

import React, { useState } from "react";
import Image from "next/image";
import { InputData } from "./types";
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

interface ReelAnalyticsFormProps {
  data: InputData;
  onChange: (data: InputData) => void;
  onSave: (payload?: { memo: string }) => void;
  isLoading: boolean;
  postData?: {
    id: string;
    title: string;
    content: string;
    hashtags: string[];
    postType: "feed" | "reel" | "story";
  } | null;
}

const ReelAnalyticsForm: React.FC<ReelAnalyticsFormProps> = ({
  data,
  onChange,
  onSave,
  isLoading,
  postData,
}) => {
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [memo, setMemo] = useState("");
  const [pasteSuccess, setPasteSuccess] = useState<string | null>(null);
  const [isAutoSaved, setIsAutoSaved] = useState(false);

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

  const handleThumbnailFileChange = async (file: File | null) => {
    if (!file) {return;}
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
        reader.readAsDataURL(file);
      });
      handleInputChange("thumbnail", dataUrl);
    } catch (error) {
      console.error("分析画像読み込みエラー:", error);
      setToastMessage({
        message: "画像の読み込みに失敗しました",
        type: "error",
      });
      setTimeout(() => setToastMessage(null), 3000);
    }
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

  const handleSave = async () => {
    const requiredReactionFields: Array<{ key: keyof InputData; label: string }> = [
      { key: "likes", label: "いいね数" },
      { key: "comments", label: "コメント数" },
      { key: "shares", label: "シェア数" },
      { key: "reposts", label: "リポスト数" },
      { key: "saves", label: "保存数" },
      { key: "followerIncrease", label: "フォロワー増加数" },
    ];
    const missingFields = requiredReactionFields.filter(
      ({ key }) => String(data[key] ?? "").trim() === ""
    );
    if (missingFields.length > 0) {
      setToastMessage({
        message: `リール反応データは必須です（未入力: ${missingFields.map((f) => f.label).join("、")}）`,
        type: "error",
      });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    try {
      await onSave({ memo });
      setIsAutoSaved(true);
      setToastMessage({
        message: "分析内容を保存しました",
        type: "success",
      });
      setTimeout(() => setToastMessage(null), 3000);
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
          />
        </div>

        {/* Instagram分析データの貼り付け */}
        <ReelAnalyticsPasteSection
          onPaste={handlePasteInstagramData}
          pasteSuccess={pasteSuccess}
        />

        {/* 投稿画像（任意） */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            投稿画像（任意）
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            後から画像を追加できます。保存後、この画像を使ってAIが画像の改善アドバイスを行います。
          </p>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <label className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-[#ff8a15] hover:bg-[#e6760f] transition-colors cursor-pointer">
              画像を選択
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  void handleThumbnailFileChange(file);
                }}
              />
            </label>
            {data.thumbnail && (
              <button
                type="button"
                onClick={() => handleInputChange("thumbnail", "")}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                画像を削除
              </button>
            )}
          </div>
          {data.thumbnail ? (
            <div className="w-full max-w-xs aspect-square border border-gray-200 overflow-hidden bg-gray-100">
              <Image
                src={data.thumbnail}
                alt="分析用の投稿画像"
                width={480}
                height={480}
                unoptimized
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <p className="text-xs text-gray-500">画像が未設定です</p>
          )}
        </div>

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

        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={handleSave}
            disabled={isLoading || isAutoSaved}
            className="px-6 py-2 bg-gradient-to-r from-[#FF8A15] to-orange-500 text-white font-semibold hover:from-[#e67a0f] hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-all"
          >
            {isAutoSaved ? "分析内容保存済み" : "分析内容を保存"}
          </button>
        </div>
      </div>
      </div>
    </>
  );
};

export default ReelAnalyticsForm;
