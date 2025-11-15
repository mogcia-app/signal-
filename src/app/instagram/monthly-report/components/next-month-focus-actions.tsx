"use client";

import React, { useMemo, useState } from "react";
import { ArrowUpRight, Loader2, Target } from "lucide-react";
import { actionLogsApi } from "@/lib/api";
import type { AIActionLog } from "@/types/ai";

export type NextMonthFocusAction = {
  id: string;
  title: string;
  focusKPI: string;
  reason: string;
  recommendedAction: string;
  referenceIds?: string[];
};

interface NextMonthFocusActionsProps {
  actions?: NextMonthFocusAction[];
  userId?: string;
  periodKey?: string;
  existingLogs?: AIActionLog[];
  onActionLogged?: (log: AIActionLog) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export function NextMonthFocusActions({
  actions,
  userId,
  periodKey,
  existingLogs,
  onActionLogged,
  isLoading = false,
  errorMessage,
}: NextMonthFocusActionsProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const logMap = useMemo(() => {
    const map = new Map<string, AIActionLog>();
    (existingLogs || []).forEach((log) => map.set(log.actionId, log));
    return map;
  }, [existingLogs]);

  if (!actions || actions.length === 0) {
    return null;
  }

  const focusArea = periodKey ? `next-month-${periodKey}` : "next-month";

  const handleToggle = async (action: NextMonthFocusAction, applied: boolean) => {
    if (!userId) {
      setLocalError("アクションを更新するにはログインが必要です。");
      return;
    }

    const actionId = `${focusArea}-${action.id}`;
    setPendingId(actionId);
    setLocalError(null);

    try {
      await actionLogsApi.upsert({
        userId,
        actionId,
        title: action.title,
        focusArea,
        applied,
      });

      const existing = logMap.get(actionId);
      const updated: AIActionLog = {
        id: existing?.id ?? `${userId}_${actionId}`,
        actionId,
        title: action.title,
        focusArea,
        applied,
        resultDelta: existing?.resultDelta ?? null,
        feedback: existing?.feedback ?? "",
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onActionLogged?.(updated);
    } catch (error) {
      console.error("Failed to update action log", error);
      setLocalError("アクションの更新に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-none p-6 shadow-sm mb-6">
      <div className="flex items-start sm:items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-slate-600" />
            <h2 className="text-lg font-semibold text-black">翌月フォーカスアクション</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            KPIの増減と成功/改善パターンから次に着手すべきテーマを自動で抽出しました。
          </p>
        </div>
        {(isLoading || pendingId) && (
          <div className="flex items-center text-sm text-slate-500">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            更新中...
          </div>
        )}
      </div>

      {(errorMessage || localError) && (
        <div className="text-sm text-rose-600 mb-4">{localError || errorMessage}</div>
      )}

      <div className="space-y-4">
        {actions.map((action) => {
          const actionId = `${focusArea}-${action.id}`;
          const log = logMap.get(actionId);
          const checked = Boolean(log?.applied);
          const updatedLabel =
            log?.updatedAt && !Number.isNaN(Date.parse(log.updatedAt))
              ? new Date(log.updatedAt).toLocaleString("ja-JP", {
                  month: "short",
                  day: "numeric",
                })
              : null;

          return (
            <div key={action.id} className="border border-slate-200 rounded-none p-4 bg-slate-50">
              <div className="flex items-start gap-3 mb-2">
                <div className="mt-0.5">
                  <ArrowUpRight className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{action.title}</p>
                  <p className="text-[11px] text-slate-500">フォーカスKPI: {action.focusKPI}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 mb-2">{action.reason}</p>
              <div className="text-sm text-slate-800 bg-white border border-slate-200 rounded-none p-3">
                {action.recommendedAction}
              </div>
              {action.referenceIds?.length ? (
                <p className="text-[11px] text-slate-500 mt-2">
                  参考投稿: {action.referenceIds.join(", ")}
                </p>
              ) : null}
              <div className="flex items-center gap-3 mt-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-400"
                    checked={checked}
                    disabled={!userId || pendingId === actionId}
                    onChange={(event) => handleToggle(action, event.target.checked)}
                  />
                  <span>{checked ? "実行済み" : "未実行"}</span>
                </label>
                {pendingId === actionId && (
                  <span className="text-xs text-slate-500">更新中...</span>
                )}
                {checked && updatedLabel && (
                  <span className="text-[11px] text-slate-500">最終更新: {updatedLabel}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
