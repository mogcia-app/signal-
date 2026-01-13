import React from "react";
import { ABTestComparison } from "../types/plan";

interface ABTestPanelProps {
  result: ABTestComparison | null;
  isRunning: boolean;
  error: string;
  onRunTest: () => void;
}

export const ABTestPanel: React.FC<ABTestPanelProps> = ({
  result,
  isRunning,
  error,
  onRunTest,
}) => {
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "low":
        return "text-green-600 bg-green-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "high":
        return "text-red-600 bg-red-100";
      default:
        return "text-black bg-gray-100";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) {return "text-green-600";}
    if (score >= 60) {return "text-yellow-600";}
    return "text-red-600";
  };

  return (
    <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <span className="mr-2">🧪</span>戦略A/Bテスト
      </h3>
      <p className="text-sm text-black mb-4">
        複数の戦略を比較して、あなたに最適なアプローチを見つけます。
      </p>

      <button
        onClick={onRunTest}
        disabled={isRunning}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-medium py-3 px-6 rounded-md transition-colors mb-4"
      >
        {isRunning ? "A/Bテスト実行中..." : "▶ A/Bテストを開始"}
      </button>

      {/* エラー表示 */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* A/Bテスト結果 */}
      {result && (
        <div className="space-y-6">
          {/* 勝者発表 */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-purple-900">🏆 最適戦略</h4>
              <span className="text-sm text-purple-700">
                信頼度: {Math.round(result.confidence * 100)}%
              </span>
            </div>
            <div className="text-lg font-bold text-purple-900 mb-2">
              {result.scenarios.find((s) => s.id === result.winner)?.name}
            </div>
            <p className="text-sm text-purple-700">{result.recommendation}</p>
          </div>

          {/* シナリオ比較表 */}
          <div className="space-y-4">
            <h4 className="font-semibold text-black">📊 戦略比較</h4>

            {result.scenarios.map((scenario, index) => (
              <div
                key={scenario.id}
                className={`border rounded-lg p-4 ${
                  scenario.id === result.winner
                    ? "border-purple-300 bg-purple-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-black">
                        #{index + 1} {scenario.name}
                      </span>
                      {scenario.id === result.winner && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                          推奨
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-black mb-2">{scenario.description}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getScoreColor(scenario.score || 0)}`}>
                      {Math.round(scenario.score || 0)}点
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getRiskColor(scenario.riskLevel)}`}
                    >
                      {scenario.riskLevel === "low"
                        ? "低リスク"
                        : scenario.riskLevel === "medium"
                          ? "中リスク"
                          : "高リスク"}
                    </span>
                  </div>
                </div>

                {/* 戦略詳細 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">投稿頻度</span>
                    <div className="text-gray-600">
                      リール: {scenario.strategy?.postsPerWeek?.reel ?? 0}回/週
                      <br />
                      フィード: {scenario.strategy?.postsPerWeek?.feed ?? 0}回/週
                      <br />
                      ストーリー: {scenario.strategy?.postsPerWeek?.story ?? 0}回/週
                    </div>
                  </div>

                  <div>
                    <span className="font-medium text-gray-700">期待結果</span>
                    <div className="text-gray-600">
                      フォロワー: +{scenario.expectedOutcome.followerGrowth}人<br />
                      エンゲージ: {(scenario.expectedOutcome.engagementRate * 100).toFixed(1)}%
                      <br />
                      リーチ: {scenario.expectedOutcome.reach}人
                    </div>
                  </div>

                  <div>
                    <span className="font-medium text-gray-700">必要リソース</span>
                    <div className="text-gray-600">
                      時間: {scenario.resourceRequirement.timePerWeek}時間/週
                      <br />
                      予算: ¥{scenario.resourceRequirement.budget.toLocaleString()}/月
                      <br />
                      チーム: {scenario.resourceRequirement.teamSize}人
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 実行タイムライン */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-black mb-3">📅 実行タイムライン</h4>
            <div className="space-y-3">
              {result.timeline.map((phase, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-black">{phase.phase}</span>
                      <span className="text-sm text-gray-600">{phase.duration}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{phase.expectedResult}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
