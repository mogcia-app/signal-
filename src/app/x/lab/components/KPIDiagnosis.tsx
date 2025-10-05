'use client';

import React from 'react';

interface KPIDiagnosisProps {
  content: string;
  hashtags: string[];
}

export const KPIDiagnosis: React.FC<KPIDiagnosisProps> = ({ content, hashtags }) => {
  const getEngagementScore = () => {
    let score = 0;
    
    // 文字数によるスコア
    if (content.length > 0 && content.length <= 280) {
      score += 30;
    }
    
    // ハッシュタグ数によるスコア
    if (hashtags.length >= 1 && hashtags.length <= 3) {
      score += 20;
    } else if (hashtags.length > 3) {
      score += 10; // 多すぎる場合は減点
    }
    
    // エンゲージメント要素のチェック
    const engagementWords = ['質問', '?', '！', 'みなさん', 'どう思う', '意見', '感想'];
    const hasEngagement = engagementWords.some(word => content.includes(word));
    if (hasEngagement) {
      score += 25;
    }
    
    // 感情的な表現のチェック
    const emotionalWords = ['嬉しい', '楽しい', '驚いた', '感動', '感謝', 'ありがとう'];
    const hasEmotion = emotionalWords.some(word => content.includes(word));
    if (hasEmotion) {
      score += 15;
    }
    
    // 話題性のチェック
    const trendingWords = ['新着', '最新', '今', '話題', 'トレンド', '注目'];
    const hasTrending = trendingWords.some(word => content.includes(word));
    if (hasTrending) {
      score += 10;
    }
    
    return Math.min(score, 100);
  };

  const engagementScore = getEngagementScore();
  
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
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">エンゲージメント診断</h3>
      </div>
      <div className="p-6 space-y-4">
        {/* スコア表示 */}
        <div className="text-center">
          <div className={`text-3xl font-bold ${getScoreColor(engagementScore)}`}>
            {engagementScore}
          </div>
          <div className={`text-sm font-medium ${getScoreColor(engagementScore)}`}>
            {getScoreLabel(engagementScore)}
          </div>
        </div>

        {/* 詳細分析 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">文字数</span>
            <span className={`text-sm font-medium ${content.length > 0 && content.length <= 280 ? 'text-green-600' : 'text-red-600'}`}>
              {content.length}/280
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">ハッシュタグ数</span>
            <span className={`text-sm font-medium ${hashtags.length >= 1 && hashtags.length <= 3 ? 'text-green-600' : 'text-red-600'}`}>
              {hashtags.length}個
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">エンゲージメント要素</span>
            <span className="text-sm font-medium text-green-600">
              {content.includes('?') || content.includes('！') || content.includes('みなさん') ? 'あり' : 'なし'}
            </span>
          </div>
        </div>

        {/* 改善提案 */}
        {engagementScore < 80 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-sm text-yellow-800">
              <div className="font-medium mb-1">改善提案:</div>
              <ul className="text-xs space-y-1">
                {content.length === 0 && <li>• 投稿内容を入力してください</li>}
                {content.length > 280 && <li>• 文字数を280文字以内に調整してください</li>}
                {hashtags.length === 0 && <li>• ハッシュタグを1-3個追加してください</li>}
                {hashtags.length > 3 && <li>• ハッシュタグを3個以内に減らしてください</li>}
                {!content.includes('?') && !content.includes('！') && <li>• 質問や感嘆符でエンゲージメントを促進</li>}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KPIDiagnosis;
