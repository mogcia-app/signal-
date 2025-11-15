"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, CheckCircle, X } from "lucide-react";
import ABTestPanel from "./ABTestPanel";
import { ABTestRegisterModal, type ABTestRegisterModalProps } from "./ABTestRegisterModal";
import { ABTestResultModal } from "./ABTestResultModal";
import { AB_TEST_PRESETS } from "@/data/ab-test-presets";
import type { ABTestRecord } from "@/types/ab-test";
import { abTestsApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

interface ABTestSidebarSectionProps {
  currentPostTitle?: string;
}

type StatusMessage = {
  type: "success" | "error";
  text: string;
};

export function ABTestSidebarSection({ currentPostTitle }: ABTestSidebarSectionProps) {
  const { user } = useAuth();
  const [abTests, setAbTests] = useState<ABTestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerInitialData, setRegisterInitialData] = useState<
    ABTestRegisterModalProps["initialData"]
  >();
  const [resultModalTest, setResultModalTest] = useState<ABTestRecord | null>(null);

  const triggerStatus = useCallback((text: string, type: StatusMessage["type"]) => {
    setStatusMessage({ text, type });
  }, []);

  useEffect(() => {
    if (!statusMessage) {return;}
    const timer = setTimeout(() => setStatusMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  const fetchAbTests = useCallback(async () => {
    if (!user?.uid) {
      setAbTests([]);
      setError("A/Bテストはログイン後に利用できます。");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await abTestsApi.list({ limit: 5 });
      if (response?.success && Array.isArray(response.data)) {
        setAbTests(response.data as ABTestRecord[]);
      } else {
        setAbTests([]);
        setError(response?.error || "A/Bテスト情報の取得に失敗しました");
      }
    } catch (fetchError) {
      console.error("A/Bテスト取得エラー:", fetchError);
      setAbTests([]);
      setError("A/Bテスト情報の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user?.uid) {
      fetchAbTests();
    }
  }, [user?.uid, fetchAbTests]);

  const openRegisterModal = useCallback(
    (initial?: ABTestRegisterModalProps["initialData"]) => {
      setRegisterInitialData(initial);
      setIsRegisterModalOpen(true);
    },
    [],
  );

  const handlePresetRegister = useCallback(
    (presetId: string) => {
      const preset = AB_TEST_PRESETS.find((item) => item.id === presetId);
      if (!preset) {
        openRegisterModal();
        return;
      }
      openRegisterModal({
        name: preset.name,
        hypothesis: preset.description,
        primaryMetric: "saveRate",
        variants: preset.variants.map((variant) => ({
          label: variant.label,
          description: `${variant.summary}｜推奨: ${variant.recommendedUse}`,
        })),
      });
    },
    [openRegisterModal],
  );

  const handleCustomRegister = () => {
    const baseTitle = currentPostTitle?.trim() || "新規投稿";
    openRegisterModal({
      name: `${baseTitle}のA/Bテスト`,
      goal: "投稿案ごとの反応差を定量化したい",
      primaryMetric: "engagementRate",
    });
  };

  const handleRegistered = (testName?: string) => {
    triggerStatus(`${testName ?? "A/Bテスト"}を登録しました！`, "success");
    fetchAbTests();
  };

  const handleResultSaved = () => {
    triggerStatus("A/Bテスト結果を保存しました！", "success");
    fetchAbTests();
  };

  const statusBadgeClass = useMemo(
    () =>
      statusMessage?.type === "success"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-rose-50 text-rose-700 border-rose-200",
    [statusMessage],
  );

  return (
    <div className="space-y-4">
      {statusMessage && (
        <div className={`text-xs px-3 py-2 border rounded-md flex items-center gap-2 ${statusBadgeClass}`}>
          {statusMessage.type === "success" ? (
            <CheckCircle className="w-3.5 h-3.5" />
          ) : (
            <X className="w-3.5 h-3.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <ABTestPanel onRegister={handlePresetRegister} onCustomRegister={handleCustomRegister} />

      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <div>
            <p className="text-sm font-semibold text-slate-900">最近のA/Bテスト</p>
            <p className="text-xs text-slate-500">最新5件を表示します。勝者の登録で学習に反映されます。</p>
          </div>
          <button
            type="button"
            onClick={fetchAbTests}
            disabled={isLoading}
            className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            更新
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {error ? (
            <p className="text-xs text-rose-600">{error}</p>
          ) : isLoading ? (
            <p className="text-xs text-slate-500">読み込み中...</p>
          ) : abTests.length === 0 ? (
            <p className="text-xs text-slate-500">まだ登録されたテストがありません。</p>
          ) : (
            abTests.map((test) => (
              <div
                key={test.id}
                className="border border-slate-200 rounded-lg p-3 bg-slate-50/60 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{test.name}</p>
                  <p className="text-[11px] text-slate-500">
                    KPI: {test.primaryMetric || "未指定"} / 状態: {test.status === "completed" ? "完了" : "実施中"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] px-2 py-1 rounded-full border ${
                      test.status === "completed"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {test.status === "completed" ? "完了" : "実施中"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setResultModalTest(test)}
                    className="text-xs px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-white transition-colors"
                  >
                    結果を入力
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ABTestRegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onRegistered={handleRegistered}
        initialData={registerInitialData}
      />
      <ABTestResultModal
        test={resultModalTest}
        isOpen={Boolean(resultModalTest)}
        onClose={() => setResultModalTest(null)}
        onSaved={() => {
          setResultModalTest(null);
          handleResultSaved();
        }}
      />
    </div>
  );
}

export default ABTestSidebarSection;

