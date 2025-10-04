import React from 'react';
import { Users, Target } from 'lucide-react';

interface AudienceAnalysisProps {
  activeTab: 'weekly' | 'monthly';
  reportSummary: {
    period: 'weekly' | 'monthly';
    date: string;
    audienceAnalysis: {
      gender: { male: number; female: number; other: number };
      age: { '18-24': number; '25-34': number; '35-44': number; '45-54': number };
    };
    reachSourceAnalysis: {
      sources: { posts: number; profile: number; explore: number; search: number };
      followers: { followers: number; nonFollowers: number };
    };
  } | null;
  getWeekDisplayName: (weekStr: string) => string;
  getMonthDisplayName: (monthStr: string) => string;
  selectedWeek: string;
  selectedMonth: string;
}

export const AudienceAnalysis: React.FC<AudienceAnalysisProps> = ({
  activeTab,
  reportSummary,
  getWeekDisplayName,
  getMonthDisplayName,
  selectedWeek,
  selectedMonth
}) => {
  const audienceAnalysis = reportSummary?.audienceAnalysis || {
    gender: { male: 0, female: 0, other: 0 },
    age: { '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0 }
  };

  const reachSourceAnalysis = reportSummary?.reachSourceAnalysis || {
    sources: { posts: 0, profile: 0, explore: 0, search: 0 },
    followers: { followers: 0, nonFollowers: 0 }
  };

  // BFFから取得したデータを直接使用
  const audienceData = audienceAnalysis;
  const reachSourceData = reachSourceAnalysis;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* オーディエンス分析 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center mr-3">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">オーディエンス分析</h2>
            <p className="text-sm text-gray-600">
              {activeTab === 'weekly' 
                ? `${getWeekDisplayName(selectedWeek)}のオーディエンス構成`
                : `${getMonthDisplayName(selectedMonth)}のオーディエンス構成`
              }
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* 性別分析 */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">性別分析</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-sm font-bold text-gray-700">
                  👨 {audienceData.gender.male.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">男性</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-sm font-bold text-gray-700">
                  👩 {audienceData.gender.female.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">女性</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-sm font-bold text-gray-700">
                  🏳️‍🌈 {audienceData.gender.other.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">その他</div>
              </div>
            </div>
          </div>

          {/* 年齢層分析 */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">年齢層分析</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-xs font-bold text-gray-700">
                  {audienceData.age['18-24'].toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">18-24歳</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-xs font-bold text-gray-700">
                  {audienceData.age['25-34'].toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">25-34歳</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-xs font-bold text-gray-700">
                  {audienceData.age['35-44'].toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">35-44歳</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-xs font-bold text-gray-700">
                  {audienceData.age['45-54'].toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">45-54歳</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 閲覧数ソース分析 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center mr-3">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">閲覧数ソース分析</h2>
            <p className="text-sm text-gray-600">
              {activeTab === 'weekly' 
                ? `${getWeekDisplayName(selectedWeek)}の閲覧ソース構成`
                : `${getMonthDisplayName(selectedMonth)}の閲覧ソース構成`
              }
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* 閲覧ソース分析 */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">閲覧ソース別割合</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-sm font-bold text-gray-700">
                  📱 {reachSourceData.sources.posts.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">投稿</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-sm font-bold text-gray-700">
                  👤 {reachSourceData.sources.profile.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">プロフィール</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-sm font-bold text-gray-700">
                  🔍 {reachSourceData.sources.explore.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">発見</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-sm font-bold text-gray-700">
                  🔎 {reachSourceData.sources.search.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">検索</div>
              </div>
            </div>
          </div>

          {/* フォロワー分析 */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">フォロワー分析</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-sm font-bold text-gray-700">
                  👥 {reachSourceData.followers.followers.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">フォロワー内</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-sm font-bold text-gray-700">
                  🌐 {reachSourceData.followers.nonFollowers.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">フォロワー外</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
