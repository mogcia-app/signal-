import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
  const [expandedSections, setExpandedSections] = useState<number[]>([0]); // デフォルトで①を展開

  const handleStartDiagnosis = async () => {
    try {
      await generateStrategy(formData, simulationResult || null);
      onStartDiagnosis();
    } catch (error) {
      console.error('Strategy generation failed:', error);
    }
  };

  // セクションの展開/折りたたみ
  const toggleSection = (index: number) => {
    setExpandedSections(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  // AI戦略をセクション別に分割
  const parseStrategyIntoSections = (strategy: string) => {
    const sections = [
      { id: 0, title: '① 全体の投稿戦略', icon: '🎯', color: 'blue' },
      { id: 1, title: '② 投稿構成の方向性', icon: '📅', color: 'purple' },
      { id: 2, title: '③ カスタマージャーニー別の投稿役割', icon: '🚀', color: 'green' },
      { id: 3, title: '④ 注意点・成功のコツ', icon: '💡', color: 'yellow' },
      { id: 4, title: '⑤ 世界観診断', icon: '🎨', color: 'pink' },
      { id: 5, title: '⑥ フィード投稿提案', icon: '📸', color: 'indigo' },
      { id: 6, title: '⑦ リール投稿提案', icon: '🎬', color: 'red' },
      { id: 7, title: '⑧ ストーリー投稿提案', icon: '📱', color: 'cyan' }
    ];

    const parsedSections = sections.map((section, index) => {
      // セクション番号で分割（①、②、...）
      const sectionPattern = new RegExp(`[①②③④⑤⑥⑦⑧].*?(?=[①②③④⑤⑥⑦⑧]|$)`, 'gs');
      const matches = strategy.match(sectionPattern);
      
      if (matches && matches[index]) {
        return {
          ...section,
          content: matches[index].trim()
        };
      }
      
      // フォールバック: ### で分割
      const headerPattern = new RegExp(`###?\\s*${section.title.replace(/[①②③④⑤⑥⑦⑧]/g, '')}[\\s\\S]*?(?=###|$)`, 'i');
      const match = strategy.match(headerPattern);
      
      return {
        ...section,
        content: match ? match[0].trim() : ''
      };
    });

    return parsedSections.filter(s => s.content);
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
            <div className="space-y-3">
              {/* セクション別にアコーディオン表示 */}
              {parseStrategyIntoSections(strategyState.strategy).map((section) => {
                const isExpanded = expandedSections.includes(section.id);
                const colorClasses = {
                  blue: 'bg-blue-50 border-blue-200 text-blue-800',
                  purple: 'bg-purple-50 border-purple-200 text-purple-800',
                  green: 'bg-green-50 border-green-200 text-green-800',
                  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
                  pink: 'bg-pink-50 border-pink-200 text-pink-800',
                  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800',
                  red: 'bg-red-50 border-red-200 text-red-800',
                  cyan: 'bg-cyan-50 border-cyan-200 text-cyan-800'
                };
                const colorClass = colorClasses[section.color as keyof typeof colorClasses] || colorClasses.blue;

                return (
                  <div key={section.id} className={`border rounded-lg ${colorClass}`}>
                    {/* セクションヘッダー（クリックで展開/折りたたみ） */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                    >
                      <div className="flex items-center">
                        <span className="text-xl mr-2">{section.icon}</span>
                        <span className="font-semibold text-sm">{section.title}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>

                    {/* セクションコンテンツ */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-200">
                        <div className="pt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {section.content.replace(/^[①②③④⑤⑥⑦⑧]\s*\*\*.*?\*\*\s*/g, '')}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 全て展開/折りたたみボタン */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setExpandedSections([0, 1, 2, 3, 4, 5, 6, 7])}
                  className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-md transition-colors"
                >
                  📖 全て展開
                </button>
                <button
                  onClick={() => setExpandedSections([])}
                  className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-md transition-colors"
                >
                  📕 全て折りたたむ
                </button>
              </div>
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
