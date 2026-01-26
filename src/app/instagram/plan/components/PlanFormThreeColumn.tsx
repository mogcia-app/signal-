"use client";

import React, { useState, useMemo } from "react";
import { PlanFormData } from "../types/plan";
import { Calendar, Target, Clock, Users, FileText, CheckSquare, CheckCircle, Info, ChevronRight, Edit, AlertTriangle, Loader2 } from "lucide-react";
import { calculateFeasibilityScore, getGrowthRateForAccountSize, suggestRealisticTarget, calculateRecommendedPostingFrequency } from "../../../../lib/instagram-benchmarks";
import { SimulationPanel } from "./SimulationPanel";
import { AIDiagnosisPanel } from "./AIDiagnosisPanel";
import { AIReasonBox } from "../../../../components/AIReasonBox";
import { TargetFollowerInput } from "../../../../components/TargetFollowerInput";

interface PlanFormThreeColumnProps {
  formData: PlanFormData;
  onInputChange: (field: keyof PlanFormData, value: string | string[] | boolean) => void;
  onComplete: () => void;
  planGenerated?: boolean;
  simulationResult?: any;
  generatedStrategy?: string;
  activeTab?: "simulation" | "ai";
  onTabChange?: (tab: "simulation" | "ai") => void;
  onRunSimulation?: () => void;
  isSimulating?: boolean;
  simulationError?: string;
  onSave?: () => void;
  isSaving?: boolean;
  planEndDate?: Date | null;
  selectedStrategies?: string[];
  selectedCategories?: string[];
  onStartAiDiagnosis?: (formData: PlanFormData) => void;
  onSaveAdvice?: () => void;
  setGeneratedStrategy?: (strategy: string | null) => void;
  isAiLoading?: boolean;
  isGeneratingPlan?: boolean;
  generationProgress?: {
    simulation: 'pending' | 'running' | 'completed' | 'error';
    aiStrategy: 'pending' | 'running' | 'completed' | 'error';
    overallProgress: number;
  };
}

const TOTAL_STEPS = 6;

const stepTitles = [
  "基本情報",
  "目標設定",
  "投稿頻度",
  "ターゲット",
  "投稿内容",
  "確認",
];

const stepIcons = [
  Calendar,
  Target,
  Clock,
  Users,
  FileText,
  CheckSquare,
];

