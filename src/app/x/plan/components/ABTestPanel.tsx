'use client';

import React from 'react';
import { PlanData } from '../../../instagram/plan/types/plan';

interface ABTestResult {
  testName: string;
  variantA: {
    name: string;
    performance: number;
  };
  variantB: {
    name: string;
    performance: number;
  };
  winner: 'A' | 'B' | 'tie';
  confidence: number;
  recommendation: string;
}

interface ABTestPanelProps {
  planData?: PlanData | null;
}

export const ABTestPanel: React.FC<ABTestPanelProps> = ({ planData }) => {
  if (!planData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-black">A/Bテスト</h3>
        </div>
        <div className="p-6 text-center">
          <div className="text-black text-4xl mb-4">🧪</div>
          <h4 className="text-lg font-medium text-black mb-2">
            A/Bテストを実行できません
          </h4>
          <p className="text-black">
            運用計画を作成してからA/Bテストを実行してください
          </p>
        </div>
      </div>
    );
  }

  // サンプルA/Bテスト結果
  const sampleTests: ABTestResult[] = [
    {
      testName: 'ハッシュタグ数テスト',
      variantA: {
        name: 'ハッシュタグ1個',
        performance: 3.2
      },
      variantB: {
        name: 'ハッシュタグ3個',
        performance: 4.1
      },
      winner: 'B',
      confidence: 85,
      recommendation: 'ハッシュタグ3個の方がエンゲージメント率が高いです'
    },
    {
      testName: '投稿時間テスト',
      variantA: {
        name: '朝（9-11時）',
        performance: 2.8
      },
      variantB: {
        name: '夕方（18-20時）',
        performance: 3.9
      },
      winner: 'B',
      confidence: 92,
      recommendation: '夕方の投稿時間の方が効果的です'
    },
    {
      testName: '投稿タイプテスト',
      variantA: {
        name: 'テキストのみ',
        performance: 2.5
      },
      variantB: {
        name: '画像付き',
        performance: 4.3
      },
      winner: 'B',
      confidence: 78,
      recommendation: '画像付き投稿の方がエンゲージメントが高いです'
    }
  ];

  return (
    <div className="space-y-6">
      {/* A/Bテスト結果 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-black">A/Bテスト結果</h3>
          <p className="text-sm text-black">過去のテスト結果と推奨事項</p>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {sampleTests.map((test, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-black">{test.testName}</h4>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    test.winner === 'A' ? 'bg-blue-100 text-blue-800' :
                    test.winner === 'B' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {test.winner === 'A' ? 'A勝利' : test.winner === 'B' ? 'B勝利' : '引き分け'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className={`p-3 rounded-lg ${
                    test.winner === 'A' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                  }`}>
                    <div className="font-medium text-black mb-1">バリアントA</div>
                    <div className="text-sm text-black mb-1">{test.variantA.name}</div>
                    <div className="text-lg font-semibold text-black">
                      {test.variantA.performance}%
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    test.winner === 'B' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                  }`}>
                    <div className="font-medium text-black mb-1">バリアントB</div>
                    <div className="text-sm text-black mb-1">{test.variantB.name}</div>
                    <div className="text-lg font-semibold text-black">
                      {test.variantB.performance}%
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="text-black">
                    信頼度: <span className="font-medium">{test.confidence}%</span>
                  </div>
                  <div className="text-gray-800 italic">
                    {test.recommendation}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 新しいテスト提案 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-black">新しいテスト提案</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">📝 投稿内容テスト</h4>
              <p className="text-sm text-blue-800 mb-3">
                質問形式 vs 情報提供形式のエンゲージメント率を比較
              </p>
              <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                テストを開始
              </button>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">⏰ 投稿頻度テスト</h4>
              <p className="text-sm text-green-800 mb-3">
                毎日投稿 vs 隔日投稿のフォロワー増加率を比較
              </p>
              <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                テストを開始
              </button>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">🏷️ ハッシュタグ戦略テスト</h4>
              <p className="text-sm text-purple-800 mb-3">
                トレンドハッシュタグ vs ニッチハッシュタグのリーチを比較
              </p>
              <button className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">
                テストを開始
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ABTestPanel;
