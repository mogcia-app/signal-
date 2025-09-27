'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { AIChatWidget } from '../../../components/ai-chat-widget';
import { AuthGuard } from '../../../components/auth-guard';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/auth-context';
import { 
  BarChart3,
  Heart,
  Save,
  Calendar,
  RefreshCw,
  Search,
  Image,
  Hash,
  FileText,
  Upload,
  Video,
  Camera,
  Bookmark,
  Users
} from 'lucide-react';

// 投稿分析データの型定義
interface AnalyticsData {
  id: string;
  userId: string;
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
    category: 'feed' as 'reel' | 'feed' | 'story'
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // 分析データを取得（直接Firestoreアクセス）
  const fetchAnalytics = useCallback(async () => {
    console.log('Fetch analytics called, user:', user);
    console.log('User UID:', user?.uid);
    if (!user?.uid) {
      console.log('User not authenticated, skipping analytics fetch');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Fetching analytics directly from Firestore for user:', user.uid);
      const q = query(
        collection(db, 'analytics'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AnalyticsData[];
      
      // クライアント側でソート（インデックス不要）
      data.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      console.log('Direct Firestore fetch result:', data);
      console.log('Analytics data length:', data.length);
      console.log('Sample analytics data:', data[0]);
      console.log('All analytics data:', data.map(item => ({
        id: item.id,
        likes: item.likes,
        userId: item.userId,
        publishedAt: item.publishedAt
      })));
      setAnalyticsData(data);
    } catch (error) {
      console.error('Analytics fetch error:', error);
      // ネットワークエラーの場合は空配列を設定
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      setAnalyticsData([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

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
  }, [user?.uid]);

  useEffect(() => {
    fetchAnalytics();
    fetchPosts();
  }, [fetchAnalytics, fetchPosts]);

  // 投稿を選択
  const handleSelectPost = (post: PostData) => {
    setSelectedPost(post);
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
      setSelectedFile(file);
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

  // 投稿分析データを保存（直接Firestoreアクセス）
  const handleSaveAnalytics = async () => {
    if (!user?.uid) {
      alert('ログインが必要です');
      return;
    }

    if (!inputData.likes) {
      alert('いいね数を入力してください');
      return;
    }

    setIsLoading(true);
    try {
      const likes = parseInt(inputData.likes) || 0;
      const comments = parseInt(inputData.comments) || 0;
      const shares = parseInt(inputData.shares) || 0;
      const reach = parseInt(inputData.reach) || 0;
      const saves = parseInt(inputData.saves) || 0;
      const followerIncrease = parseInt(inputData.followerIncrease) || 0;
      
      // エンゲージメント率の計算（保存数も含める）
      const engagementRate = reach > 0 ? ((likes + comments + shares + saves) / reach * 100).toFixed(2) : "0";

      const analyticsPayload = {
        userId: user.uid,
        likes,
        comments,
        shares,
        reach,
        saves,
        followerIncrease,
        engagementRate: parseFloat(engagementRate),
        publishedAt: new Date(`${inputData.publishedAt}T${inputData.publishedTime}:00`),
        createdAt: new Date(),
        // 投稿情報
        title: inputData.title,
        content: inputData.content,
        hashtags: inputData.hashtags.split(',').map(tag => tag.trim()).filter(tag => tag),
        thumbnail: inputData.thumbnail,
        category: inputData.category
      };

      console.log('Saving analytics data directly to Firestore:', analyticsPayload);
      console.log('User UID:', user.uid);
      console.log('Analytics payload validation:', {
        userId: analyticsPayload.userId,
        likes: analyticsPayload.likes,
        comments: analyticsPayload.comments,
        shares: analyticsPayload.shares,
        reach: analyticsPayload.reach,
        engagementRate: analyticsPayload.engagementRate,
        publishedAt: analyticsPayload.publishedAt,
        createdAt: analyticsPayload.createdAt
      });
      const docRef = await addDoc(collection(db, 'analytics'), analyticsPayload);
      console.log('Analytics saved with ID:', docRef.id);

      alert('投稿分析データを保存しました！');
      
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
        category: 'feed'
      });
      setSelectedPost(null);
      setSelectedFile(null);
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
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-20 h-20 object-cover rounded-md border"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
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
                    いいね数
                  </label>
                  <input
                    type="number"
                    value={inputData.likes}
                    onChange={(e) => setInputData(prev => ({ ...prev, likes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    placeholder="例: 245"
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
                    👁️ リーチ数
                  </label>
                  <input
                    type="number"
                    value={inputData.reach}
                    onChange={(e) => setInputData(prev => ({ ...prev, reach: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    placeholder="例: 1200"
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
                      category: 'feed'
                    });
                    setSelectedPost(null);
                    setSelectedFile(null);
                    setPreviewUrl('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            {/* 右カラム: 統計表示 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">投稿分析統計</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-xl font-bold text-red-600">{totalLikes.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">総いいね数</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">{totalComments.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">総コメント数</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">{totalShares.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">総シェア数</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600">{totalReach.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">総リーチ数</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-xl font-bold text-yellow-600">{totalSaves.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">総保存数</div>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <div className="text-xl font-bold text-emerald-600">{totalFollowerIncrease.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">総フォロワー増加数</div>
                </div>
              </div>
              <div className="mt-4 text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-xl font-bold text-gray-900">{(avgEngagementRate || 0).toFixed(2)}%</div>
                <div className="text-sm text-gray-600">平均エンゲージメント率</div>
              </div>
            </div>
          </div>

          {/* 最近の記録 - 全幅 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">最近の記録</h3>
            {analyticsData.length === 0 ? (
              <p className="text-gray-600 text-center">まだ記録がありません。</p>
            ) : (
              <div className="space-y-3">
                {analyticsData.slice(0, 5).map((data, index) => {
                  if (!data || !data.id) return null;
                  return (
                  <div key={`analytics-${data.id}-${index}`} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-700 font-medium">
                        {new Date(data.publishedAt).toLocaleDateString('ja-JP')} {new Date(data.publishedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-sm text-gray-500">
                        エンゲージメント率: {(data.engagementRate || 0).toFixed(2)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-red-600 font-semibold">{data.likes || 0}</div>
                        <div className="text-gray-500">いいね</div>
                      </div>
                      <div className="text-center">
                        <div className="text-blue-600 font-semibold">{data.comments || 0}</div>
                        <div className="text-gray-500">コメント</div>
                      </div>
                      <div className="text-center">
                        <div className="text-green-600 font-semibold">{data.shares || 0}</div>
                        <div className="text-gray-500">シェア</div>
                      </div>
                      <div className="text-center">
                        <div className="text-purple-600 font-semibold">{data.reach || 0}</div>
                        <div className="text-gray-500">リーチ</div>
                      </div>
                      <div className="text-center">
                        <div className="text-yellow-600 font-semibold">{data.saves || 0}</div>
                        <div className="text-gray-500">保存</div>
                      </div>
                      <div className="text-center">
                        <div className="text-emerald-600 font-semibold">{data.followerIncrease || 0}</div>
                        <div className="text-gray-500">フォロワー増加</div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
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