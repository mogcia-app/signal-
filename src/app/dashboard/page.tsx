'use client';

import { useAuth } from '../../contexts/auth-context';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import SNSLayout from '../../components/sns-layout';
import { 
  User, 
  Mail, 
  Settings,
  ArrowRight,
  Calendar,
  Shield,
  Bell,
  Globe,
  Heart,
  LogOut,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const { 
    userProfile, 
    loading: profileLoading, 
    error: profileError,
    getContractSNS,
    isContractActive,
    getContractDaysRemaining
  } = useUserProfile();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // パスワード変更機能の状態
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    console.log('🎯 ダッシュボードページがマウントされました！', {
      user: !!user,
      userProfile: !!userProfile,
      profileLoading: profileLoading,
      error: profileError,
      referrer: typeof window !== 'undefined' ? document.referrer : 'SSR',
      pathname: typeof window !== 'undefined' ? window.location.pathname : 'SSR'
    });

    // ユーザーがログインしていない場合はログインページにリダイレクト
    if (!user) {
      console.log('❌ ユーザーがログインしていません。ログインページにリダイレクトします。');
      router.push('/login');
      return;
    }

    // プロフィールが読み込まれたら契約SNSに応じてリダイレクト
    if (userProfile && !profileLoading) {
      const contractSNS = getContractSNS();
      console.log('🔍 契約SNS:', contractSNS);
      
      // 自動リダイレクトを無効化 - ダッシュボードページとして表示
      // if (contractSNS && contractSNS.length === 1) {
      //   console.log('✅ 単一SNS契約。Instagramページにリダイレクトします。');
      //   router.push('/instagram');
      // } else if (contractSNS && contractSNS.length > 1) {
      //   console.log('✅ 複数SNS契約。SNS選択ページにリダイレクトします。');
      //   router.push('/sns-select');
      // }
      // 契約SNSが0個の場合は現在のページを表示
    }
  }, [user, userProfile, profileLoading, router, getContractSNS]);

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

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'すべてのフィールドを入力してください' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: '新しいパスワードが一致しません' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: '新しいパスワードは6文字以上で入力してください' });
      return;
    }

    try {
      setIsChangingPassword(true);
      setPasswordMessage(null);

      // パスワード変更APIを呼び出し
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (response.ok) {
        setPasswordMessage({ type: 'success', text: 'パスワードが正常に変更されました' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordChange(false);
      } else {
        const errorData = await response.json();
        setPasswordMessage({ type: 'error', text: errorData.error || 'パスワード変更に失敗しました' });
      }
    } catch (error) {
      console.error('パスワード変更エラー:', error);
      setPasswordMessage({ type: 'error', text: 'パスワード変更中にエラーが発生しました' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">認証が必要です</h1>
          <p className="text-gray-600 mb-6">ダッシュボードにアクセスするにはログインしてください</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">ダッシュボード</h1>
          <p className="text-gray-600 mb-6">プロフィールを読み込み中...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">エラーが発生しました</h1>
          <p className="text-red-600 mb-6">{profileError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ページを再読み込み
          </button>
        </div>
      </div>
    );
  }

  const contractSNS = getContractSNS();
  const hasActiveContract = isContractActive();
  const daysRemaining = getContractDaysRemaining();

  return (
    <SNSLayout currentSNS="instagram" customTitle="マイアカウント" customDescription="アカウント設定とプロフィール管理">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold text-gray-900">マイアカウント</h1>
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
        {/* プロフィールセクション */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="px-6 py-8 border-b">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {userProfile?.name || user.displayName || 'ユーザー'}
                </h2>
                <p className="text-gray-600 flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </p>
              </div>
            </div>
          </div>

          {/* 契約情報 */}
          <div className="px-6 py-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">契約情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">契約状況</span>
                </div>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {hasActiveContract ? 'アクティブ' : '非アクティブ'}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">契約SNS数</span>
                </div>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {contractSNS?.length || 0}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">残り日数</span>
                </div>
                <p className="text-2xl font-bold text-purple-600 mt-2">
                  {daysRemaining || 0}日
                </p>
              </div>
            </div>
          </div>

          {/* 契約SNS一覧 */}
          {contractSNS && contractSNS.length > 0 && (
            <div className="px-6 py-6 border-t">
              <h3 className="text-lg font-medium text-gray-900 mb-4">契約SNS</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {contractSNS.map((sns) => (
                  <button
                    key={sns}
                    onClick={() => router.push(`/${sns}`)}
                    className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors"
                  >
                    <div className="text-2xl mb-2">
                      {sns === 'instagram' ? '📷' : 
                       sns === 'x' ? '🐦' : 
                       sns === 'tiktok' ? '🎵' : 
                       sns === 'youtube' ? '📺' : '📱'}
                    </div>
                    <div className="text-sm font-medium text-gray-900 capitalize">
                      {sns === 'x' ? 'X (Twitter)' : sns}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* アカウント管理 */}
          <div className="px-6 py-6 border-t">
            <h3 className="text-lg font-medium text-gray-900 mb-4">アカウント管理</h3>
            <div className="space-y-4">
              <button
                onClick={() => setShowPasswordChange(!showPasswordChange)}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg border"
              >
                <Key className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <span className="text-gray-900 font-medium">パスワード変更</span>
                  <p className="text-sm text-gray-500">アカウントのパスワードを変更します</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>

              {showPasswordChange && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-md font-medium text-gray-900 mb-4">パスワード変更</h4>
                  
                  {passwordMessage && (
                    <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
                      passwordMessage.type === 'success' 
                        ? 'bg-green-50 text-green-700' 
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {passwordMessage.type === 'success' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      <span className="text-sm">{passwordMessage.text}</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        現在のパスワード
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="現在のパスワードを入力"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        新しいパスワード
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="新しいパスワードを入力"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        新しいパスワード（確認）
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="新しいパスワードを再入力"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={handlePasswordChange}
                        disabled={isChangingPassword}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isChangingPassword ? '変更中...' : 'パスワードを変更'}
                      </button>
                      <button
                        onClick={() => {
                          setShowPasswordChange(false);
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                          setPasswordMessage(null);
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* デバッグ情報 */}
          <div className="px-6 py-4 bg-gray-50 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">デバッグ情報</h4>
            <div className="text-xs text-gray-500 space-y-1">
              <p>User ID: {user.uid}</p>
              <p>Profile Loading: {profileLoading ? 'Yes' : 'No'}</p>
              <p>Has Active Contract: {hasActiveContract ? 'Yes' : 'No'}</p>
              <p>Contract SNS: {contractSNS?.join(', ') || 'None'}</p>
              <p>Days Remaining: {daysRemaining || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </SNSLayout>
  );
}