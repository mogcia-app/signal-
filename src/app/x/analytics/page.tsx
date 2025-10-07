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
