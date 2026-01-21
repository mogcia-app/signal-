"use client";

import React from "react";
import { ShieldAlert, AlertTriangle, Info } from "lucide-react";

interface RiskDetectionProps {
  selectedMonth: string;
  kpis?: {
    totalLikes: number;
    totalReach: number;
    totalSaves: number;
    totalComments: number;
    totalFollowerIncrease: number;
  } | null;
  reportData?: Record<string, unknown> | null;
}

interface RiskAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  metric: string;
  message: string;
  change?: number;
  value?: number;
}

const severityConfig = {
  critical: {
    border: "border-red-300",
    bg: "bg-red-50",
    text: "text-red-800",
    icon: <ShieldAlert className="w-5 h-5 text-red-600" />,
    label: "高リスク",
  },
  warning: {
    border: "border-yellow-300",
    bg: "bg-yellow-50",
    text: "text-yellow-800",
    icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
    label: "注意",
  },
  info: {
    border: "border-blue-300",
    bg: "bg-blue-50",
    text: "text-blue-800",
    icon: <Info className="w-5 h-5 text-blue-600" />,
    label: "情報",
  },
} as const;

export const RiskDetection: React.FC<RiskDetectionProps> = ({ selectedMonth, kpis, reportData }) => {
  // reportDataからリスクアラートを取得
  const alerts: RiskAlert[] = reportData?.riskAlerts || [];

  return (
    <div className="bg-white border border-gray-200 p-3 sm:p-4 mb-4">
      {/* ヘッダー */}
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#ff8a15] flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
          <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">リスク・異常検知</h2>
          <p className="text-xs text-gray-600 mt-0.5">
            数値の急変やリスクを検知した場合に表示します
          </p>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="mt-4 pt-4 border-t border-gray-200">
          {alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.map((alert) => {
                const config = severityConfig[alert.severity];
                return (
                  <div
                    key={alert.id}
                    className={`border-2 ${config.border} ${config.bg} p-3 sm:p-4`}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center space-x-2 flex-1">
                        <span className="inline-flex items-center space-x-1.5 px-2 py-1 bg-white border border-gray-200 text-xs font-semibold text-gray-700">
                          {config.icon}
                          <span>{config.label}</span>
                        </span>
                        <span className="text-xs font-medium text-gray-700">{alert.metric}</span>
                      </div>
                    </div>
                    <p className={`text-xs ${config.text} mt-1.5 leading-relaxed`}>{alert.message}</p>
                    {(typeof alert.change === "number" || typeof alert.value === "number") && (
                      <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">
                        {typeof alert.change === "number"
                          ? `前月比: ${alert.change > 0 ? "+" : ""}${alert.change.toFixed(1)}%`
                          : `現在値: ${alert.value?.toFixed(1)}`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShieldAlert className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1.5">リスクは検知されませんでした</p>
              <p className="text-xs text-gray-600">リスクがあればここに表示します。</p>
            </div>
          )}
      </div>
    </div>
  );
};

