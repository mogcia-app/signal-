"use client";

import React from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface ReelAnalyticsFeedbackProps {
  sentiment: "satisfied" | "dissatisfied" | null;
  onSentimentChange: (sentiment: "satisfied" | "dissatisfied" | null) => void;
  memo: string;
  onMemoChange: (memo: string) => void;
}

export const ReelAnalyticsFeedback: React.FC<ReelAnalyticsFeedbackProps> = ({
  sentiment,
  onSentimentChange,
  memo,
  onMemoChange,
}) => {
  return (
    <div className="p-4 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">フィードバック</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            この投稿の結果に満足していますか？
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onSentimentChange("satisfied")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all ${
                sentiment === "satisfied"
                  ? "bg-green-50 border-green-500 text-green-700"
                  : "bg-white border-gray-300 text-gray-700 hover:border-green-300 hover:bg-green-50"
              }`}
            >
              <ThumbsUp size={18} />
              <span>満足</span>
            </button>
            <button
              type="button"
              onClick={() => onSentimentChange("dissatisfied")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all ${
                sentiment === "dissatisfied"
                  ? "bg-red-50 border-red-500 text-red-700"
                  : "bg-white border-gray-300 text-gray-700 hover:border-red-300 hover:bg-red-50"
              }`}
            >
              <ThumbsDown size={18} />
              <span>不満足</span>
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            メモ（オプション）
          </label>
          <textarea
            value={memo}
            onChange={(e) => onMemoChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
            placeholder="この投稿についてのメモや気づきを記録してください"
          />
        </div>
      </div>
    </div>
  );
};

















