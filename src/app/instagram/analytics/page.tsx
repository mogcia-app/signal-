'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { AIChatWidget } from '../../../components/ai-chat-widget';
import { AuthGuard } from '../../../components/auth-guard';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/auth-context';
import { usePlanData } from '../../../hooks/usePlanData';
import { PlanCard } from '../../../components/PlanCard';
// import PostSelector from '../components/PostSelector'; // 削除済み
import PostPreview from '../components/PostPreview';
// import AudienceAnalysisForm from '../components/AudienceAnalysisForm'; // 統合済み
// import ReachSourceAnalysisForm from '../components/ReachSourceAnalysisForm'; // 統合済み
import AnalyticsForm from '../components/AnalyticsForm';
import AnalyticsStats from '../components/AnalyticsStats';
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
  thumbnail?: string;
  imageUrl?: string;
  category: 'reel' | 'feed' | 'story';
  type?: 'reel' | 'feed' | 'story';
  publishedAt?: Date;
  createdAt?: Date;
  status?: string;
}

function InstagramAnalyticsContent() {
  const { user } = useAuth();
  const { planData } = usePlanData();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [satisfaction, setSatisfaction] = useState<'satisfied' | 'dissatisfied' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
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
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  // currentPlanは削除し、planDataを使用

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
  // フィードバック送信関数
  const handleFeedbackSubmit = async () => {
    if (!user?.uid || !satisfaction || !feedbackText.trim()) {
      alert('満足度とフィードバック内容を入力してください');
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          pageType: 'analytics',
          satisfaction,
          feedback: feedbackText,
          contextData: {
            totalLikes: totalLikes,
            totalComments: totalComments,
            totalShares: totalShares,
            totalReach: totalReach,
            avgEngagementRate: avgEngagementRate,
            recordedPosts: analyticsData.length
          }
        })
      });

      if (response.ok) {
        setFeedbackSubmitted(true);
        setSatisfaction(null);
        setFeedbackText('');
        alert('フィードバックを送信しました。ありがとうございます！');
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      alert('フィードバックの送信に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

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
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          title: docData.title || '',
          content: docData.content || '',
          hashtags: docData.hashtags || [],
          thumbnail: docData.thumbnail || docData.imageUrl || '',
          imageUrl: docData.imageUrl || docData.thumbnail || '',
          category: docData.category || docData.type || 'feed',
          type: docData.type || docData.category || 'feed',
          publishedAt: docData.publishedAt?.toDate() || docData.createdAt?.toDate() || new Date(),
          createdAt: docData.createdAt?.toDate() || new Date(),
          status: docData.status || 'published'
        };
      }) as PostData[];
      
      // クライアント側でソート
      data.sort((a, b) => {
        const aTime = a.publishedAt?.getTime() || 0;
        const bTime = b.publishedAt?.getTime() || 0;
        return bTime - aTime;
      });
      setPosts(data);
    } catch (error) {
      console.error('Posts fetch error:', error);
      setPosts([]);
    }
  }, [user]);

  // 運用計画を取得
  // 計画データはusePlanDataフックで取得済み

  // URLパラメータから投稿IDを取得して投稿データを自動入力
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('postId');
    
    if (postId && posts.length > 0) {
      const post = posts.find(p => p.id === postId);
      if (post) {
        setSelectedPost(post);
        setSelectedPostId(postId);
        // 投稿データを自動入力
        setInputData(prev => ({
          ...prev,
          title: post.title || '',
          content: post.content || '',
          hashtags: post.hashtags?.join(', ') || '',
          thumbnail: post.thumbnail || post.imageUrl || '',
          category: post.category || post.type || 'feed',
          publishedAt: post.publishedAt ? post.publishedAt.toISOString().split('T')[0] : (post.createdAt ? post.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
          publishedTime: post.publishedAt ? post.publishedAt.toTimeString().slice(0, 5) : (post.createdAt ? post.createdAt.toTimeString().slice(0, 5) : new Date().toTimeString().slice(0, 5))
        }));
      }
    }
  }, [posts]);

  useEffect(() => {
    fetchAnalytics();
    fetchPosts();
  }, [fetchAnalytics, fetchPosts]);




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
          postId: selectedPostId || null, // 投稿とのリンク（手動入力の場合はnull）
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

      // ラボ投稿のステータス更新（postIdがある場合）
      if (selectedPostId) {
        try {
          console.log('Updating post status to published for postId:', selectedPostId);
          const updateResponse = await fetch(`/api/posts/${selectedPostId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'x-user-id': user.uid,
            },
            body: JSON.stringify({ 
              status: 'published' 
            }),
          });

          if (updateResponse.ok) {
            console.log('Post status updated to published successfully');
          } else {
            console.error('Failed to update post status:', await updateResponse.text());
          }
        } catch (error) {
          console.error('Error updating post status:', error);
          // ステータス更新に失敗しても分析データは保存されているので続行
        }
      }

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


  // 統計計算（数値に変換してから計算）
  const totalLikes = analyticsData.reduce((sum, data) => sum + (Number(data.likes) || 0), 0);
  const totalComments = analyticsData.reduce((sum, data) => sum + (Number(data.comments) || 0), 0);
  const totalShares = analyticsData.reduce((sum, data) => sum + (Number(data.shares) || 0), 0);
  const totalReach = analyticsData.reduce((sum, data) => sum + (Number(data.reach) || 0), 0);
  const totalSaves = analyticsData.reduce((sum, data) => sum + (Number(data.saves) || 0), 0);
  const totalFollowerIncrease = analyticsData.reduce((sum, data) => sum + (Number(data.followerIncrease) || 0), 0);
  const avgEngagementRate = analyticsData.length > 0 
    ? analyticsData.reduce((sum, data) => sum + (Number(data.engagementRate) || 0), 0) / analyticsData.length 
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
            <div className="space-y-6">
              {/* 統合された分析データ入力フォーム */}
              <AnalyticsForm
                data={inputData}
                onChange={setInputData}
                onSave={handleSaveAnalytics}
                isLoading={isLoading}
              />
            </div>

            {/* 右カラム: 反映・表示 */}
            <div className="space-y-6">
              {/* 投稿プレビュー */}
              <PostPreview
                selectedPost={selectedPost ? {
                  id: selectedPost.id,
                  title: selectedPost.title,
                  content: selectedPost.content,
                  hashtags: selectedPost.hashtags,
                  thumbnail: selectedPost.thumbnail || '',
                  category: selectedPost.category,
                  publishedAt: selectedPost.publishedAt || new Date()
                } : null}
                inputData={inputData}
              />

              {/* 運用計画セクション */}
              <PlanCard 
                planData={planData}
                variant="compact"
                showStrategies={true}
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
          recordedPosts: analyticsData.length
        }}
      />

      {/* フィードバック収集セクション */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">💭</span>
          分析結果のフィードバック
        </h3>
        
        {feedbackSubmitted ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✅</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">フィードバックを送信しました</h4>
            <p className="text-sm text-gray-600 mb-4">
              ご協力ありがとうございます。次回のAI提案により反映されます。
            </p>
            <button 
              onClick={() => setFeedbackSubmitted(false)}
              className="text-sm text-purple-600 hover:text-purple-700 underline"
            >
              新しいフィードバックを送信
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-6">
              この分析結果についてのご感想をお聞かせください。次回のAI提案により反映されます。
            </p>
            
            <div className="space-y-4">
              {/* 満足度評価 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  この分析結果に満足していますか？
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="satisfaction" 
                      value="satisfied"
                      checked={satisfaction === 'satisfied'}
                      onChange={(e) => setSatisfaction(e.target.value as 'satisfied' | 'dissatisfied')}
                      className="mr-2 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">満足</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="satisfaction" 
                      value="dissatisfied"
                      checked={satisfaction === 'dissatisfied'}
                      onChange={(e) => setSatisfaction(e.target.value as 'satisfied' | 'dissatisfied')}
                      className="mr-2 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">不満</span>
                  </label>
                </div>
              </div>

              {/* 改善点や気づき */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  改善点や気づいたことをメモしてください
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="例：投稿時間の分析がもっと詳細だと良い、エンゲージメント率の改善提案が欲しい、など"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={4}
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">
                  このフィードバックは次回のAI提案生成に活用されます
                </p>
              </div>

              {/* 送信ボタン */}
              <div className="flex justify-end">
                <button 
                  onClick={handleFeedbackSubmit}
                  disabled={isSubmittingFeedback || !satisfaction || !feedbackText.trim()}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingFeedback ? '送信中...' : 'フィードバックを送信'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
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