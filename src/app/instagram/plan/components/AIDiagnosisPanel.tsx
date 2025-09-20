import React, { useEffect, useState } from 'react';
import { PlanFormData, SimulationResult } from '../types/plan';
import { generateDynamicAdvice, DynamicAdvice } from '../utils/dynamicAdvice';

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
  onSaveAdvice,
  formData,
  simulationResult
}) => {
  const [dynamicAdvice, setDynamicAdvice] = useState<DynamicAdvice[]>([]);

  // 計画内容が変更されたときに動的アドバイスを生成
  useEffect(() => {
    if (formData) {
      const advice = generateDynamicAdvice(formData, simulationResult);
      setDynamicAdvice(advice);
    }
  }, [formData, simulationResult]);
  return (
    <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-2 flex items-center">
        <span className="mr-2">🤖</span>AIによる投稿戦略アドバイス
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        目標や施策をもとに、AIが最適な方向性を提案します。
      </p>

      {/* 動的アドバイス表示 */}
      {dynamicAdvice.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-800">📋 計画に基づく推奨アドバイス</h4>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {dynamicAdvice.length}件
            </span>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {dynamicAdvice.slice(0, 5).map((advice, index) => (
              <div 
                key={advice.id}
                className={`p-3 rounded-lg border ${
                  advice.priority === 'high' 
                    ? 'bg-red-50 border-red-200' 
                    : advice.priority === 'medium'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start space-x-2">
                  <span className={`inline-block w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    advice.priority === 'high' 
                      ? 'bg-red-500' 
                      : advice.priority === 'medium'
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
                  }`}></span>
                  <div className="flex-1">
                    <h5 className="font-medium text-sm text-gray-800 mb-1">
                      {advice.title}
                    </h5>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {advice.content}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        advice.category === 'strategy' 
                          ? 'bg-purple-100 text-purple-700'
                          : advice.category === 'timing'
                          ? 'bg-green-100 text-green-700'
                          : advice.category === 'content'
                          ? 'bg-blue-100 text-blue-700'
                          : advice.category === 'engagement'
                          ? 'bg-pink-100 text-pink-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {advice.category === 'strategy' ? '戦略' :
                         advice.category === 'timing' ? 'タイミング' :
                         advice.category === 'content' ? 'コンテンツ' :
                         advice.category === 'engagement' ? 'エンゲージメント' : '成長'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        advice.priority === 'high' 
                          ? 'bg-red-100 text-red-700'
                          : advice.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {advice.priority === 'high' ? '重要' :
                         advice.priority === 'medium' ? '中程度' : '参考'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {dynamicAdvice.length > 5 && (
            <div className="text-center mt-2">
              <span className="text-xs text-gray-500">
                他 {dynamicAdvice.length - 5} 件のアドバイスがあります
              </span>
            </div>
          )}
        </div>
      )}

      <button
        onClick={onStartDiagnosis}
        disabled={isLoading}
        className="w-full bg-[#ff8a15] hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-3 px-6 rounded-md transition-colors mb-4"
      >
        {isLoading ? '診断中です...' : '▶ 診断を開始する'}
      </button>

      {/* 診断出力エリア */}
      {showAdvice && (
        <div className="space-y-6">
          <h4 className="font-semibold text-lg">提案内容</h4>
          
          <div className="space-y-4">
            <div>
              <h5 className="font-medium mb-2">① 全体の投稿戦略</h5>
              <p className="text-sm text-gray-600">
                フォロワー獲得を重視した戦略として、週3回のフィード投稿と週2回のリール投稿を推奨します。
              </p>
            </div>

            <div>
              <h5 className="font-medium mb-2">② 投稿構成の方向性</h5>
              <p className="text-sm text-gray-600">
                共感→価値→行動の流れで構成し、保存を促すCTAを各投稿に配置することをお勧めします。
              </p>
            </div>

            <div>
              <h5 className="font-medium mb-2">③ カスタマージャーニー別の投稿役割</h5>
              <div className="text-sm text-gray-600">
                <p>認知段階：ブランド世界観の投稿</p>
                <p>興味段階：ノウハウ・価値提案</p>
                <p>検討段階：商品紹介・比較</p>
              </div>
            </div>

            <div>
              <h5 className="font-medium mb-2">④ 注意点・成功のコツ</h5>
              <p className="text-sm text-gray-600">
                一貫性のある投稿スケジュールを維持し、フォロワーの期待値を定めることが重要です。
              </p>
            </div>

            <div>
              <h5 className="font-medium mb-2">⑤ 世界観診断</h5>
              <p className="text-sm text-gray-600 mb-3">
                AIがあなたのブランド情報から分析した結果、Instagramでは以下のような世界観が最適です。
              </p>

              <ul className="border border-gray-200 rounded-lg p-4 space-y-3">
                <li>
                  <strong>ブランドコンセプト：</strong><br />
                  <span className="text-gray-600">
                    {formData.brandConcept || '未設定'}
                  </span>
                </li>
                <li>
                  <strong>メインカラー：</strong>
                  <span className="text-gray-600">
                    {formData.colorVisual || '未設定'}
                  </span>
                  <span className="inline-block w-5 h-5 ml-2 border border-gray-400 rounded align-middle bg-[#ff8a15]"></span>
                </li>
                <li>
                  <strong>サブカラー：</strong>
                  <span className="text-gray-600">
                    白・グレー
                  </span>
                  <div className="inline-flex space-x-1 ml-2">
                    <span className="w-4 h-4 bg-white border border-gray-400 rounded"></span>
                    <span className="w-4 h-4 bg-gray-400 rounded"></span>
                  </div>
                </li>
                <li>
                  <strong>文章トーン：</strong>
                  <span className="text-gray-600">
                    {formData.tone || '未設定'}
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h5 className="font-medium mb-2">⑥ フィード投稿提案</h5>
              <div className="text-sm text-gray-600">
                <p>• 週3回の投稿で一貫性を保つ</p>
                <p>• 画像の質と構成を重視</p>
                <p>• ハッシュタグは15-20個を推奨</p>
              </div>
            </div>

            <div>
              <h5 className="font-medium mb-2">⑦ リール投稿提案</h5>
              <div className="text-sm text-gray-600">
                <p>• 週2回の投稿でトレンドを活用</p>
                <p>• 最初の3秒で興味を引く</p>
                <p>• 音楽とテキストの組み合わせを重視</p>
              </div>
            </div>

            <div>
              <h5 className="font-medium mb-2">⑧ ストーリー投稿提案</h5>
              <div className="text-sm text-gray-600">
                <p>• 日常的な投稿で親近感を演出</p>
                <p>• インタラクティブ要素を活用</p>
                <p>• 24時間で消える特性を活かした臨場感</p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              className="w-full bg-[#ff8a15] hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-md transition-colors"
              onClick={onSaveAdvice}
            >
              この戦略を保存する
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
