'use client';

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { PlanData } from '../../plan/types/plan';

interface AIPostGeneratorProps {
  postType: 'feed' | 'reel' | 'story';
  onPostTypeChange: (type: 'feed' | 'reel' | 'story') => void;
  onGeneratePost: (title: string, content: string, hashtags: string[], scheduledDate: string, scheduledTime: string) => void;
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
      // AI APIを呼び出して最適な投稿時間を提案
      const response = await fetch('/api/ai/post-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: '最適な投稿時間を提案してください',
          postType,
          planData,
          scheduledDate,
          action: 'suggestTime'
        }),
      });

      const result = await response.json();

      if (response.ok && result.success && result.data) {
        // AIが提案した時間を使用
        const { suggestedTime: aiSuggestedTime } = result.data;
        setSuggestedTime(aiSuggestedTime);
        setScheduledTime(aiSuggestedTime);
      } else {
        // フォールバック: 既存のロジック
        const optimalTimes = {
          feed: ['09:00', '12:00', '18:00', '20:00'],
          reel: ['07:00', '12:00', '19:00', '21:00'],
          story: ['08:00', '13:00', '18:00', '22:00']
        };
        
        const times = optimalTimes[postType];
        const randomTime = times[Math.floor(Math.random() * times.length)];
        
        setSuggestedTime(randomTime);
        setScheduledTime(randomTime);
      }
    } catch (error) {
      console.error('時間提案エラー:', error);
      // エラー時もフォールバック
      const optimalTimes = {
        feed: ['09:00', '12:00', '18:00', '20:00'],
        reel: ['07:00', '12:00', '19:00', '21:00'],
        story: ['08:00', '13:00', '18:00', '22:00']
      };
      
      const times = optimalTimes[postType];
      const randomTime = times[Math.floor(Math.random() * times.length)];
      
      setSuggestedTime(randomTime);
      setScheduledTime(randomTime);
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
      // AI APIを呼び出して投稿文を生成
      const response = await fetch('/api/ai/post-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          postType,
          planData,
          scheduledDate,
          scheduledTime
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '投稿文生成に失敗しました');
      }

      if (result.success && result.data) {
        const { title, content, hashtags } = result.data;
        // 投稿日時も一緒に渡す
        onGeneratePost(title, content, hashtags, scheduledDate, scheduledTime);
        setAiPrompt('');
        setAiTitle('');
      } else {
        throw new Error('投稿文生成に失敗しました');
      }
    } catch (error) {
      console.error('投稿生成エラー:', error);
      alert(`投稿文生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

        {/* 投稿テーマ入力エリア */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-800 mb-3">
            投稿テーマ
          </label>
          <div className="text-xs text-gray-600 mb-2">
            AIが投稿文を生成するためのテーマやアイデアを入力してください
          </div>
          <div className="relative">
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={planData 
                ? `例: 新商品の紹介、日常の出来事、お客様の声など...`
                : '運用計画を作成してから投稿テーマを入力してください...'
              }
              disabled={!planData}
              className={`w-full h-32 p-4 border-2 border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm ${!planData ? 'opacity-50 cursor-not-allowed' : ''}`}
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

        {/* 計画情報表示 */}
        {planData && (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-2">📋 現在の運用計画</div>
              <div className="space-y-1 text-xs">
                <div>• 計画: {planData.title}</div>
                <div>• 目標: {planData.targetFollowers.toLocaleString()}フォロワー</div>
                <div>• 戦略: {planData.strategies.join(', ')}</div>
                <div>• ペルソナ: {planData.aiPersona.personality}で{planData.aiPersona.style}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIPostGenerator;
