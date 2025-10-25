import React from 'react';
import { BarChart3, ArrowUp, ArrowDown } from 'lucide-react';

interface DetailedStatsProps {
  accountScore: Record<string, unknown> | null;
  performanceRating: {
    rating: string;
    color: string;
    bg: string;
    label: string;
  };
  previousPeriodData: Record<string, unknown> | null;
  activeTab: 'weekly' | 'monthly';
  reportSummary: {
    period: 'weekly' | 'monthly';
    date: string;
    totals: {
      totalLikes: number;
      totalComments: number;
      totalShares: number;
      totalReach: number;
      totalFollowerChange: number;
      totalPosts: number;
    };
    previousTotals: {
      totalLikes: number;
      totalComments: number;
      totalShares: number;
      totalReach: number;
      totalFollowerChange: number;
      totalPosts: number;
    };
    changes: {
      likesChange: number;
      commentsChange: number;
      sharesChange: number;
      reachChange: number;
      followerChange: number;
      postsChange: number;
    };
    postTypeStats: {
      type: string;
      count: number;
      label: string;
      color: string;
      bg: string;
      percentage: number;
    }[];
  } | null;
  getWeekDisplayName: (weekStr: string) => string;
  getMonthDisplayName: (monthStr: string) => string;
  selectedWeek: string;
  selectedMonth: string;
}

export const DetailedStats: React.FC<DetailedStatsProps> = ({
  accountScore,
  performanceRating,
  previousPeriodData,
  activeTab,
  reportSummary,
  getWeekDisplayName,
  getMonthDisplayName,
  selectedWeek,
  selectedMonth
}) => {
  const currentTotals = reportSummary?.totals || {
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalReach: 0,
    totalFollowerChange: 0,
    totalPosts: 0
  };

  return (
    <div className="bg-white rounded-none shadow-sm border border-gray-200 p-6 mt-4">
      <div className="flex items-center mb-6">
        <div className="w-8 h-8 bg-gradient-to-r from-orange-600 to-red-600 rounded-none flex items-center justify-center mr-3">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-black">詳細統計</h2>
          <p className="text-sm text-black">
            {activeTab === 'weekly' 
              ? `${getWeekDisplayName(selectedWeek)}の詳細データ`
              : `${getMonthDisplayName(selectedMonth)}の詳細データ`
            }
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* アカウントスコア */}
        <div className="p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-none border border-orange-200">
          <div className="text-center space-y-3">
            <div className="text-3xl font-bold text-orange-600">
              {typeof accountScore?.score === 'number' ? accountScore.score : 0}点
            </div>
            <div className="text-sm text-black">アカウントスコア</div>
            <div className="text-xs text-black">
              {String(performanceRating.label)}
            </div>
            
            {/* 前期間との比較 */}
            {previousPeriodData && (
              <div className="mt-3 pt-3 border-t border-orange-200">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-xs text-black">前期間:</span>
                  <span className="text-sm font-medium text-gray-700">
                    {typeof previousPeriodData.score === 'number' ? previousPeriodData.score : 0}点
                  </span>
                  {accountScore && previousPeriodData?.score !== undefined && (
                    <div className={`flex items-center space-x-1 ${
                      (typeof accountScore.score === 'number' && typeof previousPeriodData.score === 'number' && accountScore.score > previousPeriodData.score)
                        ? 'text-green-600' 
                        : (typeof accountScore.score === 'number' && typeof previousPeriodData.score === 'number' && accountScore.score < previousPeriodData.score)
                          ? 'text-red-600' 
                          : 'text-black'
                    }`}>
                      {(typeof accountScore.score === 'number' && typeof previousPeriodData.score === 'number' && accountScore.score > previousPeriodData.score) ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (typeof accountScore.score === 'number' && typeof previousPeriodData.score === 'number' && accountScore.score < previousPeriodData.score) ? (
                        <ArrowDown className="w-3 h-3" />
                      ) : null}
                      <span className="text-xs font-medium">
                        {typeof accountScore.score === 'number' && typeof previousPeriodData.score === 'number' ? Math.abs(accountScore.score - previousPeriodData.score) : 0}点
                        {(typeof accountScore.score === 'number' && typeof previousPeriodData.score === 'number' && accountScore.score > previousPeriodData.score) ? '↑' : 
                         (typeof accountScore.score === 'number' && typeof previousPeriodData.score === 'number' && accountScore.score < previousPeriodData.score) ? '↓' : '='}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 投稿タイプ別統計 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">投稿タイプ別統計</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-700">📸 フィード</span>
              <span className="text-sm font-medium text-gray-900">
                {reportSummary?.postTypeStats?.find(p => p.type === 'feed')?.count || 0}件
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-700">🎬 リール</span>
              <span className="text-sm font-medium text-gray-900">
                {reportSummary?.postTypeStats?.find(p => p.type === 'reel')?.count || 0}件
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-700">📱 ストーリーズ</span>
              <span className="text-sm font-medium text-gray-900">
                {reportSummary?.postTypeStats?.find(p => p.type === 'story')?.count || 0}件
              </span>
            </div>
          </div>
          {(!reportSummary?.postTypeStats || reportSummary.postTypeStats.length === 0) && (
            <div className="text-center py-6">
              <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <p className="text-gray-900 font-medium mb-1">投稿を分析してみよう！</p>
              <p className="text-sm text-gray-600">投稿分析データを入力すると<br />タイプ別統計が表示されます</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
