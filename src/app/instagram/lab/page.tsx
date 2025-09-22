'use client';

import React, { useState } from 'react';
import SNSLayout from '../../../components/sns-layout';
import PostEditor from './components/PostEditor';
import ToolPanel from './components/ToolPanel';
import KPIDiagnosis from './components/KPIDiagnosis';

export default function InstagramLabPage() {
  const [postContent, setPostContent] = useState('');
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [postType, setPostType] = useState<'feed' | 'reel' | 'story'>('feed');

  return (
    <SNSLayout 
      currentSNS="instagram"
      customTitle="投稿ラボ"
      customDescription="Instagram投稿文を作成・編集し、効果的な投稿を制作しましょう"
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
            />
          </div>

          {/* 右カラム: 診断・ツール */}
          <div className="space-y-6">
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
  );
}
