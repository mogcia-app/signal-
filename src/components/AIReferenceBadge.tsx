"use client";

import React, { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import type { AIReference } from "@/types/ai";

interface ReferenceMetadata {
  focusArea?: string;
  applied?: boolean;
  resultDelta?: number | null;
  feedback?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface AIReferenceBadgeProps {
  reference: AIReference;
  className?: string;
}

export function AIReferenceBadge({ reference, className }: AIReferenceBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleClick = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  const metadata = (reference.metadata ?? {}) as ReferenceMetadata;
  const appliedStatus =
    typeof metadata.applied === "boolean" ? metadata.applied : (reference.metadata as any)?.applied;
  const focusArea =
    typeof metadata.focusArea === "string" && metadata.focusArea.trim().length > 0
      ? metadata.focusArea
      : null;
  const resultDelta =
    typeof metadata.resultDelta === "number" ? Number(metadata.resultDelta.toFixed(1)) : null;
  const feedback =
    typeof metadata.feedback === "string" && metadata.feedback.trim().length > 0
      ? metadata.feedback
      : null;
  const updatedAt =
    typeof metadata.updatedAt === "string" && metadata.updatedAt
      ? formatDate(metadata.updatedAt)
      : null;

  const variantClass =
    appliedStatus === true
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : appliedStatus === false
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-white text-slate-600";

  return (
    <div className={`relative ${className ?? ""}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`text-[11px] px-2 py-1 rounded-full border flex items-center gap-1 transition-colors hover:bg-slate-50 ${variantClass}`}
      >
        <span className="truncate max-w-[120px]">{reference.label || "参照データ"}</span>
        <Info className="w-3 h-3 text-slate-400" />
      </button>
      {isOpen && (
        <div className="absolute z-30 mt-2 w-64 rounded-lg border border-slate-200 bg-white shadow-xl p-4">
          <p className="text-xs font-semibold text-slate-800">{reference.label || "参照データ"}</p>
          {reference.summary ? (
            <p className="mt-1 text-[11px] text-slate-500 whitespace-pre-line">{reference.summary}</p>
          ) : null}
          <div className="mt-3 space-y-1 text-[11px] text-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">種別</span>
              <span className="font-medium">
                {reference.sourceType === "analytics"
                  ? "学習ログ"
                  : reference.sourceType === "plan"
                    ? "運用計画"
                    : reference.sourceType === "profile"
                      ? "アカウント設定"
                      : reference.sourceType === "masterContext"
                        ? "マスターコンテキスト"
                        : reference.sourceType === "feedback"
                          ? "フィードバック"
                          : "参照データ"}
              </span>
            </div>
            {focusArea ? (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">フォーカス</span>
                <span className="font-medium text-slate-700">{focusArea}</span>
              </div>
            ) : null}
            {typeof appliedStatus === "boolean" ? (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">ステータス</span>
                <span className="font-medium text-slate-700">
                  {appliedStatus ? "実行済み" : "未実行"}
                </span>
              </div>
            ) : null}
            {resultDelta !== null ? (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">効果</span>
                <span className="font-medium text-slate-700">
                  {resultDelta > 0 ? "+" : ""}
                  {resultDelta}
                </span>
              </div>
            ) : null}
            {updatedAt ? (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">更新</span>
                <span className="font-medium text-slate-700">{updatedAt}</span>
              </div>
            ) : null}
          </div>
          {feedback ? (
            <p className="mt-2 rounded-md bg-slate-50 p-2 text-[11px] text-slate-600">
              {feedback}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function formatDate(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

