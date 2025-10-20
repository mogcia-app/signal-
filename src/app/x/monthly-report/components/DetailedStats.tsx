import React from 'react';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

interface DetailedStatsProps {
  totals: {
    totalLikes: number;
    totalRetweets: number;
    totalComments: number;
    totalSaves: number;
    totalImpressions: number;
    totalEngagements: number;
  };
  previousTotals?: {
    totalLikes: number;
    totalRetweets: number;
    totalComments: number;
    totalSaves: number;
    totalImpressions: number;
    totalEngagements: number;
  };
}

export function DetailedStats({ totals, previousTotals }: DetailedStatsProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return null;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-black';
  };

  const stats = [
    {
      label: 'いいね数',
      current: totals.totalLikes,
      previous: previousTotals?.totalLikes || 0,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      label: 'リツイート数',
      current: totals.totalRetweets,
      previous: previousTotals?.totalRetweets || 0,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      label: 'コメント数',
      current: totals.totalComments,
      previous: previousTotals?.totalComments || 0,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: '保存数',
      current: totals.totalSaves,
      previous: previousTotals?.totalSaves || 0,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'インプレッション数',
      current: totals.totalImpressions,
      previous: previousTotals?.totalImpressions || 0,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'エンゲージメント数',
      current: totals.totalEngagements,
      previous: previousTotals?.totalEngagements || 0,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <BarChart3 className="h-6 w-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-black">詳細統計</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const change = previousTotals ? calculateChange(stat.current, stat.previous) : 0;
          
          return (
            <div key={index} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{stat.label}</span>
                {previousTotals && (
                  <div className="flex items-center space-x-1">
                    {getChangeIcon(change)}
                    <span className={`text-xs ${getChangeColor(change)}`}>
                      {change > 0 ? '+' : ''}{change.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              
              <div className={`p-4 rounded-lg ${stat.bgColor}`}>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {formatNumber(stat.current)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
