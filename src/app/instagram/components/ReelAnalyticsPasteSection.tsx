"use client";

import React from "react";
import { Clipboard } from "lucide-react";

interface ReelAnalyticsPasteSectionProps {
  onPaste: () => void;
  pasteSuccess: string | null;
}

export const ReelAnalyticsPasteSection: React.FC<ReelAnalyticsPasteSectionProps> = ({
  onPaste,
  pasteSuccess,
}) => {
  return (
    <div className="p-4 border-t border-gray-200 bg-orange-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Instagram分析データの貼り付け</h3>
        <button
          type="button"
          onClick={onPaste}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-[#ff8a15] hover:bg-[#e6760f] transition-colors gap-1.5"
        >
          <Clipboard size={14} />
          Instagram分析データを貼り付け
        </button>
      </div>
      <p className="text-xs text-gray-600">
        Instagramの分析画面からデータをコピーして、このボタンをクリックすると自動で入力されます。
      </p>
      {pasteSuccess && (
        <p className="text-xs text-green-600 mt-2">{pasteSuccess}</p>
      )}
    </div>
  );
};










