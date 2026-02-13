"use client";

import React, { useState, useEffect } from "react";
import SNSLayout from "../../../components/sns-layout";
import { ChevronDown, ChevronUp, Loader2, Save, FileText, BarChart3 } from "lucide-react";
import { authFetch } from "../../../utils/authFetch";
import toast from "react-hot-toast";
import { getLocalDate } from "../../../lib/utils/timezone";
// 右側のAIセクションを削除したため、これらのコンポーネントは不要
// import ExpectedResults from "./components/ExpectedResults";
// import PostingSchedule from "./components/PostingSchedule";
// import WeeklyContentPlan from "./components/WeeklyContentPlan";

interface PlanResult {
  startDate: string;
  endDate: string;
  currentFollowers: number;
  targetFollowers: number;
  followerIncrease: number;
  operationPurpose: string;
  monthlyGrowthRate: string;
  difficulty: {
    stars: string;
    label: string;
    industryRange: string;
    achievementRate: number;
  };
  schedule: {
    weeklyFrequency: string;
    feedPosts: number;
    feedPostsWithReel: number;
    reelPosts: number;
    storyPosts: number;
    postingDays: Array<{ day: string; time: string; type?: string }>;
    storyDays: Array<{ day: string; time: string }>;
  };
  weeklyPlans: Array<{
    week: number;
    targetFollowers: number;
    increase: number;
    theme: string;
    feedPosts: Array<{ day: string; content: string; type?: string }>;
    storyContent: string;
  }>;
  expectedResults: {
    monthlyReach: number;
    engagementRate: string;
    profileViews: number;
    saves: number;
    newFollowers: number;
  };
  features: string[];
  suggestedContentTypes: string[];
}

interface SuggestedAdjustment {
  field:
    | "weeklyPosts"
    | "reelCapability"
    | "storyFrequency"
    | "postingTime"
    | "regionRestriction"
    | "customTargetFollowers";
  value: string | number;
  label: string;
  reason: string;
  expectedImpact?: string;
}

