import React from 'react';
import { SimulationResult, PlanFormData } from '../types/plan';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle, Target } from 'lucide-react';

interface SimulationPanelProps {
  result: SimulationResult | null;
  formData: PlanFormData;
  onRunSimulation?: () => void;
  isSimulating?: boolean;
  simulationError?: string;
}

export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  result,
  formData,
  onRunSimulation,
  isSimulating = false,
  simulationError
}) => {
  
  const currentFollowers = parseInt(formData.currentFollowers, 10) || 0;
  const targetFollowers = currentFollowers + parseInt(formData.followerGain, 10);
  
  // APIから取得したデータを使用
  const growthData = result?.graphData || {
    data: [],
    realisticFinal: 0,
    userTargetFinal: 0,
    isRealistic: true,
    growthRateComparison: { realistic: 0, userTarget: 0 }
  };
  
  if (!result) {
    return (
      <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="mr-2">📊</span>目標達成シミュレーション
        </h3>
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-black mb-4">
            左側で目標を入力し、シミュレーションを実行してください
          </p>
          {onRunSimulation && (
            <button
              onClick={onRunSimulation}
              disabled={isSimulating}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSimulating ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  シミュレーション実行中...
                </div>
              ) : (
                'シミュレーションを実行'
              )}
            </button>
          )}
        </div>
        
        {simulationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800 text-sm">{simulationError}</p>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <span className="mr-2">📊</span>目標達成シミュレーション
      </h3>
      
      {/* 結果サマリー */}
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{result.monthlyTarget}</div>
            <div className="text-sm text-black">月間目標</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{result.weeklyTarget}</div>
            <div className="text-sm text-black">週間目標</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{result.monthlyPostCount}</div>
            <div className="text-sm text-black">月間投稿数</div>
          </div>
        </div>
        
        <div className="flex items-center justify-center mb-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            result.feasibilityLevel === '高' 
              ? 'bg-green-100 text-green-800' 
              : result.feasibilityLevel === '中'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {result.feasibilityBadge}
          </span>
        </div>
        
        <p className="text-sm text-gray-700 text-center">{result.workloadMessage}</p>
      </div>

      {/* 成長予測グラフ */}
      {growthData.data.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold mb-3 flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            成長予測
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="realistic" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="現実的な成長"
                />
                <Line 
                  type="monotone" 
                  dataKey="userTarget" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="ユーザー目標"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 投稿頻度 */}
      <div className="mb-6">
        <h4 className="text-md font-semibold mb-3">推奨投稿頻度</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-lg font-bold text-blue-600">{result.postsPerWeek.tweet}</div>
            <div className="text-sm text-blue-800">ツイート/週</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-lg font-bold text-green-600">{result.postsPerWeek.thread}</div>
            <div className="text-sm text-green-800">スレッド/週</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <div className="text-lg font-bold text-purple-600">{result.postsPerWeek.reply}</div>
            <div className="text-sm text-purple-800">リプライ/週</div>
          </div>
        </div>
      </div>

      {/* メインアドバイス */}
      <div className="mb-6">
        <h4 className="text-md font-semibold mb-3 flex items-center">
          <Target className="h-4 w-4 mr-2" />
          メインアドバイス
        </h4>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-blue-800">{result.mainAdvice}</p>
        </div>
      </div>

      {/* 改善提案 */}
      {result.improvementTips && result.improvementTips.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold mb-3">改善提案</h4>
          <ul className="space-y-2">
            {result.improvementTips.map((tip, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span className="text-sm text-gray-700">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ワンポイントアドバイス */}
      {result.onePointAdvice && (
        <div className={`p-4 rounded-lg ${
          result.onePointAdvice.type === 'warning' 
            ? 'bg-yellow-50 border border-yellow-200' 
            : 'bg-green-50 border border-green-200'
        }`}>
          <h4 className="font-semibold mb-2 flex items-center">
            {result.onePointAdvice.type === 'warning' ? (
              <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600" />
            ) : (
              <Target className="h-4 w-4 mr-2 text-green-600" />
            )}
            {result.onePointAdvice.title}
          </h4>
          <p className="text-sm mb-2">{result.onePointAdvice.message}</p>
          <p className="text-sm font-medium">{result.onePointAdvice.advice}</p>
        </div>
      )}

      {/* 再実行ボタン */}
      {onRunSimulation && (
        <div className="mt-6">
          <button
            onClick={onRunSimulation}
            disabled={isSimulating}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSimulating ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                シミュレーション実行中...
              </div>
            ) : (
              'シミュレーションを再実行'
            )}
          </button>
        </div>
      )}
    </section>
  );
};