'use client';

import React, { useState, useEffect } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { AIChatWidget } from '../../../components/ai-chat-widget';
import { postsApi, analyticsApi } from '../../../lib/api';
import { PlanData } from '../plan/types/plan';
import { 
  Heart, 
  MessageCircle, 
  Share, 
  Eye, 
  Calendar, 
  Save,
  RefreshCw,
  BarChart3,
  Target,
  Edit3,
  Search
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
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  reach?: number;
  engagementRate?: number;
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
  const [planData, setPlanData] = useState<PlanData | null>(null);
  
  // 入力モードの管理
  const [inputMode, setInputMode] = useState<'search' | 'manual'>('search');
  
  // 投稿検索・選択用のstate
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PostData[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // 新規投稿用のstate
  const [newPostData, setNewPostData] = useState({
    title: '',
    content: '',
    hashtags: '',
    thumbnail: '',
    postType: 'feed' as 'feed' | 'reel' | 'story',
    publishedAt: new Date().toISOString().split('T')[0]
  });
  
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

  // 計画データを取得
  const fetchPlanData = async () => {
    try {
      // 実際の実装では plans API を呼び出す
      // 現在は計画データが存在しない状態をシミュレート
      // TODO: 実際のAPIエンドポイントに置き換える
      setPlanData(null);
    } catch (error) {
      console.error('計画データ取得エラー:', error);
      setPlanData(null);
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
        },
        {
          id: '3',
          postId: 'post-3',
          userId: 'current-user',
          likes: 312,
          comments: 28,
          shares: 15,
          reach: 1450,
          profileClicks: 52,
          websiteClicks: 12,
          storyViews: 380,
          followerChange: 22,
          publishedAt: new Date('2024-01-10'),
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
    fetchPlanData();
  }, []);

  // 投稿検索機能
  const searchPosts = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await postsApi.list({ userId: 'current-user' });
      const filteredPosts = response.posts.filter((post: PostData) => 
        post.title.toLowerCase().includes(query.toLowerCase()) ||
        post.content.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filteredPosts);
    } catch (error) {
      console.error('投稿検索エラー:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 投稿選択
  const selectPost = (post: PostData) => {
    setSelectedPost(post);
    setSelectedPostId(post.id);
    setInputData(prev => ({
      ...prev,
      publishedAt: new Date(post.createdAt).toISOString().split('T')[0]
    }));
    setSearchResults([]);
    setSearchQuery('');
  };

  // 分析データを保存
  const handleSaveAnalytics = async () => {
    setIsLoading(true);
    try {
      let postId = selectedPostId;
      
      // 新規投稿入力モードの場合は投稿を作成
      if (inputMode === 'manual' && !selectedPostId) {
        const postData = {
          userId: 'current-user',
          title: newPostData.title,
          content: newPostData.content,
          hashtags: newPostData.hashtags.split(' ').filter(tag => tag.trim()),
          postType: newPostData.postType,
          status: 'published' as const,
          imageUrl: newPostData.thumbnail || null
        };
        console.log('Creating new post:', postData);
        const response = await postsApi.create(postData);
        postId = response.id;
        console.log('New post created with ID:', postId);
      }

      if (!postId) {
        alert('投稿を選択するか、新規投稿の情報を入力してください');
        return;
      }

      // 分析データをanalyticsコレクションに保存
      const analyticsData = {
        postId: postId,
        userId: 'current-user',
        likes: parseInt(inputData.likes) || 0,
        comments: parseInt(inputData.comments) || 0,
        shares: parseInt(inputData.shares) || 0,
        reach: parseInt(inputData.reach) || 0,
        engagementRate: ((parseInt(inputData.likes) + parseInt(inputData.comments) + parseInt(inputData.shares)) / parseInt(inputData.reach) * 100) || 0,
        profileClicks: parseInt(inputData.profileClicks) || 0,
        websiteClicks: parseInt(inputData.websiteClicks) || 0,
        storyViews: parseInt(inputData.storyViews) || 0,
        followerChange: parseInt(inputData.followerChange) || 0,
        publishedAt: inputData.publishedAt
      };

      console.log('Saving analytics data to collection:', analyticsData);
      const response = await analyticsApi.create(analyticsData);
      console.log('Analytics data saved with ID:', response.id);

      // 分析データをローカルstateにも追加（表示用）
      const newAnalytics: AnalyticsData = {
        id: response.id,
        postId: postId,
        userId: 'current-user',
        likes: analyticsData.likes,
        comments: analyticsData.comments,
        shares: analyticsData.shares,
        reach: analyticsData.reach,
        profileClicks: analyticsData.profileClicks,
        websiteClicks: analyticsData.websiteClicks,
        storyViews: analyticsData.storyViews,
        followerChange: analyticsData.followerChange,
        publishedAt: new Date(analyticsData.publishedAt),
        createdAt: new Date()
      };

      setAnalyticsData(prev => [newAnalytics, ...prev]);
      
      // 投稿一覧を再取得
      await fetchPosts();
      
      // 入力データをリセット
      setSelectedPost(null);
      setSelectedPostId('');
      setInputMode('search');
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
      setNewPostData({
        title: '',
        content: '',
        hashtags: '',
        thumbnail: '',
        postType: 'feed',
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
  // const selectedPost = posts.find(post => post.id === selectedPostId);
  
  // 最新の分析データ
  // const latestAnalytics = analyticsData[0];
  
  // 今月の分析データを取得
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthAnalytics = analyticsData.filter(data => {
    const dataDate = new Date(data.publishedAt);
    return dataDate.getMonth() === currentMonth && dataDate.getFullYear() === currentYear;
  });

  // 今月のトータル計算
  const monthlyTotals = {
    totalLikes: thisMonthAnalytics.reduce((sum, data) => sum + data.likes, 0),
    totalComments: thisMonthAnalytics.reduce((sum, data) => sum + data.comments, 0),
    totalShares: thisMonthAnalytics.reduce((sum, data) => sum + data.shares, 0),
    totalReach: thisMonthAnalytics.reduce((sum, data) => sum + data.reach, 0),
    totalFollowerChange: thisMonthAnalytics.reduce((sum, data) => sum + (data.followerChange || 0), 0),
    totalPosts: thisMonthAnalytics.length
  };

  // 今月の平均エンゲージメント率
  const monthlyAvgEngagement = monthlyTotals.totalReach > 0 
    ? ((monthlyTotals.totalLikes + monthlyTotals.totalComments + monthlyTotals.totalShares) / monthlyTotals.totalReach * 100).toFixed(1)
    : '0.0';

  // 計画進捗計算
  const planProgress = planData 
    ? ((planData.currentFollowers + monthlyTotals.totalFollowerChange) / planData.targetFollowers * 100)
    : 0;


  return (
    <>
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

              {/* 入力モード切り替え */}
              <div className="mb-6">
                <div className="flex space-x-4 mb-4">
                  <button
                    onClick={() => setInputMode('search')}
                    className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                      inputMode === 'search'
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                    }`}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    既存投稿を選択
                  </button>
                  <button
                    onClick={() => setInputMode('manual')}
                    className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                      inputMode === 'manual'
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                    }`}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    新規投稿を入力
                  </button>
                </div>

                {/* 既存投稿選択モード */}
                {inputMode === 'search' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        投稿を検索
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            searchPosts(e.target.value);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="タイトルや内容で検索..."
                        />
                        {isSearching && (
                          <div className="absolute right-3 top-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 検索結果 */}
                    {searchResults.length > 0 && (
                      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                        {searchResults.map((post) => (
                          <div
                            key={post.id}
                            onClick={() => selectPost(post)}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{post.title || 'タイトルなし'}</div>
                            <div className="text-sm text-gray-600 truncate">{post.content}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(post.createdAt).toLocaleDateString('ja-JP')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 選択された投稿 */}
                    {selectedPost && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="font-medium text-blue-900">選択された投稿</div>
                        <div className="text-sm text-blue-700">{selectedPost.title || 'タイトルなし'}</div>
                        <div className="text-xs text-blue-600">
                          {new Date(selectedPost.createdAt).toLocaleDateString('ja-JP')}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 新規投稿入力モード */}
                {inputMode === 'manual' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          タイトル
                        </label>
                        <input
                          type="text"
                          value={newPostData.title}
                          onChange={(e) => setNewPostData(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="投稿のタイトル"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          投稿タイプ
                        </label>
                        <select
                          value={newPostData.postType}
                          onChange={(e) => setNewPostData(prev => ({ ...prev, postType: e.target.value as 'feed' | 'reel' | 'story' }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="feed">フィード</option>
                          <option value="reel">リール</option>
                          <option value="story">ストーリー</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        投稿内容
                      </label>
                      <textarea
                        value={newPostData.content}
                        onChange={(e) => setNewPostData(prev => ({ ...prev, content: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="投稿の内容を入力してください"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ハッシュタグ
                        </label>
                        <input
                          type="text"
                          value={newPostData.hashtags}
                          onChange={(e) => setNewPostData(prev => ({ ...prev, hashtags: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="#hashtag1 #hashtag2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          サムネイルURL
                        </label>
                        <input
                          type="url"
                          value={newPostData.thumbnail}
                          onChange={(e) => setNewPostData(prev => ({ ...prev, thumbnail: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        投稿日時
                      </label>
                      <input
                        type="date"
                        value={newPostData.publishedAt}
                        onChange={(e) => setNewPostData(prev => ({ ...prev, publishedAt: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
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
                  value={inputMode === 'manual' ? newPostData.publishedAt : inputData.publishedAt}
                  onChange={(e) => {
                    if (inputMode === 'manual') {
                      setNewPostData(prev => ({ ...prev, publishedAt: e.target.value }));
                    } else {
                      setInputData(prev => ({ ...prev, publishedAt: e.target.value }));
                    }
                  }}
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
                  onClick={() => {
                    setSelectedPost(null);
                    setSelectedPostId('');
                    setInputMode('search');
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
                    setNewPostData({
                      title: '',
                      content: '',
                      hashtags: '',
                      thumbnail: '',
                      postType: 'feed',
                      publishedAt: new Date().toISOString().split('T')[0]
                    });
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* 右カラム: 分析結果 */}
          <div className="space-y-6">
            
            {/* 計画内容連携 */}
            {planData ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center mr-3">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">運用計画連携</h2>
                    <p className="text-sm text-gray-600">{planData.title}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* フォロワー目標進捗 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">フォロワー目標進捗</span>
                      <span className="text-sm text-gray-600">
                        {planData.currentFollowers + monthlyTotals.totalFollowerChange} / {planData.targetFollowers.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(planProgress, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{planProgress.toFixed(1)}% 達成</span>
                      <span>残り {Math.max(0, planData.targetFollowers - (planData.currentFollowers + monthlyTotals.totalFollowerChange)).toLocaleString()}人</span>
                    </div>
                  </div>

                  {/* 今月の成果 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        {monthlyTotals.totalFollowerChange > 0 ? '+' : ''}{monthlyTotals.totalFollowerChange}
                      </div>
                      <div className="text-xs text-gray-600">今月のフォロワー増加</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">{monthlyTotals.totalPosts}</div>
                      <div className="text-xs text-gray-600">今月の投稿数</div>
                    </div>
                  </div>

                  {/* 採用戦略 */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">採用戦略</div>
                    <div className="flex flex-wrap gap-2">
                      {planData.strategies.slice(0, 3).map((strategy, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-md"
                        >
                          {strategy}
                        </span>
                      ))}
                      {planData.strategies.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                          +{planData.strategies.length - 3}個
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">運用計画がありません</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    効果的な投稿分析のためには、まず運用計画を立てることが重要です。
                  </p>
                  <button
                    onClick={() => window.location.href = '/instagram/plan'}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-md hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    運用計画を立てましょう
                  </button>
                </div>
              </div>
            )}

            {/* 今月のトータル */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg flex items-center justify-center mr-3">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">今月のトータル</h2>
                  <p className="text-sm text-gray-600">{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}の成果</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <Heart className="w-6 h-6 text-red-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{monthlyTotals.totalLikes.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">いいね総数</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{monthlyTotals.totalComments.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">コメント総数</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Share className="w-6 h-6 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{monthlyTotals.totalShares.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">シェア総数</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Eye className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{monthlyTotals.totalReach.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">リーチ総数</div>
                </div>
              </div>

              {/* 今月の平均エンゲージメント率 */}
              <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{monthlyAvgEngagement}%</div>
                  <div className="text-sm text-gray-600">今月の平均エンゲージメント率</div>
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
          posts: posts,
          planData: planData as unknown as Record<string, unknown>,
          monthlyStats: {
            totalPosts: posts.length,
            totalLikes: posts.reduce((sum, post) => sum + (post.likes || 0), 0),
            totalComments: posts.reduce((sum, post) => sum + (post.comments || 0), 0),
            totalShares: posts.reduce((sum, post) => sum + (post.shares || 0), 0),
            avgEngagement: monthlyAvgEngagement
          }
        }}
      />
    </>
  );
}
