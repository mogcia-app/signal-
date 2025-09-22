'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Heart, MessageCircle, Share, Eye } from 'lucide-react';

interface KPIDiagnosisProps {
  content: string;
  hashtags: string[];
}

interface KPIMetrics {
  engagement: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

export const KPIDiagnosis: React.FC<KPIDiagnosisProps> = ({
  content,
  hashtags
}) => {
  const [metrics, setMetrics] = useState<KPIMetrics>({
    engagement: 0,
    reach: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0
  });

  const [analysis, setAnalysis] = useState({
    contentScore: 0,
    hashtagScore: 0,
    overallScore: 0,
    suggestions: [] as string[]
  });

  // コンテンツ分析（AI以外の部分）
  useEffect(() => {
    if (!content && hashtags.length === 0) {
      setMetrics({
        engagement: 0,
        reach: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0
      });
      setAnalysis({
        contentScore: 0,
        hashtagScore: 0,
        overallScore: 0,
        suggestions: []
      });
      return;
    }

    // 基本的な分析ロジック（AI以外）
    const contentLength = content.length;
    const hashtagCount = hashtags.length;
    
    // コンテンツスコア計算
    let contentScore = 0;
    const suggestions: string[] = [];

    // 文字数による評価
    if (contentLength === 0) {
      contentScore += 0;
      suggestions.push('投稿文を入力してください');
    } else if (contentLength < 50) {
      contentScore += 20;
      suggestions.push('もう少し詳しい内容を追加すると良いでしょう');
    } else if (contentLength < 150) {
      contentScore += 40;
    } else if (contentLength < 300) {
      contentScore += 60;
    } else if (contentLength < 500) {
      contentScore += 80;
    } else {
      contentScore += 60;
      suggestions.push('投稿文が長すぎる可能性があります');
    }

    // エンゲージメント要素のチェック
    if (content.includes('?')) {
      contentScore += 10;
    } else {
      suggestions.push('質問を入れるとエンゲージメントが向上します');
    }

    if (content.includes('!')) {
      contentScore += 5;
    }

    if (content.includes('✨') || content.includes('💕') || content.includes('🔥')) {
      contentScore += 5;
    } else {
      suggestions.push('絵文字を追加すると親しみやすくなります');
    }

    // ハッシュタグスコア計算
    let hashtagScore = 0;
    if (hashtagCount === 0) {
      hashtagScore = 0;
      suggestions.push('ハッシュタグを追加してください');
    } else if (hashtagCount < 5) {
      hashtagScore = 20;
      suggestions.push('ハッシュタグを5個以上追加することをお勧めします');
    } else if (hashtagCount <= 20) {
      hashtagScore = 40;
    } else if (hashtagCount <= 30) {
      hashtagScore = 60;
    } else {
      hashtagScore = 40;
      suggestions.push('ハッシュタグが多すぎる可能性があります（30個以下推奨）');
    }

    // ハッシュタグの種類チェック
    const popularHashtags = hashtags.filter(tag => 
      ['インスタ映え', 'フォロー', 'いいね', 'コメント', 'リポスト'].includes(tag)
    );
    if (popularHashtags.length > 0) {
      hashtagScore += 10;
    }

    const overallScore = Math.round((contentScore + hashtagScore) / 2);

    // メトリクス推定（簡易版）
    const baseEngagement = Math.min(overallScore * 0.8, 100);
    const baseReach = Math.min(overallScore * 1.2, 100);
    
    setMetrics({
      engagement: Math.round(baseEngagement),
      reach: Math.round(baseReach),
      likes: Math.round(baseEngagement * 0.7),
      comments: Math.round(baseEngagement * 0.1),
      shares: Math.round(baseEngagement * 0.05),
      saves: Math.round(baseEngagement * 0.15)
    });

    setAnalysis({
      contentScore: Math.round(contentScore),
      hashtagScore: Math.round(hashtagScore),
      overallScore,
      suggestions
    });
  }, [content, hashtags]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 40) return 'bg-orange-100';
    return 'bg-red-100';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingUp size={18} className="mr-2" />
            KPI診断
          </h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBgColor(analysis.overallScore)} ${getScoreColor(analysis.overallScore)}`}>
            {analysis.overallScore}点
          </div>
        </div>

        {/* スコア詳細 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{analysis.contentScore}</div>
            <div className="text-sm text-gray-600">コンテンツ</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{analysis.hashtagScore}</div>
            <div className="text-sm text-gray-600">ハッシュタグ</div>
          </div>
        </div>

        {/* 予想メトリクス */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">予想パフォーマンス</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center space-x-2">
              <Heart size={16} className="text-red-500" />
              <span className="text-sm text-gray-600">いいね</span>
              <span className="text-sm font-medium">{metrics.likes}%</span>
            </div>
            <div className="flex items-center space-x-2">
              <MessageCircle size={16} className="text-blue-500" />
              <span className="text-sm text-gray-600">コメント</span>
              <span className="text-sm font-medium">{metrics.comments}%</span>
            </div>
            <div className="flex items-center space-x-2">
              <Share size={16} className="text-green-500" />
              <span className="text-sm text-gray-600">シェア</span>
              <span className="text-sm font-medium">{metrics.shares}%</span>
            </div>
            <div className="flex items-center space-x-2">
              <Eye size={16} className="text-purple-500" />
              <span className="text-sm text-gray-600">リーチ</span>
              <span className="text-sm font-medium">{metrics.reach}%</span>
            </div>
          </div>
        </div>

        {/* 改善提案 */}
        {analysis.suggestions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">改善提案</h4>
            <div className="space-y-2">
              {analysis.suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-600">{suggestion}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI診断ボタン（将来実装用） */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            disabled
            className="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed text-sm"
          >
            🤖 AI詳細診断（準備中）
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            より詳細な分析はAI機能で提供予定
          </p>
        </div>
      </div>
    </div>
  );
};

export default KPIDiagnosis;
