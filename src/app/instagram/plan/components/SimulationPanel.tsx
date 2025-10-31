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
  hasActivePlan?: boolean; // 保存された計画があるかどうか
  onSave?: () => void;
  isSaving?: boolean;
}


export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  result,
  formData,
  onRunSimulation,
  isSimulating = false,
  simulationError,
  hasActivePlan = false,
  onSave,
  isSaving = false
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
  // 結果がない場合は初期表示
  if (!result) {
    return (
      <section className="p-6">
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
              className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
    <section className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <span className="mr-2">📊</span>目標達成シミュレーション
        </h3>
        {onRunSimulation && (
          <button
            onClick={onRunSimulation}
            disabled={isSimulating}
            className="text-sm bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
          >
            {isSimulating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                実行中...
              </>
            ) : (
              <>
                <span className="mr-2">🔄</span>
                再度シミュレーション実行
              </>
            )}
          </button>
        )}
      </div>
      
      {simulationError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{simulationError}</p>
        </div>
      )}
      
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
              <div className="text-xl font-bold text-black mb-1">
                {result.monthlyTarget}人/月
              </div>
              <div className="text-sm text-black">月間目標</div>
            </div>
            <div className="text-center p-4 bg-white rounded-md">
              <div className="text-xl font-bold text-black flex items-center justify-center space-x-2 mb-1">
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
              <div className="text-sm text-black">週間目標</div>
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
            <div className="text-lg font-bold text-black mb-1">
              {result.monthlyPostCount}投稿/月
            </div>
            <div className="text-sm text-black">
              📊 {result.workloadMessage}
            </div>
          </div>


        </div>
      </div>

      {/* フォロワー増加推移予測 */}
      <div className="mt-6 bg-white">
        {/* ヘッダー */}
        <div className="p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-600 to-amber-600 rounded-lg flex items-center justify-center mr-3">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-black">📈 フォロワー増加推移予測</h3>
              <p className="text-sm text-black mt-1">
                現実的な成長曲線と目標の比較分析
              </p>
            </div>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="px-6 pb-6">
            {/* 現在の設定表示 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-black mb-1">現在の設定</p>
                <p className="text-lg font-semibold text-black">
                  現在: {currentFollowers.toLocaleString()}人 → 目標: {targetFollowers.toLocaleString()}人
                </p>
                <p className="text-xs text-black mt-1">
                  左カラムの計画フォームで設定を変更できます
                </p>
              </div>
            </div>


            {/* グラフ */}
            <div className="h-96 mb-6 bg-white rounded-2xl p-6 border border-gray-100">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                           <defs>
                             <linearGradient id="realisticGradient" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="0%" stopColor="#F97316" stopOpacity={0.8}/>
                               <stop offset="100%" stopColor="#F97316" stopOpacity={0.1}/>
                             </linearGradient>
                             <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.8}/>
                               <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.1}/>
                             </linearGradient>
                           </defs>
                    <CartesianGrid strokeDasharray="2 8" stroke="#94a3b8" strokeOpacity={0.3} />
                    <XAxis 
                      dataKey="week" 
                      tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                      interval="preserveStartEnd"
                      tickLine={{ stroke: 'transparent' }}
                      axisLine={{ stroke: 'transparent' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                      tickFormatter={(value) => value.toLocaleString()}
                      tickLine={{ stroke: 'transparent' }}
                      axisLine={{ stroke: 'transparent' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                        backdropFilter: 'blur(10px)'
                      }}
                      formatter={(value: number, name: string) => [
                        value.toLocaleString(), 
                        {
                          'realistic': '現実的成長',
                          'userTarget': 'あなたの目標'
                        }[name] || name
                      ]}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      formatter={(value) => {
                        const legendMap: { [key: string]: string } = {
                          'realistic': '現実的成長',
                          'userTarget': 'あなたの目標'
                        };
                        return legendMap[value] || value;
                      }}
                    />
                    
                           {/* 現実的成長 */}
                           <Line
                             type="monotone"
                             dataKey="realistic"
                             stroke="url(#realisticGradient)"
                             strokeWidth={3}
                             dot={{ 
                               fill: '#F97316', 
                               strokeWidth: 2, 
                               r: 5,
                               filter: 'drop-shadow(0 2px 4px rgba(249, 115, 22, 0.3))'
                             }}
                             activeDot={{ 
                               r: 8, 
                               stroke: '#F97316', 
                               strokeWidth: 2,
                               fill: 'white',
                               filter: 'drop-shadow(0 4px 8px rgba(249, 115, 22, 0.4))'
                             }}
                           />
                           
                           {/* ユーザーの目標 */}
                           <Line
                             type="monotone"
                             dataKey="userTarget"
                             stroke="url(#targetGradient)"
                             strokeWidth={3}
                             strokeDasharray="8 4"
                             dot={{ 
                               fill: '#F59E0B', 
                               strokeWidth: 2, 
                               r: 5,
                               filter: 'drop-shadow(0 2px 4px rgba(245, 158, 11, 0.3))'
                             }}
                             activeDot={{ 
                               r: 8, 
                               stroke: '#F59E0B', 
                               strokeWidth: 2,
                               fill: 'white',
                               filter: 'drop-shadow(0 4px 8px rgba(245, 158, 11, 0.4))'
                             }}
                           />
                    
                  </LineChart>
                </ResponsiveContainer>
            </div>

            {/* 統計情報 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-5 rounded-xl border border-orange-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-orange-700 font-semibold mb-1">📊 現実的成長</p>
                          <p className="text-3xl font-bold text-orange-900 mb-1">
                            {growthData.realisticFinal.toLocaleString()}
                          </p>
                          <p className="text-sm text-orange-600 font-medium">
                            +{currentFollowers > 0 ? ((growthData.realisticFinal - currentFollowers) / currentFollowers * 100).toFixed(1) : '0'}% 増加
                          </p>
                        </div>
                        <Target className="w-10 h-10 text-orange-600" />
                      </div>
                    </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-5 rounded-xl border border-amber-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-700 font-semibold mb-1">🎯 あなたの目標</p>
                    <p className="text-3xl font-bold text-amber-900 mb-1">
                      {growthData.userTargetFinal.toLocaleString()}
                    </p>
                    <p className="text-sm text-amber-600 font-medium">
                      +{currentFollowers > 0 ? ((growthData.userTargetFinal - currentFollowers) / currentFollowers * 100).toFixed(1) : '0'}% 増加
                    </p>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-amber-600" />
                </div>
              </div>
            </div>

            {/* ポイントアドバイス */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-xl border border-orange-100">
              <h4 className="font-bold text-black mb-4 flex items-center">
                <span className="mr-2">💡</span>
                ポイントアドバイス
              </h4>
              
              {/* ワンポイントアドバイス */}
              <div className="text-center">
                {result?.onePointAdvice ? (
                  <>
                    {result.onePointAdvice.type === 'warning' ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center justify-center mb-2">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                          <span className="font-semibold text-yellow-800">{result.onePointAdvice.title}</span>
                        </div>
                        <p className="text-sm text-yellow-700">
                          {result.onePointAdvice.message}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-center mb-2">
                          <span className="text-green-600 mr-2">✅</span>
                          <span className="font-semibold text-green-800">{result.onePointAdvice.title}</span>
                        </div>
                        <p className="text-sm text-green-700">
                          {result.onePointAdvice.message}
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-800 font-medium">
                        💡 {result.onePointAdvice.advice}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800 font-medium">
                      💡 エンゲージメント向上に特化した戦略で、ターゲット層に刺さるコンテンツを継続的に投稿することが成功の鍵です。
                    </p>
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>

      {/* 代替案セクション（非常に困難な場合のみ表示） */}
      {result?.alternativeOptions && (
        <div className="mt-6 bg-white">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-900">🎯 より現実的な目標案</h3>
                <p className="text-sm text-red-700 mt-1">
                  目標達成が非常に困難です。以下の代替案をご検討ください
                </p>
              </div>
            </div>

            {/* なぜ困難なのか */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800 font-medium">
                ⚠️ {result.alternativeOptions.whyDifficult}
              </p>
            </div>

            {/* 代替案カード */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* 現実的な目標 */}
              <div className="bg-green-50 border-2 border-green-300 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-bold text-green-900">✅ 現実的な目標</h4>
                  <span className="px-3 py-1 bg-green-200 text-green-800 text-xs rounded-full font-bold">推奨</span>
                </div>
                <div className="mb-4">
                  <div className="text-2xl font-bold text-green-900 mb-1">
                    +{result.alternativeOptions.realistic.followerGain.toLocaleString()}人
                  </div>
                  <div className="text-sm text-green-700">
                    目標: {result.alternativeOptions.realistic.targetFollowers.toLocaleString()}人
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    月間成長率: {result.alternativeOptions.realistic.monthlyGrowthRate}%
                  </div>
                </div>
                <p className="text-sm text-green-800 mb-3">
                  {result.alternativeOptions.realistic.recommendation}
                </p>
                <div className="border-t border-green-200 pt-3">
                  <div className="text-xs font-semibold text-green-700 mb-1">メリット</div>
                  <ul className="text-xs text-green-600 space-y-1">
                    {result.alternativeOptions.realistic.pros.map((pro, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-1">✓</span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 挑戦的な目標 */}
              <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-bold text-orange-900">🚀 挑戦的な目標</h4>
                  <span className="px-3 py-1 bg-orange-200 text-orange-800 text-xs rounded-full font-bold">可能</span>
                </div>
                <div className="mb-4">
                  <div className="text-2xl font-bold text-orange-900 mb-1">
                    +{result.alternativeOptions.moderate.followerGain.toLocaleString()}人
                  </div>
                  <div className="text-sm text-orange-700">
                    目標: {result.alternativeOptions.moderate.targetFollowers.toLocaleString()}人
                  </div>
                  <div className="text-xs text-orange-600 mt-1">
                    月間成長率: {result.alternativeOptions.moderate.monthlyGrowthRate}%
                  </div>
                </div>
                <p className="text-sm text-orange-800 mb-3">
                  {result.alternativeOptions.moderate.recommendation}
                </p>
                <div className="border-t border-orange-200 pt-3">
                  <div className="text-xs font-semibold text-orange-700 mb-1">メリット</div>
                  <ul className="text-xs text-orange-600 space-y-1">
                    {result.alternativeOptions.moderate.pros.map((pro, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-1">✓</span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* 段階的アプローチ */}
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-bold text-blue-900">📈 段階的アプローチ</h4>
                <span className="px-3 py-1 bg-blue-200 text-blue-800 text-xs rounded-full font-bold">段階的</span>
              </div>
              <p className="text-sm text-blue-800 mb-4">
                {result.alternativeOptions.phased.recommendation}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="text-xs font-semibold text-blue-700 mb-2">第一段階</div>
                  <div className="text-xl font-bold text-blue-900 mb-1">
                    +{result.alternativeOptions.phased.phase1.followerGain.toLocaleString()}人
                  </div>
                  <div className="text-sm text-blue-700">
                    目標: {result.alternativeOptions.phased.phase1.targetFollowers.toLocaleString()}人
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {result.alternativeOptions.phased.phase1.description}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="text-xs font-semibold text-blue-700 mb-2">第二段階</div>
                  <div className="text-xl font-bold text-blue-900 mb-1">
                    +{result.alternativeOptions.phased.phase2.followerGain.toLocaleString()}人
                  </div>
                  <div className="text-sm text-blue-700">
                    目標: {result.alternativeOptions.phased.phase2.targetFollowers.toLocaleString()}人
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {result.alternativeOptions.phased.phase2.description}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-200">
                <div className="text-xs font-semibold text-blue-700">期間延長案</div>
                <div className="text-sm text-blue-900 font-bold mt-1">
                  期間を{result.alternativeOptions.extendedPeriod.period}に延長
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  {result.alternativeOptions.extendedPeriod.recommendation}
                </p>
              </div>
            </div>

            {/* その他の戦略 */}
            <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-5">
              <h4 className="text-lg font-bold text-purple-900 mb-4">💡 その他の成長戦略</h4>
              <div className="space-y-3">
                {result.alternativeOptions.otherStrategies.map((strategy, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-bold text-purple-900">{strategy.title}</h5>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        strategy.feasibility === 'realistic' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {strategy.feasibility === 'realistic' ? '現実的' : '困難'}
                      </span>
                    </div>
                    <p className="text-sm text-purple-700 mb-2">{strategy.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-purple-600">{strategy.estimatedBoost}</span>
                      <span className="text-purple-900 font-semibold">{strategy.cost}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 保存ボタン */}
      {result && onSave && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                保存中...
              </>
            ) : (
              <>
                💾 {hasActivePlan ? 'このシュミレーションを更新する' : 'このシュミレーションを保存する'}
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
};
