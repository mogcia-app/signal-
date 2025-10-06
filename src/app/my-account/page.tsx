'use client';

import React, { useState, useEffect } from 'react';
import SNSLayout from '../../components/sns-layout';
import { AIChatWidget } from '../../components/ai-chat-widget';
import { useUserProfile } from '../../hooks/useUserProfile';
import { 
  User, 
  Eye, 
  EyeOff, 
  Shield,
  Key,
  AlertCircle,
  CheckCircle,
  Settings,
  Crown,
  Star,
  TrendingUp,
  Users,
  Smartphone,
  Monitor,
  BarChart3,
  MessageSquare,
  Bell,
  Download,
  Upload,
  Trash2,
  Save,
  ChevronRight
} from 'lucide-react';

// URLからSNSを判定する関数
const getCurrentSNSFromURL = (): 'instagram' | 'x' | 'youtube' | 'tiktok' => {
  if (typeof window === 'undefined') return 'instagram'; // SSR対応
  
  const path = window.location.pathname;
  const snsMatch = path.match(/^\/(instagram|x|youtube|tiktok)/);
  
  if (snsMatch) {
    const sns = snsMatch[1];
    if (sns === 'x') return 'x';
    if (sns === 'youtube') return 'youtube';
    if (sns === 'tiktok') return 'tiktok';
    return 'instagram';
  }
  
  // デフォルトはinstagram
  return 'instagram';
};

