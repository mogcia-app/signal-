'use client';

import React from 'react';
import { PlanData } from '../../../instagram/plan/types/plan';

interface AIDiagnosisResult {
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  priorityActions: string[];
}

interface AIDiagnosisPanelProps {
  planData?: PlanData | null;
}

export const AIDiagnosisPanel: React.FC<AIDiagnosisPanelProps> = ({ planData }) => {
  if (!planData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">AI診断</h3>
        </div>
        <div className="p-6 text-center">
          <div className="text-gray-400 text-4xl mb-4">🔍</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            AI診断を実行できません
          </h4>
          <p className="text-gray-600">
            運用計画を作成してからAI診断を実行してください
          </p>
        </div>
      </div>
    );
  }

  // AI診断の実行
  const runDiagnosis = (): AIDiagnosisResult => {
    let score = 0;
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];
    const priorityActions: string[] = [];

    // 戦略数の評価
    if (planData.strategies.length >= 3) {
      score += 20;
      strengths.push('多様な戦略を設定');
    } else {
      score += planData.strategies.length * 5;
      weaknesses.push('戦略が少ない');
      recommendations.push('より多くの戦略を追加しましょう');
    }

    // 投稿頻度の評価
    const totalWeeklyPosts = 
      planData.simulation.postTypes.feed.weeklyCount +
      planData.simulation.postTypes.reel.weeklyCount +
      planData.simulation.postTypes.story.weeklyCount;

    if (totalWeeklyPosts >= 10) {
      score += 25;
      strengths.push('適切な投稿頻度');
    } else if (totalWeeklyPosts >= 5) {
      score += 15;
      strengths.push('基本的な投稿頻度');
    } else {
      score += totalWeeklyPosts * 2;
      weaknesses.push('投稿頻度が低い');
      recommendations.push('投稿頻度を増やしましょう');
      priorityActions.push('週間投稿数を10回以上に設定');
    }

    // 目標設定の評価
    const growthRate = (planData.targetFollowers - planData.currentFollowers) / planData.currentFollowers;
    if (growthRate <= 2 && growthRate > 0) {
      score += 20;
      strengths.push('現実的な目標設定');
    } else if (growthRate > 2) {
      score += 10;
      weaknesses.push('目標が高すぎる可能性');
      recommendations.push('より現実的な目標に調整を検討');
    } else {
      score += 5;
      weaknesses.push('目標設定に問題');
      recommendations.push('目標フォロワー数を再設定');
    }

    // AIペルソナの評価
    if (planData.aiPersona.tone && planData.aiPersona.style && planData.aiPersona.personality) {
      score += 15;
      strengths.push('AIペルソナが設定済み');
    } else {
      weaknesses.push('AIペルソナが不完全');
      recommendations.push('AIペルソナを完全に設定');
    }

    // ターゲット設定の評価
    if (planData.targetAudience && planData.category) {
      score += 20;
      strengths.push('ターゲットが明確');
    } else {
      weaknesses.push('ターゲットが不明確');
      recommendations.push('ターゲットオーディエンスとカテゴリを明確化');
      priorityActions.push('ターゲット設定の詳細化');
    }

    return {
      score: Math.min(score, 100),
      strengths,
      weaknesses,
      recommendations,
      priorityActions
    };
  };

  const diagnosis = runDiagnosis();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '優秀';
    if (score >= 60) return '良好';
    return '改善必要';
  };

  return (
    <div className="space-y-6">
      {/* 診断結果サマリー */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">AI診断結果</h3>
        </div>
        <div className="p-6">
          <div className="text-center mb-6">
            <div className={`text-4xl font-bold ${getScoreColor(diagnosis.score)}`}>
              {diagnosis.score}
            </div>
            <div className={`text-lg font-medium ${getScoreColor(diagnosis.score)}`}>
              {getScoreLabel(diagnosis.score)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 強み */}
            <div>
              <h4 className="text-sm font-semibold text-green-700 mb-3">✅ 強み</h4>
              <div className="space-y-2">
                {diagnosis.strengths.length > 0 ? (
                  diagnosis.strengths.map((strength, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-800">{strength}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 italic">強みが見つかりませんでした</div>
                )}
              </div>
            </div>

            {/* 改善点 */}
            <div>
              <h4 className="text-sm font-semibold text-red-700 mb-3">⚠️ 改善点</h4>
              <div className="space-y-2">
                {diagnosis.weaknesses.length > 0 ? (
                  diagnosis.weaknesses.map((weakness, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-red-50 rounded-lg">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-red-800">{weakness}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 italic">改善点はありません</div>
                )}
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
            {diagnosis.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="text-sm text-blue-800">{recommendation}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 優先アクション */}
      {diagnosis.priorityActions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">優先アクション</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {diagnosis.priorityActions.map((action, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                  <div className="text-sm text-orange-800">{action}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIDiagnosisPanel;
