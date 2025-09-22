'use client';

import React, { useState } from 'react';
import { Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

interface AIAssistantProps {
  postType: 'feed' | 'reel';
  onGeneratePost: (content: string, hashtags: string[]) => void;
  onCheckPost: (content: string, hashtags: string[]) => void;
}

interface AICheckResult {
  score: number;
  suggestions: string[];
  hashtagSuggestions: string[];
  engagementPrediction: number;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  postType,
  onGeneratePost,
  onCheckPost
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<AICheckResult | null>(null);
  const [prompt, setPrompt] = useState('');

  const handleGeneratePost = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    try {
      // 実際のAPI呼び出しをここに実装
      await new Promise(resolve => setTimeout(resolve, 2000)); // 模擬処理
      
      const generatedContent = `✨ ${prompt}について投稿文を生成しました！

この投稿は${postType === 'reel' ? 'リール' : 'フィード'}に最適化されています。
エンゲージメントを高めるために、以下のポイントを意識しました：

• 感情に訴える表現
• 行動を促すCTA
• 視覚的に魅力的な文章構成

#${postType === 'reel' ? 'リール' : 'インスタグラム'} #${prompt.replace(/\s+/g, '')} #エンゲージメント`;

      const hashtags = [
        postType === 'reel' ? 'リール' : 'インスタグラム',
        prompt.replace(/\s+/g, ''),
        'エンゲージメント',
        '投稿',
        'SNS'
      ];

      onGeneratePost(generatedContent, hashtags);
    } catch (error) {
      console.error('投稿生成エラー:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCheckPost = async (content: string, hashtags: string[]) => {
    if (!content.trim()) return;
    
    setIsChecking(true);
    try {
      // 実際のAPI呼び出しをここに実装
      await new Promise(resolve => setTimeout(resolve, 1500)); // 模擬処理
      
      // 模擬的なチェック結果
      const result: AICheckResult = {
        score: Math.floor(Math.random() * 30) + 70, // 70-100のスコア
        suggestions: [
          'より具体的な数値や事例を追加すると良いでしょう',
          '感情に訴える表現を増やしてみてください',
          '行動を促す呼びかけを追加することをお勧めします'
        ],
        hashtagSuggestions: [
          'トレンド',
          'バイラル',
          'フォロー',
          'いいね'
        ],
        engagementPrediction: Math.floor(Math.random() * 20) + 5 // 5-25%の予測エンゲージメント
      };

      setCheckResult(result);
    } catch (error) {
      console.error('投稿チェックエラー:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 80) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Sparkles className="mr-2 text-purple-600" size={20} />
          AI アシスタント
        </h2>

        {/* AI投稿生成 */}
        <div className="mb-6">
          <h3 className="text-md font-medium text-gray-800 mb-3">
            🤖 AI投稿文生成
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`${postType === 'reel' ? 'リール' : 'フィード'}のテーマや内容を入力してください...`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleGeneratePost}
              disabled={!prompt.trim() || isGenerating}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles size={16} className="mr-2" />
                  AI投稿文を生成
                </>
              )}
            </button>
          </div>
        </div>

        {/* 投稿チェック結果 */}
        {checkResult && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
              <CheckCircle className="mr-2 text-green-600" size={16} />
              投稿分析結果
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className={`p-3 rounded-lg ${getScoreBg(checkResult.score)}`}>
                <div className="text-sm text-gray-600">総合スコア</div>
                <div className={`text-2xl font-bold ${getScoreColor(checkResult.score)}`}>
                  {checkResult.score}/100
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-600">予測エンゲージメント</div>
                <div className="text-2xl font-bold text-blue-600">
                  {checkResult.engagementPrediction}%
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">改善提案</h4>
                <ul className="space-y-1">
                  {checkResult.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start">
                      <AlertCircle size={14} className="mr-2 mt-0.5 text-yellow-500 flex-shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">ハッシュタグ提案</h4>
                <div className="flex flex-wrap gap-2">
                  {checkResult.hashtagSuggestions.map((hashtag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                    >
                      #{hashtag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 投稿チェックボタン */}
        <div>
          <h3 className="text-md font-medium text-gray-800 mb-3">
            🔍 投稿文チェック
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            作成した投稿文をAIが分析し、エンゲージメント向上のための提案を行います。
          </p>
          <button
            onClick={() => {
              // 実際のコンテンツとハッシュタグを取得する必要があります
              const content = (document.querySelector('textarea') as HTMLTextAreaElement)?.value || '';
              const hashtags: string[] = [];
              handleCheckPost(content, hashtags);
            }}
            disabled={isChecking}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isChecking ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                分析中...
              </>
            ) : (
              <>
                <CheckCircle size={16} className="mr-2" />
                投稿文をチェック
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
