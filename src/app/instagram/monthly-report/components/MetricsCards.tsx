import React from 'react';
import { Heart, MessageCircle, Share, Eye, ArrowUp, ArrowDown } from 'lucide-react';

interface MetricsCardsProps {
  activeTab: 'weekly' | 'monthly';
  currentTotals: {
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
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({
  activeTab,
  currentTotals,
  previousTotals,
  changes
}) => {
  const periodLabel = activeTab === 'weekly' ? '前週比' : '前月比';

  const metrics = [
    {
      label: 'いいね総数',
      value: currentTotals.totalLikes,
      icon: Heart,
      iconColor: 'text-red-500',
      change: changes.likesChange
    },
    {
      label: 'コメント総数',
      value: currentTotals.totalComments,
      icon: MessageCircle,
      iconColor: 'text-blue-500',
      change: changes.commentsChange
    },
    {
      label: 'シェア総数',
      value: currentTotals.totalShares,
      icon: Share,
      iconColor: 'text-green-500',
      change: changes.sharesChange
    },
    {
      label: '閲覧数総数',
      value: currentTotals.totalReach,
      icon: Eye,
      iconColor: 'text-purple-500',
      change: changes.reachChange
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {metrics.map((metric, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{metric.label}</p>
              <p className="text-2xl font-bold text-gray-900">
                {metric.value.toLocaleString()}
              </p>
            </div>
            <metric.icon className={`w-8 h-8 ${metric.iconColor}`} />
          </div>
          <div className="mt-2 flex items-center">
            {metric.change >= 0 ? (
              <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
            ) : (
              <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm font-medium ${
              metric.change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {Math.abs(metric.change).toFixed(1)}% {periodLabel}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
