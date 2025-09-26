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

// シンプルな分析データの型定義
interface AnalyticsData {
  id: string;
  userId: string;
  likes: number;
  publishedAt: Date;
  createdAt: Date;
}

function InstagramAnalyticsContent() {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputData, setInputData] = useState({
    likes: '',
    publishedAt: new Date().toISOString().split('T')[0]
  });

  // 分析データを取得（直接Firestoreアクセス）
  const fetchAnalytics = useCallback(async () => {
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

  // いいね数を保存（直接Firestoreアクセス）
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
      const analyticsPayload = {
        userId: user.uid,
        likes: parseInt(inputData.likes),
        publishedAt: new Date(inputData.publishedAt),
        createdAt: new Date()
      };

      console.log('Saving analytics data directly to Firestore:', analyticsPayload);
      const docRef = await addDoc(collection(db, 'analytics'), analyticsPayload);
      console.log('Analytics saved with ID:', docRef.id);

      alert('いいね数を保存しました！');
      
      // データを再取得
      await fetchAnalytics();

      // 入力データをリセット
      setInputData({
        likes: '',
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
  const avgLikes = analyticsData.length > 0 ? (totalLikes / analyticsData.length).toFixed(1) : '0.0';
  const maxLikes = analyticsData.reduce((max, data) => Math.max(max, data.likes), 0);
  
  // デバッグログ
  console.log('Statistics calculation:', {
    analyticsDataLength: analyticsData.length,
    totalLikes,
    avgLikes,
    maxLikes,
    recordedPosts: analyticsData.length
  });

  return (
    <>
      <SNSLayout 
        currentSNS="instagram"
        customTitle="投稿分析 (シンプル版)"
        customDescription="いいね数を直接Firestoreに保存・取得します"
      >
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">いいね数入力</h2>
                <p className="text-sm text-gray-600">投稿のいいね数を入力してください</p>
              </div>
            </div>

            <div className="mb-4">
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
                    いいね数を保存
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setInputData({
                    likes: '',
                    publishedAt: new Date().toISOString().split('T')[0]
                  });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* 統計サマリー */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">いいね数統計</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{totalLikes.toLocaleString()}</div>
                <div className="text-xs text-gray-600">総いいね数</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{avgLikes}</div>
                <div className="text-xs text-gray-600">平均いいね数</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{maxLikes.toLocaleString()}</div>
                <div className="text-xs text-gray-600">最高いいね数</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{analyticsData.length}</div>
                <div className="text-xs text-gray-600">記録投稿数</div>
              </div>
            </div>
          </div>

          {/* 最近の記録 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">最近の記録</h3>
            {analyticsData.length === 0 ? (
              <p className="text-gray-600 text-center">まだ記録がありません。</p>
            ) : (
              <ul className="space-y-2">
                {analyticsData.slice(0, 5).map((data) => (
                  <li key={data.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <span className="text-gray-700">
                      {new Date(data.publishedAt).toLocaleDateString('ja-JP')}
                    </span>
                    <span className="font-semibold text-red-600">
                      <Heart size={16} className="inline mr-1" /> {data.likes.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SNSLayout>

      <AIChatWidget 
        contextData={{
          totalLikes: totalLikes,
          avgLikes: avgLikes,
          maxLikes: maxLikes,
          recordedPosts: analyticsData.length,
          latestRecords: analyticsData.slice(0, 3)
        }}
      />
      
      {/* デバッグ用の隠しログ */}
      {(() => {
        console.log('AIChatWidget contextData:', {
          totalLikes: totalLikes,
          avgLikes: avgLikes,
          maxLikes: maxLikes,
          recordedPosts: analyticsData.length,
          latestRecords: analyticsData.slice(0, 3)
        });
        return null;
      })()}
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