"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import type { CurrentPlan } from "../../../types/home";
import { WEEK_DAYS, type WeekDay } from "../types";

interface PlanCardSectionProps {
  planCardRef: RefObject<HTMLDivElement | null>;
  isPlanCardHighlighted: boolean;
  showPlanGateLoader: boolean;
  planGateProgress: number;
  renderGateLoader: (params: {
    message: string;
    subMessage: string;
    progress: number;
  }) => ReactNode;
  currentPlan: CurrentPlan | null | undefined;
  isLoadingDashboard: boolean;
  showHomePlanForm: boolean;
  quickPlanPurpose: string;
  setQuickPlanPurpose: Dispatch<SetStateAction<string>>;
  quickPlanTargetFollowers: number | "";
  setQuickPlanTargetFollowers: Dispatch<SetStateAction<number | "">>;
  quickPlanFeedDays: WeekDay[];
  quickPlanReelDays: WeekDay[];
  quickPlanStoryDays: WeekDay[];
  quickPlanStartDate: string;
  setQuickPlanStartDate: Dispatch<SetStateAction<string>>;
  quickPlanDetailOpen: boolean;
  setQuickPlanDetailOpen: Dispatch<SetStateAction<boolean>>;
  quickPlanTargetAudience: string;
  setQuickPlanTargetAudience: Dispatch<SetStateAction<string>>;
  quickPlanPostingTime: string;
  setQuickPlanPostingTime: Dispatch<SetStateAction<string>>;
  quickPlanRegionRestriction: "none" | "restricted";
  setQuickPlanRegionRestriction: Dispatch<SetStateAction<"none" | "restricted">>;
  quickPlanRegionName: string;
  setQuickPlanRegionName: Dispatch<SetStateAction<string>>;
  isCreatingQuickPlan: boolean;
  isResettingPlan: boolean;
  isResetConfirming: boolean;
  setIsResetConfirming: Dispatch<SetStateAction<boolean>>;
  getWeeklyCountLabel: (count: number) => string;
  parseSavedWeekDays: (value: unknown) => WeekDay[];
  sortWeekDays: (days: WeekDay[]) => WeekDay[];
  getPostingTimeLabel: (value: unknown) => string;
  toggleFeedDay: (day: WeekDay) => void;
  toggleReelDay: (day: WeekDay) => void;
  toggleStoryDay: (day: WeekDay) => void;
  onOpenPlanForm: () => void;
  onEditCurrentPlan: (currentPlan: CurrentPlan) => void;
  onCreateQuickPlan: () => void;
  onResetHomePlan: () => void;
}

