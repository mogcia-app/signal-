'use client';

import React, { useState, useEffect } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Users, 
  BarChart3, 
  Lightbulb, 
  Clock,
  MessageCircle,
  Heart,
  CheckCircle,
  Info,
  Sparkles
} from 'lucide-react';

interface LearningMetric {
  id: string;
  category: string;
  title: string;
  description: string;
  currentValue: number;
  targetValue: number;
  progress: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  color: string;
}

interface UserProfile {
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredContentTypes: string[];
  postingFrequency: 'low' | 'medium' | 'high';
  engagementStyle: 'conservative' | 'balanced' | 'aggressive';
  goals: string[];
  industry: string;
  targetAudience: string;
}

interface AILearningData {
  totalInteractions: number;
  successfulPredictions: number;
  personalizationScore: number;
  learningPhases: string[];
  insightsGenerated: number;
  recommendationsAccepted: number;
}

export default function InstagramAILearningPage() {
  const [learningMetrics, setLearningMetrics] = useState<LearningMetric[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [aiLearningData, setAiLearningData] = useState<AILearningData | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'profile' | 'insights' | 'progress'>('overview');

  useEffect(() => {
    // モックデータの初期化
    initializeMockData();
  }, []);

  const initializeMockData = () => {
    // 学習メトリクス
    const metrics: LearningMetric[] = [
      {
        id: '1',
        category: 'エンゲージメント',
        title: 'エンゲージメント率予測精度',
        description: 'AIが投稿のエンゲージメント率を予測する精度',
        currentValue: 78,
        targetValue: 90,
        progress: 78,
        trend: 'up',
        icon: <Heart className="w-5 h-5" />,
        color: 'text-red-500'
      },
      {
        id: '2',
        category: 'タイミング',
        title: '最適投稿時間予測',
        description: 'ユーザーの最適な投稿時間を予測する精度',
        currentValue: 85,
        targetValue: 95,
        progress: 85,
        trend: 'up',
        icon: <Clock className="w-5 h-5" />,
        color: 'text-blue-500'
      },
      {
        id: '3',
        category: 'コンテンツ',
        title: 'コンテンツタイプ最適化',
        description: 'ユーザーに最適なコンテンツタイプを提案する精度',
        currentValue: 72,
        targetValue: 85,
        progress: 72,
        trend: 'stable',
        icon: <BarChart3 className="w-5 h-5" />,
        color: 'text-green-500'
      },
      {
        id: '4',
        category: 'ハッシュタグ',
        title: 'ハッシュタグ効果予測',
        description: 'ハッシュタグの効果を予測する精度',
        currentValue: 69,
        targetValue: 80,
        progress: 69,
        trend: 'up',
        icon: <MessageCircle className="w-5 h-5" />,
        color: 'text-purple-500'
      },
      {
        id: '5',
        category: '成長',
        title: 'フォロワー成長予測',
        description: 'フォロワー増加を予測する精度',
        currentValue: 81,
        targetValue: 90,
        progress: 81,
        trend: 'up',
        icon: <Users className="w-5 h-5" />,
        color: 'text-orange-500'
      },
      {
        id: '6',
        category: 'パーソナライゼーション',
        title: '個人化レベル',
        description: 'ユーザーの個人的な好みを理解する度合い',
        currentValue: 65,
        targetValue: 95,
        progress: 65,
        trend: 'up',
        icon: <Brain className="w-5 h-5" />,
        color: 'text-indigo-500'
      }
    ];

    // ユーザープロファイル
    const profile: UserProfile = {
      experienceLevel: 'intermediate',
      preferredContentTypes: ['リール', 'ストーリーズ', 'フィード'],
      postingFrequency: 'medium',
      engagementStyle: 'balanced',
      goals: ['フォロワー増加', 'エンゲージメント向上', 'ブランド認知度向上'],
      industry: 'ライフスタイル・美容',
      targetAudience: '20-30代女性'
    };

    // AI学習データ
    const aiData: AILearningData = {
      totalInteractions: 247,
      successfulPredictions: 198,
      personalizationScore: 78,
      learningPhases: ['基本パターン学習', '個人嗜好分析', '高度な予測モデル'],
      insightsGenerated: 156,
      recommendationsAccepted: 89
    };

    setLearningMetrics(metrics);
    setUserProfile(profile);
    setAiLearningData(aiData);
  };

  const getExperienceLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getExperienceLevelIcon = (level: string) => {
    switch (level) {
      case 'beginner': return '🌱';
      case 'intermediate': return '🌿';
      case 'advanced': return '🌳';
      default: return '📊';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
      case 'stable': return <div className="w-4 h-4 bg-yellow-500 rounded-full" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'from-green-500 to-green-600';
    if (progress >= 60) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  return (
    <SNSLayout 
      currentSNS="instagram"
      customTitle="AI学習進捗"
      customDescription="AIの学習状況とパーソナライゼーション進捗"
    >
      <div className="max-w-6xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI学習進捗</h1>
              <p className="text-gray-600">あなた専用のAIがどれだけ成長しているか確認しましょう</p>
            </div>
          </div>
          
          {/* タブナビゲーション */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { id: 'overview', label: '概要', icon: <BarChart3 className="w-4 h-4" /> },
              { id: 'profile', label: 'プロファイル', icon: <Users className="w-4 h-4" /> },
              { id: 'insights', label: 'インサイト', icon: <Lightbulb className="w-4 h-4" /> },
              { id: 'progress', label: '進捗詳細', icon: <TrendingUp className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as 'overview' | 'profile' | 'insights' | 'progress')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  selectedTab === tab.id
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* コンテンツエリア */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* 学習状況サマリー */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm text-gray-500">総インタラクション</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {aiLearningData?.totalInteractions || 0}
                </div>
                <p className="text-sm text-gray-600">AIとの対話回数</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm text-gray-500">予測精度</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {aiLearningData ? Math.round((aiLearningData.successfulPredictions / aiLearningData.totalInteractions) * 100) : 0}%
                </div>
                <p className="text-sm text-gray-600">成功予測率</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm text-gray-500">個人化スコア</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {aiLearningData?.personalizationScore || 0}%
                </div>
                <p className="text-sm text-gray-600">あなたらしさの理解度</p>
              </div>
            </div>

            {/* 学習メトリクス */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">学習メトリクス</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {learningMetrics.map((metric) => (
                  <div key={metric.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${metric.color} bg-opacity-10`}>
                          {metric.icon}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{metric.title}</h3>
                          <p className="text-sm text-gray-500">{metric.category}</p>
                        </div>
                      </div>
                      {getTrendIcon(metric.trend)}
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{metric.currentValue}%</span>
                        <span className="text-gray-500">目標: {metric.targetValue}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 bg-gradient-to-r ${getProgressColor(metric.progress)} rounded-full transition-all duration-500`}
                          style={{ width: `${metric.progress}%` }}
                        />
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600">{metric.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'profile' && userProfile && (
          <div className="space-y-6">
            {/* ユーザープロファイル */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">あなたのプロファイル</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">経験レベル</h3>
                    <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getExperienceLevelColor(userProfile.experienceLevel)}`}>
                      <span className="mr-2">{getExperienceLevelIcon(userProfile.experienceLevel)}</span>
                      {userProfile.experienceLevel === 'beginner' && 'ビギナー'}
                      {userProfile.experienceLevel === 'intermediate' && 'インターミディエート'}
                      {userProfile.experienceLevel === 'advanced' && 'アドバンス'}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">業界</h3>
                    <p className="text-gray-600">{userProfile.industry}</p>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">ターゲットオーディエンス</h3>
                    <p className="text-gray-600">{userProfile.targetAudience}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">好みのコンテンツタイプ</h3>
                    <div className="flex flex-wrap gap-2">
                      {userProfile.preferredContentTypes.map((type, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">投稿頻度</h3>
                    <p className="text-gray-600">
                      {userProfile.postingFrequency === 'low' && '低頻度（週1-2回）'}
                      {userProfile.postingFrequency === 'medium' && '中頻度（週3-5回）'}
                      {userProfile.postingFrequency === 'high' && '高頻度（週6-7回）'}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">エンゲージメントスタイル</h3>
                    <p className="text-gray-600">
                      {userProfile.engagementStyle === 'conservative' && '保守的'}
                      {userProfile.engagementStyle === 'balanced' && 'バランス型'}
                      {userProfile.engagementStyle === 'aggressive' && '積極的'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="font-medium text-gray-900 mb-3">目標</h3>
                <div className="flex flex-wrap gap-2">
                  {userProfile.goals.map((goal, index) => (
                    <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      {goal}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'insights' && (
          <div className="space-y-6">
            {/* AIインサイト */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">AIが学習したあなたの特徴</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Lightbulb className="w-5 h-5 text-blue-600 mr-2" />
                    <h3 className="font-medium text-blue-900">投稿パターン</h3>
                  </div>
                  <p className="text-blue-800 text-sm">
                    あなたは平日の夕方（18-20時）に投稿すると、エンゲージメント率が平均より15%高くなる傾向があります。
                  </p>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Heart className="w-5 h-5 text-green-600 mr-2" />
                    <h3 className="font-medium text-green-900">コンテンツ好み</h3>
                  </div>
                  <p className="text-green-800 text-sm">
                    リール投稿が特に効果的で、ストーリーズとの組み合わせでリーチが最大30%向上します。
                  </p>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <MessageCircle className="w-5 h-5 text-purple-600 mr-2" />
                    <h3 className="font-medium text-purple-900">ハッシュタグ戦略</h3>
                  </div>
                  <p className="text-purple-800 text-sm">
                    業界特化ハッシュタグとトレンドハッシュタグの組み合わせが最も効果的です。
                  </p>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Users className="w-5 h-5 text-orange-600 mr-2" />
                    <h3 className="font-medium text-orange-900">オーディエンス理解</h3>
                  </div>
                  <p className="text-orange-800 text-sm">
                    20-30代女性がメインオーディエンスで、ライフスタイル系コンテンツへの反応が高いです。
                  </p>
                </div>
              </div>
            </div>

            {/* 学習フェーズ */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">学習フェーズ</h2>
              
              <div className="space-y-4">
                {aiLearningData?.learningPhases.map((phase, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{phase}</h3>
                      <p className="text-sm text-gray-600">
                        {index === 0 && 'AIが基本的な投稿パターンとエンゲージメントの関係を学習中'}
                        {index === 1 && 'あなたの個人的な好みと行動パターンを分析中'}
                        {index === 2 && '高度な予測モデルでより精密な提案を生成中'}
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'progress' && (
          <div className="space-y-6">
            {/* 詳細進捗 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">詳細進捗レポート</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">生成されたインサイト</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">総インサイト数</span>
                      <span className="font-medium text-gray-900">{aiLearningData?.insightsGenerated || 0}件</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">採用された提案</span>
                      <span className="font-medium text-gray-900">{aiLearningData?.recommendationsAccepted || 0}件</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">採用率</span>
                      <span className="font-medium text-green-600">
                        {aiLearningData ? Math.round((aiLearningData.recommendationsAccepted / aiLearningData.insightsGenerated) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-4">学習データ</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">分析した投稿数</span>
                      <span className="font-medium text-gray-900">247件</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">学習期間</span>
                      <span className="font-medium text-gray-900">45日</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">データ品質</span>
                      <span className="font-medium text-green-600">高品質</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 次の学習目標 */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">次の学習目標</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center mb-2">
                    <Target className="w-5 h-5 text-purple-600 mr-2" />
                    <h3 className="font-medium text-gray-900">短期目標</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    個人化スコアを85%まで向上させる
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center mb-2">
                    <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
                    <h3 className="font-medium text-gray-900">中期目標</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    予測精度を95%まで向上させる
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center mb-2">
                    <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
                    <h3 className="font-medium text-gray-900">長期目標</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    完全パーソナライズされたAIアシスタント
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SNSLayout>
  );
}
