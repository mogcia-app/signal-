import React from 'react';
import { SimulationResult, PlanFormData } from '../types/plan';

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
  if (!result) {
    return (
      <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="mr-2">📊</span>目標達成シミュレーション
        </h3>
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-gray-600 mb-4">
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
                '🎯 シミュレーション実行'
              )}
            </button>
          )}
        </div>
        {simulationError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{simulationError}</p>
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
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="space-y-4">
          {/* メイン目標（横長） */}
          <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-900 mb-1">
              {parseInt(formData.currentFollowers) + parseInt(formData.followerGain)}人
            </div>
            <div className="text-sm text-blue-700 mb-2">目標フォロワー数</div>
            <div className="text-xs text-blue-600 mb-2">
              現在 {parseInt(formData.currentFollowers)}人 → 目標 {parseInt(formData.currentFollowers) + parseInt(formData.followerGain)}人（+{formData.followerGain}人）
            </div>
            <div className="text-sm text-blue-800 font-medium">
              📅 達成期限：{result.targetDate}
            </div>
            <div className="text-xs text-blue-500 mt-2">
              ※ シミュレーション結果は参考値です。実際の成果は個人差があります。
            </div>
          </div>

          {/* サブKPI（2つ並び） */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center p-4 bg-white rounded-md">
              <div className="text-xl font-bold text-gray-900 mb-1">
                {result.monthlyTarget}人/月
              </div>
              <div className="text-sm text-gray-600">月間目標</div>
            </div>
            <div className="text-center p-4 bg-white rounded-md">
              <div className="text-xl font-bold text-gray-900 flex items-center justify-center space-x-2 mb-1">
                <span>{result.weeklyTarget}人/週</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  result.feasibilityLevel === 'very_realistic' 
                    ? 'bg-blue-100 text-blue-800'
                    : result.feasibilityLevel === 'realistic'
                    ? 'bg-green-100 text-green-800'
                    : result.feasibilityLevel === 'moderate'
                    ? 'bg-yellow-100 text-yellow-800'
                    : result.feasibilityLevel === 'challenging'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {result.feasibilityBadge}
                </span>
              </div>
              <div className="text-sm text-gray-600">週間目標</div>
            </div>
          </div>

          {/* 投稿計画テーブル */}
          <div className="bg-white rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">投稿タイプ</th>
                  <th className="px-3 py-2 text-center">週間必要数</th>
                  <th className="px-3 py-2 text-center">フォロワー効果</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-200">
                  <td className="px-3 py-2">リール</td>
                  <td className="px-3 py-2 text-center font-medium">{result.postsPerWeek.reel}回</td>
                  <td className="px-3 py-2 text-center text-green-600">+3人/投稿</td>
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="px-3 py-2">フィード</td>
                  <td className="px-3 py-2 text-center font-medium">{result.postsPerWeek.feed}回</td>
                  <td className="px-3 py-2 text-center text-blue-600">+2人/投稿</td>
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="px-3 py-2">ストーリー</td>
                  <td className="px-3 py-2 text-center font-medium">{result.postsPerWeek.story}回</td>
                  <td className="px-3 py-2 text-center text-purple-600">+1人/投稿</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 投稿負荷情報 */}
          <div className="bg-gray-100 p-4 rounded-md text-center">
            <div className="text-lg font-bold text-gray-900 mb-1">
              {result.monthlyPostCount}投稿/月
            </div>
            <div className="text-sm text-gray-700">
              📊 {result.workloadMessage}
            </div>
          </div>


                    {/* メインアドバイス */}
                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-md border-l-4 border-orange-400">
                      <div className="text-sm text-orange-800">
                        {result.mainAdvice}
                      </div>
                    </div>
        </div>
      </div>
    </section>
  );
};
