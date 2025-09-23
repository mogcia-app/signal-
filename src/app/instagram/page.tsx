'use client';

import { useState, useEffect } from 'react';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useSNSSettings } from '../../hooks/useSNSSettings';
import { usePlanData } from '../../hooks/usePlanData';
import { postsApi, analyticsApi } from '../../lib/api';
import { AuthGuard } from '../../components/auth-guard';
import SNSLayout from '../../components/sns-layout';
import { AIChatWidget } from '../../components/ai-chat-widget';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { 
  Users, 
  Heart, 
  Eye, 
  Bookmark, 
  Target,
  BarChart3,
  Edit3,
  ThumbsUp,
  Play,
  Image as ImageIcon,
  Camera,
  TrendingUp,
  Calendar,
} from 'lucide-react';

// Chart.jsの設定
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardStats {
  followers: number;
  engagement: number;
  reach: number;
  saves: number;
  likes: number;
  comments: number;
  postsThisWeek: number;
  weeklyGoal: number;
  followerGrowth: number;
  topPostType: string;
  monthlyFeedPosts: number;
  monthlyReelPosts: number;
  monthlyStoryPosts: number;
}

interface PostData {
  id: string;
  userId: string;
  title: string;
  content: string;
  hashtags: string[];
  postType: 'feed' | 'reel' | 'story';
  scheduledDate?: string;
  scheduledTime?: string;
  status: 'draft' | 'scheduled' | 'published';
  imageUrl?: string | null;
  imageData?: string | null;
  createdAt: Date;
  updatedAt: Date;
  analytics?: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
    reach: number;
    engagementRate: number;
    publishedAt: Date;
  };
}

interface RecentPost {
  id: string;
  title: string;
  type: 'feed' | 'reel' | 'story';
  likes: number;
  comments: number;
  saves: number;
  reach: number;
  engagementRate: number;
  postedAt: string;
  imageUrl: string;
  caption?: string;
}

