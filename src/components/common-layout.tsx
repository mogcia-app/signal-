'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/auth-context';
import { useUserProfile } from '../hooks/useUserProfile';
import { ReactNode, useState, useEffect, useCallback, useMemo } from 'react';

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

interface CommonLayoutProps {
  children: ReactNode;
  customTitle?: string;
  customDescription?: string;
}

export default function CommonLayout({ children, customTitle, customDescription }: CommonLayoutProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentSNS, setCurrentSNS] = useState<string>('instagram');

  const { user, signOut } = useAuth();
  const { 
    userProfile, 
    getContractSNS,
    isContractActive,
    loading: profileLoading 
  } = useUserProfile();
  
  // 認証チェックと契約SNS数の確認（useMemoで最適化）
  const availableSNS = useMemo(() => {
    if (!getContractSNS || !userProfile) return [];
    const contractSNS = getContractSNS();
    return contractSNS && contractSNS.length > 0 ? contractSNS : [];
  }, [getContractSNS, userProfile]);
  
  const hasActiveContract = useMemo(() => {
    if (!isContractActive || !userProfile) return false;
    return isContractActive();
  }, [isContractActive, userProfile]);
  
  // デバッグログ
  console.log('🔍 CommonLayout認証状態:', {
    user: !!user,
    userProfile: !!userProfile,
    hasActiveContract: hasActiveContract,
    availableSNS: availableSNS,
    profileLoading: profileLoading
  });

  // SNS判定のuseEffect（契約済みSNSのみ対象）
  useEffect(() => {
    if (!availableSNS || availableSNS.length === 0) return;
    
    const getCurrentSNS = (): string => {
      if (typeof window === 'undefined') return availableSNS[0] || 'instagram';
      
      // セッションストレージから最後にアクセスしたSNSを取得
      const lastAccessedSNS = sessionStorage.getItem('lastAccessedSNS');
      
      // リファラーから判定
      const referrer = document.referrer;
      
      // リファラーから判定（契約済みSNSのみ）
      for (const sns of availableSNS) {
        if (referrer.includes(`/${sns}/`)) {
          sessionStorage.setItem('lastAccessedSNS', sns);
          return sns;
        }
      }
      
      // リファラーから判定できない場合は、最後にアクセスしたSNSを使用（契約済みかチェック）
      if (lastAccessedSNS && availableSNS.includes(lastAccessedSNS)) {
        return lastAccessedSNS;
      }
      
      // デフォルトは契約済みSNSの最初のもの
      return availableSNS[0] || 'instagram';
    };

    const detectedSNS = getCurrentSNS();
    setCurrentSNS(detectedSNS);
  }, [availableSNS]); // availableSNSが変更された時に再実行

  const currentSNSInfo = SNS_INFO[currentSNS as keyof typeof SNS_INFO] || SNS_INFO.instagram;

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
        console.error('未読通知数取得エラー:', result.error);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('未読通知数の取得エラー:', error);
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
    // 契約済みSNSかチェック
    if (!availableSNS.includes(snsKey)) {
      console.warn('⚠️ 契約していないSNSへの切り替えを試行:', snsKey);
      return;
    }
    
    console.log('🔄 SNS切り替え:', { from: currentSNS, to: snsKey });
    setCurrentSNS(snsKey);
    sessionStorage.setItem('lastAccessedSNS', snsKey);
    router.push(`/${snsKey}`);
  };

  // 認証チェック
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">認証が必要です</h1>
          <p className="text-gray-600 mb-6">このページにアクセスするにはログインしてください</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ログイン
          </button>
        </div>
      </div>
    );
  }

  // プロフィール読み込み中
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">プロフィールを読み込み中...</p>
        </div>
      </div>
    );
  }

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

        {/* 共通メニュー */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">共通メニュー</h3>
          <nav className="space-y-1">
            <Link 
              href="/notifications"
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
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
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <span>📖</span>
              <span>使い方ガイド</span>
            </Link>
            <Link 
              href="/my-account"
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <span>👤</span>
              <span>マイアカウント</span>
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
            {availableSNS.length > 0 ? availableSNS.map((snsKey) => {
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
            }) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">契約済みSNSがありません</p>
                <p className="text-xs text-gray-400 mt-1">プランをご確認ください</p>
              </div>
            )}
          </div>
        </div>

        {/* ナビゲーションメニュー */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">メニュー</h3>
          <nav className="space-y-1">
            <Link 
              href={`/${currentSNS}/plan`}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <span>📋</span>
              <span>運用計画</span>
            </Link>
            <Link 
              href={`/${currentSNS}/lab`}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <span>🧪</span>
              <span>投稿ラボ</span>
            </Link>
            <Link 
              href={`/${currentSNS}/analytics`}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <span>📊</span>
              <span>投稿分析</span>
            </Link>
            <Link 
              href={`/${currentSNS}/monthly-report`}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <span>📈</span>
              <span>月次レポート</span>
            </Link>
            <Link 
              href={`/${currentSNS}/posts`}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
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
                {customTitle || '共通ページ'}
              </h1>
              <p className="text-sm text-gray-600">{customDescription || 'Signal共通機能'}</p>
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
