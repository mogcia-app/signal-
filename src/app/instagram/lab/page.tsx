'use client';

import React, { useState } from 'react';
import SNSLayout from '../../../components/sns-layout';
import PostEditor from './components/PostEditor';
import ToolPanel from './components/ToolPanel';
import KPIDiagnosis from './components/KPIDiagnosis';

export default function InstagramLabPage() {
  const [postContent, setPostContent] = useState('');
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);

  return (
    <SNSLayout currentSNS="instagram">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">投稿ラボ</h1>
          <p className="text-gray-600">
            Instagram投稿文を作成・編集し、効果的な投稿を制作しましょう
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左カラム: 投稿文作成・編集 */}
          <div className="space-y-6">
            <PostEditor
              content={postContent}
              onContentChange={setPostContent}
              hashtags={selectedHashtags}
              onHashtagsChange={setSelectedHashtags}
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
