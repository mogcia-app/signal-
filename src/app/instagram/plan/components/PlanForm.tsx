import React from 'react';
import { PlanFormData } from '../types/plan';

interface PlanFormProps {
  formData: PlanFormData;
  selectedStrategies: string[];
  selectedCategories: string[];
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onStrategyToggle: (strategy: string) => void;
  onCategoryToggle: (category: string) => void;
  debugInfo: {
    step: string;
    requestData?: Record<string, unknown>;
    timestamp: string;
    status?: number;
    error?: string;
    details?: Record<string, unknown>;
    improvementTipsCount?: number;
    improvementTips?: string[];
  } | null;
}

export const PlanForm: React.FC<PlanFormProps> = ({
  formData,
  selectedStrategies,
  selectedCategories,
  onInputChange,
  onStrategyToggle,
  onCategoryToggle,
  debugInfo
}) => {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">📋 計画を立てる</h3>
        <p className="text-sm text-gray-600">
          <span className="text-yellow-500">★</span>はAIが参照するための必須項目です。具体的に記入するほど、精度の高いアドバイスが得られます。
        </p>
      </div>

      <div className="space-y-4">
        {/* 計画タイトル */}
        <div>
          <label htmlFor="goalName" className="block text-sm font-medium mb-1">計画タイトル</label>
          <input
            type="text"
            id="goalName"
            name="goalName"
            value={formData.goalName}
            onChange={onInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
          />
        </div>

        {/* 期間 */}
        <div>
          <label htmlFor="planPeriod" className="block text-sm font-medium mb-1">
            <span className="text-yellow-500">★</span>期間
          </label>
          <select
            id="planPeriod"
            name="planPeriod"
            value={formData.planPeriod}
            onChange={onInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
          >
            <option value="1ヶ月">1ヶ月（おすすめ）</option>
            <option value="3ヶ月">3ヶ月</option>
            <option value="6ヶ月">6ヶ月</option>
            <option value="1年">1年</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            この計画は <span className="font-medium">{formData.planPeriod}</span> 単位で運用されます
          </p>
        </div>

        {/* フォロワー数 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="currentFollowers" className="block text-sm font-medium mb-1">
              <span className="text-yellow-500">★</span>現在のフォロワー数
            </label>
            <input
              type="number"
              id="currentFollowers"
              name="currentFollowers"
              value={formData.currentFollowers}
              onChange={onInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="followerGain" className="block text-sm font-medium mb-1">
              <span className="text-yellow-500">★</span>目標フォロワー数
            </label>
            <input
              type="number"
              id="followerGain"
              name="followerGain"
              value={formData.followerGain}
              onChange={onInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
            />
          </div>
        </div>

        {/* KPIカテゴリ */}
        <div>
          <label htmlFor="goalCategorySelect" className="block text-sm font-medium mb-1">
            <span className="text-yellow-500">★</span>KPIカテゴリ
          </label>
          <select
            id="goalCategorySelect"
            name="goalCategory"
            value={formData.goalCategory}
            onChange={onInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
          >
            <option value="">-- 選択してください --</option>
            <option value="follower">フォロワー獲得</option>
            <option value="engagement">エンゲージ促進</option>
            <option value="like">いいねを増やす</option>
            <option value="save">保存率向上</option>
            <option value="reach">リーチを増やす</option>
            <option value="impressions">インプレッションを増やす</option>
            <option value="branding">ブランド認知を広める</option>
            <option value="profile">プロフィール誘導</option>
            <option value="other">その他</option>
          </select>
          {formData.goalCategory === 'other' && (
            <input
              type="text"
              id="otherGoalInput"
              name="otherGoal"
              placeholder="その他の目標カテゴリ"
              value={formData.otherGoal}
              onChange={onInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent mt-2"
            />
          )}
        </div>

        {/* 施策選択 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <span className="text-yellow-500">★</span>施策（複数選択可）
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              'フィード投稿強化', 'リール中心運用', 'ストーリーで交流を深める',
              'UGC活用', 'キャンペーン実施', '広告実施', 'コメント促進',
              'カルーセル導線設計', 'ハッシュタグ見直し'
            ].map((strategy) => (
              <span
                key={strategy}
                className={`px-3 py-2 rounded-md cursor-pointer transition-colors ${
                  selectedStrategies.includes(strategy)
                    ? 'bg-[#ff8a15] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => onStrategyToggle(strategy)}
              >
                {strategy}
              </span>
            ))}
          </div>
        </div>

        {/* 投稿カテゴリ */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <span className="text-yellow-500">★</span>投稿カテゴリ
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              'ノウハウ', '実績紹介', '世界観', '興味喚起', '比較',
              'お悩み解決', 'ビフォーアフター', '共感メッセージ',
              'ユーザーの声', 'キャンペーン・お知らせ', 'トレンド活用'
            ].map((category) => (
              <span
                key={category}
                className={`px-3 py-2 rounded-md cursor-pointer transition-colors ${
                  selectedCategories.includes(category)
                    ? 'bg-[#ff8a15] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => onCategoryToggle(category)}
              >
                {category}
              </span>
            ))}
          </div>
        </div>

        {/* ターゲット層 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="targetAudienceInput" className="block text-sm font-medium mb-1">
              <span className="text-yellow-500">★</span>ターゲット層
            </label>
            <input
              type="text"
              id="targetAudienceInput"
              name="targetAudience"
              value={formData.targetAudience}
              onChange={onInputChange}
              placeholder="例：SNS初心者の20〜30代女性 など"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
            />
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* 投稿頻度 */}
        <div>
          <label className="block text-sm font-medium mb-2">投稿頻度（週あたり）</label>
          <div className="grid grid-cols-3 gap-4">
            <input
              type="number"
              id="feedFreq"
              name="feedFreq"
              placeholder="フィード"
              value={formData.feedFreq}
              onChange={onInputChange}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
            />
            <input
              type="number"
              id="reelFreq"
              name="reelFreq"
              placeholder="リール"
              value={formData.reelFreq}
              onChange={onInputChange}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
            />
            <input
              type="number"
              id="storyFreq"
              name="storyFreq"
              placeholder="ストーリー"
              value={formData.storyFreq}
              onChange={onInputChange}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
            />
          </div>
        </div>

        {/* 目標数値 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="saveGoalInput" className="block text-sm font-medium mb-1">目標保存数</label>
            <input
              type="number"
              id="saveGoalInput"
              name="saveGoal"
              value={formData.saveGoal}
              onChange={onInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="likeGoalInput" className="block text-sm font-medium mb-1">目標いいね数</label>
            <input
              type="number"
              id="likeGoalInput"
              name="likeGoal"
              value={formData.likeGoal}
              onChange={onInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="reachGoalInput" className="block text-sm font-medium mb-1">目標リーチ数</label>
            <input
              type="number"
              id="reachGoalInput"
              name="reachGoal"
              value={formData.reachGoal}
              onChange={onInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
            />
          </div>
        </div>

        {/* AI相談 */}
        <div>
          <label htmlFor="aiHelpRequest" className="block text-sm font-medium mb-1">
            <span className="text-yellow-500">★</span>AIに相談したいこと
          </label>
          <textarea
            id="aiHelpRequest"
            name="aiHelpRequest"
            value={formData.aiHelpRequest}
            onChange={onInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
          />
        </div>

        {/* 前回の振り返り */}
        <div>
          <label htmlFor="pastLearnings" className="block text-sm font-medium mb-1">
            <span className="text-yellow-500">★</span>前回の振り返り・学び
          </label>
          <textarea
            id="pastLearnings"
            name="pastLearnings"
            value={formData.pastLearnings}
            onChange={onInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
          />
        </div>

        {/* 参考アカウント */}
        <div>
          <label htmlFor="referenceAccounts" className="block text-sm font-medium mb-1">参考にするアカウント・競合</label>
          <textarea
            id="referenceAccounts"
            name="referenceAccounts"
            value={formData.referenceAccounts}
            onChange={onInputChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
          />
        </div>

        {/* ハッシュタグ戦略 */}
        <div>
          <label htmlFor="hashtagStrategy" className="block text-sm font-medium mb-1">ハッシュタグ戦略</label>
          <textarea
            id="hashtagStrategy"
            name="hashtagStrategy"
            value={formData.hashtagStrategy}
            onChange={onInputChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
          />
        </div>

        {/* 制約条件 */}
        <div>
          <label htmlFor="constraints" className="block text-sm font-medium mb-1">運用リソース・制約条件</label>
          <textarea
            id="constraints"
            name="constraints"
            value={formData.constraints}
            onChange={onInputChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
          />
        </div>

        {/* メモ */}
        <div>
          <label htmlFor="freeMemo" className="block text-sm font-medium mb-1">メモ・補足</label>
          <textarea
            id="freeMemo"
            name="freeMemo"
            value={formData.freeMemo}
            onChange={onInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
          />
        </div>



        {/* フォーム完了メッセージ */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="text-blue-600 mr-2">💡</div>
            <p className="text-blue-800 text-sm">
              フォーム入力が完了しました。右側のパネルでシミュレーションを実行し、計画を保存してください。
            </p>
          </div>
        </div>

        {/* デバッグ情報表示 */}
        {debugInfo && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-blue-800 font-medium mb-2">🔍 デバッグ情報</h4>
            <div className="text-sm text-blue-700 space-y-2">
              <p><strong>ステップ:</strong> {debugInfo.step}</p>
              <p><strong>時刻:</strong> {debugInfo.timestamp}</p>
              
              {debugInfo.requestData && (
                <div>
                  <strong>送信データ:</strong>
                  <pre className="mt-1 p-2 bg-blue-100 rounded text-xs overflow-x-auto">
                    {JSON.stringify(debugInfo.requestData, null, 2)}
                  </pre>
                </div>
              )}
              
              {debugInfo.status && (
                <p><strong>レスポンス状態:</strong> {debugInfo.status}</p>
              )}
              
              {debugInfo.error && (
                <p className="text-red-600"><strong>エラー:</strong> {debugInfo.error}</p>
              )}
              
              {debugInfo.improvementTipsCount !== undefined && (
                <div>
                  <p><strong>改善提案数:</strong> {debugInfo.improvementTipsCount}</p>
                  {debugInfo.improvementTips && debugInfo.improvementTips.length > 0 && (
                    <div>
                      <strong>改善提案:</strong>
                      <ul className="mt-1 list-disc list-inside">
                        {debugInfo.improvementTips.map((tip: string, index: number) => (
                          <li key={index} className="text-xs">{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
