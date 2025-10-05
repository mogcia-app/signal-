'use client';

import React from 'react';

interface PostEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  hashtags: string[];
  onHashtagsChange: (hashtags: string[]) => void;
  postType: 'tweet' | 'thread' | 'reply';
  onPostTypeChange: (type: 'tweet' | 'thread' | 'reply') => void;
  title: string;
  onTitleChange: (title: string) => void;
  image?: string | null;
  onImageChange?: (image: string | null) => void;
}

export const PostEditor: React.FC<PostEditorProps> = ({
  content,
  onContentChange,
  hashtags,
  onHashtagsChange,
  postType,
  onPostTypeChange,
  title,
  onTitleChange,
  image,
  onImageChange
}) => {
  const handleHashtagRemove = (index: number) => {
    const newHashtags = hashtags.filter((_, i) => i !== index);
    onHashtagsChange(newHashtags);
  };

  const handleHashtagAdd = (hashtag: string) => {
    if (hashtag.trim() && !hashtags.includes(hashtag)) {
      onHashtagsChange([...hashtags, hashtag]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white text-lg">✏️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">投稿エディター</h3>
              <p className="text-sm text-gray-600">X投稿文を作成・編集します</p>
            </div>
          </div>
          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
            {postType === 'tweet' ? '🐦 ツイート' : postType === 'thread' ? '🧵 スレッド' : '💬 リプライ'}
          </div>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="p-6 space-y-6">
        {/* タイトル */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            タイトル
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="投稿のタイトルを入力..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 投稿文 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              投稿文
            </label>
            <div className="text-sm text-gray-500">
              {content.length}/280
            </div>
          </div>
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder={`${postType === 'tweet' ? 'ツイート' : postType === 'thread' ? 'スレッド' : 'リプライ'}の内容を入力...`}
            className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            maxLength={280}
          />
          {content.length > 250 && (
            <div className={`text-xs mt-1 ${content.length > 280 ? 'text-red-600' : 'text-yellow-600'}`}>
              {content.length > 280 ? '文字数制限を超過しています' : '文字数制限に近づいています'}
            </div>
          )}
        </div>

        {/* ハッシュタグ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ハッシュタグ
          </label>
          <div className="space-y-3">
            {/* ハッシュタグ入力 */}
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="#ハッシュタグを入力"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement;
                    const hashtag = input.value.trim();
                    if (hashtag) {
                      handleHashtagAdd(hashtag.startsWith('#') ? hashtag : `#${hashtag}`);
                      input.value = '';
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector('input[placeholder="#ハッシュタグを入力"]') as HTMLInputElement;
                  const hashtag = input.value.trim();
                  if (hashtag) {
                    handleHashtagAdd(hashtag.startsWith('#') ? hashtag : `#${hashtag}`);
                    input.value = '';
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                追加
              </button>
            </div>

            {/* ハッシュタグ一覧 */}
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {hashtags.map((hashtag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {hashtag}
                    <button
                      onClick={() => handleHashtagRemove(index)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* プレビュー */}
        {content && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              プレビュー
            </label>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">U</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-semibold text-gray-900">あなた</span>
                    <span className="text-gray-500 text-sm">@username</span>
                    <span className="text-gray-500 text-sm">·</span>
                    <span className="text-gray-500 text-sm">今</span>
                  </div>
                  <div className="text-gray-900 whitespace-pre-wrap">
                    {content}
                  </div>
                  {hashtags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {hashtags.map((hashtag, index) => (
                        <span key={index} className="text-blue-600 text-sm">
                          {hashtag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostEditor;
