'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { AIChatWidget } from '../../../components/ai-chat-widget';
import { AuthGuard } from '../../../components/auth-guard';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/auth-context';
import { 
  BarChart3,
  Heart,
  Save,
  Calendar,
  RefreshCw
} from 'lucide-react';

// 投稿分析データの型定義
interface AnalyticsData {
  id: string;
  userId: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagementRate: number;
  publishedAt: Date;
  createdAt: Date;
}

function InstagramAnalyticsContent() {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputData, setInputData] = useState({
    likes: '',
    comments: '',
    shares: '',
    reach: '',
    publishedAt: new Date().toISOString().split('T')[0]
  });

  // 分析データを取得（直接Firestoreアクセス）
  const fetchAnalytics = useCallback(async () => {
    console.log('Fetch analytics called, user:', user);
    console.log('User UID:', user?.uid);
    if (!user?.uid) {
      console.log('User not authenticated, skipping analytics fetch');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Fetching analytics directly from Firestore for user:', user.uid);
      const q = query(
        collection(db, 'analytics'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AnalyticsData[];
      console.log('Direct Firestore fetch result:', data);
      console.log('Analytics data length:', data.length);
      console.log('Sample analytics data:', data[0]);
      console.log('All analytics data:', data.map(item => ({
        id: item.id,
        likes: item.likes,
        userId: item.userId,
        publishedAt: item.publishedAt
      })));
      setAnalyticsData(data);
    } catch (error) {
      console.error('Analytics fetch error:', error);
      setAnalyticsData([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // 投稿分析データを保存（直接Firestoreアクセス）
  const handleSaveAnalytics = async () => {
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
      const likes = parseInt(inputData.likes) || 0;
      const comments = parseInt(inputData.comments) || 0;
      const shares = parseInt(inputData.shares) || 0;
      const reach = parseInt(inputData.reach) || 0;
      
      // エンゲージメント率の計算
      const engagementRate = reach > 0 ? ((likes + comments + shares) / reach * 100).toFixed(2) : 0;

      const analyticsPayload = {
        userId: user.uid,
        likes,
        comments,
        shares,
        reach,
        engagementRate: parseFloat(engagementRate),
        publishedAt: new Date(inputData.publishedAt),
        createdAt: new Date()
      };

      console.log('Saving analytics data directly to Firestore:', analyticsPayload);
      console.log('User UID:', user.uid);
      console.log('Analytics payload validation:', {
        userId: analyticsPayload.userId,
        likes: analyticsPayload.likes,
        publishedAt: analyticsPayload.publishedAt,
        createdAt: analyticsPayload.createdAt
      });
      const docRef = await addDoc(collection(db, 'analytics'), analyticsPayload);
      console.log('Analytics saved with ID:', docRef.id);

      alert('投稿分析データを保存しました！');
      
      // データを再取得
      await fetchAnalytics();

      // 入力データをリセット
      setInputData({
        likes: '',
        comments: '',
        shares: '',
        reach: '',
        publishedAt: new Date().toISOString().split('T')[0]
      });

    } catch (error) {
      console.error('保存エラー:', error);
      alert(`保存に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 統計計算
  const totalLikes = analyticsData.reduce((sum, data) => sum + data.likes, 0);
  const totalComments = analyticsData.reduce((sum, data) => sum + data.comments, 0);
  const totalShares = analyticsData.reduce((sum, data) => sum + data.shares, 0);
  const totalReach = analyticsData.reduce((sum, data) => sum + data.reach, 0);
  const avgEngagementRate = analyticsData.length > 0 
    ? analyticsData.reduce((sum, data) => sum + data.engagementRate, 0) / analyticsData.length 
    : 0;
  
  // デバッグログ
  console.log('Statistics calculation debug:', {
    analyticsDataLength: analyticsData.length,
    analyticsData: analyticsData,
    totalLikes: totalLikes,
    totalComments: totalComments,
    totalShares: totalShares,
    totalReach: totalReach,
    avgEngagementRate: avgEngagementRate
  });

  return (
    <>
      <SNSLayout 
        currentSNS="instagram"
        customTitle="投稿分析"
        customDescription="投稿の分析データを入力・管理します"
      >
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">投稿分析データ入力</h2>
                <p className="text-sm text-gray-600">投稿の分析データを入力してください</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Heart size={16} className="inline mr-1 text-red-500" />
                  いいね数
                </label>
                <input
                  type="number"
                  value={inputData.likes}
                  onChange={(e) => setInputData(prev => ({ ...prev, likes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 245"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  💬 コメント数
                </label>
                <input
                  type="number"
                  value={inputData.comments}
                  onChange={(e) => setInputData(prev => ({ ...prev, comments: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 12"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🔄 シェア数
                </label>
                <input
                  type="number"
                  value={inputData.shares}
                  onChange={(e) => setInputData(prev => ({ ...prev, shares: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 8"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  👁️ リーチ数
                </label>
                <input
                  type="number"
                  value={inputData.reach}
                  onChange={(e) => setInputData(prev => ({ ...prev, reach: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 1200"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar size={16} className="inline mr-1" />
                投稿日
              </label>
              <input
                type="date"
                value={inputData.publishedAt}
                onChange={(e) => setInputData(prev => ({ ...prev, publishedAt: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleSaveAnalytics}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    保存中...
                  </>
                    ) : (
                      <>
                        <Save size={16} className="mr-2" />
                        分析データを保存
                      </>
                    )}
              </button>
                  <button
                    onClick={() => {
                      setInputData({
                        likes: '',
                        comments: '',
                        shares: '',
                        reach: '',
                        publishedAt: new Date().toISOString().split('T')[0]
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw size={16} />
                  </button>
            </div>
          </div>

              {/* 統計表示 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">投稿分析統計</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{totalLikes.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">総いいね数</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{totalComments.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">総コメント数</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{totalShares.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">総シェア数</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{totalReach.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">総リーチ数</div>
                  </div>
                </div>
                <div className="mt-4 text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold text-gray-900">{avgEngagementRate.toFixed(2)}%</div>
                  <div className="text-sm text-gray-600">平均エンゲージメント率</div>
                </div>
              </div>

              {/* 最近の記録 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">最近の記録</h3>
                {analyticsData.length === 0 ? (
                  <p className="text-gray-600 text-center">まだ記録がありません。</p>
                ) : (
                  <div className="space-y-3">
                    {analyticsData.slice(0, 5).map((data) => (
                      <div key={data.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-700 font-medium">
                            {new Date(data.publishedAt).toLocaleDateString('ja-JP')}
                          </span>
                          <span className="text-sm text-gray-500">
                            エンゲージメント率: {data.engagementRate.toFixed(2)}%
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div className="text-center">
                            <div className="text-red-600 font-semibold">{data.likes}</div>
                            <div className="text-gray-500">いいね</div>
                          </div>
                          <div className="text-center">
                            <div className="text-blue-600 font-semibold">{data.comments}</div>
                            <div className="text-gray-500">コメント</div>
                          </div>
                          <div className="text-center">
                            <div className="text-green-600 font-semibold">{data.shares}</div>
                            <div className="text-gray-500">シェア</div>
                          </div>
                          <div className="text-center">
                            <div className="text-purple-600 font-semibold">{data.reach}</div>
                            <div className="text-gray-500">リーチ</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
        </div>
      </SNSLayout>

      <AIChatWidget 
        contextData={{
          totalLikes: totalLikes,
          totalComments: totalComments,
          totalShares: totalShares,
          totalReach: totalReach,
          avgEngagementRate: avgEngagementRate,
          recordedPosts: analyticsData.length
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