'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/auth-context';
import { useUserProfile } from '../hooks/useUserProfile';
import { ReactNode, useState, useEffect, useCallback } from 'react';

interface SNSLayoutProps {
  children: ReactNode;
  customTitle?: string;
  customDescription?: string;
  isOnboarding?: boolean;
}

export default function SNSLayout({ children, customTitle, customDescription }: SNSLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  const { user, signOut } = useAuth();
  const { userProfile } = useUserProfile();

  // 未読通知数を取得する関数
  const fetchUnreadCount = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      console.log('🔍 サイドバー: 未読通知数取得開始');
      
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
        const count = result.data?.length || 0;
        console.log('📊 サイドバー: 未読通知数取得成功:', count);
        setUnreadCount(count);
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
    
    // 通知が既読になったときのイベントリスナー
    const handleNotificationRead = () => {
      console.log('📡 サイドバー: notificationReadイベント受信');
      fetchUnreadCount();
    };
    
    window.addEventListener('notificationRead', handleNotificationRead);
    console.log('📡 サイドバー: notificationReadイベントリスナー登録完了');
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('notificationRead', handleNotificationRead);
      console.log('📡 サイドバー: notificationReadイベントリスナー削除');
    };
  }, [user?.uid, fetchUnreadCount]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* サイドバー */}
      <div className="w-full lg:w-64 bg-white shadow-lg flex-shrink-0">
        {/* ロゴ・ブランディング */}
        <div className="px-4 sm:px-6 py-3 border-b border-gray-200">
          <div className="flex items-center">
            <div className="text-2xl font-bold text-black">
              Signal<span style={{ color: '#FF8A15' }}>.</span>
            </div>
          </div>
          <p className="text-sm text-black mt-1">Instagram管理プラットフォーム</p>
        </div>


        {/* ナビゲーションメニュー */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">メニュー</h3>
          <nav className="space-y-1">
            <Link 
              href="/instagram"
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg ${
                pathname === '/instagram' 
                  ? 'bg-orange-100 text-orange-800 font-medium' 
                  : 'text-black hover:bg-gray-100'
              }`}
            >
              <span>🏠</span>
              <span>ダッシュボード</span>
            </Link>
            <Link 
              href="/instagram/plan"
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg ${
                pathname === '/instagram/plan' 
                  ? 'bg-orange-100 text-orange-800 font-medium' 
                  : 'text-black hover:bg-gray-100'
              }`}
            >
              <span>📋</span>
              <span>運用計画</span>
            </Link>
            <Link 
              href="/instagram/lab"
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg ${
                pathname === '/instagram/lab' 
                  ? 'bg-orange-100 text-orange-800 font-medium' 
                  : 'text-black hover:bg-gray-100'
              }`}
            >
              <span>🧪</span>
              <span>投稿ラボ</span>
            </Link>
            <Link 
              href="/instagram/analytics"
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg ${
                pathname === '/instagram/analytics' 
                  ? 'bg-orange-100 text-orange-800 font-medium' 
                  : 'text-black hover:bg-gray-100'
              }`}
            >
              <span>📊</span>
              <span>投稿分析</span>
            </Link>
            <Link 
              href="/instagram/posts"
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg ${
                pathname === '/instagram/posts' 
                  ? 'bg-orange-100 text-orange-800 font-medium' 
                  : 'text-black hover:bg-gray-100'
              }`}
            >
              <span>📚</span>
              <span>投稿一覧</span>
            </Link>
            <Link 
              href="/instagram/monthly-report"
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg ${
                pathname === '/instagram/monthly-report' 
                  ? 'bg-orange-100 text-orange-800 font-medium' 
                  : 'text-black hover:bg-gray-100'
              }`}
            >
              <span>📈</span>
              <span>月次レポート</span>
            </Link>
          
          </nav>
        </div>

           {/* Instagram情報 */}
           <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <div>
              <div className="font-semibold text-black">Instagram</div>
            </div>
          </div>
        </div>

         {/* 共通メニュー */}
         <div className="p-3 sm:p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">共通メニュー</h3>
          <nav className="space-y-1">
            <Link 
              href="/onboarding"
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg"
            >
              <span>👤</span>
              <span>マイアカウント</span>
            </Link>

            {/*<Link 
              href="/notifications"
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg"
            >
              <span>🔔</span>
              <span>お知らせ</span>
              {unreadCount > 0 && (
                <div className="ml-auto w-3 h-3 bg-[#FF8A15] rounded-full"></div>
              )}
            </Link>
           {/*< Link 
              href="/guide"
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg"
            >
              <span>📖</span>
              <span>使い方ガイド</span>
            </Link>*/}
            
            <Link 
              href="/terms"
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg"
            >
              <span>📄</span>
              <span>利用規約</span>
            </Link>
          </nav>
        </div>

        {/* ユーザー情報 */}
        {/* <div className="p-4 mt-auto">
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
        </div> */}
        
        {/* ログアウトボタン */}
        <div className="p-4 mt-auto">
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
        {/* <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-black truncate">
                {customTitle || 'Instagram Dashboard'}
              </h1>
              <p className="text-xs sm:text-sm text-black truncate">{customDescription || '写真・動画投稿プラットフォーム'}</p>
            </div>
          </div>
        </div> */}
        
        {/* メインコンテンツ */}
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
