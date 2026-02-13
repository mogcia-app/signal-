"use client";

import { useState } from "react";
import { Activity, Loader2, RefreshCw, Sparkles } from "lucide-react";
import SNSLayout from "../../../components/sns-layout";
import { authFetch } from "../../../utils/authFetch";
import toast from "react-hot-toast";

interface DiagnosisResponse {
  success: boolean;
  diagnosis?: string;
  metadata?: {
    postsAnalyzed: number;
    analyticsDataPoints: number;
    hasPlan: boolean;
    timestamp: string;
  };
  error?: string;
}

export default function InstagramDiagnosisPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [metadata, setMetadata] = useState<DiagnosisResponse["metadata"] | null>(null);

  const runDiagnosis = async () => {
    setIsLoading(true);
    try {
      const response = await authFetch("/api/instagram/ai-diagnosis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = (await response.json()) as DiagnosisResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error || "診断の実行に失敗しました");
      }

      setDiagnosis(data.diagnosis || "");
      setMetadata(data.metadata || null);
      toast.success("アカウント診断が完了しました");
    } catch (error) {
      console.error("診断実行エラー:", error);
      toast.error("診断に失敗しました。時間を空けて再実行してください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SNSLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-white border border-gray-300 p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <Activity className="w-6 h-6 text-[#FF8A15]" />
                  <h1 className="text-2xl font-semibold text-gray-900">アカウント診断</h1>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  投稿と分析データをもとに、現状評価と改善アクションを自動で提案します。
                </p>
              </div>
              <button
                type="button"
                onClick={runDiagnosis}
                disabled={isLoading}
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF8A15] text-white text-sm font-medium hover:bg-[#FF6B00] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    診断中...
                  </>
                ) : diagnosis ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    再診断する
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    診断を実行
                  </>
                )}
              </button>
            </div>
          </div>

          {metadata && (
            <div className="bg-white border border-gray-300 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 mb-4">診断データの内訳</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-gray-50 border border-gray-200 p-3">
                  <p className="text-gray-500">分析した投稿</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{metadata.postsAnalyzed}件</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-3">
                  <p className="text-gray-500">分析データ</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{metadata.analyticsDataPoints}件</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-3">
                  <p className="text-gray-500">運用計画</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {metadata.hasPlan ? "あり" : "なし"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-300 p-8 shadow-sm min-h-[340px]">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">診断結果</h2>
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin text-[#FF8A15]" />
                AIが診断レポートを生成しています...
              </div>
            )}
            {!isLoading && !diagnosis && (
              <p className="text-sm text-gray-500">
                まだ診断は実行されていません。右上の「診断を実行」を押すと結果が表示されます。
              </p>
            )}
            {!isLoading && diagnosis && (
              <div className="text-sm text-gray-800 whitespace-pre-wrap leading-7">
                {diagnosis}
              </div>
            )}
          </div>
        </div>
      </div>
    </SNSLayout>
  );
}
