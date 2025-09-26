'use client';

import React from 'react';
import SNSLayout from '../../../components/sns-layout';
import { AIChatWidget } from '../../../components/ai-chat-widget';
import { 
  BarChart3,
  Target,
  TrendingUp
} from 'lucide-react';

export default function InstagramAnalyticsPage() {
  return (
    <>
      <SNSLayout 
        currentSNS="instagram"
        customTitle="投稿分析"
        customDescription="投稿パフォーマンスを分析し、改善点を見つけましょう"
      >
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-12 h-12 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">投稿分析機能</h1>
            <p className="text-lg text-gray-600 mb-8">
              投稿のパフォーマンス分析機能は現在開発中です。
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">エンゲージメント分析</h3>
                <p className="text-sm text-gray-600">
                  いいね、コメント、シェアなどのエンゲージメントデータを詳細に分析します。
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">成長トレンド</h3>
                <p className="text-sm text-gray-600">
                  フォロワー数やリーチ数の成長パターンを可視化します。
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">目標達成</h3>
                <p className="text-sm text-gray-600">
                  設定した目標に対する進捗状況を追跡・分析します。
                </p>
              </div>
            </div>
            
            <div className="mt-8">
              <button
                onClick={() => window.location.href = '/instagram/plan'}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Target className="w-5 h-5 mr-2" />
                運用計画を立てる
              </button>
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
            totalPosts: 0,
            totalLikes: 0,
            totalComments: 0,
            totalShares: 0,
            avgEngagement: 0
          }
        }}
      />
    </>
  );
}