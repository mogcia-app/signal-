'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Heart, MessageCircle, Share, Eye, Save, UserPlus, ThumbsUp, ThumbsDown, Edit3 } from 'lucide-react';
import { InputData } from './types';

interface AnalyticsFormProps {
  data: InputData;
  onChange: (data: InputData) => void;
  onSave: (sentimentData?: { sentiment: 'satisfied' | 'dissatisfied' | null; memo: string }) => void;
  isLoading: boolean;
}

const AnalyticsForm: React.FC<AnalyticsFormProps> = ({
  data,
  onChange,
  onSave,
  isLoading
}) => {
  const [sentiment, setSentiment] = useState<'satisfied' | 'dissatisfied' | null>(null);
  const [memo, setMemo] = useState('');
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  // const [showAudienceAnalysis, setShowAudienceAnalysis] = useState(false);
  // const [showReachSourceAnalysis, setShowReachSourceAnalysis] = useState(false);
  const handleInputChange = (field: keyof InputData, value: string) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  // const handleGenderChange = (field: 'male' | 'female' | 'other', value: string) => {
  //   onChange({
  //     ...data,
  //     audience: {
  //       ...data.audience,
  //       gender: {
  //         ...data.audience.gender,
  //         [field]: value
  //       }
  //     }
  //   });
  // };

  // const handleAgeChange = (field: '13-17' | '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+', value: string) => {
  //   onChange({
  //     ...data,
  //     audience: {
  //       ...data.audience,
  //       age: {
  //         ...data.audience.age,
  //         [field]: value
  //       }
  //     }
  //   });
  // };

  // const handleSourcesChange = (field: 'posts' | 'profile' | 'explore' | 'search' | 'other', value: string) => {
  //   onChange({
  //     ...data,
  //     reachSource: {
  //       ...data.reachSource,
  //       sources: {
  //         ...data.reachSource.sources,
  //         [field]: value
  //       }
  //     }
  //   });
  // };

  const handleSentimentClick = (selectedSentiment: 'satisfied' | 'dissatisfied') => {
    setSentiment(selectedSentiment);
  };

  const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMemo(e.target.value);
  };

  const handleSaveMemo = () => {
    setIsEditingMemo(false);
  };

  // const handleFollowersChange = (field: 'followers' | 'nonFollowers', value: string) => {
  //   onChange({
  //     ...data,
  //     reachSource: {
  //       ...data.reachSource,
  //       followers: {
  //         ...data.reachSource.followers,
  //         [field]: value
  //       }
  //     }
  //   });
  // };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="mb-3 pb-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-black">分析データ入力</h2>
        <p className="text-sm text-black">投稿のパフォーマンスデータを入力してください</p>
      </div>

      <div className="space-y-4">
        {/* 投稿情報手動入力 */}
        <div className="p-4 bg-white rounded-lg space-y-4">
          
          <div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                タイトル
              </label>
              <input
                type="text"
                value={data.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15]"
                placeholder="投稿のタイトルを入力"
              />
            </div>
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                内容
              </label>
              <textarea
                value={data.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15]"
                rows={3}
                placeholder="投稿の内容を入力"
              />
            </div>
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                ハッシュタグ
              </label>
              <input
                type="text"
                value={data.hashtags}
                onChange={(e) => handleInputChange('hashtags', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15]"
                placeholder="#hashtag1 #hashtag2"
              />
            </div>
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                カテゴリ
              </label>
              <select
                value={data.category}
                onChange={(e) => handleInputChange('category', e.target.value as 'reel' | 'feed' | 'story')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15]"
              >
                <option value="feed">フィード</option>
                <option value="reel">リール</option>
                <option value="story">ストーリー</option>
              </select>
            </div>
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">
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
                      const img = new window.Image();
                      
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15]"
                />
                {data.thumbnail && (
                  <div className="mt-2">
                    <Image 
                      src={data.thumbnail} 
                      alt="サムネイルプレビュー" 
                      width={80}
                      height={80}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 投稿日時情報 */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">投稿日時</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                投稿日
              </label>
              <input
                type="date"
                value={data.publishedAt}
                onChange={(e) => handleInputChange('publishedAt', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                投稿時間
              </label>
              <input
                type="time"
                value={data.publishedTime}
                onChange={(e) => handleInputChange('publishedTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15]"
              />
            </div>
          </div>
        </div>

        {/* 基本メトリクス */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">基本分析</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
              <Heart className="w-4 h-4 mr-2 text-red-500" />
              いいね数
            </label>
            <input
              type="number"
              min="0"
              value={data.likes}
              onChange={(e) => handleInputChange('likes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15]"
              placeholder="0"
            />
          </div>
          <div>
            <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
              <MessageCircle className="w-4 h-4 mr-2 text-blue-500" />
              コメント数
            </label>
            <input
              type="number"
              min="0"
              value={data.comments}
              onChange={(e) => handleInputChange('comments', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15]"
              placeholder="0"
            />
          </div>
          <div>
            <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
              <Share className="w-4 h-4 mr-2 text-green-500" />
              シェア数
            </label>
            <input
              type="number"
              min="0"
              value={data.shares}
              onChange={(e) => handleInputChange('shares', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15]"
              placeholder="0"
            />
          </div>
          <div>
            <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
              <Eye className="w-4 h-4 mr-2 text-purple-500" />
              閲覧数
            </label>
            <input
              type="number"
              min="0"
              value={data.reach}
              onChange={(e) => handleInputChange('reach', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15]"
              placeholder="0"
            />
          </div>
          <div>
            <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
              <Save className="w-4 h-4 mr-2 text-yellow-500" />
              保存数
            </label>
            <input
              type="number"
              min="0"
              value={data.saves}
              onChange={(e) => handleInputChange('saves', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15]"
              placeholder="0"
            />
          </div>
          <div>
            <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
              <UserPlus className="w-4 h-4 mr-2 text-indigo-500" />
              フォロワー増加数
            </label>
            <input
              type="number"
              value={data.followerIncrease}
              onChange={(e) => handleInputChange('followerIncrease', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15]"
              placeholder="0"
            />
          </div>
        </div>
      </div>



        {/* 感情分析セクション */}
        <div className="p-4 border-t border-gray-200">
          <div className="mb-3">
            <div className="flex items-center mb-2">
              <Heart className="h-5 w-5 text-pink-600 mr-2" />
              <h3 className="text-lg font-semibold text-black">分析結果の感想</h3>
            </div>
            
            <div className="space-y-4">
              {/* 感情選択 */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">この分析結果に満足していますか？</p>
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleSentimentClick('satisfied')}
                    className={`flex items-center px-4 py-2 rounded-lg border-2 transition-all ${
                      sentiment === 'satisfied'
                        ? 'border-[#ff8a15] bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                    }`}
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">満足</span>
                  </button>
                  
                  <button
                    onClick={() => handleSentimentClick('dissatisfied')}
                    className={`flex items-center px-4 py-2 rounded-lg border-2 transition-all ${
                      sentiment === 'dissatisfied'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
                    }`}
                  >
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">不満</span>
                  </button>
                </div>
              </div>

              {/* メモ入力 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-700">改善点や気づき</p>
                  {!isEditingMemo && memo && (
                    <button
                      onClick={() => setIsEditingMemo(true)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {isEditingMemo ? (
                  <div className="space-y-2">
                    <textarea
                      value={memo}
                      onChange={handleMemoChange}
                      placeholder="改善点や気づいたことをメモしてください..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      rows={3}
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setIsEditingMemo(false)}
                        className="px-3 py-1 text-sm text-black hover:text-gray-800"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={handleSaveMemo}
                        className="flex items-center px-3 py-1 text-sm bg-[#ff8a15] text-white rounded hover:bg-orange-600"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingMemo(true)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      memo 
                        ? 'border-gray-300 bg-gray-50 hover:bg-gray-100' 
                        : 'border-dashed border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {memo ? (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{memo}</p>
                    ) : (
                      <p className="text-sm text-black">改善点や気づいたことをメモしてください...</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 保存ボタン */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => onSave({ sentiment, memo })}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-[#ff8a15] text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
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
