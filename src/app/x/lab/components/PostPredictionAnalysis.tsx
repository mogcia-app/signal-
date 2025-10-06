'use client';

import React, { useState } from 'react';
import { TrendingUp, Users, Heart, MessageCircle, Share, ChevronDown, ChevronUp } from 'lucide-react';

interface PostPredictionAnalysisProps {
  content: string;
  hashtags: string[];
  postType?: 'tweet' | 'thread' | 'reply';
}

export const PostPredictionAnalysis: React.FC<PostPredictionAnalysisProps> = ({ 
  content, 
  hashtags, 
  postType = 'tweet' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    engagementScore: number;
    reachPrediction: number;
    likePrediction: number;
    retweetPrediction: number;
    replyPrediction: number;
    insights: string[];
    recommendations: string[];
  } | null>(null);

  const runAnalysis = async () => {
    if (!content.trim()) {
      alert('投稿内容を入力してください');
      return;
    }

    setIsAnalyzing(true);
    
    // シミュレーション分析（実際のAPIに置き換え可能）
    setTimeout(() => {
      const analysis = {
        engagementScore: Math.floor(Math.random() * 40) + 60, // 60-100
        reachPrediction: Math.floor(Math.random() * 500) + 100, // 100-600
        likePrediction: Math.floor(Math.random() * 50) + 10, // 10-60
        retweetPrediction: Math.floor(Math.random() * 20) + 2, // 2-22
        replyPrediction: Math.floor(Math.random() * 15) + 1, // 1-16
        insights: [
          '投稿内容が140文字以内で適切な長さです',
          'ハッシュタグが効果的に使用されています',
          'エンゲージメントを促進する要素が含まれています',
          '投稿タイミングが重要です'
        ],
        recommendations: [
          '午後2-4時または夜8-10時に投稿することをお勧めします',
          'より多くの質問を投げかけてエンゲージメントを促進',
          'トレンドハッシュタグを追加することを検討',
          '視覚的な要素（画像・動画）の追加を検討'
        ]
      };
      
      setAnalysisResult(analysis);
      setIsAnalyzing(false);
    }, 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '優秀';
    if (score >= 60) return '良好';
    return '改善必要';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center mr-3">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">投稿後の予想診断</h3>
              <p className="text-sm text-gray-600">投稿のパフォーマンスを予測します</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      {isOpen && (
        <div className="p-6">
          {!analysisResult ? (
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">予想診断を開始</h4>
                <p className="text-sm text-gray-600 mb-4">
                  投稿内容を分析して、エンゲージメントやリーチを予測します
                </p>
              </div>
              
              <button
                onClick={runAnalysis}
                disabled={isAnalyzing || !content.trim()}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 font-medium"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                    分析中...
                  </>
                ) : (
                  '🔮 診断を開始する'
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 総合スコア */}
              <div className="text-center">
                <div className={`text-4xl font-bold ${getScoreColor(analysisResult.engagementScore)} mb-2`}>
                  {analysisResult.engagementScore}
                </div>
                <div className={`text-lg font-medium ${getScoreColor(analysisResult.engagementScore)}`}>
                  {getScoreLabel(analysisResult.engagementScore)}
                </div>
                <div className="text-sm text-gray-600 mt-1">エンゲージメント予想スコア</div>
              </div>

              {/* 予想数値 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Users className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-800">リーチ予想</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {analysisResult.reachPrediction.toLocaleString()}
                  </div>
                </div>
                
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Heart className="w-5 h-5 text-red-600 mr-2" />
                    <span className="text-sm font-medium text-red-800">いいね予想</span>
                  </div>
                  <div className="text-2xl font-bold text-red-900">
                    {analysisResult.likePrediction}
                  </div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Share className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-800">リツイート予想</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {analysisResult.retweetPrediction}
                  </div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <MessageCircle className="w-5 h-5 text-purple-600 mr-2" />
                    <span className="text-sm font-medium text-purple-800">リプライ予想</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    {analysisResult.replyPrediction}
                  </div>
                </div>
              </div>

              {/* インサイト */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">📊 分析インサイト</h4>
                <ul className="space-y-2">
                  {analysisResult.insights.map((insight, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span className="text-sm text-gray-700">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 推奨事項 */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">💡 改善推奨事項</h4>
                <ul className="space-y-2">
                  {analysisResult.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-pink-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span className="text-sm text-gray-700">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 再分析ボタン */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => setAnalysisResult(null)}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  新しい分析を実行
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PostPredictionAnalysis;
