'use client';

import React, { useState } from 'react';
import SNSLayout from '../../../components/sns-layout';
import PostEditor from './components/PostEditor';
import AIPostGenerator from './components/AIPostGenerator';
import ToolPanel from './components/ToolPanel';
import KPIDiagnosis from './components/KPIDiagnosis';
import PlanDisplay from './components/PlanDisplay';

export default function InstagramLabPage() {
  const [postContent, setPostContent] = useState('');
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [postType, setPostType] = useState<'feed' | 'reel' | 'story'>('feed');
  
  // 模擬的な計画データ（実際のアプリではAPIから取得）
  const [planData] = useState<{
    id: string;
    title: string;
    targetFollowers: number;
    currentFollowers: number;
    planPeriod: string;
    strategies: string[];
    createdAt: string;
  } | null>(null); // nullに設定して計画なし状態を表示
  
  // 計画がある場合のサンプルデータ（テスト用）
  // const [planData] = useState({
  //   id: 'plan-001',
  //   title: 'Instagram成長加速計画',
  //   targetFollowers: 10000,
  //   currentFollowers: 3250,
  //   planPeriod: '6ヶ月',
  //   strategies: ['ハッシュタグ最適化', 'ストーリー活用', 'リール投稿', 'エンゲージメント向上'],
  //   createdAt: '2024-09-01'
  // });

  // AI生成ハンドラー
  const handleAIGenerate = (generatedContent: string, generatedHashtags: string[]) => {
    setPostContent(generatedContent);
    setSelectedHashtags(generatedHashtags);
  };

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
            
            <AIPostGenerator
              postType={postType}
              onGeneratePost={handleAIGenerate}
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
  );
}
