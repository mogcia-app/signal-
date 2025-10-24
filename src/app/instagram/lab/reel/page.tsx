'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SNSLayout from '../../../../components/sns-layout';
import PostEditor from '../components/PostEditor';
import ToolPanel from '../components/ToolPanel';
import { usePlanData } from '../../../../hooks/usePlanData';
import { useAuth } from '../../../../contexts/auth-context';

export default function ReelLabPage() {
  const [postContent, setPostContent] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [postType] = useState<'feed' | 'reel' | 'story'>('reel');
  const [postImage, setPostImage] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isAIGenerated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<Array<{
    followerIncrease?: number;
    [key: string]: unknown;
  }>>([]);

  // スケジュール関連の状態
  const [monthlyPosts, setMonthlyPosts] = useState(8);
  const [dailyPosts, setDailyPosts] = useState(1);
  const [generatedSchedule, setGeneratedSchedule] = useState<Array<{
    day: string;
    dayName: string;
    posts: Array<{
      title: string;
      description: string;
      emoji: string;
      category: string;
    }>;
  }>>([]);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  // 動画構成関連の状態
  const [videoStructure, setVideoStructure] = useState({
    introduction: '', // 起
    development: '',  // 承
    twist: '',        // 転
    conclusion: ''    // 結
  });
  const [videoFlow, setVideoFlow] = useState(''); // 動画構成の流れ
  
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

  // スケジュール生成関数
  const generateSchedule = useCallback(async () => {
    if (!user?.uid) return;
    
    setIsGeneratingSchedule(true);
    setScheduleError('');
    
    try {
      // ビジネス情報を取得
      const idToken = await user.getIdToken();
      const businessResponse = await fetch(`/api/user/business-info?userId=${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'x-user-id': user.uid,
        },
      });
      
      if (!businessResponse.ok) {
        throw new Error('ビジネス情報の取得に失敗しました');
      }
      
      const businessData = await businessResponse.json();
      
      // スケジュール生成APIを呼び出し
      const scheduleResponse = await fetch('/api/instagram/reel-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          monthlyPosts,
          dailyPosts,
          businessInfo: businessData.businessInfo
        }),
      });
      
      if (!scheduleResponse.ok) {
        throw new Error('スケジュール生成に失敗しました');
      }
      
      const scheduleData = await scheduleResponse.json();
      setGeneratedSchedule(scheduleData.schedule || []);
      
    } catch (error) {
      console.error('スケジュール生成エラー:', error);
      setScheduleError(error instanceof Error ? error.message : 'スケジュール生成に失敗しました');
    } finally {
      setIsGeneratingSchedule(false);
    }
  }, [user, monthlyPosts, dailyPosts]);

  // 動画構成生成関数
  const generateVideoStructure = useCallback(async (prompt: string) => {
    if (!user?.uid || !prompt.trim()) return;
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/instagram/reel-structure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          prompt: prompt,
          businessInfo: planData
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setVideoStructure(result.structure || {
          introduction: '',
          development: '',
          twist: '',
          conclusion: ''
        });
        setVideoFlow(result.flow || '');
      }
    } catch (error) {
      console.error('動画構成生成エラー:', error);
    }
  }, [user, planData]);
  
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
        {/* リール投稿計画提案 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <span className="text-2xl mr-3">📅</span>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">リール投稿計画</h2>
              <p className="text-sm text-gray-600">1ヶ月のリール投稿スケジュールを提案します</p>
            </div>
          </div>
          
          {/* 投稿頻度設定 */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-800 mb-4">投稿頻度設定</h3>
            
            {/* 投稿頻度の概要表示 */}
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200">
              <div className="flex items-center mb-2">
                <span className="text-lg mr-2">📊</span>
                <span className="font-medium text-orange-800">投稿スケジュール概要</span>
              </div>
              <div className="text-sm text-orange-700">
                <p>• 週の投稿回数: <span className="font-semibold">{Math.round(monthlyPosts / 4)}回</span>（月{monthlyPosts}回）</p>
                <p>• 1日の投稿回数: <span className="font-semibold">{dailyPosts}回</span></p>
                <p>• 投稿する曜日数: <span className="font-semibold">{Math.round(monthlyPosts / 4)}日/週</span></p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  1ヶ月の投稿回数
                </label>
                <select 
                  value={monthlyPosts} 
                  onChange={(e) => setMonthlyPosts(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                   <option value="4">4回（週1回）</option>
                  <option value="8">8回（週2回）</option>
                  <option value="16">16回（週4回）</option>
                  <option value="24">24回（週6回）</option>
                  <option value="28">28回（毎日）</option>
                </select>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  1日の投稿回数
                </label>
                <select 
                  value={dailyPosts} 
                  onChange={(e) => setDailyPosts(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                   <option value="1">1回</option>
                  <option value="2">2回</option>
                  <option value="3">3回</option>
                  <option value="4">4回</option>
                </select>
              </div>
            </div>
          </div>

          {/* 曜日別投稿提案カード */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">週間投稿スケジュール</h3>
            {generatedSchedule.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedSchedule.map((daySchedule, index) => {
                  const colors = [
                    'from-red-50 to-red-100 border-red-200 text-red-600 text-red-800',
                    'from-orange-50 to-orange-100 border-orange-200 text-orange-600 text-orange-800',
                    'from-yellow-50 to-yellow-100 border-yellow-200 text-yellow-600 text-yellow-800',
                    'from-green-50 to-green-100 border-green-200 text-green-600 text-green-800',
                    'from-blue-50 to-blue-100 border-blue-200 text-blue-600 text-blue-800',
                    'from-purple-50 to-purple-100 border-purple-200 text-purple-600 text-purple-800',
                    'from-pink-50 to-pink-100 border-pink-200 text-pink-600 text-pink-800'
                  ];
                  const colorClass = colors[index % colors.length];
                  const [bgClass, borderClass, titleColor, textColor] = colorClass.split(' ');
                  
                  const hasPosts = daySchedule.posts && daySchedule.posts.length > 0;
                  
                  return (
                    <div key={daySchedule.day} className={`bg-gradient-to-br ${bgClass} ${borderClass} border rounded-lg p-4 ${!hasPosts ? 'opacity-50' : ''}`}>
                      <div className="flex items-center mb-3">
                        <span className={`text-lg font-bold ${titleColor} mr-2`}>{daySchedule.day}</span>
                        <span className={`text-sm font-medium ${textColor}`}>{daySchedule.dayName}</span>
                        {!hasPosts && (
                          <span className="ml-auto text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                            投稿なし
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {hasPosts ? (
                          daySchedule.posts.map((post, postIndex: number) => (
                            <div key={postIndex} className={`bg-white bg-opacity-60 p-2 rounded text-sm ${textColor}`}>
                              {post.emoji} {post.title}
                              <div className="text-xs opacity-75 mt-1">{post.description}</div>
                            </div>
                          ))
                        ) : (
                          <div className={`text-center py-4 text-sm ${textColor} opacity-60`}>
                            <div className="text-2xl mb-1">😴</div>
                            <div>この日は投稿しません</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📅</div>
                <p>「AIでスケジュールを生成」ボタンを押して、あなたに最適な投稿スケジュールを作成しましょう</p>
              </div>
            )}
          </div>

          {/* スケジュール生成ボタン */}
          <div className="mb-6">
            <button 
              onClick={generateSchedule}
              disabled={isGeneratingSchedule}
              className="px-6 py-3 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingSchedule ? '🔄 生成中...' : '🤖 AIでスケジュールを生成'}
            </button>
            {scheduleError && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {scheduleError}
              </div>
            )}
          </div>

          {/* アクションボタン */}
          <div className="flex space-x-3">
            <button className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors">
              📅 スケジュールを保存
            </button>
            <button 
              onClick={generateSchedule}
              disabled={isGeneratingSchedule}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              🔄 再生成
            </button>
            <button className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              ✏️ カスタマイズ
            </button>
          </div>
        </div>

        {/* 2カラムレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左カラム: リール投稿エディター */}
          <div>
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
            onSave={() => {
              // 保存処理（実装が必要）
              console.log('保存:', { postContent, postTitle, selectedHashtags, postType });
            }}
            onClear={() => {
              setPostContent('');
              setPostTitle('');
              setSelectedHashtags([]);
              setPostImage(null);
              setScheduledDate('');
              setScheduledTime('');
            }}
            showActionButtons={true}
            onVideoStructureGenerate={generateVideoStructure}
            videoStructure={videoStructure}
            videoFlow={videoFlow}
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
            />
          </div>
        </div>

      </div>
    </SNSLayout>
  );
}
