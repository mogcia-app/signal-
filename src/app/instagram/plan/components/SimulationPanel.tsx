import React from 'react';
import { SimulationResult, PlanFormData } from '../types/plan';

interface SimulationPanelProps {
  result: SimulationResult | null;
  formData: PlanFormData;
}

export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  result,
  formData
}) => {
  if (!result) {
    return (
      <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="mr-2">📊</span>目標達成シミュレーション
        </h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">
            左側で目標を入力し、「シミュレーション実行」ボタンを押すとシミュレーション結果が表示されます
          </p>
        </div>
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

                    {/* 成長曲線 */}
                    {result.growthCurve && (
                      <div className="bg-white rounded-md p-4 border border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-3">📈 成長曲線予測</h4>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div className="text-center">
                            <div className="font-bold text-blue-600">{result.growthCurve.month1}人</div>
                            <div className="text-gray-600">1ヶ月目</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-green-600">{result.growthCurve.month2}人</div>
                            <div className="text-gray-600">2ヶ月目</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-purple-600">{result.growthCurve.month3}人</div>
                            <div className="text-gray-600">3ヶ月目</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 成功確率 */}
                    {result.successProbability && (
                      <div className="bg-white rounded-md p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">成功確率</span>
                          <span className={`text-2xl font-bold ${
                            result.successProbability >= 80 ? 'text-green-600' :
                            result.successProbability >= 60 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {result.successProbability}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              result.successProbability >= 80 ? 'bg-green-500' :
                              result.successProbability >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${result.successProbability}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* リスクファクター */}
                    {result.riskFactors && result.riskFactors.length > 0 && (
                      <div className="bg-red-50 rounded-md p-4 border border-red-200">
                        <h4 className="font-medium text-red-800 mb-2">⚠️ 注意点</h4>
                        <ul className="text-sm text-red-700 space-y-1">
                          {result.riskFactors.map((risk, index) => (
                            <li key={index} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 推奨予算 */}
                    {result.recommendedBudget && (
                      <div className="bg-blue-50 rounded-md p-4 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-blue-900">推奨予算（月額）</span>
                          <span className="text-xl font-bold text-blue-600">
                            ¥{result.recommendedBudget.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-blue-700 mt-1">
                          目標達成のための推奨広告予算です
                        </p>
                      </div>
                    )}

                    {/* 競合分析 */}
                    {result.competitorAnalysis && (
                      <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-3">🔍 市場分析</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">平均成長率</span>
                            <span className="font-medium">{(result.competitorAnalysis.avgGrowthRate * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">市場ポジション</span>
                            <span className="font-medium">{result.competitorAnalysis.marketPosition}</span>
                          </div>
                          {result.competitorAnalysis.opportunities.length > 0 && (
                            <div>
                              <span className="text-gray-600">機会</span>
                              <ul className="mt-1 space-y-1">
                                {result.competitorAnalysis.opportunities.map((opportunity, index) => (
                                  <li key={index} className="text-xs text-gray-700">• {opportunity}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

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
