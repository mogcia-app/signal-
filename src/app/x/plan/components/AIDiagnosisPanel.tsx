import React from 'react';
import { PlanFormData, SimulationResult } from '../types/plan';

interface AIDiagnosisPanelProps {
  showAdvice: boolean;
  isLoading: boolean;
  onStartDiagnosis: () => void;
  onSaveAdvice: () => void;
  formData: PlanFormData;
  simulationResult?: SimulationResult | null;
}

export const AIDiagnosisPanel: React.FC<AIDiagnosisPanelProps> = ({
  showAdvice,
  isLoading,
  onStartDiagnosis,
  onSaveAdvice
}) => {
  return (
    <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-2 flex items-center">
        <span className="mr-2">🤖</span>AIによる投稿戦略アドバイス
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        目標や施策をもとに、AIが最適な方向性を提案します。
      </p>

      <button
        onClick={onStartDiagnosis}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 px-6 rounded-md transition-colors mb-4"
      >
        {isLoading ? 'AI戦略生成中...' : '▶ 診断を開始する'}
      </button>

      {/* エラー表示 */}
      {!isLoading && !showAdvice && (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">🤖</div>
          <p className="text-gray-600">
            左側で計画を入力し、シミュレーションを実行してから<br />
            AI診断を開始してください
          </p>
        </div>
      )}

      {/* ローディング表示 */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">AIが戦略を生成中...</p>
        </div>
      )}

      {/* AI戦略表示 */}
      {showAdvice && !isLoading && (
        <div className="space-y-6">
          {/* 全体戦略 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">📋 全体戦略</h4>
            <p className="text-blue-800 text-sm">
              X（旧Twitter）での効果的な運用を目指し、エンゲージメントを重視した投稿戦略を提案します。
              ツイート、スレッド、リプライを適切に組み合わせ、フォロワーとの関係性を深めていきましょう。
            </p>
          </div>

          {/* 投稿構成 */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">📝 投稿構成</h4>
            <div className="space-y-2 text-sm text-green-800">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                <span>ツイート: 日常の気づきや短いメッセージ</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                <span>スレッド: 深い洞察やストーリー展開</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                <span>リプライ: フォロワーとの積極的な交流</span>
              </div>
            </div>
          </div>

          {/* カスタマージャーニー */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold text-purple-900 mb-2">🎯 カスタマージャーニー</h4>
            <p className="text-purple-800 text-sm">
              フォロワーがあなたのアカウントを発見し、フォローし、継続的にエンゲージするまでの
              一連の流れを意識した投稿を心がけましょう。
            </p>
          </div>

          {/* 成功のコツ */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-2">💡 成功のコツ</h4>
            <ul className="space-y-1 text-sm text-yellow-800">
              <li>• 一貫性のあるブランドメッセージ</li>
              <li>• 定期的な投稿スケジュール</li>
              <li>• フォロワーとの積極的な交流</li>
              <li>• トレンドを活用したタイムリーな投稿</li>
            </ul>
          </div>

          {/* ブランド世界観 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">🎨 ブランド世界観</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">コンセプト:</span>
                <div className="font-medium">親しみやすく信頼できる</div>
              </div>
              <div>
                <span className="text-gray-600">メインカラー:</span>
                <div className="font-medium">ブルー系</div>
              </div>
              <div>
                <span className="text-gray-600">サブカラー:</span>
                <div className="font-medium">グレー系</div>
              </div>
              <div>
                <span className="text-gray-600">トーン:</span>
                <div className="font-medium">親しみやすい</div>
              </div>
            </div>
          </div>

          {/* 推奨投稿内容 */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">📱 推奨投稿内容</h4>
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <h5 className="font-medium text-blue-900 mb-2">ツイート</h5>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 日常の気づきや短いメッセージ</li>
                <li>• 質問形式でエンゲージメントを促進</li>
                <li>• トレンドハッシュタグを活用</li>
              </ul>
            </div>

            <div className="bg-green-50 p-3 rounded-lg">
              <h5 className="font-medium text-green-900 mb-2">スレッド</h5>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• 深い洞察やストーリー展開</li>
                <li>• 段階的な情報提供</li>
                <li>• 読者の興味を引く構成</li>
              </ul>
            </div>

            <div className="bg-purple-50 p-3 rounded-lg">
              <h5 className="font-medium text-purple-900 mb-2">リプライ</h5>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• フォロワーとの積極的な交流</li>
                <li>• 感謝の気持ちを表現</li>
                <li>• 建設的な議論を促進</li>
              </ul>
            </div>
          </div>

          {/* 保存ボタン */}
          <button
            onClick={onSaveAdvice}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md transition-colors"
          >
            💾 戦略を保存して続行
          </button>
        </div>
      )}
    </section>
  );
};