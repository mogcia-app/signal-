"use client";

import { SkeletonLoader } from "../../../components/ui/SkeletonLoader";
import type { TimelineRowViewModel } from "../lib/timeline-view";
import type { EditableTimelineItem } from "../types";

interface TimelineEditDraft {
  dateIso: string;
  type: "feed" | "reel" | "story";
}

interface WeeklyPlansSectionProps {
  showWeeklyGateLoader: boolean;
  weeklyGateProgress: number;
  renderGateLoader: (params: {
    message: string;
    subMessage: string;
    progress: number;
  }) => React.ReactNode;
  timelineTotalCount: number;
  isLoadingWeeklyPlans: boolean;
  rollingTimelineRows: TimelineRowViewModel[];
  generatingTimelinePostKey: string | null;
  editingTimelineKey: string | null;
  timelineEditDraft: TimelineEditDraft;
  setTimelineEditDraft: React.Dispatch<React.SetStateAction<TimelineEditDraft>>;
  setEditingTimelineKey: React.Dispatch<React.SetStateAction<string | null>>;
  getDirectionLabel: (value: string) => string;
  getShortGuideText: (value: string, type: "feed" | "reel" | "story") => string;
  getTimelineTypeBadgeClass: (type: "feed" | "reel" | "story") => string;
  getTimelineTypeLabel: (type: "feed" | "reel" | "story") => string;
  handleStartEditTimeline: (item: EditableTimelineItem) => void;
  handleGeneratePostFromTimelineItem: (item: EditableTimelineItem) => void;
  handleApplyTimelineEdit: (itemKey: string) => Promise<void>;
}

export function WeeklyPlansSection({
  showWeeklyGateLoader,
  weeklyGateProgress,
  renderGateLoader,
  timelineTotalCount,
  isLoadingWeeklyPlans,
  rollingTimelineRows,
  generatingTimelinePostKey,
  editingTimelineKey,
  timelineEditDraft,
  setTimelineEditDraft,
  setEditingTimelineKey,
  getDirectionLabel,
  getShortGuideText,
  getTimelineTypeBadgeClass,
  getTimelineTypeLabel,
  handleStartEditTimeline,
  handleGeneratePostFromTimelineItem,
  handleApplyTimelineEdit,
}: WeeklyPlansSectionProps) {
  return (
    <div className="bg-white border border-gray-200 p-6">
      {showWeeklyGateLoader ? (
        renderGateLoader({
          message: "週次計画を生成中です。",
          subMessage: "今後5日間の予定を準備しています。",
          progress: weeklyGateProgress,
        })
      ) : (
        <>
          <div className="mb-4 border border-orange-500 bg-gradient-to-r from-[#FF8A15] to-orange-500 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[11px] tracking-[0.08em] text-orange-100">UPCOMING 5 DAYS</h2>
                <p className="text-base font-semibold text-white">今後5日間の投稿予定</p>
              </div>
              <p className="text-base font-semibold text-white">{timelineTotalCount}件</p>
            </div>
          </div>
          {isLoadingWeeklyPlans ? (
            <div className="space-y-3">
              <SkeletonLoader height="1rem" width="100%" />
              <SkeletonLoader height="1rem" width="90%" />
              <SkeletonLoader height="1rem" width="80%" />
            </div>
          ) : timelineTotalCount > 0 ? (
            <div className="space-y-3">
              {rollingTimelineRows.map((row, idx) => (
                <div
                  key={`timeline-row-${row.dateIso}-${idx}`}
                  className={`border ${row.isToday ? "border-orange-300 bg-orange-50/30" : "border-gray-200 bg-white"}`}
                >
                  <div className="grid grid-cols-[62px_1fr]">
                    <div className="border-r border-gray-200 px-2 py-3 text-center bg-gray-50/60">
                      <p className={`text-base font-semibold leading-none ${row.isToday ? "text-orange-700" : "text-gray-700"}`}>
                        {row.dateLabel}
                      </p>
                      <p className="text-[11px] text-gray-500">{row.dayLabel}</p>
                      <p className="text-[10px] text-orange-700 font-medium">{row.isToday ? "TODAY" : ""}</p>
                    </div>
                    <div className="px-3 py-3 space-y-2">
                      {row.items.length > 0 ? (
                        row.items.map((item) => (
                          <div key={item.key} className="border border-gray-200 bg-white px-3 py-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900">{item.time}</p>
                                <p className="mt-0.5 text-xs text-gray-700">
                                  {getDirectionLabel(item.direction || item.label)}
                                </p>
                                <p className="mt-1 text-[11px] text-gray-500">
                                  {getShortGuideText(item.direction || item.label, item.type)}
                                </p>
                                {String(item.hook || "").trim() && (
                                  <p className="mt-1 text-xs text-orange-700 line-clamp-1">
                                    冒頭フック: {String(item.hook).trim()}
                                  </p>
                                )}
                              </div>
                              <span className={`text-[10px] border px-2 py-0.5 whitespace-nowrap ${getTimelineTypeBadgeClass(item.type)}`}>
                                {getTimelineTypeLabel(item.type)}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleStartEditTimeline(item)}
                                className="px-2 py-1 text-[11px] border border-gray-300 text-gray-700 hover:bg-gray-50"
                              >
                                変更
                              </button>
                              <button
                                type="button"
                                onClick={() => handleGeneratePostFromTimelineItem(item)}
                                disabled={generatingTimelinePostKey === item.key}
                                className="px-2 py-1 text-[11px] bg-[#FF8A15] text-white hover:bg-[#e67a0f] disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {generatingTimelinePostKey === item.key ? "生成中..." : "投稿文生成"}
                              </button>
                            </div>
                            {editingTimelineKey === item.key && (
                              <div className="mt-2 border border-gray-200 bg-gray-50 p-2 space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input
                                    type="date"
                                    value={timelineEditDraft.dateIso}
                                    onChange={(e) =>
                                      setTimelineEditDraft((prev) => ({
                                        ...prev,
                                        dateIso: e.target.value,
                                      }))
                                    }
                                    className="w-full px-2 py-1.5 border border-gray-300 text-xs bg-white"
                                  />
                                  <select
                                    value={timelineEditDraft.type}
                                    onChange={(e) =>
                                      setTimelineEditDraft((prev) => ({
                                        ...prev,
                                        type: e.target.value as "feed" | "reel" | "story",
                                      }))
                                    }
                                    className="w-full px-2 py-1.5 border border-gray-300 text-xs bg-white"
                                  >
                                    <option value="feed">フィード</option>
                                    <option value="reel">リール</option>
                                    <option value="story">ストーリーズ</option>
                                  </select>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleApplyTimelineEdit(item.key);
                                    }}
                                    className="px-2 py-1 text-[11px] bg-[#FF8A15] text-white hover:bg-[#e67a0f]"
                                  >
                                    適用
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingTimelineKey(null)}
                                    className="px-2 py-1 text-[11px] border border-gray-300 text-gray-700 hover:bg-white"
                                  >
                                    キャンセル
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 py-1">予定なし</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">予定が入るとここに表示されます</p>
          )}
        </>
      )}
    </div>
  );
}
