"use client";

import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import type { TimeSlotKPIAnalysis } from "@/domain/analysis/kpi/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface PostingTimeKPIAnalysisProps {
  timeSlotKPIAnalysis: TimeSlotKPIAnalysis[];
  isLoading?: boolean;
}

export const PostingTimeKPIAnalysis: React.FC<PostingTimeKPIAnalysisProps> = ({
  timeSlotKPIAnalysis,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          投稿時間 × KPI分析
        </h3>
        <div className="h-80 flex items-center justify-center">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!timeSlotKPIAnalysis || timeSlotKPIAnalysis.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          投稿時間 × KPI分析
        </h3>
        <div className="h-80 flex items-center justify-center">
          <div className="text-gray-500">データがありません</div>
        </div>
      </div>
    );
  }

  // データを投稿数でフィルタリング（投稿数が0の時間帯は除外）
  const filteredData = timeSlotKPIAnalysis.filter((slot) => slot.postsInRange > 0);

  if (filteredData.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          投稿時間 × KPI分析
        </h3>
        <div className="h-80 flex items-center justify-center">
          <div className="text-gray-500">投稿データがありません</div>
        </div>
      </div>
    );
  }

  const labels = filteredData.map((slot) => slot.label);

  const chartData = {
    labels,
    datasets: [
      {
        label: "平均エンゲージメント率 (%)",
        data: filteredData.map((slot) => Number(slot.avgEngagementRate.toFixed(2))),
        backgroundColor: "rgba(255, 138, 21, 0.6)",
        borderColor: "#FF8A15",
        borderWidth: 2,
        yAxisID: "y",
      },
      {
        label: "平均リーチ",
        data: filteredData.map((slot) => Math.round(slot.avgReach)),
        backgroundColor: "rgba(59, 130, 246, 0.6)",
        borderColor: "#3B82F6",
        borderWidth: 2,
        yAxisID: "y1",
      },
      {
        label: "平均いいね数",
        data: filteredData.map((slot) => Math.round(slot.avgLikes)),
        backgroundColor: "rgba(16, 185, 129, 0.6)",
        borderColor: "#10B981",
        borderWidth: 2,
        yAxisID: "y1",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
        align: "center" as const,
        labels: {
          usePointStyle: true,
          pointStyle: "rect",
          padding: 20,
          font: {
            size: 12,
            weight: "normal" as const,
            family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          },
          color: "#64748B",
          boxWidth: 12,
          boxHeight: 12,
        },
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        padding: {
          top: 10,
          bottom: 10,
          left: 14,
          right: 14,
        },
        titleFont: {
          size: 11,
          weight: "bold" as const,
          family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        },
        bodyFont: {
          size: 13,
          weight: "normal" as const,
          family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        },
        titleColor: "#94A3B8",
        bodyColor: "#F8FAFC",
        borderColor: "rgba(255, 255, 255, 0.08)",
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: true,
        boxPadding: 6,
        callbacks: {
          label: function (context: any) {
            const label = context.dataset.label || "";
            const value = context.parsed.y;
            if (label.includes("エンゲージメント率")) {
              return `${label}: ${value.toFixed(2)}%`;
            }
            return `${label}: ${value.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        title: {
          display: true,
          text: "エンゲージメント率 (%)",
          font: {
            size: 12,
            weight: "normal" as const,
          },
          color: "#64748B",
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 11,
            weight: "normal" as const,
            family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          },
          color: "#94A3B8",
          padding: 10,
          callback: function (value: any) {
            return value + "%";
          },
        },
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        title: {
          display: true,
          text: "リーチ・いいね数",
          font: {
            size: 12,
            weight: "normal" as const,
          },
          color: "#64748B",
        },
        grid: {
          drawOnChartArea: false,
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 11,
            weight: "normal" as const,
            family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          },
          color: "#94A3B8",
          padding: 10,
          callback: function (value: any) {
            return value.toLocaleString();
          },
        },
      },
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 12,
            weight: "normal" as const,
            family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          },
          color: "#64748B",
          padding: 10,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "index" as const,
    },
  };

  // 統計情報を計算
  const totalPosts = filteredData.reduce((sum, slot) => sum + slot.postsInRange, 0);
  const bestTimeSlot = filteredData.reduce((best, slot) => {
    if (slot.avgEngagementRate > best.avgEngagementRate) {
      return slot;
    }
    return best;
  }, filteredData[0]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        投稿時間 × KPI分析
      </h3>
      
      {/* 統計サマリー */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-600 mb-1">総投稿数</div>
            <div className="text-lg font-semibold text-gray-900">{totalPosts.toLocaleString()}件</div>
          </div>
          <div>
            <div className="text-gray-600 mb-1">最適な投稿時間帯</div>
            <div className="text-lg font-semibold text-[#FF8A15]">{bestTimeSlot.label}</div>
          </div>
          <div>
            <div className="text-gray-600 mb-1">最高エンゲージメント率</div>
            <div className="text-lg font-semibold text-gray-900">
              {bestTimeSlot.avgEngagementRate.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* グラフ */}
      <div className="h-80 w-full">
        <Bar data={chartData} options={chartOptions} />
      </div>

      {/* 詳細テーブル */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-semibold text-gray-700">時間帯</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-700">投稿数</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-700">平均エンゲージメント率</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-700">平均リーチ</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-700">平均いいね数</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-700">平均コメント数</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-700">平均保存数</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((slot, index) => (
              <tr
                key={index}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-2 px-3 text-gray-900">{slot.label}</td>
                <td className="py-2 px-3 text-right text-gray-700">
                  {slot.postsInRange.toLocaleString()}件
                </td>
                <td className="py-2 px-3 text-right text-gray-700">
                  {slot.avgEngagementRate.toFixed(2)}%
                </td>
                <td className="py-2 px-3 text-right text-gray-700">
                  {Math.round(slot.avgReach).toLocaleString()}
                </td>
                <td className="py-2 px-3 text-right text-gray-700">
                  {Math.round(slot.avgLikes).toLocaleString()}
                </td>
                <td className="py-2 px-3 text-right text-gray-700">
                  {Math.round(slot.avgComments).toLocaleString()}
                </td>
                <td className="py-2 px-3 text-right text-gray-700">
                  {Math.round(slot.avgSaves).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

