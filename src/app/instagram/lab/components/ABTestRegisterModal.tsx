"use client";

import React, { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { abTestsApi } from "@/lib/api";
import type { ABTestUpsertPayload } from "@/types/ab-test";

interface VariantDraft {
  label: string;
  description?: string;
}

export interface ABTestRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered?: (testName: string) => void;
  initialData?: {
    name?: string;
    goal?: string;
    hypothesis?: string;
    primaryMetric?: string;
    variants?: VariantDraft[];
  };
}

const DEFAULT_VARIANTS: VariantDraft[] = [
  { label: "パターンA", description: "基準案" },
  { label: "パターンB", description: "検証案" },
];

export function ABTestRegisterModal({
  isOpen,
  onClose,
  onRegistered,
  initialData,
}: ABTestRegisterModalProps) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [primaryMetric, setPrimaryMetric] = useState("saveRate");
  const [variants, setVariants] = useState<VariantDraft[]>(DEFAULT_VARIANTS);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name ?? "");
      setGoal(initialData?.goal ?? "");
      setHypothesis(initialData?.hypothesis ?? "");
      setPrimaryMetric(initialData?.primaryMetric ?? "saveRate");
      setVariants(
        initialData?.variants && initialData.variants.length >= 2
          ? initialData.variants.slice(0, 3)
          : DEFAULT_VARIANTS
      );
      setNotes("");
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialData]);

  const handleVariantChange = (index: number, field: keyof VariantDraft, value: string) => {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handleAddVariant = () => {
    setVariants((prev) => [...prev, { label: `追加パターン${prev.length + 1}` }]);
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    if (!name.trim()) {
      setError("テスト名を入力してください。");
      return;
    }

    const normalizedVariants = variants
      .filter((variant) => variant.label?.trim())
      .map((variant, index) => ({
        key: `variant-${index + 1}`,
        label: variant.label.trim(),
        description: variant.description?.trim() ?? undefined,
      }));

    if (normalizedVariants.length < 2) {
      setError("バリエーションは2つ以上必要です。");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const payload: ABTestUpsertPayload = {
      name: name.trim(),
      goal: goal.trim() || undefined,
      hypothesis: hypothesis.trim() || undefined,
      primaryMetric: primaryMetric.trim() || undefined,
      status: "running",
      notes: notes.trim() || undefined,
      variants: normalizedVariants,
    };

    try {
      await abTestsApi.upsert(payload);
      setSuccessMessage("A/Bテストを登録しました。");
      onRegistered?.(payload.name);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (apiError) {
      console.error("ABTest upsert error", apiError);
      setError(
        apiError instanceof Error
          ? apiError.message
          : "A/Bテストの登録に失敗しました。時間をおいて再度お試しください。"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">A/Bテストを登録</p>
            <p className="text-xs text-slate-500">
              今回の投稿案を起点に比較検証を作成し、結果を学習データに反映します。
            </p>
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
          <div>
            <label className="text-xs font-semibold text-slate-700">テスト名</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
              placeholder="例) 保存率を高める導入フック比較"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700">検証したいKPI / ゴール</label>
              <input
                type="text"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                placeholder="例) 保存率を +10% 改善したい"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">仮説（任意）</label>
              <input
                type="text"
                value={hypothesis}
                onChange={(event) => setHypothesis(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                placeholder="例) Before型の導入は悩み共感が高まり保存率が上がる"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">主要評価指標</label>
            <select
              value={primaryMetric}
              onChange={(event) => setPrimaryMetric(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
            >
              <option value="saveRate">保存率</option>
              <option value="engagementRate">エンゲージメント率</option>
              <option value="reach">リーチ</option>
              <option value="clickThroughRate">リンククリック率</option>
              <option value="conversion">コンバージョン</option>
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">比較パターン</p>
              <button
                type="button"
                className="text-[11px] text-slate-600 border border-slate-200 px-2 py-1 rounded-md hover:bg-slate-50"
                onClick={handleAddVariant}
              >
                パターンを追加
              </button>
            </div>
            <div className="space-y-3">
              {variants.map((variant, index) => (
                <div key={`variant-${index}`} className="rounded-md border border-slate-200 p-3 bg-slate-50/70">
                  <label className="text-[11px] font-semibold text-slate-600">{`パターン${index + 1}`}</label>
                  <input
                    type="text"
                    value={variant.label}
                    onChange={(event) => handleVariantChange(index, "label", event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                    placeholder="例) Beforeフック"
                  />
                  <textarea
                    value={variant.description ?? ""}
                    onChange={(event) => handleVariantChange(index, "description", event.target.value)}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                    placeholder="比較する表現や意図を記入"
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">メモ（任意）</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
              placeholder="例) A案は今回の投稿案をそのまま使用、B案は導入を結論先出しにする予定"
              rows={3}
            />
          </div>

          {error && (
            <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          {successMessage && (
            <p className="text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
              {successMessage}
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
            disabled={isSubmitting}
            className="text-sm px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>登録中...</span>
              </span>
            ) : (
              "この条件で登録"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

