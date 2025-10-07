'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { AIChatWidget } from '../../../components/ai-chat-widget';
import { useAuth } from '../../../contexts/auth-context';
import { useXPlanData } from '../../../hooks/useXPlanData';
import { PlanCard } from '../../../components/PlanCard';
import { BarChart3, Calendar, Users, MessageCircle, Heart, Repeat2, Eye, MousePointer } from 'lucide-react';

// X用のデータ型定義
interface XMonthlyReportData {
  overview: {
    tweets: number;
    followers: number;
    following: number;
    impressions: number;
    profileViews: number;
    mentions: number;
  };
  engagement: {
    engagementRate: number;
    avgEngagementRate: number;
    retweetRate: number;
    likeRate: number;
    replyRate: number;
    clickRate: number;
  };
  audience: {
    gender: {
      male: number;
      female: number;
      other: number;
    };
    age: {
      '13-17': number;
      '18-24': number;
      '25-34': number;
      '35-44': number;
      '45-54': number;
      '55-64': number;
      '65+': number;
    };
  };
  topPosts: unknown[];
  recentPosts: unknown[];
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
  const fetchReportData = useCallback(async (_period: 'weekly' | 'monthly', _date: string) => {
    if (!user?.uid) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 現在はダミーデータを使用（後でAPI実装）
      const dummyData: XMonthlyReportData = {
        overview: {
          tweets: 156,
          followers: 2847,
          following: 892,
          impressions: 45620,
          profileViews: 1234,
          mentions: 67,
        },
        engagement: {
          engagementRate: 4.2,
          avgEngagementRate: 3.8,
          retweetRate: 2.1,
          likeRate: 5.8,
          replyRate: 1.2,
          clickRate: 3.4,
        },
        audience: {
          gender: {
            male: 65,
            female: 32,
            other: 3,
          },
          age: {
            '13-17': 5,
            '18-24': 28,
            '25-34': 35,
            '35-44': 20,
            '45-54': 8,
            '55-64': 3,
            '65+': 1,
          },
        },
        topPosts: [],
        recentPosts: [],
      };
      
      setReportData(dummyData);
    } catch (error) {
      console.error('X月次レポートデータ取得エラー:', error);
      setError('データの取得に失敗しました');
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

        {/* 運用計画 */}
        {planData && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">X成長計画</h2>
            <PlanCard planData={planData} />
          </div>
        )}

        {/* オーバービュー統計 */}
        {reportData && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{reportData.overview.tweets}</p>
                  <p className="text-sm text-gray-600">投稿数</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{reportData.overview.followers.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">フォロワー</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Eye className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{reportData.overview.impressions.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">インプレッション</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Heart className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{reportData.engagement.likeRate.toFixed(1)}%</p>
                  <p className="text-sm text-gray-600">いいね率</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Repeat2 className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{reportData.engagement.retweetRate.toFixed(1)}%</p>
                  <p className="text-sm text-gray-600">リツイート率</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <MousePointer className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{reportData.engagement.engagementRate.toFixed(1)}%</p>
                  <p className="text-sm text-gray-600">エンゲージメント率</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 開発中メッセージ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-orange-100 mb-6">
              <Calendar className="h-10 w-10 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              詳細分析機能は開発中です
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              より詳細な分析機能（グラフ、トレンド分析、AI分析など）を現在開発中です。
            </p>
          </div>
        </div>
      </div>

      {/* AIチャットウィジェット */}
      <AIChatWidget />
    </SNSLayout>
  );
}
