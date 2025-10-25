import React, { useState, useCallback } from 'react';
import { Brain, TrendingUp, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../../../../contexts/auth-context';

interface AIPredictionAnalysisProps {
  activeTab: 'weekly' | 'monthly';
  currentTotals: {
    totalFollowerChange: number;
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalReach: number;
  };
  accountScore: Record<string, unknown> | null;
  previousPeriodData: Record<string, unknown> | null;
  monthlyReview: Record<string, unknown> | null;
  performanceRating: {
    rating: string;
    color: string;
    bg: string;
    label: string;
  };
  selectedMonth?: string;
  selectedWeek?: string;
}

interface AIAnalysisResult {
  predictions: {
    followerGrowth: { weekly: number; monthly: number };
    engagementRate: number;
    optimalPostingTime: string;
  };
  insights: string[];
  recommendations: string[];
  summary: string;
  masterContext: {
    learningPhase: string;
    ragHitRate: number;
    totalInteractions: number;
    isOptimized: boolean;
  } | null;
  metadata: {
    period: string;
    date: string;
    dataPoints: number;
    analysisTimestamp: string;
  };
}

export const AIPredictionAnalysis: React.FC<AIPredictionAnalysisProps> = ({
  activeTab,
  currentTotals,
  accountScore,
  previousPeriodData,
  monthlyReview,
  performanceRating,
  selectedMonth,
  selectedWeek
}) => {
  const { user } = useAuth();
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasRunAnalysis, setHasRunAnalysis] = useState(false);

  // AI分析を実行
  const fetchAIAnalysis = useCallback(async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    setError(null);

    try {
      const period = activeTab;
      const date = activeTab === 'weekly' ? selectedWeek : selectedMonth;
      
      if (!date) {
        throw new Error('日付が指定されていません');
      }

      console.log('🤖 AI分析開始:', { userId: user.uid, period, date });

      const response = await fetch(`/api/ai/monthly-analysis?userId=${user.uid}&period=${period}&date=${date}`, {
        headers: {
          'x-user-id': user.uid,
        }
      });

      if (!response.ok) {
        throw new Error(`AI分析API エラー: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setAnalysisResult(result.data);
        setHasRunAnalysis(true);
        setIsExpanded(true);
        console.log('✅ AI分析完了:', result.data);
      } else {
        throw new Error(result.error || 'AI分析に失敗しました');
      }
    } catch (error) {
      console.error('❌ AI分析エラー:', error);
      setError(error instanceof Error ? error.message : 'AI分析に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, activeTab, selectedMonth, selectedWeek]);

  // AI分析実行ボタンのハンドラー
  const handleRunAnalysis = () => {
    setIsExpanded(true);
    fetchAIAnalysis();
  };

  // 分析結果を閉じる
  const handleCloseAnalysis = () => {
    setIsExpanded(false);
  };

  // 学習段階に応じた表示最適化
  const getOptimizedContent = () => {
    if (!analysisResult) return null;

    const { masterContext } = analysisResult;
    
    // 最適化された学習段階では簡潔な表示
    if (masterContext?.isOptimized) {
      return {
        showDetailedInsights: false,
        showDetailedRecommendations: false,
        summaryLength: 'short'
      };
    }
    
    // 初期段階では詳細な表示
    return {
      showDetailedInsights: true,
      showDetailedRecommendations: true,
      summaryLength: 'full'
    };
  };

  const optimizedContent = getOptimizedContent();

  return (
    <div className="mt-6 h-full">
      {/* AI予測分析 - 開閉式 */}
      <div className="bg-white rounded-none shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
        {/* ヘッダー部分 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-none flex items-center justify-center mr-3">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-black">AIまとめ</h2>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {analysisResult?.masterContext && (
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  <span className="text-xs text-orange-600 font-medium">
                    {analysisResult.masterContext.learningPhase === 'master' ? 'マスター' :
                     analysisResult.masterContext.learningPhase === 'optimized' ? '最適化済み' :
                     analysisResult.masterContext.learningPhase === 'learning' ? '学習中' : '初期段階'}
                  </span>
                </div>
              )}
              
              {!isExpanded ? (
                <button
                  onClick={handleRunAnalysis}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-none hover:from-orange-600 hover:to-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>分析中...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4" />
                      <span>AI分析を実行</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleCloseAnalysis}
                  className="flex items-center space-x-2 px-4 py-2 text-black hover:text-black hover:bg-gray-100 rounded-none transition-colors"
                >
                  <span>閉じる</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 分析結果部分 */}
        {isExpanded && (
          <div className="p-6 flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-orange-600 mr-2" />
                <span className="text-black">AI分析を実行中...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-none p-4">
                <div className="flex items-center">
                  <div className="w-5 h-5 text-red-600 mr-2">⚠️</div>
                  <span className="text-sm text-red-800">{error}</span>
                </div>
                <button
                  onClick={fetchAIAnalysis}
                  className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                >
                  再試行
                </button>
              </div>
            ) : analysisResult ? (
              <div className="space-y-6">
                {/* 今月/今週のまとめ - 横長表示 */}
                <div className="p-6 bg-gradient-to-r from-orange-50 to-orange-50 rounded-none border border-orange-200 w-full">
                  <div className="flex items-center mb-4">
                    <div className="w-6 h-6 text-orange-600 mr-2">📊</div>
                    <h3 className="text-lg font-semibold text-orange-900">
                      {activeTab === 'weekly' ? '今週のまとめ' : '今月のまとめ'}
                    </h3>
                  </div>
                  <div className="text-base text-orange-800 whitespace-pre-wrap leading-relaxed">
                    {typeof monthlyReview?.message === 'string' ? monthlyReview.message : 
                     analysisResult.summary || 'まとめを生成中...'}
                  </div>
                </div>

                {/* AI予測分析結果 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* フォロワー増加予測 */}
                  <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-none border border-green-200">
                    <div className="flex items-center mb-4">
                      <div className="w-6 h-6 text-blue-600 mr-2">👥</div>
                      <h3 className="text-lg font-semibold text-blue-900">フォロワー増加予測</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-base text-black">来週の予測</span>
                        <span className="text-2xl font-bold text-green-600">
                          +{analysisResult.predictions.followerGrowth.weekly}人
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-base text-black">来月の予測</span>
                        <span className="text-2xl font-bold text-green-600">
                          +{analysisResult.predictions.followerGrowth.monthly}人
                        </span>
                      </div>
                      <div className="text-xs text-black mt-4">
                        {analysisResult.masterContext?.isOptimized ? 
                          'AIによる予測' :
                          '現在の投稿ペースを基に予測'
                        }
                      </div>
                    </div>
                  </div>

                  {/* AI最適化提案 */}
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-none border border-orange-200">
                    <div className="flex items-center mb-3">
                      <TrendingUp className="w-5 h-5 text-orange-600 mr-2" />
                      <h3 className="font-semibold text-orange-900">AI最適化提案</h3>
                    </div>
                    <div className="space-y-2">
                      {optimizedContent?.showDetailedRecommendations ? (
                        analysisResult.recommendations.map((recommendation, index) => (
                          <div key={index} className="text-sm text-orange-800">
                            • {recommendation}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-orange-800">
                          • {analysisResult.recommendations[0]}
                        </div>
                      )}
                      <div className="text-xs text-black mt-2">
                        {analysisResult.masterContext?.isOptimized ? 
                          '学習済みパターンによる最適化提案' :
                          'AI分析による改善提案'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-black">
                <Brain className="w-16 h-16 mx-auto mb-4 text-black" />
                <p className="text-lg">AI分析を開始してください</p>
                <p className="text-sm mt-2">「AI分析を実行」ボタンをクリックして分析を開始します</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};