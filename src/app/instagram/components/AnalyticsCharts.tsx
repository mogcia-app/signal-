'use client';

import { 
  Users, 
  Heart, 
  Eye, 
  Bookmark,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Chart.jsの設定
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalyticsData {
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagementRate: number;
  publishedAt: Date | string;
  postId: string;
}

interface AnalyticsChartsProps {
  analyticsData: AnalyticsData[];
  stats: {
    followers: number;
    likes: number;
    saves: number;
    reach: number;
  };
  loading: boolean;
}

export default function AnalyticsCharts({ analyticsData, stats, loading }: AnalyticsChartsProps) {
  // グラフ用のデータを動的に生成
  const generateChartData = (type: 'likes' | 'followers' | 'saves' | 'reach') => {
    const labels = ['月', '火', '水', '木', '金', '土', '日'];
    const data = labels.map(() => 0);
    
    if (analyticsData.length === 0) {
      return { labels, datasets: [{ data, borderColor: '#ff8a15', backgroundColor: 'rgba(255, 138, 21, 0.1)', tension: 0.4, fill: true }] };
    }

    // 過去7日間のデータを計算（analyticsデータから）
    labels.forEach((_, index) => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - (6 - index));
      
      const dayAnalytics = analyticsData.filter((analytics: AnalyticsData) => {
        const postDate = new Date(analytics.publishedAt);
        return postDate.toDateString() === targetDate.toDateString();
      });

      data[index] = dayAnalytics.reduce((sum: number, analytics: AnalyticsData) => {
        switch (type) {
          case 'likes': return sum + analytics.likes;
          case 'followers': return sum + Math.floor(analytics.likes * 0.1); // 推定フォロワー増加
          case 'saves': return sum + analytics.shares;
          case 'reach': return sum + analytics.reach;
          default: return sum;
        }
      }, 0);
    });

    const colors = {
      likes: { border: '#ff8a15', bg: 'rgba(255, 138, 21, 0.1)' },
      followers: { border: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
      saves: { border: '#ea580c', bg: 'rgba(234, 88, 12, 0.1)' },
      reach: { border: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)' }
    };

    return {
      labels,
      datasets: [{
        data,
        borderColor: colors[type].border,
        backgroundColor: colors[type].bg,
        tension: 0.4,
        fill: true,
      }]
    };
  };

  const likesChartData = generateChartData('likes');
  const followersChartData = generateChartData('followers');
  const savesChartData = generateChartData('saves');
  const reachChartData = generateChartData('reach');

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 10,
          },
        },
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 10,
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* フォロワー数グラフ */}
      <div className="bg-white border border-[#ff8a15] p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center">
            <Users className="w-4 h-4 mr-1 text-[#f97316]" />
            フォロワー数
          </h4>
          <span className="text-xs text-gray-500">過去1週間</span>
        </div>
        <div className="h-32">
          <Line data={followersChartData} options={chartOptions} />
        </div>
        <div className="mt-2 text-center">
          <span className="text-lg font-bold text-[#f97316]">
            {loading ? 'ー' : stats.followers.toLocaleString()}
          </span>
          <span className="text-xs text-gray-500 ml-1">現在</span>
        </div>
      </div>

      {/* いいね数グラフ */}
      <div className="bg-white border border-[#ff8a15] p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center">
            <Heart className="w-4 h-4 mr-1 text-[#ff8a15]" />
            いいね数
          </h4>
          <span className="text-xs text-gray-500">過去1週間</span>
        </div>
        <div className="h-32">
          <Line data={likesChartData} options={chartOptions} />
        </div>
        <div className="mt-2 text-center">
          <span className="text-lg font-bold text-[#ff8a15]">
            {loading ? 'ー' : stats.likes.toLocaleString()}
          </span>
          <span className="text-xs text-gray-500 ml-1">合計</span>
        </div>
      </div>

      {/* 保存数グラフ */}
      <div className="bg-white border border-[#ff8a15] p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center">
            <Bookmark className="w-4 h-4 mr-1 text-[#ea580c]" />
            保存数
          </h4>
          <span className="text-xs text-gray-500">過去1週間</span>
        </div>
        <div className="h-32">
          <Line data={savesChartData} options={chartOptions} />
        </div>
        <div className="mt-2 text-center">
          <span className="text-lg font-bold text-[#ea580c]">
            {loading ? 'ー' : stats.saves.toLocaleString()}
          </span>
          <span className="text-xs text-gray-500 ml-1">合計</span>
        </div>
      </div>

      {/* リーチ数グラフ */}
      <div className="bg-white border border-[#ff8a15] p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center">
            <Eye className="w-4 h-4 mr-1 text-[#dc2626]" />
            リーチ数
          </h4>
          <span className="text-xs text-gray-500">過去1週間</span>
        </div>
        <div className="h-32">
          <Line data={reachChartData} options={chartOptions} />
        </div>
        <div className="mt-2 text-center">
          <span className="text-lg font-bold text-[#dc2626]">
            {loading ? 'ー' : stats.reach.toLocaleString()}
          </span>
          <span className="text-xs text-gray-500 ml-1">合計</span>
        </div>
      </div>
    </div>
  );
}
