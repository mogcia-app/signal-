'use client';

import React, { useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';

interface PostEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  hashtags: string[];
  onHashtagsChange: (hashtags: string[]) => void;
}

export const PostEditor: React.FC<PostEditorProps> = ({
  content,
  onContentChange,
  hashtags,
  onHashtagsChange
}) => {
  const [savedPosts, setSavedPosts] = useState<string[]>([]);

  const characterCount = content.length;
  const maxCharacters = 2200;
  const isOverLimit = characterCount > maxCharacters;

  const handleSave = () => {
    if (content.trim()) {
      setSavedPosts(prev => [...prev, content]);
      // 実際の実装ではローカルストレージやAPIに保存
      console.log('投稿を保存しました:', content);
    }
  };

  const handleLoad = (savedContent: string) => {
    onContentChange(savedContent);
  };

  const handleClear = () => {
    onContentChange('');
    onHashtagsChange([]);
  };

  const handleHashtagRemove = (index: number) => {
    onHashtagsChange(hashtags.filter((_, i) => i !== index));
  };

  const handleHashtagAdd = (hashtag: string) => {
    if (hashtag.trim() && !hashtags.includes(hashtag)) {
      onHashtagsChange([...hashtags, hashtag]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">投稿文エディター</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              disabled={!content.trim()}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Save size={14} />
              <span>保存</span>
            </button>
            <button
              onClick={handleClear}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              <RefreshCw size={14} />
              <span>クリア</span>
            </button>
          </div>
        </div>

        {/* 文字数カウンター */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className={`${isOverLimit ? 'text-red-600' : 'text-gray-600'}`}>
              {characterCount} / {maxCharacters} 文字
            </span>
            {isOverLimit && (
              <span className="text-red-600 text-xs">
                文字数制限を超過しています
              </span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                isOverLimit
                  ? 'bg-red-500'
                  : characterCount > maxCharacters * 0.9
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min((characterCount / maxCharacters) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* 投稿文入力エリア */}
        <div className="mb-4">
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="投稿文を入力してください..."
            className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ fontFamily: 'inherit' }}
          />
        </div>

        {/* ハッシュタグ表示・編集 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ハッシュタグ
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {hashtags.map((hashtag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
              >
                #{hashtag}
                <button
                  onClick={() => handleHashtagRemove(index)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="ハッシュタグを追加..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                const input = document.querySelector('input[placeholder="ハッシュタグを追加..."]') as HTMLInputElement;
                const hashtag = input.value.trim().replace('#', '');
                if (hashtag) {
                  handleHashtagAdd(hashtag);
                  input.value = '';
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              追加
            </button>
          </div>
        </div>

        {/* プレビュー */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">プレビュー</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-800 whitespace-pre-wrap">
              {content || '投稿文が入力されていません'}
            </div>
            {hashtags.length > 0 && (
              <div className="mt-2 text-sm text-blue-600">
                {hashtags.map(hashtag => `#${hashtag}`).join(' ')}
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
