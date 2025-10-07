import React from 'react';
import { Users, User, UserCheck } from 'lucide-react';

interface AudienceAnalysisProps {
  audienceAnalysis: {
    gender: {
      male: number;
      female: number;
      other: number;
    };
    age: {
      '13-17': number;
      '18-24': number;
      '25-34': number;
      '35-44': number;
      '45-54': number;
      '55-64': number;
      '65+': number;
    };
  };
}

export function AudienceAnalysis({ audienceAnalysis }: AudienceAnalysisProps) {
  const genderData = [
    { label: '男性', value: audienceAnalysis.gender.male, color: 'bg-blue-500' },
    { label: '女性', value: audienceAnalysis.gender.female, color: 'bg-pink-500' },
    { label: 'その他', value: audienceAnalysis.gender.other, color: 'bg-gray-500' },
  ];

  const ageData = [
    { label: '13-17歳', value: audienceAnalysis.age['13-17'], color: 'bg-green-400' },
    { label: '18-24歳', value: audienceAnalysis.age['18-24'], color: 'bg-blue-400' },
    { label: '25-34歳', value: audienceAnalysis.age['25-34'], color: 'bg-indigo-500' },
    { label: '35-44歳', value: audienceAnalysis.age['35-44'], color: 'bg-purple-500' },
    { label: '45-54歳', value: audienceAnalysis.age['45-54'], color: 'bg-pink-500' },
    { label: '55-64歳', value: audienceAnalysis.age['55-64'], color: 'bg-red-500' },
    { label: '65歳以上', value: audienceAnalysis.age['65+'], color: 'bg-gray-600' },
  ];


  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-green-100 rounded-lg">
          <Users className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">オーディエンス分析</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 性別分析 */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <User className="h-5 w-5 text-gray-600" />
            <h4 className="text-md font-medium text-gray-900">性別</h4>
          </div>
          
          <div className="space-y-3">
            {genderData.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <span className="text-sm text-gray-600">{item.value}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${item.color}`}
                    style={{ width: `${item.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 年齢分析 */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <UserCheck className="h-5 w-5 text-gray-600" />
            <h4 className="text-md font-medium text-gray-900">年齢層</h4>
          </div>
          
          <div className="space-y-3">
            {ageData.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <span className="text-sm text-gray-600">{item.value}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${item.color}`}
                    style={{ width: `${item.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
