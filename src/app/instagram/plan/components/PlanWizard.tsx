"use client";

import React, { useState, useEffect } from "react";
import { PlanFormData } from "../types/plan";
import { ArrowLeft, ArrowRight, CheckCircle, Calendar, Target, Clock, Users, FileText, CheckSquare, Loader2 } from "lucide-react";

interface PlanWizardProps {
  formData: PlanFormData;
  onInputChange: (field: keyof PlanFormData, value: string | string[] | boolean) => void;
  onComplete: () => void;
}

const TOTAL_STEPS = 6;

export const PlanWizard: React.FC<PlanWizardProps> = ({
  formData,
  onInputChange,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [targetFollowersSuggestion, setTargetFollowersSuggestion] = useState<{
    suggested: number;
    growthRate: number;
    feasibility: "realistic" | "moderate" | "difficult";
    message: string;
  } | null>(null);

  // ステップ1: 基本情報の検証
  const isStep1Valid = formData.planPeriod && formData.startDate;
  
  // ステップ2: 目標設定の検証
  const isStep2Valid = formData.mainGoal && formData.currentFollowers && formData.targetFollowers;
  
  // ステップ3: 投稿頻度の検証
  const isStep3Valid = formData.availableTime && formData.reelCapability && formData.storyFrequency;
  
  // ステップ4: ターゲット設定の検証
  const isStep4Valid = formData.targetAudience;
  
  // ステップ5: 投稿内容の検証
  const isStep5Valid = formData.postContentTypes && formData.postContentTypes.length > 0;

  // 目標フォロワー数のAI提案を計算
  useEffect(() => {
    if (formData.currentFollowers && formData.planPeriod) {
      const current = parseInt(formData.currentFollowers || "0", 10);
      if (!isNaN(current) && current > 0) {
        // 業界平均の成長率: 月2〜5%
        const monthlyGrowthRate = 0.035; // 3.5%（中間値）
        const periodMonths = formData.planPeriod === "1ヶ月" ? 1 :
                            formData.planPeriod === "3ヶ月" ? 3 :
                            formData.planPeriod === "6ヶ月" ? 6 : 12;
        
        const suggested = Math.round(current * (1 + monthlyGrowthRate * periodMonths));
        const growthRate = ((suggested - current) / current) * 100;
        
        let feasibility: "realistic" | "moderate" | "difficult" = "realistic";
        let message = "現実的な目標です！";
        
        if (growthRate > 50) {
          feasibility = "difficult";
          message = "この目標は達成が非常に困難です";
        } else if (growthRate > 30) {
          feasibility = "moderate";
          message = "やや高い目標ですが、頑張れば達成可能です";
        }
        
        setTargetFollowersSuggestion({
          suggested,
          growthRate,
          feasibility,
          message,
        });
        
        // AI自動提案が有効で、まだ目標が設定されていない場合は自動設定
        if (formData.targetFollowersAuto && !formData.targetFollowers) {
          onInputChange("targetFollowers", suggested.toString());
        }
      }
    }
  }, [formData.currentFollowers, formData.planPeriod, formData.targetFollowersAuto, formData.targetFollowers, onInputChange]);

  // 開始日のデフォルト値を今日に設定
  useEffect(() => {
    if (!formData.startDate) {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      onInputChange("startDate", dateStr);
    }
  }, [formData.startDate, onInputChange]);

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (step: number) => {
    // 前のステップに戻ることは可能
    if (step <= currentStep) {
      setCurrentStep(step);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return isStep1Valid;
      case 2: return isStep2Valid;
      case 3: return isStep3Valid;
      case 4: return isStep4Valid;
      case 5: return isStep5Valid;
      case 6: return true; // 確認画面は常に進める
      default: return false;
    }
  };

  // ステップ1: 基本情報
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">基本情報</h3>
        <p className="text-sm text-gray-600">計画の期間と開始日を設定してください</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          計画期間 <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {["1ヶ月（初心者向け）", "3ヶ月（おすすめ⭐）", "6ヶ月", "1年"].map((option) => {
            const value = option.split("（")[0];
            return (
              <button
                key={value}
                type="button"
                onClick={() => onInputChange("planPeriod", value)}
                className={`p-4 border-2 text-sm font-medium transition-all text-left ${
                  formData.planPeriod === value
                    ? "border-[#FF8A15] bg-[#FF8A15] text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 初めての方は、まず1ヶ月で試してみましょう。慣れてきたら、3ヶ月プランがおすすめです。
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          開始日 <span className="text-red-500">*</span>
        </label>
          <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={formData.startDate ?? ""}
            onChange={(e) => onInputChange("startDate", e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15]"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 すぐに始めたい場合は、今日の日付でOKです。準備が必要な場合は、来週からでも大丈夫です。
        </p>
      </div>
    </div>
  );

  // ステップ2: 目標設定
  const renderStep2 = () => {
    const current = parseInt(formData.currentFollowers || "0", 10);
    const target = parseInt(formData.targetFollowers || "0", 10);
    const gain = target - current;
    const growthRate = current > 0 ? ((gain / current) * 100) : 0;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">目標設定</h3>
          <p className="text-sm text-gray-600">この期間で叶えたい目標を設定してください</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            一番叶えたいこと <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {[
              { value: "customers", label: "お客さんを増やしたい", desc: "フォロワーを増やして認知度アップ" },
              { value: "engagement", label: "今のお客さんともっと仲良くなりたい", desc: "いいねやコメントを増やして関係強化" },
              { value: "reach", label: "商品やサービスを広めたい", desc: "投稿を多くの人に見てもらう" },
              { value: "brand", label: "ブランドのファンを作りたい", desc: "保存・シェアされる投稿で信頼構築" },
              { value: "inquiry", label: "問い合わせを増やしたい", desc: "プロフィールへのアクセスを増やす" },
              { value: "visit", label: "来店を増やしたい", desc: "外部リンクのタップを増やす" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onInputChange("mainGoal", option.value)}
                className={`w-full p-4 border-2 text-left transition-all ${
                  formData.mainGoal === option.value
                    ? "border-[#FF8A15] bg-[#FF8A15] text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="font-medium">{option.label}</div>
                <div className="text-xs mt-1 opacity-80">→ {option.desc}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 迷ったら、「お客さんを増やしたい」を選びましょう。フォロワーが増えれば、他の目標も達成しやすくなります。
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            現在のフォロワー数 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.currentFollowers || ""}
            onChange={(e) => onInputChange("currentFollowers", e.target.value)}
            placeholder="例: 530"
            className="w-full px-4 py-3 border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15]"
            min="0"
          />
          <p className="text-xs text-gray-500 mt-2">
            💡 Instagramアプリで確認できます。プロフィール画面の「フォロワー」の数字です。
          </p>
        </div>

        {targetFollowersSuggestion && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              目標フォロワー数（AIが自動提案）
            </label>
            <div className={`p-4 border-2 ${
              targetFollowersSuggestion.feasibility === "realistic" ? "border-green-200 bg-green-50" :
              targetFollowersSuggestion.feasibility === "moderate" ? "border-yellow-200 bg-yellow-50" :
              "border-red-200 bg-red-50"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-medium text-gray-700">現在: {current.toLocaleString()}人</div>
                  <div className="text-lg font-bold text-[#FF8A15]">
                    目標: {targetFollowersSuggestion.suggested.toLocaleString()}人
                    {gain !== 0 && `（${gain > 0 ? '+' : ''}${gain}人、${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}%）`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onInputChange("targetFollowers", targetFollowersSuggestion.suggested.toString());
                    onInputChange("targetFollowersAuto", true);
                  }}
                  className="px-4 py-2 bg-[#FF8A15] text-white text-sm font-medium hover:bg-[#E67A0A] transition-colors"
                >
                  この目標にする
                </button>
              </div>
              <div className={`text-sm font-medium ${
                targetFollowersSuggestion.feasibility === "realistic" ? "text-green-700" :
                targetFollowersSuggestion.feasibility === "moderate" ? "text-yellow-700" :
                "text-red-700"
              }`}>
                {targetFollowersSuggestion.feasibility === "realistic" ? "✅" : "⚠️"} {targetFollowersSuggestion.message}
              </div>
              {targetFollowersSuggestion.feasibility === "difficult" && (
                <div className="mt-2 text-xs text-red-600">
                  💡 おすすめ: まずは、+{Math.round(current * 0.075)}人（+7.5%）の目標で始めましょう。
                </div>
              )}
            </div>
            <div className="mt-3">
              <label className="block text-xs text-gray-600 mb-2">目標を手動で調整する</label>
              <input
                type="number"
                value={formData.targetFollowers || ""}
                onChange={(e) => {
                  onInputChange("targetFollowers", e.target.value);
                  onInputChange("targetFollowersAuto", false);
                }}
                placeholder="目標フォロワー数を入力"
                className="w-full px-4 py-3 border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15]"
                min={current}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // ステップ3: 投稿頻度
  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">投稿頻度の設定</h3>
        <p className="text-sm text-gray-600">無理なく続けられる投稿頻度を設定してください</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          投稿に使える時間 <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {[
            { value: "weekly-1-2", label: "週1〜2回（1回10分程度）", desc: "「忙しいけど、無理なく続けたい」", posts: "週2投稿" },
            { value: "weekly-3-4", label: "週3〜4回（1回15分程度）⭐おすすめ", desc: "「しっかり取り組みたい」", posts: "週4投稿" },
            { value: "daily", label: "ほぼ毎日（1回20分程度）", desc: "「本気で伸ばしたい」", posts: "週7投稿" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onInputChange("availableTime", option.value)}
              className={`w-full p-4 border-2 text-left transition-all ${
                formData.availableTime === option.value
                  ? "border-[#FF8A15] bg-[#FF8A15] text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="font-medium">{option.label}</div>
              <div className="text-xs mt-1 opacity-80">{option.desc} → {option.posts}</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 初めての方は、週3〜4回がおすすめです。無理なく続けられるペースが一番大事です。
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          リール（動画）は作れますか？ <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {[
            { value: "no-reel", label: "動画はちょっと苦手...", desc: "「写真メインの投稿計画にします」", plan: "フィードとストーリーズのみ" },
            { value: "weekly-1", label: "週1回くらいなら頑張れる ⭐おすすめ", desc: "「週1回リール + 写真投稿の組み合わせ」", plan: "フィード + リール + ストーリーズ" },
            { value: "reel-focused", label: "動画もどんどん作りたい！", desc: "「リール中心の成長プランにします」", plan: "リール中心 + ストーリーズ" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onInputChange("reelCapability", option.value)}
              className={`w-full p-4 border-2 text-left transition-all ${
                formData.reelCapability === option.value
                  ? "border-[#FF8A15] bg-[#FF8A15] text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="font-medium">{option.label}</div>
              <div className="text-xs mt-1 opacity-80">{option.desc} → {option.plan}</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 動画は伸びやすいですが、無理せず続けられる方が大事です。まずは週1回から始めてみましょう。
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ストーリーズの頻度 <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "none", label: "ストーリーズは使わない" },
            { value: "weekly-1-2", label: "週1〜2回" },
            { value: "weekly-3-4", label: "週3〜4回" },
            { value: "daily", label: "毎日 ⭐おすすめ" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onInputChange("storyFrequency", option.value)}
              className={`p-4 border-2 text-sm font-medium transition-all ${
                formData.storyFrequency === option.value
                  ? "border-[#FF8A15] bg-[#FF8A15] text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 ストーリーズは、フォロワーとの距離を縮めるのに最適です。毎日投稿すると、反応が良くなります。
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          投稿時間の希望 <span className="text-gray-500">（任意）</span>
        </label>
        <div className="space-y-2">
          <label className="flex items-center p-3 border-2 border-gray-200 hover:border-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.postingTimePreference?.includes("ai") || false}
              onChange={(e) => {
                const current = formData.postingTimePreference || [];
                if (e.target.checked) {
                  onInputChange("postingTimePreference", ["ai"]);
                } else {
                  onInputChange("postingTimePreference", current.filter(t => t !== "ai"));
                }
              }}
              className="mr-3"
            />
            <span className="font-medium">AIに任せる ⭐おすすめ</span>
            <span className="ml-2 text-xs text-gray-500">→ AIが最適な時間を提案</span>
          </label>
          {!formData.postingTimePreference?.includes("ai") && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { value: "morning", label: "午前中（9:00〜12:00）" },
                { value: "noon", label: "昼（12:00〜15:00）" },
                { value: "evening", label: "夕方（15:00〜18:00）" },
                { value: "night", label: "夜（18:00〜21:00）" },
                { value: "late", label: "深夜（21:00〜24:00）" },
              ].map((option) => (
                <label key={option.value} className="flex items-center p-3 border-2 border-gray-200 hover:border-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.postingTimePreference?.includes(option.value) || false}
                    onChange={(e) => {
                      const current = formData.postingTimePreference || [];
                      if (e.target.checked) {
                        onInputChange("postingTimePreference", [...current, option.value]);
                      } else {
                        onInputChange("postingTimePreference", current.filter(t => t !== option.value));
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 「AIに任せる」を選ぶと、過去のデータから最も反応が良い時間を自動で提案します。
        </p>
      </div>
    </div>
  );

  // ステップ4: ターゲット設定
  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">ターゲット設定</h3>
        <p className="text-sm text-gray-600">どんな人に投稿を見てもらいたいか設定してください</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ターゲット層 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.targetAudience || ""}
          onChange={(e) => onInputChange("targetAudience", e.target.value)}
          placeholder="例: 30代のママさん。子育てに忙しいけど、自分の時間も大切にしたい人。美味しいコーヒーを飲んでリラックスしたい。"
          rows={4}
          className="w-full px-4 py-3 border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15] resize-none"
        />
        <p className="text-xs text-gray-500 mt-2">
          💡 具体的に書くほど、AIが最適な投稿文を作れます。年齢、性別、興味、悩みなどを書いてください。
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          地域 <span className="text-gray-500">（任意）</span>
        </label>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="region-none"
              name="region"
              checked={!Boolean(formData.targetRegionEnabled)}
              onChange={() => onInputChange("targetRegionEnabled", false)}
              className="w-4 h-4"
            />
            <label htmlFor="region-none" className="cursor-pointer">地域は限定しない</label>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="region-yes"
              name="region"
              checked={Boolean(formData.targetRegionEnabled)}
              onChange={() => onInputChange("targetRegionEnabled", true)}
              className="w-4 h-4"
            />
            <label htmlFor="region-yes" className="cursor-pointer">地域を限定する</label>
          </div>
          {Boolean(formData.targetRegionEnabled) && (
            <input
              type="text"
              value={formData.targetRegion || ""}
              onChange={(e) => onInputChange("targetRegion", e.target.value)}
              placeholder="例: 福岡県福岡市"
              className="w-full px-4 py-3 border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15]"
            />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 実店舗がある場合は、地域を限定すると来店につながりやすくなります。
        </p>
      </div>
    </div>
  );

  // ステップ5: 投稿内容
  const renderStep5 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">投稿内容の設定</h3>
        <p className="text-sm text-gray-600">どんな内容を投稿したいか設定してください</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          投稿したい内容 <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            "商品・サービスの紹介",
            "お客様の声",
            "スタッフの日常",
            "豆知識・ノウハウ",
            "イベント・キャンペーン情報",
            "ビフォーアフター",
            "舞台裏・制作過程",
          ].map((content) => (
            <label key={content} className="flex items-center p-3 border-2 border-gray-200 hover:border-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.postContentTypes?.includes(content) || false}
                onChange={(e) => {
                  const current = formData.postContentTypes || [];
                  if (e.target.checked) {
                    onInputChange("postContentTypes", [...current, content]);
                  } else {
                    onInputChange("postContentTypes", current.filter(c => c !== content));
                  }
                }}
                className="mr-3"
              />
              <span className="text-sm">{content}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 複数選択すると、投稿のバリエーションが増えて、フォロワーが飽きにくくなります。
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          避けたいこと <span className="text-gray-500">（任意）</span>
        </label>
        <textarea
          value={formData.avoidContent || ""}
          onChange={(e) => onInputChange("avoidContent", e.target.value)}
          placeholder="例: 競合他社の名前は出さない&#10;価格は具体的に書かない&#10;個人情報は載せない"
          rows={4}
          className="w-full px-4 py-3 border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15] resize-none"
        />
        <p className="text-xs text-gray-500 mt-2">
          💡 AIが投稿文を作る際に、これらの内容を避けるようにします。
        </p>
      </div>
    </div>
  );

  // ステップ6: 確認・生成
  const renderStep6 = () => {
    const getMainGoalLabel = (value: string) => {
      const map: Record<string, string> = {
        customers: "お客さんを増やしたい",
        engagement: "今のお客さんともっと仲良くなりたい",
        reach: "商品やサービスを広めたい",
        brand: "ブランドのファンを作りたい",
        inquiry: "問い合わせを増やしたい",
        visit: "来店を増やしたい",
      };
      return map[value] || value;
    };

    const getAvailableTimeLabel = (value: string) => {
      const map: Record<string, string> = {
        "weekly-1-2": "週1〜2回（1回10分程度）",
        "weekly-3-4": "週3〜4回（1回15分程度）",
        "daily": "ほぼ毎日（1回20分程度）",
      };
      return map[value] || value;
    };

    const getReelCapabilityLabel = (value: string) => {
      const map: Record<string, string> = {
        "no-reel": "動画はちょっと苦手...",
        "weekly-1": "週1回くらいなら頑張れる",
        "reel-focused": "動画もどんどん作りたい！",
      };
      return map[value] || value;
    };

    const getStoryFrequencyLabel = (value: string) => {
      const map: Record<string, string> = {
        "none": "ストーリーズは使わない",
        "weekly-1-2": "週1〜2回",
        "weekly-3-4": "週3〜4回",
        "daily": "毎日",
      };
      return map[value] || value;
    };

    const startDate = formData.startDate ? new Date(formData.startDate) : null;
    const endDate = startDate ? (() => {
      const months = formData.planPeriod === "1ヶ月" ? 1 :
                    formData.planPeriod === "3ヶ月" ? 3 :
                    formData.planPeriod === "6ヶ月" ? 6 : 12;
      const newDate = new Date(startDate);
      newDate.setMonth(newDate.getMonth() + months);
      return newDate;
    })() : null;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">入力内容の確認</h3>
          <p className="text-sm text-gray-600">設定内容を確認して、計画を生成してください</p>
        </div>

        <div className="bg-gray-50 border-2 border-gray-200 p-6 space-y-4">
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">基本情報</div>
            <div className="text-sm text-gray-900">
              <div>計画期間: {formData.planPeriod}</div>
              {startDate && <div>開始日: {startDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}</div>}
              {endDate && <div>終了日: {endDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}</div>}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">目標設定</div>
            <div className="text-sm text-gray-900">
              <div>一番叶えたいこと: {getMainGoalLabel(formData.mainGoal || "")}</div>
              <div>現在のフォロワー数: {parseInt(formData.currentFollowers || "0", 10).toLocaleString()}人</div>
              <div>目標フォロワー数: {parseInt(formData.targetFollowers || "0", 10).toLocaleString()}人</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">投稿頻度</div>
            <div className="text-sm text-gray-900">
              <div>投稿頻度: {getAvailableTimeLabel(formData.availableTime || "")}</div>
              <div>リール: {getReelCapabilityLabel(formData.reelCapability || "")}</div>
              <div>ストーリーズ: {getStoryFrequencyLabel(formData.storyFrequency || "")}</div>
              <div>投稿時間: {formData.postingTimePreference?.includes("ai") ? "AIに任せる" : formData.postingTimePreference?.join("、") || "未設定"}</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">ターゲット</div>
            <div className="text-sm text-gray-900">
              <div>ターゲット層: {formData.targetAudience || "未設定"}</div>
              {formData.targetRegionEnabled && <div>地域: {formData.targetRegion || "未設定"}</div>}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">投稿内容</div>
            <div className="text-sm text-gray-900">
              <div>投稿したい内容:</div>
              <ul className="list-disc list-inside ml-2">
                {formData.postContentTypes?.map((content, index) => (
                  <li key={index}>{content}</li>
                ))}
              </ul>
              {formData.avoidContent && (
                <div className="mt-2">
                  <div>避けたいこと:</div>
                  <div className="ml-2">{formData.avoidContent}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="px-4 py-2 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            編集する
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="flex-1 px-6 py-3 bg-[#FF8A15] text-white font-medium hover:bg-[#E67A0A] transition-colors flex items-center justify-center gap-2"
          >
            <CheckSquare className="w-5 h-5" />
            計画を生成する
          </button>
        </div>
      </div>
    );
  };

  const stepTitles = [
    "基本情報",
    "目標設定",
    "投稿頻度",
    "ターゲット",
    "投稿内容",
    "確認・生成",
  ];

  const stepIcons = [
    Calendar,
    Target,
    Clock,
    Users,
    FileText,
    CheckSquare,
  ];

  return (
    <div className="bg-white border border-gray-200 p-6">
      {/* ステップインジケーター */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {stepTitles.map((title, index) => {
            const StepIcon = stepIcons[index];
            const stepNum = index + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;
            const isAccessible = stepNum <= currentStep;

            return (
              <React.Fragment key={stepNum}>
                <div className="flex flex-col items-center flex-1">
                  <button
                    type="button"
                    onClick={() => handleStepClick(stepNum)}
                    disabled={!isAccessible}
                    className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                      isCompleted
                        ? "bg-green-500 border-green-500 text-white"
                        : isCurrent
                        ? "bg-[#FF8A15] border-[#FF8A15] text-white"
                        : "bg-white border-gray-300 text-gray-400"
                    } ${isAccessible ? "cursor-pointer hover:scale-110" : "cursor-not-allowed"}`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <StepIcon className="w-6 h-6" />
                    )}
                  </button>
                  <div className={`mt-2 text-xs font-medium text-center ${
                    isCurrent ? "text-[#FF8A15]" : isCompleted ? "text-green-600" : "text-gray-400"
                  }`}>
                    {title}
                  </div>
                </div>
                {stepNum < TOTAL_STEPS && (
                  <div className={`flex-1 h-1 mx-2 ${
                    isCompleted ? "bg-[#FF8A15]" : "bg-gray-300"
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div className="text-center text-sm text-gray-600">
          ステップ {currentStep} / {TOTAL_STEPS}
        </div>
      </div>

      {/* ステップコンテンツ */}
      <div className="mb-6">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
        {currentStep === 6 && renderStep6()}
      </div>

      {/* ナビゲーションボタン */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentStep === 1}
          className={`flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-gray-700 transition-colors ${
            currentStep === 1
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-gray-50"
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          前へ
        </button>
        {currentStep < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex items-center gap-2 px-6 py-2 bg-[#FF8A15] text-white font-medium transition-colors ${
              canProceed()
                ? "hover:bg-[#E67A0A]"
                : "opacity-50 cursor-not-allowed"
            }`}
          >
            次へ
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="text-sm text-gray-500">
            確認画面で「計画を生成する」をクリックしてください
          </div>
        )}
      </div>
    </div>
  );
};

