'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SNSLayout from '../../../../components/sns-layout';
import { AIChatWidget } from '../../../../components/ai-chat-widget';
import PostEditor from '../components/PostEditor';
import ToolPanel from '../components/ToolPanel';
import { CurrentPlanCard } from '../../../../components/CurrentPlanCard';
import { usePlanData } from '../../../../hooks/usePlanData';
import { useAuth } from '../../../../contexts/auth-context';

export default function StoryLabPage() {
  const [postContent, setPostContent] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [postType, setPostType] = useState<'feed' | 'reel' | 'story'>('story');
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
      customTitle="ストーリーラボ" 
      customDescription="Instagramストーリーの作成・編集"
    >
      <div className="space-y-6">
        {/* 現在の運用計画 */}
        {planData && (
          <CurrentPlanCard 
            planData={planData} 
            snsType="instagram"
          />
        )}

        {/* ストーリー投稿エディター */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <span className="text-2xl mr-3">📱</span>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">投稿文エディター</h2>
              <p className="text-sm text-gray-600">投稿文を作成・編集しましょう</p>
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
            aiPromptPlaceholder="例: 今日の出来事、おすすめ商品、お店の雰囲気、スタッフ紹介、限定情報など..."
          />
          
          {/* 保存・クリアボタン */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={() => {
                // 保存処理（実装が必要）
                console.log('保存:', { postContent, postTitle, selectedHashtags, postType });
              }}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
            >
              保存
            </button>
            <button
              onClick={() => {
                setPostContent('');
                setPostTitle('');
                setSelectedHashtags([]);
                setPostImage(null);
                setScheduledDate('');
                setScheduledTime('');
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              クリア
            </button>
          </div>
        </div>

        {/* AIチャットウィジェット - ストーリー特化 */}
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
            postTypeContext: 'story',
            aiPromptContext: 'Instagramストーリーの作成・最適化に特化したAIアシスタントです。ストーリーの特徴を活かした親しみやすく魅力的なコンテンツ作成をお手伝いします。'
          }}
        />
      </div>
    </SNSLayout>
  );
}
