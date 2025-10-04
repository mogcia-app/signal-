import React from 'react';
import { Target, Calendar, Users, Tag, TrendingUp } from 'lucide-react';

interface PlanData {
  id: string;
  title: string;
  targetFollowers: number;
  currentFollowers: number;
  planPeriod: string;
  targetAudience: string;
  category: string;
  strategies: string[];
  simulation: {
    postTypes: {
      reel: { weeklyCount: number; followerEffect: number };
      feed: { weeklyCount: number; followerEffect: number };
      story: { weeklyCount: number; followerEffect: number };
    };
  };
  aiPersona: {
    tone: string;
    style: string;
    personality: string;
    interests: string[];
  };
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

  const progressPercentage = Math.min((planData.currentFollowers / planData.targetFollowers) * 100, 100);
  const remainingFollowers = Math.max(0, planData.targetFollowers - planData.currentFollowers);

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
            <div className="font-semibold text-gray-900">{planData.targetFollowers.toLocaleString()}人</div>
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
                {planData.currentFollowers.toLocaleString()} / {planData.targetFollowers.toLocaleString()}
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

        {/* シミュレーション表示 */}
        {showSimulation && variant === 'detailed' && (
          <div className="border-t border-gray-200 pt-4">
            <div className="text-sm font-medium text-gray-700 mb-3">投稿シミュレーション</div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-xs text-purple-600 mb-1">リール</div>
                <div className="font-semibold text-purple-800">{planData.simulation.postTypes.reel.weeklyCount}回/週</div>
                <div className="text-xs text-purple-600">+{planData.simulation.postTypes.reel.followerEffect}人/投稿</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-blue-600 mb-1">フィード</div>
                <div className="font-semibold text-blue-800">{planData.simulation.postTypes.feed.weeklyCount}回/週</div>
                <div className="text-xs text-blue-600">+{planData.simulation.postTypes.feed.followerEffect}人/投稿</div>
              </div>
              <div className="bg-pink-50 rounded-lg p-3">
                <div className="text-xs text-pink-600 mb-1">ストーリー</div>
                <div className="font-semibold text-pink-800">{planData.simulation.postTypes.story.weeklyCount}回/週</div>
                <div className="text-xs text-pink-600">+{planData.simulation.postTypes.story.followerEffect}人/投稿</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
