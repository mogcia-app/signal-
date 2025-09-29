'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { AIChatWidget } from '../../../components/ai-chat-widget';
import { AuthGuard } from '../../../components/auth-guard';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/auth-context';
import PostSelector from '../components/PostSelector';
import AudienceAnalysisForm from '../components/AudienceAnalysisForm';
import ReachSourceAnalysisForm from '../components/ReachSourceAnalysisForm';
import AnalyticsForm from '../components/AnalyticsForm';
import AnalyticsStats from '../components/AnalyticsStats';
import { 
  RefreshCw,
  BarChart3,
  Calendar,
  Save,
  Target,
  Plus
} from 'lucide-react';

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
    posts: number; // 投稿からの閲覧割合（%）
    profile: number; // プロフィールからの閲覧割合（%）
    explore: number; // 発見からの閲覧割合（%）
    search: number; // 検索からの閲覧割合（%）
    other: number; // その他の閲覧割合（%）
  };
  followers: {
    followers: number; // フォロワー内の閲覧割合（%）
    nonFollowers: number; // フォロワー外の閲覧割合（%）
  };
}

// 投稿分析データの型定義
interface AnalyticsData {
  id: string;
  userId: string;
  postId?: string; // 投稿とのリンク
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  saves: number;
  followerIncrease: number;
  engagementRate: number;
  publishedAt: Date;
  publishedTime: string;
  createdAt: Date;
  // 投稿情報
  title?: string;
  content?: string;
  hashtags?: string[];
  thumbnail?: string;
  category?: 'reel' | 'feed' | 'story';
  // オーディエンス分析
  audience?: AudienceData;
  // 閲覧数ソース分析
  reachSource?: ReachSourceData;
}

// 投稿データの型定義
interface PostData {
  id: string;
  title: string;
  content: string;
  hashtags: string[];
  thumbnail: string;
  category: 'reel' | 'feed' | 'story';
  publishedAt: Date;
}

