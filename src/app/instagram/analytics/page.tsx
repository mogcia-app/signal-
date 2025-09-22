'use client';

import React, { useState, useEffect } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { postsApi } from '../../../lib/api';
import { 
  Heart, 
  MessageCircle, 
  Share, 
  Eye, 
  TrendingUp, 
  Calendar, 
  Clock, 
  Save,
  RefreshCw,
  BarChart3,
  Target,
  Zap
} from 'lucide-react';

interface PostData {
  id: string;
  title: string;
  content: string;
  hashtags: string[];
  postType: 'feed' | 'reel' | 'story';
  scheduledDate?: string;
  scheduledTime?: string;
  status: 'draft' | 'scheduled' | 'published';
  createdAt: Date;
}

interface AnalyticsData {
  id: string;
  postId: string;
  userId: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  profileClicks?: number;
  websiteClicks?: number;
  storyViews?: number;
  followerChange?: number;
  publishedAt: Date;
  createdAt: Date;
}

export default function InstagramAnalyticsPage() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 入力データ
  const [inputData, setInputData] = useState({
    likes: '',
    comments: '',
    shares: '',
    reach: '',
    profileClicks: '',
    websiteClicks: '',
    storyViews: '',
    followerChange: '',
    publishedAt: new Date().toISOString().split('T')[0]
  });

  // 投稿一覧を取得
  const fetchPosts = async () => {
    try {
      const response = await postsApi.list({ userId: 'current-user' });
      setPosts(response.posts || []);
    } catch (error) {
      console.error('投稿取得エラー:', error);
    }
  };

  // 分析データを取得
  const fetchAnalytics = async () => {
    try {
      // 実際の実装では analytics API を呼び出す
      // 今回は模擬データを使用
      const mockData: AnalyticsData[] = [
        {
          id: '1',
          postId: 'post-1',
          userId: 'current-user',
          likes: 245,
          comments: 18,
          shares: 12,
          reach: 1250,
          profileClicks: 45,
          websiteClicks: 8,
          storyViews: 320,
          followerChange: 15,
          publishedAt: new Date('2024-01-15'),
          createdAt: new Date()
        },
        {
          id: '2',
          postId: 'post-2',
          userId: 'current-user',
          likes: 189,
          comments: 23,
          shares: 7,
          reach: 980,
          profileClicks: 32,
          websiteClicks: 5,
          storyViews: 280,
          followerChange: 8,
          publishedAt: new Date('2024-01-12'),
          createdAt: new Date()
        }
      ];
      setAnalyticsData(mockData);
    } catch (error) {
      console.error('分析データ取得エラー:', error);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchAnalytics();
  }, []);

  // 分析データを保存
  const handleSaveAnalytics = async () => {
    if (!selectedPostId) {
      alert('投稿を選択してください');
      return;
    }

    setIsLoading(true);
    try {
      // 実際の実装では analytics API を呼び出す
      const newAnalytics: AnalyticsData = {
        id: Date.now().toString(),
        postId: selectedPostId,
        userId: 'current-user',
        likes: parseInt(inputData.likes) || 0,
        comments: parseInt(inputData.comments) || 0,
        shares: parseInt(inputData.shares) || 0,
        reach: parseInt(inputData.reach) || 0,
        profileClicks: parseInt(inputData.profileClicks) || 0,
        websiteClicks: parseInt(inputData.websiteClicks) || 0,
        storyViews: parseInt(inputData.storyViews) || 0,
        followerChange: parseInt(inputData.followerChange) || 0,
        publishedAt: new Date(inputData.publishedAt),
        createdAt: new Date()
      };

      setAnalyticsData(prev => [newAnalytics, ...prev]);
      
      // 入力データをリセット
      setInputData({
        likes: '',
        comments: '',
        shares: '',
        reach: '',
        profileClicks: '',
        websiteClicks: '',
        storyViews: '',
        followerChange: '',
        publishedAt: new Date().toISOString().split('T')[0]
      });
      
      alert('分析データを保存しました！');
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 選択された投稿のデータ
  const selectedPost = posts.find(post => post.id === selectedPostId);
  
  // 最新の分析データ
  const latestAnalytics = analyticsData[0];
  
  // エンゲージメント率計算
  const engagementRate = latestAnalytics 
    ? ((latestAnalytics.likes + latestAnalytics.comments + latestAnalytics.shares) / latestAnalytics.reach * 100).toFixed(1)
    : '0.0';

  // パフォーマンススコア計算（0-100）
  const performanceScore = latestAnalytics 
    ? Math.min(100, Math.round((latestAnalytics.likes + latestAnalytics.comments * 2 + latestAnalytics.shares * 3) / 10))
    : 0;

  // 前回投稿との比較
  const previousAnalytics = analyticsData[1];
  const likesChange = latestAnalytics && previousAnalytics 
    ? latestAnalytics.likes - previousAnalytics.likes
    : 0;
  const engagementChange = latestAnalytics && previousAnalytics
    ? parseFloat(engagementRate) - ((previousAnalytics.likes + previousAnalytics.comments + previousAnalytics.shares) / previousAnalytics.reach * 100)
    : 0;

  return (
    <SNSLayout 
      currentSNS="instagram"
      customTitle="投稿分析"
      customDescription="投稿パフォーマンスを分析し、改善点を見つけましょう"
    >
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 左カラム: データ入力 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">分析データ入力</h2>
                  <p className="text-sm text-gray-600">投稿のパフォーマンスデータを入力してください</p>
                </div>
              </div>

              {/* 投稿選択 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分析する投稿を選択
                </label>
                <select
                  value={selectedPostId}
                  onChange={(e) => setSelectedPostId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">投稿を選択してください</option>
                  {posts.filter(post => post.status === 'published').map(post => (
                    <option key={post.id} value={post.id}>
                      {post.title || 'タイトルなし'} - {new Date(post.createdAt).toLocaleDateString('ja-JP')}
                    </option>
                  ))}
                </select>
              </div>

              {/* 基本データ入力 */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Heart size={16} className="inline mr-1 text-red-500" />
                    いいね数
                  </label>
                  <input
                    type="number"
                    value={inputData.likes}
                    onChange={(e) => setInputData(prev => ({ ...prev, likes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="245"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MessageCircle size={16} className="inline mr-1 text-blue-500" />
                    コメント数
                  </label>
                  <input
                    type="number"
                    value={inputData.comments}
                    onChange={(e) => setInputData(prev => ({ ...prev, comments: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="18"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Share size={16} className="inline mr-1 text-green-500" />
                    シェア数
                  </label>
                  <input
                    type="number"
                    value={inputData.shares}
                    onChange={(e) => setInputData(prev => ({ ...prev, shares: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Eye size={16} className="inline mr-1 text-purple-500" />
                    リーチ数
                  </label>
                  <input
                    type="number"
                    value={inputData.reach}
                    onChange={(e) => setInputData(prev => ({ ...prev, reach: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1250"
                  />
                </div>
              </div>

              {/* 追加データ入力 */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    プロフィールクリック数
                  </label>
                  <input
                    type="number"
                    value={inputData.profileClicks}
                    onChange={(e) => setInputData(prev => ({ ...prev, profileClicks: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="45"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ウェブサイトクリック数
                  </label>
                  <input
                    type="number"
                    value={inputData.websiteClicks}
                    onChange={(e) => setInputData(prev => ({ ...prev, websiteClicks: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="8"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ストーリー閲覧数
                  </label>
                  <input
                    type="number"
                    value={inputData.storyViews}
                    onChange={(e) => setInputData(prev => ({ ...prev, storyViews: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="320"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    フォロワー増減数
                  </label>
                  <input
                    type="number"
                    value={inputData.followerChange}
                    onChange={(e) => setInputData(prev => ({ ...prev, followerChange: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="15"
                  />
                </div>
              </div>

              {/* 投稿日 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar size={16} className="inline mr-1" />
                  投稿日
                </label>
                <input
                  type="date"
                  value={inputData.publishedAt}
                  onChange={(e) => setInputData(prev => ({ ...prev, publishedAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 保存ボタン */}
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
                  onClick={() => setInputData({
                    likes: '',
                    comments: '',
                    shares: '',
                    reach: '',
                    profileClicks: '',
                    websiteClicks: '',
                    storyViews: '',
                    followerChange: '',
                    publishedAt: new Date().toISOString().split('T')[0]
                  })}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* 右カラム: 分析結果 */}
          <div className="space-y-6">
            {/* パフォーマンス概要 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">パフォーマンス分析</h2>
                  <p className="text-sm text-gray-600">最新の投稿パフォーマンス</p>
                </div>
              </div>

              {latestAnalytics ? (
                <div className="space-y-6">
                  {/* エンゲージメント率 */}
                  <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">{engagementRate}%</div>
                    <div className="text-sm text-gray-600">エンゲージメント率</div>
                    {engagementChange !== 0 && (
                      <div className={`text-sm mt-1 ${engagementChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {engagementChange > 0 ? '↑' : '↓'} {Math.abs(engagementChange).toFixed(1)}% 前回比
                      </div>
                    )}
                  </div>

                  {/* パフォーマンススコア */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">パフォーマンススコア</span>
                      <span className="text-lg font-bold text-gray-900">{performanceScore}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${performanceScore}%` }}
                      />
                    </div>
                  </div>

                  {/* 基本指標 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <Heart className="w-6 h-6 text-red-500 mx-auto mb-1" />
                      <div className="text-xl font-bold text-gray-900">{latestAnalytics.likes.toLocaleString()}</div>
                      <div className="text-xs text-gray-600">いいね</div>
                      {likesChange !== 0 && (
                        <div className={`text-xs ${likesChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {likesChange > 0 ? '+' : ''}{likesChange}
                        </div>
                      )}
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <MessageCircle className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                      <div className="text-xl font-bold text-gray-900">{latestAnalytics.comments.toLocaleString()}</div>
                      <div className="text-xs text-gray-600">コメント</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <Share className="w-6 h-6 text-green-500 mx-auto mb-1" />
                      <div className="text-xl font-bold text-gray-900">{latestAnalytics.shares.toLocaleString()}</div>
                      <div className="text-xs text-gray-600">シェア</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <Eye className="w-6 h-6 text-purple-500 mx-auto mb-1" />
                      <div className="text-xl font-bold text-gray-900">{latestAnalytics.reach.toLocaleString()}</div>
                      <div className="text-xs text-gray-600">リーチ</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">📊</div>
                  <p className="text-gray-600">分析データを入力してください</p>
                </div>
              )}
            </div>

            {/* インサイト・提案 */}
            {latestAnalytics && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">インサイト・提案</h2>
                    <p className="text-sm text-gray-600">AI分析による改善提案</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <h4 className="font-medium text-blue-900 mb-2">💡 成功要因</h4>
                    <p className="text-sm text-blue-800">
                      {parseFloat(engagementRate) > 3 
                        ? '高いエンゲージメント率を達成しています。コンテンツが視聴者に響いている証拠です。'
                        : 'エンゲージメント率の向上余地があります。より魅力的なコンテンツ作りを心がけましょう。'
                      }
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <h4 className="font-medium text-green-900 mb-2">🎯 改善提案</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• 投稿時間を夕方（18:00-20:00）に変更してみましょう</li>
                      <li>• ハッシュタグを5-10個に最適化してください</li>
                      <li>• ストーリーズを併用してリーチを拡大しましょう</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                    <h4 className="font-medium text-purple-900 mb-2">📈 次のアクション</h4>
                    <p className="text-sm text-purple-800">
                      この投稿の成功パターンを参考に、類似コンテンツを週1-2回投稿することをお勧めします。
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SNSLayout>
  );
}
