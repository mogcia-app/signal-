'use client';

import React, { useState } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { XChatWidget } from '../../../components/x-chat-widget';
import PostEditor from './components/PostEditor';
import AIPostGenerator from './components/AIPostGenerator';
import ToolPanel from './components/ToolPanel';
import KPIDiagnosis from './components/KPIDiagnosis';
import PlanDisplay from './components/PlanDisplay';
import { useXPlanData } from '../../../hooks/useXPlanData';

export default function XLabPage() {
  const [postContent, setPostContent] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [postType, setPostType] = useState<'tweet' | 'thread' | 'reply'>('tweet');
  const [postImage, setPostImage] = useState<string | null>(null);
  
  // X版の計画データを取得
  const { planData, loading, error } = useXPlanData();
  
  // AI生成ハンドラー
  const handleAIGenerate = (generatedTitle: string, generatedContent: string, generatedHashtags: string[]) => {
    setPostTitle(generatedTitle);
    setPostContent(generatedContent);
    setSelectedHashtags(generatedHashtags);
  };

  return (
    <>
      <SNSLayout 
        currentSNS="x"
        customTitle="投稿ラボ"
        customDescription="X（旧Twitter）投稿文を作成・編集し、効果的な投稿を制作しましょう"
      >
        <div className="max-w-7xl mx-auto p-6">
          {/* ローディング状態 */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">X版の運用計画を読み込み中...</p>
            </div>
          )}

          {/* エラー状態 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="text-red-600 mr-2">⚠️</div>
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* プランデータがない場合 */}
          {!loading && !error && !planData && (
            <div className="text-center py-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="text-blue-600 text-4xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">運用計画がありません</h3>
                <p className="text-blue-700 mb-4">
                  X版の運用計画を作成すると、より効果的な投稿文の生成ができます。
                </p>
                <a
                  href="/x/plan"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  運用計画を作成する
                </a>
              </div>
            </div>
          )}

          {/* メインコンテンツ */}
          {!loading && !error && planData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 左カラム: 投稿文作成・編集 */}
            <div className="space-y-6">
                      <PostEditor
                        content={postContent}
                        onContentChange={setPostContent}
                        hashtags={selectedHashtags}
                        onHashtagsChange={setSelectedHashtags}
                        postType={postType}
                        onPostTypeChange={setPostType}
                        title={postTitle}
                        onTitleChange={setPostTitle}
                        image={postImage}
                        onImageChange={setPostImage}
                      />
              
              <AIPostGenerator
                onGeneratePost={handleAIGenerate}
                planData={planData}
              />
            </div>

            {/* 右カラム: 計画・診断・ツール */}
            <div className="space-y-6">
              <PlanDisplay planData={planData} />
              
              <KPIDiagnosis
                content={postContent}
                hashtags={selectedHashtags}
                postType={postType}
              />
              
              <ToolPanel
                onTemplateSelect={(template: string) => {
                  setPostContent(prev => prev + template);
                }}
                onHashtagSelect={(hashtag: string) => {
                  setSelectedHashtags(prev => [...prev, hashtag]);
                }}
              />
            </div>
          </div>
          )}
        </div>
      </SNSLayout>

      {/* AIチャットウィジェット */}
      <XChatWidget 
        contextData={{
          postContent,
          postTitle,
          selectedHashtags,
          postType,
          planData: planData as unknown as Record<string, unknown>
        }}
      />
    </>
  );
}
