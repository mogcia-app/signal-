"use client";

import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { calculateAIPredictionWeekly, calculateTargetWeeklyPredictions } from "../utils/followerGrowth";

// Chart.jsの設定
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface WeeklyFollowerPredictionChartProps {
  currentFollowers: number;
  targetFollowers: number;
  periodMonths: number;
  aiSuggestedTarget?: number; // AIが自動提案した目標フォロワー数
}

/**
 * 週次フォロワー増加予測グラフコンポーネント
 * 
 * 表示内容:
 * - 目標フォロワー数: ユーザーが入力した目標に基づく線形予測（オレンジ）
 * - AI予想推移: 月間成長率0.8%に基づくAI予測（グレー）
 * 
 * ロジック:
 * - 自動提案のままシミュレーションした場合、両線は同じ伸び方になる
 * - 自動提案から編集した場合、差異がグラフで見える
 */
export const WeeklyFollowerPredictionChart: React.FC<WeeklyFollowerPredictionChartProps> = ({
  currentFollowers,
  targetFollowers,
  periodMonths,
  aiSuggestedTarget,
}) => {
  // AI予想推移を計算（月間成長率0.8%）
  const aiPredictions = calculateAIPredictionWeekly(
    currentFollowers,
    aiSuggestedTarget || targetFollowers,
    periodMonths
  );

  // 目標フォロワー数に基づく予測を計算（線形予測）
  const targetPredictions = calculateTargetWeeklyPredictions(
    currentFollowers,
    targetFollowers,
    periodMonths
  );

  // ラベルを生成（週数）
  const labels = aiPredictions.map((_, index) => {
    if (index === 0) return "開始";
    return `第${index}週`;
  });

  // グラフデータを準備
  const chartData = {
    labels,
    datasets: [
      {
        label: "目標フォロワー数",
        data: targetPredictions.map((p) => p.followers),
        borderColor: "#F97316",
        backgroundColor: "rgba(249, 115, 22, 0.08)",
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: "#F97316",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        borderWidth: 2,
      },
      {
        label: "AI予想推移",
        data: aiPredictions.map((p) => p.followers),
        borderColor: "#CBD5E1",
        backgroundColor: "transparent",
        tension: 0.4,
        fill: false,
        borderDash: [8, 4],
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 1.5,
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
        align: "end" as const,
        labels: {
          usePointStyle: false,
          padding: 16,
          font: {
            size: 12,
            weight: "normal" as const,
            family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          },
          color: "#64748B",
          boxWidth: 8,
          boxHeight: 8,
          generateLabels: function (chart: any) {
            const original = ChartJS.defaults.plugins.legend.labels.generateLabels;
            const labels = original.call(this, chart);
            return labels.map((label: any) => {
              label.fillStyle = label.strokeStyle;
              label.lineWidth = 0;
              return label;
            });
          },
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
            return `${context.parsed.y.toLocaleString()}人`;
          },
          labelColor: function (context: any) {
            return {
              borderColor: context.dataset.borderColor,
              backgroundColor: context.dataset.borderColor,
              borderWidth: 2,
            };
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: "rgba(0, 0, 0, 0.04)",
          drawBorder: false,
          lineWidth: 1,
        },
        ticks: {
          font: {
            size: 11,
            weight: "normal" as const,
            family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          },
          color: "#94A3B8",
          padding: 12,
          callback: function (value: any) {
            return value.toLocaleString() + "人";
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
            size: 11,
            weight: "normal" as const,
            family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          },
          color: "#94A3B8",
          padding: 12,
          maxRotation: 0,
          minRotation: 0,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "index" as const,
    },
  };

  return (
    <div className="w-full">
      <div className="h-80 w-full -mx-1">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

