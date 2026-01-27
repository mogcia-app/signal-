"use client";

import React, { useState } from "react";
import { PlanFormData } from "../types/plan";
import { TargetFollowerAutoInput } from "./TargetFollowerAutoInput";

interface PlanFormProps {
  onSubmit: (data: PlanFormData, aiSuggestedTarget?: number) => void;
  isLoading?: boolean;
}

export const PlanForm: React.FC<PlanFormProps> = ({ onSubmit, isLoading = false }) => {
  const [formData, setFormData] = useState<PlanFormData>({
    currentFollowers: 0,
    targetFollowers: 0,
    periodMonths: 1,
    weeklyFeedPosts: 3,
    weeklyReelPosts: 1,
    weeklyStoryPosts: 7,
    mainGoal: "",
    preferredPostingTimes: [],
    targetAudience: "",
    regionRestriction: {
      enabled: false,
    },
    contentTypes: [],
  });

  const [mainGoalType, setMainGoalType] = useState<string>("");
  const [mainGoalOther, setMainGoalOther] = useState<string>("");
  const [availableTime, setAvailableTime] = useState<string>("");
  const [reelCapability, setReelCapability] = useState<string>("");
  const [storyFrequency, setStoryFrequency] = useState<string>("");
  const [preferredPostingTimes, setPreferredPostingTimes] = useState<string[]>([]);
  const [regionRestrictionEnabled, setRegionRestrictionEnabled] = useState<boolean>(false);
  const [regionPrefecture, setRegionPrefecture] = useState<string>("");
  const [regionCity, setRegionCity] = useState<string>("");
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [contentTypeOther, setContentTypeOther] = useState<string>("");
  const [aiSuggestedTarget, setAiSuggestedTarget] = useState<number | undefined>(undefined);

  // mainGoalTypeが変更されたときにformDataを更新
  React.useEffect(() => {
    if (mainGoalType === "other") {
      setFormData((prev) => ({ ...prev, mainGoal: mainGoalOther }));
    } else if (mainGoalType) {
      setFormData((prev) => ({ ...prev, mainGoal: mainGoalType }));
    } else {
      setFormData((prev) => ({ ...prev, mainGoal: "" }));
    }
  }, [mainGoalType, mainGoalOther]);

  // 投稿頻度の選択に応じてformDataを更新
  React.useEffect(() => {
    // 投稿に使える時間に応じてフィード投稿頻度を設定
    if (availableTime === "low") {
      setFormData((prev) => ({ ...prev, weeklyFeedPosts: 2 }));
    } else if (availableTime === "medium") {
      setFormData((prev) => ({ ...prev, weeklyFeedPosts: 4 }));
    } else if (availableTime === "high") {
      setFormData((prev) => ({ ...prev, weeklyFeedPosts: 7 }));
    }

    // リール能力に応じてリール投稿頻度を設定
    if (reelCapability === "none") {
      setFormData((prev) => ({ ...prev, weeklyReelPosts: 0 }));
    } else if (reelCapability === "low") {
      setFormData((prev) => ({ ...prev, weeklyReelPosts: 1 }));
    } else if (reelCapability === "high") {
      setFormData((prev) => ({ ...prev, weeklyReelPosts: 3 }));
    }

    // ストーリーズ頻度に応じてストーリーズ投稿頻度を設定
    if (storyFrequency === "none") {
      setFormData((prev) => ({ ...prev, weeklyStoryPosts: 0 }));
    } else if (storyFrequency === "low") {
      setFormData((prev) => ({ ...prev, weeklyStoryPosts: 2 }));
    } else if (storyFrequency === "medium") {
      setFormData((prev) => ({ ...prev, weeklyStoryPosts: 4 }));
    } else if (storyFrequency === "daily") {
      setFormData((prev) => ({ ...prev, weeklyStoryPosts: 7 }));
    }
  }, [availableTime, reelCapability, storyFrequency]);

  // 新しい必須項目をformDataに反映
  React.useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      preferredPostingTimes,
      regionRestriction: {
        enabled: regionRestrictionEnabled,
        prefecture: regionPrefecture,
        city: regionCity,
      },
      contentTypes,
      contentTypeOther: contentTypes.includes("other") ? contentTypeOther : undefined,
    }));
  }, [preferredPostingTimes, regionRestrictionEnabled, regionPrefecture, regionCity, contentTypes, contentTypeOther]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData, aiSuggestedTarget);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 新しく計画を立てる */}
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-2xl font-bold text-gray-900">新しく計画を立てる</h2>
          <p className="text-sm text-gray-600 mt-2">
            目標達成のための計画を作成します。各項目を入力してください。
          </p>
        </div>
        
        {/* 目標達成期間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            目標達成期間 <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.periodMonths}
            onChange={(e) => setFormData({ ...formData, periodMonths: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A15]"
          >
            <option value={1}>1ヶ月 ⭐おすすめ</option>
            <option value={3}>3ヶ月</option>
            <option value={6}>6ヶ月</option>
            <option value={12}>12ヶ月</option>
          </select>
        </div>

        {/* 現在のフォロワー数 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            現在のフォロワー数 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            required
            min="1"
            value={formData.currentFollowers || ""}
            onChange={(e) => setFormData({ ...formData, currentFollowers: parseInt(e.target.value) || 0 })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A15]"
            placeholder="例: 1000"
          />
        </div>

        {/* 目標フォロワー数（自動計算） */}
        <TargetFollowerAutoInput
          currentFollowers={formData.currentFollowers}
          periodMonths={formData.periodMonths}
          value={formData.targetFollowers}
          onChange={(value) => setFormData({ ...formData, targetFollowers: value })}
          onAISuggested={(suggestedValue) => setAiSuggestedTarget(suggestedValue)}
        />

        {/* セクション区切り */}
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">投稿頻度の設定</h3>
        </div>

        {/* 投稿に使える時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            1週間で、どのくらい投稿に時間を使えますか？ <span className="text-red-500">*</span>
          </label>
          
          <div className="space-y-3">
            <label className="flex items-start cursor-pointer group">
              <input
                type="radio"
                name="availableTime"
                value="low"
                checked={availableTime === "low"}
                onChange={(e) => setAvailableTime(e.target.value)}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  週1〜2回
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  「忙しいけど、無理なく続けたい」 → 週2投稿
                </div>
              </div>
            </label>

            <label className="flex items-start cursor-pointer group">
              <input
                type="radio"
                name="availableTime"
                value="medium"
                checked={availableTime === "medium"}
                onChange={(e) => setAvailableTime(e.target.value)}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  週3〜4回<span className="text-[#FF8A15] ml-2">⭐おすすめ</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  「しっかり取り組みたい」 → 週4投稿
                </div>
              </div>
            </label>

            <label className="flex items-start cursor-pointer group">
              <input
                type="radio"
                name="availableTime"
                value="high"
                checked={availableTime === "high"}
                onChange={(e) => setAvailableTime(e.target.value)}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  ほぼ毎日
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  「本気で伸ばしたい」 → 週7投稿
                </div>
              </div>
            </label>
          </div>

          <div className="mt-3 p-3 rounded-lg">
            <div className="flex items-start">
              <span className="text-orange-500 mr-2">💡</span>
              <div className="text-xs text-orange-800">
                初めての方は、週3〜4回がおすすめです。無理なく続けられるペースが一番大事です。
              </div>
            </div>
          </div>
        </div>

        {/* リール（動画）は作れますか？ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            動画（リール）の投稿は可能ですか？ <span className="text-red-500">*</span>
          </label>
          
          <div className="space-y-3">
            <label className="flex items-start cursor-pointer group">
              <input
                type="radio"
                name="reelCapability"
                value="none"
                checked={reelCapability === "none"}
                onChange={(e) => setReelCapability(e.target.value)}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  動画はちょっと苦手...
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  「写真メインの投稿計画にします」 → フィードとストーリーズのみ
                </div>
              </div>
            </label>

            <label className="flex items-start cursor-pointer group">
              <input
                type="radio"
                name="reelCapability"
                value="low"
                checked={reelCapability === "low"}
                onChange={(e) => setReelCapability(e.target.value)}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  週1回くらいなら頑張れる <span className="text-[#FF8A15] ml-2">⭐おすすめ</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  「週1回リール + 写真投稿の組み合わせ」 → フィード + リール + ストーリーズ
                </div>
              </div>
            </label>

            <label className="flex items-start cursor-pointer group">
              <input
                type="radio"
                name="reelCapability"
                value="high"
                checked={reelCapability === "high"}
                onChange={(e) => setReelCapability(e.target.value)}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  動画もどんどん作りたい！
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  「リール中心の成長プランにします」 → リール中心 + ストーリーズ
                </div>
              </div>
            </label>
          </div>

          <div className="mt-3 p-3 rounded-lg">
            <div className="flex items-start">
              <span className="text-orange-500 mr-2">💡</span>
              <div className="text-xs text-orange-800">
                動画は伸びやすいですが、無理せず続けられる方が大事です。まずは週1回から始めてみましょう。
              </div>
            </div>
          </div>
        </div>

        {/* ストーリーズの頻度 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            ストーリーズはどのくらい投稿できますか？ <span className="text-red-500">*</span>
          </label>
          
          <div className="space-y-3">
            <label className="flex items-start cursor-pointer group">
              <input
                type="radio"
                name="storyFrequency"
                value="none"
                checked={storyFrequency === "none"}
                onChange={(e) => setStoryFrequency(e.target.value)}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  ストーリーズは使わない
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  → ストーリーズなし
                </div>
              </div>
            </label>

            <label className="flex items-start cursor-pointer group">
              <input
                type="radio"
                name="storyFrequency"
                value="low"
                checked={storyFrequency === "low"}
                onChange={(e) => setStoryFrequency(e.target.value)}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  週1〜2回
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  → 週2回
                </div>
              </div>
            </label>

            <label className="flex items-start cursor-pointer group">
              <input
                type="radio"
                name="storyFrequency"
                value="medium"
                checked={storyFrequency === "medium"}
                onChange={(e) => setStoryFrequency(e.target.value)}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  週3〜4回
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  → 週4回
                </div>
              </div>
            </label>

            <label className="flex items-start cursor-pointer group">
              <input
                type="radio"
                name="storyFrequency"
                value="daily"
                checked={storyFrequency === "daily"}
                onChange={(e) => setStoryFrequency(e.target.value)}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  毎日 <span className="text-[#FF8A15] ml-2">⭐おすすめ</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  → 毎日1〜3回
                </div>
              </div>
            </label>
          </div>

          <div className="mt-3 p-3 rounded-lg">
            <div className="flex items-start">
              <span className="text-orange-500 mr-2">💡</span>
              <div className="text-xs text-orange-800">
                ストーリーズは、フォロワーとの距離を縮めるのに最適です。毎日投稿すると、反応が良くなります。
              </div>
            </div>
          </div>
        </div>

        {/* セクション区切り */}
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">目標とターゲット設定</h3>
        </div>

        {/* 一番叶えたいこと */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            この期間で、一番叶えたいことは何ですか？ <span className="text-red-500">*</span>
          </label>
          
          <div className="space-y-3">
            {/* 選択肢1: フォロワーを増やしたい */}
            <label className="flex items-start cursor-pointer group">
              <input
                type="radio"
                name="mainGoal"
                value="follower"
                checked={mainGoalType === "follower"}
                onChange={(e) => setMainGoalType(e.target.value)}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  フォロワーを増やしたい
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  → 新規を増やして認知度アップ
                </div>
              </div>
            </label>

            {/* 選択肢2: 今のフォロワーともっと仲良くなりたい */}
            <label className="flex items-start cursor-pointer group">
              <input
                type="radio"
                name="mainGoal"
                value="engagement"
                checked={mainGoalType === "engagement"}
                onChange={(e) => setMainGoalType(e.target.value)}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  今のフォロワーともっと仲良くなりたい
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  → いいねやコメントを増やして関係強化
                </div>
              </div>
            </label>

            {/* 選択肢3: 商品やサービスを広めたい */}
            <label className="flex items-start cursor-pointer group">
              <input
                type="radio"
                name="mainGoal"
                value="reach"
                checked={mainGoalType === "reach"}
                onChange={(e) => setMainGoalType(e.target.value)}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  商品やサービスを広めたい
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  → 投稿を多くの人に見てもらう
                </div>
              </div>
            </label>

            {/* 選択肢4: ブランドのファンを作りたい */}
            <label className="flex items-start cursor-pointer group">
              <input
                type="radio"
                name="mainGoal"
                value="brand"
                checked={mainGoalType === "brand"}
                onChange={(e) => setMainGoalType(e.target.value)}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  ブランドのファンを作りたい
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  → 保存・シェアされる投稿で信頼構築
                </div>
              </div>
            </label>

            {/* 選択肢5: 問い合わせを増やしたい */}
            <label className="flex items-start cursor-pointer group">
              <input
                type="radio"
                name="mainGoal"
                value="inquiry"
                checked={mainGoalType === "inquiry"}
                onChange={(e) => setMainGoalType(e.target.value)}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  問い合わせを増やしたい
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  → プロフィールへのアクセスを増やす
                </div>
              </div>
            </label>

            {/* 選択肢6: 来店を増やしたい */}
            <label className="flex items-start cursor-pointer group">
              <input
                type="radio"
                name="mainGoal"
                value="visit"
                checked={mainGoalType === "visit"}
                onChange={(e) => setMainGoalType(e.target.value)}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  来店を増やしたい
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  → 外部リンクのタップを増やす
                </div>
              </div>
            </label>

            {/* 選択肢7: その他 */}
            <label className="flex items-start cursor-pointer group">
              <input
                type="radio"
                name="mainGoal"
                value="other"
                checked={mainGoalType === "other"}
                onChange={(e) => setMainGoalType(e.target.value)}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  その他
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  → 自由入力
                </div>
              </div>
            </label>
          </div>

          {/* その他を選んだ場合の自由入力欄 */}
          {mainGoalType === "other" && (
            <div className="mt-4">
              <textarea
                value={mainGoalOther}
                onChange={(e) => setMainGoalOther(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A15] resize-none"
                placeholder="その他の目標を入力してください"
              />
            </div>
          )}

          {/* ヒント */}
          <div className="mt-4 p-3 rounded-lg">
            <div className="flex items-start">
              <span className="text-orange-500 mr-2">💡</span>
              <div className="text-xs text-orange-800">
                迷ったら、「フォロワーを増やしたい」を選びましょう。フォロワーが増えれば、他の目標も達成しやすくなります。
              </div>
            </div>
          </div>
        </div>

        {/* セクション区切り */}
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">投稿内容とスケジュール設定</h3>
        </div>

        {/* 投稿時間の希望 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            投稿時間の希望はありますか？ <span className="text-red-500">*</span>
          </label>
          
          <div className="space-y-3">
            <label className="flex items-start cursor-pointer group">
              <input
                type="checkbox"
                checked={preferredPostingTimes.includes("ai")}
                onChange={(e) => {
                  if (e.target.checked) {
                    setPreferredPostingTimes([...preferredPostingTimes, "ai"]);
                  } else {
                    setPreferredPostingTimes(preferredPostingTimes.filter((t) => t !== "ai"));
                  }
                }}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  AIに任せる <span className="text-[#FF8A15] ml-2">⭐おすすめ</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  → AIが最適な時間を提案
                </div>
              </div>
            </label>

            <label className="flex items-start cursor-pointer group">
              <input
                type="checkbox"
                checked={preferredPostingTimes.includes("morning")}
                onChange={(e) => {
                  if (e.target.checked) {
                    setPreferredPostingTimes([...preferredPostingTimes, "morning"]);
                  } else {
                    setPreferredPostingTimes(preferredPostingTimes.filter((t) => t !== "morning"));
                  }
                }}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  午前中（9:00〜12:00）
                </div>
              </div>
            </label>

            <label className="flex items-start cursor-pointer group">
              <input
                type="checkbox"
                checked={preferredPostingTimes.includes("noon")}
                onChange={(e) => {
                  if (e.target.checked) {
                    setPreferredPostingTimes([...preferredPostingTimes, "noon"]);
                  } else {
                    setPreferredPostingTimes(preferredPostingTimes.filter((t) => t !== "noon"));
                  }
                }}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  昼（12:00〜15:00）
                </div>
              </div>
            </label>

            <label className="flex items-start cursor-pointer group">
              <input
                type="checkbox"
                checked={preferredPostingTimes.includes("evening")}
                onChange={(e) => {
                  if (e.target.checked) {
                    setPreferredPostingTimes([...preferredPostingTimes, "evening"]);
                  } else {
                    setPreferredPostingTimes(preferredPostingTimes.filter((t) => t !== "evening"));
                  }
                }}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  夕方（15:00〜18:00）
                </div>
              </div>
            </label>

            <label className="flex items-start cursor-pointer group">
              <input
                type="checkbox"
                checked={preferredPostingTimes.includes("night")}
                onChange={(e) => {
                  if (e.target.checked) {
                    setPreferredPostingTimes([...preferredPostingTimes, "night"]);
                  } else {
                    setPreferredPostingTimes(preferredPostingTimes.filter((t) => t !== "night"));
                  }
                }}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  夜（18:00〜21:00）
                </div>
              </div>
            </label>

            <label className="flex items-start cursor-pointer group">
              <input
                type="checkbox"
                checked={preferredPostingTimes.includes("late")}
                onChange={(e) => {
                  if (e.target.checked) {
                    setPreferredPostingTimes([...preferredPostingTimes, "late"]);
                  } else {
                    setPreferredPostingTimes(preferredPostingTimes.filter((t) => t !== "late"));
                  }
                }}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  深夜（21:00〜24:00）
                </div>
              </div>
            </label>
          </div>

          <div className="mt-3 p-3 rounded-lg">
            <div className="flex items-start">
              <span className="text-orange-500 mr-2">💡</span>
              <div className="text-xs text-orange-800">
                「AIに任せる」を選ぶと、過去のデータから最も反応が良い時間を自動で提案します。
              </div>
            </div>
          </div>
        </div>

        {/* どんな人に投稿を見てもらいたいか */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            どんな人に投稿を見てもらいたいですか？ <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.targetAudience}
            onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A15] resize-none"
            placeholder="例: 30代のママさん。子育てに忙しいけど、自分の時間も大切にしたい人。美味しいコーヒーを飲んでリラックスしたい。"
          />
          <div className="mt-2 p-3 rounded-lg">
            <div className="flex items-start">
              <span className="text-orange-500 mr-2">💡</span>
              <div className="text-xs text-orange-800">
                具体的に書くほど、AIが最適な投稿文を作れます。年齢、性別、興味、悩みなどを書いてください。
              </div>
            </div>
          </div>
        </div>

        {/* 地域を限定しますか？ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            地域を限定しますか？ <span className="text-red-500">*</span>
          </label>
          
          <div className="space-y-3">
            <label className="flex items-start cursor-pointer group">
              <input
                type="radio"
                name="regionRestriction"
                value="none"
                checked={!regionRestrictionEnabled}
                onChange={() => setRegionRestrictionEnabled(false)}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  地域は限定しない
                </div>
              </div>
            </label>

            <label className="flex items-start cursor-pointer group">
              <input
                type="radio"
                name="regionRestriction"
                value="enabled"
                checked={regionRestrictionEnabled}
                onChange={() => setRegionRestrictionEnabled(true)}
                className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                  地域を限定する
                </div>
              </div>
            </label>
          </div>

          {regionRestrictionEnabled && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  都道府県
                </label>
                <input
                  type="text"
                  value={regionPrefecture}
                  onChange={(e) => setRegionPrefecture(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A15]"
                  placeholder="例: 東京都"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  市区町村
                </label>
                <input
                  type="text"
                  value={regionCity}
                  onChange={(e) => setRegionCity(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A15]"
                  placeholder="例: 渋谷区"
                />
              </div>
            </div>
          )}

          <div className="mt-3 p-3 rounded-lg">
            <div className="flex items-start">
              <span className="text-orange-500 mr-2">💡</span>
              <div className="text-xs text-orange-800">
                実店舗がある場合は、地域を限定すると来店につながりやすくなります。
              </div>
            </div>
          </div>
        </div>

        {/* どんな内容を投稿したいか */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            どんな内容を投稿したいですか？ <span className="text-red-500">*</span>
          </label>
          
          <div className="space-y-3">
            {[
              { value: "product", label: "商品・サービスの紹介" },
              { value: "testimonial", label: "お客様の声" },
              { value: "staff", label: "スタッフの日常" },
              { value: "knowledge", label: "豆知識・ノウハウ" },
              { value: "event", label: "イベント・キャンペーン情報" },
              { value: "beforeafter", label: "ビフォーアフター" },
              { value: "behind", label: "舞台裏・制作過程" },
              { value: "other", label: "その他" },
            ].map((option) => (
              <label key={option.value} className="flex items-start cursor-pointer group">
                <input
                  type="checkbox"
                  checked={contentTypes.includes(option.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setContentTypes([...contentTypes, option.value]);
                    } else {
                      setContentTypes(contentTypes.filter((t) => t !== option.value));
                    }
                  }}
                  className="mt-1 mr-3 w-4 h-4 text-[#FF8A15] focus:ring-[#FF8A15]"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 group-hover:text-[#FF8A15] transition-colors">
                    {option.label}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {contentTypes.includes("other") && (
            <div className="mt-4">
              <textarea
                value={contentTypeOther}
                onChange={(e) => setContentTypeOther(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A15] resize-none"
                placeholder="その他の内容を入力してください"
              />
            </div>
          )}

          <div className="mt-3 p-3 rounded-lg">
            <div className="flex items-start">
              <span className="text-orange-500 mr-2">💡</span>
              <div className="text-xs text-orange-800">
                複数選択すると、投稿のバリエーションが増えて、フォロワーが飽きにくくなります。
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={
          isLoading || 
          formData.currentFollowers <= 0 || 
          formData.targetFollowers <= 0 ||
          !availableTime ||
          !reelCapability ||
          !storyFrequency ||
          !mainGoalType ||
          preferredPostingTimes.length === 0 ||
          !formData.targetAudience ||
          contentTypes.length === 0
        }
        className="w-full bg-[#FF8A15] hover:bg-[#E67A0A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-6 py-3 rounded-md transition-colors"
      >
        {isLoading ? "計算中..." : "シミュレーション実行"}
      </button>
    </form>
  );
};

