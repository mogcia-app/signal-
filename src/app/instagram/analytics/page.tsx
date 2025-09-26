'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { AIChatWidget } from '../../../components/ai-chat-widget';
import { AuthGuard } from '../../../components/auth-guard';
import { analyticsApi } from '../../../lib/api';
import { useAuth } from '../../../contexts/auth-context';
import { 
  BarChart3,
  Heart,
  Save,
  Calendar,
  TrendingUp
} from 'lucide-react';

interface SimpleAnalyticsData {
  id: string;
  userId: string;
  likes: number;
  publishedAt: Date;
  createdAt: Date;
}

function InstagramAnalyticsContent() {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<SimpleAnalyticsData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputData, setInputData] = useState({
    likes: '',
    publishedAt: new Date().toISOString().split('T')[0]
  });

  // 分析データを取得
  const fetchAnalytics = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      console.log('Fetching analytics for user:', user.uid);
      const response = await analyticsApi.list({ userId: user.uid });
      console.log('Analytics response:', response);
      setAnalyticsData(response.analytics || []);
    } catch (error) {
      console.error('Analytics fetch error:', error);
      setAnalyticsData([]);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // いいね数を保存
  const handleSaveLikes = async () => {
    if (!user?.uid) {
      alert('ログインが必要です');
      return;
    }

    if (!inputData.likes) {
      alert('いいね数を入力してください');
      return;
    }

    setIsLoading(true);
    try {
      const analyticsPayload = {
        userId: user.uid,
        likes: parseInt(inputData.likes),
        publishedAt: inputData.publishedAt
      };

      console.log('Saving analytics data:', analyticsPayload);
      const response = await analyticsApi.create(analyticsPayload);
      console.log('Analytics saved:', response);

      // データを再取得
      await fetchAnalytics();

      // 入力データをリセット
      setInputData({
        likes: '',
        publishedAt: new Date().toISOString().split('T')[0]
      });

      alert('いいね数を保存しました！');
    } catch (error) {
      console.error('Save error:', error);
      alert('保存に失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // 統計計算
  const totalLikes = analyticsData.reduce((sum, data) => sum + data.likes, 0);
  const avgLikes = analyticsData.length > 0 ? Math.round(totalLikes / analyticsData.length) : 0;
  const maxLikes = analyticsData.length > 0 ? Math.max(...analyticsData.map(data => data.likes)) : 0;

  return (
    <>
      <SNSLayout 
        currentSNS="instagram"
        customTitle="投稿分析"
        customDescription="いいね数を記録して投稿パフォーマンスを分析しましょう"
      >
        <div className="max-w-4xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 左カラム: データ入力 */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">いいね数入力</h2>
                    <p className="text-sm text-gray-600">投稿のいいね数を記録してください</p>
                  </div>
                </div>

                {/* いいね数入力 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Heart size={16} className="inline mr-1 text-red-500" />
                    いいね数
                  </label>
                  <input
                    type="number"
                    value={inputData.likes}
                    onChange={(e) => setInputData(prev => ({ ...prev, likes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="245"
                  />
                </div>

                {/* 投稿日 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar size={16} className="inline mr-1" />
                    投稿日
                  </label>
                  <input
                    type="date"
                    value={inputData.publishedAt}
                    onChange={(e) => setInputData(prev => ({ ...prev, publishedAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* 保存ボタン */}
                <button
                  onClick={handleSaveLikes}
                  disabled={isLoading || !inputData.likes}
                  className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />
                      いいね数を保存
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 右カラム: 分析結果 */}
            <div className="space-y-6">
              
              {/* 統計サマリー */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center mr-3">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">統計サマリー</h2>
                    <p className="text-sm text-gray-600">記録されたデータの分析結果</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <Heart className="w-6 h-6 text-red-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{totalLikes.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">総いいね数</div>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{avgLikes.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">平均いいね数</div>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{maxLikes.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">最高いいね数</div>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Calendar className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{analyticsData.length}</div>
                    <div className="text-xs text-gray-600">記録投稿数</div>
                  </div>
                </div>
              </div>

              {/* 最近の記録 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">最近の記録</h2>
                    <p className="text-sm text-gray-600">最新のいいね数記録</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {analyticsData.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-4xl mb-2">📊</div>
                      <p className="text-gray-600">まだデータがありません</p>
                      <p className="text-sm text-gray-500">いいね数を入力して記録を開始しましょう</p>
                    </div>
                  ) : (
                    analyticsData.slice(0, 5).map((data) => (
                      <div key={data.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <Heart className="w-4 h-4 text-red-500 mr-2" />
                          <div>
                            <div className="font-medium text-gray-900">{data.likes.toLocaleString()}いいね</div>
                            <div className="text-xs text-gray-500">
                              {new Date(data.publishedAt).toLocaleDateString('ja-JP')}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(data.createdAt).toLocaleDateString('ja-JP')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SNSLayout>

      {/* AIチャットウィジェット */}
      <AIChatWidget 
        contextData={{
          posts: [],
          planData: null,
          monthlyStats: {
            totalPosts: analyticsData.length,
            totalLikes: totalLikes,
            totalComments: 0,
            totalShares: 0,
            avgEngagement: avgLikes
          }
        }}
      />
    </>
  );
}

export default function InstagramAnalyticsPage() {
  return (
    <AuthGuard>
      <InstagramAnalyticsContent />
    </AuthGuard>
  );
}