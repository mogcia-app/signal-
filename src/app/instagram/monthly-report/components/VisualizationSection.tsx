import React from 'react';
import { PieChart } from 'lucide-react';
import RechartsAreaChart from '../../../../components/RechartsAreaChart';

interface VisualizationSectionProps {
  dailyScores: Record<string, unknown> | null;
  activeTab: 'weekly' | 'monthly';
  reportSummary: {
    period: 'weekly' | 'monthly';
    date: string;
    postTypeStats: {
      type: string;
      count: number;
      label: string;
      color: string;
      bg: string;
      percentage: number;
    }[];
  } | null;
}

export const VisualizationSection: React.FC<VisualizationSectionProps> = ({
  dailyScores,
  activeTab,
  reportSummary
}) => {
  const postTypeStats = reportSummary?.postTypeStats || [];


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* アカウントスコア推移 */}
      <div>
        <RechartsAreaChart
          data={Array.isArray(dailyScores?.dailyScores) ? dailyScores.dailyScores : []}
          title="アカウントスコア推移"
          subtitle={`${activeTab === 'weekly' ? '週次' : '月次'}のスコア変動`}
        />
      </div>

      {/* 投稿タイプ別分析 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center mr-3">
            <PieChart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-black">投稿タイプ別分析</h2>
            <p className="text-sm text-black">コンテンツタイプのパフォーマンス</p>
          </div>
        </div>

        {/* 投稿タイプ別の統計 */}
        <div className="space-y-4">
          {postTypeStats.map(({ type, count, label, color, bg, percentage }) => (
            <div key={type} className={`p-4 bg-gradient-to-r ${bg} rounded-lg`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <span className="text-lg font-bold text-black">{count}件</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-black">{percentage.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
