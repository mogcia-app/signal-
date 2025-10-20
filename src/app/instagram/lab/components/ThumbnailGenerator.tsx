'use client';

import React, { useState } from 'react';
import { Image, Sparkles, Clock, Download, RefreshCw } from 'lucide-react';

interface ThumbnailGeneratorProps {
  postContent: string;
  onImageGenerated: (imageUrl: string) => void;
}

export const ThumbnailGenerator: React.FC<ThumbnailGeneratorProps> = ({
  postContent,
  onImageGenerated
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [lastGeneratedDate, setLastGeneratedDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 今日の日付を取得
  const today = new Date().toDateString();
  const canGenerateToday = lastGeneratedDate !== today;

  const handleGenerateThumbnail = async () => {
    if (!postContent.trim()) {
      setError('投稿文を入力してください');
      return;
    }

    if (!canGenerateToday) {
      setError('1日1回まで生成可能です。明日もう一度お試しください。');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/generate-thumbnail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postContent: postContent.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '画像生成に失敗しました');
      }

      if (data.success && data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        setLastGeneratedDate(today);
        onImageGenerated(data.imageUrl);
      } else {
        throw new Error('画像生成に失敗しました');
      }
      
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      setError(error instanceof Error ? error.message : '画像生成に失敗しました。もう一度お試しください。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `thumbnail-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-black flex items-center">
            <Sparkles size={18} className="mr-2" />
            AIサムネ画像生成
          </h3>
          {!canGenerateToday && (
            <div className="flex items-center text-sm text-orange-600">
              <Clock size={14} className="mr-1" />
              本日利用済み
            </div>
          )}
        </div>

        <div className="mb-4">
          <p className="text-sm text-black mb-3">
            投稿文をもとにAIが白黒のサムネ画像を生成します。
            <span className="block text-xs text-orange-600 mt-1">
              ⚠️ 1日1回まで利用可能
            </span>
            <span className="block text-xs text-black mt-1">
              🎨 ミニマルでモダンな白黒デザイン
            </span>
          </p>
        </div>

        {/* 生成ボタン */}
        <div className="mb-4">
          <button
            onClick={handleGenerateThumbnail}
            disabled={isGenerating || !postContent.trim() || !canGenerateToday}
            className={`w-full py-3 px-4 rounded-md font-medium transition-colors flex items-center justify-center ${
              isGenerating || !postContent.trim() || !canGenerateToday
                ? 'bg-gray-300 text-black cursor-not-allowed'
                : 'bg-gradient-to-r from-gray-800 to-gray-600 text-white hover:from-gray-900 hover:to-gray-700'
            }`}
          >
            {isGenerating ? (
              <>
                <RefreshCw size={16} className="mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles size={16} className="mr-2" />
                サムネ画像を生成
              </>
            )}
          </button>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* 生成された画像 */}
        {generatedImage && (
          <div className="space-y-3">
            <div className="relative">
              <img
                src={generatedImage}
                alt="AI生成されたサムネ画像"
                className="w-full h-48 object-cover rounded-md border border-gray-200"
              />
              <div className="absolute top-2 right-2 bg-white bg-opacity-90 rounded-full p-1">
                <Image size={16} className="text-black" />
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleDownload}
                className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center text-sm"
              >
                <Download size={14} className="mr-1" />
                ダウンロード
              </button>
              <button
                onClick={() => {
                  // 投稿エディタに画像を設定
                  onImageGenerated(generatedImage);
                }}
                className="flex-1 py-2 px-3 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors flex items-center justify-center text-sm"
              >
                <Image size={14} className="mr-1" />
                投稿に使用
              </button>
            </div>
          </div>
        )}

        {/* 利用状況 */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-black">
            <span>今日の利用状況</span>
            <span className={canGenerateToday ? 'text-green-600' : 'text-orange-600'}>
              {canGenerateToday ? '利用可能' : '利用済み'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThumbnailGenerator;
