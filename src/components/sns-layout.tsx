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
  customTitle?: string;
  customDescription?: string;
  isOnboarding?: boolean;
}

export default function SNSLayout({ children, currentSNS, customTitle, customDescription, isOnboarding = false }: SNSLayoutProps) {
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
            <div className="text-2xl font-bold text-gray-900">
              Signal<span style={{ color: '#FF8A15' }}>.</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-1">SNS管理プラットフォーム</p>
        </div>

        {/* 初期設定警告バナー */}
        {isOnboarding && (
          <div className="mx-4 mt-4 p-3 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-lg">⚠️</span>
              <span className="text-sm font-bold text-orange-800">初期設定必須</span>
            </div>
            <p className="text-xs text-orange-700 leading-relaxed">
              初期設定を完了するまで、他のページにアクセスできません
            </p>
          </div>
        )}

        {/* 共通メニュー */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">共通メニュー</h3>
          <nav className="space-y-1">
            <Link 
              href={isOnboarding ? "#" : "/notifications"}
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg ${
                isOnboarding 
                  ? 'text-gray-400 cursor-not-allowed opacity-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={(e) => isOnboarding && e.preventDefault()}
            >
              <span>🔔</span>
              <span>お知らせ</span>
              {!isOnboarding && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link 
              href={isOnboarding ? "#" : "/guide"}
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg ${
                isOnboarding 
                  ? 'text-gray-400 cursor-not-allowed opacity-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={(e) => isOnboarding && e.preventDefault()}
            >
              <span>📖</span>
              <span>使い方ガイド</span>
            </Link>
            <Link 
              href={isOnboarding ? "#" : "/dashboard"}
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg ${
                isOnboarding 
                  ? 'text-gray-400 cursor-not-allowed opacity-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={(e) => isOnboarding && e.preventDefault()}
            >
              <span>👤</span>
              <span>マイアカウント</span>
            </Link>
            <Link 
              href={isOnboarding ? "#" : "/terms"}
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg ${
                isOnboarding 
                  ? 'text-gray-400 cursor-not-allowed opacity-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={(e) => isOnboarding && e.preventDefault()}
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
                  onClick={() => !isOnboarding && handleSNSSwitch(snsKey)}
                  disabled={isOnboarding}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    isOnboarding
                      ? 'text-gray-400 cursor-not-allowed opacity-50'
                      : isActive 
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
            <Link 
              href={isOnboarding ? "#" : `/${currentSNS}/plan`}
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg ${
                isOnboarding 
                  ? 'text-gray-400 cursor-not-allowed opacity-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={(e) => {
                if (isOnboarding) {
                  e.preventDefault();
                } else {
                  console.log('🔗 運用計画Linkがクリックされました', { currentSNS, href: `/${currentSNS}/plan` });
                }
              }}
            >
              <span>📋</span>
              <span>運用計画</span>
            </Link>
            <Link 
              href={isOnboarding ? "#" : `/${currentSNS}/lab`}
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg ${
                isOnboarding 
                  ? 'text-gray-400 cursor-not-allowed opacity-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={(e) => isOnboarding && e.preventDefault()}
            >
              <span>🧪</span>
              <span>投稿ラボ</span>
            </Link>
            <Link 
              href={isOnboarding ? "#" : `/${currentSNS}/analytics`}
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg ${
                isOnboarding 
                  ? 'text-gray-400 cursor-not-allowed opacity-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={(e) => isOnboarding && e.preventDefault()}
            >
              <span>📊</span>
              <span>投稿分析</span>
            </Link>
            <Link 
              href={isOnboarding ? "#" : `/${currentSNS}/monthly-report`}
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg ${
                isOnboarding 
                  ? 'text-gray-400 cursor-not-allowed opacity-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={(e) => isOnboarding && e.preventDefault()}
            >
              <span>📈</span>
              <span>月次レポート</span>
            </Link>
            {/* AIチャット（右下ウィジェットで代替）
            <Link 
              href={`/${currentSNS}/ai-chat`}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <span>🤖</span>
              <span>AIチャット</span>
            </Link>
            */}
            {/* AI学習進捗（一時的に無効化）
            <Link 
              href={`/${currentSNS}/ai-learning`}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <span>🧠</span>
              <span>AI学習進捗</span>
            </Link>
            */}
            <Link 
              href={isOnboarding ? "#" : `/${currentSNS}/posts`}
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg ${
                isOnboarding 
                  ? 'text-gray-400 cursor-not-allowed opacity-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={(e) => isOnboarding && e.preventDefault()}
            >
              <span>📚</span>
              <span>投稿一覧</span>
            </Link>
            <Link 
              href="/terms"
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <span>📄</span>
              <span>利用規約</span>
            </Link>
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
      <div className="flex-1">
        {/* タイトルセクション */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full ${currentSNSInfo.color} flex items-center justify-center text-white`}>
              {currentSNSInfo.icon}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {customTitle || `${currentSNSInfo.name} Dashboard`}
              </h1>
              <p className="text-sm text-gray-600">{customDescription || currentSNSInfo.description}</p>
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
