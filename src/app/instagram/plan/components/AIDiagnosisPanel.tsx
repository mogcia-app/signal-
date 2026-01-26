import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, CheckCircle, Target, Lightbulb, Calendar } from "lucide-react";
import { PlanFormData, SimulationResult } from "../types/plan";
import { useAIStrategy } from "../hooks/useAIStrategy";
import {
  extractThisWeekTasks,
  extractThisMonthGoals,
  extractMostImportant,
  extractThreeMonthPlan,
  extractGrowthTarget,
  extractWhyThisStrategy,
  extractAdvancedStrategy,
  translateTerm,
  type SimpleStrategy,
  type DetailedStrategy,
  type AdvancedStrategy,
} from "../utils/strategyParser";
import { logger } from "../utils/logger";

interface AIDiagnosisPanelProps {
  isLoading: boolean;
  onStartDiagnosis: () => void;
  onSaveAdvice: () => void;
  formData: PlanFormData;
  selectedStrategies: string[];
  selectedCategories: string[];
  simulationResult?: SimulationResult | null;
  generatedStrategy: string | null;
  setGeneratedStrategy: (strategy: string | null) => void;
}

export const AIDiagnosisPanel: React.FC<AIDiagnosisPanelProps> = ({
  isLoading,
  onStartDiagnosis,
  onSaveAdvice,
  formData,
  selectedStrategies,
  selectedCategories,
  simulationResult,
  generatedStrategy,
  setGeneratedStrategy,
}) => {
  const { strategyState, generateStrategy } = useAIStrategy();
  const [expandedSections, setExpandedSections] = useState<number[]>([0]); // デフォルトでレベル1を展開
  const [showLevel2, setShowLevel2] = useState(false); // レベル2（詳細版）の表示状態
  const [showLevel3, setShowLevel3] = useState(false); // レベル3（上級者向け）の表示状態
  const [saveMessage, setSaveMessage] = useState<string>("");

  const handleStartDiagnosis = async () => {
    try {
      await generateStrategy(
        formData,
        selectedStrategies,
        selectedCategories,
        simulationResult || null
      );
      onStartDiagnosis();
    } catch (error) {
      logger.error("Strategy generation failed:", error);
    }
  };

  // ★ 戦略生成完了時に保存
  React.useEffect(() => {
    if (strategyState.strategy) {
      setGeneratedStrategy(strategyState.strategy);
    }
  }, [strategyState.strategy, setGeneratedStrategy]);


  // 3段階の情報を抽出
  const simpleStrategy = useMemo<SimpleStrategy | null>(() => {
    if (!generatedStrategy) return null;
    return {
      thisWeekTasks: extractThisWeekTasks(generatedStrategy, formData),
      thisMonthGoals: extractThisMonthGoals(generatedStrategy, formData),
      mostImportant: extractMostImportant(generatedStrategy),
    };
  }, [generatedStrategy, formData]);

  const detailedStrategy = useMemo<DetailedStrategy | null>(() => {
    if (!generatedStrategy) return null;
    return {
      threeMonthPlan: extractThreeMonthPlan(generatedStrategy, formData),
      growthTarget: extractGrowthTarget(generatedStrategy, formData),
      whyThisStrategy: extractWhyThisStrategy(generatedStrategy),
    };
  }, [generatedStrategy, formData]);

  const advancedStrategy = useMemo<AdvancedStrategy | null>(() => {
    if (!generatedStrategy) return null;
    return extractAdvancedStrategy(generatedStrategy);
  }, [generatedStrategy]);

  // Markdownをクリーンアップ（**, ##, -, などを削除）
  const cleanMarkdown = (text: string): string => {
    return (
      text
        // セクション番号とタイトルを削除（4セクション）
        .replace(/^[①②③④]\s*\*\*.*?\*\*\s*/g, "")
        // ## ヘッダーを削除
        .replace(/^##\s*/gm, "")
        // ### ヘッダーを削除
        .replace(/^###\s*/gm, "")
        // **太字**を削除（太字記号のみ）
        .replace(/\*\*(.*?)\*\*/g, "$1")
        // __太字__を削除
        .replace(/__(.*?)__/g, "$1")
        // リストマーカー「- 」を「• 」に変更
        .replace(/^- /gm, "• ")
        // 行末の#を削除
        .replace(/#\s*$/gm, "")
        // 行頭の単独#を削除（##や###以外）
        .replace(/^#\s+(?!#)/gm, "")
        // 文末の#（スペースや改行の前）を削除
        .replace(/\s+#\s+/g, " ")
        .replace(/\s+#$/gm, "")
        // 連続する空行を1つに
        .replace(/\n\n\n+/g, "\n\n")
        // 先頭と末尾の空白を削除
        .trim()
    );
  };

  return (
    <div className="p-6">
      <div className="mb-10">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-2xl font-light text-gray-900 tracking-tight">
              {generatedStrategy ? "運用プラン" : "AI運用戦略提案"}
            </h3>
            {generatedStrategy && (
              <p className="text-sm text-gray-500 mt-2 font-light">
                AIが生成した運用プラン
              </p>
            )}
          </div>
          {generatedStrategy && (
            <button
              onClick={handleStartDiagnosis}
              disabled={isLoading || strategyState.isLoading}
              className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed font-light py-1 px-3 transition-all duration-200 flex items-center gap-1.5"
            >
              {isLoading || strategyState.isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent"></div>
                  <span>再生成中</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>再生成</span>
                </>
              )}
            </button>
          )}
        </div>
        {!generatedStrategy && (
          <p className="text-sm text-gray-400 font-light">運用計画をもとにInstagram戦略をAIが提案します</p>
        )}
      </div>

      {/* 診断ボタン（生成済みでない場合のみ表示） */}
      {!generatedStrategy && (
        <button
          onClick={handleStartDiagnosis}
          disabled={isLoading || strategyState.isLoading}
          className="w-full bg-[#FF8A15] hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-light py-3 px-6 rounded transition-all duration-200 mb-6 flex items-center justify-center gap-2"
        >
          {isLoading || strategyState.isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>生成中...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>診断を開始</span>
            </>
          )}
        </button>
      )}

        {/* エラー表示 */}
        {strategyState.error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-md">
            <p className="text-sm text-red-700">{strategyState.error}</p>
          </div>
        )}

        {/* 診断出力エリア（generatedStrategyがあれば常に表示） */}
        {generatedStrategy && simpleStrategy && (
          <div className="space-y-8">
            {/* レベル1: 超シンプル版（デフォルト表示） */}
            <div className="bg-white border-b border-gray-200 pb-8">
              {/* 今週やること */}
              <div className="mb-8">
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
                  今週やること
                </h4>
                <div className="space-y-3">
                  {simpleStrategy.thisWeekTasks.map((task, index) => (
                    <div key={index} className="flex items-start gap-4 py-2 border-b border-gray-50">
                      <span className="text-sm font-light text-gray-400 min-w-[50px]">{task.day}</span>
                      <span className="text-gray-900 flex-1 leading-relaxed font-light">{task.task}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 今月の目標 */}
              <div className="mb-8">
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
                  今月の目標
                </h4>
                <div className="space-y-4">
                  {simpleStrategy.thisMonthGoals.map((goal, index) => (
                    <div key={index} className="border-b border-gray-50 pb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-1 h-1 bg-[#FF8A15] rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-gray-900 leading-relaxed font-light">{goal.goal}</p>
                          {goal.description && (
                            <p className="text-xs text-gray-400 mt-2 font-light leading-relaxed">{goal.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 一番大事なこと */}
              <div className="mb-8">
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
                  一番大事なこと
                </h4>
                <div className="border-l-2 border-[#FF8A15] pl-4 py-2">
                  <p className="text-gray-900 font-light text-base leading-relaxed">{simpleStrategy.mostImportant}</p>
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    onSaveAdvice();
                    setSaveMessage("この計画で始めます！");
                    setTimeout(() => {
                      setSaveMessage("");
                    }, 3000);
                  }}
                  className="flex-1 bg-[#FF8A15] hover:bg-orange-600 text-white font-light py-3 px-6 rounded transition-all duration-200"
                >
                  この計画で始める
                </button>
                <button
                  onClick={() => setShowLevel2(!showLevel2)}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 font-light py-3 px-6 rounded transition-all duration-200 hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  {showLevel2 ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      <span>詳しい戦略を閉じる</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      <span>詳しい戦略を見る</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* レベル2: 詳細版（クリックで展開） */}
            {showLevel2 && detailedStrategy && (
              <div className="bg-white border-t border-gray-200 pt-8">
                <div className="mb-8 pb-6 border-b border-gray-200">
                  <h4 className="text-xl font-light text-gray-900 tracking-tight">詳しい戦略</h4>
                </div>

                {/* 3ヶ月の流れ */}
                <div className="mb-8">
                  <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-6">
                    この{formData.planPeriod || "3ヶ月"}でやること
                  </h5>
                  <div className="space-y-6">
                    {detailedStrategy.threeMonthPlan.map((plan) => (
                      <div key={plan.month} className="border-l border-gray-300 pl-6 pb-6">
                        <h6 className="text-sm font-medium text-gray-500 mb-3 tracking-wide">
                          ステップ{plan.month} / {plan.title}
                        </h6>
                        <ul className="space-y-2.5">
                          {plan.steps.map((step, index) => (
                            <li key={index} className="text-sm text-gray-700 flex items-start gap-3 font-light">
                              <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                              <span className="leading-relaxed">{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 成長目標 */}
                <div className="mb-8">
                  <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-6">
                    こんな成長を目指します
                  </h5>
                  <div className="space-y-4">
                    <div className="flex items-baseline gap-3">
                      <span className="text-sm font-light text-gray-500">現在</span>
                      <span className="text-2xl font-light text-gray-900 tracking-tight">{detailedStrategy.growthTarget.current.toLocaleString()}</span>
                      <span className="text-sm font-light text-gray-400">人</span>
                    </div>
                    {detailedStrategy.growthTarget.targets.map((target) => (
                      <div key={target.month} className="flex items-baseline gap-3 border-l border-gray-200 pl-4">
                        <span className="text-sm font-light text-gray-500">{target.month}ヶ月後</span>
                        <span className="text-2xl font-light text-gray-900 tracking-tight">{target.followers.toLocaleString()}</span>
                        <span className="text-sm font-light text-gray-400">人</span>
                        <span className="text-sm font-light text-[#FF8A15] ml-2">+{target.gain.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500 font-light leading-relaxed">
                        {detailedStrategy.growthTarget.message}
                      </p>
                    </div>
                  </div>
                </div>

                {/* なぜこの戦略か */}
                <div className="mb-8">
                  <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-6">
                    なぜこの戦略？
                  </h5>
                  <ul className="space-y-3">
                    {detailedStrategy.whyThisStrategy.map((reason, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start gap-3 font-light">
                        <div className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="leading-relaxed">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* さらに詳しく見るボタン */}
                <button
                  onClick={() => setShowLevel3(!showLevel3)}
                  className="w-full bg-white border border-gray-300 text-gray-700 font-light py-3 px-6 rounded transition-all duration-200 flex items-center justify-center gap-2 hover:bg-gray-50"
                >
                  {showLevel3 ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      <span>上級者向け詳細を閉じる</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      <span>さらに詳しく見る</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* レベル3: 上級者向け（さらに展開） */}
            {showLevel3 && advancedStrategy && (
              <div className="bg-white border-t border-gray-200 pt-8">
                <div className="mb-8 pb-6 border-b border-gray-200">
                  <h4 className="text-xl font-light text-gray-900 tracking-tight">詳細な運用戦略</h4>
                </div>
                <div className="space-y-8">
                  {advancedStrategy.overallStrategy && (
                    <div className="border-l border-gray-300 pl-6">
                      <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
                        全体運用戦略
                      </h5>
                      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-light">
                        {cleanMarkdown(advancedStrategy.overallStrategy)}
                      </div>
                    </div>
                  )}
                  {advancedStrategy.postDesign && (
                    <div className="border-l border-gray-300 pl-6">
                      <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
                        投稿設計
                      </h5>
                      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-light">
                        {cleanMarkdown(advancedStrategy.postDesign)}
                      </div>
                    </div>
                  )}
                  {advancedStrategy.customerJourney && (
                    <div className="border-l border-gray-300 pl-6">
                      <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
                        カスタマージャーニー
                      </h5>
                      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-light">
                        {cleanMarkdown(advancedStrategy.customerJourney)}
                      </div>
                    </div>
                  )}
                  {advancedStrategy.keyMetrics && (
                    <div className="border-l border-gray-300 pl-6">
                      <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
                        注視すべき指標
                      </h5>
                      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-light">
                        {cleanMarkdown(advancedStrategy.keyMetrics)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 保存ボタン */}
            {saveMessage && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 shadow-sm animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800 font-semibold">{saveMessage}</p>
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  );
};
