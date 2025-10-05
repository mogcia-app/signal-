'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { AIChatWidget } from '../../../components/ai-chat-widget';
import { useAuth } from '../../../contexts/auth-context';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Users, 
  BarChart3, 
  CheckCircle,
  Info,
  Sparkles
} from 'lucide-react';

interface LearningMetric {
  id: string;
  category: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  description: string;
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
  ragHitRate: number;
  learningPhase: 'initial' | 'learning' | 'optimized' | 'master';
  personalizedInsights: string[];
  recommendations: string[];
}

interface LearningProgress {
  userId: string;
  phase: 'initial' | 'learning' | 'optimized' | 'master';
  totalInteractions: number;
  ragHitCount: number;
  llmCallCount: number;
  totalTokensUsed: number;
  totalCost: number;
  tokensSaved: number;
  costSaved: number;
  averageQualityScore: number;
  lastUpdated: Date;
}

interface ChatLog {
  id: string;
  userId: string;
  pageType: string;
  message: string;
  response: string;
  timestamp: Date;
  contextData?: Record<string, unknown>;
}

interface AIOutputLog {
  id: string;
  userId: string;
  pageType: string;
  outputType: 'recommendation' | 'analysis' | 'insight' | 'strategy';
  title: string;
  content: string;
  timestamp: Date;
  contextData?: Record<string, unknown>;
}

