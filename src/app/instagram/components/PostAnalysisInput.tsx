'use client';

import { useState } from 'react';
import { Edit3 } from 'lucide-react';
import { postsApi } from '../../../lib/api';
import { useAuth } from '../../../contexts/auth-context';

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

interface PostAnalysisInputProps {
  onDataSaved: () => void;
}

export default function PostAnalysisInput({ onDataSaved }: PostAnalysisInputProps) {
  const { user } = useAuth();
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

  // 投稿検索・選択用のstate
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PostData[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // 入力モードの管理
  const [inputMode, setInputMode] = useState<'search' | 'manual'>('search');
  
  // 新規投稿用のstate
  const [newPostData, setNewPostData] = useState({
    title: '',
    content: '',
    hashtags: '',
    thumbnail: '',
    publishedAt: new Date().toISOString().split('T')[0] // YYYY-MM-DD形式
  });

  // 投稿検索機能
  const searchPosts = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    if (!user?.uid) {
      console.error('User not authenticated');
      return;
    }

    setIsSearching(true);
    try {
      const response = await postsApi.list({ userId: user.uid });
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
    setManualPostData({
      title: post.title,
      type: post.postType,
      content: post.content,
      hashtags: post.hashtags.join(' '),
      thumbnail: post.imageUrl || '',
      likes: post.analytics?.likes || 0,
      comments: post.analytics?.comments || 0,
      saves: post.analytics?.shares || 0,
      reach: post.analytics?.reach || 0
    });
    setSearchResults([]);
    setSearchQuery('');
  };

  // 投稿分析データの保存
  const handleManualPostSubmit = async () => {
    if (!user?.uid) {
      console.error('User not authenticated');
      alert('ログインが必要です');
      return;
    }

    try {
      const analyticsData = {
        likes: manualPostData.likes,
        comments: manualPostData.comments,
        shares: manualPostData.saves,
        reach: manualPostData.reach,
        engagementRate: ((manualPostData.likes + manualPostData.comments + manualPostData.saves) / manualPostData.reach * 100) || 0,
        publishedAt: inputMode === 'search' && selectedPost ? 
          new Date(selectedPost.createdAt) : 
          new Date(newPostData.publishedAt)
      };

      if (inputMode === 'search' && selectedPost) {
        // 既存投稿のanalyticsデータを更新
        await postsApi.update(selectedPost.id, { analytics: analyticsData });
      } else {
        // 新規投稿を作成してanalyticsデータを設定
        const postData = {
          userId: user.uid,
          title: newPostData.title,
          content: newPostData.content,
          hashtags: newPostData.hashtags.split(' ').filter(tag => tag.trim()),
          postType: manualPostData.type,
          status: 'published' as const,
          imageUrl: newPostData.thumbnail || null,
          analytics: analyticsData
        };
        await postsApi.create(postData);
      }

      // ダッシュボードの統計を再取得
      onDataSaved();

      alert('投稿の分析データを保存しました！');
      
      // フォームをリセット
      setSelectedPost(null);
      setInputMode('search');
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
      setNewPostData({
        title: '',
        content: '',
        hashtags: '',
        thumbnail: '',
        publishedAt: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('投稿分析データ保存エラー:', error);
      alert('保存に失敗しました');
    }
  };

  return (
    <div className="bg-white mb-8">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <Edit3 className="h-6 w-6 mr-2 text-orange-600" />
          投稿分析入力
        </h2>
      </div>
      <div className="p-6">
        {/* 入力モード切り替え */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setInputMode('search')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                inputMode === 'search'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              既存投稿を選択
            </button>
            <button
              onClick={() => setInputMode('manual')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                inputMode === 'manual'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              新規投稿を入力
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 既存投稿検索モード */}
          {inputMode === 'search' && (
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">投稿を検索・選択</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchPosts(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="投稿のタイトルや内容で検索..."
                />
                {isSearching && (
                  <div className="absolute right-3 top-2.5">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                  </div>
                )}
              </div>
            
              {/* 検索結果 */}
              {searchResults.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-md bg-white shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => selectPost(post)}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{post.title}</div>
                          <div className="text-sm text-gray-500 truncate">{post.content}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {post.postType === 'reel' ? 'リール' : post.postType === 'feed' ? 'フィード' : 'ストーリー'} • 
                            {new Date(post.createdAt).toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                        <div className="text-right">
                          {post.analytics ? (
                            <div className="text-sm text-green-600">分析済み</div>
                          ) : (
                            <div className="text-sm text-orange-600">未分析</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* 選択された投稿 */}
              {selectedPost && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-orange-900">選択中: {selectedPost.title}</div>
                      <div className="text-sm text-orange-700">
                        {selectedPost.postType === 'reel' ? 'リール' : selectedPost.postType === 'feed' ? 'フィード' : 'ストーリー'} • 
                        {new Date(selectedPost.createdAt).toLocaleDateString('ja-JP')}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPost(null);
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
                      }}
                      className="text-orange-600 hover:text-orange-800 text-sm"
                    >
                      選択解除
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 新規投稿入力モード */}
          {inputMode === 'manual' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">投稿タイトル</label>
                <input
                  type="text"
                  value={newPostData.title}
                  onChange={(e) => setNewPostData({...newPostData, title: e.target.value})}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">投稿日時</label>
                <input
                  type="date"
                  value={newPostData.publishedAt}
                  onChange={(e) => setNewPostData({...newPostData, publishedAt: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">投稿文</label>
                <textarea
                  value={newPostData.content}
                  onChange={(e) => setNewPostData({...newPostData, content: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="投稿の内容を入力"
                  rows={3}
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">ハッシュタグ</label>
                <input
                  type="text"
                  value={newPostData.hashtags}
                  onChange={(e) => setNewPostData({...newPostData, hashtags: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="#hashtag1 #hashtag2 #hashtag3"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">サムネイル画像</label>
                <input
                  type="text"
                  value={newPostData.thumbnail}
                  onChange={(e) => setNewPostData({...newPostData, thumbnail: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="画像URLを入力"
                />
              </div>
            </>
          )}

          {/* 共通のKPI入力フィールド */}
          <div className="md:col-span-2 lg:col-span-3">
            <h3 className="text-lg font-medium text-gray-900 mb-4">分析結果のKPI</h3>
          </div>

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

        <div className="mt-6">
          <button
            onClick={handleManualPostSubmit}
            className="w-full bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
          >
            投稿結果を保存
          </button>
        </div>
      </div>
    </div>
  );
}
