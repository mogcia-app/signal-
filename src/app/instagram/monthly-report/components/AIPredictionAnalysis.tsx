import React, { useState, useCallback } from 'react';
import { Brain, Zap, TrendingUp, BarChart3, Target, Loader2, Sparkles } from 'lucide-react';
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
    <div className="mt-6">
      {/* AI予測分析 - 開閉式 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* ヘッダー部分 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center mr-3">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">AI予測分析</h2>
                <p className="text-sm text-gray-600">
                  {hasRunAnalysis ? 
                    (analysisResult?.masterContext?.isOptimized ? 
                      '最適化されたAI分析' : 
                      '機械学習による将来予測'
                    ) :
                    'AIによる高度な分析と予測'
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {analysisResult?.masterContext && (
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-purple-600 font-medium">
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
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>分析中...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>AI分析を実行</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleCloseAnalysis}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span>閉じる</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 分析結果部分 */}
        {isExpanded && (
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600 mr-2" />
                <span className="text-gray-600">AI分析を実行中...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AI予測分析結果 */}
                <div className="space-y-4">
                  {/* フォロワー増加予測 */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <div className="flex items-center mb-3">
                      <div className="w-5 h-5 text-blue-600 mr-2">👥</div>
                      <h3 className="font-semibold text-blue-900">フォロワー増加予測</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">来週の予測</span>
                        <span className="text-sm font-bold text-green-600">
                          +{analysisResult.predictions.followerGrowth.weekly}人
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">来月の予測</span>
                        <span className="text-sm font-bold text-green-600">
                          +{analysisResult.predictions.followerGrowth.monthly}人
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {analysisResult.masterContext?.isOptimized ? 
                          '学習済みパターンによる高精度予測' :
                          '現在の投稿ペースとエンゲージメント率を基に予測'
                        }
                      </div>
                    </div>
                  </div>

                  {/* 投稿パフォーマンス予測 */}
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <div className="flex items-center mb-3">
                      <Zap className="w-5 h-5 text-green-600 mr-2" />
                      <h3 className="font-semibold text-green-900">投稿パフォーマンス予測</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">予測エンゲージメント率</span>
                        <span className="text-sm font-bold text-green-600">
                          {analysisResult.predictions.engagementRate}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">最適投稿時間</span>
                        <span className="text-sm font-bold text-green-600">
                          {analysisResult.predictions.optimalPostingTime}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {analysisResult.masterContext?.isOptimized ? 
                          '過去の成功パターンを基に最適化された予測' :
                          '過去のパフォーマンスパターンを基に予測'
                        }
                      </div>
                    </div>
                  </div>

                  {/* AI最適化提案 */}
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
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
                      <div className="text-xs text-gray-500 mt-2">
                        {analysisResult.masterContext?.isOptimized ? 
                          '学習済みパターンによる最適化提案' :
                          'AI分析による改善提案'
                        }
                      </div>
                    </div>
                  </div>

                  {/* AI分析サマリー */}
                  {optimizedContent?.summaryLength === 'full' && (
                    <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                      <div className="flex items-center mb-3">
                        <Brain className="w-5 h-5 text-indigo-600 mr-2" />
                        <h3 className="font-semibold text-indigo-900">AI分析サマリー</h3>
                      </div>
                      <div className="text-sm text-indigo-800">
                        {analysisResult.summary}
                      </div>
                    </div>
                  )}
                </div>

                {/* 先月のまとめ */}
                <div className="space-y-4">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">先月のまとめ</h3>
                      <p className="text-sm text-gray-600">前期間との比較と成果サマリー</p>
                    </div>
                  </div>

                  {/* 前期間との比較 */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                    <div className="flex items-center mb-3">
                      <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                      <h3 className="font-semibold text-blue-900">前期間との比較</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">アカウントスコア</span>
                        {previousPeriodData ? (
                          <span className={`text-sm font-bold ${
                            (typeof accountScore?.score === 'number' && typeof previousPeriodData.score === 'number' && accountScore.score > previousPeriodData.score) ? 'text-green-600' : 
                            (typeof accountScore?.score === 'number' && typeof previousPeriodData.score === 'number' && accountScore.score < previousPeriodData.score) ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {(typeof accountScore?.score === 'number' && typeof previousPeriodData.score === 'number' && accountScore.score > previousPeriodData.score) ? '📈 向上' : 
                             (typeof accountScore?.score === 'number' && typeof previousPeriodData.score === 'number' && accountScore.score < previousPeriodData.score) ? '📉 低下' : '📊 維持'}
                            ({typeof accountScore?.score === 'number' && typeof previousPeriodData.score === 'number' ? Math.abs(accountScore.score - previousPeriodData.score) : 0}点差)
                          </span>
                        ) : (
                          <span className="text-sm font-bold text-gray-500">📊 初回データ</span>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">投稿数</span>
                        <span className="text-sm font-bold text-blue-600">
                          {currentTotals.totalPosts}件
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {activeTab === 'weekly' ? '今週' : '今月'} vs {activeTab === 'weekly' ? '先週' : '先月'}
                      </div>
                    </div>
                  </div>

                  {/* 今月の成果サマリー */}
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <div className="flex items-center mb-3">
                      <BarChart3 className="w-5 h-5 text-green-600 mr-2" />
                      <h3 className="font-semibold text-green-900">今月の成果サマリー</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">総いいね数</span>
                        <span className="text-sm font-bold text-green-600">
                          {currentTotals.totalLikes.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">総投稿数</span>
                        <span className="text-sm font-bold text-green-600">
                          {currentTotals.totalPosts}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {activeTab === 'weekly' ? '今週' : '今月'}の累計成果
                      </div>
                    </div>
                  </div>

                  {/* 先月の総評 */}
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                    <div className="flex items-center mb-3">
                      <Target className="w-5 h-5 text-purple-600 mr-2" />
                      <h3 className="font-semibold text-purple-900">先月の総評</h3>
                    </div>
                    <div className="space-y-3">
                      {monthlyReview ? (
                        <div className="text-sm text-purple-800">
                          <div className="font-medium mb-2">{typeof monthlyReview.title === 'string' ? monthlyReview.title : '月次レビュー'}</div>
                          <div className="text-xs text-purple-700">
                            {typeof monthlyReview.message === 'string' ? monthlyReview.message : 'レビューを生成中...'}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-purple-800">
                          <div className="font-medium mb-2">📊 月次レビュー準備中</div>
                          <div className="text-xs text-purple-700">
                            アカウントスコア: {typeof accountScore?.score === 'number' ? accountScore.score : 0}点 ({String(performanceRating.label)})<br />
                            データを分析してレビューを生成しています...
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Brain className="w-16 h-16 mx-auto mb-4 text-gray-300" />
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