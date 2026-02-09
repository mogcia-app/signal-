"use client";

import React, { useState, useEffect } from "react";
import { PlanFormData } from "../types/plan";
import { TargetFollowerAutoInput } from "./TargetFollowerAutoInput";
import { useAuth } from "../../../../contexts/auth-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { authFetch } from "../../../../utils/authFetch";
import { PlanFormSubmitButton } from "./PlanFormSubmitButton";
// PlanFormBasicInfo is not used

interface PlanFormProps {
  onSubmit: (data: PlanFormData, aiSuggestedTarget?: number) => void;
  isLoading?: boolean;
  initialData?: PlanFormData | null; // 初期データ（保存済み計画から）
}

export const PlanForm: React.FC<PlanFormProps> = ({ onSubmit, isLoading = false, initialData }) => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();

  // デフォルトの開始日は今日
  const getDefaultStartDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getInitialFormData = (): PlanFormData => {
    if (initialData) {
      return initialData;
    }
    return {
    currentFollowers: 0,
    targetFollowers: 0,
    periodMonths: 1, // 1ヶ月固定
    startDate: getDefaultStartDate(),
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
    };
  };

  const [formData, setFormData] = useState<PlanFormData>(getInitialFormData());

  // initialDataが変更されたら更新
  useEffect(() => {
    if (initialData) {
      // 完全なコピーを作成して確実に更新
      setFormData({ ...initialData });
      
      // 選択ボタンの状態も更新
      if (initialData.preferredPostingTimes) {
        setPreferredPostingTimes([...initialData.preferredPostingTimes]);
      }
      if (initialData.contentTypes) {
        setContentTypes([...initialData.contentTypes]);
      }
      if (initialData.regionRestriction) {
        setRegionRestrictionEnabled(initialData.regionRestriction.enabled || false);
        if (initialData.regionRestriction.prefecture) {
          setRegionPrefecture(initialData.regionRestriction.prefecture);
        }
        if (initialData.regionRestriction.city) {
          setRegionCity(initialData.regionRestriction.city);
        }
      }
      if (initialData.contentTypeOther) {
        setContentTypeOther(initialData.contentTypeOther);
      }
      
      // 今月の目標設定を復元
      if (initialData.useBaseGoals !== undefined) {
        setUseBaseGoals(initialData.useBaseGoals);
      }
      if (initialData.useBaseChallenges !== undefined) {
        setUseBaseChallenges(initialData.useBaseChallenges);
      }
      if (initialData.monthlyGoals) {
        setMonthlyGoals(initialData.monthlyGoals);
      }
      if (initialData.monthlyChallenges) {
        setMonthlyChallenges(initialData.monthlyChallenges);
      }
      
      // ラジオボタンの選択状態も更新
      // mainGoalTypeの復元
      if (initialData.mainGoal) {
        const validMainGoalTypes = ["follower", "engagement", "reach", "brand", "inquiry", "visit", "other"];
        // mainGoalが有効な値（"follower"など）の場合はそのまま設定
        if (validMainGoalTypes.includes(initialData.mainGoal)) {
          setMainGoalType(initialData.mainGoal);
          // "other"の場合は、mainGoalの値自体をmainGoalOtherとして扱う
          if (initialData.mainGoal === "other") {
            // formData.mainGoalにカスタムテキストが入っている可能性がある
            // ただし、ここでは"other"が設定されているので、mainGoalOtherは空のまま
            // 実際のカスタムテキストはformData.mainGoalに保存されている
          }
        } else {
          // mainGoalが有効な値でない場合（カスタムテキストの場合）、"other"として扱う
          setMainGoalType("other");
          setMainGoalOther(initialData.mainGoal);
        }
      }
      
      // availableTimeの復元（weeklyFeedPostsから逆算）
      if (initialData.weeklyFeedPosts !== undefined) {
        if (initialData.weeklyFeedPosts <= 2) {
          setAvailableTime("low");
        } else if (initialData.weeklyFeedPosts <= 4) {
          setAvailableTime("medium");
        } else if (initialData.weeklyFeedPosts >= 7) {
          setAvailableTime("high");
        }
      }
      
      // reelCapabilityの復元（weeklyReelPostsから逆算）
      if (initialData.weeklyReelPosts !== undefined) {
        if (initialData.weeklyReelPosts === 0) {
          setReelCapability("none");
        } else if (initialData.weeklyReelPosts === 1) {
          setReelCapability("low");
        } else if (initialData.weeklyReelPosts >= 3) {
          setReelCapability("high");
        }
      }
      
      // storyFrequencyの復元（weeklyStoryPostsから逆算）
      if (initialData.weeklyStoryPosts !== undefined) {
        if (initialData.weeklyStoryPosts === 0) {
          setStoryFrequency("none");
        } else if (initialData.weeklyStoryPosts <= 2) {
          setStoryFrequency("low");
        } else if (initialData.weeklyStoryPosts <= 4) {
          setStoryFrequency("medium");
        } else if (initialData.weeklyStoryPosts >= 7) {
          setStoryFrequency("daily");
        }
      }
    }
  }, [initialData]);

  // 現在のフォロワー数を取得して初期値として設定
  useEffect(() => {
    const fetchCurrentFollowers = async () => {
      if (!user) return;

      try {
        // 既存のプランを取得
        const plansResponse = await authFetch("/api/plans?snsType=instagram&status=active&limit=1");
        if (plansResponse.ok) {
          const plansData = await plansResponse.json();
          if (plansData.success && plansData.plans && plansData.plans.length > 0) {
            const plan = plansData.plans[0];
            // actualFollowersがあればそれを使用、なければcurrentFollowersを使用
            const currentFollowers = plan.actualFollowers ?? plan.currentFollowers ?? 0;
            if (currentFollowers > 0) {
              setFormData((prev) => ({ ...prev, currentFollowers }));
              return;
            }
          }
        }

        // プランがない場合、initialFollowers + totalMonthlyFollowerIncreaseを計算
        const initialFollowers = userProfile?.businessInfo?.initialFollowers || 0;
        if (initialFollowers > 0) {
          // 今月の増加数を取得するためにKPI分解APIを呼び出す
          const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
          const kpiResponse = await authFetch(`/api/analytics/kpi-breakdown?date=${currentMonth}`);
          if (kpiResponse.ok) {
            const kpiData = await kpiResponse.json();
            if (kpiData.success && kpiData.data) {
              const currentFollowersBreakdown = kpiData.data.breakdowns?.find(
                (b: { kpi: string }) => b.kpi === "current_followers"
              );
              const monthlyIncrease = currentFollowersBreakdown?.value || 0;
              const currentFollowers = Math.max(0, initialFollowers + monthlyIncrease);
              if (currentFollowers > 0) {
                setFormData((prev) => ({ ...prev, currentFollowers }));
                return;
              }
            }
          }
        }

        // フォールバック: initialFollowersのみを使用
        if (initialFollowers > 0) {
          setFormData((prev) => ({ ...prev, currentFollowers: initialFollowers }));
        }
      } catch (error) {
        console.error("現在のフォロワー数取得エラー:", error);
        // エラーが発生しても初期値0のまま続行
      }
    };

    if (user && userProfile) {
      fetchCurrentFollowers();
    }
  }, [user, userProfile]);

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
  
  // 今月の目標設定用のstate
  const [useBaseGoals, setUseBaseGoals] = useState<boolean>(true);
  const [useBaseChallenges, setUseBaseChallenges] = useState<boolean>(true);
  const [monthlyGoals, setMonthlyGoals] = useState<string>("");
  const [monthlyChallenges, setMonthlyChallenges] = useState<string>("");

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
    
    // 今月の目標設定をformDataに追加
    const finalFormData = {
      ...formData,
      useBaseGoals,
      useBaseChallenges,
      monthlyGoals: useBaseGoals ? "" : monthlyGoals,
      monthlyChallenges: useBaseChallenges ? "" : monthlyChallenges,
    };
    
    onSubmit(finalFormData, aiSuggestedTarget);
  };

  const isFormValid = 
    formData.currentFollowers > 0 && 
    formData.targetFollowers > 0 &&
    Boolean(availableTime) &&
    Boolean(reelCapability) &&
    Boolean(storyFrequency) &&
    Boolean(mainGoalType) &&
    preferredPostingTimes.length > 0 &&
    Boolean(formData.targetAudience) &&
    contentTypes.length > 0;

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
        
        {/* 計画開始日 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            計画開始日 <span className="text-red-600 font-bold text-base ml-1">*</span>
          </label>
          <input
            type="date"
            required
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            min={getDefaultStartDate()}
            className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF8A15]"
          />
          <p className="text-xs text-gray-500 mt-1">
            目標達成期間: 1ヶ月（固定）
          </p>
        </div>

        {/* 現在のフォロワー数 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            現在のフォロワー数 <span className="text-red-600 font-bold text-base ml-1">*</span>
          </label>
          <input
            type="number"
            required
            min="1"
            value={formData.currentFollowers || ""}
            onChange={(e) => setFormData({ ...formData, currentFollowers: parseInt(e.target.value) || 0 })}
            className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF8A15]"
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
            1週間で、どのくらい投稿に時間を使えますか？ <span className="text-red-600 font-bold text-base ml-1">*</span>
          </label>
          
          <div className="space-y-3">
            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              availableTime === "low"
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
              <input
                type="radio"
                name="availableTime"
                value="low"
                checked={availableTime === "low"}
                onChange={(e) => setAvailableTime(e.target.value)}
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  availableTime === "low" ? "text-gray-900" : "text-gray-700"
                }`}>
                  週1〜2回
                </div>
                <div className="text-sm text-gray-500 mt-1.5">
                  忙しいけど、無理なく続けたい
                </div>
              </div>
            </label>

            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              availableTime === "medium"
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
              <input
                type="radio"
                name="availableTime"
                value="medium"
                checked={availableTime === "medium"}
                onChange={(e) => setAvailableTime(e.target.value)}
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  availableTime === "medium" ? "text-gray-900" : "text-gray-700"
                }`}>
                  週3〜4回
                  <span className="ml-2 text-xs font-normal text-orange-700 bg-orange-50 px-2 py-1 border border-orange-200">推奨</span>
                </div>
                <div className="text-sm text-gray-500 mt-1.5">
                  しっかり取り組みたい
                </div>
              </div>
            </label>

            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              availableTime === "high"
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
              <input
                type="radio"
                name="availableTime"
                value="high"
                checked={availableTime === "high"}
                onChange={(e) => setAvailableTime(e.target.value)}
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  availableTime === "high" ? "text-gray-900" : "text-gray-700"
                }`}>
                  ほぼ毎日
                </div>
                <div className="text-sm text-gray-500 mt-1.5">
                  本気で伸ばしたい
                </div>
              </div>
            </label>
          </div>

          <div className="mt-4 p-4 bg-gray-50 border border-gray-200">
            <div className="flex items-start">
              <span className="text-gray-600 mr-2 text-sm">💡</span>
              <div className="text-sm text-gray-600 leading-relaxed">
                初めての方は、週3〜4回がおすすめです。無理なく続けられるペースが一番大事です。
              </div>
            </div>
          </div>
        </div>

        {/* リール（動画）は作れますか？ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            動画（リール）の投稿は可能ですか？ <span className="text-red-600 font-bold text-base ml-1">*</span>
          </label>
          
          <div className="space-y-3">
            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              reelCapability === "none"
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
              <input
                type="radio"
                name="reelCapability"
                value="none"
                checked={reelCapability === "none"}
                onChange={(e) => setReelCapability(e.target.value)}
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  reelCapability === "none" ? "text-gray-900" : "text-gray-700"
                }`}>
                  動画はちょっと苦手
                </div>
                <div className="text-sm text-gray-500 mt-1.5">
                  写真メインの投稿計画にします
                </div>
              </div>
            </label>

            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              reelCapability === "low"
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
              <input
                type="radio"
                name="reelCapability"
                value="low"
                checked={reelCapability === "low"}
                onChange={(e) => setReelCapability(e.target.value)}
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  reelCapability === "low" ? "text-gray-900" : "text-gray-700"
                }`}>
                  週1回くらいなら頑張れる
                  <span className="ml-2 text-xs font-normal text-orange-700 bg-orange-50 px-2 py-1 border border-orange-200">推奨</span>
                </div>
                <div className="text-sm text-gray-500 mt-1.5">
                  週1回リール + 写真投稿の組み合わせ
                </div>
              </div>
            </label>

            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              reelCapability === "high"
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
              <input
                type="radio"
                name="reelCapability"
                value="high"
                checked={reelCapability === "high"}
                onChange={(e) => setReelCapability(e.target.value)}
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  reelCapability === "high" ? "text-gray-900" : "text-gray-700"
                }`}>
                  動画もどんどん作りたい
                </div>
                <div className="text-sm text-gray-500 mt-1.5">
                  リール中心の成長プランにします
                </div>
              </div>
            </label>
          </div>

          <div className="mt-4 p-4 bg-gray-50 border border-gray-200">
            <div className="flex items-start">
              <span className="text-gray-600 mr-2 text-sm">💡</span>
              <div className="text-sm text-gray-600 leading-relaxed">
                動画は伸びやすいですが、無理せず続けられる方が大事です。まずは週1回から始めてみましょう。
              </div>
            </div>
          </div>
        </div>

        {/* ストーリーズの頻度 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            ストーリーズはどのくらい投稿できますか？ <span className="text-red-600 font-bold text-base ml-1">*</span>
          </label>
          
          <div className="space-y-3">
            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              storyFrequency === "none"
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
              <input
                type="radio"
                name="storyFrequency"
                value="none"
                checked={storyFrequency === "none"}
                onChange={(e) => setStoryFrequency(e.target.value)}
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  storyFrequency === "none" ? "text-gray-900" : "text-gray-700"
                }`}>
                  ストーリーズは使わない
                </div>
              </div>
            </label>

            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              storyFrequency === "low"
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
              <input
                type="radio"
                name="storyFrequency"
                value="low"
                checked={storyFrequency === "low"}
                onChange={(e) => setStoryFrequency(e.target.value)}
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  storyFrequency === "low" ? "text-gray-900" : "text-gray-700"
                }`}>
                  週1〜2回
                </div>
              </div>
            </label>

            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              storyFrequency === "medium"
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
              <input
                type="radio"
                name="storyFrequency"
                value="medium"
                checked={storyFrequency === "medium"}
                onChange={(e) => setStoryFrequency(e.target.value)}
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  storyFrequency === "medium" ? "text-gray-900" : "text-gray-700"
                }`}>
                  週3〜4回
                </div>
              </div>
            </label>

            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              storyFrequency === "daily"
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
              <input
                type="radio"
                name="storyFrequency"
                value="daily"
                checked={storyFrequency === "daily"}
                onChange={(e) => setStoryFrequency(e.target.value)}
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  storyFrequency === "daily" ? "text-gray-900" : "text-gray-700"
                }`}>
                  毎日
                  <span className="ml-2 text-xs font-normal text-orange-700 bg-orange-50 px-2 py-1 border border-orange-200">推奨</span>
                </div>
              </div>
            </label>
          </div>

          <div className="mt-4 p-4 bg-gray-50 border border-gray-200">
            <div className="flex items-start">
              <span className="text-gray-600 mr-2 text-sm">💡</span>
              <div className="text-sm text-gray-600 leading-relaxed">
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
            この期間で、一番叶えたいことは何ですか？ <span className="text-red-600 font-bold text-base ml-1">*</span>
          </label>
          
          <div className="space-y-3">
            {/* 選択肢1: フォロワーを増やしたい */}
            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              mainGoalType === "follower"
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
              <input
                type="radio"
                name="mainGoal"
                value="follower"
                checked={mainGoalType === "follower"}
                onChange={(e) => setMainGoalType(e.target.value)}
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  mainGoalType === "follower" ? "text-gray-900" : "text-gray-700"
                }`}>
                  フォロワーを増やしたい
                </div>
                <div className="text-sm text-gray-500 mt-1.5">
                  → 新規を増やして認知度アップ
                </div>
                <div className="text-xs text-gray-400 mt-1.5 font-medium">
                  KPI: フォロワー増加
                </div>
              </div>
            </label>

            {/* 選択肢2: 今のフォロワーともっと仲良くなりたい */}
            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              mainGoalType === "engagement"
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
              <input
                type="radio"
                name="mainGoal"
                value="engagement"
                checked={mainGoalType === "engagement"}
                onChange={(e) => setMainGoalType(e.target.value)}
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  mainGoalType === "engagement" ? "text-gray-900" : "text-gray-700"
                }`}>
                  今のフォロワーともっと仲良くなりたい
                </div>
                <div className="text-sm text-gray-500 mt-1.5">
                  → いいねやコメントを増やして関係強化
                </div>
                <div className="text-xs text-gray-400 mt-1.5 font-medium">
                  KPI: エンゲージメント率、いいね数、コメント数
                </div>
              </div>
            </label>

            {/* 選択肢3: 商品やサービスを広めたい */}
            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              mainGoalType === "reach"
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
              <input
                type="radio"
                name="mainGoal"
                value="reach"
                checked={mainGoalType === "reach"}
                onChange={(e) => setMainGoalType(e.target.value)}
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  mainGoalType === "reach" ? "text-gray-900" : "text-gray-700"
                }`}>
                  商品やサービスを広めたい
                </div>
                <div className="text-sm text-gray-500 mt-1.5">
                  → 投稿を多くの人に見てもらう
                </div>
                <div className="text-xs text-gray-400 mt-1.5 font-medium">
                  KPI: リーチ数
                </div>
              </div>
            </label>

            {/* 選択肢4: ブランドのファンを作りたい */}
            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              mainGoalType === "brand"
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
              <input
                type="radio"
                name="mainGoal"
                value="brand"
                checked={mainGoalType === "brand"}
                onChange={(e) => setMainGoalType(e.target.value)}
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  mainGoalType === "brand" ? "text-gray-900" : "text-gray-700"
                }`}>
                  ブランドのファンを作りたい
                </div>
                <div className="text-sm text-gray-500 mt-1.5">
                  → 保存・シェアされる投稿で信頼構築
                </div>
                <div className="text-xs text-gray-400 mt-1.5 font-medium">
                  KPI: 保存数、シェア数
                </div>
              </div>
            </label>

            {/* 選択肢5: 問い合わせを増やしたい */}
            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              mainGoalType === "inquiry"
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
              <input
                type="radio"
                name="mainGoal"
                value="inquiry"
                checked={mainGoalType === "inquiry"}
                onChange={(e) => setMainGoalType(e.target.value)}
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  mainGoalType === "inquiry" ? "text-gray-900" : "text-gray-700"
                }`}>
                  問い合わせを増やしたい
                </div>
                <div className="text-sm text-gray-500 mt-1.5">
                  → プロフィールへのアクセスを増やす
                </div>
                <div className="text-xs text-gray-400 mt-1.5 font-medium">
                  KPI: プロフィールクリック数
                </div>
              </div>
            </label>

            {/* 選択肢6: 来店を増やしたい */}
            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              mainGoalType === "visit"
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
              <input
                type="radio"
                name="mainGoal"
                value="visit"
                checked={mainGoalType === "visit"}
                onChange={(e) => setMainGoalType(e.target.value)}
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  mainGoalType === "visit" ? "text-gray-900" : "text-gray-700"
                }`}>
                  来店を増やしたい
                </div>
                <div className="text-sm text-gray-500 mt-1.5">
                  → 外部リンクのタップを増やす
                </div>
                <div className="text-xs text-gray-400 mt-1.5 font-medium">
                  KPI: 外部リンクタップ数
                </div>
              </div>
            </label>

            {/* 選択肢7: その他 */}
            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              mainGoalType === "other"
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
              <input
                type="radio"
                name="mainGoal"
                value="other"
                checked={mainGoalType === "other"}
                onChange={(e) => setMainGoalType(e.target.value)}
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  mainGoalType === "other" ? "text-gray-900" : "text-gray-700"
                }`}>
                  その他
                </div>
                <div className="text-sm text-gray-500 mt-1.5">
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
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF8A15] resize-none"
                placeholder="その他の目標を入力してください"
              />
            </div>
          )}

          {/* ヒント */}
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200">
            <div className="flex items-start">
              <span className="text-gray-600 mr-2 text-sm">💡</span>
              <div className="text-sm text-gray-600 leading-relaxed">
                迷ったら、フォロワーを増やしたいを選びましょう。フォロワーが増えれば、他の目標も達成しやすくなります。
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
            投稿時間の希望はありますか？ <span className="text-red-600 font-bold text-base ml-1">*</span>
          </label>
          
          <div className="space-y-3">
            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              preferredPostingTimes.includes("ai")
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
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
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  preferredPostingTimes.includes("ai") ? "text-gray-900" : "text-gray-700"
                }`}>
                  AIに任せる <span className="ml-2 text-xs font-normal text-orange-700 bg-orange-50 px-2 py-1 border border-orange-200">推奨</span>
                </div>
                <div className="text-sm text-gray-500 mt-1.5">
                  → AIが最適な時間を提案
                </div>
              </div>
            </label>

            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              preferredPostingTimes.includes("morning")
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
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
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  preferredPostingTimes.includes("morning") ? "text-gray-900" : "text-gray-700"
                }`}>
                  午前中（9:00〜12:00）
                </div>
              </div>
            </label>

            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              preferredPostingTimes.includes("noon")
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
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
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  preferredPostingTimes.includes("noon") ? "text-gray-900" : "text-gray-700"
                }`}>
                  昼（12:00〜15:00）
                </div>
              </div>
            </label>

            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              preferredPostingTimes.includes("evening")
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
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
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  preferredPostingTimes.includes("evening") ? "text-gray-900" : "text-gray-700"
                }`}>
                  夕方（15:00〜18:00）
                </div>
              </div>
            </label>

            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              preferredPostingTimes.includes("night")
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
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
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  preferredPostingTimes.includes("night") ? "text-gray-900" : "text-gray-700"
                }`}>
                  夜（18:00〜21:00）
                </div>
              </div>
            </label>

            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              preferredPostingTimes.includes("late")
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
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
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  preferredPostingTimes.includes("late") ? "text-gray-900" : "text-gray-700"
                }`}>
                  深夜（21:00〜24:00）
                </div>
              </div>
            </label>
          </div>

          <div className="mt-4 p-4 bg-gray-50 border border-gray-200">
            <div className="flex items-start">
              <span className="text-gray-600 mr-2 text-sm">💡</span>
              <div className="text-sm text-gray-600 leading-relaxed">
                AIに任せるを選ぶと、過去のデータから最も反応が良い時間を自動で提案します。
              </div>
            </div>
          </div>
        </div>

        {/* どんな人に投稿を見てもらいたいか */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            どんな人に投稿を見てもらいたいですか？ <span className="text-red-600 font-bold text-base ml-1">*</span>
          </label>
          <textarea
            value={formData.targetAudience}
            onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 resize-none"
            placeholder="例: 30代のママさん。子育てに忙しいけど、自分の時間も大切にしたい人。"
          />
          <div className="mt-3 p-4 bg-gray-50 border border-gray-200">
            <div className="flex items-start">
              <span className="text-gray-600 mr-2 text-sm">💡</span>
              <div className="text-sm text-gray-600 leading-relaxed">
                具体的に書くほど、AIが最適な投稿文を作れます。年齢、性別、興味、悩みなどを書いてください。
              </div>
            </div>
          </div>
        </div>

        {/* 地域を限定しますか？ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            地域を限定しますか？ <span className="text-red-600 font-bold text-base ml-1">*</span>
          </label>
          
          <div className="space-y-3">
            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              !regionRestrictionEnabled
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
              <input
                type="radio"
                name="regionRestriction"
                value="none"
                checked={!regionRestrictionEnabled}
                onChange={() => setRegionRestrictionEnabled(false)}
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  !regionRestrictionEnabled ? "text-gray-900" : "text-gray-700"
                }`}>
                  地域は限定しない
                </div>
              </div>
            </label>

            <label className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
              regionRestrictionEnabled
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}>
              <input
                type="radio"
                name="regionRestriction"
                value="enabled"
                checked={regionRestrictionEnabled}
                onChange={() => setRegionRestrictionEnabled(true)}
                className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
              />
              <div className="flex-1">
                <div className={`text-base font-semibold transition-colors ${
                  regionRestrictionEnabled ? "text-gray-900" : "text-gray-700"
                }`}>
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
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF8A15]"
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
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF8A15]"
                  placeholder="例: 渋谷区"
                />
              </div>
            </div>
          )}

          <div className="mt-4 p-4 bg-gray-50 border border-gray-200">
            <div className="flex items-start">
              <span className="text-gray-600 mr-2 text-sm">💡</span>
              <div className="text-sm text-gray-600 leading-relaxed">
                実店舗がある場合は、地域を限定すると来店につながりやすくなります。
              </div>
            </div>
          </div>
        </div>

        {/* どんな内容を投稿したいか */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            どんな内容を投稿したいですか？ <span className="text-red-600 font-bold text-base ml-1">*</span>
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
              <label
                key={option.value}
                className={`flex items-start cursor-pointer group relative border p-5 transition-all ${
                  contentTypes.includes(option.value)
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
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
                  className="mt-0.5 mr-4 w-5 h-5 text-gray-900 focus:ring-gray-900"
                />
                <div className="flex-1">
                  <div className={`text-base font-semibold transition-colors ${
                    contentTypes.includes(option.value) ? "text-gray-900" : "text-gray-700"
                  }`}>
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
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF8A15] resize-none"
                placeholder="その他の内容を入力してください"
              />
            </div>
          )}

          <div className="mt-4 p-4 bg-gray-50 border border-gray-200">
            <div className="flex items-start">
              <span className="text-gray-600 mr-2 text-sm">💡</span>
              <div className="text-sm text-gray-600 leading-relaxed">
                複数選択すると、投稿のバリエーションが増えて、フォロワーが飽きにくくなります。
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 送信ボタン */}
      <PlanFormSubmitButton
        isLoading={isLoading}
        isValid={isFormValid}
        onSubmit={handleSubmit}
      />
    </form>
  );
};

