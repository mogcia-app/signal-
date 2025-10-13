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
  AlertCircle,
  Building2
} from 'lucide-react';

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const { 
    userProfile, 
    loading: profileLoading, 
    error: profileError,
    getContractSNS,
    isContractActive,
    getContractDaysRemaining
  } = useUserProfile();
  const { planData } = usePlanData(); // ★ 追加
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
    // loading中はリダイレクトしない（Firebase初期化待ち）
    if (!loading && !user) {
      console.log('❌ ユーザーがログインしていません。ログインページにリダイレクトします。');
      router.push('/login');
      return;
    }

    // プロフィールが読み込まれたら契約SNSを確認
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
  }, [user, loading, userProfile, profileLoading, router, getContractSNS]);

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

  // 表示用の変換関数
  const getIndustryLabel = (value: string) => {
    const map: Record<string, string> = {
      'it': 'IT・テクノロジー',
      'retail': '小売・EC',
      'food': '飲食',
      'beauty': '美容・健康',
      'education': '教育',
      'realestate': '不動産',
      'other': 'その他'
    };
    return map[value] || value;
  };

  const getCompanySizeLabel = (value: string) => {
    const map: Record<string, string> = {
      'individual': '個人',
      'small': '2-10名',
      'medium': '11-50名',
      'large': '51-200名',
      'enterprise': '201名以上'
    };
    return map[value] || value;
  };

  const getBusinessTypeLabel = (value: string) => {
    const map: Record<string, string> = {
      'btoc': 'BtoC',
      'btob': 'BtoB',
      'both': 'BtoB/BtoC両方'
    };
    return map[value] || value;
  };

  const getTargetMarketLabel = (value: string) => {
    const map: Record<string, string> = {
      'teens': '10代',
      '20s': '20代',
      '30s': '30代',
      '40s': '40代',
      '50plus': '50代以上',
      'all': '全年齢'
    };
    return map[value] || value;
  };

  return (
    <SNSLayout currentSNS="instagram" customTitle="マイアカウント" customDescription="アカウント設定とプロフィール管理">

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* プロフィールセクション */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-lg backdrop-blur-sm p-8">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {userProfile?.name || user.displayName || 'ユーザー'}
              </h2>
              <p className="text-gray-600 flex items-center space-x-2 text-lg">
                <Mail className="w-5 h-5" />
                <span>{user.email}</span>
              </p>
            </div>
          </div>
        </div>

        {/* 契約情報 */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">契約情報</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white shadow-lg">
              <div className="flex items-center space-x-3 mb-3">
                <Shield className="w-6 h-6" />
                <span className="font-semibold">契約状況</span>
              </div>
              <p className="text-3xl font-bold">
                {hasActiveContract ? 'アクティブ' : '非アクティブ'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl text-white shadow-lg">
              <div className="flex items-center space-x-3 mb-3">
                <Globe className="w-6 h-6" />
                <span className="font-semibold">契約SNS数</span>
              </div>
              <p className="text-3xl font-bold">
                {contractSNS?.length || 0}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg">
              <div className="flex items-center space-x-3 mb-3">
                <Calendar className="w-6 h-6" />
                <span className="font-semibold">残り日数</span>
              </div>
              <p className="text-3xl font-bold">
                {daysRemaining || 0}日
              </p>
            </div>
          </div>
        </div>

        {/* 契約SNS一覧 */}
        {contractSNS && contractSNS.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">契約SNS</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {contractSNS.map((sns: string) => (
                <button
                  key={sns}
                  onClick={() => router.push(`/${sns}`)}
                  className="group p-6 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-indigo-100 rounded-2xl text-center transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                >
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                    {sns === 'instagram' ? '📷' : 
                     sns === 'x' ? '🐦' : 
                     sns === 'tiktok' ? '🎵' : 
                     sns === 'youtube' ? '📺' : '📱'}
                  </div>
                  <div className="text-sm font-bold text-gray-900 capitalize group-hover:text-blue-600 transition-colors">
                    {sns === 'x' ? 'X (Twitter)' : sns}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ビジネス情報 */}
        {userProfile?.businessInfo && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">ビジネス情報</h3>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                🤖 AI活用データ
              </span>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Building2 className="h-4 w-4 inline mr-2" />
                      業種
                    </label>
                    <p className="text-gray-900">{getIndustryLabel(userProfile.businessInfo.industry) || '未設定'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">会社規模</label>
                    <p className="text-gray-900">{getCompanySizeLabel(userProfile.businessInfo.companySize) || '未設定'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">事業形態</label>
                    <p className="text-gray-900">{getBusinessTypeLabel(userProfile.businessInfo.businessType) || '未設定'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ターゲット市場</label>
                    <p className="text-gray-900">{getTargetMarketLabel(userProfile.businessInfo.targetMarket) || '未設定'}</p>
                  </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">事業内容</label>
                <p className="text-gray-900">{userProfile.businessInfo.description || '未設定'}</p>
              </div>

              {userProfile.businessInfo.goals && userProfile.businessInfo.goals.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">目標</label>
                  <div className="flex flex-wrap gap-2">
                    {userProfile.businessInfo.goals.map((goal, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                      >
                        {goal}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {userProfile.businessInfo.challenges && userProfile.businessInfo.challenges.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">課題</label>
                  <div className="flex flex-wrap gap-2">
                    {userProfile.businessInfo.challenges.map((challenge, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm"
                      >
                        {challenge}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SNS AI設定 */}
        {userProfile?.snsAISettings && Object.keys(userProfile.snsAISettings).length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">SNS AI設定</h3>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                🤖 AI活用データ
              </span>
            </div>
            <div className="space-y-4">
              {Object.entries(userProfile.snsAISettings).map(([snsType, settings]) => (
                <div key={snsType} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">
                        {snsType === 'instagram' ? '📷' : 
                         snsType === 'x' ? '🐦' : 
                         snsType === 'tiktok' ? '🎵' : 
                         snsType === 'youtube' ? '📺' : '📱'}
                      </span>
                      <h4 className="text-lg font-semibold text-gray-900 capitalize">
                        {snsType === 'x' ? 'X (Twitter)' : snsType}
                      </h4>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      settings.enabled 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {settings.enabled ? '✓ 有効' : '無効'}
                    </span>
                  </div>
                  
                  {settings.enabled && (
                    <div className="space-y-2 ml-11">
                      {settings.tone && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">トーン: </span>
                          <span className="text-sm text-gray-900">{settings.tone}</span>
                        </div>
                      )}
                      {settings.features && settings.features.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-gray-700 block mb-1">機能:</span>
                          <div className="flex flex-wrap gap-2">
                            {settings.features.map((feature, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* アカウント管理 */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">アカウント管理</h3>
          <div className="space-y-4">
            <button
              onClick={() => setShowPasswordChange(!showPasswordChange)}
              className="w-full flex items-center space-x-4 px-6 py-4 text-left hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center">
                <Key className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <span className="text-gray-900 font-bold text-lg">パスワード変更</span>
                <p className="text-gray-600">アカウントのパスワードを変更します</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </button>

            {showPasswordChange && (
              <div className="mt-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl">
                <h4 className="text-xl font-bold text-gray-900 mb-6">パスワード変更</h4>
                  
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
        </div>
    </SNSLayout>
  );
}