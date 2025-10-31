'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SNSLayout from '../../../../components/sns-layout';
import PostEditor from '../components/PostEditor';
import ToolPanel from '../components/ToolPanel';
import { usePlanData } from '../../../../hooks/usePlanData';
import { useAuth } from '../../../../contexts/auth-context';

export default function StoryLabPage() {
  const [postContent, setPostContent] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [postType] = useState<'feed' | 'reel' | 'story'>('story');
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
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  
  // 計画データを取得
  const { planData } = usePlanData('instagram');
  const { user } = useAuth();
  
  // 投稿データを取得する関数
  const fetchPostData = useCallback(async (postId: string) => {
    if (!user?.uid) return;
    
    try {
      const { auth } = await import('../../../../lib/firebase');
      const token = await auth.currentUser?.getIdToken();
      
      const response = await fetch(`/api/posts?userId=${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-id': user.uid,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('API Response:', result);
      
      if (result.posts && Array.isArray(result.posts)) {
        const post = result.posts.find((p: { id: string }) => p.id === postId);
        console.log('Found post for editing:', post);
        
        if (post) {
          // 投稿データをフォームに設定
          console.log('Setting form data:', {
            title: post.title,
            content: post.content,
            hashtags: post.hashtags,
            scheduledDate: post.scheduledDate,
            scheduledTime: post.scheduledTime,
            imageData: post.imageData ? 'exists' : 'none'
          });
          
          setPostTitle(post.title || '');
          setPostContent(post.content || '');
          
          // ハッシュタグを配列に変換
          const hashtags = Array.isArray(post.hashtags) ? post.hashtags : 
                          (typeof post.hashtags === 'string' ? 
                            post.hashtags.split(' ').filter((tag: string) => tag.trim() !== '').map((tag: string) => tag.replace('#', '')) : 
                            []);
          setSelectedHashtags(hashtags);
          
          // スケジュール情報を設定
          if (post.scheduledDate) {
            const scheduledDate = post.scheduledDate instanceof Date ? post.scheduledDate : 
                                typeof post.scheduledDate === 'string' ? new Date(post.scheduledDate) :
                                post.scheduledDate?.toDate ? post.scheduledDate.toDate() : null;
            if (scheduledDate) {
              setScheduledDate(scheduledDate.toISOString().split('T')[0]);
            }
          }
          
          if (post.scheduledTime) {
            setScheduledTime(post.scheduledTime);
          }
          
          // 画像データを設定
          if (post.imageData) {
            setPostImage(post.imageData);
          }
          
          console.log('Form data set successfully');
        } else {
          console.error('Post not found with ID:', postId);
        }
      } else {
        console.error('Invalid API response structure:', result);
      }
    } catch (error) {
      console.error('投稿データ取得エラー:', error);
    }
  }, [user?.uid]);

  // URLパラメータから投稿IDを取得して投稿データを読み込む
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get('edit');
      const postId = urlParams.get('postId');
      
      console.log('URL parameters:', { editId, postId });
      
      // editまたはpostIdパラメータがある場合に投稿データを取得
      const targetId = editId || postId;
      if (targetId && user?.uid) {
        console.log('Loading post data for ID:', targetId);
        fetchPostData(targetId);
      }
    }
  }, [user?.uid, fetchPostData]);
  
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
      const scheduleResponse = await fetch('/api/instagram/story-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Bearer ${idToken}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
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
          scheduleType: 'story',
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
      const response = await fetch(`/api/instagram/schedule-save?userId=${user.uid}&scheduleType=story`, {
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
    
    setIsGeneratingSuggestions(true);
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
      const suggestionsResponse = await fetch('/api/instagram/story-suggestions', {
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
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }, [user]);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (user?.uid) {
      fetchAnalytics();
      loadSavedSchedule(); // 保存されたスケジュールを読み込み
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  if (!isMounted) {
    return null;
  }

  return (
    <SNSLayout 
      customTitle="ストーリーラボ" 
      customDescription="Instagramストーリーの作成・編集"
    >
      <div className="space-y-6">
        {/* ストーリー投稿計画提案 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <span className="text-2xl mr-3">📅</span>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">ストーリー投稿計画</h2>
              <p className="text-sm text-gray-600">1ヶ月のストーリー投稿スケジュールを提案します</p>
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
                  <option value="4">4回（週1回）</option>
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
                  const hasPosts = daySchedule.posts && daySchedule.posts.length > 0;
                  
                  return (
                    <div 
                      key={daySchedule.day} 
                      className={`border-2 p-4 ${
                        hasPosts 
                          ? 'bg-orange-50 border-orange-300' 
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <div className="flex items-center mb-3">
                        <span className={`text-lg font-bold mr-2 ${
                          hasPosts ? 'text-orange-800' : 'text-gray-600'
                        }`}>
                          {daySchedule.day}
                        </span>
                        <span className={`text-sm font-medium ${
                          hasPosts ? 'text-orange-700' : 'text-gray-500'
                        }`}>
                          {daySchedule.dayName}
                        </span>
                        {!hasPosts && (
                          <span className="ml-auto text-xs text-gray-600 bg-gray-200 px-2 py-1">
                            投稿なし
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {hasPosts ? (
                          daySchedule.posts.map((post, postIndex: number) => (
                            <div key={postIndex} className="bg-white bg-opacity-80 p-2 text-sm text-gray-800">
                              {post.emoji} {post.title}
                              <div className="text-xs text-gray-600 mt-1">{post.description}</div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-sm text-gray-500">
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
                  className="px-6 py-3 bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4 flex items-center justify-center gap-2 mx-auto"
                >
                  {isGeneratingSchedule && (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  <span>{isGeneratingSchedule ? '生成中...' : 'AIでスケジュールを生成'}</span>
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
              className="px-4 py-2 bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSavingSchedule && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{isSavingSchedule ? '保存中...' : '📅 スケジュールを保存'}</span>
            </button>
            <button 
              onClick={generateSchedule}
              disabled={isGeneratingSchedule}
              className="px-4 py-2 text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingSchedule && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{isGeneratingSchedule ? '生成中...' : '🔄 再生成'}</span>
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

        {/* ストーリー投稿エディター */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左カラム: ストーリー投稿エディター */}
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
              aiPromptPlaceholder="例:お店の雰囲気✨、スタッフ紹介👋、限定情報💫など..."
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
            isGeneratingSuggestions={isGeneratingSuggestions}
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
