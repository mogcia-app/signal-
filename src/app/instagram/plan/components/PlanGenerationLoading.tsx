"use client";

import React, { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { PlanFormData } from "../types/plan";

interface PlanGenerationLoadingProps {
  formData: PlanFormData;
  onComplete: () => void;
}

type ProcessingStep = {
  id: string;
  label: string;
  status: "completed" | "processing" | "pending";
  startTime?: number;
  endTime?: number;
};

// 投稿頻度に基づいてAI生成時間を計算
const calculateEstimatedTime = (formData: PlanFormData): number => {
  const totalWeeklyPosts = formData.weeklyFeedPosts + formData.weeklyReelPosts + formData.weeklyStoryPosts;
  
  // 基準: 週2回投稿 = 33秒、毎日投稿（週21回） = 75秒
  // 線形補間で計算
  const minPosts = 2;
  const maxPosts = 21; // 毎日投稿（フィード7 + リール7 + ストーリー7）
  const minTime = 33; // 秒
  const maxTime = 75; // 秒
  
  if (totalWeeklyPosts <= minPosts) {
    return minTime;
  }
  if (totalWeeklyPosts >= maxPosts) {
    return maxTime;
  }
  
  // 線形補間
  const ratio = (totalWeeklyPosts - minPosts) / (maxPosts - minPosts);
  return Math.round(minTime + (maxTime - minTime) * ratio);
};

export const PlanGenerationLoading: React.FC<PlanGenerationLoadingProps> = ({
  formData,
  onComplete,
}) => {
  const estimatedTime = calculateEstimatedTime(formData);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: "analyze", label: "目標の分析", status: "pending" },
    { id: "industry", label: "業界平均の参照", status: "pending" },
    { id: "frequency", label: "投稿頻度の最適化", status: "pending" },
    { id: "weekly", label: "週次計画の生成", status: "pending" },
    { id: "monthly", label: "月次戦略の生成", status: "pending" },
  ]);

  // プログレスバーの進捗から残り時間を計算
  const remainingSeconds = Math.max(0, Math.ceil(estimatedTime * (1 - progress / 100)));

  useEffect(() => {
    const totalTime = estimatedTime * 1000; // ミリ秒に変換
    const stepCount = steps.length;
    const stepDuration = totalTime / stepCount; // 各ステップの時間
    let startTime = Date.now();
    
    // プログレスバーを段階的に進める
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / totalTime) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        clearInterval(progressInterval);
      }
    }, 100);

    // ステップを順番に開始・完了させる
    const stepTimers: NodeJS.Timeout[] = [];
    steps.forEach((step, index) => {
      const stepStartTime = index * stepDuration;
      const stepEndTime = (index + 1) * stepDuration;
      
      // ステップ開始
      const startTimer = setTimeout(() => {
        setSteps((prev) => {
          const newSteps = [...prev];
          newSteps[index] = {
            ...newSteps[index],
            status: "processing",
            startTime: Date.now(),
          };
          return newSteps;
        });
      }, stepStartTime);
      stepTimers.push(startTimer);
      
      // ステップ完了
      const endTimer = setTimeout(() => {
        setSteps((prev) => {
          const newSteps = [...prev];
          newSteps[index] = {
            ...newSteps[index],
            status: "completed",
            endTime: Date.now(),
          };
          return newSteps;
        });
      }, stepEndTime);
      stepTimers.push(endTimer);
    });

    // 完了を通知（計算された時間後）
    const completeTimer = setTimeout(() => {
      setProgress(100);
      setSteps((prev) =>
        prev.map((step) =>
          step.status === "processing" ? { ...step, status: "completed" } : step
        )
      );
      onComplete();
    }, totalTime);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(completeTimer);
      stepTimers.forEach(timer => clearTimeout(timer));
    };
  }, [estimatedTime, onComplete]);

  const getStepIcon = (status: ProcessingStep["status"]) => {
    switch (status) {
      case "completed":
        return (
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case "processing":
        return (
          <div className="w-5 h-5 rounded-full bg-[#FF8A15] flex items-center justify-center">
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        );
      case "pending":
        return (
          <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
        );
    }
  };

  const getStepTextColor = (status: ProcessingStep["status"]) => {
    switch (status) {
      case "completed":
        return "text-gray-600";
      case "processing":
        return "text-[#FF8A15] font-medium";
      case "pending":
        return "text-gray-400";
    }
  };

  return (
    <div className="bg-white border border-gray-200 p-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Sparkles className="w-8 h-8 text-[#FF8A15] animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            AIが計画を生成中...
          </h3>
        </div>

        {/* プログレスバー */}
        <div className="space-y-2">
          <div className="w-full bg-gray-200 h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#FF8A15] to-orange-400 h-2.5 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>進捗</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* 処理ステップ */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 mb-3">現在の処理:</p>
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 text-sm transition-all duration-300 ${getStepTextColor(step.status)}`}
            >
              <div className="flex-shrink-0">
                {getStepIcon(step.status)}
              </div>
              <span className="flex-1">{step.label}</span>
              {step.status === "processing" && (
                <span className="text-xs text-[#FF8A15] ml-auto animate-pulse">処理中...</span>
              )}
              {step.status === "completed" && (
                <span className="text-xs text-green-600 ml-auto">完了</span>
              )}
            </div>
          ))}
        </div>

        {/* 残り時間 */}
        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            あと{remainingSeconds}秒ほどお待ちください...
          </p>
        </div>
      </div>
    </div>
  );
};

