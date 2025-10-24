'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/auth-context';
import SNSLayout from '../../../../components/sns-layout';

export default function FeedAnalyticsPage() {
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<{
    totalPosts?: number;
    totalLikes?: number;
    totalComments?: number;
    totalReach?: number;
    engagementRate?: number;
    avgLikesPerPost?: number;
    monthlyPosts?: number;
    weeklyPosts?: number;
    bestPostingTime?: string;
    topHashtags?: Array<{ tag: string; count: number }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/analytics/simple?userId=${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'x-user-id': user.uid,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error('分析データ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <SNSLayout 
      customTitle="フィード分析" 
      customDescription="Instagramフィード投稿の詳細分析を確認できます"
    >
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">フィード分析</h1>
          <p className="text-gray-600">Instagramフィード投稿のパフォーマンスを分析します</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <span className="ml-2 text-gray-600">分析データを読み込み中...</span>
          </div>
        ) : analyticsData ? (
          <div className="space-y-6">
            {/* 基本統計 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">基本統計</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {analyticsData.totalPosts || 0}
                  </div>
                  <div className="text-sm text-blue-800">総投稿数</div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {analyticsData.totalLikes || 0}
                  </div>
                  <div className="text-sm text-green-800">総いいね数</div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {analyticsData.totalComments || 0}
                  </div>
                  <div className="text-sm text-purple-800">総コメント数</div>
                </div>
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {analyticsData.totalReach || 0}
                  </div>
                  <div className="text-sm text-orange-800">総リーチ数</div>
                </div>
              </div>
            </div>

            {/* エンゲージメント率 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">エンゲージメント率</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-pink-50 to-pink-100 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-pink-600">
                    {analyticsData.engagementRate ? `${analyticsData.engagementRate.toFixed(2)}%` : '0.00%'}
                  </div>
                  <div className="text-sm text-pink-800">平均エンゲージメント率</div>
                </div>
                <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-600">
                    {analyticsData.avgLikesPerPost ? analyticsData.avgLikesPerPost.toFixed(0) : 0}
                  </div>
                  <div className="text-sm text-indigo-800">投稿あたりの平均いいね数</div>
                </div>
              </div>
            </div>

            {/* 投稿頻度分析 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">投稿頻度分析</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">今月の投稿数</span>
                  <span className="font-semibold text-gray-800">{analyticsData.monthlyPosts || 0}件</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">週平均投稿数</span>
                  <span className="font-semibold text-gray-800">{analyticsData.weeklyPosts || 0}件</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">最適投稿時間</span>
                  <span className="font-semibold text-gray-800">{analyticsData.bestPostingTime || 'データなし'}</span>
                </div>
              </div>
            </div>

            {/* ハッシュタグ分析 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">ハッシュタグ分析</h2>
              <div className="space-y-2">
                {analyticsData.topHashtags && analyticsData.topHashtags.length > 0 ? (
                  analyticsData.topHashtags.map((hashtag, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">#{hashtag.tag}</span>
                      <span className="text-sm text-gray-600">{hashtag.count}回使用</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🏷️</div>
                    <p>ハッシュタグデータがありません</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">分析データがありません</h3>
            <p className="text-gray-600 mb-4">フィード投稿を開始すると、ここに分析データが表示されます</p>
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-orange-500 text-white hover:bg-orange-600 transition-colors"
            >
              データを再読み込み
            </button>
          </div>
        )}
      </div>
    </SNSLayout>
  );
}
