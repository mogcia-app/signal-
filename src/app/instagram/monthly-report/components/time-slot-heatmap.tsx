"use client";

import React, { useMemo } from "react";
import { Grid3x3 } from "lucide-react";

type TimeSlotEntry = {
  label: string;
  range: number[];
  color: string;
  postsInRange: number;
  avgEngagement: number;
  postTypes?: Array<{
    type: "feed" | "reel" | "story";
    count: number;
    avgEngagement: number;
  }>;
};

interface TimeSlotHeatmapProps {
  data?: TimeSlotEntry[];
}

const postTypeMeta: Record<
  "feed" | "reel",
  { label: string; badge: string }
> = {
  feed: { label: "フィード", badge: "bg-blue-50 text-blue-700 border border-blue-200" },
  reel: { label: "リール", badge: "bg-purple-50 text-purple-700 border border-purple-200" },
};

export function TimeSlotHeatmap({ data }: TimeSlotHeatmapProps) {
  const slotData = data ?? [];
  const maxEngagement = useMemo(() => {
    let max = 0;
    slotData.forEach((slot) => {
      slot.postTypes?.forEach((entry) => {
        if (entry.avgEngagement > max) {
          max = entry.avgEngagement;
        }
      });
    });
    return max || 1;
  }, [slotData]);

  if (slotData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0 shadow-sm">
            <Grid3x3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">時間帯 × コンテンツタイプ</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              どの時間帯・投稿タイプが最もエンゲージメントを獲得したかを可視化します
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          まだ十分な投稿データがないため、ヒートマップを表示できません。
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0 shadow-sm">
          <Grid3x3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">時間帯 × コンテンツタイプ</h2>
          <p className="text-xs text-gray-600 mt-0.5">
            どの時間帯・投稿タイプが最もエンゲージメントを獲得したかを可視化します
          </p>
        </div>
      </div>
      <div className="mb-3">
        <p className="text-[10px] text-gray-500">
          「平均ER」は Signal 独自指標で、各投稿の「いいね + コメント + シェア」を合算した平均値です。
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="text-slate-500">
              <th className="text-left px-3 py-2 font-semibold">時間帯</th>
              {Object.entries(postTypeMeta).map(([key, meta]) => (
                <th key={key} className="text-left px-3 py-2 font-semibold">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${meta.badge}`}
                    dangerouslySetInnerHTML={{
                      __html: String(meta.label || ""),
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slotData.map((slot) => (
              <tr key={slot.label} className="border-t border-slate-100">
                <td className="px-3 py-3 align-top">
                  <p
                    className="text-sm font-semibold text-slate-900"
                    dangerouslySetInnerHTML={{
                      __html: String(slot.label || ""),
                    }}
                  />
                  <p className="text-[11px] text-slate-500">
                    投稿数 {slot.postsInRange} / 平均ER {(slot.avgEngagement || 0).toFixed(1)} pt
                  </p>
                </td>
                {Object.keys(postTypeMeta).map((type) => {
                  const entry =
                    slot.postTypes?.find((postType) => postType.type === type) ?? undefined;
                  const intensity =
                    entry && maxEngagement > 0
                      ? Math.min(entry.avgEngagement / maxEngagement, 1)
                      : 0;
                  const bgColor = `rgba(251, 113, 133, ${intensity * 0.7 + 0.1})`;
                  return (
                    <td key={`${slot.label}-${type}`} className="px-3 py-3">
                      <div
                        className="rounded-md border border-slate-200 p-3 h-full"
                        style={{ backgroundColor: intensity > 0 ? bgColor : undefined }}
                      >
                        <p className="text-[11px] text-slate-500 mb-1">投稿数</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {entry?.count ?? 0}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-2 mb-1">平均ER(pt)</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {entry ? entry.avgEngagement.toFixed(1) : "-"}
                        </p>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

