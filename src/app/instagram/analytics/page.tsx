'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { AIChatWidget } from '../../../components/ai-chat-widget';
import { AuthGuard } from '../../../components/auth-guard';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/auth-context';
import { usePlanData } from '../../../hooks/usePlanData';
import { CurrentPlanCard } from '../../../components/CurrentPlanCard';
// import AudienceAnalysisForm from '../components/AudienceAnalysisForm'; // 統合済み
// import ReachSourceAnalysisForm from '../components/ReachSourceAnalysisForm'; // 統合済み
import PostPreview from '../components/PostPreview';
import AnalyticsForm from '../components/AnalyticsForm';
import AnalyticsStats from '../components/AnalyticsStats';
import PostSelector from '../components/PostSelector';
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
  imageUrl?: string;
  category: string;
  type?: 'reel' | 'feed' | 'story';
  publishedAt: Date;
  createdAt?: Date;
  status?: string;
}

function InstagramAnalyticsContent() {
  const { user } = useAuth();
  const { planData } = usePlanData();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
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

  // 投稿選択ハンドラー
  const handlePostSelect = (post: PostData | null) => {
    setSelectedPost(post);
    if (post) {
      // 投稿データを自動入力
      setInputData(prev => ({
        ...prev,
        title: post.title || '',
        content: post.content || '',
        hashtags: post.hashtags?.join(', ') || '',
        thumbnail: post.thumbnail || post.imageUrl || '',
        category: (post.category || post.type || 'feed') as 'reel' | 'feed' | 'story',
        publishedAt: post.publishedAt ? post.publishedAt.toISOString().split('T')[0] : (post.createdAt ? post.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        publishedTime: post.publishedAt ? post.publishedAt.toTimeString().slice(0, 5) : (post.createdAt ? post.createdAt.toTimeString().slice(0, 5) : new Date().toTimeString().slice(0, 5))
      }));
    }
  };

  const handlePostIdSelect = (postId: string) => {
    setSelectedPostId(postId);
  };

  // 投稿データを取得
  const fetchPosts = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, where('userId', '==', user.uid), where('snsType', '==', 'instagram'));
      const querySnapshot = await getDocs(q);
      
      const postsData: PostData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        postsData.push({
          id: doc.id,
          title: data.title || '',
          content: data.content || '',
          hashtags: data.hashtags || [],
          thumbnail: data.thumbnail || data.imageUrl || '',
          imageUrl: data.imageUrl || '',
          category: data.category || data.type || 'feed',
          type: data.type || data.category || 'feed',
          publishedAt: data.publishedAt?.toDate() || data.createdAt?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate(),
          status: data.status || 'draft'
        });
      });
      
      setPosts(postsData);
    } catch (error) {
      console.error('投稿データの取得に失敗しました:', error);
    }
  }, [user?.uid]);

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
      const data = result.analytics as AnalyticsData[] || [];
      
      console.log('BFF fetch result:', data);
      console.log('Analytics data length:', data?.length || 0);
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


  // 運用計画を取得
  // 計画データはusePlanDataフックで取得済み


  // コンポーネントマウント時にデータを取得
  useEffect(() => {
    fetchAnalytics();
    fetchPosts();
  }, [fetchAnalytics, fetchPosts]);

  // URLパラメータからpostIdを取得して投稿を選択
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('postId');
    if (postId && posts.length > 0) {
      const post = posts.find(p => p.id === postId);
      if (post) {
        handlePostSelect(post);
        setSelectedPostId(postId);
      }
    }
  }, [posts]);




  // 投稿分析データを保存（BFF経由）
  const handleSaveAnalytics = async (sentimentData?: { sentiment: 'satisfied' | 'dissatisfied' | null; memo: string }) => {
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
          postId: selectedPostId || null, // 投稿とのリンク
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
          reachSource: inputData.reachSource,
          sentiment: sentimentData?.sentiment || null,
          sentimentMemo: sentimentData?.memo || ''
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

      // 投稿ステータスを更新
      if (selectedPostId) {
        try {
          const { doc, updateDoc } = await import('firebase/firestore');
          const postRef = doc(db, 'posts', selectedPostId);
          await updateDoc(postRef, {
            status: 'analyzed',
            analyzedAt: new Date()
          });
        } catch (error) {
          console.error('投稿ステータスの更新に失敗しました:', error);
        }
      }

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

      // 投稿選択をクリア
      setSelectedPost(null);
      setSelectedPostId('');

    } catch (error) {
      console.error('保存エラー:', error);
      alert(`保存に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };


  // 統計計算（数値に変換してから計算）
  const totalLikes = analyticsData?.reduce((sum, data) => sum + (Number(data.likes) || 0), 0) || 0;
  const totalComments = analyticsData?.reduce((sum, data) => sum + (Number(data.comments) || 0), 0) || 0;
  const totalShares = analyticsData?.reduce((sum, data) => sum + (Number(data.shares) || 0), 0) || 0;
  const totalReach = analyticsData?.reduce((sum, data) => sum + (Number(data.reach) || 0), 0) || 0;
  const totalSaves = analyticsData?.reduce((sum, data) => sum + (Number(data.saves) || 0), 0) || 0;
  const totalFollowerIncrease = analyticsData?.reduce((sum, data) => sum + (Number(data.followerIncrease) || 0), 0) || 0;
  const avgEngagementRate = analyticsData && analyticsData.length > 0 
    ? analyticsData.reduce((sum, data) => sum + (Number(data.engagementRate) || 0), 0) / analyticsData.length 
    : 0;

  // 実際のフォロワー数計算（計画の現在フォロワー数 + フォロワー増加数の合計）
  const actualFollowers = planData ? (planData.currentFollowers || 0) + totalFollowerIncrease : 0;

  
  // デバッグログ
  console.log('Statistics calculation debug:', {
    analyticsDataLength: analyticsData?.length || 0,
    analyticsData: analyticsData,
    totalLikes: totalLikes,
    totalComments: totalComments,
    totalShares: totalShares,
    totalReach: totalReach,
    totalSaves: totalSaves,
    totalFollowerIncrease: totalFollowerIncrease,
    avgEngagementRate: avgEngagementRate,
    actualFollowers: actualFollowers,
    planCurrentFollowers: planData?.currentFollowers || 0
  });

  return (
    <>
      <SNSLayout 
        currentSNS="instagram"
        customTitle="投稿分析"
        customDescription="投稿の分析データを入力・管理します"
      >
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* 左カラム: 投稿検索・分析データ入力フォーム */}
            <div className="space-y-4 sm:space-y-6">
              {/* 投稿検索セクション */}
              <PostSelector
                posts={posts}
                selectedPostId={selectedPostId}
                onPostSelect={handlePostSelect}
                onPostIdSelect={handlePostIdSelect}
              />

              {/* 統合された分析データ入力フォーム */}
              <AnalyticsForm
                data={inputData}
                onChange={setInputData}
                onSave={handleSaveAnalytics}
                isLoading={isLoading}
              />
            </div>

            {/* 右カラム: 投稿プレビュー・反映・表示 */}
            <div className="space-y-4 sm:space-y-6">
              {/* 投稿プレビューセクション */}
              <PostPreview
                selectedPost={selectedPost}
                inputData={{
                  title: inputData.title,
                  content: inputData.content,
                  hashtags: inputData.hashtags,
                  category: inputData.category,
                  thumbnail: inputData.thumbnail,
                  publishedAt: inputData.publishedAt,
                  publishedTime: inputData.publishedTime
                }}
              />

              {/* 運用計画セクション */}
              <CurrentPlanCard 
                planData={planData}
                snsType="instagram"
                actualFollowers={actualFollowers}
              />

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
          recordedPosts: analyticsData?.length || 0
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