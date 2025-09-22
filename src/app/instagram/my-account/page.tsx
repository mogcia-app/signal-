'use client';

import React, { useState, useEffect } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { 
  User, 
  Mail, 
  Camera, 
  Save, 
  Eye, 
  EyeOff, 
  Settings, 
  Bell, 
  Globe, 
  Palette,
  Instagram,
  Twitter,
  Youtube,
  Music,
  Link,
  Unlink,
  Shield,
  Key,
  Trash2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface UserProfile {
  id?: string;
  userId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  preferences: {
    theme: 'light' | 'dark';
    language: string;
    notifications: boolean;
  };
  socialAccounts: {
    instagram?: {
      username: string;
      connected: boolean;
    };
    twitter?: {
      username: string;
      connected: boolean;
    };
    youtube?: {
      username: string;
      connected: boolean;
    };
    tiktok?: {
      username: string;
      connected: boolean;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export default function MyAccountPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'security' | 'social'>('profile');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // フォームデータ
  const [profileData, setProfileData] = useState({
    displayName: '',
    bio: '',
    avatarUrl: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [settingsData, setSettingsData] = useState({
    theme: 'light' as 'light' | 'dark',
    language: 'ja',
    notifications: true
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      // モックデータを使用（実際の実装ではAPIから取得）
      const mockProfile: UserProfile = {
        id: '1',
        userId: 'current-user',
        email: 'user@example.com',
        displayName: '田中太郎',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        bio: 'Instagramマーケティングの専門家。ブランド成長のお手伝いをしています。',
        preferences: {
          theme: 'light',
          language: 'ja',
          notifications: true
        },
        socialAccounts: {
          instagram: { username: '@tanaka_marketing', connected: true },
          twitter: { username: '@tanaka_twitter', connected: true },
          youtube: { username: '田中マーケティングチャンネル', connected: false },
          tiktok: { username: '@tanaka_tiktok', connected: false }
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-20T10:00:00Z'
      };

      setUserProfile(mockProfile);
      setProfileData({
        displayName: mockProfile.displayName || '',
        bio: mockProfile.bio || '',
        avatarUrl: mockProfile.avatarUrl || ''
      });
      setSettingsData({
        theme: mockProfile.preferences.theme,
        language: mockProfile.preferences.language,
        notifications: mockProfile.preferences.notifications
      });
    } catch (error) {
      console.error('プロファイル取得エラー:', error);
      setMessage({ type: 'error', text: 'プロファイルの取得に失敗しました' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      
      // 実際の実装ではAPIを呼び出し
      // await fetch('/api/users', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     userId: 'current-user',
      //     displayName: profileData.displayName,
      //     bio: profileData.bio,
      //     avatarUrl: profileData.avatarUrl
      //   })
      // });

      // モック更新
      setUserProfile(prev => prev ? {
        ...prev,
        displayName: profileData.displayName,
        bio: profileData.bio,
        avatarUrl: profileData.avatarUrl,
        updatedAt: new Date().toISOString()
      } : null);

      setMessage({ type: 'success', text: 'プロファイルが更新されました' });
    } catch (error) {
      console.error('プロファイル更新エラー:', error);
      setMessage({ type: 'error', text: 'プロファイルの更新に失敗しました' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: '新しいパスワードが一致しません' });
      return;
    }

    try {
      setIsSaving(true);
      
      // 実際の実装ではAPIを呼び出し
      // await fetch('/api/auth/change-password', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     currentPassword: passwordData.currentPassword,
      //     newPassword: passwordData.newPassword
      //   })
      // });

      setMessage({ type: 'success', text: 'パスワードが変更されました' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('パスワード変更エラー:', error);
      setMessage({ type: 'error', text: 'パスワードの変更に失敗しました' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      
      // 実際の実装ではAPIを呼び出し
      // await fetch('/api/users', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     userId: 'current-user',
      //     preferences: settingsData
      //   })
      // });

      // モック更新
      setUserProfile(prev => prev ? {
        ...prev,
        preferences: settingsData,
        updatedAt: new Date().toISOString()
      } : null);

      setMessage({ type: 'success', text: '設定が保存されました' });
    } catch (error) {
      console.error('設定保存エラー:', error);
      setMessage({ type: 'error', text: '設定の保存に失敗しました' });
    } finally {
      setIsSaving(false);
    }
  };

  const connectSocialAccount = async (platform: string) => {
    try {
      // 実際の実装ではOAuth認証を実装
      console.log(`${platform}アカウントを接続中...`);
      setMessage({ type: 'success', text: `${platform}アカウントが接続されました` });
    } catch (error) {
      console.error('ソーシャルアカウント接続エラー:', error);
      setMessage({ type: 'error', text: 'アカウントの接続に失敗しました' });
    }
  };

  const disconnectSocialAccount = async (platform: string) => {
    try {
      // 実際の実装ではAPIを呼び出し
      console.log(`${platform}アカウントを切断中...`);
      setMessage({ type: 'success', text: `${platform}アカウントが切断されました` });
    } catch (error) {
      console.error('ソーシャルアカウント切断エラー:', error);
      setMessage({ type: 'error', text: 'アカウントの切断に失敗しました' });
    }
  };

  const deleteAccount = async () => {
    if (!confirm('アカウントを削除しますか？この操作は取り消せません。')) {
      return;
    }

    try {
      // 実際の実装ではAPIを呼び出し
      console.log('アカウント削除中...');
      setMessage({ type: 'success', text: 'アカウントが削除されました' });
    } catch (error) {
      console.error('アカウント削除エラー:', error);
      setMessage({ type: 'error', text: 'アカウントの削除に失敗しました' });
    }
  };

  if (isLoading) {
    return (
      <SNSLayout 
        currentSNS="instagram"
        customTitle="マイアカウント"
        customDescription="アカウント設定とプロファイル管理"
      >
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">プロファイルを読み込み中...</p>
          </div>
        </div>
      </SNSLayout>
    );
  }

  return (
    <SNSLayout 
      currentSNS="instagram"
      customTitle="マイアカウント"
      customDescription="アカウント設定とプロファイル管理"
    >
      <div className="max-w-4xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <User className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">マイアカウント</h1>
              <p className="text-gray-600 mt-1">プロファイルとアカウント設定を管理</p>
            </div>
          </div>
        </div>

        {/* メッセージ表示 */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-3" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-3" />
            )}
            {message.text}
          </div>
        )}

        {/* タブナビゲーション */}
        <div className="flex space-x-1 border-b border-gray-200 mb-8">
          {[
            { id: 'profile', label: 'プロファイル', icon: <User className="w-4 h-4" /> },
            { id: 'settings', label: '設定', icon: <Settings className="w-4 h-4" /> },
            { id: 'security', label: 'セキュリティ', icon: <Shield className="w-4 h-4" /> },
            { id: 'social', label: 'ソーシャル連携', icon: <Link className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'profile' | 'settings' | 'security' | 'social')}
              className={`flex items-center space-x-2 px-4 py-3 rounded-t-md transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600 font-semibold bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* タブコンテンツ */}
        <div>
          {/* プロファイルタブ */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">プロファイル情報</h2>
              
              <div className="space-y-6">
                {/* アバター */}
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={profileData.avatarUrl || '/default-avatar.png'}
                      alt="アバター"
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                    />
                    <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors">
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{userProfile?.displayName}</h3>
                    <p className="text-gray-600">{userProfile?.email}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      登録日: {new Date(userProfile?.createdAt || '').toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                </div>

                {/* フォーム */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      表示名
                    </label>
                    <input
                      type="text"
                      value={profileData.displayName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="表示名を入力"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      メールアドレス
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={userProfile?.email || ''}
                        className="w-full pl-10 p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                        disabled
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">メールアドレスは変更できません</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    自己紹介
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="自己紹介を入力してください"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? '保存中...' : '保存'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 設定タブ */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">アプリケーション設定</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Palette className="w-4 h-4 inline mr-2" />
                    テーマ
                  </label>
                  <div className="flex space-x-4">
                    {[
                      { value: 'light', label: 'ライト' },
                      { value: 'dark', label: 'ダーク' }
                    ].map((theme) => (
                      <label key={theme.value} className="flex items-center">
                        <input
                          type="radio"
                          name="theme"
                          value={theme.value}
                          checked={settingsData.theme === theme.value}
                          onChange={(e) => setSettingsData(prev => ({ ...prev, theme: e.target.value as 'light' | 'dark' }))}
                          className="mr-2"
                        />
                        {theme.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Globe className="w-4 h-4 inline mr-2" />
                    言語
                  </label>
                  <select
                    value={settingsData.language}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settingsData.notifications}
                      onChange={(e) => setSettingsData(prev => ({ ...prev, notifications: e.target.checked }))}
                      className="mr-3"
                    />
                    <Bell className="w-4 h-4 mr-2" />
                    通知を受け取る
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? '保存中...' : '設定を保存'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* セキュリティタブ */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* パスワード変更 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">パスワード変更</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      現在のパスワード
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="現在のパスワードを入力"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      新しいパスワード
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="新しいパスワードを入力"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      新しいパスワード（確認）
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="新しいパスワードを再入力"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleChangePassword}
                      disabled={isSaving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                      className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Key className="w-4 h-4" />
                      <span>{isSaving ? '変更中...' : 'パスワードを変更'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* アカウント削除 */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-red-900 mb-2">危険な操作</h3>
                <p className="text-red-700 mb-4">
                  アカウントを削除すると、すべてのデータが永久に失われます。この操作は取り消せません。
                </p>
                <button
                  onClick={deleteAccount}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>アカウントを削除</span>
                </button>
              </div>
            </div>
          )}

          {/* ソーシャル連携タブ */}
          {activeTab === 'social' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">ソーシャルアカウント連携</h2>
              
              <div className="space-y-4">
                {[
                  { 
                    platform: 'instagram', 
                    name: 'Instagram', 
                    icon: <Instagram className="w-5 h-5" />,
                    color: 'bg-gradient-to-r from-purple-500 to-pink-500'
                  },
                  { 
                    platform: 'twitter', 
                    name: 'Twitter', 
                    icon: <Twitter className="w-5 h-5" />,
                    color: 'bg-blue-500'
                  },
                  { 
                    platform: 'youtube', 
                    name: 'YouTube', 
                    icon: <Youtube className="w-5 h-5" />,
                    color: 'bg-red-600'
                  },
                  { 
                    platform: 'tiktok', 
                    name: 'TikTok', 
                    icon: <Music className="w-5 h-5" />,
                    color: 'bg-black'
                  }
                ].map((social) => {
                  const account = userProfile?.socialAccounts[social.platform as keyof typeof userProfile.socialAccounts];
                  const isConnected = account?.connected || false;
                  
                  return (
                    <div key={social.platform} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 ${social.color} rounded-full flex items-center justify-center text-white`}>
                          {social.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{social.name}</h3>
                          {isConnected && account?.username && (
                            <p className="text-sm text-gray-600">{account.username}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {isConnected ? (
                          <>
                            <span className="flex items-center text-green-600">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              接続済み
                            </span>
                            <button
                              onClick={() => disconnectSocialAccount(social.platform)}
                              className="flex items-center space-x-1 px-3 py-1 text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                            >
                              <Unlink className="w-4 h-4" />
                              <span>切断</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => connectSocialAccount(social.platform)}
                            className="flex items-center space-x-1 px-3 py-1 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
                          >
                            <Link className="w-4 h-4" />
                            <span>接続</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </SNSLayout>
  );
}
