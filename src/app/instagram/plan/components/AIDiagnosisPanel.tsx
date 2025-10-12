import React from 'react';
import { PlanFormData, SimulationResult } from '../types/plan';
import { useAIStrategy } from '../hooks/useAIStrategy';

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
  const { strategyState, generateStrategy } = useAIStrategy();

  const handleStartDiagnosis = async () => {
    try {
      await generateStrategy(formData, simulationResult || null);
      onStartDiagnosis();
    } catch (error) {
      console.error('Strategy generation failed:', error);
    }
  };
  return (
    <section className="p-6">
      <h3 className="text-lg font-semibold mb-2 flex items-center">
        <span className="mr-2">🤖</span>AIによる投稿戦略アドバイス
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        目標や施策をもとに、AIが最適な方向性を提案します。
      </p>


      <button
        onClick={handleStartDiagnosis}
        disabled={isLoading || strategyState.isLoading}
        className="w-full bg-[#ff8a15] hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-3 px-6 rounded-md transition-colors mb-4"
      >
        {isLoading || strategyState.isLoading ? 'AI戦略生成中...' : '▶ 診断を開始する'}
      </button>

      {/* エラー表示 */}
      {strategyState.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">
            {strategyState.error}
          </p>
        </div>
      )}

      {/* 診断出力エリア */}
      {showAdvice && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-lg">提案内容</h4>
            {strategyState.strategy && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                AI生成済み
              </span>
            )}
          </div>
          
          {strategyState.strategy ? (
            <div className="space-y-4">
              {/* AI生成内容を表示 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                    {strategyState.strategy}
                  </div>
                </div>
              </div>

              {/* フォームデータに基づく世界観情報 */}
              {formData && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="font-medium mb-3 text-gray-800 border-b border-blue-100 pb-2">
                    📊 入力された世界観情報
                  </h5>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <strong className="text-sm text-gray-700">ブランドコンセプト：</strong>
                        <span className="text-sm text-gray-600 ml-2">
                          {formData.brandConcept || '未設定'}
                        </span>
                      </div>
                      <div>
                        <strong className="text-sm text-gray-700">メインカラー：</strong>
                        <span className="text-sm text-gray-600 ml-2">
                          {formData.colorVisual || '未設定'}
                        </span>
                        {formData.colorVisual && (
                          <span className="inline-block w-4 h-4 ml-2 border border-gray-400 rounded align-middle bg-[#ff8a15]"></span>
                        )}
                      </div>
                      <div>
                        <strong className="text-sm text-gray-700">文章トーン：</strong>
                        <span className="text-sm text-gray-600 ml-2">
                          {formData.tone || '未設定'}
                        </span>
                      </div>
                      <div>
                        <strong className="text-sm text-gray-700">サブカラー：</strong>
                        <span className="text-sm text-gray-600 ml-2">白・グレー</span>
                        <div className="inline-flex space-x-1 ml-2 align-middle">
                          <span className="w-3 h-3 bg-white border border-gray-400 rounded"></span>
                          <span className="w-3 h-3 bg-gray-400 rounded"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">
                「診断を開始する」ボタンを押してAI戦略を生成してください
              </p>
            </div>
          )}

          {strategyState.strategy && (
            <div className="pt-4">
              <button
                className="w-full bg-[#ff8a15] hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-md transition-colors"
                onClick={onSaveAdvice}
              >
                この戦略を保存する
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
