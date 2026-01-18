"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle, X } from "lucide-react";
import { ABTestRegisterModal, type ABTestRegisterModalProps } from "./ABTestRegisterModal";
import { ABTestResultModal } from "./ABTestResultModal";
import { AB_TEST_PRESETS } from "@/data/ab-test-presets";
import type { ABTestRecord } from "@/types/ab-test";

interface ABTestSidebarSectionProps {
  currentPostTitle?: string;
}

type StatusMessage = {
  type: "success" | "error";
  text: string;
};

export function ABTestSidebarSection({ currentPostTitle }: ABTestSidebarSectionProps) {
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
  };

  const handleResultSaved = () => {
    triggerStatus("A/Bテスト結果を保存しました！", "success");
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

