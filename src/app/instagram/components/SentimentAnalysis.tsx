"use client";

import React, { useState } from "react";
import { Heart, MessageSquare, ThumbsUp, ThumbsDown, Edit3, Save } from "lucide-react";

interface SentimentAnalysisProps {
  onSentimentChange?: (sentiment: "satisfied" | "dissatisfied" | null, memo: string) => void;
}

export default function SentimentAnalysis({ onSentimentChange }: SentimentAnalysisProps) {
  const [sentiment, setSentiment] = useState<"satisfied" | "dissatisfied" | null>(null);
  const [memo, setMemo] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const handleSentimentClick = (selectedSentiment: "satisfied" | "dissatisfied") => {
    setSentiment(selectedSentiment);
    onSentimentChange?.(selectedSentiment, memo);
  };

  const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMemo(e.target.value);
    onSentimentChange?.(sentiment, e.target.value);
  };

  const handleSaveMemo = () => {
    setIsEditing(false);
    onSentimentChange?.(sentiment, memo);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <Heart className="h-5 w-5 text-pink-600 mr-2" />
        <h3 className="text-lg font-semibold text-black">分析結果の感想</h3>
      </div>

      <div className="space-y-4">
        {/* 感情選択 */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">この分析結果に満足していますか？</p>
          <div className="flex space-x-4">
            <button
              onClick={() => handleSentimentClick("satisfied")}
              className={`flex items-center px-4 py-2 rounded-lg border-2 transition-all ${
                sentiment === "satisfied"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-200 hover:border-green-300 hover:bg-green-50"
              }`}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">満足</span>
            </button>

            <button
              onClick={() => handleSentimentClick("dissatisfied")}
              className={`flex items-center px-4 py-2 rounded-lg border-2 transition-all ${
                sentiment === "dissatisfied"
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-gray-200 hover:border-red-300 hover:bg-red-50"
              }`}
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">不満</span>
            </button>
          </div>
        </div>

        {/* メモ入力 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">改善点や気づき</p>
            {!isEditing && memo && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={memo}
                onChange={handleMemoChange}
                placeholder="改善点や気づいたことをメモしてください..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-sm text-black hover:text-gray-800"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveMemo}
                  className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Save className="h-3 w-3 mr-1" />
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setIsEditing(true)}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                memo
                  ? "border-gray-300 bg-gray-50 hover:bg-gray-100"
                  : "border-dashed border-gray-300 hover:border-gray-400"
              }`}
            >
              {memo ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{memo}</p>
              ) : (
                <p className="text-sm text-black">改善点や気づいたことをメモしてください...</p>
              )}
            </div>
          )}
        </div>

        {/* 統計表示 */}
        {sentiment && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center text-sm text-black">
              <MessageSquare className="h-4 w-4 mr-2" />
              <span>
                {sentiment === "satisfied" ? "満足" : "不満"}として記録されました
                {memo && " - メモも保存済み"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
