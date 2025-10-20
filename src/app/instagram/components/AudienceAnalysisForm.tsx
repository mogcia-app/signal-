'use client';

import React from 'react';
import { Users } from 'lucide-react';
// import { AudienceData } from './types';

interface AudienceDataInput {
  gender: {
    male: string;
    female: string;
    other: string;
  };
  age: {
    '13-17': string;
    '18-24': string;
    '25-34': string;
    '35-44': string;
    '45-54': string;
    '55-64': string;
    '65+': string;
  };
}

interface AudienceAnalysisFormProps {
  data: AudienceDataInput;
  onChange: (data: AudienceDataInput) => void;
}

const AudienceAnalysisForm: React.FC<AudienceAnalysisFormProps> = ({
  data,
  onChange
}) => {
  const handleGenderChange = (field: keyof AudienceDataInput['gender'], value: string) => {
    onChange({
      ...data,
      gender: {
        ...data.gender,
        [field]: value
      }
    });
  };

  const handleAgeChange = (field: keyof AudienceDataInput['age'], value: string) => {
    onChange({
      ...data,
      age: {
        ...data.age,
        [field]: value
      }
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-6">
        <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center mr-3">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-black">オーディエンス分析</h2>
          <p className="text-sm text-black">フォロワーの性別・年齢分布を入力してください</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* 性別分析 */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">性別分析</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                👨 男性 (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.gender.male}
                onChange={(e) => handleGenderChange('male', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                👩 女性 (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.gender.female}
                onChange={(e) => handleGenderChange('female', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                🏳️‍🌈 その他 (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.gender.other}
                onChange={(e) => handleGenderChange('other', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* 年齢層分析 */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">年齢層分析</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                13-17歳 (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.age['13-17']}
                onChange={(e) => handleAgeChange('13-17', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                18-24歳 (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.age['18-24']}
                onChange={(e) => handleAgeChange('18-24', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                25-34歳 (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.age['25-34']}
                onChange={(e) => handleAgeChange('25-34', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                35-44歳 (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.age['35-44']}
                onChange={(e) => handleAgeChange('35-44', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                45-54歳 (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.age['45-54']}
                onChange={(e) => handleAgeChange('45-54', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                55-64歳 (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.age['55-64']}
                onChange={(e) => handleAgeChange('55-64', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                65歳以上 (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.age['65+']}
                onChange={(e) => handleAgeChange('65+', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudienceAnalysisForm;
