import React, { useState } from 'react';
import { TrendAnalysis, LearningModel, PDCARecord } from '../types/plan';

interface PDCALearningPanelProps {
  trendAnalysis: TrendAnalysis | null;
  learningModel: LearningModel | null;
  isLoading: boolean;
  error: string;
  onSaveRecord: (record: Omit<PDCARecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<PDCARecord | null>;
  onImprovePrediction: (request: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
}

export const PDCALearningPanel: React.FC<PDCALearningPanelProps> = ({
  trendAnalysis,
  learningModel,
  isLoading,
  error,
  onSaveRecord
  // onImprovePrediction
}) => {
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [recordForm, setRecordForm] = useState({
    phase: 'check' as 'plan' | 'do' | 'check' | 'act',
    startDate: '',
    endDate: '',
    targetMetrics: {
      followerGain: 0,
      engagementRate: 0,
      reach: 0
    },
    actualMetrics: {
      followerGain: 0,
      engagementRate: 0,
      reach: 0,
      posts: 0,
      stories: 0,
      reels: 0
    },
    strategies: [] as string[],
    contentTypes: [] as string[],
    insights: '',
    lessons: '',
    nextActions: ''
  });

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing': return 'text-green-600 bg-green-100';
      case 'decreasing': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleSaveRecord = async () => {
    const record = {
      ...recordForm,
      planId: `plan_${Date.now()}`, // 仮のplanId
      strategies: recordForm.strategies,
      contentTypes: recordForm.contentTypes,
      insights: [recordForm.insights],
      lessons: [recordForm.lessons],
      nextActions: [recordForm.nextActions]
    };
    
    await onSaveRecord(record);
    setShowRecordForm(false);
    // フォームをリセット
    setRecordForm({
      phase: 'check',
      startDate: '',
      endDate: '',
      targetMetrics: { followerGain: 0, engagementRate: 0, reach: 0 },
      actualMetrics: { followerGain: 0, engagementRate: 0, reach: 0, posts: 0, stories: 0, reels: 0 },
      strategies: [],
      contentTypes: [],
      insights: '',
      lessons: '',
      nextActions: ''
    });
  };

  return (
    <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <span className="mr-2">🔄</span>PDCA学習システム
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        過去の実績データを蓄積して、より精度の高い予測と学習を実現します。
      </p>

      {/* エラー表示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* 学習モデル情報 */}
      {learningModel && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-3">🧠 学習モデル状況</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">{Math.round(learningModel.accuracy * 100)}%</div>
              <div className="text-xs text-blue-700">予測精度</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">{learningModel.dataPoints}</div>
              <div className="text-xs text-green-700">データ数</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">{Math.round(learningModel.confidence * 100)}%</div>
              <div className="text-xs text-purple-700">信頼度</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-indigo-600">
                {new Date(learningModel.lastUpdated).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
              </div>
              <div className="text-xs text-indigo-700">最終更新</div>
            </div>
          </div>
        </div>
      )}

      {/* 傾向分析 */}
      {trendAnalysis && (
        <div className="mb-6 space-y-4">
          <h4 className="font-semibold text-gray-900">📊 過去の傾向分析</h4>
          
          {/* 成長傾向 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-700">成長傾向</span>
              <span className={`text-sm px-3 py-1 rounded-full ${getTrendColor(trendAnalysis.growthTrend)}`}>
                {getTrendIcon(trendAnalysis.growthTrend)} {trendAnalysis.growthTrend === 'increasing' ? '上昇' : trendAnalysis.growthTrend === 'decreasing' ? '下降' : '安定'}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              平均成長率: {(trendAnalysis.averageGrowth * 100).toFixed(1)}%
            </div>
          </div>

          {/* 効果的な戦略 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h5 className="font-medium text-green-900 mb-2">✅ 効果的な戦略</h5>
              <ul className="text-sm text-green-700 space-y-1">
                {trendAnalysis.bestStrategies.map((strategy, index) => (
                  <li key={index} className="flex items-center">
                    <span className="mr-2">•</span>
                    <span>{strategy}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <h5 className="font-medium text-red-900 mb-2">⚠️ 効果の低い戦略</h5>
              <ul className="text-sm text-red-700 space-y-1">
                {trendAnalysis.worstStrategies.map((strategy, index) => (
                  <li key={index} className="flex items-center">
                    <span className="mr-2">•</span>
                    <span>{strategy}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 季節パターン */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h5 className="font-medium text-blue-900 mb-3">🌍 季節パターン</h5>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {trendAnalysis.seasonalPatterns.map((pattern, index) => (
                <div key={index} className="text-center">
                  <div className={`text-sm font-bold ${
                    pattern.performance > 1 ? 'text-green-600' : 
                    pattern.performance < 1 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {pattern.performance > 1 ? '+' : ''}{((pattern.performance - 1) * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-600">{pattern.month}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 推奨事項 */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <h5 className="font-medium text-yellow-900 mb-2">💡 推奨事項</h5>
            <ul className="text-sm text-yellow-700 space-y-1">
              {trendAnalysis.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* PDCAレコード保存フォーム */}
      <div className="border-t pt-4">
        <button
          onClick={() => setShowRecordForm(!showRecordForm)}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors mb-4"
        >
          {showRecordForm ? 'フォームを閉じる' : '📝 PDCAレコードを保存'}
        </button>

        {showRecordForm && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h5 className="font-medium text-gray-900">PDCAレコード入力</h5>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">フェーズ</label>
                <select
                  value={recordForm.phase}
                  onChange={(e) => setRecordForm({...recordForm, phase: e.target.value as 'plan' | 'do' | 'check' | 'act'})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="plan">Plan（計画）</option>
                  <option value="do">Do（実行）</option>
                  <option value="check">Check（評価）</option>
                  <option value="act">Act（改善）</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">期間</label>
                <input
                  type="date"
                  value={recordForm.startDate}
                  onChange={(e) => setRecordForm({...recordForm, startDate: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">目標フォロワー増加</label>
                <input
                  type="number"
                  value={recordForm.targetMetrics.followerGain}
                  onChange={(e) => setRecordForm({
                    ...recordForm, 
                    targetMetrics: {...recordForm.targetMetrics, followerGain: parseInt(e.target.value) || 0}
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">実際のフォロワー増加</label>
                <input
                  type="number"
                  value={recordForm.actualMetrics.followerGain}
                  onChange={(e) => setRecordForm({
                    ...recordForm, 
                    actualMetrics: {...recordForm.actualMetrics, followerGain: parseInt(e.target.value) || 0}
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">実際のエンゲージメント率</label>
                <input
                  type="number"
                  step="0.001"
                  value={recordForm.actualMetrics.engagementRate}
                  onChange={(e) => setRecordForm({
                    ...recordForm, 
                    actualMetrics: {...recordForm.actualMetrics, engagementRate: parseFloat(e.target.value) || 0}
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">学んだこと・気づき</label>
              <textarea
                value={recordForm.insights}
                onChange={(e) => setRecordForm({...recordForm, insights: e.target.value})}
                placeholder="この期間で学んだことや気づいたことを記録してください"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm h-20"
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleSaveRecord}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {isLoading ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => setShowRecordForm(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
