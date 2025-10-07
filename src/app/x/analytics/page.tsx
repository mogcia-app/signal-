'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { XChatWidget } from '../../../components/x-chat-widget';
import { AuthGuard } from '../../../components/auth-guard';
// Firebase imports removed - now using X analytics API
import { useAuth } from '../../../contexts/auth-context';
import { useXPlanData } from '../../../hooks/useXPlanData';
import { PlanCard } from '../../../components/PlanCard';
import PostPreview from './components/PostPreview';

// オーディエンス分析データの型定義
interface AudienceData {
  gender: {
    male: number; // 男性の割合（%）
    female: number; // 女性の割合（%）
    other: number; // その他の割合（%）
  };
  age: {
    '13-17': number; // 13-17歳の割合（%）
    '18-24': number; // 18-24歳の割合（%）
    '25-34': number; // 25-34歳の割合（%）
    '35-44': number; // 35-44歳の割合（%）
    '45-54': number; // 45-54歳の割合（%）
    '55-64': number; // 55-64歳の割合（%）
    '65+': number; // 65歳以上の割合（%）
  };
}

// 閲覧数ソース分析データの型定義
interface ReachSourceData {
  sources: {
    home: number; // ホームからの閲覧割合（%）
    profile: number; // プロフィールからの閲覧割合（%）
    explore: number; // エクスプローラーからの閲覧割合（%）
    search: number; // 検索からの閲覧割合（%）
    other: number; // その他の閲覧割合（%）
  };
  followers: {
    followers: number; // フォロワー内の閲覧割合（%）
    nonFollowers: number; // フォロワー外の閲覧割合（%）
  };
}

// 投稿データの型定義
interface PostData {
  id: string;
  content: string;
  mediaUrls?: string[];
  timestamp: string;
  metrics: {
    impressions: number;
    engagements: number;
    retweets: number;
    likes: number;
    replies: number;
    clicks: number;
    profileClicks: number;
    linkClicks: number;
  };
}

// アナリティクスデータの型定義
interface AnalyticsData {
  overview: {
    impressions: number;
    profileViews: number;
    mentions: number;
    followers: number;
    following: number;
    tweets: number;
  };
  engagement: {
    engagementRate: number;
    avgEngagementRate: number;
    retweetRate: number;
    likeRate: number;
    replyRate: number;
    clickRate: number;
  };
  audience: AudienceData;
  reachSource: ReachSourceData;
  topPosts: PostData[];
  recentPosts: PostData[];
}