export const PlanFormThreeColumn: React.FC<PlanFormThreeColumnProps> = ({
  formData,
  onInputChange,
  onComplete,
  planGenerated = false,
  generationProgress,
  simulationResult = null,
  generatedStrategy,
  activeTab = "simulation",
  onTabChange,
  onRunSimulation,
  isSimulating = false,
  simulationError,
  onSave,
  isSaving = false,
  planEndDate,
  selectedStrategies = [],
  selectedCategories = [],
  onStartAiDiagnosis,
  onSaveAdvice,
  setGeneratedStrategy,
  isAiLoading = false,
  isGeneratingPlan = false,
}) => {
  const [currentStep, setCurrentStep] = useState(1);

  // リアルタイムプレビュー計算
  const previewData = useMemo(() => {
    const current = parseInt(formData.currentFollowers || "0", 10);
    const target = parseInt(formData.targetFollowers || "0", 10);
    const periodMonths = formData.planPeriod === "1ヶ月" ? 1 :
                         formData.planPeriod === "3ヶ月" ? 3 :
                         formData.planPeriod === "6ヶ月" ? 6 :
                         formData.planPeriod === "1年" ? 12 : 1;

    if (current > 0 && target > current && periodMonths > 0) {
      const feasibility = calculateFeasibilityScore(current, target, periodMonths);
      const growthBenchmark = getGrowthRateForAccountSize(current);
      
      // 予測フォロワー数（業界平均成長率を使用）
      const realisticGrowthRate = growthBenchmark.monthly.max / 100;
      const realisticTarget = Math.round(current * Math.pow(1 + realisticGrowthRate, periodMonths));
      
      // 目標の増加数と月間成長率を計算
      const followerGain = target - current;
      const totalGrowthRate = current > 0 ? ((followerGain / current) * 100) : 0;
      const monthlyGrowthRate = periodMonths > 0 ? (totalGrowthRate / periodMonths) : 0;
      
      // 投稿頻度の推奨を計算
      const recommendedPosting = calculateRecommendedPostingFrequency(
        current,
        target,
        periodMonths,
        feasibility.difficultyRatio
      );
      
      return {
        current,
        target,
        realisticTarget,
        feasibility,
        growthRate: growthBenchmark.monthly,
        recommendedPosting,
        monthlyGrowthRate,
        followerGain,
      };
    }
    return null;
  }, [formData.currentFollowers, formData.targetFollowers, formData.planPeriod]);

  // ステップの完了状態を判定（表示されているステップと進捗バーを一致させる）
  const getStepStatus = (stepNum: number) => {
    // 現在のステップより前はすべて完了
    if (stepNum < currentStep) {
      return "completed";
    }
    // 現在のステップは現在地
    if (stepNum === currentStep) {
      return "current";
    }
    // 現在のステップより後は未完了
    return "pending";
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepNum: number) => {
    setCurrentStep(stepNum);
  };

  // ステップ1: 基本情報
  const renderStep1 = () => {
    // 開始日のデフォルト値を今日に設定
    const today = new Date().toISOString().split('T')[0];
    const defaultStartDate = formData.startDate || today;
    
    return (
      <div className="space-y-6">
        {/* 1-1. 計画期間 */}
        <div className="border-b border-gray-200 pb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              【必須】期間を選択してください
            </label>
            <select
              value={formData.planPeriod || ""}
              onChange={(e) => onInputChange("planPeriod", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A15]"
            >
              <option value="">選択してください</option>
              <option value="1ヶ月">1ヶ月（初心者向け）</option>
              <option value="3ヶ月">3ヶ月（おすすめ⭐）</option>
              <option value="6ヶ月">6ヶ月</option>
              <option value="1年">1年</option>
            </select>
          </div>
          <p className="text-xs text-gray-600 mb-4">
            <span className="font-medium text-gray-700">ヒント:</span> 初めての方は、まず1ヶ月で試してみましょう。慣れてきたら、3ヶ月プランがおすすめです。
          </p>
          <AIReasonBox reasons={[
            "期間が決まれば、ゴールが明確になるよ"
          ]} />
        </div>

        {/* 1-2. 開始日 */}
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              【必須】いつから始めますか？
            </label>
            <input
              type="date"
              value={defaultStartDate}
              onChange={(e) => onInputChange("startDate", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A15]"
            />
            <p className="mt-1 text-xs text-gray-500">デフォルト: 今日の日付</p>
          </div>
          <p className="text-xs text-gray-600 mb-4">
            <span className="font-medium text-gray-700">ヒント:</span> すぐに始めたい場合は、今日の日付でOKです。準備が必要な場合は、来週からでも大丈夫です。
          </p>
          <AIReasonBox reasons={[
            "開始日が決まれば、終了日が自動計算されるよ",
          ]} />
        </div>
      </div>
    );
  };

  // ステップ2: 目標設定
  const renderStep2 = () => {
    const current = parseInt(formData.currentFollowers || "0", 10);
    const target = parseInt(formData.targetFollowers || "0", 10);
    const periodMonths = formData.planPeriod === "1ヶ月" ? 1 :
                         formData.planPeriod === "3ヶ月" ? 3 :
                         formData.planPeriod === "6ヶ月" ? 6 :
                         formData.planPeriod === "1年" ? 12 : 1;
    
    // スライダーの範囲を計算
    const minTarget = current > 0 ? current : 0;
    const maxTarget = current > 0 ? Math.round(current * 2) : 1000; // 最大2倍
    const sliderTarget = target > 0 ? target : (previewData?.realisticTarget || minTarget);
    
    return (
      <div className="space-y-6">
        {/* 2-1. 一番叶えたいこと */}
        <div className="border-b border-gray-200 pb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              【必須】この期間で、一番叶えたいことは何ですか？
            </label>
            <div className="space-y-2">
              {[
                { value: "フォロワーを増やしたい", desc: "新しい人に投稿を届けて認知度アップ" },
                { value: "今のフォロワーともっと仲良くなりたい", desc: "いいねやコメントを増やして関係強化" },
                { value: "商品やサービスを広めたい", desc: "投稿を多くの人に見てもらう" },
                { value: "ブランドのファンを作りたい", desc: "保存・シェアされる投稿で信頼構築" },
                { value: "問い合わせを増やしたい", desc: "プロフィールへのアクセスを増やす" },
                { value: "来店を増やしたい", desc: "外部リンクのタップを増やす" },
                { value: "その他", desc: "自由入力" },
              ].map((option) => (
                <label key={option.value} className="flex items-start gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="mainGoal"
                    value={option.value}
                    checked={formData.mainGoal === option.value}
                    onChange={(e) => {
                      e.preventDefault();
                      onInputChange("mainGoal", e.target.value);
                    }}
                    className="mt-1 text-[#FF8A15]"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">{option.value}</span>
                    {option.desc && (
                      <p className="text-xs text-gray-500 mt-0.5">→ {option.desc}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-600 mb-4">
            <span className="font-medium text-gray-700">ヒント:</span> 迷ったら、「フォロワーを増やしたい」を選びましょう。フォロワーが増えれば、他の目標も達成しやすくなります。
          </p>
          <AIReasonBox reasons={[
            "目標が決まれば、KPIが自動で決まるよ",
            "AIが目標に応じた投稿内容を提案するよ"
          ]} />
        </div>

        {/* 2-2. 現在のフォロワー数 */}
        <div className="border-b border-gray-200 pb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              【必須】現在のフォロワー数を教えてください
            </label>
            <input
              type="number"
              value={formData.currentFollowers || ""}
              onChange={(e) => onInputChange("currentFollowers", e.target.value)}
              placeholder="例: 530"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A15]"
            />
            <span className="text-sm text-gray-500 ml-2">人</span>
          </div>
          <p className="text-xs text-gray-600 mb-4">
            <span className="font-medium text-gray-700">ヒント:</span> Instagramアプリで確認できます。プロフィール画面の「フォロワー」の数字です。わからない場合は、大体でOKです。
          </p>
          <AIReasonBox reasons={[
            "現在地が分かれば、目標までの距離が計算できるよ",
            "AIが現実的な目標を提案するよ"
          ]} />
        </div>

        {/* 2-3. アカウント情報（任意） */}
        <div className="border-b border-gray-200 pb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              【任意】アカウント開設日
            </label>
            <input
              type="date"
              value={formData.accountCreationDate || ""}
              onChange={(e) => onInputChange("accountCreationDate", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A15]"
            />
          </div>
          <p className="text-xs text-gray-600 mb-4">
            <span className="font-medium text-gray-700">ヒント:</span> 新しいアカウントは成長しやすいため、より正確な予測ができます。わからない場合は空欄のままでもOKです。
          </p>
        </div>

        {/* 2-4. 現在のエンゲージメント率（任意） */}
        <div className="border-b border-gray-200 pb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              【任意】現在のエンゲージメント率
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={formData.currentEngagementRate || ""}
                onChange={(e) => onInputChange("currentEngagementRate", e.target.value)}
                placeholder="例: 4.3"
                min="0"
                max="100"
                step="0.1"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A15]"
              />
              <span className="text-sm text-gray-500 whitespace-nowrap">%</span>
            </div>
          </div>
          <p className="text-xs text-gray-600 mb-4">
            <span className="font-medium text-gray-700">ヒント:</span> Instagramアプリの「インサイト」で確認できます。「エンゲージメント数 ÷ リーチ数 × 100」で計算できます。わからない場合は空欄のままでもOKです（業界平均4.3%で計算します）。
          </p>
        </div>

        {/* 2-5. 目標フォロワー数（AIが自動提案） */}
        <div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-900 mb-3 tracking-tight">
            目標フォロワー数
              <span className="ml-2 text-xs font-normal text-gray-500">（自動計算）</span>
            </label>
            
            <TargetFollowerInput
              current={current}
              target={target}
              previewData={previewData}
              periodMonths={periodMonths}
              onTargetChange={(value) => onInputChange("targetFollowers", value)}
              minTarget={minTarget}
              maxTarget={maxTarget}
              sliderTarget={sliderTarget}
              placeholder={previewData ? `例: ${previewData.realisticTarget}` : "例: 570"}
            />
          </div>
          <AIReasonBox reasons={[
            "AIが業界平均をもとに現実的な目標を提案！",
            "非現実的な目標を設定すると警告するよ",
            "ユーザーが納得できる目標を設定するよ"
          ]} />
        </div>
      </div>
    );
  };

  // ステップ3: 投稿頻度
  const renderStep3 = () => {
    const postingTimeOptions = [
      { value: "ai", label: "AIに任せる ⭐おすすめ", desc: "AIが最適な時間を提案" },
      { value: "morning", label: "午前中（9:00〜12:00）" },
      { value: "noon", label: "昼（12:00〜15:00）" },
      { value: "evening", label: "夕方（15:00〜18:00）" },
      { value: "night", label: "夜（18:00〜21:00）" },
      { value: "late", label: "深夜（21:00〜24:00）" },
    ];
    
    return (
      <div className="space-y-6">
        {/* 3-1. 投稿に使える時間 */}
        <div className="border-b border-gray-200 pb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              【必須】1週間で、どのくらい投稿に時間を使えますか？
            </label>
            <div className="space-y-2">
              {[
                { value: "週1〜2回（1回10分程度）", desc: "「忙しいけど、無理なく続けたい」", result: "週2投稿" },
                { value: "週3〜4回（1回15分程度）⭐おすすめ", desc: "「しっかり取り組みたい」", result: "週4投稿" },
                { value: "ほぼ毎日（1回20分程度）", desc: "「本気で伸ばしたい」", result: "週7投稿" },
              ].map((option) => (
                <label key={option.value} className="flex items-start gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="availableTime"
                    value={option.value.replace("⭐おすすめ", "").trim()}
                    checked={formData.availableTime === option.value.replace("⭐おすすめ", "").trim()}
                    onChange={(e) => onInputChange("availableTime", e.target.value)}
                    className="mt-1 text-[#FF8A15]"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">{option.value}</span>
                    {option.desc && (
                      <p className="text-xs text-gray-500 mt-0.5">{option.desc}</p>
                    )}
                    {option.result && (
                      <p className="text-xs text-[#FF8A15] mt-0.5">→ {option.result}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-600 mb-4">
            <span className="font-medium text-gray-700">ヒント:</span> 初めての方は、週3〜4回がおすすめです。無理なく続けられるペースが一番大事です。
          </p>
          <AIReasonBox reasons={[
            "投稿頻度が決まれば、AIが週次計画を自動生成するよ",
            "無理のないペースで続けられるよ"
          ]} />
        </div>

        {/* 3-2. リール（動画）は作れますか？ */}
        <div className="border-b border-gray-200 pb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              【必須】動画（リール）の投稿は可能ですか？
            </label>
            <div className="space-y-2">
              {[
                { value: "動画はちょっと苦手...", desc: "「写真メインの投稿計画にします」", result: "フィードとストーリーズのみ" },
                { value: "週1回くらいなら頑張れる ⭐おすすめ", desc: "「週1回リール + 写真投稿の組み合わせ」", result: "フィード + リール + ストーリーズ" },
                { value: "動画もどんどん作りたい！", desc: "「リール中心の成長プランにします」", result: "リール中心 + ストーリーズ" },
              ].map((option) => (
                <label key={option.value} className="flex items-start gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="reelCapability"
                    value={option.value.replace("⭐おすすめ", "").trim()}
                    checked={formData.reelCapability === option.value.replace("⭐おすすめ", "").trim()}
                    onChange={(e) => onInputChange("reelCapability", e.target.value)}
                    className="mt-1 text-[#FF8A15]"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">{option.value}</span>
                    {option.desc && (
                      <p className="text-xs text-gray-500 mt-0.5">{option.desc}</p>
                    )}
                    {option.result && (
                      <p className="text-xs text-[#FF8A15] mt-0.5">→ {option.result}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-600 mb-4">
            <span className="font-medium text-gray-700">ヒント:</span> 動画は伸びやすいですが、無理せず続けられる方が大事です。まずは週1回から始めてみましょう。
          </p>
          <AIReasonBox reasons={[
            "リール対応可否で、投稿タイプが決まるよ",
            "AIが投稿タイプに応じた計画を自動生成するよ"
          ]} />
        </div>

        {/* 3-3. ストーリーズの頻度 */}
        <div className="border-b border-gray-200 pb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              【必須】ストーリーズはどのくらい投稿できますか？
            </label>
            <div className="space-y-2">
              {[
                { value: "ストーリーズは使わない", result: "ストーリーズなし" },
                { value: "週1〜2回", result: "週2回" },
                { value: "週3〜4回", result: "週4回" },
                { value: "毎日 ⭐おすすめ", result: "毎日1〜3回" },
              ].map((option) => (
                <label key={option.value} className="flex items-start gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="storyFrequency"
                    value={option.value.replace("⭐おすすめ", "").trim()}
                    checked={formData.storyFrequency === option.value.replace("⭐おすすめ", "").trim()}
                    onChange={(e) => onInputChange("storyFrequency", e.target.value)}
                    className="mt-1 text-[#FF8A15]"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">{option.value}</span>
                    {option.result && (
                      <p className="text-xs text-[#FF8A15] mt-0.5">→ {option.result}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-600 mb-4">
            <span className="font-medium text-gray-700">ヒント:</span> ストーリーズは、フォロワーとの距離を縮めるのに最適です。毎日投稿すると、反応が良くなります。
          </p>
          <AIReasonBox reasons={[
            "ストーリーズの頻度で、日次タスクが決まるよ",
            "AIが毎日の投稿予定を自動生成するよ"
          ]} />
        </div>

        {/* 3-4. 投稿時間の希望 */}
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              【任意】投稿時間の希望はありますか？
            </label>
            <div className="space-y-2">
              {postingTimeOptions.map((option) => (
                <label key={option.value} className="flex items-start gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.postingTimePreference?.includes(option.value) || false}
                    onChange={(e) => {
                      const current = formData.postingTimePreference || [];
                      if (e.target.checked) {
                        // AIに任せるを選択した場合、他の選択をクリア
                        if (option.value === "ai") {
                          onInputChange("postingTimePreference", ["ai"]);
                        } else {
                          // AI以外を選択した場合、AIを外す
                          onInputChange("postingTimePreference", current.filter(t => t !== "ai").concat(option.value));
                        }
                      } else {
                        onInputChange("postingTimePreference", current.filter(t => t !== option.value));
                      }
                    }}
                    className="mt-1 text-[#FF8A15]"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">{option.label}</span>
                    {option.desc && (
                      <p className="text-xs text-[#FF8A15] mt-0.5">→ {option.desc}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-600 mb-4">
            <span className="font-medium text-gray-700">ヒント:</span> 「AIに任せる」を選ぶと、過去のデータから最も反応が良い時間を自動で提案します。
          </p>
          <AIReasonBox reasons={[
            "AIが最適な時間を提案するよ"
          ]} />
        </div>
      </div>
    );
  };

  // ステップ4: ターゲット設定
  const renderStep4 = () => (
    <div className="space-y-6">
      {/* 4-1. ターゲット層 */}
      <div className="border-b border-gray-200 pb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            【必須】どんな人に投稿を見てもらいたいですか？
          </label>
          <textarea
            value={formData.targetAudience || ""}
            onChange={(e) => onInputChange("targetAudience", e.target.value)}
            placeholder="例：30代のママさん。子育てに忙しいけど、自分の時間も大切にしたい人。美味しいコーヒーを飲んでリラックスしたい。"
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A15] resize-none"
          />
        </div>
        <p className="text-xs text-gray-600 mb-4">
          <span className="font-medium text-gray-700">ヒント:</span> 具体的に書くほど、AIが最適な投稿文を作れます。年齢、性別、興味、悩みなどを書いてください。
        </p>
          <AIReasonBox reasons={[
            "ターゲットが決まれば、投稿文の内容が決まるよ",
            "AIがターゲットに刺さる投稿文を生成するよ"
          ]} />
      </div>

      {/* 4-2. 地域（任意） */}
      <div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            【任意】地域を限定しますか？
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="targetRegionEnabled"
                checked={!formData.targetRegionEnabled}
                onChange={() => onInputChange("targetRegionEnabled", false)}
                className="text-[#FF8A15]"
              />
              <span className="text-sm">地域は限定しない</span>
            </label>
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="targetRegionEnabled"
                checked={Boolean(formData.targetRegionEnabled)}
                onChange={() => onInputChange("targetRegionEnabled", true)}
                className="text-[#FF8A15]"
              />
              <span className="text-sm">地域を限定する</span>
            </label>
          </div>
          {formData.targetRegionEnabled && (
            <div className="mt-3 space-y-3">
              <input
                type="text"
                value={formData.targetRegion || ""}
                onChange={(e) => onInputChange("targetRegion", e.target.value)}
                placeholder="例：福岡県福岡市"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A15]"
              />
            </div>
          )}
        </div>
        <p className="text-xs text-gray-600 mb-4">
          <span className="font-medium text-gray-700">ヒント:</span> 実店舗がある場合は、地域を限定すると来店につながりやすくなります。
        </p>
          <AIReasonBox reasons={[
            "地域が決まれば、ハッシュタグが決まるよ",
            "AIがハッシュタグを提案するよ"
          ]} />
      </div>
    </div>
  );

  // ステップ5: 投稿内容
  const renderStep5 = () => (
    <div className="space-y-6">
      {/* 5-1. 投稿したい内容 */}
      <div className="border-b border-gray-200 pb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            【必須】どんな内容を投稿したいですか？
          </label>
          <div className="grid grid-cols-2 gap-2">
            {["商品・サービスの紹介", "お客様の声", "スタッフの日常", "豆知識・ノウハウ", "イベント・キャンペーン情報", "ビフォーアフター", "舞台裏・制作過程", "その他"].map((option) => (
              <label key={option} className="flex items-center gap-2 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(formData.postContentTypes || []).includes(option)}
                  onChange={(e) => {
                    const current = formData.postContentTypes || [];
                    if (e.target.checked) {
                      onInputChange("postContentTypes", [...current, option]);
                    } else {
                      onInputChange("postContentTypes", current.filter((item) => item !== option));
                    }
                  }}
                  className="text-[#FF8A15]"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-600 mb-4">
          <span className="font-medium text-gray-700">ヒント:</span> 複数選択すると、投稿のバリエーションが増えて、フォロワーが飽きにくくなります。
        </p>
          <AIReasonBox reasons={[
            "投稿内容が決まれば、投稿文のテーマが決まるよ",
            "AIが投稿内容に応じた投稿文を生成するよ"
          ]} />
      </div>

      {/* 5-2. 避けたいこと（任意） */}
      <div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            【任意】投稿で避けたいことはありますか？
          </label>
          <textarea
            value={formData.avoidContent || ""}
            onChange={(e) => onInputChange("avoidContent", e.target.value)}
            placeholder="例：競合他社の名前は出さない&#10;価格は具体的に書かない&#10;個人情報は載せない"
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A15] resize-none"
          />
        </div>
        <p className="text-xs text-gray-600 mb-4">
          <span className="font-medium text-gray-700">ヒント:</span> AIが投稿文を作る際に、これらの内容を避けるようにします。
        </p>
          <AIReasonBox reasons={[
            "NGワードを設定すれば、炎上リスクを回避するよ",
            "AIが安全な投稿文を生成するよ"
          ]} />
      </div>
    </div>
  );

  // ステップ6: 確認
  const renderStep6 = () => {
    const progress = generationProgress || { simulation: 'pending', aiStrategy: 'pending', overallProgress: 0 };
    const overallProgress = progress.overallProgress || 0;
    
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        {isGeneratingPlan ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-[#FF8A15] animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-900 mb-6">計画を生成中です</p>
            
            {/* 全体のプログレスバー */}
            <div className="max-w-md mx-auto mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-700">進捗</span>
                <span className="text-xs font-medium text-[#FF8A15]">{overallProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-[#FF8A15] h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
            
            {/* 進捗表示 */}
            <div className="space-y-3 max-w-md mx-auto">
              {/* シミュレーション進捗 */}
              <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-gray-200">
                <div className="flex-shrink-0">
                  {progress.simulation === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : progress.simulation === 'running' ? (
                    <Loader2 className="w-5 h-5 text-[#FF8A15] animate-spin" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {progress.simulation === 'completed' ? 'シミュレーション完了' : 'シミュレーション実行中...'}
                  </p>
                  {progress.simulation === 'running' && (
                    <p className="text-xs text-gray-500 mt-0.5">フォロワー成長を計算しています</p>
                  )}
                </div>
              </div>
              
              {/* AI戦略生成進捗 */}
              <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-gray-200">
                <div className="flex-shrink-0">
                  {progress.aiStrategy === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : progress.aiStrategy === 'running' ? (
                    <Loader2 className="w-5 h-5 text-[#FF8A15] animate-spin" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {progress.aiStrategy === 'completed' ? 'AI戦略生成完了' : progress.aiStrategy === 'running' ? 'AI戦略生成中...' : 'AI戦略生成待機中'}
                  </p>
                  {progress.aiStrategy === 'running' && (
                    <p className="text-xs text-gray-500 mt-0.5">あなた専用の運用プランを作成しています</p>
                  )}
                </div>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-6">
              しばらくお待ちください。完了次第、自動的に切り替わります。
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-700 mb-4">
              入力内容を確認して、「計画を生成する」ボタンをクリックしてください。
            </p>
            <button
              type="button"
              onClick={onComplete}
              disabled={isGeneratingPlan}
              className="w-full bg-[#FF8A15] hover:bg-[#E67A0A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-6 py-3 rounded-md transition-colors"
            >
              計画を生成する
            </button>
          </>
        )}
      </div>
    );
  };

  // 計画生成後の入力内容サマリー
  const renderSummary = () => (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-2xl font-light text-gray-900 tracking-tight">計画の概要</h3>
        <p className="text-sm text-gray-500 mt-1 font-light">設定した計画内容</p>
      </div>

      <div className="space-y-6">
        {/* 計画期間 */}
        <div className="border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">計画期間</span>
          </div>
          <p className="text-lg font-light text-gray-900 mt-2 ml-6">{formData.planPeriod || "-"}</p>
        </div>

        {/* 開始日 */}
        {formData.startDate && (
          <div className="border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">開始日</span>
            </div>
            <p className="text-lg font-light text-gray-900 mt-2 ml-6">{formData.startDate}</p>
          </div>
        )}

        {/* 一番叶えたいこと */}
        <div className="border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">一番叶えたいこと</span>
          </div>
          <p className="text-lg font-light text-gray-900 mt-2 ml-6">{formData.mainGoal || "-"}</p>
        </div>

        {/* フォロワー数 */}
        <div className="border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">フォロワー数</span>
          </div>
          <div className="ml-6 space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="text-sm font-light text-gray-500">現在</span>
              <span className="text-2xl font-light text-gray-900 tracking-tight">{formData.currentFollowers || "-"}</span>
              <span className="text-sm font-light text-gray-400">人</span>
            </div>
            <div className="flex items-center gap-2 py-1">
              <div className="h-px bg-gray-200 flex-1"></div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-sm font-light text-gray-500">目標</span>
              <span className="text-2xl font-light text-[#FF8A15] tracking-tight">{formData.targetFollowers || "-"}</span>
              <span className="text-sm font-light text-gray-400">人</span>
            </div>
          </div>
        </div>

        {/* 投稿に使える時間 */}
        {formData.availableTime && (
          <div className="border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">投稿に使える時間</span>
            </div>
            <p className="text-lg font-light text-gray-900 mt-2 ml-6">{formData.availableTime}</p>
          </div>
        )}

        {/* リール対応 */}
        {formData.reelCapability && (
          <div className="border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">リール対応</span>
            </div>
            <p className="text-lg font-light text-gray-900 mt-2 ml-6">{formData.reelCapability}</p>
          </div>
        )}

        {/* ストーリーズの頻度 */}
        {formData.storyFrequency && (
          <div className="border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">ストーリーズの頻度</span>
            </div>
            <p className="text-lg font-light text-gray-900 mt-2 ml-6">{formData.storyFrequency}</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-12 gap-6 p-6">
          {/* 左カラム: ウィザード or サマリー */}
          <div className="col-span-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-full">
              {!planGenerated ? (
                <>
                  {/* 進捗バー */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      {stepTitles.map((title, index) => {
                        const stepNum = index + 1;
                        const StepIcon = stepIcons[index];
                        const status = getStepStatus(stepNum);
                        const isCompleted = status === "completed";
                        const isCurrent = status === "current";
                        
                        return (
                          <React.Fragment key={stepNum}>
                            <div className="flex flex-col items-center">
                              <button
                                type="button"
                                onClick={() => handleStepClick(stepNum)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                  isCompleted
                                    ? "bg-green-500 text-white"
                                    : isCurrent
                                    ? "bg-[#FF8A15] text-white"
                                    : "bg-gray-200 text-gray-500"
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle className="w-5 h-5" />
                                ) : (
                                  <StepIcon className="w-5 h-5" />
                                )}
                              </button>
                              <span className={`mt-2 text-xs text-center ${
                                isCurrent ? "font-semibold text-[#FF8A15]" : "text-gray-500"
                              }`}>
                                {title}
                              </span>
                            </div>
                            {stepNum < TOTAL_STEPS && (
                              <div className={`flex-1 h-1 mx-2 ${
                                isCompleted ? "bg-green-500" : "bg-gray-200"
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
                  <div className="p-6">
                    <div className="mb-6">
                      {currentStep === 1 && renderStep1()}
                      {currentStep === 2 && renderStep2()}
                      {currentStep === 3 && renderStep3()}
                      {currentStep === 4 && renderStep4()}
                      {currentStep === 5 && renderStep5()}
                      {currentStep === 6 && renderStep6()}
                    </div>

                    {/* ナビゲーションボタン */}
                    {currentStep < 6 && (
                      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={handlePrevious}
                          disabled={currentStep === 1}
                          className={`px-4 py-2 rounded-md transition-colors ${
                            currentStep === 1
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          戻る
                        </button>
                        <button
                          type="button"
                          onClick={handleNext}
                          className="px-6 py-2 bg-[#FF8A15] text-white rounded-md hover:bg-[#E67A0A] transition-colors flex items-center gap-2"
                        >
                          次へ
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-6">
                  {renderSummary()}
                </div>
              )}
            </div>
          </div>

          {/* 右カラム: プレビュー or 結果表示 */}
          <div className="col-span-6">
            <div className="sticky top-6 bg-white border border-gray-200 rounded-lg shadow-sm h-full">
              {!planGenerated ? (
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">プレビュー</h3>
                  
                  <div className="space-y-6">
                    {/* 予測結果と達成難易度（TargetFollowerInputコンポーネント） */}
                    {previewData ? (
                      <TargetFollowerInput
                        current={previewData.current}
                        target={previewData.target}
                        previewData={previewData}
                        periodMonths={formData.planPeriod === "1ヶ月" ? 1 :
                                     formData.planPeriod === "3ヶ月" ? 3 :
                                     formData.planPeriod === "6ヶ月" ? 6 :
                                     formData.planPeriod === "1年" ? 12 : 1}
                        onTargetChange={(value) => {
                          const newTarget = parseInt(value, 10);
                          onInputChange("targetFollowers", newTarget.toString());
                        }}
                        minTarget={previewData.current > 0 ? previewData.current : 0}
                        maxTarget={previewData.current > 0 ? Math.round(previewData.current * 2) : 1000}
                        sliderTarget={previewData.target > 0 ? previewData.target : previewData.realisticTarget}
                        placeholder={`例: ${previewData.realisticTarget}`}
                      />
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                        <Info className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">
                          フォロワー数を入力すると予測結果が表示されます
                        </p>
                      </div>
                    )}

                    {/* セクション1: 基本情報 */}
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-xs font-semibold text-gray-900 mb-3">セクション1: 基本情報</h4>
                      <div className="space-y-3 text-xs">
                        <div>
                          <p className="text-gray-600 mb-1">計画期間</p>
                          <p className="font-medium text-gray-900">{formData.planPeriod || "-"}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">開始日</p>
                          <p className="font-medium text-gray-900">{formData.startDate || "-"}</p>
                        </div>
                      </div>
                    </div>

                    {/* セクション2: 目標設定 */}
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-xs font-semibold text-gray-900 mb-3">セクション2: 目標設定</h4>
                      <div className="space-y-3 text-xs">
                        <div>
                          <p className="text-gray-600 mb-1">一番叶えたいこと</p>
                          <p className="font-medium text-gray-900">{formData.mainGoal || "-"}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">現在のフォロワー数</p>
                          <p className="font-medium text-gray-900">{formData.currentFollowers || "-"}人</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">目標フォロワー数</p>
                          <p className="font-medium text-gray-900">{formData.targetFollowers || "-"}人</p>
                        </div>
                      </div>
                    </div>

                    {/* セクション3: 投稿頻度 */}
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-xs font-semibold text-gray-900 mb-3">セクション3: 投稿頻度</h4>
                      <div className="space-y-3 text-xs">
                        <div>
                          <p className="text-gray-600 mb-1">投稿に使える時間</p>
                          <p className="font-medium text-gray-900">{formData.availableTime || "-"}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">リール対応</p>
                          <p className="font-medium text-gray-900">{formData.reelCapability || "-"}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">ストーリーズの頻度</p>
                          <p className="font-medium text-gray-900">{formData.storyFrequency || "-"}</p>
                        </div>
                        {formData.postingTimePreference && formData.postingTimePreference.length > 0 && (
                          <div>
                            <p className="text-gray-600 mb-1">投稿時間の希望</p>
                            <div className="flex flex-wrap gap-1">
                              {formData.postingTimePreference.map((time) => {
                                const timeLabels: Record<string, string> = {
                                  ai: "AIに任せる",
                                  morning: "午前中（9:00〜12:00）",
                                  noon: "昼（12:00〜15:00）",
                                  evening: "夕方（15:00〜18:00）",
                                  night: "夜（18:00〜21:00）",
                                  late: "深夜（21:00〜24:00）",
                                };
                                return (
                                  <span key={time} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                    {timeLabels[time] || time}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* セクション4: ターゲット設定 */}
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-xs font-semibold text-gray-900 mb-3">セクション4: ターゲット設定</h4>
                      <div className="space-y-3 text-xs">
                        <div>
                          <p className="text-gray-600 mb-1">ターゲット層</p>
                          <p className="font-medium text-gray-900 whitespace-pre-wrap">{formData.targetAudience || "-"}</p>
                        </div>
                        {formData.targetRegionEnabled && (
                          <div>
                            <p className="text-gray-600 mb-1">地域</p>
                            <p className="font-medium text-gray-900">{formData.targetRegion || "-"}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* セクション5: 投稿内容 */}
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-xs font-semibold text-gray-900 mb-3">セクション5: 投稿内容</h4>
                      <div className="space-y-3 text-xs">
                        <div>
                          <p className="text-gray-600 mb-2">投稿したい内容</p>
                          <div className="flex flex-wrap gap-2">
                            {(formData.postContentTypes && formData.postContentTypes.length > 0) ? (
                              formData.postContentTypes.map((type) => (
                                <span key={type} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                  {type}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </div>
                        </div>
                        {formData.avoidContent && (
                          <div>
                            <p className="text-gray-600 mb-1">避けたいこと</p>
                            <p className="font-medium text-gray-900 whitespace-pre-wrap">{formData.avoidContent}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* タブ切り替え */}
                  <div className="flex border-b border-gray-200">
                    <button
                      onClick={() => onTabChange?.("simulation")}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === "simulation"
                          ? "bg-[#FF8A15] text-white"
                          : "text-black hover:bg-gray-50"
                      }`}
                    >
                      シミュレーション
                    </button>
                    <button
                      onClick={() => onTabChange?.("ai")}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-l border-gray-200 ${
                        activeTab === "ai" ? "bg-[#FF8A15] text-white" : "text-black hover:bg-gray-50"
                      }`}
                    >
                      AI戦略
                    </button>
                  </div>

                  {/* タブコンテンツ */}
                  <div>
                    {activeTab === "simulation" && (
                      <SimulationPanel
                        result={simulationResult}
                        formData={formData}
                        onRunSimulation={onRunSimulation}
                        isSimulating={isSimulating}
                        simulationError={simulationError}
                        hasActivePlan={false}
                        onSave={onSave}
                        isSaving={isSaving}
                        planEndDate={planEndDate}
                        onTargetChange={(value) => {
                          // followerGainを更新
                          onInputChange("followerGain", value);
                        }}
                      />
                    )}

                    {activeTab === "ai" && onStartAiDiagnosis && setGeneratedStrategy && (
                      <AIDiagnosisPanel
                        isLoading={isAiLoading}
                        onStartDiagnosis={() => onStartAiDiagnosis(formData)}
                        onSaveAdvice={onSaveAdvice || (() => {})}
                        formData={formData}
                        selectedStrategies={selectedStrategies}
                        selectedCategories={selectedCategories}
                        simulationResult={simulationResult}
                        generatedStrategy={generatedStrategy || null}
                        setGeneratedStrategy={setGeneratedStrategy}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
