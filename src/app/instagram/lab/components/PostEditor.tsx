'use client';

import React, { useState } from 'react';
import { Save, RefreshCw, CheckCircle, Upload, X, Eye, Sparkles } from 'lucide-react';
import { postsApi } from '../../../../lib/api';
import { useAuth } from '../../../../contexts/auth-context';
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
  scheduledDate?: string;
  onScheduledDateChange?: (date: string) => void;
  scheduledTime?: string;
  onScheduledTimeChange?: (time: string) => void;
  isAIGenerated?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  planData?: any; // AI投稿文生成用
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
  onImageChange,
  scheduledDate: externalScheduledDate = '',
  onScheduledDateChange,
  scheduledTime: externalScheduledTime = '',
  onScheduledTimeChange,
  isAIGenerated = false,
  planData
}) => {
  const { user } = useAuth();
  const [savedPosts, setSavedPosts] = useState<string[]>([]);
  const [internalScheduledDate, setInternalScheduledDate] = useState('');
  const [internalScheduledTime, setInternalScheduledTime] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // AI投稿文生成用のstate
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  // 外部から渡された日時を優先、なければ内部状態を使用
  const scheduledDate = externalScheduledDate || internalScheduledDate;
  const scheduledTime = externalScheduledTime || internalScheduledTime;
  
  const handleScheduledDateChange = (date: string) => {
    if (onScheduledDateChange) {
      onScheduledDateChange(date);
    } else {
      setInternalScheduledDate(date);
    }
  };
  
  const handleScheduledTimeChange = (time: string) => {
    if (onScheduledTimeChange) {
      onScheduledTimeChange(time);
    } else {
      setInternalScheduledTime(time);
    }
  };
  

  const characterCount = content.length;
  const maxCharacters = 2200;
  const isOverLimit = characterCount > maxCharacters;

  const handleSave = async () => {
    if (!user?.uid) {
      alert('ログインが必要です');
      return;
    }

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
        userId: user.uid,
        title: title || '',
        content,
        hashtags: hashtags,
        postType,
        scheduledDate,
        scheduledTime,
        status: 'created' as const, // 'draft' → 'created' に変更
        imageData: image,
        isAIGenerated, // AI生成フラグを追加
      };

      console.log('Saving post data:', postData);
      const result = await postsApi.create(postData);
      console.log('投稿を保存しました:', result);
      console.log('Post saved successfully with ID:', result.id);
      
      // ローカル保存リストにも追加
      setSavedPosts(prev => [...prev, content]);
      
      // 成功メッセージを表示
      setShowSuccessMessage(true);
      
      // 3秒後にメッセージを非表示
      setTimeout(() => setShowSuccessMessage(false), 3000);
      
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
    handleScheduledDateChange('');
    handleScheduledTimeChange('');
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

  // AI自動生成（テーマも自動選択）
  const handleAutoGenerate = async () => {
    if (!planData) {
      alert('運用計画が設定されていません');
      return;
    }
    
    setIsAutoGenerating(true);
    try {
      // 🔐 Firebase認証トークンを取得
      const { auth } = await import('../../../../lib/firebase');
      const currentUser = auth.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : null;

      // AI APIを呼び出して完全自動生成
      const response = await fetch('/api/ai/post-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          prompt: 'auto', // 自動生成を示す
          postType: postType || 'feed',
          planData,
          scheduledDate,
          scheduledTime,
          autoGenerate: true // 自動生成フラグ
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '自動生成に失敗しました');
      }

      if (result.success && result.data) {
        const { title, content, hashtags: generatedHashtags } = result.data;
        if (title) onTitleChange?.(title);
        onContentChange(content);
        if (generatedHashtags && generatedHashtags.length > 0) {
          onHashtagsChange(generatedHashtags);
        }
      } else {
        throw new Error('自動生成に失敗しました');
      }
    } catch (error) {
      console.error('自動生成エラー:', error);
      alert(`自動生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAutoGenerating(false);
    }
  };

  // AI投稿文生成（テーマ指定）
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      alert('投稿のテーマを入力してください');
      return;
    }
    
    setIsGenerating(true);
    try {
      // 🔐 Firebase認証トークンを取得
      const { auth } = await import('../../../../lib/firebase');
      const currentUser = auth.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : null;

      // AI APIを呼び出して投稿文生成
      const response = await fetch('/api/ai/post-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          postType: postType || 'feed',
          planData,
          scheduledDate,
          scheduledTime,
          action: 'generatePost'
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '投稿文生成に失敗しました');
      }

      if (result.success && result.data) {
        const { title, content, hashtags: generatedHashtags } = result.data;
        if (title) onTitleChange?.(title);
        onContentChange(content);
        if (generatedHashtags && generatedHashtags.length > 0) {
          onHashtagsChange(generatedHashtags);
        }
        setAiPrompt(''); // テーマをクリア
      } else {
        throw new Error('投稿文生成に失敗しました');
      }
    } catch (error) {
      console.error('投稿文生成エラー:', error);
      alert(`投稿文生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-[#ff8a15] to-orange-600 rounded-lg flex items-center justify-center mr-3">
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
                      className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-[#ff8a15] text-white rounded-md hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
              className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
            >
              <RefreshCw size={14} />
              <span>クリア</span>
            </button>
          </div>
        </div>
      </div>

      {/* 成功メッセージ */}
      {showSuccessMessage && (
        <div className="mx-6 mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle size={20} className="text-orange-600 mr-3" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-800">
                投稿が保存されました！
              </p>
              <p className="text-xs text-orange-600 mt-1">
                投稿一覧ページで確認できます。
              </p>
            </div>
            <div className="flex space-x-2">
              <a
                href="/instagram/posts"
                className="inline-flex items-center px-3 py-1 text-xs bg-[#ff8a15] text-white rounded-md hover:bg-orange-600 transition-colors"
              >
                <Eye size={12} className="mr-1" />
                投稿一覧を見る
              </a>
            </div>
          </div>
        </div>
      )}

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
                  ? 'border-[#ff8a15] bg-orange-50 text-orange-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300'
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
                  ? 'border-[#ff8a15] bg-orange-50 text-orange-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300'
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
                  ? 'border-[#ff8a15] bg-orange-50 text-orange-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300'
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
                onChange={(e) => handleScheduledDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">投稿時間</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => handleScheduledTimeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] text-sm"
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
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] transition-all duration-200 bg-white/80"
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
              className="w-full h-64 p-4 border-2 border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] transition-all duration-200 bg-white/80 backdrop-blur-sm"
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
                className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 text-sm rounded-full border border-orange-200"
              >
                <span className="text-orange-600 mr-1">#</span>
                {hashtag}
                <button
                  onClick={() => handleHashtagRemove(index)}
                  className="ml-2 text-orange-600 hover:text-orange-800 hover:bg-orange-200 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
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
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] transition-all duration-200 bg-white/80"
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
              className="px-6 py-3 bg-gradient-to-r from-[#ff8a15] to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              追加
            </button>
          </div>
        </div>

        {/* AI投稿文生成 */}
        <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Sparkles className="mr-2 text-orange-600" size={20} />
            AI投稿文生成
          </h3>
          
          {/* テーマ入力 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              投稿テーマ（オプション）
            </label>
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="例: 新商品の紹介、日常の出来事、お客様の声など..."
              disabled={!planData}
              className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] transition-all duration-200 bg-white/80 ${
                !planData ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
            {!planData && (
              <p className="text-sm text-orange-600 mt-2">
                運用計画を作成してからAI投稿文を生成できます
              </p>
            )}
          </div>

          {/* 生成ボタン */}
          <div className="space-y-3">
            {/* 自動生成ボタン */}
            <button
              onClick={handleAutoGenerate}
              disabled={isAutoGenerating || !planData}
              className={`w-full py-3 px-6 font-semibold text-lg transition-all duration-200 flex items-center justify-center border-2 ${
                isAutoGenerating || !planData
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                  : 'bg-gradient-to-r from-orange-400 to-orange-500 text-white border-orange-500 hover:from-orange-500 hover:to-orange-600 hover:border-orange-600 shadow-lg hover:shadow-xl transform hover:scale-105'
              }`}
            >
              {isAutoGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  自動生成中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2" size={20} />
                  🤖 自動生成（テーマも自動選択）
                </>
              )}
            </button>

            {/* テーマ指定生成ボタン */}
            <button
              onClick={handleAIGenerate}
              disabled={isGenerating || !planData || !aiPrompt.trim()}
              className={`w-full py-3 px-6 font-semibold text-lg transition-all duration-200 flex items-center justify-center border-2 ${
                isGenerating || !planData || !aiPrompt.trim()
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                  : 'bg-gradient-to-r from-[#ff8a15] to-orange-600 text-white border-[#ff8a15] hover:from-orange-600 hover:to-[#ff8a15] hover:border-orange-600 shadow-lg hover:shadow-xl transform hover:scale-105'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2" size={20} />
                  ✍️ テーマ指定生成
                </>
              )}
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
                  className="text-sm text-orange-600 hover:text-orange-800 transition-colors"
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff8a15]"></div>
                    <span className="text-gray-600">アップロード中...</span>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <Upload className="w-6 h-6 text-orange-400" />
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
                <div className="text-sm text-orange-600 flex flex-wrap gap-1">
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
                    className="ml-2 px-2 py-1 text-orange-600 hover:text-orange-800"
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
