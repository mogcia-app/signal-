'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { XChatWidget } from '../../../components/x-chat-widget';
import { AuthGuard } from '../../../components/auth-guard';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/auth-context';
import { useXPlanData } from '../../../hooks/useXPlanData';
import { PlanCard } from '../../../components/PlanCard';
import PostPreview from './components/PostPreview';
import AnalyticsForm from './components/AnalyticsForm';
import AnalyticsStats from './components/AnalyticsStats';
import { } from 'lucide-react';

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
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  // const [showAudienceAnalysis, setShowAudienceAnalysis] = useState(false);
  // const [showReachSourceAnalysis, setShowReachSourceAnalysis] = useState(false);

  // プランデータを取得
  const { planData } = useXPlanData();

  // アナリティクスデータを取得
  const fetchAnalyticsData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // FirebaseからX投稿データを取得
      const postsRef = collection(db, 'x_posts');
      const q = query(postsRef, where('userId', '==', user.uid));
      const postsSnapshot = await getDocs(q);
      
      const posts: PostData[] = [];
      postsSnapshot.forEach((doc) => {
        const data = doc.data();
        posts.push({
          id: doc.id,
          content: data.content || '',
          mediaUrls: data.mediaUrls || [],
          timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp || '',
          metrics: {
            impressions: data.metrics?.impressions || 0,
            engagements: data.metrics?.engagements || 0,
            retweets: data.metrics?.retweets || 0,
            likes: data.metrics?.likes || 0,
            replies: data.metrics?.replies || 0,
            clicks: data.metrics?.clicks || 0,
            profileClicks: data.metrics?.profileClicks || 0,
            linkClicks: data.metrics?.linkClicks || 0,
          },
        });
      });

      // デモデータ（実際のデータがない場合）
      if (posts.length === 0) {
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
      } else {
        // 実際のデータからアナリティクスを計算
        const totalImpressions = posts.reduce((sum, post) => sum + post.metrics.impressions, 0);
        const totalEngagements = posts.reduce((sum, post) => sum + post.metrics.engagements, 0);
        const totalRetweets = posts.reduce((sum, post) => sum + post.metrics.retweets, 0);
        const totalLikes = posts.reduce((sum, post) => sum + post.metrics.likes, 0);
        const totalReplies = posts.reduce((sum, post) => sum + post.metrics.replies, 0);
        const totalClicks = posts.reduce((sum, post) => sum + post.metrics.clicks, 0);

        const calculatedData: AnalyticsData = {
          overview: {
            impressions: totalImpressions,
            profileViews: Math.floor(totalImpressions * 0.1),
            mentions: Math.floor(totalEngagements * 0.05),
            followers: 1250, // 実際のフォロワー数を取得する必要がある
            following: 342,
            tweets: posts.length,
          },
          engagement: {
            engagementRate: totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0,
            avgEngagementRate: posts.length > 0 ? posts.reduce((sum, post) => {
              const rate = post.metrics.impressions > 0 ? (post.metrics.engagements / post.metrics.impressions) * 100 : 0;
              return sum + rate;
            }, 0) / posts.length : 0,
            retweetRate: totalImpressions > 0 ? (totalRetweets / totalImpressions) * 100 : 0,
            likeRate: totalImpressions > 0 ? (totalLikes / totalImpressions) * 100 : 0,
            replyRate: totalImpressions > 0 ? (totalReplies / totalImpressions) * 100 : 0,
            clickRate: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
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
          topPosts: posts
            .sort((a, b) => b.metrics.engagements - a.metrics.engagements)
            .slice(0, 5),
          recentPosts: posts
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 10),
        };
        setAnalyticsData(calculatedData);
      }
    } catch (err) {
      console.error('アナリティクスデータの取得エラー:', err);
      setError('アナリティクスデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const handleTimeRangeChange = (range: string) => {
    setSelectedTimeRange(range);
    fetchAnalyticsData();
  };

  const handlePostSelect = (post: PostData) => {
    setSelectedPost(post);
  };

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
      <SNSLayout currentSNS="x">
        <div className="container mx-auto px-4 py-8">
          {/* ヘッダー */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">X アナリティクス</h1>
            <p className="text-gray-600">Xアカウントのパフォーマンスを分析・改善しましょう</p>
          </div>

          {/* 時間範囲選択 */}
          <div className="mb-6">
            <div className="flex space-x-2">
              {['7d', '30d', '90d', '1y'].map((range) => (
                <button
                  key={range}
                  onClick={() => handleTimeRangeChange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedTimeRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range === '7d' ? '7日間' : range === '30d' ? '30日間' : range === '90d' ? '90日間' : '1年間'}
                </button>
              ))}
            </div>
          </div>

          {/* 2カラムレイアウト */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 左側: 分析データ入力フォーム */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">投稿のパフォーマンスデータを入力してください</h3>
                
                {/* 分析データ入力フォーム */}
                <div className="space-y-4">
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
                      プロフィール閲覧数
                    </label>
                    <input
                      type="number"
                      placeholder="例: 892"
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
                      返信数
                    </label>
                    <input
                      type="number"
                      placeholder="例: 89"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      クリック数
                    </label>
                    <input
                      type="number"
                      placeholder="例: 234"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                    データを分析する
                  </button>
                </div>
              </div>

              {/* 分析結果 */}
              {analyticsData && (
                <div className="space-y-4">
                  <AnalyticsStats
                    title="概要統計"
                    data={analyticsData.overview}
                    type="overview"
                  />
                  
                  <AnalyticsStats
                    title="エンゲージメント統計"
                    data={analyticsData.engagement}
                    type="engagement"
                  />
                </div>
              )}
            </div>

            {/* 右側: 投稿プレビューと運用計画 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 運用計画 */}
              {planData && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">運用計画</h3>
                  <PlanCard
                    planData={planData}
                  />
                </div>
              )}

              {/* 投稿プレビュー */}
              {selectedPost ? (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">投稿プレビュー</h3>
                  <PostPreview
                    post={selectedPost}
                    onClose={() => setSelectedPost(null)}
                  />
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">投稿プレビュー</h3>
                  <div className="text-center py-8 text-gray-500">
                    <p>投稿を選択すると詳細が表示されます</p>
                  </div>
                </div>
              )}

              {/* 投稿分析フォーム */}
              {analyticsData && (
                <AnalyticsForm
                  onPostAnalysis={handlePostSelect}
                  selectedPost={selectedPost}
                  posts={analyticsData.recentPosts}
                />
              )}

              {/* オーディエンス分析 */}
              {analyticsData && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">オーディエンス分析</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-800 mb-3">性別分布</h4>
                      <div className="space-y-2">
                        {Object.entries(analyticsData.audience.gender).map(([gender, percentage]) => (
                          <div key={gender} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              {gender === 'male' ? '男性' : gender === 'female' ? '女性' : 'その他'}
                            </span>
                            <div className="flex items-center space-x-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900 w-12 text-right">
                                {percentage}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-800 mb-3">年齢分布</h4>
                      <div className="space-y-2">
                        {Object.entries(analyticsData.audience.age).map(([age, percentage]) => (
                          <div key={age} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{age}歳</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-600 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900 w-12 text-right">
                                {percentage}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 閲覧数ソース分析 */}
              {analyticsData && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">閲覧数ソース分析</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-800 mb-3">ソース別閲覧数</h4>
                      <div className="space-y-2">
                        {Object.entries(analyticsData.reachSource.sources).map(([source, percentage]) => (
                          <div key={source} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              {source === 'home' ? 'ホーム' : 
                               source === 'profile' ? 'プロフィール' :
                               source === 'explore' ? 'エクスプローラー' :
                               source === 'search' ? '検索' : 'その他'}
                            </span>
                            <div className="flex items-center space-x-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-purple-600 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900 w-12 text-right">
                                {percentage}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-800 mb-3">フォロワー別閲覧数</h4>
                      <div className="space-y-2">
                        {Object.entries(analyticsData.reachSource.followers).map(([type, percentage]) => (
                          <div key={type} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              {type === 'followers' ? 'フォロワー' : '非フォロワー'}
                            </span>
                            <div className="flex items-center space-x-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-orange-600 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900 w-12 text-right">
                                {percentage}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* トップ投稿 */}
              {analyticsData && analyticsData.topPosts.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">エンゲージメント上位の投稿</h3>
                  <div className="space-y-4">
                    {analyticsData.topPosts.map((post, index) => (
                      <div
                        key={post.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handlePostSelect(post)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">#{index + 1}</span>
                          <span className="text-sm text-gray-500">
                            {new Date(post.timestamp).toLocaleDateString('ja-JP')}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-3 line-clamp-2">{post.content}</p>
                        <div className="flex space-x-4 text-sm text-gray-600">
                          <span>👀 {post.metrics.impressions.toLocaleString()}</span>
                          <span>❤️ {post.metrics.likes.toLocaleString()}</span>
                          <span>🔄 {post.metrics.retweets.toLocaleString()}</span>
                          <span>💬 {post.metrics.replies.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 更新ボタン */}
              <div className="text-center">
                <button
                  onClick={fetchAnalyticsData}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  データを更新
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* AIチャットウィジェット */}
        <XChatWidget />
      </SNSLayout>
    </AuthGuard>
  );
}
