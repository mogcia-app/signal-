'use client';

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { PlanData } from '../../../types/plan';

interface AIPostGeneratorProps {
  postType: 'feed' | 'reel' | 'story';
  onPostTypeChange: (type: 'feed' | 'reel' | 'story') => void;
  onGeneratePost: (title: string, content: string, hashtags: string[]) => void;
  planData?: PlanData | null;
}

export const AIPostGenerator: React.FC<AIPostGeneratorProps> = ({
  postType,
  onPostTypeChange,
  onGeneratePost,
  planData
}) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTitle, setAiTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSuggestingTime, setIsSuggestingTime] = useState(false);
  const [suggestedTime, setSuggestedTime] = useState('');

  // AI時間提案
  const handleSuggestTime = async () => {
    if (!scheduledDate) {
      alert('まず投稿日を選択してください');
      return;
    }

    setIsSuggestingTime(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // 模擬処理
      
      // 投稿タイプと内容に基づいて最適な時間を提案
      const optimalTimes = {
        feed: ['09:00', '12:00', '18:00', '20:00'],
        reel: ['07:00', '12:00', '19:00', '21:00'],
        story: ['08:00', '13:00', '18:00', '22:00']
      };
      
      const times = optimalTimes[postType];
      const randomTime = times[Math.floor(Math.random() * times.length)];
      
      setSuggestedTime(randomTime);
      setScheduledTime(randomTime);
    } catch (error) {
      console.error('時間提案エラー:', error);
    } finally {
      setIsSuggestingTime(false);
    }
  };

  const handleGeneratePost = async () => {
    if (!aiPrompt.trim()) {
      alert('投稿のテーマを入力してください');
      return;
    }

    if (!planData) {
      alert('運用計画を先に作成してください');
      return;
    }
    
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 模擬処理
      
      // 運用計画に基づいた投稿文生成
      const strategy = planData.strategies[Math.floor(Math.random() * planData.strategies.length)];
      const targetGrowth = Math.round((planData.targetFollowers - planData.currentFollowers) / planData.targetFollowers * 100);
      const weeklyTarget = planData.simulation.postTypes[postType].weeklyCount;
      const followerEffect = planData.simulation.postTypes[postType].followerEffect;
      
      const generatedTitle = `${aiPrompt} - ${planData.aiPersona.personality}な${strategy}`;
      
      const generatedContent = `🎯 ${planData.title}の一環として、${aiPrompt}について${planData.aiPersona.tone}に投稿します！

📈 目標: ${planData.targetFollowers.toLocaleString()}フォロワー達成まであと${targetGrowth}%！
期間: ${planData.planPeriod}

✨ 今回の戦略: ${strategy}
${postType === 'reel' ? 'リール' : postType === 'story' ? 'ストーリーズ' : 'フィード'}に最適化された内容で、週${weeklyTarget}回の投稿で+${followerEffect}人/投稿を目指します。

💡 この投稿のポイント:
• ${strategy}を意識した構成
• ${planData.aiPersona.personality}な${planData.aiPersona.style}スタイル
• ${planData.targetAudience === '未設定' ? 'フォロワー' : planData.targetAudience}との繋がりを深める内容

${planData.aiPersona.interests.join('・')}を大切に、一緒に成長していきましょう！📱✨

#${postType === 'reel' ? 'リール' : postType === 'story' ? 'ストーリーズ' : 'インスタグラム'} #${strategy.replace(/\s+/g, '')} #成長 #${aiPrompt.replace(/\s+/g, '')} #エンゲージメント`;

      const newHashtags = [
        postType === 'reel' ? 'リール' : postType === 'story' ? 'ストーリーズ' : 'インスタグラム',
        strategy.replace(/\s+/g, ''),
        '成長',
        aiPrompt.replace(/\s+/g, ''),
        'エンゲージメント',
        'フォロワー',
        '目標達成'
      ];

      onGeneratePost(generatedTitle, generatedContent, newHashtags);
      setAiPrompt('');
      setAiTitle('');
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
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center mr-3">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI投稿文生成</h3>
              <p className="text-sm text-gray-600">
                {planData 
                  ? `${planData.title}に基づいてAIが投稿文を自動生成します`
                  : '運用計画を作成してからAI投稿文を生成できます'
                }
              </p>
            </div>
          </div>
          <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
            🤖 AI Powered
          </div>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="p-6">
        {/* 投稿タイプ選択 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            投稿タイプ
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onPostTypeChange('feed')}
              className={`p-3 rounded-lg border-2 transition-colors ${
                postType === 'feed'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-lg mb-1">📸</div>
                <div className="text-sm font-medium">フィード</div>
              </div>
            </button>
            <button
              onClick={() => onPostTypeChange('reel')}
              className={`p-3 rounded-lg border-2 transition-colors ${
                postType === 'reel'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-lg mb-1">🎬</div>
                <div className="text-sm font-medium">リール</div>
              </div>
            </button>
            <button
              onClick={() => onPostTypeChange('story')}
              className={`p-3 rounded-lg border-2 transition-colors ${
                postType === 'story'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-lg mb-1">📱</div>
                <div className="text-sm font-medium">ストーリーズ</div>
              </div>
            </button>
          </div>
        </div>

        {/* 投稿設定 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            投稿設定
          </label>
          <div className="space-y-4">
            {/* 投稿日 */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">投稿日</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            
            {/* 投稿時間 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs text-gray-600">投稿時間</label>
                <button
                  onClick={handleSuggestTime}
                  disabled={!scheduledDate || isSuggestingTime}
                  className="text-xs text-purple-600 hover:text-purple-800 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center"
                >
                  {isSuggestingTime ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-purple-600 mr-1"></div>
                      AI分析中...
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} className="mr-1" />
                      AI最適時間を提案
                    </>
                  )}
                </button>
              </div>
              
              <div className="flex space-x-2">
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                {suggestedTime && (
                  <button
                    onClick={() => setScheduledTime(suggestedTime)}
                    className="px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors text-xs font-medium"
                  >
                    採用
                  </button>
                )}
              </div>
              
              {suggestedTime && (
                <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-md">
                  <div className="flex items-center text-xs text-purple-700">
                    <Sparkles size={12} className="mr-1" />
                    <span className="font-medium">AI提案:</span>
                    <span className="ml-1">{suggestedTime}</span>
                    <span className="ml-2 text-purple-600">
                      ({postType === 'feed' ? 'フィード' : postType === 'reel' ? 'リール' : 'ストーリーズ'}に最適)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* タイトル入力 */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-800 mb-3">
            タイトル
          </label>
          <input
            type="text"
            value={aiTitle}
            onChange={(e) => setAiTitle(e.target.value)}
            placeholder={`${postType === 'reel' ? 'リール' : postType === 'story' ? 'ストーリーズ' : 'フィード'}のタイトルを入力してください...`}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80"
          />
        </div>

        {/* 投稿文入力エリア */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-800 mb-3">
            投稿文
          </label>
          <div className="relative">
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={planData 
                ? `${planData.title}に基づいた${postType === 'reel' ? 'リール' : postType === 'story' ? 'ストーリーズ' : 'フィード'}のテーマを入力してください...`
                : '運用計画を作成してから投稿テーマを入力してください...'
              }
              disabled={!planData}
              className={`w-full h-64 p-4 border-2 border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm ${!planData ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ fontFamily: 'inherit' }}
            />
          </div>
        </div>

        {/* ハッシュタグ */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-800 mb-3">
            ハッシュタグ
          </label>
          <div className="text-sm text-gray-600 italic">
            投稿文生成時に自動でハッシュタグが追加されます
          </div>
        </div>
        
        {/* 生成ボタン */}
        <button
          onClick={handleGeneratePost}
          disabled={!aiPrompt.trim() || isGenerating || !planData}
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
  );
};

export default AIPostGenerator;
