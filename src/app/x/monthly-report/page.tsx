'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { XChatWidget } from '../../../components/x-chat-widget';
import { useAuth } from '../../../contexts/auth-context';
import { useXPlanData } from '../../../hooks/useXPlanData';
import { PlanCard } from '../../../components/PlanCard';
import { BarChart3 } from 'lucide-react';

// コンポーネントのインポート
import { MetricsCards } from './components/MetricsCards';
import { DetailedStats } from './components/DetailedStats';
import { TopPosts } from './components/TopPosts';
import { GrowthTrendAnalysis } from './components/GrowthTrendAnalysis';
import { ActionPlan } from './components/ActionPlan';

// X用のデータ型定義
interface XMonthlyReportData {
  period: 'weekly' | 'monthly';
  date: string;
  totals: {
    totalLikes: number;
    totalRetweets: number;
    totalComments: number;
    totalSaves: number;
    totalImpressions: number;
    totalEngagements: number;
    totalPosts: number;
    totalFollowers: number;
  };
  previousTotals?: {
    totalLikes: number;
    totalRetweets: number;
    totalComments: number;
    totalSaves: number;
    totalImpressions: number;
    totalEngagements: number;
    totalPosts: number;
    totalFollowers: number;
  };
  weeklyTrend?: Array<{
    period: string;
    likes: number;
    retweets: number;
    comments: number;
    impressions: number;
    followers: number;
  }>;
  engagement: {
    engagementRate: number;
    likeRate: number;
    retweetRate: number;
    replyRate: number;
  };
  reachSourceAnalysis: {
    sources: {
      home: number;
      profile: number;
      explore: number;
      search: number;
      other: number;
    };
    followers: {
      followers: number;
      nonFollowers: number;
    };
  };
  topPosts: Array<{
    id: string;
    title?: string;
    content?: string;
    hashtags?: string;
    likes: number;
    retweets: number;
    comments: number;
    saves: number;
    impressions: number;
    engagements: number;
    createdAt: string;
  }>;
}

export default function XMonthlyReportPage() {
  const { user } = useAuth();
  const { planData } = useXPlanData();
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('monthly');
  const [selectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM形式
  );
  const [selectedWeek] = useState<string>(
    `${new Date().getFullYear()}-W${Math.ceil(new Date().getDate() / 7).toString().padStart(2, '0')}`
  );
  const [reportData, setReportData] = useState<XMonthlyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 月次レポートデータを取得
  const fetchReportData = useCallback(async (period: 'weekly' | 'monthly', date: string) => {
    if (!user?.uid) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('X月次レポートデータ取得開始:', { userId: user.uid, period, date });

      // X月次レポートAPIを呼び出し
      const response = await fetch(`/api/x/monthly-report?userId=${user.uid}&period=${period}&date=${date}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch X monthly report data');
      }

      console.log('X月次レポートデータ取得完了:', data);
      setReportData(data);
    } catch (error) {
      console.error('X月次レポートデータ取得エラー:', error);
      setError('データの取得に失敗しました');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchReportData(activeTab, activeTab === 'monthly' ? selectedMonth : selectedWeek);
    }
  }, [user, activeTab, selectedMonth, selectedWeek, fetchReportData]);

  if (loading) {
    return (
      <SNSLayout currentSNS="x">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </SNSLayout>
    );
  }

  if (error) {
    return (
      <SNSLayout currentSNS="x">
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
        </div>
      </SNSLayout>
    );
  }

  return (
    <SNSLayout currentSNS="x">
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">月次レポート</h1>
              <p className="text-gray-600">Xアカウントのパフォーマンス分析</p>
            </div>
          </div>
          
          {/* タブ切り替え */}
          <div className="flex space-x-1 bg-white p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              月次
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'weekly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              週次
            </button>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-900">データ取得エラー</h3>
                <p className="text-red-700">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    if (user) {
                      fetchReportData(activeTab, activeTab === 'monthly' ? selectedMonth : selectedWeek);
                    }
                  }}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  再試行
                </button>
              </div>
            </div>
          </div>
        )}

        {/* データなし表示 */}
        {!loading && !error && !reportData && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
            <div className="p-3 bg-gray-100 rounded-lg w-fit mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">データがありません</h3>
            <p className="text-gray-600 mb-4">
              {activeTab === 'monthly' ? '今月の' : '今週の'}分析データが見つかりませんでした。
              <br />
              まずはX analyticsページでデータを入力してください。
            </p>
            <a
              href="/x/analytics"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              データを入力する
            </a>
          </div>
        )}

        {/* 運用計画 */}
        {planData && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">X成長計画</h2>
            <PlanCard planData={planData} />
          </div>
        )}

        {/* メトリクスカード */}
        {reportData && (
          <MetricsCards 
            totals={reportData.totals}
            engagement={reportData.engagement}
          />
        )}

        {/* 成長トレンド分析 */}
        {reportData && (
          <GrowthTrendAnalysis 
            currentData={reportData.totals}
            previousData={reportData.previousTotals}
            weeklyTrend={reportData.weeklyTrend}
          />
        )}

        {/* 詳細統計 */}
        {reportData && (
          <DetailedStats 
            totals={reportData.totals}
          />
        )}


        {/* アクションプラン */}
        {reportData && (
          <ActionPlan 
            currentData={{
              ...reportData.totals,
              engagementRate: reportData.engagement.engagementRate
            }}
            previousData={reportData.previousTotals ? {
              ...reportData.previousTotals,
              engagementRate: 0 // 前月のエンゲージメント率は計算しない
            } : undefined}
          />
        )}

        {/* トップ投稿 */}
        {reportData && (
          <TopPosts 
            topPosts={reportData.topPosts}
          />
        )}
      </div>

      {/* AIチャットウィジェット */}
      <XChatWidget />
    </SNSLayout>
  );
}
