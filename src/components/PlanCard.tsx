import React from 'react';
import { Target, Calendar, Users, Tag, TrendingUp } from 'lucide-react';

interface PlanData {
  id: string;
  userId: string;
  snsType: string;
  status: string;
  title: string;
  targetFollowers: number;
  currentFollowers: number;
  planPeriod: string;
  targetAudience: string;
  category: string;
  strategies: string[];
  postCategories: string[];
  createdAt: string | { toDate?: () => Date };
  updatedAt: string | { toDate?: () => Date };
  
  // シミュレーション結果
  simulationResult?: Record<string, unknown> | null;
  
  // フォームデータ全体
  formData?: Record<string, unknown>;
  
  // AI戦略
  generatedStrategy?: string | null;
}

interface PlanCardProps {
  planData: PlanData | null;
  variant?: 'compact' | 'detailed' | 'progress';
  showStrategies?: boolean;
  showSimulation?: boolean;
  showProgress?: boolean;
  className?: string;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  planData,
  variant = 'compact',
  showStrategies = false,
  showSimulation = false,
  showProgress = false,
  className = ''
}) => {
  if (!planData) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Target size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-600 text-sm mb-3">運用計画が設定されていません</p>
          <a 
            href="/instagram/plan" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            <Target size={16} className="mr-2" />
            計画を作成する
          </a>
        </div>
      </div>
    );
  }

  // 安全にアクセス
  const currentFollowers = planData.currentFollowers || 0;
  const targetFollowers = planData.targetFollowers || 0;
  const progressPercentage = targetFollowers > 0 ? Math.min((currentFollowers / targetFollowers) * 100, 100) : 0;
  const remainingFollowers = Math.max(0, targetFollowers - currentFollowers);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
              <Target size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">運用計画</h3>
              <p className="text-sm text-gray-600">{planData.title}</p>
            </div>
          </div>
          <a 
            href="/instagram/plan" 
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            詳細を見る →
          </a>
        </div>
      </div>

      <div className="p-6">
        {/* 基本情報 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Users size={16} className="text-blue-600 mr-1" />
              <span className="text-sm text-gray-600">目標フォロワー数</span>
            </div>
            <div className="font-semibold text-gray-900">{targetFollowers.toLocaleString()}人</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Calendar size={16} className="text-green-600 mr-1" />
              <span className="text-sm text-gray-600">期間</span>
            </div>
            <div className="font-semibold text-gray-900">{planData.planPeriod}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Tag size={16} className="text-purple-600 mr-1" />
              <span className="text-sm text-gray-600">カテゴリ</span>
            </div>
            <div className="font-semibold text-gray-900">{planData.category}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp size={16} className="text-orange-600 mr-1" />
              <span className="text-sm text-gray-600">ターゲット</span>
            </div>
            <div className="font-semibold text-gray-900">{planData.targetAudience}</div>
          </div>
        </div>

        {/* 進捗表示 */}
        {showProgress && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">フォロワー目標進捗</span>
              <span className="text-sm text-gray-600">
                {currentFollowers.toLocaleString()} / {targetFollowers.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{progressPercentage.toFixed(1)}% 達成</span>
              <span>残り {remainingFollowers.toLocaleString()}人</span>
            </div>
          </div>
        )}

        {/* 戦略表示 */}
        {showStrategies && planData.strategies.length > 0 && (
          <div className="mb-6">
            <div className="text-sm font-medium text-gray-700 mb-3">採用戦略</div>
            <div className="flex flex-wrap gap-2">
              {planData.strategies.slice(0, variant === 'detailed' ? 6 : 3).map((strategy, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium"
                >
                  {strategy}
                </span>
              ))}
              {planData.strategies.length > (variant === 'detailed' ? 6 : 3) && (
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  +{planData.strategies.length - (variant === 'detailed' ? 6 : 3)}個
                </span>
              )}
            </div>
          </div>
        )}

        {/* シミュレーション結果表示 */}
        {showSimulation && variant === 'detailed' && planData.simulationResult && (
          <div className="border-t border-gray-200 pt-4">
            <div className="text-sm font-medium text-gray-700 mb-3">シミュレーション結果</div>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">月間目標:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {String((planData.simulationResult as Record<string, unknown>).monthlyTarget || 'N/A')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">達成可能性:</span>
                  <span className={`ml-2 font-semibold ${
                    (planData.simulationResult as Record<string, unknown>).feasibilityLevel === 'high' ? 'text-green-600' :
                    (planData.simulationResult as Record<string, unknown>).feasibilityLevel === 'medium' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {String((planData.simulationResult as Record<string, unknown>).feasibilityBadge || 'N/A')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
