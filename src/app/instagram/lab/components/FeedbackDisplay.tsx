/**
 * フィードバック表示コンポーネント
 */

import React from "react";
import { AlertTriangle } from "lucide-react";

interface FeedbackDisplayProps {
  feedback: string | null;
  showAdminWarning?: boolean;
}

export function FeedbackDisplay({ feedback, showAdminWarning = false }: FeedbackDisplayProps) {
  if (!feedback) return null;

  return (
    <div className="mb-4">
      <div
        className={`flex items-start gap-2 p-3 rounded-lg ${
          showAdminWarning
            ? "bg-red-50 border border-red-200"
            : "bg-yellow-50 border border-yellow-200"
        }`}
      >
        <AlertTriangle
          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            showAdminWarning ? "text-red-600" : "text-yellow-600"
          }`}
        />
        <div className="flex-1">
          <p
            className={`text-sm ${
              showAdminWarning ? "text-red-800" : "text-yellow-800"
            }`}
          >
            {feedback}
          </p>
          {showAdminWarning && (
            <p className="text-xs text-red-700 mt-1 font-medium">
              ⚠️ 管理者向け警告: 同じ問題が3回以上連続して発生しています。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

