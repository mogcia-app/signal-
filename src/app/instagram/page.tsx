'use client';

import { useState } from 'react';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useSNSSettings } from '../../hooks/useSNSSettings';
import { usePlanData } from '../../hooks/usePlanData';
import { AuthGuard } from '../../components/auth-guard';
import SNSLayout from '../../components/sns-layout';
import { AIChatWidget } from '../../components/ai-chat-widget';
import { 
  Users, 
  Heart, 
  Eye, 
  Bookmark, 
  TrendingUp, 
  Target,
  BarChart3,
  Edit3,
  ThumbsUp,
  Play,
  Image as ImageIcon,
  Camera,
  Settings
} from 'lucide-react';

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
  const [stats] = useState<DashboardStats>({
    followers: 1234,
    engagement: 4.2,
    reach: 5678,
    saves: 89,
    likes: 2340,
    comments: 156,
    postsThisWeek: 3,
    weeklyGoal: 5,
    followerGrowth: 12.5,
    topPostType: 'リール',
    monthlyFeedPosts: 12,
    monthlyReelPosts: 8,
    monthlyStoryPosts: 28
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
  const [manualPostData, setManualPostData] = useState({
    title: '',
    type: 'feed' as 'feed' | 'reel' | 'story',
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
      imageUrl: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=400&fit=crop&crop=center',
      caption: manualPostData.title
    };
    
    // ここで実際のデータ更新処理を行う
    console.log('手動投稿結果:', newPost);
    
    // フォームをリセット
    setManualPostData({
      title: '',
      type: 'feed',
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

          {/* 統計カード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-pink-100 rounded-lg">
                  <Users className="h-6 w-6 text-pink-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">フォロワー数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.followers.toLocaleString()}</p>
                  <p className="text-xs text-green-600 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +{stats.followerGrowth}% 今月
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
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

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
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

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
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

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
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

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
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

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
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

          {/* 計画内容の連携表示 */}
          {planData ? (
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200 p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Target className="h-6 w-6 mr-2 text-pink-600" />
                現在の運用計画
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600">目標名</p>
                  <p className="font-semibold text-gray-900">{planData.goalName}</p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600">計画期間</p>
                  <p className="font-semibold text-gray-900">{planData.planPeriod}</p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600">目標フォロワー数</p>
                  <p className="font-semibold text-gray-900">{planData.currentFollowers + planData.followerGain}</p>
                </div>
                <div className="bg-white rounded-lg p-4">
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
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6 mb-8">
              <div className="text-center">
                <div className="text-4xl mb-4">📋</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">運用計画を作成しましょう</h2>
                <p className="text-gray-600 mb-4">Instagram運用の目標を設定して、効果的な戦略を立てましょう</p>
                <a 
                  href="/instagram/plan" 
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <Target className="h-5 w-5 mr-2" />
                  運用計画を作成する
                </a>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 左カラム - 最近の投稿とAI設定 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 最近の投稿 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
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
                      <div key={post.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
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

              {/* AI設定状況 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <Settings className="h-6 w-6 mr-2 text-blue-600" />
                    AI設定状況
                  </h2>
                </div>
                <div className="p-6">
                  {instagramSettings ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">自動投稿</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            有効
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">ハッシュタグ生成</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            有効
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">投稿分析</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            有効
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">最適化提案</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            部分有効
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-4xl mb-4">⚙️</div>
                      <p className="text-gray-500 mb-4">InstagramのAI設定は登録されていません</p>
                      <a 
                        href="/instagram/plan" 
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700"
                      >
                        設定を開始する
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 右カラム - クイックアクションと分析 */}
            <div className="space-y-6">
              {/* 投稿分析手動入力 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <Edit3 className="h-6 w-6 mr-2 text-orange-600" />
                    投稿分析入力
                  </h2>
                </div>
                <div className="p-6 space-y-4">
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

              {/* 今週の目標 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <Target className="h-6 w-6 mr-2 text-purple-600" />
                    今週の目標
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">投稿数</span>
                    <span className="text-sm font-medium text-gray-900">{stats.postsThisWeek}/{stats.weeklyGoal}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-pink-500 h-2 rounded-full transition-all duration-300" 
                      style={{width: `${(stats.postsThisWeek / stats.weeklyGoal) * 100}%`}}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">ストーリー投稿</span>
                    <span className="text-sm font-medium text-gray-900">{stats.monthlyStoryPosts}/30</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{width: `${(stats.monthlyStoryPosts / 30) * 100}%`}}></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">エンゲージメント</span>
                    <span className="text-sm font-medium text-gray-900">85%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{width: '85%'}}></div>
                  </div>
                </div>
              </div>

              {/* パフォーマンス概要 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <TrendingUp className="h-6 w-6 mr-2 text-blue-600" />
                    パフォーマンス概要
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">フォロワー増加率</span>
                      <span className="text-sm font-medium text-green-600">+{stats.followerGrowth}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{width: '75%'}}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">エンゲージメント率</span>
                      <span className="text-sm font-medium text-blue-600">{stats.engagement}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{width: '60%'}}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">人気投稿タイプ</span>
                      <span className="text-sm font-medium text-purple-600">{stats.topPostType}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{width: '80%'}}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 今週のハイライト */}
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <span className="text-2xl mr-2">🌟</span>
                  今週のハイライト
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">最高エンゲージメント率</span>
                    <span className="font-semibold text-pink-600">6.1%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">最多いいね投稿</span>
                    <span className="font-semibold text-pink-600">234いいね</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">新規フォロワー</span>
                    <span className="font-semibold text-pink-600">+45人</span>
                  </div>
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