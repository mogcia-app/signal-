'use client';

import React, { useState, useEffect } from 'react';
import CommonLayout from '../../components/common-layout';
import { AIChatWidget } from '../../components/ai-chat-widget';
import { useUserProfile } from '../../hooks/useUserProfile';
import { 
  User, 
  Mail, 
  Eye, 
  EyeOff, 
  Shield,
  Key,
  AlertCircle,
  CheckCircle,
  Settings,
  Calendar,
} from 'lucide-react';

// SNSを判定する関数（複数の方法を組み合わせ）
const getCurrentSNS = (): 'instagram' | 'x' | 'tiktok' | 'youtube' => {
  if (typeof window === 'undefined') return 'instagram'; // SSR時はデフォルト
  
  // 1. セッションストレージから最後にアクセスしたSNSを取得
  const lastAccessedSNS = sessionStorage.getItem('lastAccessedSNS');
  
  // 2. リファラーから判定
  const referrer = document.referrer;
  
  console.log('🔍 マイアカウントページ - SNS判定デバッグ:', {
    lastAccessedSNS: lastAccessedSNS,
    referrer: referrer,
    pathname: window.location.pathname,
    fullURL: window.location.href
  });
  
  // リファラーから判定（最優先）
  if (referrer.includes('/x/')) {
    console.log('✅ Xページからアクセス検出');
    sessionStorage.setItem('lastAccessedSNS', 'x');
    return 'x';
  }
  if (referrer.includes('/instagram/')) {
    console.log('✅ Instagramページからアクセス検出');
    sessionStorage.setItem('lastAccessedSNS', 'instagram');
    return 'instagram';
  }
  if (referrer.includes('/tiktok/')) {
    console.log('✅ TikTokページからアクセス検出');
    sessionStorage.setItem('lastAccessedSNS', 'tiktok');
    return 'tiktok';
  }
  if (referrer.includes('/youtube/')) {
    console.log('✅ YouTubeページからアクセス検出');
    sessionStorage.setItem('lastAccessedSNS', 'youtube');
    return 'youtube';
  }
  
  // リファラーから判定できない場合は、最後にアクセスしたSNSを使用
  if (lastAccessedSNS && ['instagram', 'x', 'tiktok', 'youtube'].includes(lastAccessedSNS)) {
    console.log(`✅ セッションストレージからSNS復元: ${lastAccessedSNS}`);
    return lastAccessedSNS as 'instagram' | 'x' | 'tiktok' | 'youtube';
  }
  
  console.log('⚠️ 判定できず、デフォルトのInstagramを使用');
  // 最終的にデフォルト
  return 'instagram';
};

// UserProfile interface は useUserProfile フックで定義されているため削除

