'use client';

import React, { useState } from 'react';
import { PlanData } from '../../../instagram/plan/types/plan';

interface PlanFormProps {
  initialData?: Partial<PlanData>;
  onSubmit?: (data: PlanData) => void;
}

export const PlanForm: React.FC<PlanFormProps> = ({ initialData, onSubmit }) => {
  const [formData, setFormData] = useState<Partial<PlanData>>({
    title: '',
    targetFollowers: 1000,
    currentFollowers: 0,
    planPeriod: '3ヶ月',
    targetAudience: '',
    category: '',
    strategies: [],
    aiPersona: {
      tone: '親しみやすい',
      style: 'カジュアル',
      personality: '明るく前向き',
      interests: ['成長', 'コミュニティ', 'エンゲージメント', '情報発信']
    },
    simulation: {
      postTypes: {
        feed: { weeklyCount: 5, followerEffect: 2 },
        reel: { weeklyCount: 2, followerEffect: 5 },
        story: { weeklyCount: 10, followerEffect: 1 }
      }
    },
    ...initialData
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit && formData.title) {
      onSubmit(formData as PlanData);
    }
  };

  const handleStrategyAdd = (strategy: string) => {
    if (strategy.trim() && !formData.strategies?.includes(strategy)) {
      setFormData(prev => ({
        ...prev,
        strategies: [...(prev.strategies || []), strategy]
      }));
    }
  };

  const handleStrategyRemove = (strategy: string) => {
    setFormData(prev => ({
      ...prev,
      strategies: prev.strategies?.filter(s => s !== strategy) || []
    }));
  };

  const predefinedStrategies = [
    'ハッシュタグ最適化',
    'エンゲージメント向上',
    'リアルタイム投稿',
    'スレッド活用',
    'リプライ戦略',
    'トレンド活用',
    'コミュニティ形成',
    '情報発信強化'
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">X運用計画</h3>
        <p className="text-sm text-gray-600">X（旧Twitter）の運用計画を作成しましょう</p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* 基本情報 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              計画名
            </label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="例: X成長加速計画"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              計画期間
            </label>
            <select
              value={formData.planPeriod || '3ヶ月'}
              onChange={(e) => setFormData(prev => ({ ...prev, planPeriod: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1ヶ月">1ヶ月</option>
              <option value="3ヶ月">3ヶ月</option>
              <option value="6ヶ月">6ヶ月</option>
              <option value="1年">1年</option>
            </select>
          </div>
        </div>

        {/* フォロワー目標 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              現在のフォロワー数
            </label>
            <input
              type="number"
              value={formData.currentFollowers || 0}
              onChange={(e) => setFormData(prev => ({ ...prev, currentFollowers: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              目標フォロワー数
            </label>
            <input
              type="number"
              value={formData.targetFollowers || 1000}
              onChange={(e) => setFormData(prev => ({ ...prev, targetFollowers: parseInt(e.target.value) || 1000 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* ターゲット・カテゴリ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ターゲットオーディエンス
            </label>
            <input
              type="text"
              value={formData.targetAudience || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
              placeholder="例: ビジネスパーソン、学生、クリエイター"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              カテゴリ
            </label>
            <input
              type="text"
              value={formData.category || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              placeholder="例: テクノロジー、エンターテイメント、教育"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* 戦略 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            運用戦略
          </label>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {predefinedStrategies.map((strategy) => (
                <button
                  key={strategy}
                  type="button"
                  onClick={() => handleStrategyAdd(strategy)}
                  disabled={formData.strategies?.includes(strategy)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    formData.strategies?.includes(strategy)
                      ? 'bg-blue-100 text-blue-800 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-800'
                  }`}
                >
                  {strategy}
                </button>
              ))}
            </div>
            
            {formData.strategies && formData.strategies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.strategies.map((strategy) => (
                  <span
                    key={strategy}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {strategy}
                    <button
                      type="button"
                      onClick={() => handleStrategyRemove(strategy)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AIペルソナ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            AIペルソナ設定
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">トーン</label>
              <select
                value={formData.aiPersona?.tone || '親しみやすい'}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  aiPersona: { ...prev.aiPersona!, tone: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="親しみやすい">親しみやすい</option>
                <option value="プロフェッショナル">プロフェッショナル</option>
                <option value="カジュアル">カジュアル</option>
                <option value="フォーマル">フォーマル</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-gray-600 mb-1">スタイル</label>
              <select
                value={formData.aiPersona?.style || 'カジュアル'}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  aiPersona: { ...prev.aiPersona!, style: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="カジュアル">カジュアル</option>
                <option value="ビジネス">ビジネス</option>
                <option value="クリエイティブ">クリエイティブ</option>
                <option value="アカデミック">アカデミック</option>
              </select>
            </div>
          </div>
        </div>

        {/* 投稿設定 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            投稿設定
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">ツイート（週回数）</label>
              <input
                type="number"
                value={formData.simulation?.postTypes.feed.weeklyCount || 5}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  simulation: {
                    ...prev.simulation!,
                    postTypes: {
                      ...prev.simulation!.postTypes,
                      feed: { ...prev.simulation!.postTypes.feed, weeklyCount: parseInt(e.target.value) || 5 }
                    }
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-600 mb-1">スレッド（週回数）</label>
              <input
                type="number"
                value={formData.simulation?.postTypes.reel.weeklyCount || 2}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  simulation: {
                    ...prev.simulation!,
                    postTypes: {
                      ...prev.simulation!.postTypes,
                      reel: { ...prev.simulation!.postTypes.reel, weeklyCount: parseInt(e.target.value) || 2 }
                    }
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-600 mb-1">リプライ（週回数）</label>
              <input
                type="number"
                value={formData.simulation?.postTypes.story.weeklyCount || 10}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  simulation: {
                    ...prev.simulation!,
                    postTypes: {
                      ...prev.simulation!.postTypes,
                      story: { ...prev.simulation!.postTypes.story, weeklyCount: parseInt(e.target.value) || 10 }
                    }
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            計画を保存
          </button>
        </div>
      </form>
    </div>
  );
};

export default PlanForm;
