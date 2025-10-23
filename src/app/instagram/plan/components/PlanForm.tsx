import React from 'react';
import { PlanFormData } from '../types/plan';
import { InfoTooltip } from './InfoTooltip';

interface PlanFormProps {
  formData: PlanFormData;
  selectedStrategies: string[];
  selectedCategories: string[];
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onStrategyToggle: (strategy: string) => void;
  onCategoryToggle: (category: string) => void;
}

export const PlanForm: React.FC<PlanFormProps> = ({
  formData,
  selectedStrategies,
  selectedCategories,
  onInputChange,
  onStrategyToggle,
  onCategoryToggle
}) => {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">📋 計画を立てる</h3>
        <p className="text-sm text-black">
          具体的に記入するほど、精度の高いアドバイスが得られます。
        </p>
      </div>

      <div className="space-y-4">
        {/* 期間 */}
        <div>
          <label htmlFor="planPeriod" className="block text-sm font-medium mb-1">
          期間
            <InfoTooltip content="計画を実行する期間を選択してください。1ヶ月から始めることをおすすめします。期間が長いほど、より多くのフォロワーを獲得できますが、継続が重要です。" />
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
          <p className="text-sm text-black mt-1">
            この計画は <span className="font-medium">{formData.planPeriod}</span> 単位で運用されます
          </p>
        </div>

        {/* フォロワー数 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="currentFollowers" className="block text-sm font-medium mb-1">
             現在のフォロワー数
              <InfoTooltip content="現在のInstagramアカウントのフォロワー数を入力してください。正確な数値でなくても大丈夫です。例：100人、500人、1000人など" />
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
              目標増加数
              <InfoTooltip content="期間内に何人のフォロワーを増やしたいかを入力してください。現実的な目標を設定することが大切です。例：50人、100人、200人など" />
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
            KPIカテゴリ
            <InfoTooltip content="最も重視したい指標を選択してください。フォロワー獲得、エンゲージ促進、いいねを増やすなど、あなたの目標に最も近いものを選んでください。" />
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
            取り組みたいこと（複数選択可）
            <InfoTooltip content="Instagramで取り組みたいことを複数選択してください。写真投稿、動画投稿、ストーリー活用など、あなたが実践したいものを選んでください。複数選択可能です。" />
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              '写真をたくさん投稿する', '動画（リール）を中心に投稿する', 'ストーリーでフォロワーと交流する',
              'お客様の投稿を紹介する', 'キャンペーンやイベントを開催する', '広告を出して認知度を上げる', 'コメントに積極的に返信する',
              '複数枚の写真で商品を紹介する', 'ハッシュタグを工夫する', 'その他'
            ].map((strategy) => (
              <span
                key={strategy}
                className={`px-3 py-2 rounded-md cursor-pointer transition-colors ${
                  selectedStrategies.includes(strategy)
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-black hover:bg-gray-300'
                }`}
                onClick={() => onStrategyToggle(strategy)}
              >
                {strategy}
              </span>
            ))}
          </div>
          {selectedStrategies.includes('その他') && (
            <input
              type="text"
              placeholder="その他の取り組みたいことを入力してください"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent mt-2"
              onChange={(e) => {
                if (e.target.value.trim()) {
                  const customStrategy = e.target.value.trim();
                  if (!selectedStrategies.includes(customStrategy)) {
                    onStrategyToggle(customStrategy);
                  }
                }
              }}
            />
          )}
        </div>

        {/* 投稿カテゴリ */}
        <div>
          <label className="block text-sm font-medium mb-2">
            投稿したい内容
            <InfoTooltip content="投稿したい内容の種類を複数選択してください。役立つ情報、実績紹介、ブランドの世界観など、あなたが投稿したい内容を選んでください。複数選択可能です。" />
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              '役立つ情報やコツ', '実績や成果の紹介', 'ブランドの世界観', '興味を引く内容', '商品の比較',
              'お悩みの解決方法', 'ビフォーアフター', '共感できるメッセージ',
              'お客様の声やレビュー', 'キャンペーンやお知らせ', '話題のトレンド', 'その他'
            ].map((category) => (
              <span
                key={category}
                className={`px-3 py-2 rounded-md cursor-pointer transition-colors ${
                  selectedCategories.includes(category)
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-black hover:bg-gray-300'
                }`}
                onClick={() => onCategoryToggle(category)}
              >
                {category}
              </span>
            ))}
          </div>
          {selectedCategories.includes('その他') && (
            <input
              type="text"
              placeholder="その他の投稿したい内容を入力してください"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent mt-2"
              onChange={(e) => {
                if (e.target.value.trim()) {
                  const customCategory = e.target.value.trim();
                  if (!selectedCategories.includes(customCategory)) {
                    onCategoryToggle(customCategory);
                  }
                }
              }}
            />
          )}
        </div>

        {/* ターゲット層 */}
        <div>
          <label htmlFor="targetAudienceInput" className="block text-sm font-medium mb-1">
            ターゲット層
            <InfoTooltip content="あなたの投稿を見てほしい人、フォローしてほしい人を具体的に書いてください。年齢、性別、興味、職業など、できるだけ具体的に書くほど効果的です。" />
          </label>
          <textarea
            id="targetAudienceInput"
            name="targetAudience"
            value={formData.targetAudience}
            onChange={onInputChange}
            placeholder="例：SNS初心者の20〜30代女性、美容に興味がある、子育て中のママ など"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent resize-none"
          />
        </div>

        

        {/* 投稿頻度 */}
        {/* <div>
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
        </div> */}

        {/* 目標数値 */}
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div> */}

        {/* AI相談 */}
        {/* <div>
          <label htmlFor="aiHelpRequest" className="block text-sm font-medium mb-1">
            AIに相談したいこと
          </label>
          <textarea
            id="aiHelpRequest"
            name="aiHelpRequest"
            value={formData.aiHelpRequest}
            onChange={onInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
          />
        </div> */}

        {/* 前回の振り返り */}
        {/* <div>
          <label htmlFor="pastLearnings" className="block text-sm font-medium mb-1">
            前回の振り返り・学び
          </label>
          <textarea
            id="pastLearnings"
            name="pastLearnings"
            value={formData.pastLearnings}
            onChange={onInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
          />
        </div> */}

        {/* 参考アカウント */}
        {/* <div>
          <label htmlFor="referenceAccounts" className="block text-sm font-medium mb-1">参考にするアカウント・競合</label>
          <textarea
            id="referenceAccounts"
            name="referenceAccounts"
            value={formData.referenceAccounts}
            onChange={onInputChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
          />
        </div> */}

        {/* ハッシュタグ戦略 */}
        {/* <div>
          <label htmlFor="hashtagStrategy" className="block text-sm font-medium mb-1">ハッシュタグ戦略</label>
          <textarea
            id="hashtagStrategy"
            name="hashtagStrategy"
            value={formData.hashtagStrategy}
            onChange={onInputChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
          />
        </div> */}

        {/* 制約条件 */}
        {/* <div>
          <label htmlFor="constraints" className="block text-sm font-medium mb-1">運用リソース・制約条件</label>
          <textarea
            id="constraints"
            name="constraints"
            value={formData.constraints}
            onChange={onInputChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
          />
        </div> */}

        {/* メモ */}
        {/* <div>
          <label htmlFor="freeMemo" className="block text-sm font-medium mb-1">メモ・補足</label>
          <textarea
            id="freeMemo"
            name="freeMemo"
            value={formData.freeMemo}
            onChange={onInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
          />
        </div> */}



        {/* フォーム完了メッセージ */}
        {/* <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="text-blue-600 mr-2">💡</div>
            <p className="text-blue-800 text-sm">
              フォーム入力が完了しました。右側のパネルでシミュレーションを実行し、計画を保存してください。
            </p>
          </div>
        </div> */}

        {/* デバッグ情報表示 */}
      </div>
    </div>
  );
};
