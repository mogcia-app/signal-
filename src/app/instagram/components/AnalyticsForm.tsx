'use client';

import React from 'react';
import { Heart, MessageCircle, Share, Eye, Save, UserPlus, Users, Target } from 'lucide-react';
import { InputData } from './types';

interface AnalyticsFormProps {
  data: InputData;
  onChange: (data: InputData) => void;
  onSave: () => void;
  isLoading: boolean;
  // 検索関連のプロパティを追加
  posts: unknown[];
  selectedPostId: string;
  onPostSelect: (postId: string) => void;
}

const AnalyticsForm: React.FC<AnalyticsFormProps> = ({
  data,
  onChange,
  onSave,
  isLoading,
  posts,
  selectedPostId,
  onPostSelect
}) => {
  const handleInputChange = (field: keyof InputData, value: string) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  const handleGenderChange = (field: 'male' | 'female' | 'other', value: string) => {
    onChange({
      ...data,
      audience: {
        ...data.audience,
        gender: {
          ...data.audience.gender,
          [field]: value
        }
      }
    });
  };

  const handleAgeChange = (field: '13-17' | '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+', value: string) => {
    onChange({
      ...data,
      audience: {
        ...data.audience,
        age: {
          ...data.audience.age,
          [field]: value
        }
      }
    });
  };

  const handleSourcesChange = (field: 'posts' | 'profile' | 'explore' | 'search' | 'other', value: string) => {
    onChange({
      ...data,
      reachSource: {
        ...data.reachSource,
        sources: {
          ...data.reachSource.sources,
          [field]: value
        }
      }
    });
  };

  const handleFollowersChange = (field: 'followers' | 'nonFollowers', value: string) => {
    onChange({
      ...data,
      reachSource: {
        ...data.reachSource,
        followers: {
          ...data.reachSource.followers,
          [field]: value
        }
      }
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">分析データ入力</h2>
        <p className="text-sm text-gray-600">投稿のパフォーマンスデータを入力してください</p>
      </div>

      <div className="space-y-6">
        {/* 投稿検索 */}
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">投稿検索</h3>
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="タイトル、内容、ハッシュタグで検索..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
              <span>検索</span>
            </button>
          </div>
        </div>

        {/* 投稿情報手動入力 */}
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">投稿情報（手動入力）</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                タイトル
              </label>
              <input
                type="text"
                value={data.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="投稿のタイトルを入力"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                内容
              </label>
              <textarea
                value={data.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="投稿の内容を入力"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ハッシュタグ
              </label>
              <input
                type="text"
                value={data.hashtags}
                onChange={(e) => handleInputChange('hashtags', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="#hashtag1 #hashtag2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                カテゴリ
              </label>
              <select
                value={data.category}
                onChange={(e) => handleInputChange('category', e.target.value as 'reel' | 'feed' | 'story')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="feed">フィード</option>
                <option value="reel">リール</option>
                <option value="story">ストーリー</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                サムネイル画像
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // ファイルサイズチェック（2MB制限）
                      if (file.size > 2 * 1024 * 1024) {
                        alert('画像ファイルは2MB以下にしてください。');
                        return;
                      }
                      
                      // 画像を圧縮してBase64に変換
                      const canvas = document.createElement('canvas');
                      const ctx = canvas.getContext('2d');
                      const img = new Image();
                      
                      img.onload = () => {
                        // 最大サイズを200x200に制限
                        const maxSize = 200;
                        let { width, height } = img;
                        
                        if (width > height) {
                          if (width > maxSize) {
                            height = (height * maxSize) / width;
                            width = maxSize;
                          }
                        } else {
                          if (height > maxSize) {
                            width = (width * maxSize) / height;
                            height = maxSize;
                          }
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        
                        // 画像を描画
                        ctx?.drawImage(img, 0, 0, width, height);
                        
                        // JPEG形式で圧縮（品質70%）
                        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                        handleInputChange('thumbnail', compressedDataUrl);
                      };
                      
                      img.src = URL.createObjectURL(file);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {data.thumbnail && (
                  <div className="mt-2">
                    <img 
                      src={data.thumbnail} 
                      alt="サムネイルプレビュー" 
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 投稿日時情報 */}
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">投稿日時</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                投稿日
              </label>
              <input
                type="date"
                value={data.publishedAt}
                onChange={(e) => handleInputChange('publishedAt', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                投稿時間
              </label>
              <input
                type="time"
                value={data.publishedTime}
                onChange={(e) => handleInputChange('publishedTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* 基本メトリクス */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="flex text-sm font-medium text-gray-700 mb-2 items-center">
              <Heart className="w-4 h-4 mr-2 text-red-500" />
              いいね数
            </label>
            <input
              type="number"
              min="0"
              value={data.likes}
              onChange={(e) => handleInputChange('likes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
          <div>
            <label className="flex text-sm font-medium text-gray-700 mb-2 items-center">
              <MessageCircle className="w-4 h-4 mr-2 text-blue-500" />
              コメント数
            </label>
            <input
              type="number"
              min="0"
              value={data.comments}
              onChange={(e) => handleInputChange('comments', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
          <div>
            <label className="flex text-sm font-medium text-gray-700 mb-2 items-center">
              <Share className="w-4 h-4 mr-2 text-green-500" />
              シェア数
            </label>
            <input
              type="number"
              min="0"
              value={data.shares}
              onChange={(e) => handleInputChange('shares', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
          <div>
            <label className="flex text-sm font-medium text-gray-700 mb-2 items-center">
              <Eye className="w-4 h-4 mr-2 text-purple-500" />
              閲覧数
            </label>
            <input
              type="number"
              min="0"
              value={data.reach}
              onChange={(e) => handleInputChange('reach', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
          <div>
            <label className="flex text-sm font-medium text-gray-700 mb-2 items-center">
              <Save className="w-4 h-4 mr-2 text-yellow-500" />
              保存数
            </label>
            <input
              type="number"
              min="0"
              value={data.saves}
              onChange={(e) => handleInputChange('saves', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
          <div>
            <label className="flex text-sm font-medium text-gray-700 mb-2 items-center">
              <UserPlus className="w-4 h-4 mr-2 text-indigo-500" />
              フォロワー増加数
            </label>
            <input
              type="number"
              value={data.followerIncrease}
              onChange={(e) => handleInputChange('followerIncrease', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
        </div>

        {/* オーディエンス分析 */}
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center mr-3">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">オーディエンス分析</h3>
              <p className="text-xs text-gray-600">フォロワーの性別・年齢分布を入力してください</p>
            </div>
          </div>

          {/* 性別分析 */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">性別分析</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  👨 男性 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={data.audience.gender.male}
                  onChange={(e) => handleGenderChange('male', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  👩 女性 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={data.audience.gender.female}
                  onChange={(e) => handleGenderChange('female', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  🏳️‍🌈 その他 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={data.audience.gender.other}
                  onChange={(e) => handleGenderChange('other', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* 年齢層分析 */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-2">年齢層分析</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  13-17歳 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={data.audience.age['13-17']}
                  onChange={(e) => handleAgeChange('13-17', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  18-24歳 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={data.audience.age['18-24']}
                  onChange={(e) => handleAgeChange('18-24', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  25-34歳 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={data.audience.age['25-34']}
                  onChange={(e) => handleAgeChange('25-34', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  35-44歳 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={data.audience.age['35-44']}
                  onChange={(e) => handleAgeChange('35-44', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  45-54歳 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={data.audience.age['45-54']}
                  onChange={(e) => handleAgeChange('45-54', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  55-64歳 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={data.audience.age['55-64']}
                  onChange={(e) => handleAgeChange('55-64', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  65歳以上 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={data.audience.age['65+']}
                  onChange={(e) => handleAgeChange('65+', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 閲覧数ソース分析 */}
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center mr-3">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">閲覧数ソース分析</h3>
              <p className="text-xs text-gray-600">閲覧数の流入元とフォロワー構成を入力してください</p>
            </div>
          </div>

          {/* 閲覧数ソース */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">閲覧数ソース</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  📱 投稿 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={data.reachSource.sources.posts}
                  onChange={(e) => handleSourcesChange('posts', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  👤 プロフィール (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={data.reachSource.sources.profile}
                  onChange={(e) => handleSourcesChange('profile', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  🔍 検索 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={data.reachSource.sources.search}
                  onChange={(e) => handleSourcesChange('search', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  🌟 探索 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={data.reachSource.sources.explore}
                  onChange={(e) => handleSourcesChange('explore', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  🔗 その他 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={data.reachSource.sources.other}
                  onChange={(e) => handleSourcesChange('other', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* フォロワー構成 */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-2">フォロワー構成</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  👥 フォロワー内 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={data.reachSource.followers.followers}
                  onChange={(e) => handleFollowersChange('followers', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  🌐 フォロワー外 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={data.reachSource.followers.nonFollowers}
                  onChange={(e) => handleFollowersChange('nonFollowers', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 保存ボタン */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={onSave}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>保存中...</span>
              </>
            ) : (
              <span>分析データを保存</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsForm;
