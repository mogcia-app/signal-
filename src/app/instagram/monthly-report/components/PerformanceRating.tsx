import React from 'react';

interface PerformanceRatingProps {
  accountScore: Record<string, unknown> | null;
  performanceRating: {
    rating: string;
    color: string;
    bg: string;
    label: string;
  };
  activeTab: 'weekly' | 'monthly';
  getWeekDisplayName: (weekStr: string) => string;
  getMonthDisplayName: (monthStr: string) => string;
  selectedWeek: string;
  selectedMonth: string;
}

export const PerformanceRating: React.FC<PerformanceRatingProps> = ({
  accountScore,
  performanceRating,
  activeTab,
  getWeekDisplayName,
  getMonthDisplayName,
  selectedWeek,
  selectedMonth
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black mb-2">パフォーマンス評価</h2>
          <p className="text-sm text-black">
            {activeTab === 'weekly' 
              ? `${getWeekDisplayName(selectedWeek)}の総合評価`
              : `${getMonthDisplayName(selectedMonth)}の総合評価`
            }
          </p>
        </div>
        <div className="text-center">
          <div className={`w-20 h-20 rounded-full ${performanceRating.bg} flex items-center justify-center mx-auto mb-2`}>
            <span className={`text-3xl font-bold ${performanceRating.color}`}>{String(performanceRating.rating)}</span>
          </div>
          <div className="text-sm text-black">{String(performanceRating.label)}</div>
          <div className="text-xs text-black mt-1">
            スコア: {typeof accountScore?.score === 'number' ? accountScore.score : 0}点
          </div>
        </div>
      </div>
    </div>
  );
};
