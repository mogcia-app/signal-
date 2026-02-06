"use client";

import React, { useState, useEffect } from "react";
import { Lightbulb, ArrowRight, RefreshCw, Check, Edit } from "lucide-react";
import type { ActionPlan } from "../../../../types/report";
import { useAuth } from "../../../../contexts/auth-context";

// マークダウン記法を削除する関数
const removeMarkdown = (text: string): string => {
  if (!text) return text;
  return text
    .replace(/\*\*/g, "") // **太字**
    .replace(/\*/g, "") // *斜体*
    .replace(/__/g, "") // __太字__
    .replace(/_/g, "") // _斜体_
    .replace(/#{1,6}\s/g, "") // # 見出し
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // [リンクテキスト](URL)
    .replace(/`([^`]+)`/g, "$1") // `コード`
    .replace(/~~/g, "") // ~~取り消し線~~
    .trim();
};

import type { ReportData } from "../../../../types/report";

interface MonthlyActionPlansProps {
  selectedMonth: string;
  kpis?: {
    totalLikes: number;
    totalReach: number;
    totalSaves: number;
    totalComments: number;
    totalFollowerIncrease: number;
  } | null;
  reportData?: ReportData | null;
  onRegenerate?: () => void;
}

export const MonthlyActionPlans: React.FC<MonthlyActionPlansProps> = ({ selectedMonth, kpis, reportData, onRegenerate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [aiDirection, setAiDirection] = useState<{
    month: string;
    mainTheme: string;
    lockedAt: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number | null>(null); // 選択されたアクションプランのインデックス
  const { user } = useAuth();

  // reportDataからアクションプランを取得
  const actionPlans: ActionPlan[] = reportData?.monthlyReview?.actionPlans || [];

  // 次月の月文字列を計算
  const getNextMonth = (month: string): string => {
    const [yearStr, monthStr] = month.split("-").map(Number);
    // monthStrは1-12の値なので、0ベースに変換（monthStr - 1）
    const nextMonth = new Date(yearStr, monthStr - 1, 1);
    nextMonth.setMonth(nextMonth.getMonth() + 1); // 次月に進める
    return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
  };

  const nextMonth = getNextMonth(selectedMonth);

  // ai_directionの状態を取得
  useEffect(() => {
    const fetchAiDirection = async () => {
      if (!user?.uid) {
        return;
      }

      // actionPlansが存在する場合のみai_directionを取得
      // （ai_directionはactionPlansが生成された時に作成されるため）
      if (actionPlans.length === 0) {
        setAiDirection(null);
        return;
      }

      setIsLoading(true);
      try {
        console.log(`[MonthlyActionPlans] ai_direction取得: month=${nextMonth}, actionPlans.length=${actionPlans.length}`);
        const response = await fetch(`/api/ai-direction?month=${nextMonth}`);
        const result = await response.json();
        console.log(`[MonthlyActionPlans] ai_direction取得結果:`, result);
        if (result.success && result.data) {
          setAiDirection({
            month: result.data.month,
            mainTheme: result.data.mainTheme,
            lockedAt: result.data.lockedAt,
          });
        } else {
          console.log(`[MonthlyActionPlans] ai_directionが見つかりませんでした: month=${nextMonth}`);
          setAiDirection(null);
        }
      } catch (error) {
        console.error("ai_direction取得エラー:", error);
        setAiDirection(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAiDirection();
  }, [user?.uid, nextMonth, actionPlans.length]);

  // データがある場合は自動的に展開
  useEffect(() => {
    if (actionPlans.length > 0) {
      setIsExpanded(true);
    }
  }, [actionPlans.length]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate();
    }
  };

  const handleLockDirection = async () => {
    if (!user?.uid || isLocking) {
      return;
    }

    setIsLocking(true);
    try {
      const response = await fetch("/api/ai-direction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ month: nextMonth }),
      });

      const result = await response.json();
      if (result.success) {
        // ai_directionの状態を更新
        const updatedResponse = await fetch(`/api/ai-direction?month=${nextMonth}`);
        const updatedResult = await updatedResponse.json();
        if (updatedResult.success && updatedResult.data) {
          setAiDirection({
            month: updatedResult.data.month,
            mainTheme: updatedResult.data.mainTheme,
            lockedAt: updatedResult.data.lockedAt,
          });
        }
      } else {
        alert("確定に失敗しました。もう一度お試しください。");
      }
    } catch (error) {
      console.error("ai_direction確定エラー:", error);
      alert("確定に失敗しました。もう一度お試しください。");
    } finally {
      setIsLocking(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 p-3 sm:p-4 mb-4">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#ff8a15] flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
            <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">次のアクションプラン</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              AIが生成した来月に向けた具体的なアクションプラン
            </p>
          </div>
        </div>

        {actionPlans.length > 0 && (
          <button
            onClick={handleToggle}
            className="flex items-center justify-center space-x-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all border border-gray-300"
          >
            {isExpanded ? (
              <span className="hidden sm:inline text-xs">閉じる</span>
            ) : (
              <span className="hidden sm:inline text-xs">開く</span>
            )}
          </button>
        )}
      </div>

      {/* コンテンツ */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 animate-in fade-in duration-300">
          {actionPlans.length > 0 ? (
            <>
              {/* デバッグ情報（開発用） */}
              {process.env.NODE_ENV === "development" && (
                <div className="mb-2 p-2 bg-gray-100 text-xs text-gray-600 rounded">
                  <p>Debug: selectedMonth={selectedMonth}, nextMonth={nextMonth}</p>
                  <p>actionPlans.length={actionPlans.length}, aiDirection={aiDirection ? JSON.stringify(aiDirection) : "null"}</p>
                  <p>isLoading={isLoading.toString()}, lockedAt={aiDirection?.lockedAt || "null"}</p>
                </div>
              )}

              {/* 確認ステップ: actionPlansが存在するがai_directionが存在しない場合 */}
              {!isLoading && !aiDirection && actionPlans.length > 0 && (
                <div className="mb-4 p-4 bg-white border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Lightbulb className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">
                        今月の重点方針を選択してください
                      </h3>
                      <p className="text-xs text-gray-600 mb-3">
                        以下のアクションプランから、今月の重点方針として進めるものを選択してください。
                      </p>
                      
                      {/* アクションプラン選択UI */}
                      <div className="space-y-2 mb-4">
                        {actionPlans.map((plan, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedPlanIndex(index)}
                            className={`w-full text-left p-3 border-2 transition-all ${
                              selectedPlanIndex === index
                                ? "border-gray-900 bg-gray-50"
                                : "border-gray-200 bg-white hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <div className={`flex-shrink-0 w-4 h-4 mt-0.5 border-2 flex items-center justify-center ${
                                selectedPlanIndex === index
                                  ? "border-gray-900 bg-gray-900"
                                  : "border-gray-300"
                              }`}>
                                {selectedPlanIndex === index && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-gray-900 mb-1">
                                  {index + 1}. {removeMarkdown(plan.title)}
                                </div>
                                {plan.description && (
                                  <div className="text-xs text-gray-600 mb-1">
                                    {removeMarkdown(plan.description)}
                                  </div>
                                )}
                                {plan.action && (
                                  <div className="text-xs text-gray-700 mt-1 flex items-start gap-1">
                                    <ArrowRight className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" />
                                    <span>{removeMarkdown(plan.action)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            // 選択されたアクションプランからai_directionを作成して確定
                            if (!user?.uid || isLocking || selectedPlanIndex === null) {
                              if (selectedPlanIndex === null) {
                                alert("重点方針を選択してください。");
                              }
                              return;
                            }
                            
                            const selectedPlan = actionPlans[selectedPlanIndex];
                            setIsLocking(true);
                            try {
                              // 選択されたアクションプランから情報を抽出
                              const mainTheme = selectedPlan?.title || "継続的な改善";
                              const postingRules = [selectedPlan?.action].filter(Boolean) as string[];
                              let priorityKPI = "エンゲージメント率";
                              
                              if (selectedPlan.title.includes("保存") || selectedPlan.description?.includes("保存")) {
                                priorityKPI = "保存率";
                              } else if (selectedPlan.title.includes("リーチ") || selectedPlan.description?.includes("リーチ")) {
                                priorityKPI = "リーチ";
                              } else if (selectedPlan.title.includes("フォロワー") || selectedPlan.description?.includes("フォロワー")) {
                                priorityKPI = "フォロワー増加";
                              }

                              // ai_directionを作成して確定
                              const response = await fetch("/api/ai-direction", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  month: nextMonth,
                                  create: true,
                                  locked: true,
                                  mainTheme,
                                  priorityKPI,
                                  avoidFocus: [],
                                  postingRules,
                                }),
                              });
                              
                              const result = await response.json();
                              if (result.success) {
                                // 状態を更新
                                const updatedResponse = await fetch(`/api/ai-direction?month=${nextMonth}`);
                                const updatedResult = await updatedResponse.json();
                                if (updatedResult.success && updatedResult.data) {
                                  setAiDirection({
                                    month: updatedResult.data.month,
                                    mainTheme: updatedResult.data.mainTheme,
                                    lockedAt: updatedResult.data.lockedAt,
                                  });
                                  setSelectedPlanIndex(null); // 選択をリセット
                                }
                              } else {
                                alert(result.error || "確定に失敗しました。もう一度お試しください。");
                              }
                            } catch (error) {
                              console.error("ai_direction作成・確定エラー:", error);
                              alert("確定に失敗しました。もう一度お試しください。");
                            } finally {
                              setIsLocking(false);
                            }
                          }}
                          disabled={isLocking || selectedPlanIndex === null}
                          className="px-4 py-2 text-xs font-medium text-white disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                          style={{ backgroundColor: isLocking || selectedPlanIndex === null ? undefined : '#ff8a15' }}
                        >
                          {isLocking ? "確定中..." : "選択した方針で進める"}
                        </button>
                        <button
                          onClick={handleRegenerate}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 transition-colors"
                        >
                          <Edit className="w-3 h-3" />
                          <span>✏ 修正する</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 確認ステップ: ai_directionが未確定の場合 */}
              {!isLoading && aiDirection && !aiDirection.lockedAt && (
                <div className="mb-4 p-4 bg-white border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Lightbulb className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        今月の重点方針はこれで進めますか？
                      </h3>
                      <p className="text-xs text-gray-700 mb-3">
                        {aiDirection.mainTheme}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleLockDirection}
                          disabled={isLocking}
                          className="px-4 py-2 text-xs font-medium text-white disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                          style={{ backgroundColor: isLocking ? undefined : '#ff8a15' }}
                        >
                          {isLocking ? "確定中..." : "この方針で進める"}
                        </button>
                        <button
                          onClick={handleRegenerate}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 transition-colors"
                        >
                          <Edit className="w-3 h-3" />
                          <span>✏ 修正する</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 確定済み表示 */}
              {!isLoading && aiDirection && aiDirection.lockedAt && (
                <div className="mb-4 p-3 bg-white border border-gray-200">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-900">
                        今月の重点方針が確定されました
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {aiDirection.mainTheme}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 通常のアクションプラン表示（選択UIが表示されていない場合のみ） */}
              {(!aiDirection || aiDirection.lockedAt) && (
                <div className="space-y-2">
                  {actionPlans.map((plan, index) => (
                      <div
                        key={index}
                        className="bg-white p-3 sm:p-4 border border-gray-200"
                      >
                        <h3 className="text-sm font-semibold text-gray-900 mb-1.5">
                          {index + 1}. {removeMarkdown(plan.title)}
                        </h3>
                        {plan.description && (
                          <p className="text-xs text-gray-700 mb-2 leading-relaxed">{removeMarkdown(plan.description)}</p>
                        )}
                        {plan.action && (
                          <div className="flex items-start gap-2 mt-2 pt-2 border-t border-orange-200">
                            <ArrowRight className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs font-medium text-gray-900">{removeMarkdown(plan.action)}</p>
                          </div>
                        )}
                      </div>
                  ))}
                </div>
              )}

              {/* 再提案するボタン */}
              <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleRegenerate}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors border border-gray-300"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>再提案する</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p className="text-xs">アクションプランがありません</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

