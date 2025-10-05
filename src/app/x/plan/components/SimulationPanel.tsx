'use client';

import React from 'react';
import { PlanData } from '../../../instagram/plan/types/plan';

interface SimulationResult {
  totalPosts: number;
  estimatedFollowers: number;
  engagementRate: number;
  reachEstimate: number;
  recommendations: string[];
}

interface SimulationPanelProps {
  planData?: PlanData | null;
}

export const SimulationPanel: React.FC<SimulationPanelProps> = ({ planData }) => {
  if (!planData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">シミュレーション</h3>
        </div>
        <div className="p-6 text-center">
          <div className="text-gray-400 text-4xl mb-4">🎯</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            シミュレーションを実行できません
          </h4>
          <p className="text-gray-600">
            運用計画を作成してからシミュレーションを実行してください
          </p>
        </div>
      </div>
    );
  }

  // シミュレーション計算
  const calculateSimulation = (): SimulationResult => {
    const totalWeeklyPosts = 
      planData.simulation.postTypes.feed.weeklyCount +
      planData.simulation.postTypes.reel.weeklyCount +
      planData.simulation.postTypes.story.weeklyCount;

    const weeklyFollowerGain = 
      (planData.simulation.postTypes.feed.weeklyCount * planData.simulation.postTypes.feed.followerEffect) +
      (planData.simulation.postTypes.reel.weeklyCount * planData.simulation.postTypes.reel.followerEffect) +
      (planData.simulation.postTypes.story.weeklyCount * planData.simulation.postTypes.story.followerEffect);

    // 計画期間に基づく計算
    const periodMonths = planData.planPeriod.includes('1ヶ月') ? 1 :
                        planData.planPeriod.includes('3ヶ月') ? 3 :
                        planData.planPeriod.includes('6ヶ月') ? 6 :
                        planData.planPeriod.includes('1年') ? 12 : 3;

    const totalWeeks = periodMonths * 4;
    const estimatedFollowers = planData.currentFollowers + (weeklyFollowerGain * totalWeeks);
    const totalPosts = totalWeeklyPosts * totalWeeks;

    return {
      totalPosts,
      estimatedFollowers,
      engagementRate: Math.min(5 + (totalWeeklyPosts * 0.5), 15), // 投稿頻度に基づく推定
      reachEstimate: estimatedFollowers * 2.5, // フォロワーの2.5倍のリーチ
      recommendations: [
        totalWeeklyPosts < 10 ? '投稿頻度を増やしてエンゲージメントを向上させましょう' : '',
        planData.simulation.postTypes.reel.weeklyCount < 2 ? 'スレッド投稿を増やして詳細な情報発信を強化しましょう' : '',
        planData.simulation.postTypes.story.weeklyCount < 5 ? 'リプライを増やしてコミュニティとの交流を深めましょう' : '',
        'ハッシュタグを効果的に使用してリーチを拡大しましょう'
      ].filter(Boolean)
    };
  };

  const simulation = calculateSimulation();

  return (
    <div className="space-y-6">
      {/* シミュレーション結果 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">シミュレーション結果</h3>
          <p className="text-sm text-gray-600">現在の設定での予測結果</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {simulation.totalPosts}
              </div>
              <div className="text-sm text-gray-600">総投稿数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {simulation.estimatedFollowers.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">予測フォロワー数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {simulation.engagementRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">予測エンゲージメント率</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {simulation.reachEstimate.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">予測リーチ数</div>
            </div>
          </div>
        </div>
      </div>

      {/* 投稿タイプ別分析 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">投稿タイプ別分析</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🐦</div>
                <div>
                  <div className="font-medium text-blue-900">ツイート</div>
                  <div className="text-sm text-blue-700">短文投稿</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-blue-900">
                  {planData.simulation.postTypes.feed.weeklyCount}回/週
                </div>
                <div className="text-sm text-blue-700">
                  +{planData.simulation.postTypes.feed.followerEffect}人/投稿
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🧵</div>
                <div>
                  <div className="font-medium text-green-900">スレッド</div>
                  <div className="text-sm text-green-700">連続投稿</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-green-900">
                  {planData.simulation.postTypes.reel.weeklyCount}回/週
                </div>
                <div className="text-sm text-green-700">
                  +{planData.simulation.postTypes.reel.followerEffect}人/投稿
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">💬</div>
                <div>
                  <div className="font-medium text-purple-900">リプライ</div>
                  <div className="text-sm text-purple-700">コミュニケーション</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-purple-900">
                  {planData.simulation.postTypes.story.weeklyCount}回/週
                </div>
                <div className="text-sm text-purple-700">
                  +{planData.simulation.postTypes.story.followerEffect}人/投稿
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 推奨事項 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">推奨事項</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {simulation.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div className="text-sm text-yellow-800">{recommendation}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationPanel;