export function PlanCardSection({
  planCardRef,
  isPlanCardHighlighted,
  showPlanGateLoader,
  planGateProgress,
  renderGateLoader,
  currentPlan,
  isLoadingDashboard,
  showHomePlanForm,
  quickPlanPurpose,
  setQuickPlanPurpose,
  quickPlanTargetFollowers,
  setQuickPlanTargetFollowers,
  quickPlanFeedDays,
  quickPlanReelDays,
  quickPlanStoryDays,
  quickPlanStartDate,
  setQuickPlanStartDate,
  quickPlanDetailOpen,
  setQuickPlanDetailOpen,
  quickPlanTargetAudience,
  setQuickPlanTargetAudience,
  quickPlanPostingTime,
  setQuickPlanPostingTime,
  quickPlanRegionRestriction,
  setQuickPlanRegionRestriction,
  quickPlanRegionName,
  setQuickPlanRegionName,
  isCreatingQuickPlan,
  isResettingPlan,
  isResetConfirming,
  setIsResetConfirming,
  getWeeklyCountLabel,
  parseSavedWeekDays,
  sortWeekDays,
  getPostingTimeLabel,
  toggleFeedDay,
  toggleReelDay,
  toggleStoryDay,
  onOpenPlanForm,
  onEditCurrentPlan,
  onCreateQuickPlan,
  onResetHomePlan,
}: PlanCardSectionProps) {
  return (
    <div
      ref={planCardRef}
      className={`bg-white border p-6 transition-shadow ${
        isPlanCardHighlighted
          ? "border-orange-300 shadow-[0_0_0_3px_rgba(255,138,21,0.18)]"
          : "border-gray-200"
      }`}
    >
      <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-3">
        <span>🧭</span>
        運用計画
      </h2>
      <p className="text-sm text-gray-500 mb-3">1ヶ月の計画を立てましょう</p>

      {showPlanGateLoader && (
        <div className="mb-3">
          {renderGateLoader({
            message: "計画を保存中です。",
            subMessage: "保存完了までしばらくお待ちください。",
            progress: planGateProgress,
          })}
        </div>
      )}

      {!showPlanGateLoader && !currentPlan && !isLoadingDashboard && (
        <div className="mb-2 border border-orange-500 bg-gradient-to-r from-[#FF8A15] to-orange-500">
          <div className="px-5 py-7">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-orange-100">
                  <span className="inline-block h-2 w-2 bg-white" />
                  QUICK START
                </div>
                <h3 className="text-sm font-semibold text-white">運用計画を作成しましょう</h3>
                <p className="mt-1 text-xs text-orange-50">
                  ホーム内で完結して作成できます。保存後はカレンダーと週次計画へ自動反映されます。
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenPlanForm}
                className="shrink-0 px-4 py-2 text-xs font-semibold bg-white text-[#d96a00] hover:bg-orange-50 transition-colors"
              >
                作成する
              </button>
            </div>
          </div>
        </div>
      )}

      {!showPlanGateLoader && currentPlan && !showHomePlanForm && (() => {
        const increase = Number(currentPlan.targetFollowerIncrease || 0) > 0
          ? Number(currentPlan.targetFollowerIncrease || 0)
          : Math.max(0, Number(currentPlan.targetFollowers || 0) - Number(currentPlan.currentFollowers || 0));
        const feedDays = sortWeekDays(parseSavedWeekDays(currentPlan.feedDays));
        const reelDays = sortWeekDays(parseSavedWeekDays(currentPlan.reelDays));
        const storyDays = sortWeekDays(parseSavedWeekDays(currentPlan.storyDays));
        const startDateText =
          typeof currentPlan.startDate === "string"
            ? currentPlan.startDate.split("T")[0]
            : currentPlan.startDate instanceof Date
              ? `${currentPlan.startDate.getFullYear()}-${String(currentPlan.startDate.getMonth() + 1).padStart(2, "0")}-${String(currentPlan.startDate.getDate()).padStart(2, "0")}`
              : "未設定";

        return (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span />
            </div>
            <div className="relative overflow-hidden border border-orange-200 bg-white p-5">
              <div className="relative">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[11px] tracking-[0.2em] text-orange-700">PLAN SNAPSHOT</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEditCurrentPlan(currentPlan)}
                      className="px-2 py-1 text-xs border border-orange-300 text-orange-700 bg-white hover:bg-orange-50"
                    >
                      編集する
                    </button>
                  </div>
                </div>

                <div className="mb-4 bg-[#FF8A15] px-4 py-4 text-white shadow-sm">
                  <p className="text-[11px] font-bold text-white">増加目標</p>
                  <p className="mt-1 text-4xl font-semibold leading-none">+{increase.toLocaleString()}</p>
                  <p className="mt-1 text-xs font-bold text-white">followers / month</p>
                </div>

                <div className="space-y-3 text-sm text-gray-800">
                  <div>
                    <p className="text-[11px] text-gray-500 mb-1">投稿頻度</p>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <span className="px-2.5 py-1 bg-orange-50 text-orange-800">
                        フィード {getWeeklyCountLabel(feedDays.length)}
                      </span>
                      <span className="px-2.5 py-1 bg-orange-50 text-orange-800">
                        リール {getWeeklyCountLabel(reelDays.length)}
                      </span>
                      <span className="px-2.5 py-1 bg-orange-50 text-orange-800">
                        ストーリーズ {getWeeklyCountLabel(storyDays.length)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500 mb-1">投稿曜日</p>
                      <div className="space-y-1.5">
                        {[
                          { label: "フィード", days: feedDays },
                          { label: "リール", days: reelDays },
                          { label: "ストーリーズ", days: storyDays },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center gap-2">
                            <span className="w-20 text-gray-600">{item.label}</span>
                            {item.days.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.days.map((day) => (
                                  <span key={`${item.label}-${day}`} className="px-1.5 py-0.5 bg-gray-100 text-gray-700">
                                    {day}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">未設定</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <p><span className="text-gray-500">投稿時間帯</span> {getPostingTimeLabel(currentPlan.postingTime)}</p>
                    <p><span className="text-gray-500">開始日</span> {startDateText}</p>
                    {String(currentPlan.targetAudience || "").trim() && (
                      <p><span className="text-gray-500">ターゲット属性</span> {String(currentPlan.targetAudience)}</p>
                    )}
                    {currentPlan.regionRestriction === "restricted" && String(currentPlan.regionName || "").trim() && (
                      <p><span className="text-gray-500">地域限定</span> {String(currentPlan.regionName)}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {!showPlanGateLoader && showHomePlanForm && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">投稿の目的 *</label>
            <select
              value={quickPlanPurpose}
              onChange={(e) => setQuickPlanPurpose(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 text-sm"
            >
              <option value="認知拡大">認知拡大</option>
              <option value="採用・リクルーティング強化">採用・リクルーティング強化</option>
              <option value="商品・サービスの販売促進">商品・サービスの販売促進</option>
              <option value="ファンを作りたい">ファンを作りたい</option>
              <option value="来店・問い合わせを増やしたい">来店・問い合わせを増やしたい</option>
              <option value="企業イメージ・ブランディング">企業イメージ・ブランディング</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">増加目標フォロワー数</label>
            <input
              type="number"
              min="1"
              value={quickPlanTargetFollowers}
              onChange={(e) => setQuickPlanTargetFollowers(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="例: 15"
              className="w-full px-3 py-2 border border-gray-300 text-sm"
            />
            <p className="mt-1 text-[11px] text-gray-500">現在フォロワー数に加算して目標値を計算します</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">フィード投稿できそうな曜日（複数選択）</label>
            <div className="grid grid-cols-7 gap-1">
              {WEEK_DAYS.map((day) => {
                const active = quickPlanFeedDays.includes(day);
                return (
                  <button
                    key={`feed-day-${day}`}
                    type="button"
                    onClick={() => toggleFeedDay(day)}
                    className={`px-2 py-2 border text-xs transition-colors ${
                      active ? "border-[#FF8A15] bg-orange-50 text-[#FF8A15] font-semibold" : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-gray-500">選択: 週{quickPlanFeedDays.length}回</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">リール投稿できそうな曜日（複数選択）</label>
            <div className="grid grid-cols-7 gap-1">
              {WEEK_DAYS.map((day) => {
                const active = quickPlanReelDays.includes(day);
                return (
                  <button
                    key={`reel-day-${day}`}
                    type="button"
                    onClick={() => toggleReelDay(day)}
                    className={`px-2 py-2 border text-xs transition-colors ${
                      active ? "border-[#FF8A15] bg-orange-50 text-[#FF8A15] font-semibold" : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-gray-500">選択: 週{quickPlanReelDays.length}回</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ストーリーズ投稿できそうな曜日（複数選択）</label>
            <div className="grid grid-cols-7 gap-1">
              {WEEK_DAYS.map((day) => {
                const active = quickPlanStoryDays.includes(day);
                return (
                  <button
                    key={`story-day-${day}`}
                    type="button"
                    onClick={() => toggleStoryDay(day)}
                    className={`px-2 py-2 border text-xs transition-colors ${
                      active ? "border-[#FF8A15] bg-orange-50 text-[#FF8A15] font-semibold" : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-gray-500">選択: 週{quickPlanStoryDays.length}回</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">計画開始日</label>
            <input
              type="date"
              value={quickPlanStartDate}
              onChange={(e) => setQuickPlanStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 text-sm"
            />
          </div>
          <div>
            <button
              type="button"
              onClick={() => setQuickPlanDetailOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 text-sm text-gray-700"
            >
              <span>詳細設定（オプション）</span>
              {quickPlanDetailOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {quickPlanDetailOpen && (
              <div className="mt-2 space-y-3 border border-gray-200 p-3 bg-gray-50">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ターゲット属性</label>
                  <input
                    type="text"
                    value={quickPlanTargetAudience}
                    onChange={(e) => setQuickPlanTargetAudience(e.target.value)}
                    placeholder="例: 30代のママさん"
                    className="w-full px-3 py-2 border border-gray-300 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">投稿時間帯</label>
                  <select
                    value={quickPlanPostingTime}
                    onChange={(e) => setQuickPlanPostingTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 text-sm bg-white"
                  >
                    <option value="">AIに任せる</option>
                    <option value="morning">午前中（9:00〜12:00）</option>
                    <option value="noon">昼（12:00〜15:00）</option>
                    <option value="evening">夕方（15:00〜18:00）</option>
                    <option value="night">夜（18:00〜21:00）</option>
                    <option value="late-night">深夜（21:00〜24:00）</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">地域限定の有無</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name="quickPlanRegionRestriction"
                        value="none"
                        checked={quickPlanRegionRestriction === "none"}
                        onChange={() => {
                          setQuickPlanRegionRestriction("none");
                          setQuickPlanRegionName("");
                        }}
                      />
                      地域は限定しない
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name="quickPlanRegionRestriction"
                        value="restricted"
                        checked={quickPlanRegionRestriction === "restricted"}
                        onChange={() => setQuickPlanRegionRestriction("restricted")}
                      />
                      地域を限定する
                    </label>
                  </div>
                  {quickPlanRegionRestriction === "restricted" && (
                    <input
                      type="text"
                      value={quickPlanRegionName}
                      onChange={(e) => setQuickPlanRegionName(e.target.value)}
                      placeholder="例: 東京都 渋谷区"
                      className="mt-2 w-full px-3 py-2 border border-gray-300 text-sm bg-white"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onCreateQuickPlan}
            disabled={isCreatingQuickPlan}
            className="w-full py-2.5 px-4 bg-[#FF8A15] text-white text-sm font-medium hover:bg-[#e67a0f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isCreatingQuickPlan ? "保存中..." : "計画を立てて保存"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isResetConfirming) {
                setIsResetConfirming(true);
                return;
              }
              onResetHomePlan();
            }}
            disabled={isResettingPlan}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-500 to-red-600 text-white text-sm font-medium hover:from-rose-600 hover:to-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isResettingPlan ? "リセット中..." : isResetConfirming ? "もう一度押してリセット確定" : "計画を完全リセット"}
          </button>
          {isResetConfirming && !isResettingPlan && (
            <button
              type="button"
              onClick={() => setIsResetConfirming(false)}
              className="w-full py-2 text-xs text-gray-600 hover:text-gray-800"
            >
              キャンセル
            </button>
          )}
        </div>
      )}
    </div>
  );
}
