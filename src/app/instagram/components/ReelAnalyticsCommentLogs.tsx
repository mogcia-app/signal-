"use client";

import React from "react";
import { MessageCircle, Plus, Trash2 } from "lucide-react";
import { InputData } from "./types";

interface ReelAnalyticsCommentLogsProps {
  data: InputData;
  onCommentThreadChange: (index: number, field: "comment" | "reply", value: string) => void;
  onAddCommentThread: () => void;
  onRemoveCommentThread: (index: number) => void;
}

export const ReelAnalyticsCommentLogs: React.FC<ReelAnalyticsCommentLogsProps> = ({
  data,
  onCommentThreadChange,
  onAddCommentThread,
  onRemoveCommentThread,
}) => {
  return (
    <div className="p-4 border-t border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-[#ff8a15]" />
          コメントと返信ログ
        </h3>
        <button
          type="button"
          onClick={onAddCommentThread}
          className="inline-flex items-center text-xs font-semibold text-[#ff8a15] hover:text-[#e6760f] transition-colors"
        >
          <Plus className="w-4 h-4 mr-1" />
          コメントを追加
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        受け取ったコメント内容と返信内容を記録すると、AIが顧客との会話傾向を学習しやすくなります。
      </p>

      {data.commentThreads && data.commentThreads.length > 0 ? (
        <div className="space-y-3">
          {data.commentThreads.map((thread, index) => (
            <div key={`comment-thread-${index}`} className="border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">コメント内容</label>
                <textarea
                  value={thread.comment}
                  onChange={(e) => onCommentThreadChange(index, "comment", e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
                  placeholder="ユーザーからのコメント内容を入力"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">返信内容・フォロー対応メモ</label>
                <textarea
                  value={thread.reply}
                  onChange={(e) => onCommentThreadChange(index, "reply", e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
                  placeholder="返信した内容やフォローアップのポイントを入力"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onRemoveCommentThread(index)}
                  className="inline-flex items-center text-xs text-gray-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500">
          まだコメントログはありません。右上の「コメントを追加」から記録を始めましょう。
        </p>
      )}
    </div>
  );
};



















