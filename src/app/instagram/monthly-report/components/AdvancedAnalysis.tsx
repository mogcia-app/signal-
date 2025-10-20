import React from 'react';
import { Hash, Clock, TrendingUp } from 'lucide-react';

interface AdvancedAnalysisProps {
  activeTab: 'weekly' | 'monthly';
  reportSummary: {
    period: 'weekly' | 'monthly';
    date: string;
    hashtagStats: { hashtag: string; count: number }[];
    timeSlotAnalysis: {
      label: string;
      range: number[];
      color: string;
      postsInRange: number;
      avgEngagement: number;
    }[];
  } | null;
}

export const AdvancedAnalysis: React.FC<AdvancedAnalysisProps> = ({
  activeTab, // eslint-disable-line @typescript-eslint/no-unused-vars
  reportSummary
}) => {
  const hashtagStats = reportSummary?.hashtagStats || [];
  const timeSlotData = reportSummary?.timeSlotAnalysis || [];
  const bestTimeSlot = timeSlotData.reduce((best, current) => {
    if (current.postsInRange > 0 && current.avgEngagement > best.avgEngagement) {
      return current;
    }
    return best;
  }, timeSlotData[0]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* ハッシュタグ分析 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg flex items-center justify-center mr-3">
            <Hash className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-black">ハッシュタグ分析</h2>
            <p className="text-sm text-black">効果的なハッシュタグの分析</p>
          </div>
        </div>

        <div className="space-y-3">
          {hashtagStats.length > 0 ? hashtagStats.map((item, index) => (
            <div key={item.hashtag} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-gray-700">#{item.hashtag}</span>
              </div>
              <span className="text-sm font-bold text-black">{item.count}回</span>
            </div>
          )) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                <Hash className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-black font-medium mb-1">ハッシュタグを追加してみよう！</p>
              <p className="text-sm text-black">投稿にハッシュタグを付けると<br />人気ハッシュタグ分析が表示されます</p>
            </div>
          )}
        </div>
      </div>

      {/* 投稿時間分析 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-black">投稿時間分析</h2>
              <p className="text-sm text-black">
                投稿分析ページで入力した実際の投稿時間ベースの分析
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-black">
               総投稿数: {hashtagStats.length}件
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {/* 最適な投稿時間の提案 */}
          {bestTimeSlot && bestTimeSlot.postsInRange > 0 && (
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 mb-4">
              <div className="flex items-center mb-2">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <h4 className="font-semibold text-green-900">おすすめ投稿時間</h4>
              </div>
              <p className="text-sm text-green-800">
                <span className="font-medium">{bestTimeSlot.label}</span>が最もエンゲージメントが高い時間帯です。
                平均 <span className="font-bold">{Math.round(bestTimeSlot.avgEngagement)}</span> エンゲージを記録しています。
              </p>
            </div>
          )}

          {/* 時間帯別データ */}
          {timeSlotData.map(({ label, color, postsInRange, avgEngagement }) => (
            <div key={label} className={`p-3 rounded-lg ${postsInRange > 0 ? 'bg-gray-50' : 'bg-gray-25'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-black">{postsInRange}件</span>
                  {postsInRange > 0 && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      avgEngagement > bestTimeSlot.avgEngagement * 0.8 
                        ? 'bg-green-100 text-green-800' 
                        : avgEngagement > bestTimeSlot.avgEngagement * 0.5
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {avgEngagement > bestTimeSlot.avgEngagement * 0.8 ? '高' : 
                       avgEngagement > bestTimeSlot.avgEngagement * 0.5 ? '中' : '低'}
                    </span>
                  )}
                </div>
              </div>
              {postsInRange > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(100, postsInRange * 20)}%` }}
                      />
                    </div>
                    <span className="text-xs text-black">
                      平均 {Math.round(avgEngagement)} エンゲージ
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <div className="text-xs text-black italic">
                    📅 この時間帯はまだ投稿なし
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
