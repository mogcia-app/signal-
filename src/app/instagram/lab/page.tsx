'use client';

import React, { useState } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { AIChatWidget } from '../../../components/ai-chat-widget';
import PostEditor from './components/PostEditor';
import AIPostGenerator from './components/AIPostGenerator';
import ToolPanel from './components/ToolPanel';
import KPIDiagnosis from './components/KPIDiagnosis';
import PlanDisplay from './components/PlanDisplay';
import { PlanData } from '../plan/types/plan';
import { usePlanData } from '../../../hooks/usePlanData';

export default function InstagramLabPage() {
  const [postContent, setPostContent] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [postType, setPostType] = useState<'feed' | 'reel' | 'story'>('feed');
  const [postImage, setPostImage] = useState<string | null>(null);
  
  // 計画データを取得
  const { planData, refetchPlanData } = usePlanData();
  
  // 計画がある場合のサンプルデータ（テスト用）
  // const [planData] = useState<PlanData>({
  //   id: 'plan-001',
  //   title: 'Instagram成長加速計画',
  //   targetFollowers: 10000,
  //   currentFollowers: 3250,
  //   planPeriod: '6ヶ月',
  //   targetAudience: '未設定',
  //   category: '未設定',
  //   strategies: ['ハッシュタグ最適化', 'ストーリー活用', 'リール投稿', 'エンゲージメント向上'],
  //   createdAt: '2024-09-01',
  //   simulation: {
  //     postTypes: {
  //       reel: { weeklyCount: 1, followerEffect: 3 },
  //       feed: { weeklyCount: 2, followerEffect: 2 },
  //       story: { weeklyCount: 3, followerEffect: 1 }
  //     }
  //   },
  //   aiPersona: {
  //     tone: '親しみやすい',
  //     style: 'カジュアル',
  //     personality: '明るく前向き',
  //     interests: ['成長', 'コミュニティ', 'エンゲージメント', 'クリエイティブ']
  //   }
  // });

  // AI生成ハンドラー
  const handleAIGenerate = (generatedTitle: string, generatedContent: string, generatedHashtags: string[]) => {
    setPostTitle(generatedTitle);
    setPostContent(generatedContent);
    setSelectedHashtags(generatedHashtags);
  };

  return (
    <>
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