function InstagramAnalyticsContent() {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  const [inputData, setInputData] = useState({
    likes: '',
    comments: '',
    shares: '',
    reach: '',
    saves: '',
    followerIncrease: '',
    publishedAt: new Date().toISOString().split('T')[0],
    publishedTime: new Date().toTimeString().slice(0, 5), // HH:MM形式
    title: '',
    content: '',
    hashtags: '',
    thumbnail: '',
    category: 'feed' as 'reel' | 'feed' | 'story',
    audience: {
      gender: {
        male: '',
        female: '',
        other: ''
      },
      age: {
        '13-17': '',
        '18-24': '',
        '25-34': '',
        '35-44': '',
        '45-54': '',
        '55-64': '',
        '65+': ''
      }
    },
    reachSource: {
      sources: {
        posts: '',
        profile: '',
        explore: '',
        search: '',
        other: ''
      },
      followers: {
        followers: '',
        nonFollowers: ''
      }
    }
  });
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [currentPlan, setCurrentPlan] = useState<{
    id: string;
    goalName?: string;
    followerGain?: string;
    planPeriod?: string;
    targetAudience?: string;
    goalCategory?: string;
    selectedStrategies?: string[];
  } | null>(null);

  // 分析データを取得（BFF経由）
  const fetchAnalytics = useCallback(async () => {
    console.log('Fetch analytics called, user:', user);
    console.log('User UID:', user?.uid);
    if (!user?.uid) {
      console.log('User not authenticated, skipping analytics fetch');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Fetching analytics via BFF for user:', user.uid);
      
      // Firebase認証トークンを取得
      const { auth } = await import('../../../lib/firebase');
      const token = await auth.currentUser?.getIdToken();
      
      const response = await fetch(`/api/analytics?userId=${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-id': user.uid,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      const data = result.analytics as AnalyticsData[];
      
      console.log('BFF fetch result:', data);
      console.log('Analytics data length:', data.length);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Analytics fetch error:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      setAnalyticsData([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // 投稿データを取得
  const fetchPosts = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      console.log('Fetching posts for user:', user.uid);
      const q = query(
        collection(db, 'posts'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        publishedAt: doc.data().publishedAt?.toDate() || new Date()
      })) as PostData[];
      
      // クライアント側でソート
      data.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
      setPosts(data);
    } catch (error) {
      console.error('Posts fetch error:', error);
      setPosts([]);
    }
  }, [user]);

  // 運用計画を取得
  const fetchCurrentPlan = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      console.log('Fetching current plan for user:', user.uid);
      const q = query(
        collection(db, 'plans'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const planData = snapshot.docs[0].data();
        setCurrentPlan({
          id: snapshot.docs[0].id,
          ...planData
        });
      }
    } catch (error) {
      console.error('Plan fetch error:', error);
      setCurrentPlan(null);
    }
  }, [user]);

  useEffect(() => {
    fetchAnalytics();
    fetchPosts();
    fetchCurrentPlan();
  }, [fetchAnalytics, fetchPosts, fetchCurrentPlan]);

  // 投稿を選択
  const handleSelectPost = (post: PostData) => {
    setSelectedPost(post);
    setSelectedPostId(post.id);
    setInputData(prev => ({
      ...prev,
      title: post.title,
      content: post.content,
      hashtags: post.hashtags.join(', '),
      thumbnail: post.thumbnail,
      category: post.category || 'feed',
      publishedAt: post.publishedAt.toISOString().split('T')[0],
      publishedTime: post.publishedAt.toTimeString().slice(0, 5)
    }));
  };



  // 投稿分析データを保存（BFF経由）
  const handleSaveAnalytics = async () => {
    if (!user?.uid) {
      alert('ログインが必要です');
      return;
    }

    if (!inputData.likes) {
      alert('いいね数を入力してください');
      return;
    }
    if (!inputData.reach) {
      alert('閲覧数を入力してください');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Saving analytics data via BFF');
      
      // Firebase認証トークンを取得
      const { auth } = await import('../../../lib/firebase');
      const token = await auth.currentUser?.getIdToken();
      
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-id': user.uid,
        },
        body: JSON.stringify({
          userId: user.uid,
          postId: selectedPostId, // 投稿とのリンク
          likes: inputData.likes,
          comments: inputData.comments,
          shares: inputData.shares,
          reach: inputData.reach,
          saves: inputData.saves,
          followerIncrease: inputData.followerIncrease,
          publishedAt: inputData.publishedAt,
          publishedTime: inputData.publishedTime,
          title: inputData.title,
          content: inputData.content,
          hashtags: inputData.hashtags,
          thumbnail: inputData.thumbnail,
          category: inputData.category,
          audience: inputData.audience,
          reachSource: inputData.reachSource
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました');
      }

      const result = await response.json();
      console.log('Analytics saved via BFF:', result);

      alert(`投稿分析データを保存しました！（エンゲージメント率: ${result.engagementRate}%）`);
      
      // データを再取得
      await fetchAnalytics();

      // 入力データをリセット
      setInputData({
        likes: '',
        comments: '',
        shares: '',
        reach: '',
        saves: '',
        followerIncrease: '',
        publishedAt: new Date().toISOString().split('T')[0],
        publishedTime: new Date().toTimeString().slice(0, 5),
        title: '',
        content: '',
        hashtags: '',
        thumbnail: '',
        category: 'feed',
        audience: {
          gender: {
            male: '',
            female: '',
            other: ''
          },
          age: {
            '13-17': '',
            '18-24': '',
            '25-34': '',
            '35-44': '',
            '45-54': '',
            '55-64': '',
            '65+': ''
          }
        },
        reachSource: {
          sources: {
            posts: '',
            profile: '',
            explore: '',
            search: '',
            other: ''
          },
          followers: {
            followers: '',
            nonFollowers: ''
          }
        }
      });
      setSelectedPost(null);
      setSelectedPostId('');

    } catch (error) {
      console.error('保存エラー:', error);
      alert(`保存に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 統計計算
  const totalLikes = analyticsData.reduce((sum, data) => sum + (data.likes || 0), 0);
  const totalComments = analyticsData.reduce((sum, data) => sum + (data.comments || 0), 0);
  const totalShares = analyticsData.reduce((sum, data) => sum + (data.shares || 0), 0);
  const totalReach = analyticsData.reduce((sum, data) => sum + (data.reach || 0), 0);
  const totalSaves = analyticsData.reduce((sum, data) => sum + (data.saves || 0), 0);
  const totalFollowerIncrease = analyticsData.reduce((sum, data) => sum + (data.followerIncrease || 0), 0);
  const avgEngagementRate = analyticsData.length > 0 
    ? analyticsData.reduce((sum, data) => sum + (data.engagementRate || 0), 0) / analyticsData.length 
    : 0;

  
  // デバッグログ
  console.log('Statistics calculation debug:', {
    analyticsDataLength: analyticsData.length,
    analyticsData: analyticsData,
    totalLikes: totalLikes,
    totalComments: totalComments,
    totalShares: totalShares,
    totalReach: totalReach,
    totalSaves: totalSaves,
    totalFollowerIncrease: totalFollowerIncrease,
    avgEngagementRate: avgEngagementRate
  });

  return (
    <>
      <SNSLayout 
        currentSNS="instagram"
        customTitle="投稿分析"
        customDescription="投稿の分析データを入力・管理します"
      >
        <div className="max-w-6xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左カラム: 入力フォーム */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">投稿分析データ入力</h2>
                  <p className="text-sm text-gray-600">投稿の分析データを入力してください</p>
                </div>
              </div>

              {/* 投稿選択コンポーネント */}
              <PostSelector
                posts={posts}
                selectedPostId={selectedPost?.id || ''}
                onPostSelect={(postId) => {
                  const post = posts.find(p => p.id === postId);
                  if (post) handleSelectPost(post);
                }}
                isLoading={isLoading}
              />

              {/* 分析フォームコンポーネント */}
              <AnalyticsForm
                data={inputData}
                onChange={setInputData}
                onSave={handleSaveAnalytics}
                isLoading={isLoading}
              />


              {/* オーディエンス分析フォームコンポーネント */}
              <AudienceAnalysisForm
                data={inputData.audience}
                onChange={(audienceData) => setInputData(prev => ({
                  ...prev,
                  audience: audienceData
                }))}
              />

              {/* 閲覧数ソース分析フォームコンポーネント */}
              <ReachSourceAnalysisForm
                data={inputData.reachSource}
                onChange={(reachSourceData) => setInputData(prev => ({
                  ...prev,
                  reachSource: reachSourceData
                }))}
              />

              {/* 投稿日・投稿時間 */}
              <div className="mt-8 mb-8 p-6 bg-white rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Calendar size={16} className="inline mr-2" />
                  投稿情報
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      投稿日
                    </label>
                    <input
                      type="date"
                      value={inputData.publishedAt}
                      onChange={(e) => setInputData(prev => ({ ...prev, publishedAt: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🕐 投稿時間
                    </label>
                    <input
                      type="time"
                      value={inputData.publishedTime}
                      onChange={(e) => setInputData(prev => ({ ...prev, publishedTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleSaveAnalytics}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />
                      分析データを保存
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setInputData({
                      likes: '',
                      comments: '',
                      shares: '',
                      reach: '',
                      saves: '',
                      followerIncrease: '',
                      publishedAt: new Date().toISOString().split('T')[0],
                      publishedTime: new Date().toTimeString().slice(0, 5),
                      title: '',
                      content: '',
                      hashtags: '',
                      thumbnail: '',
                      category: 'feed',
                      audience: {
                        gender: {
                          male: '',
                          female: '',
                          other: ''
                        },
                        age: {
                          '13-17': '',
                          '18-24': '',
                          '25-34': '',
                          '35-44': '',
                          '45-54': '',
                          '55-64': '',
                          '65+': ''
                        }
                      },
                      reachSource: {
                        sources: {
                          posts: '',
                          profile: '',
                          explore: '',
                          search: '',
                          other: ''
                        },
                        followers: {
                          followers: '',
                          nonFollowers: ''
                        }
                      }
                    });
                    setSelectedPost(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            {/* 右カラム: 運用計画と統計 */}
            <div className="space-y-4">
              {/* 運用計画セクション */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Target size={18} className="mr-2 text-blue-600" />
                    運用計画
                  </h3>
                  {currentPlan && (
                    <a 
                      href="/instagram/plan" 
                      className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      詳細を見る →
                    </a>
                  )}
                </div>
                
                {currentPlan ? (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900">
                        {currentPlan.goalName || 'Instagram成長計画'}
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">目標フォロワー増加</span>
                          <div className="font-medium text-blue-600">+{currentPlan.followerGain || 0}人</div>
                        </div>
                        <div>
                          <span className="text-gray-600">期間</span>
                          <div className="font-medium">{currentPlan.planPeriod || '未設定'}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">ターゲット</span>
                          <div className="font-medium">{currentPlan.targetAudience || '未設定'}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">カテゴリ</span>
                          <div className="font-medium">{currentPlan.goalCategory || '未設定'}</div>
                        </div>
                      </div>
                      
                      {currentPlan.selectedStrategies && currentPlan.selectedStrategies.length > 0 && (
                        <div>
                          <span className="text-sm text-gray-600">選択した戦略</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {currentPlan.selectedStrategies.slice(0, 3).map((strategy: string, index: number) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {strategy}
                              </span>
                            ))}
                            {currentPlan.selectedStrategies.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                +{currentPlan.selectedStrategies.length - 3}個
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Target size={24} className="text-gray-400" />
                    </div>
                    <p className="text-gray-600 text-sm mb-3">運用計画が設定されていません</p>
                    <a 
                      href="/instagram/plan" 
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={16} className="mr-2" />
                      計画を作成する
                    </a>
                  </div>
                )}
              </div>

              {/* 統計表示コンポーネント */}
              <AnalyticsStats
                analyticsData={analyticsData}
                isLoading={isLoading}
              />
            </div>
          </div>

        </div>
      </SNSLayout>

      <AIChatWidget 
        contextData={{
          totalLikes: totalLikes,
          totalComments: totalComments,
          totalShares: totalShares,
          totalReach: totalReach,
          totalSaves: totalSaves,
          totalFollowerIncrease: totalFollowerIncrease,
          avgEngagementRate: avgEngagementRate,
          recordedPosts: analyticsData.length
        }}
      />
    </>
  );
}

export default function InstagramAnalyticsPage() {
  return (
    <AuthGuard>
      <InstagramAnalyticsContent />
    </AuthGuard>
  );
}