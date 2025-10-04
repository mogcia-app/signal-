'use client';

import { 
  Users, 
  Heart, 
  Eye, 
  Bookmark, 
  ThumbsUp,
  Play,
  Image as ImageIcon,
  Camera,
  TrendingUp,
} from 'lucide-react';

interface DashboardStats {
  followers: number;
  engagement: number;
  reach: number;
  saves: number;
  likes: number;
  comments: number;
  postsThisWeek: number;
  weeklyGoal: number;
  followerGrowth: number;
  topPostType: string;
  monthlyFeedPosts: number;
  monthlyReelPosts: number;
  monthlyStoryPosts: number;
}

interface StatsCardsProps {
  stats: DashboardStats;
  loading: boolean;
}

export default function StatsCards({ stats, loading }: StatsCardsProps) {
  return (
    <>
      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-pink-100 rounded-lg">
              <Users className="h-6 w-6 text-pink-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">フォロワー数</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? 'ー' : stats.followers === 0 ? '0' : stats.followers.toLocaleString()}
              </p>
              <p className="text-xs text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                {loading ? 'ー' : `+${stats.followerGrowth}%`} 今月
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Heart className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">総シェア数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.engagement}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Eye className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">閲覧数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.reach.toLocaleString()}</p>
              <p className="text-xs text-green-600">今週</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Bookmark className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">保存数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.saves}</p>
              <p className="text-xs text-purple-600">今週</p>
            </div>
          </div>
        </div>
      </div>

      {/* 追加のKPIカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <ThumbsUp className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">いいね数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.likes.toLocaleString()}</p>
              <p className="text-xs text-red-600">今週</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Camera className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">ストーリーズ投稿</p>
              <p className="text-2xl font-bold text-gray-900">{stats.monthlyStoryPosts}</p>
              <p className="text-xs text-yellow-600">今月</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <ImageIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">フィード投稿</p>
              <p className="text-2xl font-bold text-gray-900">{stats.monthlyFeedPosts}</p>
              <p className="text-xs text-indigo-600">今月</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Play className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">リール投稿</p>
              <p className="text-2xl font-bold text-gray-900">{stats.monthlyReelPosts}</p>
              <p className="text-xs text-orange-600">今月</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
