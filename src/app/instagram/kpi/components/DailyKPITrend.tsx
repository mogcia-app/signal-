"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, Loader2 } from "lucide-react";
import type { DailyKPI } from "@/domain/analysis/kpi/types";

interface DailyKPITrendProps {
  dailyKPIs: DailyKPI[];
  isLoading?: boolean;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white text-xs px-3 py-2 border border-gray-700">
        <div className="font-medium text-blue-300 mb-1">{label}</div>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span>
              {entry.name}: {entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const DailyKPITrend: React.FC<DailyKPITrendProps> = ({
  dailyKPIs,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-[#FF8A15] mr-2" />
          <span className="text-sm text-gray-700">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (!dailyKPIs || dailyKPIs.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">日別KPIデータがありません</p>
        </div>
      </div>
    );
  }

  // データをフィルタリング（値が0の日を除外して見やすくする）
  const filteredData = dailyKPIs.filter(
    (d) => d.likes > 0 || d.reach > 0 || d.saves > 0 || d.comments > 0
  );

  if (filteredData.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">今月のKPIデータがありません</p>
        </div>
      </div>
    );
  }

  // X軸の表示間隔を計算（最大7-8個のラベルに調整）
  const maxLabels = 7;
  const interval = Math.max(0, Math.floor((filteredData.length - 1) / (maxLabels - 1)));

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-[#ff8a15] flex items-center justify-center mr-3 flex-shrink-0">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">日別KPI推移</h2>
          <p className="text-sm text-gray-700 mt-0.5">
            月内の日別KPI推移を可視化します
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="h-56 sm:h-64 md:h-80 w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height="100%" minWidth={300}>
            <AreaChart
              data={filteredData}
              margin={{
                top: 10,
                right: 10,
                left: -10,
                bottom: filteredData.length > 14 ? 60 : 30,
              }}
            >
              <defs>
                <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                stroke="#6b7280"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval={interval}
                angle={filteredData.length > 14 ? -45 : 0}
                textAnchor={filteredData.length > 14 ? "end" : "middle"}
                height={filteredData.length > 14 ? 60 : 30}
                tick={{ fontSize: 10 }}
                aria-label="日付"
              />
              <YAxis
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  if (value >= 1000) {return `${(value / 1000).toFixed(1)}k`;}
                  return value.toString();
                }}
                aria-label="値"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="reach"
                stackId="1"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorReach)"
                name="リーチ"
              />
              <Area
                type="monotone"
                dataKey="engagement"
                stackId="1"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#colorEngagement)"
                name="エンゲージメント"
              />
              <Area
                type="monotone"
                dataKey="likes"
                stackId="1"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorLikes)"
                name="いいね"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

