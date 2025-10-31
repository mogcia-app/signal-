'use client';

import React from 'react';
import { Target, Calendar, Users, Tag } from 'lucide-react';
import { PlanData } from '../app/instagram/plan/types/plan';

interface CurrentPlanCardProps {
  planData: PlanData | null;
  variant?: 'compact' | 'full' | 'detailed';
  showEditButton?: boolean;
  snsType?: 'instagram' | 'x' | 'tiktok' | 'youtube';
  actualFollowers?: number; // 分析データから取得した実際のフォロワー数
}

export const CurrentPlanCard: React.FC<CurrentPlanCardProps> = ({
  planData,
  variant = 'compact',
  showEditButton = true,
  snsType = 'instagram',
  actualFollowers
}) => {
  // 計画が存在しない場合
  if (!planData) {
    return (
      <div className="bg-white rounded-none border border-gray-200 shadow-sm mb-4">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-black" />
          </div>
          <h3 className="text-lg font-semibold text-black mb-2">
            運用計画が設定されていません
          </h3>
          <p className="text-black text-sm mb-4">
            {snsType === 'instagram' ? 'Instagram' : snsType === 'x' ? 'X (Twitter)' : snsType === 'tiktok' ? 'TikTok' : 'YouTube'}の成長を加速させるために、まず運用計画を立てましょう
          </p>
                      <a
              href={`/${snsType}/plan`}
              className="inline-flex items-center px-4 py-2 bg-[#ff8a15] text-white rounded-none hover:bg-orange-600 transition-colors"
            >
            <Target className="w-4 h-4 mr-2" />
            運用計画を立てる
          </a>
        </div>
      </div>
    );
  }

  // 安全にアクセス
  const currentFollowers = planData.currentFollowers || 0;
  const targetFollowers = planData.targetFollowers || 0;
  const strategies = planData.strategies || [];
  // const postCategories = planData.postCategories || [];
  
  // 新しい達成度計算: 現在のフォロワー数 = 0%, 目標フォロワー数 = 100%
  // actualFollowersが提供されている場合はそれを使用、そうでなければ計画の現在フォロワー数を使用
  const displayFollowers = actualFollowers !== undefined ? actualFollowers : currentFollowers;
  
  // フォロワー増加数を基準に達成度を計算
  const followerIncrease = displayFollowers - currentFollowers;
  const targetIncrease = targetFollowers - currentFollowers;
  const progressPercentage = targetIncrease > 0 
    ? Math.min((followerIncrease / targetIncrease) * 100, 100) 
    : 0;
  const remainingFollowers = Math.max(0, targetFollowers - displayFollowers);

  // シミュレーション結果
  const simulationResult = planData.simulationResult as Record<string, unknown> | null;
  const hasSimulation = simulationResult && typeof simulationResult === 'object';

  return (
    <div className="bg-white rounded-none border border-gray-200 shadow-sm mb-4">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-black flex items-center">
          <span className="mr-2">📋</span>
          現在の運用計画
        </h3>
        {showEditButton && (
          <a 
            href={`/${snsType}/plan`}
            className="text-sm text-[#ff8a15] hover:text-orange-600 transition-colors font-medium"
          >
            編集 →
          </a>
        )}
      </div>

      {/* コンテンツ */}
      <div className="p-6 space-y-4">
        {/* 計画タイトル */}
        <div>
          <p className="text-xs text-black mb-1">計画名</p>
          <p className="font-medium text-black">{planData.title}</p>
        </div>

        {/* フォロワー目標進捗 */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-black">フォロワー目標</span>
            <span className="font-medium text-black">
              {displayFollowers.toLocaleString()} → {targetFollowers.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-none h-2.5">
            <div
              className="bg-gradient-to-r from-[#ff8a15] to-orange-600 h-2.5 rounded-none transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-black mt-1">
            <span>{progressPercentage.toFixed(1)}% 達成</span>
            <span>残り {remainingFollowers.toLocaleString()}人</span>
          </div>
        </div>

        {/* グリッド情報 */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-black" />
            <div className="text-sm">
              <span className="text-black">期間: </span>
              <span className="font-medium text-black">{planData.planPeriod}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-black" />
            <div className="text-sm">
              <span className="text-black">ターゲット: </span>
              <span className="font-medium text-black">{planData.targetAudience}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-black" />
            <div className="text-sm">
              <span className="text-black">KPI: </span>
              <span className="font-medium text-black">
                {(() => {
                  const categoryMap: Record<string, string> = {
                    'follower': 'フォロワー',
                    'engagement': 'エンゲージメント',
                    'reach': 'リーチ',
                    'impression': 'インプレッション',
                    'click': 'クリック',
                    'conversion': 'コンバージョン'
                  };
                  return categoryMap[planData.category] || planData.category;
                })()}
              </span>
            </div>
          </div>
          {hasSimulation && (
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-black" />
              <div className="text-sm">
                <span className="text-black">達成度: </span>
                <span className={`font-semibold ${
                  simulationResult.feasibilityLevel === 'high' ? 'text-green-600' :
                  simulationResult.feasibilityLevel === 'medium' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {String(simulationResult.feasibilityBadge || 'N/A')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 施策タグ */}
        {strategies.length > 0 && (
          <div>
            <p className="text-xs text-black mb-2">施策</p>
            <div className="flex flex-wrap gap-2">
              {strategies.slice(0, 3).map((strategy, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 bg-orange-50 text-orange-700 text-xs rounded-none font-medium"
                >
                  {strategy}
                </span>
              ))}
              {strategies.length > 3 && (
                <span className="px-2.5 py-1 bg-gray-100 text-black text-xs rounded-none">
                  +{strategies.length - 3}個
                </span>
              )}
            </div>
          </div>
        )}


        {/* AI戦略サマリー（variant = 'full'の場合のみ） */}
        {variant === 'full' && planData.generatedStrategy && (
          <div className="bg-orange-50 border border-orange-200 rounded-none p-3">
            <p className="text-xs text-orange-700 font-medium mb-2">🤖 AI戦略が生成済み</p>
            <p className="text-xs text-black">
              計画ページで詳細を確認できます
            </p>
          </div>
        )}

        {/* 詳細情報（variant = 'detailed'の場合のみ） */}
        {variant === 'detailed' && planData.formData && (() => {
          const formData = planData.formData as Record<string, unknown>;
          const currentFollowers = String(formData.currentFollowers || '');
          const followerGain = String(formData.followerGain || '');
          const goalCategory = String(formData.goalCategory || '');
          const otherGoal = String(formData.otherGoal || '');
          const targetAudience = String(formData.targetAudience || '');
          
          return (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
              {/* 目標 */}
              {currentFollowers && followerGain && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">目標:</span>
                  <span className="ml-2 text-black">
                    現在{currentFollowers}人 → {parseInt(currentFollowers) + parseInt(followerGain)}人
                  </span>
                </div>
              )}
              
              {/* KPIカテゴリ */}
              {goalCategory && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">KPI:</span>
                  <span className="ml-2 text-black">
                    {goalCategory === 'follower' ? 'フォロワー獲得' :
                     goalCategory === 'engagement' ? 'エンゲージ促進' :
                     goalCategory === 'like' ? 'いいねを増やす' :
                     goalCategory === 'save' ? '保存率向上' :
                     goalCategory === 'reach' ? 'リーチを増やす' :
                     goalCategory === 'impressions' ? 'インプレッションを増やす' :
                     goalCategory === 'branding' ? 'ブランド認知を広める' :
                     goalCategory === 'profile' ? 'プロフィール誘導' :
                     goalCategory === 'other' ? (otherGoal || 'その他') :
                     goalCategory}
                  </span>
                </div>
              )}
              
              {/* ターゲット層 */}
              {targetAudience && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">ターゲット層:</span>
                  <span className="ml-2 text-black">{targetAudience}</span>
                </div>
              )}
              
              {/* 取り組みたいこと */}
              {planData.strategies && planData.strategies.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">取り組みたいこと:</span>
                  <div className="ml-2 mt-1 flex flex-wrap gap-1">
                    {planData.strategies.map((strategy, index) => (
                      <span key={index} className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                        {strategy}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 投稿したい内容 */}
              {planData.postCategories && planData.postCategories.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">投稿したい内容:</span>
                  <div className="ml-2 mt-1 flex flex-wrap gap-1">
                    {planData.postCategories.map((category, index) => (
                      <span key={index} className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default CurrentPlanCard;

