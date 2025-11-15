"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Loader2, Trophy } from "lucide-react";
import type { ABTestRecord, ABTestUpsertPayload, ABTestVariant } from "@/types/ab-test";
import { abTestsApi } from "@/lib/api";

interface ABTestResultModalProps {
  test: ABTestRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (testId: string) => void;
}

type VariantDraft = ABTestVariant & { metrics?: ABTestVariant["metrics"] };

export function ABTestResultModal({ test, isOpen, onClose, onSaved }: ABTestResultModalProps) {
  const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>([]);
  const [winnerKey, setWinnerKey] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<"running" | "completed">("completed");
  const [notes, setNotes] = useState(test?.notes ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && test) {
      setVariantDrafts(
        test.variants.map((variant) => ({
          ...variant,
          metrics: {
            impressions: variant.metrics?.impressions ?? undefined,
            reach: variant.metrics?.reach ?? undefined,
            saves: variant.metrics?.saves ?? undefined,
            likes: variant.metrics?.likes ?? undefined,
            comments: variant.metrics?.comments ?? undefined,
            conversions: variant.metrics?.conversions ?? undefined,
            engagementRate: variant.metrics?.engagementRate ?? undefined,
            saveRate: variant.metrics?.saveRate ?? undefined,
          },
        }))
      );
      setWinnerKey(test.winnerVariantKey ?? undefined);
      setStatus((test.status as "running" | "completed") ?? "completed");
      setNotes(test.notes ?? "");
      setError(null);
    }
  }, [isOpen, test]);

  const canSubmit = useMemo(() => {
    if (!test) return false;
    if (status === "completed" && !winnerKey) {
      return false;
    }
    return true;
  }, [status, winnerKey, test]);

  const handleMetricChange = (
    variantIndex: number,
    field: keyof NonNullable<ABTestVariant["metrics"]>,
    value: string
  ) => {
    setVariantDrafts((prev) => {
      const updated = [...prev];
      const metrics = { ...(updated[variantIndex].metrics ?? {}) };
      const parsed = value === "" ? undefined : Number(value);
      metrics[field] = Number.isNaN(parsed as number) ? undefined : (parsed as number);
      updated[variantIndex] = {
        ...updated[variantIndex],
        metrics,
      };
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!test || !canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: ABTestUpsertPayload = {
        id: test.id,
        name: test.name,
        goal: test.goal ?? undefined,
        hypothesis: test.hypothesis ?? undefined,
        primaryMetric: test.primaryMetric ?? undefined,
        status,
        notes: notes.trim() || undefined,
        winnerVariantKey: status === "completed" ? winnerKey ?? null : null,
        variants: variantDrafts.map((variant) => ({
          ...variant,
          metrics: variant.metrics,
          result:
            status === "completed"
              ? variant.key === winnerKey
                ? "win"
                : "lose"
              : variant.result ?? "pending",
        })),
      };
      await abTestsApi.upsert(payload);
      onSaved?.(test.id);
      onClose();
    } catch (submitError) {
      console.error("ABTest result save error:", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "結果の保存に失敗しました。時間をおいて再度お試しください。"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !test) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">{test.name} の結果入力</p>
            <p className="text-xs text-slate-500">収集した指標を入力し、勝者を決定してください。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700">ステータス</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as "running" | "completed")}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
              >
                <option value="running">実施中</option>
                <option value="completed">完了（勝者決定）</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">メモ / 所感</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                placeholder="例) B案は保存率+12pt / リンククリック+30% だったため勝者とする"
              />
            </div>
          </div>

          <div className="space-y-4">
            {variantDrafts.map((variant, index) => (
              <div key={variant.key} className="rounded-lg border border-slate-200 p-4 bg-slate-50/70">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{variant.label}</p>
                    {variant.description ? (
                      <p className="text-xs text-slate-600">{variant.description}</p>
                    ) : null}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="radio"
                      name="winner"
                      value={variant.key}
                      disabled={status !== "completed"}
                      checked={winnerKey === variant.key}
                      onChange={() => setWinnerKey(variant.key)}
                    />
                    勝者
                    <Trophy
                      className={`w-3.5 h-3.5 ${winnerKey === variant.key ? "text-orange-500" : "text-slate-300"}`}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {[
                    { key: "impressions", label: "インプレッション" },
                    { key: "reach", label: "リーチ" },
                    { key: "saves", label: "保存数" },
                    { key: "likes", label: "いいね" },
                    { key: "comments", label: "コメント" },
                    { key: "conversions", label: "コンバージョン" },
                    { key: "engagementRate", label: "ER(%)" },
                    { key: "saveRate", label: "保存率(%)" },
                  ].map((metric) => (
                    <div key={`${variant.key}-${metric.key}`}>
                      <label className="text-[11px] text-slate-600">{metric.label}</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        value={
                          variant.metrics?.[metric.key as keyof NonNullable<typeof variant.metrics>] ?? ""
                        }
                        onChange={(event) =>
                          handleMetricChange(index, metric.key as keyof NonNullable<typeof variant.metrics>, event.target.value)
                        }
                        className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="text-sm px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>保存中...</span>
              </span>
            ) : (
              "結果を保存"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

