"use client";

import React, { useState } from "react";
import { AlertTriangle, X, ChevronRight } from "lucide-react";

interface PlanReviewReason {
  type: "slow-progress" | "low-posting" | "low-engagement";
  severity: "warning" | "critical";
  message: string;
  recommendation: string;
}

interface PlanReviewBannerProps {
  reasons: PlanReviewReason[];
  onReview: () => void;
  onDismiss: () => void;
}

export const PlanReviewBanner: React.FC<PlanReviewBannerProps> = ({
  reasons,
  onReview,
  onDismiss,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (reasons.length === 0) {return null;}

  const criticalReasons = reasons.filter((r) => r.severity === "critical");
  const hasCritical = criticalReasons.length > 0;
  const primaryReason = hasCritical ? criticalReasons[0] : reasons[0];

  return (
    <div
      className={`rounded-lg border p-6 ${
        hasCritical
          ? "bg-red-50 border-red-200"
          : "bg-yellow-50 border-yellow-200"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle
              className={`w-5 h-5 ${
                hasCritical ? "text-red-600" : "text-yellow-600"
              }`}
            />
            <h3
              className={`text-sm font-medium ${
                hasCritical ? "text-red-900" : "text-yellow-900"
              }`}
            >
              {hasCritical
                ? "⚠️ 計画を見直しましょう"
                : "⚠️ 計画を見直すことをおすすめします"}
            </h3>
          </div>
          <p
            className={`text-sm font-light mb-2 ${
              hasCritical ? "text-red-700" : "text-yellow-700"
            }`}
          >
            {primaryReason.message}
          </p>
          <p
            className={`text-xs font-light mb-4 ${
              hasCritical ? "text-red-600" : "text-yellow-600"
            }`}
          >
            💡 {primaryReason.recommendation}
          </p>
          {reasons.length > 1 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`text-xs font-light underline mb-2 ${
                hasCritical ? "text-red-600" : "text-yellow-600"
              }`}
            >
              {isExpanded ? "詳細を閉じる" : `他${reasons.length - 1}件の理由を見る`}
            </button>
          )}
          {isExpanded && (
            <div className="space-y-2 mt-2">
              {reasons.slice(1).map((reason, index) => (
                <div
                  key={index}
                  className={`text-xs font-light p-2 rounded ${
                    reason.severity === "critical"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  <p className="mb-1">{reason.message}</p>
                  <p className="text-xs opacity-80">💡 {reason.recommendation}</p>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={onReview}
            className={`mt-4 px-4 py-2 rounded-md text-sm font-light transition-colors flex items-center gap-2 ${
              hasCritical
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-yellow-600 text-white hover:bg-yellow-700"
            }`}
          >
            計画を見直す
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onDismiss}
          className={`ml-4 ${
            hasCritical ? "text-red-600 hover:text-red-700" : "text-yellow-600 hover:text-yellow-700"
          } transition-colors`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
























