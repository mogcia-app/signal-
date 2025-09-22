'use client';

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface AIPostGeneratorProps {
  postType: 'feed' | 'reel' | 'story';
  onGeneratePost: (content: string, hashtags: string[]) => void;
}

export const AIPostGenerator: React.FC<AIPostGeneratorProps> = ({
  postType,
  onGeneratePost
}) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePost = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 模擬処理
      
      const generatedContent = `✨ ${aiPrompt}について投稿文を生成しました！

この投稿は${postType === 'reel' ? 'リール' : postType === 'story' ? 'ストーリーズ' : 'フィード'}に最適化されています。
エンゲージメントを高めるために、以下のポイントを意識しました：

• 感情に訴える表現
• 行動を促すCTA
• 視覚的に魅力的な文章構成

#${postType === 'reel' ? 'リール' : postType === 'story' ? 'ストーリーズ' : 'インスタグラム'} #${aiPrompt.replace(/\s+/g, '')} #エンゲージメント`;

      const newHashtags = [
        postType === 'reel' ? 'リール' : postType === 'story' ? 'ストーリーズ' : 'インスタグラム',
        aiPrompt.replace(/\s+/g, ''),
        'エンゲージメント',
        '投稿',
        'SNS'
      ];

      onGeneratePost(generatedContent, newHashtags);
      setAiPrompt('');
    } catch (error) {
      console.error('投稿生成エラー:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* セクションヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center mr-3">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI投稿文生成</h3>
            <p className="text-sm text-gray-600">テーマを入力してAIが投稿文を自動生成します</p>
          </div>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              投稿テーマ・内容
            </label>
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={`${postType === 'reel' ? 'リール' : postType === 'story' ? 'ストーリーズ' : 'フィード'}のテーマや内容を入力してください...`}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white/80"
            />
          </div>
          
          <button
            onClick={handleGeneratePost}
            disabled={!aiPrompt.trim() || isGenerating}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center font-medium"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                AI生成中...
              </>
            ) : (
              <>
                <Sparkles size={18} className="mr-2" />
                AI投稿文を生成
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIPostGenerator;
