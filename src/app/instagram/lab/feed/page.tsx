'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SNSLayout from '../../../../components/sns-layout';
import PostEditor from '../components/PostEditor';
import ToolPanel from '../components/ToolPanel';
import { usePlanData } from '../../../../hooks/usePlanData';
import { useAuth } from '../../../../contexts/auth-context';

export default function FeedLabPage() {
  const [postContent, setPostContent] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [postType] = useState<'feed' | 'reel' | 'story'>('feed');
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
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // AIヒント関連の状態
  const [imageVideoSuggestions, setImageVideoSuggestions] = useState('');
  
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
      const scheduleResponse = await fetch('/api/instagram/feed-schedule', {
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

  // スケジュール保存関数
  const saveSchedule = useCallback(async () => {
    if (!user?.uid || generatedSchedule.length === 0) {
      setSaveMessage('スケジュールが生成されていません');
      return;
    }
    
    setIsSavingSchedule(true);
    setSaveMessage('');
    
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
      
      // スケジュール保存APIを呼び出し
      const saveResponse = await fetch('/api/instagram/schedule-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId: user.uid,
          scheduleType: 'feed',
          scheduleData: generatedSchedule,
          monthlyPosts,
          dailyPosts,
          businessInfo: businessData.businessInfo
        }),
      });
      
      if (!saveResponse.ok) {
        throw new Error('スケジュール保存に失敗しました');
      }
      
      const saveData = await saveResponse.json();
      setSaveMessage('✅ スケジュールが保存されました！');
      
    } catch (error) {
      console.error('スケジュール保存エラー:', error);
      setSaveMessage('❌ スケジュール保存に失敗しました');
    } finally {
      setIsSavingSchedule(false);
    }
  }, [user, generatedSchedule, monthlyPosts, dailyPosts]);

  // 保存されたスケジュールを読み込む関数
  const loadSavedSchedule = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/instagram/schedule-save?userId=${user.uid}&scheduleType=feed`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'x-user-id': user.uid,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.schedule) {
          setGeneratedSchedule(result.schedule.schedule || []);
          setMonthlyPosts(result.schedule.monthlyPosts || 8);
          setDailyPosts(result.schedule.dailyPosts || 1);
          setSaveMessage('✅ 保存されたスケジュールを読み込みました');
        }
      }
    } catch (error) {
      console.error('スケジュール読み込みエラー:', error);
    }
  }, [user]);
  
  // AIヒント生成関数
  const generateImageVideoSuggestions = useCallback(async (content: string) => {
    if (!user?.uid) return;
    
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
      
      // AIヒントを生成
      const suggestionsResponse = await fetch('/api/instagram/feed-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          content,
          businessInfo: businessData.businessInfo
        }),
      });
      
      if (!suggestionsResponse.ok) {
        throw new Error('AIヒントの生成に失敗しました');
      }
      
      const suggestionsData = await suggestionsResponse.json();
      setImageVideoSuggestions(suggestionsData.suggestions);
      
    } catch (error) {
      console.error('AIヒント生成エラー:', error);
    }
  }, [user]);
  
  useEffect(() => {
    setIsMounted(true);
    fetchAnalytics();
    loadSavedSchedule(); // 保存されたスケジュールを読み込み
  }, [fetchAnalytics, loadSavedSchedule]);

  if (!isMounted) {
    return null;
  }

  return (
    <SNSLayout 
      customTitle="フィードラボ" 
      customDescription="Instagramフィード投稿の作成・編集"
    >
      <div className="space-y-6">
        {/* フィード投稿計画提案 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <span className="text-2xl mr-3">📅</span>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">フィード投稿計画</h2>
              <p className="text-sm text-gray-600">1ヶ月のフィード投稿スケジュールを提案します</p>
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
                  <option value="8">8回（週2回）</option>
                  <option value="12">12回（週3回）</option>
                  <option value="16">16回（週4回）</option>
                  <option value="20">20回（週5回）</option>
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
                <button 
                  onClick={generateSchedule}
                  disabled={isGeneratingSchedule}
                  className="px-6 py-3 bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4"
                >
                  {isGeneratingSchedule ? '生成中...' : 'AIでスケジュールを生成'}
                </button>
                <p>あなたに最適な投稿スケジュールを作成しましょう</p>
                {scheduleError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                    {scheduleError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* アクションボタン */}
          <div className="flex space-x-3">
            <button 
              onClick={saveSchedule}
              disabled={isSavingSchedule || generatedSchedule.length === 0}
              className="px-4 py-2 bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSavingSchedule ? '💾 保存中...' : '📅 スケジュールを保存'}
            </button>
            <button 
              onClick={generateSchedule}
              disabled={isGeneratingSchedule}
              className="px-4 py-2 text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              🔄 再生成
            </button>
            <button 
              onClick={loadSavedSchedule}
              className="px-4 py-2 text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              📂 保存済みを読み込み
            </button>
          </div>
          
          {/* 保存メッセージ */}
          {saveMessage && (
            <div className={`mt-3 p-3 rounded-md text-sm ${
              saveMessage.includes('✅') 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {saveMessage}
            </div>
          )}
        </div>

        {/* 2カラムレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左カラム: フィード投稿エディター */}
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
            aiPromptPlaceholder="例: 新商品の紹介、ブランドストーリー、お客様の声、会社の取り組みなど..."
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
            imageVideoSuggestions={imageVideoSuggestions}
            onImageVideoSuggestionsGenerate={generateImageVideoSuggestions}
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
