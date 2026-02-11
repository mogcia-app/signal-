"use client";

import React from "react";

interface PostEditorScheduleSettingsProps {
  scheduledDate: string;
  onScheduledDateChange: (date: string) => void;
  scheduledTime: string;
  onScheduledTimeChange: (time: string) => void;
}

export const PostEditorScheduleSettings: React.FC<PostEditorScheduleSettingsProps> = ({
  scheduledDate,
  onScheduledDateChange,
  scheduledTime,
  onScheduledTimeChange,
}) => {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-3">投稿設定</label>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-black mb-1">投稿日</label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => onScheduledDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 bg-white focus:outline-none focus:border-[#ff8a15] text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-black mb-1">投稿時間</label>
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => onScheduledTimeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 bg-white focus:outline-none focus:border-[#ff8a15] text-sm"
          />
        </div>
      </div>
    </div>
  );
};
















