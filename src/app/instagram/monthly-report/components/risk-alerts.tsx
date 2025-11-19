"use client";

import React from "react";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { AIAnalysisAlert } from "./AIPredictionAnalysis";

interface RiskAlertsProps {
  alerts: AIAnalysisAlert[];
}

const severityConfig = {
  critical: {
    border: "border-red-200",
    bg: "bg-red-50",
    text: "text-red-700",
    icon: <ShieldAlert className="w-5 h-5 text-red-600" />,
    label: "高リスク",
  },
  warning: {
    border: "border-yellow-200",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
    label: "注意",
  },
  info: {
    border: "border-blue-200",
    bg: "bg-blue-50",
    text: "text-blue-700",
    icon: <Info className="w-5 h-5 text-blue-600" />,
    label: "情報",
  },
} as const;

export const RiskAlerts: React.FC<RiskAlertsProps> = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-none shadow-sm border border-gray-200 p-6 mb-6 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-black">リスク・異常検知</h2>
          <p className="text-sm text-gray-600">
            数値の急変やリスクを検知した場合にここへ表示します。
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const config = severityConfig[alert.severity];
          return (
            <div
              key={alert.id}
              className={`rounded-none border ${config.border} ${config.bg} p-4`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center space-x-2 px-2 py-1 bg-white border border-gray-200 rounded-none text-xs font-semibold text-gray-700">
                    {config.icon}
                    <span>{config.label}</span>
                  </span>
                  <span
                    className="text-xs text-gray-500"
                    dangerouslySetInnerHTML={{
                      __html: String(alert.metric || ""),
                    }}
                  />
                </div>
              </div>
              <p
                className={`text-sm ${config.text}`}
                dangerouslySetInnerHTML={{
                  __html: String(alert.message || ""),
                }}
              />
              {(typeof alert.change === "number" || typeof alert.value === "number") && (
                <p className="text-xs text-gray-600 mt-2">
                  {typeof alert.change === "number"
                    ? `前期間比: ${alert.change > 0 ? "+" : ""}${alert.change.toFixed(1)}%`
                    : `現在値: ${alert.value?.toFixed(1)}`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

