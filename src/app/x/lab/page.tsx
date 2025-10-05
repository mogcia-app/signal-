'use client';

import React, { useState } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { AIChatWidget } from '../../../components/ai-chat-widget';
import PostEditor from './components/PostEditor';
import AIPostGenerator from './components/AIPostGenerator';
import ToolPanel from './components/ToolPanel';
import KPIDiagnosis from './components/KPIDiagnosis';
import PlanDisplay from './components/PlanDisplay';
import { usePlanData } from '../../../hooks/usePlanData';

export default function XLabPage() {
  const [postContent, setPostContent] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [postType, setPostType] = useState<'tweet' | 'thread' | 'reply'>('tweet');
  const [postImage, setPostImage] = useState<string | null>(null);
  
  // 計画データを取得
  const { planData } = usePlanData();
  
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
                postType={postType}
                onPostTypeChange={setPostType}
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
        </div>
      </SNSLayout>

      {/* AIチャットウィジェット */}
      <AIChatWidget 
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