export default function XAnalyticsPage() {
  const { user } = useAuth();
  const { planData } = useXPlanData();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  // const [showAudienceAnalysis, setShowAudienceAnalysis] = useState(false);
  // const [showReachSourceAnalysis, setShowReachSourceAnalysis] = useState(false);


  // Xアナリティクスデータを取得
  const fetchAnalyticsData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      console.log('Fetching X analytics data for user:', user.uid);

      // X専用のanalytics APIを呼び出し
      const response = await fetch(`/api/x/analytics?userId=${user.uid}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch X analytics data');
      }

      console.log('X Analytics API response:', result);
      
      // データがある場合は処理
      if (result.analytics && result.analytics.length > 0) {
        const latestAnalytics = result.analytics[0]; // 最新の分析データを使用
        
        // X専用の分析データ構造に変換
        const analytics: AnalyticsData = {
          overview: {
            impressions: latestAnalytics.impressions || 0,
            profileViews: 0, // Xでは利用できない
            mentions: 0,
            followers: 1250, // 実際のデータがない場合は固定値
            following: 450,
            tweets: result.total || 1,
          },
          engagement: {
            engagementRate: latestAnalytics.engagementRate || 0,
            avgEngagementRate: latestAnalytics.engagementRate || 0,
            retweetRate: latestAnalytics.impressions > 0 ? ((latestAnalytics.retweets || 0) / latestAnalytics.impressions) * 100 : 0,
            likeRate: latestAnalytics.impressions > 0 ? ((latestAnalytics.likes || 0) / latestAnalytics.impressions) * 100 : 0,
            replyRate: latestAnalytics.impressions > 0 ? ((latestAnalytics.comments || 0) / latestAnalytics.impressions) * 100 : 0,
            clickRate: latestAnalytics.impressions > 0 ? ((latestAnalytics.detailClicks || 0) / latestAnalytics.impressions) * 100 : 0,
          },
          audience: latestAnalytics.audience || {
            gender: { male: 65, female: 30, other: 5 },
            age: { '13-17': 10, '18-24': 35, '25-34': 40, '35-44': 10, '45-54': 3, '55-64': 1, '65+': 1 },
          },
          reachSource: latestAnalytics.reachSource || {
            sources: { home: 60, profile: 20, explore: 15, search: 3, other: 2 },
            followers: { followers: 75, nonFollowers: 25 },
          },
          topPosts: [], // 投稿データは別途取得
          recentPosts: [], // 投稿データは別途取得
        };

        setAnalyticsData(analytics);
      } else {
        // データがない場合はダミーデータを表示
        console.log('No X analytics data found, showing placeholder');
        
        const demoData: AnalyticsData = {
          overview: {
            impressions: 15420,
            profileViews: 892,
            mentions: 23,
            followers: 1250,
            following: 342,
            tweets: 89,
          },
          engagement: {
            engagementRate: 4.2,
            avgEngagementRate: 3.8,
            retweetRate: 2.1,
            likeRate: 5.8,
            replyRate: 1.2,
            clickRate: 3.4,
          },
          audience: {
            gender: {
              male: 65,
              female: 32,
              other: 3,
            },
            age: {
              '13-17': 5,
              '18-24': 28,
              '25-34': 35,
              '35-44': 20,
              '45-54': 8,
              '55-64': 3,
              '65+': 1,
            },
          },
          reachSource: {
            sources: {
              home: 45,
              profile: 20,
              explore: 15,
              search: 12,
              other: 8,
            },
            followers: {
              followers: 68,
              nonFollowers: 32,
            },
          },
          topPosts: [],
          recentPosts: [],
        };
        setAnalyticsData(demoData);
      }
    } catch (error) {
      console.error('X Analytics fetch error:', error);
      setError('Xアナリティクスデータの取得に失敗しました');
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);


  if (loading) {
    return (
      <AuthGuard>
        <SNSLayout currentSNS="x">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">アナリティクスデータを読み込み中...</p>
            </div>
          </div>
        </SNSLayout>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <SNSLayout currentSNS="x">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="text-red-600 text-xl mb-4">エラーが発生しました</div>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchAnalyticsData}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                再試行
              </button>
            </div>
          </div>
        </SNSLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
     
      <SNSLayout 
        currentSNS="x"
        customTitle="投稿分析"
        customDescription="投稿の分析データを入力・管理します"
      >
        <div className="container mx-auto px-4 py-8">
        


          {/* 2カラムレイアウト（1:1比率） */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 左側: 分析データ入力フォーム */}
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900">分析データ入力</h2>
              <p className="text-sm text-gray-600 mb-2">投稿のパフォーマンスデータを入力してください</p>

              <div className="space-y-6">
        {/* 投稿検索 */}
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">投稿検索</h3>
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="タイトル、内容、ハッシュタグで検索..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
              <span>検索</span>
            </button>
          </div>
        </div>
        
                {/* 分析データ入力フォーム */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      タイトル
                    </label>
                    <input
                      type="text"
                      placeholder="投稿のタイトルを入力"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      投稿文
                    </label>
                    <textarea
                      placeholder="投稿内容を入力"
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ハッシュタグ
                    </label>
                    <input
                      type="text"
                      placeholder="#hashtag1 #hashtag2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      画像サムネイル
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      いいね数
                    </label>
                    <input
                      type="number"
                      placeholder="例: 425"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      リツイート数
                    </label>
                    <input
                      type="number"
                      placeholder="例: 156"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      コメント数
                    </label>
                    <input
                      type="number"
                      placeholder="例: 89"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      保存数
                    </label>
                    <input
                      type="number"
                      placeholder="例: 67"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      インプレッション数
                    </label>
                    <input
                      type="number"
                      placeholder="例: 15420"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      エンゲージメント数
                    </label>
                    <input
                      type="number"
                      placeholder="例: 736"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      詳細のクリック数
                    </label>
                    <input
                      type="number"
                      placeholder="例: 234"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      プロフィールへのアクセス数
                    </label>
                    <input
                      type="number"
                      placeholder="例: 892"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                    データを分析する
                  </button>
                </div>
              </div>
              </div>

            </div>

            {/* 右側: 投稿プレビュー、運用計画、統計データ */}
            <div className="space-y-6">
              {/* 1. 投稿プレビュー（一番上） */}
              {selectedPost ? (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">投稿プレビュー</h3>
                  <PostPreview
                    post={selectedPost}
                    onClose={() => setSelectedPost(null)}
                  />
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">投稿プレビュー</h3>
                  <div className="text-center py-8 text-gray-500">
                    <p>投稿を選択すると詳細が表示されます</p>
                  </div>
                </div>
              )}

              {/* 2. 運用計画（真ん中） */}
              <PlanCard 
                planData={planData}
                variant="compact"
                showStrategies={true}
              />

              {/* 3. 分析の統計データ（下） */}
              {analyticsData && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">分析統計データ</h3>
                  
                  {/* 基本統計 */}
                  <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-800 mb-3">基本統計</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{analyticsData.overview.impressions.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">総インプレッション</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{analyticsData.overview.profileViews.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">プロフィール閲覧</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{analyticsData.overview.mentions.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">メンション</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{analyticsData.overview.followers.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">フォロワー数</div>
                      </div>
                    </div>
                  </div>

                  {/* エンゲージメント統計 */}
                  <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-800 mb-3">エンゲージメント統計</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{analyticsData.engagement.engagementRate.toFixed(2)}%</div>
                        <div className="text-sm text-gray-600">エンゲージメント率</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{analyticsData.engagement.likeRate.toFixed(2)}%</div>
                        <div className="text-sm text-gray-600">いいね率</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{analyticsData.engagement.retweetRate.toFixed(2)}%</div>
                        <div className="text-sm text-gray-600">リツイート率</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{analyticsData.engagement.replyRate.toFixed(2)}%</div>
                        <div className="text-sm text-gray-600">返信率</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AIチャットウィジェット */}
        <XChatWidget />
      </SNSLayout>
    </AuthGuard>
  );
}
