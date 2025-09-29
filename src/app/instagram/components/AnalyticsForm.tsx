'use client';

import React from 'react';
import { Heart, MessageCircle, Share, Eye, Save, UserPlus } from 'lucide-react';
import { InputData } from './types';

interface AnalyticsFormProps {
  data: InputData;
  onChange: (data: InputData) => void;
  onSave: () => void;
  isLoading: boolean;
}

const AnalyticsForm: React.FC<AnalyticsFormProps> = ({
  data,
  onChange,
  onSave,
  isLoading
}) => {
  const handleInputChange = (field: keyof InputData, value: string) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">分析データ入力</h2>
          <p className="text-sm text-gray-600">投稿のパフォーマンスデータを入力してください</p>
        </div>
        <button
          onClick={onSave}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>保存中...</span>
            </>
          ) : (
            <span>分析データを保存</span>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {/* 投稿情報 */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">投稿情報</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                投稿日
              </label>
              <input
                type="date"
                value={data.publishedAt}
                onChange={(e) => handleInputChange('publishedAt', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                投稿時間
              </label>
              <input
                type="time"
                value={data.publishedTime}
                onChange={(e) => handleInputChange('publishedTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* 基本メトリクス */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="flex text-sm font-medium text-gray-700 mb-2 items-center">
              <Heart className="w-4 h-4 mr-2 text-red-500" />
              いいね数
            </label>
            <input
              type="number"
              min="0"
              value={data.likes}
              onChange={(e) => handleInputChange('likes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
          <div>
            <label className="flex text-sm font-medium text-gray-700 mb-2 items-center">
              <MessageCircle className="w-4 h-4 mr-2 text-blue-500" />
              コメント数
            </label>
            <input
              type="number"
              min="0"
              value={data.comments}
              onChange={(e) => handleInputChange('comments', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
          <div>
            <label className="flex text-sm font-medium text-gray-700 mb-2 items-center">
              <Share className="w-4 h-4 mr-2 text-green-500" />
              シェア数
            </label>
            <input
              type="number"
              min="0"
              value={data.shares}
              onChange={(e) => handleInputChange('shares', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
          <div>
            <label className="flex text-sm font-medium text-gray-700 mb-2 items-center">
              <Eye className="w-4 h-4 mr-2 text-purple-500" />
              閲覧数
            </label>
            <input
              type="number"
              min="0"
              value={data.reach}
              onChange={(e) => handleInputChange('reach', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
          <div>
            <label className="flex text-sm font-medium text-gray-700 mb-2 items-center">
              <Save className="w-4 h-4 mr-2 text-yellow-500" />
              保存数
            </label>
            <input
              type="number"
              min="0"
              value={data.saves}
              onChange={(e) => handleInputChange('saves', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
          <div>
            <label className="flex text-sm font-medium text-gray-700 mb-2 items-center">
              <UserPlus className="w-4 h-4 mr-2 text-indigo-500" />
              フォロワー増加数
            </label>
            <input
              type="number"
              value={data.followerIncrease}
              onChange={(e) => handleInputChange('followerIncrease', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsForm;
