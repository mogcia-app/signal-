import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PlanFormData, SimulationResult } from "../types/plan";
import { useAIStrategy } from "../hooks/useAIStrategy";

interface AIDiagnosisPanelProps {
  isLoading: boolean;
  onStartDiagnosis: () => void;
  onSaveAdvice: () => void;
  formData: PlanFormData;
  selectedStrategies: string[];
  selectedCategories: string[];
  simulationResult?: SimulationResult | null;
  generatedStrategy: string | null;
  setGeneratedStrategy: (strategy: string | null) => void;
}

export const AIDiagnosisPanel: React.FC<AIDiagnosisPanelProps> = ({
  isLoading,
  onStartDiagnosis,
  onSaveAdvice,
  formData,
  selectedStrategies,
  selectedCategories,
  simulationResult,
  generatedStrategy,
  setGeneratedStrategy,
}) => {
  const { strategyState, generateStrategy } = useAIStrategy();
  const [expandedSections, setExpandedSections] = useState<number[]>([0]); // デフォルトで①を展開
  const [saveMessage, setSaveMessage] = useState<string>("");

  const handleStartDiagnosis = async () => {
    try {
      await generateStrategy(
        formData,
        selectedStrategies,
        selectedCategories,
        simulationResult || null
      );
      onStartDiagnosis();
    } catch (error) {
      console.error("Strategy generation failed:", error);
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
    setExpandedSections((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  // AI戦略をセクション別に分割（4セクション）
  const parseStrategyIntoSections = (strategy: string) => {
    const sections = [
      { id: 0, title: "① 全体運用戦略", icon: "🎯", color: "blue" },
      { id: 1, title: "② 投稿設計", icon: "📅", color: "purple" },
      { id: 2, title: "③ カスタマージャーニー", icon: "🚀", color: "green" },
      { id: 3, title: "④ 注視すべき指標", icon: "💡", color: "yellow" },
    ];

    // セクション区切りを検出（①、②、③、④ または ### ）
    const sectionMarkers = [
      { pattern: /①.*?全体運用戦略|①.*?全体の投稿戦略|①.*?全体.*?戦略/i, id: 0 },
      { pattern: /②.*?投稿設計|②.*?投稿構成の方向性|②.*?投稿.*?構造/i, id: 1 },
      { pattern: /③.*?カスタマージャーニー|③.*?関係性.*?カスタマージャーニー/i, id: 2 },
      { pattern: /④.*?注視.*?指標|④.*?注意点.*?成功.*?コツ|④.*?成功.*?コツ/i, id: 3 },
    ];

    const parsedSections = sections.map((section) => {
      const marker = sectionMarkers.find((m) => m.id === section.id);
      if (!marker) {return { ...section, content: "" };}

      // セクションの開始位置を検索
      const startMatch = strategy.match(marker.pattern);
      if (!startMatch) {return { ...section, content: "" };}

      const startIndex = startMatch.index || 0;

      // 次のセクションの開始位置を検索
      const nextMarker = sectionMarkers.find((m) => m.id === section.id + 1);
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
        content,
      };
    });

    return parsedSections.filter((s) => s.content);
  };

  // Markdownをクリーンアップ（**, ##, -, などを削除）
  const cleanMarkdown = (text: string): string => {
    return (
      text
        // セクション番号とタイトルを削除（4セクション）
        .replace(/^[①②③④]\s*\*\*.*?\*\*\s*/g, "")
        // ## ヘッダーを削除
        .replace(/^##\s*/gm, "")
        // ### ヘッダーを削除
        .replace(/^###\s*/gm, "")
        // **太字**を削除（太字記号のみ）
        .replace(/\*\*(.*?)\*\*/g, "$1")
        // __太字__を削除
        .replace(/__(.*?)__/g, "$1")
        // リストマーカー「- 」を「• 」に変更
        .replace(/^- /gm, "• ")
        // 行末の#を削除
        .replace(/#\s*$/gm, "")
        // 行頭の単独#を削除（##や###以外）
        .replace(/^#\s+(?!#)/gm, "")
        // 文末の#（スペースや改行の前）を削除
        .replace(/\s+#\s+/g, " ")
        .replace(/\s+#$/gm, "")
        // 連続する空行を1つに
        .replace(/\n\n\n+/g, "\n\n")
        // 先頭と末尾の空白を削除
        .trim()
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-2">
          AI運用戦略提案
        </h3>
        <p className="text-sm text-gray-900">運用計画をもとにInstagram戦略をAIが提案します</p>
      </div>

        {/* 診断ボタン（常に表示、生成済みの場合はテキスト変更） */}
        <button
          onClick={handleStartDiagnosis}
          disabled={isLoading || strategyState.isLoading}
          className="w-full bg-[#FF8A15] hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 mb-6 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
        >
          {isLoading || strategyState.isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>生成中...</span>
            </>
          ) : generatedStrategy ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>再生成</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>診断を開始</span>
            </>
          )}
        </button>

        {/* エラー表示 */}
        {strategyState.error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-md">
            <p className="text-sm text-red-700">{strategyState.error}</p>
          </div>
        )}

        {/* 診断出力エリア（generatedStrategyがあれば常に表示） */}
        {generatedStrategy && (
          <div className="space-y-5">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">提案内容</h4>
              <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                AI生成済み
              </span>
            </div>

            {generatedStrategy ? (
              <div className="space-y-3">
                {/* セクション別にアコーディオン表示 */}
                {parseStrategyIntoSections(generatedStrategy).map((section) => {
                  const isExpanded = expandedSections.includes(section.id);

                  return (
                    <div key={section.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      {/* セクションヘッダー（クリックで展開/折りたたみ） */}
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base font-semibold text-gray-900">{section.title.replace(/[①②③④]/g, "").trim()}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </button>

                      {/* セクションコンテンツ */}
                      {isExpanded && (
                        <div className="px-6 pb-6 border-t border-gray-100">
                          <div className="pt-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
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
                    className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-md transition-colors font-medium"
                  >
                    全て展開
                  </button>
                  <button
                    onClick={() => setExpandedSections([])}
                    className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-md transition-colors font-medium"
                  >
                    全て折りたたむ
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center shadow-sm">
                <div className="text-gray-400 mb-3">
                  <svg
                    className="w-12 h-12 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">
                  「診断を開始」ボタンを押してAI戦略を生成してください
                </p>
              </div>
            )}

            {generatedStrategy && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <button
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-6 rounded-md transition-all duration-200 shadow-sm"
                  onClick={() => {
                    onSaveAdvice();
                    setSaveMessage("AI戦略を保存しました");
                    // 3秒後にメッセージを非表示
                    setTimeout(() => {
                      setSaveMessage("");
                    }, 3000);
                  }}
                >
                  この戦略を保存
                </button>
                {saveMessage && (
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md text-center">
                    <p className="text-sm text-gray-700 font-medium">{saveMessage}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
    </div>
  );
};