export default function InstagramPlanPage() {
  // 今日の日付をタイムゾーンを考慮してYYYY-MM-DD形式で取得
  const today = getLocalDate("Asia/Tokyo");
  const [startDate, setStartDate] = useState(today);
  const [currentFollowers, setCurrentFollowers] = useState("");
  const [targetFollowerOption, setTargetFollowerOption] = useState<"" | "conservative" | "standard" | "ambitious" | "custom" | "ai">("");
  const [customTargetFollowers, setCustomTargetFollowers] = useState("");
  const [aiSuggestedTarget, setAiSuggestedTarget] = useState<number | null>(null);
  const [canUseAISuggestion, setCanUseAISuggestion] = useState(false);
  const [operationPurpose, setOperationPurpose] = useState("");
  const [weeklyPosts, setWeeklyPosts] = useState("");
  const [reelCapability, setReelCapability] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [storyFrequency, setStoryFrequency] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [postingTime, setPostingTime] = useState("");
  const [regionRestriction, setRegionRestriction] = useState("");
  const [regionName, setRegionName] = useState("");
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [needsResimulation, setNeedsResimulation] = useState(false);
  
  // シミュレーション結果
  const [simulationResult, setSimulationResult] = useState<{
    achievementRate: number;
    difficulty: {
      stars: string;
      label: string;
      industryRange: string;
      achievementRate: number;
    };
    requiredKPIs: {
      monthlyReach: number;
      profileViews: number;
      engagementRate: string;
      saves: number;
      newFollowers: number;
    };
    impactBreakdown?: {
      story: { label: string; impact: string };
      time: { label: string; impact: string };
      region: { label: string; impact: string };
    };
    risks?: Array<{
      category: string;
      type: string;
      probability: number;
      impact: number;
      severity: "高リスク" | "中リスク" | "低リスク";
      countermeasures: string[];
      score: number;
      keyAdvice?: string;
    }>;
    recommendations: string[];
    suggestedAdjustments?: SuggestedAdjustment[];
  } | null>(null);
  const [isLoadingSimulation, setIsLoadingSimulation] = useState(false);

  // 初期データを取得
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await authFetch("/api/instagram/plan-initial-data");
        if (!response.ok) {
          throw new Error("初期データの取得に失敗しました");
        }
        const data = await response.json();
        
        // 現在のフォロワー数を自動設定
        setCurrentFollowers(data.currentFollowers.toString());
        setCanUseAISuggestion(data.canUseAISuggestion);
        
        // 既存の計画がある場合、フォームの値を復元
        if (data.hasExistingPlan && data.existingPlanData) {
          const plan = data.existingPlanData;
          setHasActivePlan(true);
          setActivePlanId(plan.planId);
          
          // フォームの値を復元
          if (plan.startDate) setStartDate(plan.startDate);
          if (plan.currentFollowers) setCurrentFollowers(plan.currentFollowers.toString());
          if (plan.operationPurpose) setOperationPurpose(plan.operationPurpose);
          if (plan.weeklyPosts) setWeeklyPosts(plan.weeklyPosts);
          if (plan.reelCapability) setReelCapability(plan.reelCapability);
          if (plan.storyFrequency) setStoryFrequency(plan.storyFrequency);
          if (plan.targetAudience) setTargetAudience(plan.targetAudience);
          if (plan.postingTime) setPostingTime(plan.postingTime);
          if (plan.regionRestriction) setRegionRestriction(plan.regionRestriction);
          if (plan.regionName) setRegionName(plan.regionName);
          
          // 目標フォロワー数のオプションを設定（保存値優先）
          if (plan.targetFollowerOption) {
            setTargetFollowerOption(plan.targetFollowerOption as typeof targetFollowerOption);
            if (plan.targetFollowerOption === "custom") {
              if (plan.customTargetFollowers) {
                const sanitizedCustomIncrease = Math.max(0, parseInt(plan.customTargetFollowers.toString() || "0", 10) || 0);
                setCustomTargetFollowers(sanitizedCustomIncrease.toString());
              } else {
                const savedCurrent = Number(plan.currentFollowers || 0);
                const savedTarget = Number(plan.targetFollowers || savedCurrent);
                const savedIncrease = Math.max(0, savedTarget - savedCurrent);
                setCustomTargetFollowers(savedIncrease.toString());
              }
            } else {
              setCustomTargetFollowers("");
            }
          } else {
            const current = plan.currentFollowers || parseInt(data.currentFollowers.toString());
            const target = plan.targetFollowers || current + 15;
            const increase = Math.max(0, target - current);

            if (increase === 5) {
              setTargetFollowerOption("conservative");
            } else if (increase === 15) {
              setTargetFollowerOption("standard");
            } else if (increase === 50) {
              setTargetFollowerOption("ambitious");
            } else {
              setTargetFollowerOption("custom");
              setCustomTargetFollowers(increase.toString());
            }
          }
        }
        
        // シミュレーション結果を復元
        if (data.simulationResult) {
          setSimulationResult(data.simulationResult);
          setNeedsResimulation(false);
        }
        
        // AI提案を取得（利用可能な場合）
        // TODO: AI提案エンドポイントを実装する
        if (data.canUseAISuggestion) {
          // 簡易的なAI提案（現在のフォロワー数から+10%を提案）
          const suggested = Math.round(data.currentFollowers * 1.1);
          setAiSuggestedTarget(suggested);
        }
      } catch (error) {
        console.error("初期データ取得エラー:", error);
        toast.error("初期データの取得に失敗しました");
      } finally {
        setIsLoadingInitialData(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // シミュレーション結果が存在しない場合は保存できない
    if (!simulationResult) {
      toast.error("シミュレーションを実行してから保存してください");
      return;
    }
    
    setIsSaving(true);
    try {
      const response = await authFetch("/api/instagram/plan-save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          currentFollowers: parseInt(currentFollowers || "0"),
          targetFollowers,
          targetFollowerOption,
          customTargetFollowers,
          operationPurpose,
          weeklyPosts,
          reelCapability,
          storyFrequency,
          targetAudience,
          postingTime,
          regionRestriction,
          regionName: regionRestriction === "restricted" ? regionName : undefined,
          simulationResult: simulationResult || null,
        }),
      });

      if (!response.ok) {
        throw new Error("計画の保存に失敗しました");
      }

      const result = await response.json();
      
      // planIdが正しく返されているか確認
      if (!result.planId) {
        console.error("計画保存レスポンスにplanIdが含まれていません:", result);
        throw new Error("計画の保存に失敗しました（planIdが取得できませんでした）");
      }
      
      setHasActivePlan(true);
      setActivePlanId(result.planId);
      
      console.log("[Plan Page] 計画保存成功:", {
        planId: result.planId,
        hasActivePlan: true,
      });
      
      toast.success("計画を保存しました");
      
      // Homeページにリダイレクト（AI生成完了通知用のフラグを設定）
      localStorage.setItem("planSavedAt", Date.now().toString());
      setTimeout(() => {
        window.location.href = "/home";
      }, 2000);
    } catch (error) {
      console.error("計画保存エラー:", error);
      toast.error("計画の保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  // 目標フォロワー数を計算
  const calculateTargetFollowers = () => {
    const current = parseInt(currentFollowers || "0");
    if (!current) return 0;

    switch (targetFollowerOption) {
      case "conservative":
        return current + 5;
      case "standard":
        return current + 15;
      case "ambitious":
        return current + 50;
      case "custom":
        return current + Math.max(0, parseInt(customTargetFollowers || "0", 10) || 0);
      case "ai":
        return aiSuggestedTarget || current + 15;
      default:
        return 0;
    }
  };

  const targetFollowers = calculateTargetFollowers();

  const frequencyToWeeklyCount = (value: string) => {
    if (value === "none") {return 0;}
    if (value === "weekly-1-2") {return 2;}
    if (value === "weekly-3-4") {return 4;}
    if (value === "daily") {return 7;}
    return 0;
  };

  const feedWeeklyCount = frequencyToWeeklyCount(weeklyPosts);
  const reelWeeklyCount = frequencyToWeeklyCount(reelCapability);
  const storyWeeklyCount = frequencyToWeeklyCount(storyFrequency || "none");

  const feedMonthlyCount = feedWeeklyCount * 4;
  const reelMonthlyCount = reelWeeklyCount * 4;
  const storyMonthlyCount = storyWeeklyCount * 4;
  const monthlyTotalPosts = feedMonthlyCount + reelMonthlyCount + storyMonthlyCount;

  const feedPercent = monthlyTotalPosts > 0 ? Math.round((feedMonthlyCount / monthlyTotalPosts) * 100) : 0;
  const reelPercent = monthlyTotalPosts > 0 ? Math.round((reelMonthlyCount / monthlyTotalPosts) * 100) : 0;
  const storyPercent = Math.max(0, 100 - feedPercent - reelPercent);

  const donutBackground =
    monthlyTotalPosts > 0
      ? `conic-gradient(#FF8A15 0% ${feedPercent}%, #F97316 ${feedPercent}% ${feedPercent + reelPercent}%, #FDBA74 ${feedPercent + reelPercent}% 100%)`
      : "conic-gradient(#e5e7eb 0% 100%)";

  const distributeToWeeks = (monthlyCount: number) => {
    const base = Math.floor(monthlyCount / 4);
    const remainder = monthlyCount % 4;
    return Array.from({ length: 4 }, (_, i) => base + (i < remainder ? 1 : 0));
  };

  const feedWeeklyDistribution = distributeToWeeks(feedMonthlyCount);
  const reelWeeklyDistribution = distributeToWeeks(reelMonthlyCount);
  const storyWeeklyDistribution = distributeToWeeks(storyMonthlyCount);
  const weeklyTotals = [0, 1, 2, 3].map(
    (i) => feedWeeklyDistribution[i] + reelWeeklyDistribution[i] + storyWeeklyDistribution[i]
  );

  const isFormValid = 
    startDate && 
    currentFollowers && 
    targetFollowers > parseInt(currentFollowers || "0") &&
    operationPurpose && 
    weeklyPosts && 
    reelCapability &&
    !!simulationResult; // シミュレーション結果が必須

  // シミュレーションに必要な必須項目をチェック
  const getSimulationRequiredFields = () => {
    const isTargetFollowersValid = targetFollowerOption === "custom"
      ? !!customTargetFollowers && targetFollowers > parseInt(currentFollowers || "0")
      : !!targetFollowerOption && targetFollowers > parseInt(currentFollowers || "0");
    
    const requiredFields = [
      { name: "現在のフォロワー数", filled: !!currentFollowers },
      { name: "目標フォロワー数", filled: isTargetFollowersValid && targetFollowers > parseInt(currentFollowers || "0") },
      { name: "運用の目的", filled: !!operationPurpose },
      { name: "フィード投稿頻度", filled: !!weeklyPosts },
      { name: "リール投稿頻度", filled: !!reelCapability },
    ];
    return requiredFields;
  };

  const simulationRequiredFields = getSimulationRequiredFields();
  const filledCount = simulationRequiredFields.filter(f => f.filled).length;
  const remainingCount = simulationRequiredFields.length - filledCount;
  const isSimulationReady = remainingCount === 0;
  const simulationProgressPercent = Math.round((filledCount / simulationRequiredFields.length) * 100);
  const selectedTargetLabel = targetFollowerOption === "conservative"
    ? "控えめ"
    : targetFollowerOption === "standard"
    ? "標準"
    : targetFollowerOption === "ambitious"
    ? "意欲的"
    : targetFollowerOption === "custom"
    ? "カスタム"
    : targetFollowerOption === "ai"
    ? "AI提案"
    : "未選択";
  const premiumInputClass =
    "w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all duration-200 bg-white text-gray-900";
  const premiumOptionCardClass = (isSelected: boolean) =>
    `flex items-start gap-3 cursor-pointer border rounded-lg px-4 py-3 transition-colors ${
      isSelected
        ? "border-gray-900 bg-gray-50"
        : "border-gray-200 hover:border-gray-300"
    }`;
  const premiumRadioClass =
    "w-4 h-4 text-gray-900 focus:ring-gray-900/20 mt-1 cursor-pointer";

  const invalidateSimulationIfNeeded = () => {
    if (simulationResult) {
      setSimulationResult(null);
      setNeedsResimulation(true);
    }
  };

  const applySuggestedAdjustment = (adjustment: SuggestedAdjustment) => {
    switch (adjustment.field) {
      case "weeklyPosts":
        setWeeklyPosts(String(adjustment.value));
        break;
      case "reelCapability":
        setReelCapability(String(adjustment.value));
        break;
      case "storyFrequency":
        setStoryFrequency(String(adjustment.value));
        break;
      case "postingTime":
        setPostingTime(String(adjustment.value));
        break;
      case "regionRestriction":
        setRegionRestriction(String(adjustment.value));
        if (String(adjustment.value) === "none") {
          setRegionName("");
        }
        break;
      case "customTargetFollowers":
        setTargetFollowerOption("custom");
        setCustomTargetFollowers(String(adjustment.value));
        break;
      default:
        break;
    }

    setSimulationResult(null);
    setNeedsResimulation(true);
    toast.success("提案を反映しました。再シミュレーションしてください");
  };

  // シミュレーションを実行
  const runSimulation = async () => {
    if (!isSimulationReady) {
      toast.error("必須項目をすべて入力してください");
      return;
    }

    setIsLoadingSimulation(true);
    try {
      const response = await authFetch("/api/instagram/plan-simulation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentFollowers: parseInt(currentFollowers || "0"),
          targetFollowers,
          operationPurpose,
          weeklyPosts,
          reelCapability,
          storyFrequency,
          targetAudience,
          postingTime,
          regionRestriction,
          regionName: regionRestriction === "restricted" ? regionName : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("シミュレーションの実行に失敗しました");
      }

      const result = await response.json();
      if (result.simulation) {
        setSimulationResult(result.simulation);
        setNeedsResimulation(false);
      }
    } catch (error) {
      console.error("シミュレーション実行エラー:", error);
      toast.error("シミュレーションの実行に失敗しました");
    } finally {
      setIsLoadingSimulation(false);
    }
  };


  const handleDelete = async () => {
    if (!activePlanId) return;
    
    if (!confirm("計画を削除しますか？Homeページの内容も消えます。")) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const response = await authFetch(`/api/instagram/plan-delete?planId=${activePlanId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("計画の削除に失敗しました");
      }

      setHasActivePlan(false);
      setActivePlanId(null);
      // 削除後はフォームの選択状態を空に戻す
      setTargetFollowerOption("");
      setCustomTargetFollowers("");
      setOperationPurpose("");
      setWeeklyPosts("");
      setReelCapability("");
      setStoryFrequency("");
      setTargetAudience("");
      setPostingTime("");
      setRegionRestriction("");
      setRegionName("");
      setSimulationResult(null);
      setNeedsResimulation(false);
      toast.success("計画を削除しました");
      
      // Homeページにリダイレクト（計画が削除されたことを反映）
      setTimeout(() => {
        window.location.href = "/home";
      }, 1000);
    } catch (error) {
      console.error("計画削除エラー:", error);
      toast.error("計画の削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SNSLayout
      customTitle="Instagram 運用計画"
      customDescription="1ヶ月の運用計画をたてましょう"
    >
      <div className="container mx-auto px-4 py-8">
        <div className="w-full">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* 左カラム: フォーム */}
            <div className="xl:col-span-7 bg-white border border-gray-200 p-8 xl:p-10 rounded-none flex flex-col shadow-sm">
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-6 h-6 text-[#FF8A15]" />
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                  Instagram運用計画を作成
                </h1>
              </div>
              <p className="text-sm text-gray-500 mt-2">目標を設定して、効果的な運用計画を立てましょう</p>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
              {/* 計画開始日 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  計画開始日
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    invalidateSimulationIfNeeded();
                  }}
                  className={premiumInputClass}
                  required
                />
              </div>

              {/* 現在のフォロワー数 */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  現在のフォロワー数 <span className="text-[#FF8A15]">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={currentFollowers}
                    onChange={(e) => {
                      setCurrentFollowers(e.target.value);
                      invalidateSimulationIfNeeded();
                    }}
                    className={premiumInputClass}
                    placeholder="例: 1000"
                    min="0"
                    required
                    disabled={isLoadingInitialData}
                  />
                  <span className="text-gray-600 whitespace-nowrap">人</span>
                </div>
                {isLoadingInitialData && (
                  <p className="text-xs text-gray-500 mt-1">自動計算中...</p>
                )}
              </div>

              {/* 目標フォロワー数 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  目標フォロワー数 <span className="text-[#FF8A15]">*</span>
                </label>
                <div className="space-y-2">
                  <label className={premiumOptionCardClass(targetFollowerOption === "conservative")}>
                    <input
                      type="radio"
                      name="targetFollowerOption"
                      value="conservative"
                      checked={targetFollowerOption === "conservative"}
                      onChange={(e) => {
                        setTargetFollowerOption(e.target.value as typeof targetFollowerOption);
                        invalidateSimulationIfNeeded();
                      }}
                      className={premiumRadioClass}
                    />
                    <div className="flex-1">
                      <span className="text-gray-900 font-medium">控えめ: +5人</span>
                      <span className="text-[11px] ml-2 px-2 py-0.5 border border-gray-300 rounded-full text-gray-600">推奨</span>
                      <p className="text-xs text-gray-500 mt-1">無理なく確実に達成したい</p>
                    </div>
                  </label>
                  <label className={premiumOptionCardClass(targetFollowerOption === "standard")}>
                    <input
                      type="radio"
                      name="targetFollowerOption"
                      value="standard"
                      checked={targetFollowerOption === "standard"}
                      onChange={(e) => {
                        setTargetFollowerOption(e.target.value as typeof targetFollowerOption);
                        invalidateSimulationIfNeeded();
                      }}
                      className={premiumRadioClass}
                    />
                    <div className="flex-1">
                      <span className="text-gray-900 font-medium">標準: +15人</span>
                      <p className="text-xs text-gray-500 mt-1">頑張れば達成可能</p>
                    </div>
                  </label>
                  <label className={premiumOptionCardClass(targetFollowerOption === "ambitious")}>
                    <input
                      type="radio"
                      name="targetFollowerOption"
                      value="ambitious"
                      checked={targetFollowerOption === "ambitious"}
                      onChange={(e) => {
                        setTargetFollowerOption(e.target.value as typeof targetFollowerOption);
                        invalidateSimulationIfNeeded();
                      }}
                      className={premiumRadioClass}
                    />
                    <div className="flex-1">
                      <span className="text-gray-900 font-medium">意欲的: +50人</span>
                      <p className="text-xs text-gray-500 mt-1">本気で取り組めば狙える目標</p>
                    </div>
                  </label>
                  <label className={premiumOptionCardClass(targetFollowerOption === "custom")}>
                    <input
                      type="radio"
                      name="targetFollowerOption"
                      value="custom"
                      checked={targetFollowerOption === "custom"}
                      onChange={(e) => {
                        setTargetFollowerOption(e.target.value as typeof targetFollowerOption);
                        invalidateSimulationIfNeeded();
                      }}
                      className={premiumRadioClass}
                    />
                    <div className="flex-1">
                      <span className="text-gray-900 font-medium">その他:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          value={customTargetFollowers}
                          onChange={(e) => {
                            setCustomTargetFollowers(e.target.value.replace(/[^0-9]/g, ""));
                            invalidateSimulationIfNeeded();
                          }}
                          className="w-24 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 text-sm transition-all duration-200"
                          placeholder="目標数"
                          min="0"
                          disabled={targetFollowerOption !== "custom"}
                        />
                        <span className="text-gray-600 text-sm">人</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">目標フォロワー数を自分で設定できます</p>
                    </div>
                  </label>
                  {canUseAISuggestion && (
                    <label className={premiumOptionCardClass(targetFollowerOption === "ai")}>
                      <input
                        type="radio"
                        name="targetFollowerOption"
                        value="ai"
                        checked={targetFollowerOption === "ai"}
                        onChange={(e) => {
                          setTargetFollowerOption(e.target.value as typeof targetFollowerOption);
                          invalidateSimulationIfNeeded();
                        }}
                        className={premiumRadioClass}
                      />
                      <div className="flex-1">
                        <span className="text-gray-900 font-medium">AI提案:</span>
                        {aiSuggestedTarget !== null ? (
                          <span className="text-gray-700 ml-2">+{aiSuggestedTarget - parseInt(currentFollowers || "0")}人</span>
                        ) : (
                          <span className="text-gray-500 ml-2">計算中...</span>
                        )}
                        <p className="text-xs text-gray-500 mt-1">1年以上のデータがある場合利用可能です</p>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* 運用の目的 */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  運用の目的 <span className="text-[#FF8A15]">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    "認知拡大",
                    "採用・リクルーティング強化",
                    "商品・サービスの販売促進",
                    "ファンを作りたい",
                    "来店・問い合わせを増やしたい",
                    "企業イメージ・ブランディング",
                  ].map((purpose) => (
                    <label key={purpose} className={premiumOptionCardClass(operationPurpose === purpose)}>
                      <input
                        type="radio"
                        name="operationPurpose"
                        value={purpose}
                        checked={operationPurpose === purpose}
                        onChange={(e) => {
                          setOperationPurpose(e.target.value);
                          invalidateSimulationIfNeeded();
                        }}
                        className={premiumRadioClass}
                        required
                      />
                      <span className="text-gray-800">{purpose}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* フィード投稿頻度 */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  フィード投稿頻度 <span className="text-[#FF8A15]">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    { value: "none", label: "投稿しない" },
                    { value: "weekly-1-2", label: "週に1〜2回", recommended: true },
                    { value: "weekly-3-4", label: "週に3〜4回" },
                    { value: "daily", label: "毎日" },
                  ].map((option) => (
                    <label key={option.value} className={premiumOptionCardClass(weeklyPosts === option.value)}>
                      <input
                        type="radio"
                        name="weeklyPosts"
                        value={option.value}
                        checked={weeklyPosts === option.value}
                        onChange={(e) => {
                          setWeeklyPosts(e.target.value);
                          invalidateSimulationIfNeeded();
                        }}
                        className={premiumRadioClass}
                        required
                      />
                      <span className="text-gray-800">
                        {option.label}
                        {option.recommended && <span className="text-[11px] ml-2 px-2 py-0.5 border border-gray-300 rounded-full text-gray-600">推奨</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* リール投稿頻度 */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  リール投稿頻度 <span className="text-[#FF8A15]">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    { value: "none", label: "投稿しない" },
                    { value: "weekly-1-2", label: "週に1〜2回", recommended: true },
                    { value: "weekly-3-4", label: "週に3〜4回" },
                    { value: "daily", label: "毎日" },
                  ].map((option) => (
                    <label key={option.value} className={premiumOptionCardClass(reelCapability === option.value)}>
                      <input
                        type="radio"
                        name="reelCapability"
                        value={option.value}
                        checked={reelCapability === option.value}
                        onChange={(e) => {
                          setReelCapability(e.target.value);
                          invalidateSimulationIfNeeded();
                        }}
                        className={premiumRadioClass}
                        required
                      />
                      <span className="text-gray-800">
                        {option.label}
                        {option.recommended && <span className="text-[11px] ml-2 px-2 py-0.5 border border-gray-300 rounded-full text-gray-600">推奨</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 区切り線 */}
              <div className="border-t border-gray-500 my-6"></div>

              {/* 詳細設定（折りたたみ） */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(!isDetailOpen)}
                  className="w-full flex items-center justify-between p-4 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg transition-colors duration-200"
                >
                  <span className="text-sm font-medium text-gray-700">
                    詳細設定(オプション)
                  </span>
                  {isDetailOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                {isDetailOpen && (
                  <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-200">
                    {/* ストーリーズ投稿頻度 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ストーリーズ投稿頻度
                      </label>
                      <select
                        value={storyFrequency}
                        onChange={(e) => {
                          setStoryFrequency(e.target.value);
                          invalidateSimulationIfNeeded();
                        }}
                        className={premiumInputClass}
                      >
                        <option value="">選択してください</option>
                        <option value="none">投稿しない</option>
                        <option value="weekly-1-2">週1-2回</option>
                        <option value="weekly-3-4">週3-4回</option>
                        <option value="daily">毎日</option>
                      </select>
                    </div>

                    {/* ターゲット属性 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ターゲット属性
                      </label>
                      <input
                        type="text"
                        value={targetAudience}
                        onChange={(e) => {
                          setTargetAudience(e.target.value);
                          invalidateSimulationIfNeeded();
                        }}
                        className={premiumInputClass}
                        placeholder="例: 30代のママさん"
                      />
                    </div>

                    {/* 投稿時間帯 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        投稿時間帯
                      </label>
                      <select
                        value={postingTime}
                        onChange={(e) => {
                          setPostingTime(e.target.value);
                          invalidateSimulationIfNeeded();
                        }}
                        className={premiumInputClass}
                      >
                        <option value="">AIに任せる</option>
                        <option value="morning">午前中（9:00〜12:00）</option>
                        <option value="noon">昼（12:00〜15:00）</option>
                        <option value="evening">夕方（15:00〜18:00）</option>
                        <option value="night">夜（18:00〜21:00）</option>
                        <option value="late-night">深夜（21:00〜24:00）</option>
                      </select>
                    </div>

                    {/* 地域限定の有無 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        地域限定の有無
                      </label>
                      <div className="space-y-2">
                        <label className={premiumOptionCardClass(regionRestriction === "none")}>
                          <input
                            type="radio"
                            name="regionRestriction"
                            value="none"
                            checked={regionRestriction === "none"}
                            onChange={(e) => {
                              setRegionRestriction(e.target.value);
                              setRegionName("");
                              invalidateSimulationIfNeeded();
                            }}
                            className={premiumRadioClass}
                          />
                          <span className="text-gray-700">地域は限定しない</span>
                        </label>
                        <label className={premiumOptionCardClass(regionRestriction === "restricted")}>
                          <input
                            type="radio"
                            name="regionRestriction"
                            value="restricted"
                            checked={regionRestriction === "restricted"}
                            onChange={(e) => {
                              setRegionRestriction(e.target.value);
                              invalidateSimulationIfNeeded();
                            }}
                            className={premiumRadioClass}
                          />
                          <span className="text-gray-700">地域を限定する</span>
                        </label>
                      </div>
                      {regionRestriction === "restricted" && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            地域名
                          </label>
                          <input
                            type="text"
                            value={regionName}
                            onChange={(e) => {
                              setRegionName(e.target.value);
                              invalidateSimulationIfNeeded();
                            }}
                            className={premiumInputClass}
                            placeholder="例: 東京都 渋谷区"
                          />
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>

              {/* 区切り線 */}
              <div className="border-t border-gray-500 my-6"></div>

              {/* 送信ボタン */}
              <div className="flex flex-col gap-3">
                {!simulationResult && isSimulationReady && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                    ⚠️ 計画を保存するには、先に「📊 シミュレーションを実行」ボタンを押してください
                  </div>
                )}
                <button
                  type="submit"
                  disabled={!isFormValid || isSaving}
                  className="w-full py-3 px-6 bg-gray-900 text-white font-medium rounded-lg hover:bg-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      計画を保存する
                    </>
                  )}
                </button>
                
                {hasActivePlan && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full py-3 px-6 bg-white border border-red-300 text-red-700 font-semibold rounded-lg hover:bg-red-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        削除中...
                      </>
                    ) : (
                      <>
                        🗑️ 計画を削除
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
            </div>

            {/* 右カラム: 説明セクション */}
            <div className="xl:col-span-5 space-y-6 xl:sticky xl:top-6 xl:self-start">
              <div className="bg-white border border-gray-300 p-8 rounded-none shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900">入力サマリー</h2>
                <p className="text-sm text-gray-500 mt-1">いまの設定と次にやることを確認できます</p>

                <div className="mt-6 space-y-3 text-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500">進捗</span>
                    <span className="font-semibold text-gray-900">{filledCount}/{simulationRequiredFields.length}</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 overflow-hidden">
                    <div
                      className="h-full bg-[#FF8A15] transition-all duration-500"
                      style={{ width: `${Math.min(simulationProgressPercent, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500">目標フォロワー</span>
                    <span className="font-semibold text-gray-900">
                      {targetFollowers > 0 ? `${targetFollowers.toLocaleString()}人` : "未設定"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500">目標タイプ</span>
                    <span className="font-semibold text-gray-900">{selectedTargetLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">次のアクション</span>
                    <span className="font-semibold text-[#FF8A15]">
                      {isSimulationReady ? "シミュレーション実行" : `入力をあと${remainingCount}項目`}
                    </span>
                  </div>
                </div>
              </div>

              {/* 📈 計画の可視化 */}
              <div className="bg-white border border-gray-300 p-8 rounded-none shadow-sm">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">計画の可視化</h2>
                  <p className="text-sm text-gray-500 mt-1">投稿配分を視覚的に確認できます</p>
                </div>

                <div className="space-y-8">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-4">今月の投稿配分</h3>
                    <div className="flex items-center gap-6">
                      <div className="relative w-32 h-32">
                        <div className="w-32 h-32 rounded-full" style={{ background: donutBackground }} />
                        <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center border border-gray-100">
                          <span className="text-xs font-semibold text-gray-700">
                            {monthlyTotalPosts > 0 ? `${monthlyTotalPosts}件` : "未設定"}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 bg-[#FF8A15]" />
                          <span className="text-gray-700">フィード: {feedMonthlyCount}件 ({feedPercent}%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 bg-[#F97316]" />
                          <span className="text-gray-700">リール: {reelMonthlyCount}件 ({reelPercent}%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 bg-[#FDBA74]" />
                          <span className="text-gray-700">ストーリーズ: {storyMonthlyCount}件 ({storyPercent}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-1">週ごとの投稿目安（内訳）</h3>
                    <p className="text-xs text-gray-500 mb-4">各週の合計件数と、投稿タイプごとの内訳です。</p>
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">週</th>
                            <th className="px-4 py-3 text-right font-medium">フィード</th>
                            <th className="px-4 py-3 text-right font-medium">リール</th>
                            <th className="px-4 py-3 text-right font-medium">ストーリーズ</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-900">合計</th>
                          </tr>
                        </thead>
                        <tbody>
                          {weeklyTotals.map((count, index) => (
                            <tr key={`week-${index + 1}`} className="border-t border-gray-100">
                              <td className="px-4 py-3 text-gray-700">Week {index + 1}</td>
                              <td className="px-4 py-3 text-right text-gray-700">{feedWeeklyDistribution[index]}</td>
                              <td className="px-4 py-3 text-right text-gray-700">{reelWeeklyDistribution[index]}</td>
                              <td className="px-4 py-3 text-right text-gray-700">{storyWeeklyDistribution[index]}</td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900">{count}件</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              </div>

              {/* 📊 計画シミュレーションセクション */}
              <div className="bg-white border border-gray-300 p-10 rounded-none flex flex-col shadow-sm">
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="w-5 h-5 text-[#FF8A15]" />
                    <h2 className="text-xl font-semibold text-gray-900">
                      計画シミュレーション
                    </h2>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">目標達成の可能性を分析します</p>
                </div>

                <div className="space-y-4">
                  {!isSimulationReady && (
                    <div className="bg-gray-50 p-5 rounded-none border border-gray-300">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-900 text-sm">シミュレーション準備</h3>
                        <span className="text-xs font-semibold text-gray-600">{simulationProgressPercent}%</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 mb-4 overflow-hidden">
                        <div
                          className="h-full bg-[#FF8A15] transition-all duration-500"
                          style={{ width: `${Math.min(simulationProgressPercent, 100)}%` }}
                        />
                      </div>
                      <div className="space-y-2">
                        {simulationRequiredFields.map((field, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            {field.filled ? (
                              <span className="text-[#FF8A15] font-bold">✓</span>
                            ) : (
                              <span className="text-gray-400">○</span>
                            )}
                            <span className={field.filled ? "text-gray-700" : "text-gray-400"}>
                              {field.name}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 text-center mt-4">
                        {remainingCount === 1 ? "あと1項目で実行できます" : `あと${remainingCount}項目で実行できます`}
                      </p>
                    </div>
                  )}
                  {isSimulationReady && !simulationResult && !isLoadingSimulation && (
                    <div className="bg-white p-6 rounded-none mb-4">
                      <p className="text-sm font-medium text-gray-800 text-center mb-3">
                        {needsResimulation
                          ? "入力内容が変更されました。再シミュレーションしてください"
                          : "シミュレーションが利用可能です"}
                      </p>
                      <button
                        type="button"
                        onClick={runSimulation}
                        className="w-full py-3 px-6 bg-[#FF8A15] text-white font-medium rounded-none hover:bg-[#FF6B00] transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                      >
                        📊 シミュレーションを実行
                      </button>
                    </div>
                  )}

                  {/* シミュレーション結果 */}
                  {isLoadingSimulation && (
                    <div className="bg-gray-50 p-4 rounded-none border border-gray-300">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[#FF8A15]" />
                        <p className="text-sm font-semibold text-gray-800">
                          シミュレーション実行中...
                        </p>
                      </div>
                    </div>
                  )}

                  {simulationResult && !isLoadingSimulation && (
                    <div className="space-y-4">
                      {/* 達成可能性 */}
                      <div className="bg-white p-6 rounded-none border border-gray-300">
                        <h3 className="font-semibold text-gray-900 mb-4 text-lg">達成可能性</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-[#FF8A15]">
                              {simulationResult.achievementRate}%
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {simulationResult.difficulty.label}
                            </span>
                          </div>
                          {/* プログレスバー */}
                          <div className="w-full bg-gray-200 rounded-none h-6 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#FF8A15] to-[#FF6B00] rounded-none transition-all duration-700 ease-out flex items-center justify-end pr-3"
                              style={{ width: `${Math.min(simulationResult.achievementRate, 100)}%` }}
                            >
                              {simulationResult.achievementRate >= 10 && (
                                <span className="text-xs font-bold text-white">
                                  {Math.round(simulationResult.achievementRate)}%
                                </span>
                              )}
                            </div>
                          </div>
                          {/* 推奨事項 */}
                          {simulationResult.recommendations.length > 0 && (
                            <div className="mt-3">
                              <ul className="space-y-1 list-disc list-inside text-sm text-gray-700">
                                {simulationResult.recommendations.map((rec, index) => (
                                  <li key={index}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {simulationResult.suggestedAdjustments && simulationResult.suggestedAdjustments.length > 0 && (
                            <div className="mt-5 border-t border-gray-200 pt-4">
                              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                                この結果を計画に反映
                              </h4>
                              <div className="space-y-3">
                                {simulationResult.suggestedAdjustments.map((adjustment, index) => (
                                  <div key={`${adjustment.field}-${index}`} className="border border-gray-200 p-3 bg-gray-50">
                                    <p className="text-sm font-semibold text-gray-900">{adjustment.label}</p>
                                    <p className="text-xs text-gray-600 mt-1">{adjustment.reason}</p>
                                    {adjustment.expectedImpact && (
                                      <p className="text-xs text-[#FF8A15] mt-1">{adjustment.expectedImpact}</p>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => applySuggestedAdjustment(adjustment)}
                                      className="mt-3 px-3 py-1.5 text-xs font-medium bg-[#FF8A15] text-white hover:bg-[#FF6B00] transition-colors"
                                    >
                                      この提案を反映
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 必要KPI */}
                      <div className="bg-gray-50 p-6 rounded-none border border-gray-300">
                        <h3 className="font-semibold text-gray-900 mb-4 text-lg">必要KPI</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-gray-600">月間リーチ</div>
                            <div className="text-lg font-semibold text-gray-900">
                              {simulationResult.requiredKPIs.monthlyReach.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">プロフィール閲覧数</div>
                            <div className="text-lg font-semibold text-gray-900">
                              {simulationResult.requiredKPIs.profileViews.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">エンゲージメント率</div>
                            <div className="text-lg font-semibold text-gray-900">
                              {simulationResult.requiredKPIs.engagementRate}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">保存数</div>
                            <div className="text-lg font-semibold text-gray-900">
                              {simulationResult.requiredKPIs.saves.toLocaleString()}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-gray-600">新規フォロワー数</div>
                            <div className="text-lg font-semibold text-gray-900">
                              {simulationResult.requiredKPIs.newFollowers.toLocaleString()}人
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 影響度の内訳 */}
                      {simulationResult.impactBreakdown && (
                        <div className="bg-gray-50 p-6 rounded-none border border-gray-300">
                          <h3 className="font-semibold text-gray-900 mb-4 text-lg">影響度の内訳</h3>
                          <div className="space-y-2 text-sm">
                            {simulationResult.impactBreakdown.story.impact !== "影響なし" && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-700">
                                  {simulationResult.impactBreakdown.story.label}
                                </span>
                                <span className="font-semibold text-[#FF8A15]">
                                  {simulationResult.impactBreakdown.story.impact}
                                </span>
                              </div>
                            )}
                            {simulationResult.impactBreakdown.time.impact !== "影響なし" && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-700">
                                  {simulationResult.impactBreakdown.time.label}
                                </span>
                                <span className={`font-semibold ${
                                  simulationResult.impactBreakdown.time.impact.startsWith("+")
                                    ? "text-[#FF8A15]"
                                    : "text-gray-600"
                                }`}>
                                  {simulationResult.impactBreakdown.time.impact}
                                </span>
                              </div>
                            )}
                            {simulationResult.impactBreakdown.region.impact !== "影響なし" && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-700">
                                  {simulationResult.impactBreakdown.region.label}
                                </span>
                                <span className={`font-semibold ${
                                  simulationResult.impactBreakdown.region.impact.startsWith("+")
                                    ? "text-[#FF8A15]"
                                    : "text-gray-600"
                                }`}>
                                  {simulationResult.impactBreakdown.region.impact}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SNSLayout>
  );
}
