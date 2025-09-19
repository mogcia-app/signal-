'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/auth-context';
import { useUserProfile } from '../hooks/useUserProfile';
import { useSNSSettings } from '../hooks/useSNSSettings';
import { ReactNode } from 'react';

// SNS情報の定義
const SNS_INFO = {
  instagram: {
    name: 'Instagram',
    icon: '📷',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    description: '写真・動画投稿プラットフォーム'
  },
  x: {
    name: 'X (Twitter)',
    icon: '🐦',
    color: 'bg-gradient-to-r from-blue-400 to-blue-600',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: '短文投稿・リアルタイム情報共有'
  },
  youtube: {
    name: 'YouTube',
    icon: '📺',
    color: 'bg-gradient-to-r from-red-500 to-red-700',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    description: '動画配信・チャンネル運営'
  },
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    color: 'bg-gradient-to-r from-black to-gray-800',
    textColor: 'text-gray-800',
    bgColor: 'bg-gray-50',
    description: 'ショート動画・エンターテイメント'
  }
};

interface SNSLayoutProps {
  children: ReactNode;
  currentSNS: keyof typeof SNS_INFO;
}

export default function SNSLayout({ children, currentSNS }: SNSLayoutProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { userProfile } = useUserProfile();
  const { snsNames } = useSNSSettings();
  
  const currentSNSInfo = SNS_INFO[currentSNS];

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const handleSNSSwitch = (snsKey: string) => {
    router.push(`/dashboard/${snsKey}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* サイドバー */}
      <div className="w-64 bg-white shadow-lg">
        {/* ロゴ・ブランディング */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="text-2xl font-bold text-gray-900">🔥 Signal</div>
          </div>
          <p className="text-sm text-gray-600 mt-1">SNS管理プラットフォーム</p>
        </div>

        {/* 現在のSNS */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full ${currentSNSInfo.color} flex items-center justify-center text-white text-lg`}>
              {currentSNSInfo.icon}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{currentSNSInfo.name}</div>
              <div className="text-xs text-gray-500">{currentSNSInfo.description}</div>
            </div>
          </div>
        </div>

        {/* SNS切り替え */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">SNS切り替え</h3>
          <div className="space-y-2">
            {snsNames.map((snsKey) => {
              const snsInfo = SNS_INFO[snsKey as keyof typeof SNS_INFO];
              if (!snsInfo) return null;
              
              const isActive = snsKey === currentSNS;
              
              return (
                <button
                  key={snsKey}
                  onClick={() => handleSNSSwitch(snsKey)}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    isActive 
                      ? `${snsInfo.bgColor} ${snsInfo.textColor} font-medium` 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-lg">{snsInfo.icon}</span>
                  <span className="text-sm">{snsInfo.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ナビゲーションメニュー */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">メニュー</h3>
          <nav className="space-y-1">
            <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              <span>📊</span>
              <span>ダッシュボード</span>
            </button>
            <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              <span>📝</span>
              <span>投稿管理</span>
            </button>
            <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              <span>📈</span>
              <span>分析レポート</span>
            </button>
            <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              <span>⚙️</span>
              <span>AI設定</span>
            </button>
            <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              <span>🔔</span>
              <span>通知</span>
            </button>
          </nav>
        </div>

        {/* ユーザー情報 */}
        <div className="p-4 mt-auto">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {userProfile?.name || user?.email}
              </div>
              <div className="text-xs text-gray-500">
                {userProfile?.usageType === 'team' ? 'チーム利用' : '個人利用'}
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center space-x-2"
          >
            <span>🚪</span>
            <span>ログアウト</span>
          </button>
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex-1 flex flex-col">
        {/* ヘッダー */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-8 h-8 rounded-full ${currentSNSInfo.color} flex items-center justify-center text-white`}>
                  {currentSNSInfo.icon}
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {currentSNSInfo.name} Dashboard
                  </h1>
                  <p className="text-sm text-gray-600">{currentSNSInfo.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/sns-select')}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                >
                  SNS選択
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                >
                  全体ダッシュボード
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
