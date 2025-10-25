'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Heart, MessageCircle, Share, Save, ThumbsUp, ThumbsDown, Edit3 } from 'lucide-react';
import { InputData } from './types';

interface FeedAnalyticsFormProps {
  data: InputData;
  onChange: (data: InputData) => void;
  onSave: (sentimentData?: { sentiment: 'satisfied' | 'dissatisfied' | null; memo: string }) => void;
  isLoading: boolean;
  postData?: {
    id: string;
    title: string;
    content: string;
    hashtags: string[];
    postType: 'feed' | 'reel' | 'story';
  } | null;
}

const FeedAnalyticsForm: React.FC<FeedAnalyticsFormProps> = ({
  data,
  onChange,
  onSave,
  isLoading,
  postData
}) => {
  const [sentiment, setSentiment] = useState<'satisfied' | 'dissatisfied' | null>(null);
  const [memo, setMemo] = useState('');
  const [isEditingMemo, setIsEditingMemo] = useState(false);

  const handleInputChange = (field: keyof InputData, value: string) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  const handleSave = () => {
    onSave({ sentiment, memo });
  };

  return (
    <div className="bg-white shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
            <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
            フィード分析データ入力
          </h2>
        <p className="text-sm text-gray-600">フィード投稿のパフォーマンスデータを入力してください</p>
      </div>

      <div className="space-y-4">
        {/* 投稿情報 */}
        <div className="p-4 bg-gray-50 space-y-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            投稿情報
          </h3>
          
          {postData ? (
            /* 投稿データが渡された場合：読み取り専用表示 */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  タイトル
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-800">
                  {postData.title || 'タイトルなし'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  内容
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-800 min-h-[80px] whitespace-pre-wrap">
                  {postData.content || '内容なし'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ハッシュタグ
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-800">
                  {postData.hashtags && postData.hashtags.length > 0 
                    ? postData.hashtags.join(' ') 
                    : 'ハッシュタグなし'
                  }
                </div>
              </div>
            </div>
          ) : (
            /* 投稿データがない場合：手動入力 */
            <div className="space-y-4">
              <div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    タイトル
                  </label>
                  <input
                    type="text"
                    value={data.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
                    placeholder="フィード投稿のタイトルを入力"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    内容
                  </label>
                  <textarea
                    value={data.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
                    rows={3}
                    placeholder="フィード投稿の内容を入力"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    ハッシュタグ
                  </label>
                  <input
                    type="text"
                    value={data.hashtags}
                    onChange={(e) => handleInputChange('hashtags', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
                    placeholder="#hashtag1 #hashtag2"
                  />
                </div>
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
                        ctx?.drawImage(img, 0, 0, width, height);
                        
                        const base64 = canvas.toDataURL('image/jpeg', 0.8);
                        handleInputChange('thumbnail', base64);
                      };
                      
                      img.src = URL.createObjectURL(file);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              {data.thumbnail && (
                <div className="mt-2">
                  <Image
                    src={data.thumbnail}
                    alt="サムネイル"
                    width={100}
                    height={100}
                    className="rounded-lg object-cover"
                  />
                </div>
              )}
              </div>
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  投稿日
                </label>
                <input
                  type="date"
                  value={data.publishedAt}
                  onChange={(e) => handleInputChange('publishedAt', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
                />
              </div>
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  投稿時間
                </label>
                <input
                  type="time"
                  value={data.publishedTime}
                  onChange={(e) => handleInputChange('publishedTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* フィード反応データ */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
            <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
            フィード反応データ
          </h3>
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
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0"
            />
          </div>
          <div>
            <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
              <Share className="w-4 h-4 mr-2 text-orange-500" />
              リポスト数
            </label>
            <input
              type="number"
              min="0"
              value={data.reposts}
              onChange={(e) => handleInputChange('reposts', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0"
            />
          </div>
          <div>
            <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
              <Save className="w-4 h-4 mr-2 text-indigo-500" />
              保存数
            </label>
            <input
              type="number"
              min="0"
              value={data.saves}
              onChange={(e) => handleInputChange('saves', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0"
            />
          </div>
          </div>
        </div>

        {/* 概要 */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
            <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
            概要
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    閲覧数
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={data.reach}
                    onChange={(e) => handleInputChange('reach', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="閲覧数"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    フォロワー%
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={data.reachFollowerPercent || ''}
                    onChange={(e) => handleInputChange('reachFollowerPercent', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="フォロワー%"
                  />
                </div>
              </div>
            </div>
            <div>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    インタラクション数
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={data.interactionCount || ''}
                    onChange={(e) => handleInputChange('interactionCount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="インタラクション数"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    フォロワー%
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={data.interactionFollowerPercent || ''}
                    onChange={(e) => handleInputChange('interactionFollowerPercent', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="フォロワー%"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 閲覧上位ソース */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
            <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
            閲覧上位ソース
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                プロフィール
              </label>
              <input
                type="number"
                min="0"
                value={data.reachSourceProfile || ''}
                onChange={(e) => handleInputChange('reachSourceProfile', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                フィード
              </label>
              <input
                type="number"
                min="0"
                value={data.reachSourceFeed || ''}
                onChange={(e) => handleInputChange('reachSourceFeed', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                発見
              </label>
              <input
                type="number"
                min="0"
                value={data.reachSourceExplore || ''}
                onChange={(e) => handleInputChange('reachSourceExplore', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                検索
              </label>
              <input
                type="number"
                min="0"
                value={data.reachSourceSearch || ''}
                onChange={(e) => handleInputChange('reachSourceSearch', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                その他
              </label>
              <input
                type="number"
                min="0"
                value={data.reachSourceOther || ''}
                onChange={(e) => handleInputChange('reachSourceOther', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* リーチしたアカウント */}
        <div className="p-4 border-t border-gray-200">
       
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                リーチしたアカウント数
              </label>
              <input
                type="number"
                min="0"
                value={data.reachedAccounts || ''}
                onChange={(e) => handleInputChange('reachedAccounts', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* プロフィールのアクティビティ */}
        <div className="p-4 border-t border-gray-200">
        
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                プロフィールアクセス数
              </label>
              <input
                type="number"
                min="0"
                value={data.profileVisits || ''}
                onChange={(e) => handleInputChange('profileVisits', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                フォロー数
              </label>
              <input
                type="number"
                min="0"
                value={data.profileFollows || ''}
                onChange={(e) => handleInputChange('profileFollows', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* 満足度フィードバック */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
            <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
            満足度フィードバック
          </h3>
          <div className="space-y-4">
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setSentiment('satisfied')}
                className={`flex items-center px-4 py-2 rounded-md border ${
                  sentiment === 'satisfied'
                    ? 'bg-green-100 border-green-500 text-green-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                満足
              </button>
              <button
                type="button"
                onClick={() => setSentiment('dissatisfied')}
                className={`flex items-center px-4 py-2 rounded-md border ${
                  sentiment === 'dissatisfied'
                    ? 'bg-red-100 border-red-500 text-red-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                不満足
              </button>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">メモ</label>
                <button
                  type="button"
                  onClick={() => setIsEditingMemo(!isEditingMemo)}
                  className="text-sm text-[#ff8a15] hover:text-[#e6760f] flex items-center"
                >
                  <Edit3 className="w-3 h-3 mr-1" />
                  {isEditingMemo ? '完了' : '編集'}
                </button>
              </div>
              {isEditingMemo ? (
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  rows={3}
                  placeholder="フィード投稿についてのメモを入力..."
                />
              ) : (
                <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-600 min-h-[80px]">
                  {memo || 'メモがありません'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 保存ボタン */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-2 bg-[#ff8a15] text-white hover:bg-[#e6760f] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                保存中...
              </>
            ) : (
              'フィード分析データを保存'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedAnalyticsForm;
