'use client';

import React from 'react';
import { Target } from 'lucide-react';
// import { ReachSourceData } from './types';

interface ReachSourceDataInput {
  sources: {
    posts: string;
    profile: string;
    explore: string;
    search: string;
    other: string;
  };
  followers: {
    followers: string;
    nonFollowers: string;
  };
}

interface ReachSourceAnalysisFormProps {
  data: ReachSourceDataInput;
  onChange: (data: ReachSourceDataInput) => void;
}

const ReachSourceAnalysisForm: React.FC<ReachSourceAnalysisFormProps> = ({
  data,
  onChange
}) => {
  const handleSourcesChange = (field: keyof ReachSourceDataInput['sources'], value: string) => {
    onChange({
      ...data,
      sources: {
        ...data.sources,
        [field]: value
      }
    });
  };

  const handleFollowersChange = (field: keyof ReachSourceDataInput['followers'], value: string) => {
    onChange({
      ...data,
      followers: {
        ...data.followers,
        [field]: value
      }
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-6">
        <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center mr-3">
          <Target className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">閲覧数ソース分析</h2>
          <p className="text-sm text-gray-600">閲覧数の流入元とフォロワー構成を入力してください</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* 閲覧数ソース */}
        <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">閲覧数ソース</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                📱 投稿 (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.sources.posts}
                onChange={(e) => handleSourcesChange('posts', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                👤 プロフィール (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.sources.profile}
                onChange={(e) => handleSourcesChange('profile', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                🔍 検索 (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.sources.search}
                onChange={(e) => handleSourcesChange('search', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                🌟 探索 (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.sources.explore}
                onChange={(e) => handleSourcesChange('explore', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                🔗 その他 (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.sources.other}
                onChange={(e) => handleSourcesChange('other', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* フォロワー構成 */}
        <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">フォロワー構成</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                👥 フォロワー内 (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.followers.followers}
                onChange={(e) => handleFollowersChange('followers', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                🌐 フォロワー外 (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.followers.nonFollowers}
                onChange={(e) => handleFollowersChange('nonFollowers', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReachSourceAnalysisForm;