export default function MyAccountPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentSNS, setCurrentSNS] = useState<'instagram' | 'x' | 'youtube' | 'tiktok'>('instagram');
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'subscription' | 'usage' | 'preferences'>('profile');

  // URLからSNSを判定して設定
  useEffect(() => {
    const sns = getCurrentSNSFromURL();
    setCurrentSNS(sns);
  }, []);

  // マイアカウントページのマウントログ（シンプル版）
  useEffect(() => {
    console.log('マイアカウントページがマウントされました');
  }, []);

  // 実際のユーザープロフィールデータを取得
  const { 
    userProfile, 
    loading: profileLoading, 
    error: profileError
  } = useUserProfile();

  // プロフィールデータの変更を監視（シンプル版）
  useEffect(() => {
    console.log('マイアカウントページ - プロフィールデータ更新:', {
      userProfile: !!userProfile,
      loading: profileLoading,
      error: profileError
    });
  }, [userProfile, profileLoading, profileError]);

  // プロフィール更新関数
  const handleProfileUpdate = async (updatedData: Record<string, unknown>) => {
    setIsSaving(true);
    setMessage(null);

    try {
      // プロフィール更新のAPIコール
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'プロフィールを更新しました' });
      } else {
        throw new Error('プロフィール更新に失敗しました');
      }
    } catch (error) {
      console.error('プロフィール更新エラー:', error);
      setMessage({ type: 'error', text: 'プロフィールの更新に失敗しました' });
    } finally {
      setIsSaving(false);
    }
  };

  // パスワード変更関数
  const handlePasswordChange = async (passwordData: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: '新しいパスワードが一致しません' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwordData),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'パスワードを変更しました' });
      } else {
        throw new Error('パスワード変更に失敗しました');
      }
    } catch (error) {
      console.error('パスワード変更エラー:', error);
      setMessage({ type: 'error', text: 'パスワードの変更に失敗しました' });
    } finally {
      setIsSaving(false);
    }
  };

  // タブメニュー
  const tabs = [
    { id: 'profile' as const, name: 'プロフィール', icon: <User className="w-4 h-4" /> },
    { id: 'security' as const, name: 'セキュリティ', icon: <Shield className="w-4 h-4" /> },
    { id: 'subscription' as const, name: 'サブスクリプション', icon: <Crown className="w-4 h-4" /> },
    { id: 'usage' as const, name: '利用状況', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'preferences' as const, name: '設定', icon: <Settings className="w-4 h-4" /> }
  ];

  // 利用統計データ（ダミーデータ）
  const usageStats = {
    totalPosts: 156,
    totalLikes: 12450,
    totalFollowers: 2340,
    engagementRate: 4.2,
    monthlyGrowth: 12.5,
    activeDays: 28,
    topPostType: 'feed',
    bestPostingTime: '14:00-16:00'
  };

  // サブスクリプション情報（ダミーデータ）
  const subscriptionInfo = {
    plan: 'Pro',
    status: 'active',
    renewalDate: '2024-02-15',
    features: [
      '無制限投稿作成',
      '詳細分析レポート',
      'AIチャットサポート',
      'カスタムブランディング',
      '優先サポート'
    ],
    usage: {
      postsCreated: 45,
      postsLimit: -1, // 無制限
      apiCalls: 1250,
      apiLimit: 5000
    }
  };

  return (
    <SNSLayout currentSNS={currentSNS} customTitle="マイアカウント" customDescription="アカウント設定と利用状況を管理できます">
      <div className="max-w-4xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">マイアカウント</h1>
          <p className="text-gray-600">アカウント設定、セキュリティ、利用状況を管理できます</p>
        </div>

        {/* メッセージ表示 */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2" />
            )}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* サイドバー */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* プロフィールタブ */}
              {activeTab === 'profile' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">プロフィール情報</h2>
                  
                  {profileLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">読み込み中...</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* 基本情報 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            表示名
                          </label>
                          <input
                            type="text"
                            defaultValue={userProfile?.name || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="表示名を入力"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            メールアドレス
                          </label>
                          <input
                            type="email"
                            defaultValue={userProfile?.email || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="メールアドレスを入力"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          自己紹介
                        </label>
                          <textarea
                            rows={4}
                            defaultValue={String((userProfile as unknown as Record<string, unknown>)?.bio || '')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="自己紹介を入力"
                          />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            利用タイプ
                          </label>
                          <select
                            defaultValue={String((userProfile as unknown as Record<string, unknown>)?.usageType || 'individual')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="individual">個人利用</option>
                            <option value="team">チーム利用</option>
                            <option value="business">ビジネス利用</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            業界
                          </label>
                          <input
                            type="text"
                            defaultValue={String((userProfile as unknown as Record<string, unknown>)?.industry || '')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="業界を入力"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => handleProfileUpdate({})}
                          disabled={isSaving}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          {isSaving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              保存中...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              保存
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* セキュリティタブ */}
              {activeTab === 'security' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">セキュリティ設定</h2>
                  
                  <div className="space-y-6">
                    {/* パスワード変更 */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <Key className="w-5 h-5 mr-2" />
                        パスワード変更
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            現在のパスワード
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                              placeholder="現在のパスワードを入力"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              新しいパスワード
                            </label>
                            <input
                              type="password"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="新しいパスワードを入力"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              パスワード確認
                            </label>
                            <input
                              type="password"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="パスワードを再入力"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={() => handlePasswordChange({ currentPassword: '', newPassword: '', confirmPassword: '' })}
                            disabled={isSaving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            パスワード変更
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 2段階認証 */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <Shield className="w-5 h-5 mr-2" />
                        2段階認証
                      </h3>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-600">アカウントのセキュリティを強化します</p>
                          <p className="text-sm text-gray-500">SMSまたはアプリを使用して認証を行います</p>
                        </div>
                        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                          有効にする
                        </button>
                      </div>
                    </div>

                    {/* ログイン履歴 */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">ログイン履歴</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <div className="flex items-center space-x-3">
                            <Monitor className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Chrome on Windows</p>
                              <p className="text-xs text-gray-500">東京都, 日本</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-900">現在</p>
                            <p className="text-xs text-gray-500">2分前</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <div className="flex items-center space-x-3">
                            <Smartphone className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Safari on iPhone</p>
                              <p className="text-xs text-gray-500">東京都, 日本</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-900">昨日</p>
                            <p className="text-xs text-gray-500">14:30</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* サブスクリプションタブ */}
              {activeTab === 'subscription' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">サブスクリプション</h2>
                  
                  <div className="space-y-6">
                    {/* 現在のプラン */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <Crown className="w-6 h-6 text-yellow-500" />
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{subscriptionInfo.plan} プラン</h3>
                            <p className="text-sm text-gray-600">アクティブ</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                          {subscriptionInfo.status}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-4">
                        次回更新日: {new Date(subscriptionInfo.renewalDate).toLocaleDateString('ja-JP')}
                      </p>
                      
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        プランを変更
                      </button>
                    </div>

                    {/* プラン機能 */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">含まれる機能</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {subscriptionInfo.features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 利用状況 */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">今月の利用状況</h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">投稿作成</span>
                          <span className="text-sm font-medium text-gray-900">
                            {subscriptionInfo.usage.postsCreated} / {subscriptionInfo.usage.postsLimit === -1 ? '無制限' : subscriptionInfo.usage.postsLimit}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">API呼び出し</span>
                          <span className="text-sm font-medium text-gray-900">
                            {subscriptionInfo.usage.apiCalls} / {subscriptionInfo.usage.apiLimit}
                          </span>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(subscriptionInfo.usage.apiCalls / subscriptionInfo.usage.apiLimit) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 利用状況タブ */}
              {activeTab === 'usage' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">利用状況</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-600 font-medium">総投稿数</p>
                          <p className="text-2xl font-bold text-blue-900">{usageStats.totalPosts}</p>
                        </div>
                        <MessageSquare className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-600 font-medium">総いいね数</p>
                          <p className="text-2xl font-bold text-green-900">{usageStats.totalLikes.toLocaleString()}</p>
                        </div>
                        <Star className="w-8 h-8 text-green-600" />
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-purple-600 font-medium">フォロワー数</p>
                          <p className="text-2xl font-bold text-purple-900">{usageStats.totalFollowers.toLocaleString()}</p>
                        </div>
                        <Users className="w-8 h-8 text-purple-600" />
                      </div>
                    </div>
                    
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-orange-600 font-medium">エンゲージメント率</p>
                          <p className="text-2xl font-bold text-orange-900">{usageStats.engagementRate}%</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-orange-600" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">パフォーマンス</h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">月間成長率</span>
                          <span className="text-sm font-medium text-green-600">+{usageStats.monthlyGrowth}%</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">アクティブ日数</span>
                          <span className="text-sm font-medium text-gray-900">{usageStats.activeDays}日</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">最も効果的な投稿タイプ</span>
                          <span className="text-sm font-medium text-gray-900">{usageStats.topPostType}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">最適な投稿時間</span>
                          <span className="text-sm font-medium text-gray-900">{usageStats.bestPostingTime}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">最近の活動</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">新しい投稿を作成</p>
                            <p className="text-xs text-gray-500">2時間前</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">分析レポートを確認</p>
                            <p className="text-xs text-gray-500">5時間前</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">運用計画を更新</p>
                            <p className="text-xs text-gray-500">1日前</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 設定タブ */}
              {activeTab === 'preferences' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">設定</h2>
                  
                  <div className="space-y-6">
                    {/* 通知設定 */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <Bell className="w-5 h-5 mr-2" />
                        通知設定
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">メール通知</p>
                            <p className="text-xs text-gray-500">重要な更新やお知らせをメールで受け取る</p>
                          </div>
                          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                            <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6" />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">プッシュ通知</p>
                            <p className="text-xs text-gray-500">ブラウザからの通知を受け取る</p>
                          </div>
                          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                            <span className="inline-block h-4 w-4 transform rounded-full bg-white transition" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* データ設定 */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">データ管理</h3>
                      
                      <div className="space-y-3">
                        <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <Download className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-gray-900">データをエクスポート</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                        
                        <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <Upload className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-gray-900">データをインポート</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>

                    {/* アカウント削除 */}
                    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <h3 className="text-lg font-medium text-red-900 mb-4 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        危険な操作
                      </h3>
                      
                      <p className="text-sm text-red-700 mb-4">
                        アカウントを削除すると、すべてのデータが永久に失われます。
                        この操作は取り消すことができません。
                      </p>
                      
                      <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center">
                        <Trash2 className="w-4 h-4 mr-2" />
                        アカウントを削除
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AIチャットウィジェット */}
      <AIChatWidget />
    </SNSLayout>
  );
}