export default function AILearningPage() {
  const { user } = useAuth();
  const [learningMetrics, setLearningMetrics] = useState<LearningMetric[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [aiLearningData, setAiLearningData] = useState<AILearningData | null>(null);
  const [learningProgress, setLearningProgress] = useState<LearningProgress | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'profile' | 'progress' | 'logs'>('overview');
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [aiOutputLogs, setAiOutputLogs] = useState<AIOutputLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  
  const userId = user?.uid || 'demo-user-123'; // 認証されたユーザーIDを使用

  // 実際のデータを取得
  const fetchRealData = useCallback(async () => {
    try {
      let progressData: { success: boolean; data: LearningProgress } | null = null;
      
      // 学習進捗を取得
      const progressResponse = await fetch(`/api/llm-optimization?userId=${userId}&action=progress`);
      if (progressResponse.ok) {
        progressData = await progressResponse.json();
        if (progressData && progressData.success) {
          setLearningProgress(progressData.data);
          
          // 学習進捗から学習メトリクスを生成
          const metrics: LearningMetric[] = [
            {
              id: '1',
              category: 'AI学習進捗',
              value: progressData.data.totalInteractions > 0 
                ? Math.round((progressData.data.ragHitCount / progressData.data.totalInteractions) * 100)
                : 0,
              target: 100,
              unit: '%',
              trend: 'up',
              description: 'RAGシステムの学習が順調に進んでいます'
            },
            {
              id: '2',
              category: 'データ活用率',
              value: progressData.data.totalInteractions > 0 
                ? Math.round((progressData.data.ragHitCount / progressData.data.totalInteractions) * 100)
                : 0,
              target: 100,
              unit: '%',
              trend: 'up',
              description: 'マスターコンテキストからのデータ活用が高効率'
            },
            {
              id: '3',
              category: '成功パターン',
              value: Math.min(Math.floor(progressData.data.totalInteractions / 5), 15),
              target: 15,
              unit: '個',
              trend: 'up',
              description: '学習済みパターンが蓄積され、提案精度が向上'
            }
          ];
          setLearningMetrics(metrics);
        }
      }

      // ユーザープロファイルを取得
      const profileResponse = await fetch(`/api/user/sns-profile?userId=${userId}`);
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData.success) {
          setUserProfile(profileData.profile);
        }
      }

      // AI学習データを取得（学習進捗から生成）
      if (progressData?.success) {
        const aiData: AILearningData = {
          totalInteractions: progressData.data.totalInteractions,
          ragHitRate: progressData.data.totalInteractions > 0 
            ? progressData.data.ragHitCount / progressData.data.totalInteractions 
            : 0,
          learningPhase: progressData.data.phase,
          personalizedInsights: [
            `総対話数: ${progressData.data.totalInteractions}回`,
            `RAGヒット率: ${Math.round((progressData.data.ragHitCount / progressData.data.totalInteractions) * 100)}%`,
            `学習フェーズ: ${getPhaseLabel(progressData.data.phase)}`
          ],
          recommendations: [
            'AIとの対話を継続して学習を促進しましょう',
            '過去の成功パターンを活用した戦略を試してください',
            'データが蓄積されるほど精度が向上します'
          ]
        };
        setAiLearningData(aiData);
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    }
  }, [userId]);

  // チャットログとAI出力履歴を取得
  const fetchLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      // チャットログを取得
      const chatResponse = await fetch(`/api/ai/chat?userId=${userId}&action=logs`);
      if (chatResponse.ok) {
        const chatData = await chatResponse.json();
        if (chatData.success) {
          setChatLogs(chatData.logs || []);
        }
      }

      // AI出力履歴を取得
      const outputResponse = await fetch(`/api/ai/output-logs?userId=${userId}`);
      if (outputResponse.ok) {
        const outputData = await outputResponse.json();
        if (outputData.success) {
          setAiOutputLogs(outputData.logs || []);
        }
      }
    } catch (error) {
      console.error('ログ取得エラー:', error);
      // エラー時は空のログを設定
      setChatLogs([]);
      setAiOutputLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [userId]);

  useEffect(() => {
    if (user?.uid) {
      // 実際のデータを取得
      fetchRealData();
      // ログを取得
      fetchLogs();
    }
  }, [user?.uid, fetchRealData, fetchLogs]);


  const getPhaseLabel = (phase: string) => {
    const labels = {
      'initial': '初期段階',
      'learning': '学習中',
      'optimized': '最適化済み',
      'master': 'マスター'
    };
    return labels[phase as keyof typeof labels] || phase;
  };

  const getPhaseColor = (phase: string) => {
    const colors = {
      'initial': 'bg-gray-100 text-gray-800',
      'learning': 'bg-blue-100 text-blue-800',
      'optimized': 'bg-green-100 text-green-800',
      'master': 'bg-purple-100 text-purple-800'
    };
    return colors[phase as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // AI学習進捗率を動的に算出
  const calculateLearningProgress = () => {
    if (!learningProgress) return 0;
    
    const ragHitRate = learningProgress.ragHitCount / learningProgress.totalInteractions;
    const qualityScore = learningProgress.averageQualityScore / 5.0;
    const dataUtilizationRate = 0.92; // マスターコンテキストからのデータ活用率
    
    // 総合指数として算出
    const progressRate = (ragHitRate * 0.4 + qualityScore * 0.4 + dataUtilizationRate * 0.2) * 100;
    return Math.min(Math.round(progressRate), 100);
  };

  // AI学習タイプを判定
  const getAILearningType = () => {
    if (!learningProgress) return { type: '初期型', description: 'データ収集中', color: 'text-gray-600' };
    
    const qualityScore = learningProgress.averageQualityScore;
    const ragHitRate = learningProgress.ragHitCount / learningProgress.totalInteractions;
    
    if (qualityScore >= 4.0 && ragHitRate >= 0.8) {
      return { type: '精密型', description: '高精度で安定した学習', color: 'text-purple-600' };
    } else if (qualityScore >= 3.5 && ragHitRate >= 0.6) {
      return { type: 'バランス型', description: '安定した学習パターン', color: 'text-blue-600' };
    } else if (qualityScore >= 3.0) {
      return { type: '挑戦型', description: '積極的な学習アプローチ', color: 'text-green-600' };
    } else {
      return { type: '学習中', description: 'データ蓄積段階', color: 'text-orange-600' };
    }
  };

  return (
    <SNSLayout 
      currentSNS="instagram"
      customTitle="AI学習進捗"
      customDescription="あなたのInstagram運用パターンを学習し、より良いAIサポートを提供します"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* タブナビゲーション */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 overflow-x-auto mb-8">
          {[
            { id: 'overview', label: '概要', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'profile', label: 'プロファイル', icon: <Users className="w-4 h-4" /> },
            { id: 'progress', label: '進捗詳細', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'logs', label: 'AIログ', icon: <Brain className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as 'overview' | 'profile' | 'progress' | 'logs')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors whitespace-nowrap ${
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

        {/* タブコンテンツ */}
        {/* 概要タブ */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* メトリクスカード */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {learningMetrics.map((metric) => (
                <div key={metric.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{metric.category}</h3>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      metric.trend === 'up' ? 'bg-green-100 text-green-800' :
                      metric.trend === 'down' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {metric.trend === 'up' ? '↗' : metric.trend === 'down' ? '↘' : '→'}
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {metric.value}{metric.unit}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(metric.value / metric.target) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">{metric.description}</p>
                </div>
              ))}
            </div>

            {/* AI学習進捗率（動的算出） */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Brain className="w-5 h-5 mr-2 text-purple-600" />
                AI学習進捗率
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-600 mb-2">
                    {calculateLearningProgress()}%
                  </div>
                  <div className="text-sm text-gray-600 mb-4">総合学習進捗</div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${calculateLearningProgress()}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    RAG効率 × 品質スコア × データ活用率の総合指数
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">AI学習タイプ</span>
                      <span className={`text-sm font-semibold ${getAILearningType().color}`}>
                        {getAILearningType().type}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {getAILearningType().description}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-pink-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">学習フェーズ</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPhaseColor(learningProgress?.phase || aiLearningData?.learningPhase || 'initial')}`}>
                        {getPhaseLabel(learningProgress?.phase || aiLearningData?.learningPhase || 'initial')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      現在の学習段階
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 学習進捗サマリー */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">学習進捗サマリー</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">総対話数</span>
                    <span className="font-semibold text-gray-900">
                      {learningProgress?.totalInteractions || aiLearningData?.totalInteractions || 0}回
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">RAGヒット率</span>
                    <span className="font-semibold text-gray-900">
                      {learningProgress ? Math.round(learningProgress.ragHitCount / learningProgress.totalInteractions * 100) : 
                       aiLearningData ? Math.round(aiLearningData.ragHitRate * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">平均品質スコア</span>
                    <span className="font-semibold text-gray-900">
                      {(learningProgress?.averageQualityScore || 0).toFixed(1)}/5.0
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">データ活用率</span>
                    <span className="font-semibold text-gray-900">0%</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">成功パターン</span>
                    <span className="font-semibold text-gray-900">0パターン</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">学習効率</span>
                    <span className="font-semibold text-gray-900">未開始</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RAGシステム効果 */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-green-600" />
                RAGシステム効果
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">0%</div>
                    <div className="text-sm text-gray-600">過去データ活用</div>
                    <div className="text-xs text-gray-500">RAGヒット率</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-1">0%</div>
                    <div className="text-sm text-gray-600">パーソナライゼーション</div>
                    <div className="text-xs text-gray-500">学習レベル</div>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  {/* RAG効率の円グラフ */}
                  <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                      {/* 背景円 */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                      />
                      {/* 進捗円 */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="url(#gradient)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - (learningProgress ? learningProgress.ragHitCount / learningProgress.totalInteractions : 0))}`}
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">0%</div>
                        <div className="text-xs text-gray-600">RAG効率</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* マスターコンテキスト概要 */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-indigo-600" />
                マスターコンテキスト概要
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600 mb-1">0</div>
                  <div className="text-sm text-gray-600">総戦略数</div>
                  <div className="text-xs text-gray-500">蓄積待ち</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">0%</div>
                  <div className="text-sm text-gray-600">データ活用率</div>
                  <div className="text-xs text-gray-500">学習開始前</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">0</div>
                  <div className="text-sm text-gray-600">成功パターン</div>
                  <div className="text-xs text-gray-500">学習待ち</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">v1.0</div>
                  <div className="text-sm text-gray-600">最新バージョン</div>
                  <div className="text-xs text-gray-500">初期状態</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* プロファイルタブ */}
        {selectedTab === 'profile' && userProfile && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">ユーザープロファイル</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">基本情報</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">経験レベル:</span>
                      <span className="font-medium">{userProfile.experienceLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">投稿頻度:</span>
                      <span className="font-medium">{userProfile.postingFrequency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">エンゲージメントスタイル:</span>
                      <span className="font-medium">{userProfile.engagementStyle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">業界:</span>
                      <span className="font-medium">{userProfile.industry}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ターゲット層:</span>
                      <span className="font-medium">{userProfile.targetAudience}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">好みと目標</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-600 text-sm">好みのコンテンツ:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {userProfile.preferredContentTypes.map((type, index) => (
                          <span key={index} className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">目標:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {userProfile.goals.map((goal, index) => (
                          <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                            {goal}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* 進捗詳細タブ */}
        {selectedTab === 'progress' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">詳細な学習進捗</h3>
              {learningProgress ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <Brain className="w-8 h-8 text-blue-600" />
                      <span className="text-sm text-blue-700 font-medium">総対話数</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-900 mb-2">
                      {learningProgress.totalInteractions}
                    </div>
                    <p className="text-sm text-blue-700">AIとの対話回数</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <TrendingUp className="w-8 h-8 text-green-600" />
                      <span className="text-sm text-green-700 font-medium">RAGヒット</span>
                    </div>
                    <div className="text-3xl font-bold text-green-900 mb-2">
                      {learningProgress.ragHitCount}
                    </div>
                    <p className="text-sm text-green-700">キャッシュから回答</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <Target className="w-8 h-8 text-purple-600" />
                      <span className="text-sm text-purple-700 font-medium">LLM呼び出し</span>
                    </div>
                    <div className="text-3xl font-bold text-purple-900 mb-2">
                      {learningProgress.llmCallCount}
                    </div>
                    <p className="text-sm text-purple-700">新規回答生成</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <Info className="w-8 h-8 text-orange-600" />
                      <span className="text-sm text-orange-700 font-medium">総トークン数</span>
                    </div>
                    <div className="text-3xl font-bold text-orange-900 mb-2">
                      {learningProgress.totalTokensUsed.toLocaleString()}
                    </div>
                    <p className="text-sm text-orange-700">使用したトークン総数</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <CheckCircle className="w-8 h-8 text-teal-600" />
                      <span className="text-sm text-teal-700 font-medium">品質スコア</span>
                    </div>
                    <div className="text-3xl font-bold text-teal-900 mb-2">
                      {learningProgress.averageQualityScore.toFixed(1)}
                    </div>
                    <p className="text-sm text-teal-700">平均品質評価</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <Target className="w-8 h-8 text-indigo-600" />
                      <span className="text-sm text-indigo-700 font-medium">RAG効率</span>
                    </div>
                    <div className="text-3xl font-bold text-indigo-900 mb-2">
                      {Math.round(learningProgress.ragHitCount / learningProgress.totalInteractions * 100)}%
                    </div>
                    <p className="text-sm text-indigo-700">過去データ活用率</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <TrendingUp className="w-8 h-8 text-emerald-600" />
                      <span className="text-sm text-emerald-700 font-medium">学習段階</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-900 mb-2">
                      {getPhaseLabel(learningProgress.phase)}
                    </div>
                    <p className="text-sm text-emerald-700">AI学習の進捗</p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <Brain className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">学習進捗データを読み込み中...</p>
                  <p className="text-sm mt-2">AIとの対話が始まると詳細な進捗が表示されます</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AIログタブ */}
        {selectedTab === 'logs' && (
          <div className="space-y-6">
            {/* マスターコンテキスト管理 */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Target className="w-5 h-5 mr-2 text-indigo-600" />
                マスターコンテキスト管理
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-indigo-200">
                    <h4 className="font-semibold text-indigo-900 mb-3">戦略データ管理</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">アクティブ戦略</span>
                        <span className="text-sm font-semibold text-indigo-600">0件</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">アーカイブ戦略</span>
                        <span className="text-sm font-semibold text-gray-600">0件</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">総戦略数</span>
                        <span className="text-sm font-semibold text-gray-900">0件</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <h4 className="font-semibold text-purple-900 mb-3">学習データ蓄積</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>戦略実行回数</span>
                          <span className="text-purple-600 font-medium">0回</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-purple-500 h-2 rounded-full" style={{width: '0%'}}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>成功パターン</span>
                          <span className="text-purple-600 font-medium">0パターン</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-purple-500 h-2 rounded-full" style={{width: '0%'}}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>KPI実績</span>
                          <span className="text-purple-600 font-medium">0件</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-purple-500 h-2 rounded-full" style={{width: '0%'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-3">バージョン管理</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">最新バージョン</span>
                        <span className="font-semibold text-blue-600">v1.0</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">更新日時</span>
                        <span className="text-gray-500">初期状態</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">履歴数</span>
                        <span className="text-gray-500">0件</span>
                      </div>
                    </div>
                    {/* 初期状態の説明 */}
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <div className="text-xs text-blue-800 font-medium mb-1">初期状態</div>
                      <div className="text-xs text-blue-700 space-y-1">
                        <div>• AI学習を開始してください</div>
                        <div>• 最初の戦略を実行してください</div>
                        <div>• データ蓄積が始まります</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-3">学習効果</h4>
                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 mb-1">0%</div>
                        <div className="text-sm text-gray-600">データ活用率</div>
                        <div className="text-xs text-gray-500">学習開始前</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600 mb-1">0</div>
                        <div className="text-sm text-gray-600">学習パターン</div>
                        <div className="text-xs text-gray-500">蓄積待ち</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>


            {/* チャットログセクション */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Brain className="w-5 h-5 mr-2 text-purple-600" />
                チャット履歴
              </h3>
              {isLoadingLogs ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">ログを読み込み中...</p>
                </div>
              ) : chatLogs.length > 0 ? (
                <div className="space-y-4">
                  {chatLogs.map((log) => (
                    <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">
                          {log.pageType === 'ai-learning' ? 'AI学習' : 
                           log.pageType === 'analytics' ? '投稿分析' : 
                           log.pageType === 'plan' ? '運用計画' : log.pageType}
                        </span>
                        <span className="text-xs text-gray-400">
                          {log.timestamp.toLocaleString('ja-JP')}
                        </span>
                      </div>
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-700 mb-1">質問:</p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{log.message}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">回答:</p>
                        <p className="text-sm text-gray-600 bg-purple-50 p-2 rounded">{log.response}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">チャット履歴がありません</p>
                  <p className="text-sm mt-2">AIとの対話が始まると履歴が表示されます</p>
                </div>
              )}
            </div>

            {/* AI出力履歴セクション */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
                AI提案履歴
              </h3>
              {isLoadingLogs ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">ログを読み込み中...</p>
                </div>
              ) : aiOutputLogs.length > 0 ? (
                <div className="space-y-4">
                  {aiOutputLogs.map((log) => (
                    <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            log.outputType === 'recommendation' ? 'bg-green-100 text-green-800' :
                            log.outputType === 'analysis' ? 'bg-blue-100 text-blue-800' :
                            log.outputType === 'insight' ? 'bg-purple-100 text-purple-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {log.outputType === 'recommendation' ? '推奨' :
                             log.outputType === 'analysis' ? '分析' :
                             log.outputType === 'insight' ? 'インサイト' : '戦略'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {log.pageType === 'ai-learning' ? 'AI学習' : 
                             log.pageType === 'analytics' ? '投稿分析' : 
                             log.pageType === 'plan' ? '運用計画' : log.pageType}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {log.timestamp.toLocaleString('ja-JP')}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">{log.title}</h4>
                      <p className="text-sm text-gray-600">{log.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">AI提案履歴がありません</p>
                  <p className="text-sm mt-2">AIからの提案が生成されると履歴が表示されます</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AIChatWidget 
        contextData={{
          learningPhase: learningProgress?.phase || aiLearningData?.learningPhase || 'initial',
          totalInteractions: learningProgress?.totalInteractions || aiLearningData?.totalInteractions || 0,
          ragHitRate: learningProgress ? Math.round(learningProgress.ragHitCount / learningProgress.totalInteractions * 100) : 
                     aiLearningData ? Math.round(aiLearningData.ragHitRate * 100) : 0,
          averageQualityScore: learningProgress?.averageQualityScore || 0,
          costSaved: learningProgress?.costSaved || 0,
          tokensSaved: learningProgress?.tokensSaved || 0,
          personalizedInsights: aiLearningData?.personalizedInsights || [],
          recommendations: aiLearningData?.recommendations || [],
          userProfile: userProfile
        }}
      />
    </SNSLayout>
  );
}