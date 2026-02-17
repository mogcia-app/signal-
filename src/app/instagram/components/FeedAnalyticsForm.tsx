"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Heart,
  MessageCircle,
  Share,
  Save,
  CheckCircle,
  X,
  Plus,
  Trash2,
  Clipboard,
} from "lucide-react";
import { InputData } from "./types";

interface FeedAnalyticsFormProps {
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

const FeedAnalyticsForm: React.FC<FeedAnalyticsFormProps> = ({
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
        message: `フィード反応データは必須です（未入力: ${missingFields.map((f) => f.label).join("、")}）`,
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

        {/* 投稿画像（任意） */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
            <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
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

export default FeedAnalyticsForm;
