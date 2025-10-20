'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/auth-context';
import { useUserProfile } from '../hooks/useUserProfile';
import { useSNSSettings } from '../hooks/useSNSSettings';
import { ReactNode, useState, useEffect, useCallback } from 'react';

// SNS情報の定義
const SNS_INFO = {
  instagram: {
    name: 'Instagram',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    description: '写真・動画投稿プラットフォーム'
  },
  x: {
    name: 'X (Twitter)',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    color: 'bg-gradient-to-r from-blue-400 to-blue-600',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: '短文投稿・リアルタイム情報共有'
  },
  youtube: {
    name: 'YouTube',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    color: 'bg-gradient-to-r from-red-500 to-red-700',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    description: '動画配信・チャンネル運営'
  },
  tiktok: {
    name: 'TikTok',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ),
    color: 'bg-gradient-to-r from-black to-gray-800',
    textColor: 'text-gray-800',
    bgColor: 'bg-gray-50',
    description: 'ショート動画・エンターテイメント'
  }
};

interface SNSLayoutProps {
  children: ReactNode;
  currentSNS: keyof typeof SNS_INFO;
  customTitle?: string;
  customDescription?: string;
  isOnboarding?: boolean;
}

export default function SNSLayout({ children, currentSNS, customTitle, customDescription }: SNSLayoutProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const { user, signOut } = useAuth();
  const { userProfile } = useUserProfile();
  const { snsNames } = useSNSSettings();
  
  const currentSNSInfo = SNS_INFO[currentSNS];

  // SNSアクセス時にセッションストレージに記録
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('lastAccessedSNS', currentSNS);
      console.log(`📝 SNSアクセス記録: ${currentSNS}`);
    }
  }, [currentSNS]);

  // 未読通知数を取得する関数
  const fetchUnreadCount = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      // Firebase認証トークンを取得
      const { auth } = await import('../lib/firebase');
      const token = await auth.currentUser?.getIdToken();
      
      const response = await fetch(`/api/notifications?userId=${user.uid}&filter=unread`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setUnreadCount(result.data?.length || 0);
      } else {
        // エラーの詳細をログに出力（開発時のみ）
        if (process.env.NODE_ENV === 'development') {
          console.warn('未読通知数取得エラー:', {
            error: result.error,
            details: result.details,
            timestamp: result.timestamp
          });
        }
        // エラーの場合も0件として扱う（ユーザー体験を損なわない）
        setUnreadCount(0);
      }
    } catch (error) {
      // ネットワークエラーなどの場合
      if (process.env.NODE_ENV === 'development') {
        console.warn('未読通知数の取得エラー:', error);
      }
      setUnreadCount(0);
    }
  }, [user?.uid]);

  // コンポーネントマウント時に未読通知数を取得
  useEffect(() => {
    fetchUnreadCount();
    
    // 30秒ごとに未読通知数を更新
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, [user?.uid, fetchUnreadCount]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const handleSNSSwitch = (snsKey: string) => {
    router.push(`/${snsKey}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* サイドバー */}
      <div className="w-64 bg-white shadow-lg">
        {/* ロゴ・ブランディング */}
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="flex items-center">
            <div className="text-2xl font-bold text-black">
              Signal<span style={{ color: '#FF8A15' }}>.</span>
            </div>
          </div>
          <p className="text-sm text-black mt-1">SNS管理プラットフォーム</p>
        </div>

        {/* 共通メニュー */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">共通メニュー</h3>
          <nav className="space-y-1">
            <Link 
              href="/onboarding"
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg"
            >
              <span>👤</span>
              <span>マイアカウント</span>
            </Link>
            <Link 
              href="/notifications"
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg"
            >
              <span>🔔</span>
              <span>お知らせ</span>
              {unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link 
              href="/guide"
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg"
            >
              <span>📖</span>
              <span>使い方ガイド</span>
            </Link>
            <Link 
              href="/terms"
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg"
            >
              <span>📄</span>
              <span>利用規約</span>
            </Link>
          </nav>
        </div>

        {/* 現在のSNS */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full ${currentSNSInfo.color} flex items-center justify-center text-white text-lg`}>
              {currentSNSInfo.icon}
            </div>
            <div>
              <div className="font-semibold text-black">{currentSNSInfo.name}</div>
              <div className="text-xs text-black">{currentSNSInfo.description}</div>
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
                      : 'text-black hover:bg-gray-100'
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
            <Link 
              href={`/${currentSNS}/plan`}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg"
              onClick={() => console.log('🔗 運用計画Linkがクリックされました', { currentSNS, href: `/${currentSNS}/plan` })}
            >
              <span>📋</span>
              <span>運用計画</span>
            </Link>
            <Link 
              href={`/${currentSNS}/lab`}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg"
            >
              <span>🧪</span>
              <span>投稿ラボ</span>
            </Link>
            <Link 
              href={`/${currentSNS}/analytics`}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg"
            >
              <span>📊</span>
              <span>投稿分析</span>
            </Link>
            <Link 
              href={`/${currentSNS}/monthly-report`}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg"
            >
              <span>📈</span>
              <span>月次レポート</span>
            </Link>
            {/* AIチャット（右下ウィジェットで代替）
            <Link 
              href={`/${currentSNS}/ai-chat`}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg"
            >
              <span>🤖</span>
              <span>AIチャット</span>
            </Link>
            */}
            {/* AI学習進捗（一時的に無効化）
            <Link 
              href={`/${currentSNS}/ai-learning`}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg"
            >
              <span>🧠</span>
              <span>AI学習進捗</span>
            </Link>
            */}
            <Link 
              href={`/${currentSNS}/posts`}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg"
            >
              <span>📚</span>
              <span>投稿一覧</span>
            </Link>
          </nav>
        </div>

        {/* ユーザー情報 */}
        <div className="p-4 mt-auto">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-black">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-black truncate">
                {userProfile?.name || user?.email}
              </div>
              <div className="text-xs text-black">
                {userProfile?.usageType === 'team' ? 'チーム利用' : '個人利用'}
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg flex items-center space-x-2"
          >
            <span>🚪</span>
            <span>ログアウト</span>
          </button>
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex-1">
        {/* タイトルセクション */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full ${currentSNSInfo.color} flex items-center justify-center text-white`}>
              {currentSNSInfo.icon}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-black">
                {customTitle || `${currentSNSInfo.name} Dashboard`}
              </h1>
              <p className="text-sm text-black">{customDescription || currentSNSInfo.description}</p>
            </div>
          </div>
        </div>
        
        {/* メインコンテンツ */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
