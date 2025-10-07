'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/auth-context';
import { 
  User, 
  Mail, 
  Settings,
  ArrowLeft,
  LogOut,
  Shield,
  Bell,
  Globe,
  Heart
} from 'lucide-react';

export default function MyAccountPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // ページマウントログ
  useEffect(() => {
    console.log('🎯 マイアカウントページがマウントされました！', {
      user: !!user,
      referrer: typeof window !== 'undefined' ? document.referrer : 'SSR',
      pathname: typeof window !== 'undefined' ? window.location.pathname : 'SSR'
    });
  }, [user]);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToHome = () => {
    console.log('🏠 ホームに戻る');
    router.push('/');
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToHome}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>戻る</span>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">マイアカウント</h1>
            </div>
            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              <span>{isLoading ? 'ログアウト中...' : 'ログアウト'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border">
          {/* プロフィールセクション */}
          <div className="px-6 py-8 border-b">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {user.displayName || 'ユーザー'}
                </h2>
                <p className="text-gray-600 flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </p>
              </div>
            </div>
          </div>

          {/* 設定メニュー */}
          <div className="px-6 py-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">設定</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900">プロフィール設定</span>
              </button>
              <button className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg">
                <Shield className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900">プライバシー設定</span>
              </button>
              <button className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg">
                <Bell className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900">通知設定</span>
              </button>
              <button className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg">
                <Globe className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900">言語設定</span>
              </button>
            </div>
          </div>

          {/* デバッグ情報 */}
          <div className="px-6 py-4 bg-gray-50 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">デバッグ情報</h4>
            <div className="text-xs text-gray-500 space-y-1">
              <p>User ID: {user.uid}</p>
              <p>Email: {user.email}</p>
              <p>Display Name: {user.displayName || '未設定'}</p>
              <p>Email Verified: {user.emailVerified ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}