'use client';

import { useState } from 'react';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useSNSSettings } from '../../hooks/useSNSSettings';
import { AuthGuard } from '../../components/auth-guard';
import SNSLayout from '../../components/sns-layout';
import { AIChatWidget } from '../../components/ai-chat-widget';
import { 
  Users, 
  Heart, 
  Eye, 
  Bookmark, 
  TrendingUp, 
  Calendar,
  Target,
  BarChart3,
  Plus,
  Settings,
  MessageCircle
} from 'lucide-react';

interface DashboardStats {
  followers: number;
  engagement: number;
  reach: number;
  saves: number;
  postsThisWeek: number;
  weeklyGoal: number;
  followerGrowth: number;
  topPostType: string;
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
  imageUrl?: string;
}

function InstagramDashboardContent() {
  const { loading: profileLoading, error: profileError } = useUserProfile();
  const { getSNSSettings } = useSNSSettings();
  const [stats] = useState<DashboardStats>({
    followers: 1234,
    engagement: 4.2,
    reach: 5678,
    saves: 89,
    postsThisWeek: 3,
    weeklyGoal: 5,
    followerGrowth: 12.5,
    topPostType: 'リール'
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
      postedAt: '2時間前'
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
      postedAt: '1日前'
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
      postedAt: '2日前'
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
      postedAt: '3日前'
    }
  ]);

  const instagramSettings = getSNSSettings('instagram');

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

  return (
    <>
      <SNSLayout 
        currentSNS="instagram"
        customTitle="Instagram Dashboard"
        customDescription="あなたのInstagramアカウントの総合管理画面"
      >
        <div className="max-w-7xl mx-auto">
          {/* ウェルカムメッセージ */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">おかえりなさい！</h1>
            <p className="text-gray-600">今日のInstagram運用をチェックしましょう</p>
          </div>

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
                  <div className="space-y-4">
                    {recentPosts.map((post) => (
                      <div key={post.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPostTypeColor(post.type)}`}>
                                {getPostTypeIcon(post.type)} {post.type === 'reel' ? 'リール' : post.type === 'feed' ? 'フィード' : 'ストーリー'}
                              </span>
                              <span className="ml-2 text-sm text-gray-500">{post.postedAt}</span>
                            </div>
                            <h3 className="font-medium text-gray-900 mb-3">{post.title}</h3>
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div className="text-center">
                                <div className="text-gray-500">いいね</div>
                                <div className="font-semibold text-gray-900">{post.likes}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-gray-500">コメント</div>
                                <div className="font-semibold text-gray-900">{post.comments}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-gray-500">保存</div>
                                <div className="font-semibold text-gray-900">{post.saves}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-gray-500">エンゲージメント率</div>
                                <div className="font-semibold text-pink-600">{post.engagementRate}%</div>
                              </div>
                            </div>
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
              {/* クイックアクション */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <Target className="h-6 w-6 mr-2 text-green-600" />
                    クイックアクション
                  </h2>
                </div>
                <div className="p-6 space-y-3">
                  <a 
                    href="/instagram/plan" 
                    className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-colors"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    運用計画作成
                  </a>
                  <a 
                    href="/instagram/lab" 
                    className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    投稿ラボ
                  </a>
                  <a 
                    href="/instagram/analytics" 
                    className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    分析レポート
                  </a>
                  <a 
                    href="/instagram/posts" 
                    className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    投稿管理
                  </a>
                  <a 
                    href="/instagram/ai-chat" 
                    className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    AIチャット
                  </a>
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
                    <span className="text-sm font-medium text-gray-900">5/7</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{width: '71%'}}></div>
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