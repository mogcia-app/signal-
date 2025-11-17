import React from "react";

export interface PerformanceRatingProps {
  accountScore: Record<string, unknown> | null;
  performanceRating: {
    rating: string;
    color: string;
    bg: string;
    label: string;
  };
  getMonthDisplayName: (monthStr: string) => string;
  selectedMonth: string;
  pdcaMetrics?: {
    planExists: boolean;
    loopScore: number; // 0-1
    planScore: number;
    executionRate: number;
    feedbackCoverage: number;
    feedbackCount: number;
    adoptionRate: number; // 0-1
    plannedPosts: number;
    analyzedPosts: number;
    actionCount: number;
    actionAppliedCount: number;
  } | null;
}

export const PerformanceRating: React.FC<PerformanceRatingProps> = ({
  accountScore,
  performanceRating,
  getMonthDisplayName,
  selectedMonth,
  pdcaMetrics,
}) => {
  const loopScorePercent = pdcaMetrics ? Math.round(pdcaMetrics.loopScore * 100) : 0;
  const adoptionRatePercent = pdcaMetrics ? Math.round(pdcaMetrics.adoptionRate * 100) : 0;
  const pdcaStatus =
    loopScorePercent >= 70
      ? { label: "ループ好調", description: "PDCAが安定して回っています", badge: "bg-emerald-100 text-emerald-700 border border-emerald-200" }
      : loopScorePercent >= 40
        ? { label: "改善途中", description: "フィードバックと改善を継続しましょう", badge: "bg-amber-100 text-amber-700 border border-amber-200" }
        : { label: "データ蓄積中", description: "まずは投稿と振り返りを増やしましょう", badge: "bg-slate-100 text-slate-600 border border-slate-200" };

  return (
    <div className="bg-white rounded-none shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black mb-2">パフォーマンス評価</h2>
          <p className="text-sm text-black">
            {`${getMonthDisplayName(selectedMonth)}の総合評価`}
          </p>
        </div>
        <div className="text-center">
          <div
            className={`w-20 h-20 rounded-full ${performanceRating.bg} flex items-center justify-center mx-auto mb-2`}
          >
            <span className={`text-3xl font-bold ${performanceRating.color}`}>
              {String(performanceRating.rating)}
            </span>
          </div>
          <div className="text-sm text-black">{String(performanceRating.label)}</div>
          <div className="text-xs text-black mt-1">
            スコア: {typeof accountScore?.score === "number" ? accountScore.score : 0}点
          </div>
        </div>
      </div>
      {pdcaMetrics ? (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-gray-200 bg-white rounded-none p-4 flex flex-col gap-3 h-full">
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center px-2 py-1 text-[11px] font-semibold rounded-none ${pdcaStatus.badge}`}
              >
                {pdcaStatus.label}
              </span>
              <span className="text-xs text-gray-500">
                計画: {pdcaMetrics.planExists ? "作成済み" : "未設定"}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-600">PDCA実行度</p>
              <p className="text-3xl font-semibold text-slate-900">{loopScorePercent}%</p>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <p>{pdcaStatus.description}</p>
            </div>
          </div>
          <div className="border border-gray-200 bg-white rounded-none p-4 flex flex-col gap-3 h-full">
            <div>
              <p className="text-xs text-gray-600">振り返りデータ件数</p>
              <p className="mt-4 text-3xl font-semibold text-slate-900">
                {pdcaMetrics.feedbackCount.toLocaleString()}件
              </p>
            </div>
            <div className="text-xs text-gray-600 space-y-1 mt-4">
              <p>投稿分析・ハッシュタグ・アクションの蓄積状況です</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 border border-dashed border-gray-300 bg-gray-50 rounded-none p-6 text-sm text-gray-600">
          まだAI分析を実行していないか、フィードバックデータが不足しています。AIまとめセクションから分析を実行すると、PDCAの進捗がここに表示されます。
        </div>
      )}
    </div>
  );
};
