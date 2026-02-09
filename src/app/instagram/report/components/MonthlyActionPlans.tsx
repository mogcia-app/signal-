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
  const [isEditing, setIsEditing] = useState(false); // 編集モード
  const [editedTheme, setEditedTheme] = useState(""); // 編集中のテーマ
  const [isSaving, setIsSaving] = useState(false); // 保存中フラグ
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

  // 月を日本語でフォーマットする関数
  const formatMonth = (monthStr: string): string => {
    const [yearStr, monthNum] = monthStr.split("-").map(Number);
    return `${yearStr}年${monthNum}月`;
  };

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
      // 選択状態をリセット
      setSelectedPlanIndex(null);
      // 月次レポートを再生成
      onRegenerate();
    }
  };

  const handleEdit = () => {
    // 編集モードに切り替え
    setIsEditing(true);
    setSelectedPlanIndex(null);
    // 既存のai_directionがある場合は、そのテーマを初期値として設定
    if (aiDirection) {
      setEditedTheme(removeMarkdown(aiDirection.mainTheme));
    } else {
      setEditedTheme("");
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
              {/* 選択式UI: ai_directionが未確定の場合（常に表示） */}
              {!isLoading && (!aiDirection || !aiDirection.lockedAt) && actionPlans.length > 0 && !isEditing && (
                <div className="mb-6">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-gray-900 mb-2">
                      {aiDirection ? "今月の重点方針を変更しますか？" : "今月の重点方針を選択してください"}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {aiDirection 
                        ? "以下のアクションプランから、新しい重点方針を選択してください。"
                        : "以下のアクションプランから、今月の重点方針として進めるものを選択してください。"}
                    </p>
                  </div>
                      
                  {/* アクションプラン選択UI */}
                  <div className="space-y-3 mb-6">
                    {actionPlans.map((plan, index) => {
                      // 既存のai_directionと一致する場合は選択状態にする
                      const isSelected = selectedPlanIndex === index || 
                        (aiDirection && selectedPlanIndex === null && removeMarkdown(plan.title) === removeMarkdown(aiDirection.mainTheme));
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedPlanIndex(index)}
                          className={`w-full text-left p-4 border-2 transition-all shadow-sm hover:shadow-md ${
                            isSelected
                              ? "border-[#ff8a15] bg-orange-50 shadow-md"
                              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`flex-shrink-0 w-5 h-5 mt-0.5 border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? "border-[#ff8a15] bg-[#ff8a15]"
                                : "border-gray-300 bg-white"
                            }`}>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-base font-bold mb-2 ${
                                isSelected ? "text-gray-900" : "text-gray-800"
                              }`}>
                                {index + 1}. {removeMarkdown(plan.title)}
                              </div>
                              {plan.description && (
                                <div className={`text-sm mb-3 leading-relaxed ${
                                  isSelected ? "text-gray-700" : "text-gray-600"
                                }`}>
                                  {removeMarkdown(plan.description)}
                                </div>
                              )}
                              {plan.action && (
                                <div className={`text-sm font-medium mt-3 pt-3 border-t flex items-start gap-2 ${
                                  isSelected ? "border-orange-200 text-[#ff8a15]" : "border-gray-200 text-gray-700"
                                }`}>
                                  <ArrowRight className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                    isSelected ? "text-[#ff8a15]" : "text-gray-500"
                                  }`} />
                                  <span>{removeMarkdown(plan.action)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-200">
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
                      className="px-6 py-2.5 text-sm font-semibold text-white disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                      style={{ backgroundColor: isLocking || selectedPlanIndex === null ? undefined : '#ff8a15' }}
                    >
                      {isLocking ? "確定中..." : "選択した方針で進める"}
                    </button>
                    <button
                      onClick={handleEdit}
                      disabled={isLocking}
                      className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border-2 border-gray-300 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Edit className="w-4 h-4" />
                      <span>修正する</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 編集モード: 自由入力 */}
              {!isLoading && isEditing && (
                <div className="mb-6 p-5 bg-gradient-to-br from-gray-50 to-orange-50/30 border-2 border-gray-200">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-gray-900 mb-2">
                      今月の重点方針を入力してください
                    </h3>
                    <p className="text-sm text-gray-600">
                      自由に重点方針を入力して、今月の方針として確定できます。
                    </p>
                  </div>
                  
                  <textarea
                    value={editedTheme}
                    onChange={(e) => setEditedTheme(e.target.value)}
                    className="w-full p-4 text-sm text-gray-900 border-2 border-gray-300 bg-white mb-4 resize-none focus:border-[#ff8a15] focus:ring-2 focus:ring-orange-200 focus:outline-none"
                    rows={4}
                    placeholder="例: 商品紹介の動画コンテンツを作成"
                  />
                  
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={async () => {
                        if (!user?.uid || isSaving || !editedTheme.trim()) {
                          if (!editedTheme.trim()) {
                            alert("重点方針を入力してください。");
                          }
                          return;
                        }
                        
                        setIsSaving(true);
                        try {
                          // ai_directionを作成して確定
                          const response = await fetch("/api/ai-direction", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              month: nextMonth,
                              create: true,
                              locked: true,
                              mainTheme: editedTheme.trim(),
                              priorityKPI: "エンゲージメント率",
                              avoidFocus: [],
                              postingRules: [],
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
                              setIsEditing(false);
                              setEditedTheme("");
                            }
                          } else {
                            alert(result.error || "確定に失敗しました。もう一度お試しください。");
                          }
                        } catch (error) {
                          console.error("ai_direction作成・確定エラー:", error);
                          alert("確定に失敗しました。もう一度お試しください。");
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      disabled={isSaving || !editedTheme.trim()}
                      className="px-6 py-2.5 text-sm font-semibold text-white disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                      style={{ backgroundColor: isSaving || !editedTheme.trim() ? undefined : '#ff8a15' }}
                    >
                      {isSaving ? "確定中..." : "この方針で進める"}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditedTheme("");
                        setSelectedPlanIndex(null);
                      }}
                      disabled={isSaving}
                      className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border-2 border-gray-300 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}

              {/* 確定済み表示 */}
              {!isLoading && aiDirection && aiDirection.lockedAt && (
                <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Check className="w-5 h-5 text-[#ff8a15]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-orange-900 mb-2">
                        {formatMonth(aiDirection.month)}の方針が確定されました
                      </p>
                      <p className="text-sm text-gray-800 leading-relaxed mb-3">
                        {removeMarkdown(aiDirection.mainTheme)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 通常のアクションプラン表示（選択UIが表示されていない場合のみ） */}
              {(!aiDirection || aiDirection.lockedAt) && (
              <div className="space-y-4">
                {actionPlans.map((plan, index) => (
                    <div
                      key={index}
                      className="bg-white p-5 border-2 border-gray-200 shadow-sm hover:shadow-md transition-all"
                    >
                      <h3 className="text-base font-bold text-gray-900 mb-3">
                        {index + 1}. {removeMarkdown(plan.title)}
                      </h3>
                      {plan.description && (
                        <p className="text-sm text-gray-700 mb-3 leading-relaxed">{removeMarkdown(plan.description)}</p>
                      )}
                      {plan.action && (
                        <div className="flex items-start gap-2 mt-4 pt-4 border-t-2 border-orange-200">
                          <ArrowRight className="w-5 h-5 text-[#ff8a15] mt-0.5 flex-shrink-0" />
                          <p className="text-sm font-semibold text-gray-900">{removeMarkdown(plan.action)}</p>
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

