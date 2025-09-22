'use client';

import React, { useState } from 'react';
import SNSLayout from '../../../components/sns-layout';
import PostEditor from './components/PostEditor';
import ToolPanel from './components/ToolPanel';
import KPIDiagnosis from './components/KPIDiagnosis';
import AIAssistant from './components/AIAssistant';

export default function InstagramLabPage() {
  const [postContent, setPostContent] = useState('');
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [postType, setPostType] = useState<'feed' | 'reel'>('feed');

  return (
    <SNSLayout 
      currentSNS="instagram"
      customTitle="投稿ラボ"
      customDescription="Instagram投稿文を作成・編集し、効果的な投稿を制作しましょう"
    >
      <div className="max-w-7xl mx-auto p-6">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左カラム: AIアシスタント・投稿文作成・編集 */}
          <div className="space-y-6">
            <AIAssistant
              postType={postType}
              onGeneratePost={(content, hashtags) => {
                setPostContent(content);
                setSelectedHashtags(hashtags);
              }}
              onCheckPost={(content, hashtags) => {
                // AIチェック結果はAIAssistantコンポーネント内で管理
                console.log('投稿チェック:', content, hashtags);
              }}
            />

            <PostEditor
              content={postContent}
              onContentChange={setPostContent}
              hashtags={selectedHashtags}
              onHashtagsChange={setSelectedHashtags}
              postType={postType}
              onPostTypeChange={setPostType}
            />
          </div>

          {/* 右カラム: ツール・診断 */}
          <div className="space-y-6">
            <ToolPanel
              onTemplateSelect={(template: string) => {
                setPostContent(prev => prev + template);
              }}
              onHashtagSelect={(hashtag: string) => {
                setSelectedHashtags(prev => [...prev, hashtag]);
              }}
            />
            
            <KPIDiagnosis
              content={postContent}
              hashtags={selectedHashtags}
            />
          </div>
        </div>
      </div>
    </SNSLayout>
  );
}