function InstagramDashboardContent() {
  const { loading: profileLoading, error: profileError } = useUserProfile();
  const { getSNSSettings } = useSNSSettings();
  const { planData } = usePlanData();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    followers: 0,
    engagement: 0,
    reach: 0,
    saves: 0,
    likes: 0,
    comments: 0,
    postsThisWeek: 0,
    weeklyGoal: 5,
    followerGrowth: 0,
    topPostType: 'ー',
    monthlyFeedPosts: 0,
    monthlyReelPosts: 0,
    monthlyStoryPosts: 0
  });

  const [recentPosts] = useState<RecentPost[]>([
    {
      id: '1',
      title: '新商品の紹介動画',
      type: 'reel',
      likes: 156,
      comments: 23,
      saves: 45,
      reach: 1200,
      engagementRate: 5.2,
      postedAt: '2時間前',
      imageUrl: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=400&fit=crop&crop=center',
      caption: '新商品の魅力を動画でご紹介！'
    },
    {
      id: '2',
      title: '今日のオフィス風景',
      type: 'feed',
      likes: 89,
      comments: 12,
      saves: 18,
      reach: 890,
      engagementRate: 3.8,
      postedAt: '1日前',
      imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=400&fit=crop&crop=center',
      caption: '今日のオフィスはこんな感じです'
    },
    {
      id: '3',
      title: 'ストーリー: 朝のルーティン',
      type: 'story',
      likes: 0,
      comments: 0,
      saves: 0,
      reach: 450,
      engagementRate: 2.1,
      postedAt: '2日前',
      imageUrl: 'https://images.unsplash.com/photo-1506905925346-14bda5d4b4c0?w=400&h=400&fit=crop&crop=center',
      caption: '朝のルーティンをストーリーで'
    },
    {
      id: '4',
      title: '業界の最新トレンド解説',
      type: 'reel',
      likes: 234,
      comments: 45,
      saves: 67,
      reach: 2100,
      engagementRate: 6.1,
      postedAt: '3日前',
      imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop&crop=center',
      caption: '業界の最新トレンドを解説します'
    }
  ]);

  const instagramSettings = getSNSSettings('instagram');

  // 投稿データを取得して統計を計算
  const fetchPostsAndCalculateStats = async () => {
    try {
      setLoading(true);
      
      // バックエンドAPIから統計データを取得
      const [postsResponse, statsResponse] = await Promise.all([
        postsApi.list({ userId: 'current-user' }),
        analyticsApi.getDashboardStats('current-user')
      ]);
      
      const allPosts = postsResponse.posts || [];
      setPosts(allPosts);
      
      // バックエンドから取得した統計データを使用
      if (statsResponse.stats) {
        setStats(statsResponse.stats);
      } else {
        // フォールバック: フロントエンドで計算
        const publishedPosts = allPosts.filter((post: PostData) => 
          post.status === 'published' && post.analytics
        );

        const totalLikes = publishedPosts.reduce((sum: number, post: PostData) => 
          sum + (post.analytics?.likes || 0), 0
        );
        const totalComments = publishedPosts.reduce((sum: number, post: PostData) => 
          sum + (post.analytics?.comments || 0), 0
        );
        const totalSaves = publishedPosts.reduce((sum: number, post: PostData) => 
          sum + (post.analytics?.shares || 0), 0
        );
        const totalReach = publishedPosts.reduce((sum: number, post: PostData) => 
          sum + (post.analytics?.reach || 0), 0
        );

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const postsThisWeek = publishedPosts.filter((post: PostData) => 
          post.analytics && new Date(post.analytics.publishedAt) >= oneWeekAgo
        ).length;

        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const monthlyPosts = publishedPosts.filter((post: PostData) => 
          post.analytics && new Date(post.analytics.publishedAt) >= oneMonthAgo
        );

        const monthlyFeedPosts = monthlyPosts.filter((post: PostData) => post.postType === 'feed').length;
        const monthlyReelPosts = monthlyPosts.filter((post: PostData) => post.postType === 'reel').length;
        const monthlyStoryPosts = monthlyPosts.filter((post: PostData) => post.postType === 'story').length;

        const avgEngagement = publishedPosts.length > 0 
          ? publishedPosts.reduce((sum: number, post: PostData) => sum + (post.analytics?.engagementRate || 0), 0) / publishedPosts.length
          : 0;

        const estimatedFollowers = 1000 + (totalLikes * 0.1);

        setStats({
          followers: Math.round(estimatedFollowers),
          engagement: Math.round(avgEngagement * 10) / 10,
          reach: totalReach,
          saves: totalSaves,
          likes: totalLikes,
          comments: totalComments,
          postsThisWeek,
          weeklyGoal: 5,
          followerGrowth: publishedPosts.length > 0 ? 12.5 : 0,
          topPostType: monthlyPosts.length > 0 
            ? (() => {
                const typeCounts = monthlyPosts.reduce((acc: Record<string, number>, post: PostData) => {
                  acc[post.postType] = (acc[post.postType] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                const maxType = Object.entries(typeCounts).reduce((a, b) => 
                  typeCounts[a[0]] > typeCounts[b[0]] ? a : b
                );
                return maxType[0] === 'feed' ? 'フィード' : 
                       maxType[0] === 'reel' ? 'リール' : 
                       maxType[0] === 'story' ? 'ストーリーズ' : 'ー';
              })()
            : 'ー',
          monthlyFeedPosts,
          monthlyReelPosts,
          monthlyStoryPosts
        });
      }

    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostsAndCalculateStats();
    
    // リアルタイム更新のためのポーリング（30秒間隔）
    const interval = setInterval(() => {
      fetchPostsAndCalculateStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  // グラフ用のデータを動的に生成
  const generateChartData = (type: 'likes' | 'followers' | 'saves' | 'reach') => {
    const labels = ['月', '火', '水', '木', '金', '土', '日'];
    const data = labels.map(() => 0);
    
    if (posts.length === 0) {
      return { labels, datasets: [{ data, borderColor: '#ff8a15', backgroundColor: 'rgba(255, 138, 21, 0.1)', tension: 0.4, fill: true }] };
    }

    // 過去7日間のデータを計算
    const publishedPosts = posts.filter((post: PostData) => post.status === 'published' && post.analytics);
    
    labels.forEach((_, index) => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - (6 - index));
      
      const dayPosts = publishedPosts.filter((post: PostData) => {
        if (!post.analytics) return false;
        const postDate = new Date(post.analytics.publishedAt);
        return postDate.toDateString() === targetDate.toDateString();
      });

      data[index] = dayPosts.reduce((sum: number, post: PostData) => {
        if (!post.analytics) return sum;
        switch (type) {
          case 'likes': return sum + post.analytics.likes;
          case 'followers': return sum + Math.floor(post.analytics.likes * 0.1); // 推定フォロワー増加
          case 'saves': return sum + post.analytics.shares;
          case 'reach': return sum + post.analytics.reach;
          default: return sum;
        }
      }, 0);
    });

    const colors = {
      likes: { border: '#ff8a15', bg: 'rgba(255, 138, 21, 0.1)' },
      followers: { border: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
      saves: { border: '#ea580c', bg: 'rgba(234, 88, 12, 0.1)' },
      reach: { border: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)' }
    };

    return {
      labels,
      datasets: [{
        data,
        borderColor: colors[type].border,
        backgroundColor: colors[type].bg,
        tension: 0.4,
        fill: true,
      }]
    };
  };

  const likesChartData = generateChartData('likes');
  const followersChartData = generateChartData('followers');
  const savesChartData = generateChartData('saves');
  const reachChartData = generateChartData('reach');

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 10,
          },
        },
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 10,
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };


  const [manualPostData, setManualPostData] = useState({
    title: '',
    type: 'feed' as 'feed' | 'reel' | 'story',
    content: '',
    hashtags: '',
    thumbnail: '',
    likes: 0,
    comments: 0,
    saves: 0,
    reach: 0
  });

  // ローディング状態
  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  // エラー状態
  if (profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">エラー: {profileError}</div>
      </div>
    );
  }

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'reel': return '🎬';
      case 'feed': return '📸';
      case 'story': return '📱';
      default: return '📷';
    }
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'reel': return 'bg-purple-100 text-purple-800';
      case 'feed': return 'bg-blue-100 text-blue-800';
      case 'story': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleManualPostSubmit = () => {
    // 手動投稿結果を追加
    const newPost: RecentPost = {
      id: Date.now().toString(),
      title: manualPostData.title,
      type: manualPostData.type,
      likes: manualPostData.likes,
      comments: manualPostData.comments,
      saves: manualPostData.saves,
      reach: manualPostData.reach,
      engagementRate: ((manualPostData.likes + manualPostData.comments + manualPostData.saves) / manualPostData.reach * 100) || 0,
      postedAt: '今',
      imageUrl: manualPostData.thumbnail || 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=400&fit=crop&crop=center',
      caption: manualPostData.content || manualPostData.title
    };
    
    // ここで実際のデータ更新処理を行う
    console.log('手動投稿結果:', newPost);
    console.log('投稿内容:', {
      title: manualPostData.title,
      content: manualPostData.content,
      hashtags: manualPostData.hashtags,
      thumbnail: manualPostData.thumbnail,
      type: manualPostData.type,
      metrics: {
        likes: manualPostData.likes,
        comments: manualPostData.comments,
        saves: manualPostData.saves,
        reach: manualPostData.reach
      }
    });
    
    // フォームをリセット
    setManualPostData({
      title: '',
      type: 'feed',
      content: '',
      hashtags: '',
      thumbnail: '',
      likes: 0,
      comments: 0,
      saves: 0,
      reach: 0
    });
  };

  return (
    <>
      <SNSLayout 
        currentSNS="instagram"
        customTitle="Instagram Dashboard"
        customDescription="あなたのInstagramアカウントの総合管理画面"
      >
        <div className="max-w-7xl mx-auto">
          {/* 計画内容の連携表示 */}
          {planData ? (
            <div className="bg-white p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Target className="h-6 w-6 mr-2 text-pink-600" />
                現在の運用計画
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">目標名</p>
                  <p className="font-semibold text-gray-900">{planData.goalName}</p>
                </div>
                <div className="bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">計画期間</p>
                  <p className="font-semibold text-gray-900">{planData.planPeriod}</p>
                </div>
                <div className="bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">目標フォロワー数</p>
                  <p className="font-semibold text-gray-900">{planData.currentFollowers + planData.followerGain}</p>
                </div>
                <div className="bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">カテゴリ</p>
                  <p className="font-semibold text-gray-900">{planData.goalCategory}</p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <a 
                  href="/instagram/plan" 
                  className="text-sm text-pink-600 hover:text-pink-700 font-medium"
                >
                  詳細を見る →
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 mb-8">
              <div className="text-center">
                <div className="text-4xl mb-4">📋</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">運用計画を作成しましょう</h2>
                <p className="text-gray-600 mb-4">Instagram運用の目標を設定して、効果的な戦略を立てましょう</p>
                <a 
                  href="/instagram/plan" 
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium text-white bg-[#ff8a15] hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                >
                  <Target className="h-5 w-5 mr-2" />
                  運用計画を作成する
                </a>
              </div>
            </div>
          )}

          {/* 目標達成通知 */}
          <div className="bg-white p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="text-2xl mr-2">🎯</span>
                  目標達成通知
                </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">週間投稿目標</span>
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">達成済み</span>
                </div>
                <div className="text-2xl font-bold text-green-600">5/5</div>
                <div className="text-xs text-gray-500">100% 達成</div>
              </div>
              
              <div className="bg-white p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">エンゲージメント目標</span>
                  <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">進行中</span>
                </div>
                <div className="text-2xl font-bold text-yellow-600">4.2%</div>
                <div className="text-xs text-gray-500">目標: 5.0%</div>
              </div>
              
              <div className="bg-white p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">フォロワー増加</span>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">達成済み</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">+12.5%</div>
                <div className="text-xs text-gray-500">目標: +10%</div>
              </div>
            </div>
          </div>

          {/* 統計カード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-pink-100 rounded-lg">
                  <Users className="h-6 w-6 text-pink-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">フォロワー数</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? 'ー' : stats.followers.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {loading ? 'ー' : `+${stats.followerGrowth}%`} 今月
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Heart className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">エンゲージメント率</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.engagement}%</p>
                  <p className="text-xs text-blue-600">業界平均: 3.2%</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Eye className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">リーチ数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.reach.toLocaleString()}</p>
                  <p className="text-xs text-green-600">今週</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Bookmark className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">保存数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.saves}</p>
                  <p className="text-xs text-purple-600">今週</p>
                </div>
              </div>
            </div>
          </div>

          {/* 追加のKPIカード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-red-100 rounded-lg">
                  <ThumbsUp className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">いいね数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.likes.toLocaleString()}</p>
                  <p className="text-xs text-red-600">今週</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Camera className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">ストーリーズ投稿</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.monthlyStoryPosts}</p>
                  <p className="text-xs text-yellow-600">今月</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <ImageIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">フィード投稿</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.monthlyFeedPosts}</p>
                  <p className="text-xs text-indigo-600">今月</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Play className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">リール投稿</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.monthlyReelPosts}</p>
                  <p className="text-xs text-orange-600">今月</p>
                </div>
              </div>
            </div>
          </div>

          {/* よく使用したハッシュタグランキング */}
          <div className="bg-white mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <span className="text-2xl mr-2">#️⃣</span>
                よく使用したハッシュタグランキング
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { tag: '#インスタグラム', count: 15, engagement: 4.2 },
                  { tag: '#マーケティング', count: 12, engagement: 3.8 },
                  { tag: '#ビジネス', count: 10, engagement: 5.1 },
                  { tag: '#SNS', count: 8, engagement: 3.5 },
                  { tag: '#デジタル', count: 7, engagement: 4.8 },
                  { tag: '#戦略', count: 6, engagement: 3.2 }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center">
                      <span className="text-lg font-bold text-pink-600 mr-3">#{index + 1}</span>
                      <div>
                        <div className="font-medium text-gray-900">{item.tag}</div>
                        <div className="text-sm text-gray-500">{item.count}回使用</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-pink-600">{item.engagement}%</div>
                      <div className="text-xs text-gray-500">エンゲージメント</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* エンゲージメント分析グラフ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* フォロワー数グラフ */}
            <div className="bg-white border border-[#ff8a15] p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                  <Users className="w-4 h-4 mr-1 text-[#f97316]" />
                  フォロワー数
                </h4>
                <span className="text-xs text-gray-500">過去1週間</span>
              </div>
              <div className="h-32">
                <Line data={followersChartData} options={chartOptions} />
              </div>
              <div className="mt-2 text-center">
                <span className="text-lg font-bold text-[#f97316]">
                  {loading ? 'ー' : stats.followers.toLocaleString()}
                </span>
                <span className="text-xs text-gray-500 ml-1">現在</span>
              </div>
            </div>

            {/* いいね数グラフ */}
            <div className="bg-white border border-[#ff8a15] p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                  <Heart className="w-4 h-4 mr-1 text-[#ff8a15]" />
                  いいね数
                </h4>
                <span className="text-xs text-gray-500">過去1週間</span>
              </div>
              <div className="h-32">
                <Line data={likesChartData} options={chartOptions} />
              </div>
              <div className="mt-2 text-center">
                <span className="text-lg font-bold text-[#ff8a15]">
                  {loading ? 'ー' : stats.likes.toLocaleString()}
                </span>
                <span className="text-xs text-gray-500 ml-1">合計</span>
              </div>
            </div>

            {/* 保存数グラフ */}
            <div className="bg-white border border-[#ff8a15] p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                  <Bookmark className="w-4 h-4 mr-1 text-[#ea580c]" />
                  保存数
                </h4>
                <span className="text-xs text-gray-500">過去1週間</span>
              </div>
              <div className="h-32">
                <Line data={savesChartData} options={chartOptions} />
              </div>
              <div className="mt-2 text-center">
                <span className="text-lg font-bold text-[#ea580c]">
                  {loading ? 'ー' : stats.saves.toLocaleString()}
                </span>
                <span className="text-xs text-gray-500 ml-1">合計</span>
              </div>
            </div>

            {/* リーチ数グラフ */}
            <div className="bg-white border border-[#ff8a15] p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                  <Eye className="w-4 h-4 mr-1 text-[#dc2626]" />
                  リーチ数
                </h4>
                <span className="text-xs text-gray-500">過去1週間</span>
              </div>
              <div className="h-32">
                <Line data={reachChartData} options={chartOptions} />
              </div>
              <div className="mt-2 text-center">
                <span className="text-lg font-bold text-[#dc2626]">
                  {loading ? 'ー' : stats.reach.toLocaleString()}
                </span>
                <span className="text-xs text-gray-500 ml-1">合計</span>
              </div>
            </div>
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 左カラム - 最近の投稿とAI設定 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 最近の投稿 */}
              <div className="bg-white">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <BarChart3 className="h-6 w-6 mr-2 text-pink-600" />
                    最近の投稿パフォーマンス
                  </h2>
                  <a 
                    href="/instagram/posts" 
                    className="text-sm text-pink-600 hover:text-pink-700 font-medium"
                  >
                    すべて見る →
                  </a>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recentPosts.map((post) => (
                      <div key={post.id} className="bg-gray-50 p-4 hover:shadow-md transition-shadow">
                        {/* 投稿情報 */}
                        <div className="flex items-center justify-between mb-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPostTypeColor(post.type)}`}>
                            {getPostTypeIcon(post.type)} {post.type === 'reel' ? 'リール' : post.type === 'feed' ? 'フィード' : 'ストーリー'}
                          </span>
                          <span className="text-xs text-gray-500">{post.postedAt}</span>
                        </div>
                        <h3 className="font-medium text-gray-900 mb-4 line-clamp-2">{post.title}</h3>
                        
                        {/* KPI表示 */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="text-center bg-gray-50 rounded-lg p-2">
                            <div className="text-gray-500 text-xs">いいね</div>
                            <div className="font-semibold text-gray-900">{post.likes}</div>
                          </div>
                          <div className="text-center bg-gray-50 rounded-lg p-2">
                            <div className="text-gray-500 text-xs">コメント</div>
                            <div className="font-semibold text-gray-900">{post.comments}</div>
                          </div>
                          <div className="text-center bg-gray-50 rounded-lg p-2">
                            <div className="text-gray-500 text-xs">保存</div>
                            <div className="font-semibold text-gray-900">{post.saves}</div>
                          </div>
                          <div className="text-center bg-gray-50 rounded-lg p-2">
                            <div className="text-gray-500 text-xs">エンゲージメント率</div>
                            <div className="font-semibold text-pink-600">{post.engagementRate}%</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* TODOリスト */}
              <div className="bg-white">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                      <span className="text-2xl mr-2">✅</span>
                      TODOリスト
                    </h2>
                    <button className="flex items-center space-x-1 text-sm text-[#ff8a15] font-medium px-3 py-1.5 border border-[#ff8a15] hover:bg-[#ff8a15] hover:text-white transition-all duration-200 rounded-md">
                      <span>+</span>
                      <span>追加</span>
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-2">
                    {[
                      { task: '新商品の投稿コンテンツ作成', priority: 'high', due: '今日' },
                      { task: 'ハッシュタグ分析レポート確認', priority: 'medium', due: '明日' },
                      { task: '競合他社の投稿内容調査', priority: 'low', due: '今週末' },
                      { task: 'ストーリー用の素材準備', priority: 'medium', due: '明日' },
                      { task: 'エンゲージメント率向上の戦略検討', priority: 'high', due: '来週' }
                    ].map((item, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 hover:bg-gray-50 transition-colors border border-gray-100 rounded-lg">
                        <input 
                          type="checkbox" 
                          className="mt-1 h-4 w-4 text-[#ff8a15] focus:ring-[#ff8a15] border-gray-300 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 leading-5">{item.task}</div>
                          <div className="flex items-center justify-between mt-1">
                            <div className="text-xs text-gray-500">期限: {item.due}</div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.priority === 'high' ? 'bg-red-100 text-red-700' :
                              item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {item.priority === 'high' ? '🔴 高' : item.priority === 'medium' ? '🟡 中' : '🟢 低'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* 右カラム - クイックアクションと分析 */}
            <div className="space-y-6">
              {/* 今週の投稿予定 */}
              <div className="bg-white">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <Calendar className="h-6 w-6 mr-2 text-blue-600" />
                    今週の投稿予定
                  </h2>
                  <a href="/instagram/plan" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    投稿管理 →
                  </a>
                </div>
                <div className="p-6 space-y-3">
                  {[
                    { day: '月', date: '12/16', type: 'リール', title: '新商品紹介動画', time: '14:00', status: 'scheduled' },
                    { day: '火', date: '12/17', type: 'フィード', title: 'オフィス風景', time: '10:00', status: 'scheduled' },
                    { day: '水', date: '12/18', type: 'ストーリー', title: '朝のルーティン', time: '08:00', status: 'scheduled' },
                    { day: '木', date: '12/19', type: 'リール', title: '業界トレンド解説', time: '16:00', status: 'draft' },
                    { day: '金', date: '12/20', type: 'フィード', title: '週末の振り返り', time: '18:00', status: 'draft' }
                  ].map((post, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center">
                        <div className="text-center mr-4">
                          <div className="text-xs text-gray-500">{post.day}</div>
                          <div className="text-sm font-semibold text-gray-900">{post.date}</div>
                        </div>
                        <div>
                          <div className="flex items-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mr-2 ${
                              post.type === 'reel' ? 'bg-purple-100 text-purple-800' :
                              post.type === 'feed' ? 'bg-blue-100 text-blue-800' :
                              'bg-pink-100 text-pink-800'
                            }`}>
                              {post.type === 'reel' ? '🎬' : post.type === 'feed' ? '📸' : '📱'}
                              {post.type === 'reel' ? 'リール' : post.type === 'feed' ? 'フィード' : 'ストーリー'}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              post.status === 'scheduled' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {post.status === 'scheduled' ? '予定済み' : '下書き'}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-gray-900 mt-1">{post.title}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">{post.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
               
              </div>

              {/* 投稿分析手動入力 */}
              <div className="bg-white">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <Edit3 className="h-6 w-6 mr-2 text-orange-600" />
                    投稿分析入力
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">検索</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="投稿を検索..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">投稿タイトル</label>
                    <input
                      type="text"
                      value={manualPostData.title}
                      onChange={(e) => setManualPostData({...manualPostData, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="投稿のタイトルを入力"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">投稿文</label>
                    <textarea
                      value={manualPostData.content}
                      onChange={(e) => setManualPostData({...manualPostData, content: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="投稿の内容を入力"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ハッシュタグ</label>
                    <input
                      type="text"
                      value={manualPostData.hashtags}
                      onChange={(e) => setManualPostData({...manualPostData, hashtags: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="#hashtag1 #hashtag2 #hashtag3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">サムネイル画像</label>
                    <input
                      type="text"
                      value={manualPostData.thumbnail}
                      onChange={(e) => setManualPostData({...manualPostData, thumbnail: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="画像URLを入力"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">投稿タイプ</label>
                    <select
                      value={manualPostData.type}
                      onChange={(e) => setManualPostData({...manualPostData, type: e.target.value as 'feed' | 'reel' | 'story'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="feed">フィード</option>
                      <option value="reel">リール</option>
                      <option value="story">ストーリー</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">いいね数</label>
                      <input
                        type="number"
                        value={manualPostData.likes}
                        onChange={(e) => setManualPostData({...manualPostData, likes: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">コメント数</label>
                      <input
                        type="number"
                        value={manualPostData.comments}
                        onChange={(e) => setManualPostData({...manualPostData, comments: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">保存数</label>
                      <input
                        type="number"
                        value={manualPostData.saves}
                        onChange={(e) => setManualPostData({...manualPostData, saves: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">リーチ数</label>
                      <input
                        type="number"
                        value={manualPostData.reach}
                        onChange={(e) => setManualPostData({...manualPostData, reach: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleManualPostSubmit}
                    className="w-full bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
                  >
                    投稿結果を保存
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </SNSLayout>

      {/* AIチャットウィジェット */}
      <AIChatWidget
        contextData={{
          stats: stats,
          recentPosts: recentPosts,
          instagramSettings: instagramSettings
        }}
      />
    </>
  );
}

export default function InstagramDashboard() {
  return (
    <AuthGuard>
      <InstagramDashboardContent />
    </AuthGuard>
  );
}