'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { AIChatWidget } from '../../../components/ai-chat-widget';
import { AuthGuard } from '../../../components/auth-guard';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/auth-context';
import Image from 'next/image';
import { 
  BarChart3,
  Heart,
  Save,
  Calendar,
  RefreshCw,
  Search,
  Hash,
  FileText,
  Video,
  Camera,
  Bookmark,
  Users,
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
  const [searchTerm, setSearchTerm] = useState('');
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
  const [previewUrl, setPreviewUrl] = useState<string>('');
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
      const response = await fetch(`/api/analytics?userId=${user.uid}`);
      
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

      // ファイル選択処理
      const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
          const url = URL.createObjectURL(file);
          setPreviewUrl(url);
          setInputData(prev => ({ ...prev, thumbnail: url }));
        }
      };

  // 検索フィルタリング
  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.hashtags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
      
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      setPreviewUrl('');

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

  // オーディエンス分析の統計計算
  const audienceStats = analyticsData.reduce((acc, data) => {
    if (data.audience) {
      // 性別分析
      acc.gender.male += data.audience.gender.male || 0;
      acc.gender.female += data.audience.gender.female || 0;
      acc.gender.other += data.audience.gender.other || 0;
      
      // 年齢層分析
      acc.age['13-17'] += data.audience.age['13-17'] || 0;
      acc.age['18-24'] += data.audience.age['18-24'] || 0;
      acc.age['25-34'] += data.audience.age['25-34'] || 0;
      acc.age['35-44'] += data.audience.age['35-44'] || 0;
      acc.age['45-54'] += data.audience.age['45-54'] || 0;
      acc.age['55-64'] += data.audience.age['55-64'] || 0;
      acc.age['65+'] += data.audience.age['65+'] || 0;
    }
    return acc;
  }, {
    gender: { male: 0, female: 0, other: 0 },
    age: { '13-17': 0, '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55-64': 0, '65+': 0 }
  });

  // 閲覧数ソース分析の統計計算
  const reachSourceStats = analyticsData.reduce((acc, data) => {
    if (data.reachSource) {
      // 閲覧ソース分析
      acc.sources.posts += data.reachSource.sources.posts || 0;
      acc.sources.profile += data.reachSource.sources.profile || 0;
      acc.sources.explore += data.reachSource.sources.explore || 0;
      acc.sources.search += data.reachSource.sources.search || 0;
      acc.sources.other += data.reachSource.sources.other || 0;
      
      // フォロワー分析
      acc.followers.followers += data.reachSource.followers.followers || 0;
      acc.followers.nonFollowers += data.reachSource.followers.nonFollowers || 0;
    }
    return acc;
  }, {
    sources: { posts: 0, profile: 0, explore: 0, search: 0, other: 0 },
    followers: { followers: 0, nonFollowers: 0 }
  });

  // 平均値を計算
  const dataCount = analyticsData.length;
  const avgAudienceStats = dataCount > 0 ? {
    gender: {
      male: Math.round(audienceStats.gender.male / dataCount),
      female: Math.round(audienceStats.gender.female / dataCount),
      other: Math.round(audienceStats.gender.other / dataCount)
    },
    age: {
      '13-17': Math.round(audienceStats.age['13-17'] / dataCount),
      '18-24': Math.round(audienceStats.age['18-24'] / dataCount),
      '25-34': Math.round(audienceStats.age['25-34'] / dataCount),
      '35-44': Math.round(audienceStats.age['35-44'] / dataCount),
      '45-54': Math.round(audienceStats.age['45-54'] / dataCount),
      '55-64': Math.round(audienceStats.age['55-64'] / dataCount),
      '65+': Math.round(audienceStats.age['65+'] / dataCount)
    }
  } : {
    gender: { male: 0, female: 0, other: 0 },
    age: { '13-17': 0, '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55-64': 0, '65+': 0 }
  };

  const avgReachSourceStats = dataCount > 0 ? {
    sources: {
      posts: Math.round(reachSourceStats.sources.posts / dataCount),
      profile: Math.round(reachSourceStats.sources.profile / dataCount),
      explore: Math.round(reachSourceStats.sources.explore / dataCount),
      search: Math.round(reachSourceStats.sources.search / dataCount),
      other: Math.round(reachSourceStats.sources.other / dataCount)
    },
    followers: {
      followers: Math.round(reachSourceStats.followers.followers / dataCount),
      nonFollowers: Math.round(reachSourceStats.followers.nonFollowers / dataCount)
    }
  } : {
    sources: { posts: 0, profile: 0, explore: 0, search: 0, other: 0 },
    followers: { followers: 0, nonFollowers: 0 }
  };
  
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

              {/* 投稿検索機能 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Search size={16} className="inline mr-1" />
                  投稿を検索・選択
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  placeholder="タイトル、内容、ハッシュタグで検索..."
                />
                
                {/* 投稿一覧 */}
                {searchTerm && (
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                    {filteredPosts.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500 text-center">
                        該当する投稿が見つかりません
                      </div>
                    ) : (
                      filteredPosts.slice(0, 5).map((post) => (
                        <div
                          key={post.id}
                          onClick={() => handleSelectPost(post)}
                          className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                            selectedPost?.id === post.id ? 'bg-blue-50 border-blue-200' : ''
                          }`}
                        >
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {post.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {post.publishedAt.toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 投稿情報表示 */}
              {selectedPost && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">選択された投稿</h3>
                  <div className="text-sm text-blue-800">
                    <div className="font-medium">{selectedPost.title}</div>
                    <div className="mt-1 text-xs">{selectedPost.content.slice(0, 100)}...</div>
                  </div>
                </div>
              )}

              {/* 投稿情報手動入力 */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">投稿情報</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      <FileText size={14} className="inline mr-1" />
                      タイトル
                    </label>
                    <input
                      type="text"
                      value={inputData.title}
                      onChange={(e) => setInputData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="投稿タイトル"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      📝 投稿内容
                    </label>
                    <textarea
                      value={inputData.content}
                      onChange={(e) => setInputData(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="投稿内容"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      <Hash size={14} className="inline mr-1" />
                      ハッシュタグ
                    </label>
                    <input
                      type="text"
                      value={inputData.hashtags}
                      onChange={(e) => setInputData(prev => ({ ...prev, hashtags: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="ハッシュタグ1, ハッシュタグ2, ..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      <Video size={14} className="inline mr-1" />
                      投稿カテゴリー
                    </label>
                    <select
                      value={inputData.category}
                      onChange={(e) => setInputData(prev => ({ ...prev, category: e.target.value as 'reel' | 'feed' | 'story' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="feed">📱 フィード</option>
                      <option value="reel">🎬 リール</option>
                      <option value="story">📖 ストーリー</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      <Camera size={14} className="inline mr-1" />
                      サムネイル画像
                    </label>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      {previewUrl && (
                        <div className="mt-2">
                          <Image
                            src={previewUrl}
                            alt="Preview"
                            width={80}
                            height={80}
                            className="w-20 h-20 object-cover rounded-md border"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewUrl('');
                              setInputData(prev => ({ ...prev, thumbnail: '' }));
                            }}
                            className="ml-2 text-xs text-red-600 hover:text-red-800"
                          >
                            削除
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Heart size={16} className="inline mr-1 text-red-500" />
                        いいね数 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={inputData.likes}
                        onChange={(e) => setInputData(prev => ({ ...prev, likes: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        placeholder="例: 245"
                        required
                      />
                    </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    💬 コメント数
                  </label>
                  <input
                    type="number"
                    value={inputData.comments}
                    onChange={(e) => setInputData(prev => ({ ...prev, comments: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    placeholder="例: 12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🔄 シェア数
                  </label>
                  <input
                    type="number"
                    value={inputData.shares}
                    onChange={(e) => setInputData(prev => ({ ...prev, shares: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    placeholder="例: 8"
                  />
                </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        👁️ 閲覧数 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={inputData.reach}
                        onChange={(e) => setInputData(prev => ({ ...prev, reach: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        placeholder="例: 1200"
                        required
                      />
                    </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Bookmark size={16} className="inline mr-1 text-yellow-500" />
                    保存数
                  </label>
                  <input
                    type="number"
                    value={inputData.saves}
                    onChange={(e) => setInputData(prev => ({ ...prev, saves: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    placeholder="例: 45"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users size={16} className="inline mr-1 text-green-500" />
                    フォロワー増加数
                  </label>
                  <input
                    type="number"
                    value={inputData.followerIncrease}
                    onChange={(e) => setInputData(prev => ({ ...prev, followerIncrease: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    placeholder="例: 23"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar size={16} className="inline mr-1" />
                  投稿日
                </label>
                <input
                  type="date"
                  value={inputData.publishedAt}
                  onChange={(e) => setInputData(prev => ({ ...prev, publishedAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                />
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

              {/* オーディエンス分析セクション */}
              <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-purple-600" />
                  オーディエンス分析
                </h3>
                
                {/* 性別分析 */}
                <div className="mb-6">
                  <h4 className="text-md font-semibold text-gray-800 mb-3">性別分析 (%)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        👨 男性
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inputData.audience.gender.male}
                        onChange={(e) => setInputData(prev => ({
                          ...prev,
                          audience: {
                            ...prev.audience,
                            gender: { ...prev.audience.gender, male: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="例: 45"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        👩 女性
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inputData.audience.gender.female}
                        onChange={(e) => setInputData(prev => ({
                          ...prev,
                          audience: {
                            ...prev.audience,
                            gender: { ...prev.audience.gender, female: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="例: 50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🏳️‍🌈 その他
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inputData.audience.gender.other}
                        onChange={(e) => setInputData(prev => ({
                          ...prev,
                          audience: {
                            ...prev.audience,
                            gender: { ...prev.audience.gender, other: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="例: 5"
                      />
                    </div>
                  </div>
                </div>

                {/* 年齢層分析 */}
                <div>
                  <h4 className="text-md font-semibold text-gray-800 mb-3">年齢層分析 (%)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        13-17歳
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inputData.audience.age['13-17']}
                        onChange={(e) => setInputData(prev => ({
                          ...prev,
                          audience: {
                            ...prev.audience,
                            age: { ...prev.audience.age, '13-17': e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="例: 15"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        18-24歳
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inputData.audience.age['18-24']}
                        onChange={(e) => setInputData(prev => ({
                          ...prev,
                          audience: {
                            ...prev.audience,
                            age: { ...prev.audience.age, '18-24': e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="例: 25"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        25-34歳
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inputData.audience.age['25-34']}
                        onChange={(e) => setInputData(prev => ({
                          ...prev,
                          audience: {
                            ...prev.audience,
                            age: { ...prev.audience.age, '25-34': e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="例: 30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        35-44歳
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inputData.audience.age['35-44']}
                        onChange={(e) => setInputData(prev => ({
                          ...prev,
                          audience: {
                            ...prev.audience,
                            age: { ...prev.audience.age, '35-44': e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="例: 20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        45-54歳
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inputData.audience.age['45-54']}
                        onChange={(e) => setInputData(prev => ({
                          ...prev,
                          audience: {
                            ...prev.audience,
                            age: { ...prev.audience.age, '45-54': e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="例: 7"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        55-64歳
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inputData.audience.age['55-64']}
                        onChange={(e) => setInputData(prev => ({
                          ...prev,
                          audience: {
                            ...prev.audience,
                            age: { ...prev.audience.age, '55-64': e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="例: 2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        65歳以上
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inputData.audience.age['65+']}
                        onChange={(e) => setInputData(prev => ({
                          ...prev,
                          audience: {
                            ...prev.audience,
                            age: { ...prev.audience.age, '65+': e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="例: 1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 閲覧数ソース分析セクション */}
              <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-blue-600" />
                  閲覧数ソース分析
                </h3>
                
                {/* 閲覧ソース分析 */}
                <div className="mb-6">
                  <h4 className="text-md font-semibold text-gray-800 mb-3">閲覧ソース別割合 (%)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📱 投稿
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inputData.reachSource.sources.posts}
                        onChange={(e) => setInputData(prev => ({
                          ...prev,
                          reachSource: {
                            ...prev.reachSource,
                            sources: { ...prev.reachSource.sources, posts: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例: 40"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        👤 プロフィール
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inputData.reachSource.sources.profile}
                        onChange={(e) => setInputData(prev => ({
                          ...prev,
                          reachSource: {
                            ...prev.reachSource,
                            sources: { ...prev.reachSource.sources, profile: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例: 25"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🔍 発見
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inputData.reachSource.sources.explore}
                        onChange={(e) => setInputData(prev => ({
                          ...prev,
                          reachSource: {
                            ...prev.reachSource,
                            sources: { ...prev.reachSource.sources, explore: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例: 20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🔎 検索
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inputData.reachSource.sources.search}
                        onChange={(e) => setInputData(prev => ({
                          ...prev,
                          reachSource: {
                            ...prev.reachSource,
                            sources: { ...prev.reachSource.sources, search: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例: 10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📋 その他
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inputData.reachSource.sources.other}
                        onChange={(e) => setInputData(prev => ({
                          ...prev,
                          reachSource: {
                            ...prev.reachSource,
                            sources: { ...prev.reachSource.sources, other: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例: 5"
                      />
                    </div>
                  </div>
                </div>

                {/* フォロワー分析 */}
                <div>
                  <h4 className="text-md font-semibold text-gray-800 mb-3">フォロワー分析 (%)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        👥 フォロワー内
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inputData.reachSource.followers.followers}
                        onChange={(e) => setInputData(prev => ({
                          ...prev,
                          reachSource: {
                            ...prev.reachSource,
                            followers: { ...prev.reachSource.followers, followers: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例: 60"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🌐 フォロワー外
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inputData.reachSource.followers.nonFollowers}
                        onChange={(e) => setInputData(prev => ({
                          ...prev,
                          reachSource: {
                            ...prev.reachSource,
                            followers: { ...prev.reachSource.followers, nonFollowers: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例: 40"
                      />
                    </div>
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
          setPreviewUrl('');
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

              {/* 投稿分析統計セクション */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">投稿分析統計</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 bg-red-50 rounded-lg">
                    <div className="text-lg font-bold text-red-600">{totalLikes.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">総いいね数</div>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">{totalComments.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">総コメント数</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">{totalShares.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">総シェア数</div>
                  </div>
                  <div className="text-center p-2 bg-purple-50 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">{totalReach.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">総閲覧数</div>
                  </div>
                  <div className="text-center p-2 bg-yellow-50 rounded-lg">
                    <div className="text-lg font-bold text-yellow-600">{totalSaves.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">総保存数</div>
                  </div>
                  <div className="text-center p-2 bg-emerald-50 rounded-lg">
                    <div className="text-lg font-bold text-emerald-600">{totalFollowerIncrease.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">総フォロワー増加数</div>
                  </div>
                </div>

                {/* オーディエンス分析統計 */}
                <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-purple-600" />
                    オーディエンス分析統計
                  </h3>
                  
                  {/* 性別分析統計 */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">性別分析 (平均%)</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-sm font-bold text-gray-700">👨 {avgAudienceStats.gender.male}%</div>
                        <div className="text-xs text-gray-600">男性</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-sm font-bold text-gray-700">👩 {avgAudienceStats.gender.female}%</div>
                        <div className="text-xs text-gray-600">女性</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-sm font-bold text-gray-700">🏳️‍🌈 {avgAudienceStats.gender.other}%</div>
                        <div className="text-xs text-gray-600">その他</div>
                      </div>
                    </div>
                  </div>

                  {/* 年齢層分析統計 */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">年齢層分析 (平均%)</h4>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs font-bold text-gray-700">{avgAudienceStats.age['13-17']}%</div>
                        <div className="text-xs text-gray-600">13-17歳</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs font-bold text-gray-700">{avgAudienceStats.age['18-24']}%</div>
                        <div className="text-xs text-gray-600">18-24歳</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs font-bold text-gray-700">{avgAudienceStats.age['25-34']}%</div>
                        <div className="text-xs text-gray-600">25-34歳</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs font-bold text-gray-700">{avgAudienceStats.age['35-44']}%</div>
                        <div className="text-xs text-gray-600">35-44歳</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs font-bold text-gray-700">{avgAudienceStats.age['45-54']}%</div>
                        <div className="text-xs text-gray-600">45-54歳</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs font-bold text-gray-700">{avgAudienceStats.age['55-64']}%</div>
                        <div className="text-xs text-gray-600">55-64歳</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs font-bold text-gray-700">{avgAudienceStats.age['65+']}%</div>
                        <div className="text-xs text-gray-600">65歳以上</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 閲覧数ソース分析統計 */}
                <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-blue-600" />
                    閲覧数ソース分析統計
                  </h3>
                  
                  {/* 閲覧ソース分析統計 */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">閲覧ソース別割合 (平均%)</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-sm font-bold text-gray-700">📱 {avgReachSourceStats.sources.posts}%</div>
                        <div className="text-xs text-gray-600">投稿</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-sm font-bold text-gray-700">👤 {avgReachSourceStats.sources.profile}%</div>
                        <div className="text-xs text-gray-600">プロフィール</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-sm font-bold text-gray-700">🔍 {avgReachSourceStats.sources.explore}%</div>
                        <div className="text-xs text-gray-600">発見</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-sm font-bold text-gray-700">🔎 {avgReachSourceStats.sources.search}%</div>
                        <div className="text-xs text-gray-600">検索</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-sm font-bold text-gray-700">📋 {avgReachSourceStats.sources.other}%</div>
                        <div className="text-xs text-gray-600">その他</div>
                      </div>
                    </div>
                  </div>

                  {/* フォロワー分析統計 */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">フォロワー分析 (平均%)</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-sm font-bold text-gray-700">👥 {avgReachSourceStats.followers.followers}%</div>
                        <div className="text-xs text-gray-600">フォロワー内</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-sm font-bold text-gray-700">🌐 {avgReachSourceStats.followers.nonFollowers}%</div>
                        <div className="text-xs text-gray-600">フォロワー外</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-gray-900">{(avgEngagementRate || 0).toFixed(2)}%</div>
                  <div className="text-sm text-gray-600">平均エンゲージメント率</div>
                </div>
              </div>
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