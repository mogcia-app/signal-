import React from 'react';
import { MLPredictionResult } from '../types/plan';

interface MLPredictionPanelProps {
  result: MLPredictionResult | null;
  isRunning: boolean;
  error: string;
  onRunPrediction: () => void;
  learningBoost?: number;
  dataPoints?: number;
  learningMessage?: string;
}

export const MLPredictionPanel: React.FC<MLPredictionPanelProps> = ({
  result,
  isRunning,
  error,
  onRunPrediction,
  learningBoost,
  dataPoints,
  learningMessage
}) => {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // const getImpactColor = (impact: number) => {
  //   if (impact > 0.3) return 'text-green-600';
  //   if (impact > 0) return 'text-blue-600';
  //   if (impact > -0.3) return 'text-yellow-600';
  //   return 'text-red-600';
  // };

  const getImpactIcon = (impact: number) => {
    if (impact > 0.3) return '📈';
    if (impact > 0) return '↗️';
    if (impact > -0.3) return '↘️';
    return '📉';
  };

  return (
    <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <span className="mr-2">🤖</span>AI予測分析
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        機械学習アルゴリズムによる精密な成長予測と個人化された分析を提供します。
      </p>

      <button
        onClick={onRunPrediction}
        disabled={isRunning}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-300 disabled:to-purple-300 text-white font-medium py-3 px-6 rounded-md transition-colors mb-4"
      >
        {isRunning ? 'AI分析中...' : '▶ AI予測を開始'}
      </button>

      {/* エラー表示 */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* ML予測結果 */}
      {result && (
        <div className="space-y-6">
          {/* 予測概要 */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-blue-900">🔮 AI予測結果</h4>
              <span className="text-sm text-blue-700">
                信頼度: {Math.round(result.confidence * 100)}%
              </span>
            </div>

            {/* PDCA学習ブースト表示 */}
            {learningBoost !== undefined && (
              <div className="mb-3 p-2 bg-green-100 rounded-md border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800">📈 PDCA学習ブースト</span>
                  <span className="text-sm font-bold text-green-600">
                    {learningBoost > 0 ? '+' : ''}{learningBoost}%
                  </span>
                </div>
                {dataPoints && (
                  <div className="text-xs text-green-700 mt-1">
                    過去{dataPoints}回のPDCAサイクルから学習
                  </div>
                )}
                {learningMessage && (
                  <div className="text-xs text-green-700 mt-1">{learningMessage}</div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">{result.predictedGrowth.month1}</div>
                <div className="text-xs text-blue-700">1ヶ月後</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">{result.predictedGrowth.month3}</div>
                <div className="text-xs text-green-700">3ヶ月後</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-600">{result.predictedGrowth.month6}</div>
                <div className="text-xs text-purple-700">6ヶ月後</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-indigo-600">{result.predictedGrowth.month12}</div>
                <div className="text-xs text-indigo-700">12ヶ月後</div>
              </div>
            </div>
          </div>

          {/* 主要要因分析 */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">🔍 主要要因分析</h4>
            
            {result.keyFactors.map((factor, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getImpactIcon(factor.impact)}</span>
                    <span className="font-medium text-gray-900">{factor.factor}</span>
                  </div>
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    factor.impact > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {factor.impact > 0 ? '+' : ''}{(factor.impact * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-sm text-gray-600">{factor.recommendation}</p>
              </div>
            ))}
          </div>

          {/* 成長パターン */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">📈 成長パターン予測</h4>
            <div className="space-y-3">
              {result.growthPattern.map((pattern, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{pattern.phase}</span>
                      <span className="text-sm font-bold text-blue-600">+{pattern.expectedGrowth}人</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{pattern.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 季節調整 */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
            <h4 className="font-semibold text-green-900 mb-3">🌍 季節調整分析</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {result.seasonalAdjustments.slice(0, 8).map((season, index) => (
                <div key={index} className="text-center">
                  <div className={`text-lg font-bold ${
                    season.adjustment > 1 ? 'text-green-600' : 
                    season.adjustment < 1 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {season.adjustment > 1 ? '+' : ''}{((season.adjustment - 1) * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-600">{season.month}</div>
                </div>
              ))}
            </div>
          </div>

          {/* リスク評価 */}
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <h4 className="font-semibold text-red-900 mb-3">⚠️ リスク評価</h4>
            
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">リスクレベル</span>
              <span className={`text-sm px-3 py-1 rounded-full ${getRiskColor(result.riskAssessment.level)}`}>
                {result.riskAssessment.level === 'low' ? '低リスク' : 
                 result.riskAssessment.level === 'medium' ? '中リスク' : '高リスク'}
              </span>
            </div>

            {result.riskAssessment.factors.length > 0 && (
              <div className="mb-3">
                <span className="text-sm font-medium text-gray-700">リスク要因</span>
                <ul className="mt-1 space-y-1">
                  {result.riskAssessment.factors.map((factor, index) => (
                    <li key={index} className="text-sm text-red-700 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.riskAssessment.mitigation.length > 0 && (
              <div>
                <span className="text-sm font-medium text-gray-700">対策案</span>
                <ul className="mt-1 space-y-1">
                  {result.riskAssessment.mitigation.map((mitigation, index) => (
                    <li key={index} className="text-sm text-green-700 flex items-start">
                      <span className="mr-2">✓</span>
                      <span>{mitigation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
