'use client';

import React, { useState } from 'react';
import { Save, RefreshCw, CheckCircle, AlertCircle, Upload, X } from 'lucide-react';
import { postsApi } from '../../../../lib/api';
import Image from 'next/image';

interface PostEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  hashtags: string[];
  onHashtagsChange: (hashtags: string[]) => void;
  postType?: 'feed' | 'reel' | 'story';
  onPostTypeChange?: (type: 'feed' | 'reel' | 'story') => void;
  title?: string;
  onTitleChange?: (title: string) => void;
  image?: string | null;
  onImageChange?: (image: string | null) => void;
}

export const PostEditor: React.FC<PostEditorProps> = ({
  content,
  onContentChange,
  hashtags,
  onHashtagsChange,
  postType = 'feed',
  onPostTypeChange,
  title = '',
  onTitleChange,
  image = null,
  onImageChange
}) => {
  const [savedPosts, setSavedPosts] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // AI投稿チェック機能の状態
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    score: number;
    suggestions: string[];
    hashtagSuggestions: string[];
    engagementPrediction: number;
  } | null>(null);

  const characterCount = content.length;
  const maxCharacters = 2200;
  const isOverLimit = characterCount > maxCharacters;

  const handleSave = async () => {
    if (!content.trim()) {
      alert('投稿文を入力してください');
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      alert('投稿日時を設定してください');
      return;
    }

    setIsSaving(true);
    try {
      const postData = {
        userId: 'current-user', // 実際のアプリでは認証済みユーザーIDを使用
        title: title || '',
        content,
        hashtags: hashtags,
        postType,
        scheduledDate,
        scheduledTime,
        status: 'draft' as const,
        imageData: image, // Base64データを一時保存
      };

      const result = await postsApi.create(postData);
      console.log('投稿を保存しました:', result);
      
      // ローカル保存リストにも追加
      setSavedPosts(prev => [...prev, content]);
      
      alert('投稿が保存されました！');
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました。もう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = (savedContent: string) => {
    onContentChange(savedContent);
  };

  const handleClear = () => {
    onContentChange('');
    onHashtagsChange([]);
    setScheduledDate('');
    setScheduledTime('');
    setCheckResult(null);
    onImageChange?.(null);
  };

  // 画像アップロード処理
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（5MB制限）
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズが大きすぎます。5MB以下のファイルを選択してください。');
      return;
    }

    // 画像ファイルチェック
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください。');
      return;
    }

    setIsUploading(true);
    try {
      // 実際のアプリではここでファイルをサーバーにアップロード
      // 今回はローカルでプレビュー用のDataURLを作成
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onImageChange?.(result);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      alert('画像のアップロードに失敗しました。');
      setIsUploading(false);
    }
  };

  // 画像削除
  const handleImageRemove = () => {
    onImageChange?.(null);
  };

  const handleHashtagRemove = (index: number) => {
    onHashtagsChange(hashtags.filter((_, i) => i !== index));
  };

  const handleHashtagAdd = (hashtag: string) => {
    if (hashtag.trim() && !hashtags.includes(hashtag)) {
      onHashtagsChange([...hashtags, hashtag]);
    }
  };


  // AI投稿チェック
  const handleCheckPost = async () => {
    if (!content.trim()) return;
    
    setIsChecking(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // 模擬処理
      
      const result = {
        score: Math.floor(Math.random() * 30) + 70,
        suggestions: [
          'より具体的な数値や事例を追加すると良いでしょう',
          '感情に訴える表現を増やしてみてください',
          '行動を促す呼びかけを追加することをお勧めします'
        ],
        hashtagSuggestions: [
          'トレンド',
          'バイラル',
          'フォロー',
          'いいね'
        ],
        engagementPrediction: Math.floor(Math.random() * 20) + 5
      };

      setCheckResult(result);
    } catch (error) {
      console.error('投稿チェックエラー:', error);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-sm">📝</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">投稿文エディター</h2>
              <p className="text-sm text-gray-600">投稿文を作成・編集しましょう</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSave}
                      disabled={!content.trim() || isSaving}
                      className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>保存中...</span>
                        </>
                      ) : (
                        <>
                          <Save size={14} />
                          <span>保存</span>
                        </>
                      )}
                    </button>
            <button
              onClick={handleClear}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              <RefreshCw size={14} />
              <span>クリア</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">

        {/* 投稿タイプ選択 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            投稿タイプ
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onPostTypeChange?.('feed')}
              className={`p-3 rounded-lg border-2 transition-colors ${
                postType === 'feed'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-lg mb-1">📸</div>
                <div className="text-sm font-medium">フィード</div>
              </div>
            </button>
            <button
              onClick={() => onPostTypeChange?.('reel')}
              className={`p-3 rounded-lg border-2 transition-colors ${
                postType === 'reel'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-lg mb-1">🎬</div>
                <div className="text-sm font-medium">リール</div>
              </div>
            </button>
            <button
              onClick={() => onPostTypeChange?.('story')}
              className={`p-3 rounded-lg border-2 transition-colors ${
                postType === 'story'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-lg mb-1">📱</div>
                <div className="text-sm font-medium">ストーリーズ</div>
              </div>
            </button>
          </div>
        </div>

        {/* 投稿設定 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            投稿設定
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">投稿日</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">投稿時間</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* タイトル入力 */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-800 mb-3">
            タイトル
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange?.(e.target.value)}
            placeholder={`${postType === 'reel' ? 'リール' : postType === 'story' ? 'ストーリーズ' : 'フィード'}のタイトルを入力してください...`}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80"
          />
        </div>

        {/* 投稿文入力エリア */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-800 mb-3">
            投稿文
          </label>
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder={`${postType === 'reel' ? 'リール' : postType === 'story' ? 'ストーリーズ' : 'フィード'}の投稿文を入力してください...`}
              className="w-full h-64 p-4 border-2 border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm"
              style={{ fontFamily: 'inherit' }}
            />
          </div>
        </div>


        {/* ハッシュタグ表示・編集 */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-800 mb-3">
            ハッシュタグ
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {hashtags.map((hashtag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 text-sm rounded-full border border-blue-200"
              >
                <span className="text-blue-600 mr-1">#</span>
                {hashtag}
                <button
                  onClick={() => handleHashtagRemove(index)}
                  className="ml-2 text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex space-x-3">
            <input
              type="text"
              placeholder="ハッシュタグを入力..."
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const hashtag = e.currentTarget.value.trim().replace('#', '');
                  if (hashtag) {
                    handleHashtagAdd(hashtag);
                    e.currentTarget.value = '';
                  }
                }
              }}
            />
            <button
              onClick={() => {
                const input = document.querySelector('input[placeholder="ハッシュタグを入力..."]') as HTMLInputElement;
                const hashtag = input.value.trim().replace('#', '');
                if (hashtag) {
                  handleHashtagAdd(hashtag);
                  input.value = '';
                }
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              追加
            </button>
          </div>
        </div>

        {/* 画像アップロード */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-800 mb-3">
            画像（サムネイル）
          </label>
          
          {image ? (
            <div className="relative">
              <div className="w-full max-w-md mx-auto">
                <Image
                  src={image}
                  alt="投稿画像プレビュー"
                  width={400}
                  height={192}
                  className="w-full h-48 object-cover rounded-xl border-2 border-gray-200"
                />
                <button
                  onClick={handleImageRemove}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="mt-2 text-center">
                <button
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  別の画像を選択
                </button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors">
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isUploading}
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer flex flex-col items-center space-y-3"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="text-gray-600">アップロード中...</span>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <Upload className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-gray-600 font-medium">画像をアップロード</p>
                      <p className="text-sm text-gray-500">クリックしてファイルを選択（5MB以下）</p>
                    </div>
                  </>
                )}
              </label>
            </div>
          )}
        </div>

        {/* プレビュー */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            プレビュー
          </h3>
          <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-100 shadow-sm">
            {/* 投稿情報ヘッダー */}
            <div className="mb-4 pb-3 border-b border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center space-x-3">
                  <span className="font-medium">
                    {postType === 'feed' ? '📸 フィード' : postType === 'reel' ? '🎬 リール' : '📱 ストーリーズ'}
                  </span>
                  {scheduledDate && scheduledTime && (
                    <span className="text-gray-500">
                      📅 {new Date(scheduledDate).toLocaleDateString('ja-JP')} {scheduledTime}
                    </span>
                  )}
                </div>
                <div className="text-gray-500">
                  {scheduledDate ? new Date(scheduledDate).toLocaleDateString('ja-JP') : new Date().toLocaleDateString('ja-JP')}
                </div>
              </div>
            </div>

                    {/* 投稿内容 */}
                    {title && (
                      <div className="text-lg font-semibold text-gray-900 mb-3">
                        {title}
                      </div>
                    )}
                    
                    {/* 画像プレビュー */}
                    {image && (
                      <div className="mb-3">
                        <Image
                          src={image}
                          alt="投稿画像"
                          width={400}
                          height={192}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                    )}
                    
                    {content ? (
                      <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {content}
                      </div>
                    ) : (
                      <div className="text-gray-400 italic text-center py-4">
                        📝 投稿文を入力するとプレビューが表示されます
                      </div>
                    )}
            {hashtags.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="text-sm text-blue-600 flex flex-wrap gap-1">
                  {hashtags.map(hashtag => `#${hashtag}`).join(' ')}
                </div>
              </div>
            )}
          </div>

          {/* 文字数カウンター */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">文字数</span>
              <span className={`text-sm font-semibold ${isOverLimit ? 'text-red-600' : characterCount > maxCharacters * 0.9 ? 'text-yellow-600' : 'text-green-600'}`}>
                {characterCount} / {maxCharacters}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  isOverLimit
                    ? 'bg-gradient-to-r from-red-400 to-red-600'
                    : characterCount > maxCharacters * 0.9
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                    : 'bg-gradient-to-r from-green-400 to-blue-500'
                }`}
                style={{ width: `${Math.min((characterCount / maxCharacters) * 100, 100)}%` }}
              />
            </div>
            {isOverLimit && (
              <div className="mt-2 flex items-center text-red-600 text-xs">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                文字数制限を超過しています
              </div>
            )}
          </div>
        </div>

        {/* AI投稿チェック */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            🔍 AI投稿文チェック
          </h3>
          <button
            onClick={handleCheckPost}
            disabled={!content.trim() || isChecking}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center mb-4"
          >
            {isChecking ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                分析中...
              </>
            ) : (
              <>
                <CheckCircle size={16} className="mr-2" />
                投稿文をチェック
              </>
            )}
          </button>

          {/* チェック結果 */}
          {checkResult && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className={`p-3 rounded-lg ${checkResult.score >= 90 ? 'bg-green-100' : checkResult.score >= 80 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                  <div className="text-sm text-gray-600">総合スコア</div>
                  <div className={`text-2xl font-bold ${checkResult.score >= 90 ? 'text-green-600' : checkResult.score >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {checkResult.score}/100
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-gray-600">予測エンゲージメント</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {checkResult.engagementPrediction}%
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">改善提案</h4>
                  <ul className="space-y-1">
                    {checkResult.suggestions.map((suggestion: string, index: number) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <AlertCircle size={14} className="mr-2 mt-0.5 text-yellow-500 flex-shrink-0" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">ハッシュタグ提案</h4>
                  <div className="flex flex-wrap gap-2">
                    {checkResult.hashtagSuggestions.map((hashtag: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                      >
                        #{hashtag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 保存された投稿一覧 */}
        {savedPosts.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">保存された投稿</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {savedPosts.map((savedContent, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                >
                  <span className="truncate flex-1">
                    {savedContent.substring(0, 50)}...
                  </span>
                  <button
                    onClick={() => handleLoad(savedContent)}
                    className="ml-2 px-2 py-1 text-blue-600 hover:text-blue-800"
                  >
                    読み込み
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostEditor;
