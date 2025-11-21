import React, { useMemo } from "react";
import { FlaskConical, ChevronDown } from "lucide-react";
import { AB_TEST_PRESETS } from "@/data/ab-test-presets";

interface ABTestPanelProps {
  onRegister?: (presetId: string) => void;
  onCustomRegister?: () => void;
}

export const ABTestPanel: React.FC<ABTestPanelProps> = ({ onRegister, onCustomRegister }) => {
  const presets = useMemo(() => AB_TEST_PRESETS, []);

  return (
    <div className="mb-6 border border-slate-200 rounded-xl bg-white overflow-hidden">
      <details className="group">
        <summary className="flex items-center justify-between px-5 py-4 text-left cursor-pointer select-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900/80 rounded-lg flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">A/Bテストカタログ</p>
              <p className="text-xs text-slate-500">
                よく使う比較パターンをワンクリックで適用できます
              </p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-5 pb-5 space-y-4">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="border border-slate-200 rounded-lg p-4 bg-slate-50/70 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{preset.name}</p>
                  <p className="text-xs text-slate-600">{preset.description}</p>
                </div>
                {onRegister && (
                  <button
                    type="button"
                    onClick={() => onRegister(preset.id)}
                    className="text-xs px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-white"
                  >
                    登録
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {preset.variants.map((variant) => (
                  <div key={variant.label} className="bg-white border border-slate-200 rounded-md p-3">
                    <p className="text-xs font-semibold text-slate-900">{variant.label}</p>
                    <p className="text-xs text-slate-600 mt-1">{variant.summary}</p>
                    <p className="text-[11px] text-slate-500 mt-2">
                      推奨: {variant.recommendedUse}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {onCustomRegister && (
            <div className="pt-1">
              <button
                type="button"
                onClick={onCustomRegister}
                className="w-full text-[11px] font-semibold text-slate-700 border border-slate-300 bg-white px-3 py-2 rounded-none hover:bg-slate-50 transition-colors"
              >
                カスタムA/Bテストを登録
              </button>
            </div>
          )}
        </div>
      </details>
    </div>
  );
};

export default ABTestPanel;