export default function MyAccountPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentSNS, setCurrentSNS] = useState<'instagram' | 'x' | 'tiktok' | 'youtube'>('instagram');
  // const [isNavigating, setIsNavigating] = useState(false);

  // SNS判定とマイアカウントページのマウントログ
  useEffect(() => {
    const detectedSNS = getCurrentSNS();
    setCurrentSNS(detectedSNS);
    
    console.log('🎯 マイアカウントページがマウントされました！', {
      detectedSNS: detectedSNS,
      referrer: typeof window !== 'undefined' ? document.referrer : 'SSR',
      pathname: typeof window !== 'undefined' ? window.location.pathname : 'SSR'
    });
  }, []); // 空の依存配列でマウント時のみ実行

  // 実際のユーザープロフィールデータを取得
  const { 
    userProfile, 
    loading: profileLoading, 
    error: profileError,
    getContractSNS,
    getSNSAISettings,
    getBusinessInfo,
    isContractActive,
    getContractDaysRemaining
  } = useUserProfile();

  // デバッグ用：useUserProfileフックの状態をログ出力
  console.log('🔍 useUserProfileフック状態:', {
    userProfile: userProfile,
    profileLoading: profileLoading,
    profileError: profileError,
    getContractSNS: typeof getContractSNS,
    getSNSAISettings: typeof getSNSAISettings,
    getBusinessInfo: typeof getBusinessInfo
  });

  // プロフィールデータの変更を監視（デバッグ強化版）
  useEffect(() => {
    console.log('🔍 マイアカウントページ - プロフィールデータ更新:', {
      userProfile: userProfile,
      loading: profileLoading,
      error: profileError,
      hasUserProfile: !!userProfile,
      userProfileKeys: userProfile ? Object.keys(userProfile) : [],
      timestamp: new Date().toISOString()
    });
  }, [userProfile, profileLoading, profileError]);

  // フォームデータ（実際のデータで初期化）
  const [profileData, setProfileData] = useState({
    name: userProfile?.name || '',
    businessInfo: {
      industry: '',
      companySize: '',
      businessType: '',
      description: '',
      targetMarket: '',
      goals: [] as string[],
      challenges: [] as string[]
    }
  });

  // ユーザープロフィールが変更されたらフォームデータを更新（シンプル版）
  useEffect(() => {
    if (userProfile) {
      const businessInfo = getBusinessInfo();
      setProfileData({
        name: userProfile.name || '',
        businessInfo: {
          industry: businessInfo.industry || '',
          companySize: businessInfo.companySize || '',
          businessType: businessInfo.businessType || '',
          description: businessInfo.description || '',
          targetMarket: businessInfo.targetMarket || '',
          goals: businessInfo.goals || [],
          challenges: businessInfo.challenges || []
        }
      });
    }
  }, [userProfile, getBusinessInfo]); // 依存関係を明示的に指定

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // モックデータの削除 - 実際のデータを使用


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

  const handleToggleTwoFactor = async () => {
    try {
      setIsSaving(true);
      
      // 実際の実装ではAPIを呼び出し
      // await fetch('/api/auth/two-factor', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     enabled: !twoFactorEnabled
      //   })
      // });

      setTwoFactorEnabled(!twoFactorEnabled);
      setMessage({ 
        type: 'success', 
        text: twoFactorEnabled ? '二要素認証を無効にしました' : '二要素認証を有効にしました' 
      });
    } catch (error) {
      console.error('二要素認証設定エラー:', error);
      setMessage({ type: 'error', text: '二要素認証の設定に失敗しました' });
    } finally {
      setIsSaving(false);
    }
  };


  if (profileLoading) {
    return (
      <CommonLayout 
        customTitle="マイアカウント"
        customDescription="アカウント設定とプロファイル管理"
      >
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">プロファイルを読み込み中...</p>
          </div>
        </div>
      </CommonLayout>
    );
  }

  if (profileError) {
    console.error('❌ マイアカウントページ - プロフィールエラー:', profileError);
    return (
      <CommonLayout 
        customTitle="マイアカウント"
        customDescription="アカウント設定とプロファイル管理"
      >
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">エラーが発生しました</h2>
            <p className="text-red-600 mb-4">{profileError}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      </CommonLayout>
    );
  }

  return (
    <CommonLayout 
      customTitle="マイアカウント"
      customDescription="アカウント設定とプロファイル管理"
    >

        {/* メッセージ表示 */}
        {message && (
          <div className={`mb-6 p-4  flex items-center ${
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


        {/* メインコンテンツ - 2カラムレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左カラム - プロファイル情報 */}
          <div className="space-y-6">
              {/* 基本情報 */}
              <div className="bg-white  shadow-lg border border-gray-100 p-8">
                <div className="flex items-center mb-8">
                  <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600  flex items-center justify-center mr-4">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">基本情報</h2>
                    <p className="text-gray-500">アカウントの基本設定</p>
                  </div>
                </div>
                
                <div className="bg-gray-50  p-6 mb-6">
                  <p className="text-sm text-gray-600 flex items-center">
                    <Settings className="w-4 h-4 mr-2 text-blue-500" />
                    基本情報は管理者によって設定されています。変更が必要な場合は管理者にお問い合わせください。
                  </p>
                </div>
                
                <div className="space-y-8">
                  {/* プロフィールカード */}
                  <div className="bg-white  p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center space-x-6">
                      <div className="relative">
                        <div className="w-24 h-24 bg-gradient-to-r from-pink-400 to-purple-500  flex items-center justify-center shadow-lg">
                          <User className="w-12 h-12 text-white" />
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-6 h-6  border-2 border-white ${
                          userProfile?.status === 'active' ? 'bg-green-400' : 'bg-red-400'
                        }`}></div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{userProfile?.name}</h3>
                        <p className="text-gray-600 mb-3">{userProfile?.email}</p>
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1  text-sm font-medium ${
                            userProfile?.role === 'admin' 
                              ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                              : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            {userProfile?.role === 'admin' ? '管理者' : 'ユーザー'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 情報フィールド */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white  p-5 shadow-sm border border-gray-100">
                      <label className="flex text-sm font-semibold text-gray-700 mb-3 items-center">
                        <User className="w-4 h-4 mr-2 text-gray-500" />
                        表示名
                      </label>
                      <div className="w-full p-4 border border-gray-200  bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 font-medium">
                        {profileData.name || '未設定'}
                      </div>
                    </div>

                    <div className="bg-white  p-5 shadow-sm border border-gray-100">
                      <label className="flex text-sm font-semibold text-gray-700 mb-3 items-center">
                        <Mail className="w-4 h-4 mr-2 text-gray-500" />
                        メールアドレス
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <div className="w-full pl-12 p-4 border border-gray-200  bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 font-medium">
                          {userProfile?.email || '未設定'}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 flex items-center">
                        <Settings className="w-3 h-3 mr-1" />
                        メールアドレスは変更できません
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 契約情報 */}
              <div className="bg-white  shadow-lg border border-gray-100 p-8">
                <div className="flex items-center mb-8">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600  flex items-center justify-center mr-4">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">契約情報</h2>
                    <p className="text-gray-600">現在の契約プランと利用状況</p>
                  </div>
                </div>
                
                {/* 契約情報カード */}
                <div className="bg-gray-50 p-8 shadow-sm border border-gray-200 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 契約タイプ */}
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 mx-auto flex items-center justify-center mb-3">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">契約タイプ</h3>
              <div className="bg-white p-3 border border-gray-200">
                <span className="text-lg font-bold text-blue-600">
                  {userProfile?.contractType === 'annual' ? '年間契約' : 'トライアル'}
                </span>
              </div>
            </div>
            
            {/* SNS契約数 */}
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 mx-auto flex items-center justify-center mb-3">
                <User className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">SNS契約数</h3>
              <div className="bg-white p-3 border border-gray-200">
                <span className="text-lg font-bold text-green-600">
                  {userProfile?.contractSNS.length}/4
                </span>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 h-1.5">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-1.5" 
                      style={{ width: `${(userProfile?.contractSNS.length || 0) * 25}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 利用形態 */}
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 mx-auto flex items-center justify-center mb-3">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">利用形態</h3>
              <div className="bg-white p-3 border border-gray-200">
                <span className="text-lg font-bold text-purple-600">
                  {userProfile?.usageType === 'team' ? 'チーム利用' : '個人利用'}
                </span>
              </div>
            </div>
                  </div>
                </div>

                <div className="bg-gray-50  p-6 shadow-sm border border-gray-100 mb-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2 text-blue-500" />
                    契約SNS
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {userProfile?.contractSNS.map((sns, index) => (
                      <span key={index} className="px-4 py-2 bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700  text-sm font-medium border border-pink-200">
                        {sns}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-6  shadow-sm border border-gray-100">
                    <div className="flex items-center mb-3">
                      <Calendar className="w-5 h-5 mr-2 text-green-500" />
                      <label className="block text-sm font-semibold text-gray-700">契約開始日</label>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{new Date(userProfile?.contractStartDate || '').toLocaleDateString('ja-JP')}</p>
                  </div>
                  <div className="bg-gray-50 p-6  shadow-sm border border-gray-100">
                    <div className="flex items-center mb-3">
                      <Calendar className="w-5 h-5 mr-2 text-red-500" />
                      <label className="block text-sm font-semibold text-gray-700">契約終了日</label>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{new Date(userProfile?.contractEndDate || '').toLocaleDateString('ja-JP')}</p>
                  </div>
                </div>
              </div>

              {/* ビジネス情報 */}
              <div className="bg-white  shadow-lg border border-gray-100 p-8">
                <div className="flex items-center mb-8">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600  flex items-center justify-center mr-4">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">ビジネス情報</h2>
                    <p className="text-gray-600">企業・事業に関する詳細情報</p>
                  </div>
                </div>
                
                <div className="bg-white/60 backdrop-blur-sm  p-6 mb-8">
                  <p className="text-sm text-gray-600 flex items-center">
                    <Settings className="w-4 h-4 mr-2 text-emerald-500" />
                    ビジネス情報は管理者によって設定されています。変更が必要な場合は管理者にお問い合わせください。
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50  p-5 shadow-sm border border-gray-200">
                    <label className="flex text-sm font-semibold text-gray-700 mb-3 items-center">
                      <Settings className="w-4 h-4 mr-2 text-emerald-500" />
                      業界
                    </label>
                    <div className="w-full p-4 border border-emerald-200  bg-gradient-to-r from-emerald-50 to-teal-50 text-gray-700 font-medium">
                      {profileData.businessInfo.industry || '未設定'}
                    </div>
                  </div>

                  <div className="bg-gray-50  p-5 shadow-sm border border-gray-200">
                    <label className="flex text-sm font-semibold text-gray-700 mb-3 items-center">
                      <User className="w-4 h-4 mr-2 text-emerald-500" />
                      会社規模
                    </label>
                    <div className="w-full p-4 border border-emerald-200  bg-gradient-to-r from-emerald-50 to-teal-50 text-gray-700 font-medium">
                      {profileData.businessInfo.companySize || '未設定'}
                    </div>
                  </div>

                  <div className="bg-gray-50  p-5 shadow-sm border border-gray-200">
                    <label className="flex text-sm font-semibold text-gray-700 mb-3 items-center">
                      <Shield className="w-4 h-4 mr-2 text-emerald-500" />
                      ビジネスタイプ
                    </label>
                    <div className="w-full p-4 border border-emerald-200  bg-gradient-to-r from-emerald-50 to-teal-50 text-gray-700 font-medium">
                      {profileData.businessInfo.businessType || '未設定'}
                    </div>
                  </div>

                  <div className="bg-gray-50  p-5 shadow-sm border border-gray-200">
                    <label className="flex text-sm font-semibold text-gray-700 mb-3 items-center">
                      <Settings className="w-4 h-4 mr-2 text-emerald-500" />
                      ターゲット市場
                    </label>
                    <div className="w-full p-4 border border-emerald-200  bg-gradient-to-r from-emerald-50 to-teal-50 text-gray-700 font-medium">
                      {profileData.businessInfo.targetMarket || '未設定'}
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-gray-50  p-5 shadow-sm border border-gray-200">
                    <label className="flex text-sm font-semibold text-gray-700 mb-3 items-center">
                      <Mail className="w-4 h-4 mr-2 text-emerald-500" />
                      ビジネス説明
                    </label>
                    <div className="w-full p-4 border border-emerald-200  bg-gradient-to-r from-emerald-50 to-teal-50 text-gray-700 font-medium min-h-[100px]">
                      {profileData.businessInfo.description || '未設定'}
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-gray-50  p-5 shadow-sm border border-gray-200">
                    <label className="flex text-sm font-semibold text-gray-700 mb-3 items-center">
                      <Shield className="w-4 h-4 mr-2 text-emerald-500" />
                      目標
                    </label>
                    <div className="w-full p-4 border border-emerald-200  bg-gradient-to-r from-emerald-50 to-teal-50 text-gray-700 font-medium">
                      {profileData.businessInfo.goals.length > 0 
                        ? profileData.businessInfo.goals.join(', ') 
                        : '未設定'
                      }
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-gray-50  p-5 shadow-sm border border-gray-200">
                    <label className="flex text-sm font-semibold text-gray-700 mb-3 items-center">
                      <AlertCircle className="w-4 h-4 mr-2 text-emerald-500" />
                      課題
                    </label>
                    <div className="w-full p-4 border border-emerald-200  bg-gradient-to-r from-emerald-50 to-teal-50 text-gray-700 font-medium">
                      {profileData.businessInfo.challenges.length > 0 
                        ? profileData.businessInfo.challenges.join(', ') 
                        : '未設定'
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* パスワード変更 */}
              <div className="bg-white  shadow-lg border border-gray-100 p-8">
                <div className="flex items-center mb-8">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-600  flex items-center justify-center mr-4">
                    <Key className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">パスワード変更</h2>
                    <p className="text-gray-600">アカウントのセキュリティを強化</p>
                  </div>
                </div>
                
                <div className="bg-gray-50  p-6 shadow-sm border border-gray-200">
                  <div className="space-y-6">
                    <div>
                      <label className="flex text-sm font-semibold text-gray-700 mb-3 items-center">
                        <Key className="w-4 h-4 mr-2 text-red-500" />
                        現在のパスワード
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="w-full p-4 pr-12 border border-red-200  bg-gradient-to-r from-gray-50 to-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="現在のパスワードを入力"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="flex text-sm font-semibold text-gray-700 mb-3 items-center">
                        <Key className="w-4 h-4 mr-2 text-red-500" />
                        新しいパスワード
                      </label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full p-4 border border-red-200  bg-gradient-to-r from-gray-50 to-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="新しいパスワードを入力"
                      />
                    </div>

                    <div>
                      <label className="flex text-sm font-semibold text-gray-700 mb-3 items-center">
                        <Key className="w-4 h-4 mr-2 text-red-500" />
                        新しいパスワード（確認）
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full p-4 border border-red-200  bg-gradient-to-r from-gray-50 to-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="新しいパスワードを再入力"
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        onClick={handleChangePassword}
                        disabled={isSaving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                        className="flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-red-500 to-pink-600 text-white  hover:from-red-600 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        <Key className="w-5 h-5" />
                        <span className="font-medium">{isSaving ? '変更中...' : 'パスワードを変更'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 二要素認証 */}
              <div className="bg-white  shadow-lg border border-gray-100 p-8">
                <div className="flex items-center mb-8">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-yellow-600  flex items-center justify-center mr-4">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">二要素認証</h2>
                    <p className="text-gray-600">アカウントセキュリティの強化</p>
                  </div>
                </div>
                
                <div className="bg-gray-50  p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center">
                        <Shield className="w-5 h-5 mr-2 text-orange-500" />
                        二要素認証（2FA）
                      </h3>
                      <p className="text-gray-600 mb-4">
                        アカウントのセキュリティを強化するために、二要素認証を有効にできます。
                      </p>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-700">現在の状態:</span>
                        <span className={`px-3 py-1  text-sm font-medium ${
                          twoFactorEnabled 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {twoFactorEnabled ? '有効' : '無効'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-6">
                      <button
                        onClick={handleToggleTwoFactor}
                        disabled={isSaving}
                        className={`px-8 py-4  font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                          twoFactorEnabled
                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                            : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isSaving ? '設定中...' : twoFactorEnabled ? '無効にする' : '有効にする'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
          </div>

          {/* 右カラム - AI設定・SNSプロフィール・セキュリティ */}
          <div className="space-y-6">
            {/* AI設定 */}
            {userProfile?.snsAISettings && Object.keys(userProfile.snsAISettings).length > 0 && (
              <div className="bg-white  shadow-lg border border-gray-100 p-8">
                <div className="flex items-center mb-8">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600  flex items-center justify-center mr-4">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">AI設定</h2>
                    <p className="text-gray-600">各SNSのAI機能設定</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {Object.entries(userProfile.snsAISettings).map(([sns, settings]) => {
                    const typedSettings = settings as {
                      aiEnabled?: boolean;
                      autoPosting?: boolean;
                      hashtagOptimization?: boolean;
                      postingFrequency?: string;
                      optimalPostingTime?: string[];
                      analyticsEnabled?: boolean;
                    };
                    
                    return (
                      <div key={sns} className="bg-gray-50  p-6 shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-900 mb-4 capitalize flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500  flex items-center justify-center mr-3">
                            <Settings className="w-4 h-4 text-white" />
                          </div>
                          {sns} AI設定
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="bg-gradient-to-r from-gray-50 to-gray-100  p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-gray-700">AI有効</span>
                              <span className={`px-3 py-1  text-sm font-medium ${
                                typedSettings.aiEnabled 
                                  ? 'bg-green-100 text-green-700 border border-green-200' 
                                  : 'bg-red-100 text-red-700 border border-red-200'
                              }`}>
                                {typedSettings.aiEnabled ? 'ON' : 'OFF'}
                              </span>
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-gray-50 to-gray-100  p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-gray-700">自動投稿</span>
                              <span className={`px-3 py-1  text-sm font-medium ${
                                typedSettings.autoPosting 
                                  ? 'bg-green-100 text-green-700 border border-green-200' 
                                  : 'bg-red-100 text-red-700 border border-red-200'
                              }`}>
                                {typedSettings.autoPosting ? 'ON' : 'OFF'}
                              </span>
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-gray-50 to-gray-100  p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-gray-700">ハッシュタグ最適化</span>
                              <span className={`px-3 py-1  text-sm font-medium ${
                                typedSettings.hashtagOptimization 
                                  ? 'bg-green-100 text-green-700 border border-green-200' 
                                  : 'bg-red-100 text-red-700 border border-red-200'
                              }`}>
                                {typedSettings.hashtagOptimization ? 'ON' : 'OFF'}
                              </span>
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-gray-50 to-gray-100  p-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-700 mb-2">投稿頻度</span>
                              <span className="text-gray-600 font-medium">{typedSettings.postingFrequency || '未設定'}</span>
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-gray-50 to-gray-100  p-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-700 mb-2">最適投稿時間</span>
                              <span className="text-gray-600 font-medium">{typedSettings.optimalPostingTime?.join(', ') || '未設定'}</span>
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-gray-50 to-gray-100  p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-gray-700">分析機能</span>
                              <span className={`px-3 py-1  text-sm font-medium ${
                                typedSettings.analyticsEnabled 
                                  ? 'bg-green-100 text-green-700 border border-green-200' 
                                  : 'bg-red-100 text-red-700 border border-red-200'
                              }`}>
                                {typedSettings.analyticsEnabled ? 'ON' : 'OFF'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SNSプロフィール */}
            {userProfile?.snsProfiles && Object.keys(userProfile.snsProfiles).length > 0 && (
              <div className="bg-white  shadow-lg border border-gray-100 p-8">
                <div className="flex items-center mb-8">
                  <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600  flex items-center justify-center mr-4">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">SNSプロフィール</h2>
                    <p className="text-gray-600">各SNSアカウントの詳細情報</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {Object.entries(userProfile.snsProfiles).map(([sns, profile]) => (
                    <div key={sns} className="bg-gray-50  p-6 shadow-sm border border-gray-200">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500  flex items-center justify-center mr-3">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-bold text-gray-900 capitalize text-lg">{sns}</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100  p-4">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-700">フォロワー数</span>
                            <span className="text-lg font-bold text-cyan-600">
                              {(profile as { followers?: number }).followers?.toLocaleString() || 0}
                            </span>
                          </div>
                        </div>
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100  p-4">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-700">ユーザー名</span>
                            <span className="text-gray-600 font-medium">
                              {(profile as { username?: string }).username || '未設定'}
                            </span>
                          </div>
                        </div>
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100  p-4">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-700">最終更新</span>
                            <span className="text-gray-600 font-medium">
                              {(profile as { lastUpdated?: string }).lastUpdated ? 
                                new Date((profile as { lastUpdated: string }).lastUpdated).toLocaleDateString('ja-JP') : 
                                '未更新'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


          </div>
        </div>

        {/* AIチャットウィジェット */}
        <AIChatWidget 
          contextData={{
            userProfile: userProfile,
            contractSNS: getContractSNS(),
            aiSettings: getSNSAISettings('instagram'),
            businessInfo: getBusinessInfo(),
            contractActive: isContractActive(),
            daysRemaining: getContractDaysRemaining()
          }}
        />
    </CommonLayout>
  );
}
