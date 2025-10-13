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
  generatedStrategy: string | null;
  setGeneratedStrategy: (strategy: string | null) => void;
}

export const AIDiagnosisPanel: React.FC<AIDiagnosisPanelProps> = ({
  showAdvice,
  isLoading,
  onStartDiagnosis,
  onSaveAdvice,
  formData,
  simulationResult,
  generatedStrategy,
  setGeneratedStrategy
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

  // ★ 戦略生成完了時に保存
  React.useEffect(() => {
    if (strategyState.strategy) {
      setGeneratedStrategy(strategyState.strategy);
    }
  }, [strategyState.strategy, setGeneratedStrategy]);

  // セクションの展開/折りたたみ
  const toggleSection = (index: number) => {
    setExpandedSections(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  // AI戦略をセクション別に分割（4セクション）
  const parseStrategyIntoSections = (strategy: string) => {
    const sections = [
      { id: 0, title: '① 全体の投稿戦略', icon: '🎯', color: 'blue' },
      { id: 1, title: '② 投稿構成の方向性', icon: '📅', color: 'purple' },
      { id: 2, title: '③ カスタマージャーニー', icon: '🚀', color: 'green' },
      { id: 3, title: '④ 注意点・成功のコツ', icon: '💡', color: 'yellow' }
    ];

    // セクション区切りを検出（①、②、③、④ または ### ）
    const sectionMarkers = [
      { pattern: /①.*?全体の投稿戦略/i, id: 0 },
      { pattern: /②.*?投稿構成の方向性/i, id: 1 },
      { pattern: /③.*?カスタマージャーニー/i, id: 2 },
      { pattern: /④.*?注意点.*?成功.*?コツ/i, id: 3 }
    ];

    const parsedSections = sections.map((section) => {
      const marker = sectionMarkers.find(m => m.id === section.id);
      if (!marker) return { ...section, content: '' };

      // セクションの開始位置を検索
      const startMatch = strategy.match(marker.pattern);
      if (!startMatch) return { ...section, content: '' };
      
      const startIndex = startMatch.index || 0;
      
      // 次のセクションの開始位置を検索
      const nextMarker = sectionMarkers.find(m => m.id === section.id + 1);
      let endIndex = strategy.length;
      
      if (nextMarker) {
        const endMatch = strategy.slice(startIndex + 1).match(nextMarker.pattern);
        if (endMatch && endMatch.index !== undefined) {
          endIndex = startIndex + 1 + endMatch.index;
        }
      }
      
      // セクション内容を抽出
      const content = strategy.slice(startIndex, endIndex).trim();
      
      return {
        ...section,
        content
      };
    });

    return parsedSections.filter(s => s.content);
  };

  // Markdownをクリーンアップ（**, ##, -, などを削除）
  const cleanMarkdown = (text: string): string => {
    return text
      // セクション番号とタイトルを削除（4セクション）
      .replace(/^[①②③④]\s*\*\*.*?\*\*\s*/g, '')
      // ## ヘッダーを削除
      .replace(/^##\s*/gm, '')
      // ### ヘッダーを削除
      .replace(/^###\s*/gm, '')
      // **太字**を削除（太字記号のみ）
      .replace(/\*\*(.*?)\*\*/g, '$1')
      // __太字__を削除
      .replace(/__(.*?)__/g, '$1')
      // リストマーカー「- 」を「• 」に変更
      .replace(/^- /gm, '• ')
      // 連続する空行を1つに
      .replace(/\n\n\n+/g, '\n\n')
      // 先頭と末尾の空白を削除
      .trim();
  };

  return (
    <section className="p-6">
      <h3 className="text-lg font-semibold mb-2 flex items-center">
        <span className="mr-2">🤖</span>AIによる投稿戦略アドバイス
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        目標や施策をもとに、AIが最適な方向性を提案します。
      </p>


      {/* 診断ボタン（常に表示、生成済みの場合はテキスト変更） */}
      {!strategyState.isLoading && !isLoading && (
        <button
          onClick={handleStartDiagnosis}
          disabled={isLoading || strategyState.isLoading}
          className="w-full bg-[#ff8a15] hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-3 px-6 rounded-md transition-colors mb-4 relative overflow-hidden group"
        >
          <span className="relative z-10">
            {generatedStrategy ? '🔄 AI戦略を再生成する' : '▶ 診断を開始する'}
          </span>
          <span className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
        </button>
      )}

      {/* エラー表示 */}
      {strategyState.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">
            {strategyState.error}
          </p>
        </div>
      )}

      {/* ローディング表示 */}
      {(isLoading || strategyState.isLoading) && (
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-[#ff8a15] rounded-lg p-8 text-center animate-pulse">
          <div className="flex flex-col items-center justify-center space-y-4">
            <svg className="animate-spin h-12 w-12 text-[#ff8a15]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg font-semibold text-[#ff8a15]">🤖 AI戦略を生成中...</p>
            <p className="text-sm text-gray-600">あなたのビジネスに最適な戦略を分析しています</p>
          </div>
        </div>
      )}

      {/* 診断出力エリア（generatedStrategyがあれば常に表示） */}
      {generatedStrategy && !isLoading && !strategyState.isLoading && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-lg">提案内容</h4>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              AI生成済み
            </span>
          </div>
          
          {generatedStrategy ? (
            <div className="space-y-3">
              {/* セクション別にアコーディオン表示 */}
              {parseStrategyIntoSections(generatedStrategy).map((section) => {
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
                          {cleanMarkdown(section.content)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 全て展開/折りたたみボタン */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setExpandedSections([0, 1, 2, 3])}
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

          {generatedStrategy && (
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
