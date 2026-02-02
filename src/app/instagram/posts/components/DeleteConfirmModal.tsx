/**
 * 削除確認モーダルコンポーネント
 */

import React from "react";

interface DeleteConfirmModalProps {
  type: "post" | "analytics";
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ type, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {type === "post" ? "投稿を削除" : "分析データを削除"}
        </h3>
        <p className="text-gray-700 mb-6">
          {type === "post"
            ? "この投稿を削除しますか？この操作は取り消せません。"
            : "この分析データを削除しますか？この操作は取り消せません。"}
        </p>
        <div className="flex space-x-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
          >
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}

