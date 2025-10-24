'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SNSLayout from '../../../../components/sns-layout';
import { AIChatWidget } from '../../../../components/ai-chat-widget';
import PostEditor from '../components/PostEditor';
import ToolPanel from '../components/ToolPanel';
import { CurrentPlanCard } from '../../../../components/CurrentPlanCard';
import { usePlanData } from '../../../../hooks/usePlanData';
import { useAuth } from '../../../../contexts/auth-context';

export default function ReelLabPage() {
  const [postContent, setPostContent] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [postType, setPostType] = useState<'feed' | 'reel' | 'story'>('reel');
  const [postImage, setPostImage] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isAIGenerated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<Array<{
    followerIncrease?: number;
    [key: string]: unknown;
  }>>([]);
  
  // 計画データを取得
  const { planData } = usePlanData('instagram');
  const { user } = useAuth();
  
  // 分析データを取得
  const fetchAnalytics = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/analytics?userId=${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'x-user-id': user.uid,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setAnalyticsData(result.analytics || []);
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
    }
  }, [user]);

  useEffect(() => {
    setIsMounted(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (!isMounted) {
    return null;
  }

  return (
    <SNSLayout 
      customTitle="リールラボ" 
      customDescription="Instagramリール動画の作成・編集"
    >
      <div className="space-y-6">
        {/* 現在の運用計画 */}
        {planData && (
          <CurrentPlanCard 
            planData={planData} 
            snsType="instagram"
          />
        )}

        {/* 2カラムレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左カラム: リール投稿エディター */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <span className="text-2xl mr-3">🎬</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">リール動画作成</h2>
                <p className="text-sm text-gray-600">Instagramリール用の動画投稿を作成・編集します</p>
              </div>
            </div>
            
          <PostEditor
            content={postContent}
            onContentChange={setPostContent}
            title={postTitle}
            onTitleChange={setPostTitle}
            hashtags={selectedHashtags}
            onHashtagsChange={setSelectedHashtags}
            postType={postType}
            image={postImage}
            onImageChange={setPostImage}
            scheduledDate={scheduledDate}
            onScheduledDateChange={setScheduledDate}
            scheduledTime={scheduledTime}
            onScheduledTimeChange={setScheduledTime}
            isAIGenerated={isAIGenerated}
            planData={planData}
            aiPromptPlaceholder="例: 商品の使い方、おすすめポイント、バックステージ、チュートリアル、トレンド動画など..."
          />
          </div>

          {/* 右カラム: ツールパネル */}
          <div>
            <ToolPanel
              onTemplateSelect={(template) => setPostContent(template)}
              onHashtagSelect={(hashtag) => {
                if (!selectedHashtags.includes(hashtag)) {
                  setSelectedHashtags([...selectedHashtags, hashtag]);
                }
              }}
              postContent={postContent}
              onImageGenerated={setPostImage}
            />
          </div>
        </div>

        {/* AIチャットウィジェット - リール特化 */}
        <AIChatWidget
          contextData={{
            planData,
            analyticsData,
            currentPost: {
              content: postContent,
              title: postTitle,
              hashtags: selectedHashtags,
              type: postType,
              image: postImage
            },
            postTypeContext: 'reel',
            aiPromptContext: 'Instagramリール動画の作成・最適化に特化したAIアシスタントです。リールの特徴を活かしたエンゲージメントの高い動画コンテンツ作成をお手伝いします。'
          }}
        />
      </div>
    </SNSLayout>
  );
}
