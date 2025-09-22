'use client';

import React, { useState, useEffect } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { 
  User, 
  Mail, 
  Save, 
  Eye, 
  EyeOff, 
  Shield,
  Key,
  Trash2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface UserProfile {
  id?: string;
  email: string;                 // ログイン用メールアドレス（Firebase Auth管理）
  name: string;                  // 表示名
  role: 'user' | 'admin';        // 権限（利用者は'user'）
  isActive: boolean;             // アクティブ状態
  snsCount: number;              // SNS契約数（1-4）
  usageType: 'team' | 'solo';    // 利用形態
  contractType: 'annual' | 'trial'; // 契約タイプ
  contractSNS: string[];         // 契約SNS配列
  snsAISettings: object;         // SNS AI設定
  businessInfo: {               // ビジネス情報
    industry: string;
    companySize: string;
    businessType: string;
    description: string;
    targetMarket: string;
    goals: string[];
    challenges: string[];
  };
  status: 'active' | 'inactive' | 'suspended';
  contractStartDate: string;     // 契約開始日
  contractEndDate: string;       // 契約終了日
  createdAt: string;
  updatedAt: string;
}

export default function MyAccountPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // フォームデータ
  const [profileData, setProfileData] = useState({
    name: '',
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

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      // モックデータを使用（実際の実装ではAPIから取得）
      const mockProfile: UserProfile = {
        id: '1',
        email: 'user@example.com',
        name: '田中太郎',
        role: 'user',
        isActive: true,
        snsCount: 2,
        usageType: 'solo',
        contractType: 'annual',
        contractSNS: ['instagram', 'twitter'],
        snsAISettings: {},
        businessInfo: {
          industry: 'マーケティング・広告',
          companySize: '個人事業主',
          businessType: 'コンサルティング',
          description: 'Instagramマーケティングの専門家として、ブランドの成長をサポートしています。',
          targetMarket: '中小企業、個人ブランド',
          goals: ['フォロワー増加', 'エンゲージメント向上', '売上向上'],
          challenges: ['コンテンツ制作の効率化', 'ターゲット分析', '競合対策']
        },
        status: 'active',
        contractStartDate: '2024-01-01T00:00:00Z',
        contractEndDate: '2024-12-31T23:59:59Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-20T10:00:00Z'
      };

      setUserProfile(mockProfile);
      setProfileData({
        name: mockProfile.name,
        businessInfo: mockProfile.businessInfo
      });
      setTwoFactorEnabled(false); // モックデータでは無効
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
      //     name: profileData.name,
      //     businessInfo: profileData.businessInfo
      //   })
      // });

      // モック更新
      setUserProfile(prev => prev ? {
        ...prev,
        name: profileData.name,
        businessInfo: profileData.businessInfo,
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
            { id: 'security', label: 'セキュリティ', icon: <Shield className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'profile' | 'security')}
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
            <div className="space-y-6">
              {/* 基本情報 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">基本情報</h2>
                
                <div className="space-y-6">
                  <div className="flex items-center space-x-6">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-10 h-10 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{userProfile?.name}</h3>
                      <p className="text-gray-600">{userProfile?.email}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          userProfile?.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {userProfile?.status === 'active' ? 'アクティブ' : '非アクティブ'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {userProfile?.role === 'admin' ? '管理者' : 'ユーザー'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        表示名
                      </label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
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
                </div>
              </div>

              {/* 契約情報 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">契約情報</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">契約タイプ</h3>
                    <p className="text-blue-800">
                      {userProfile?.contractType === 'annual' ? '年間契約' : 'トライアル'}
                    </p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">SNS契約数</h3>
                    <p className="text-green-800">{userProfile?.snsCount}/4</p>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-purple-900 mb-2">利用形態</h3>
                    <p className="text-purple-800">
                      {userProfile?.usageType === 'team' ? 'チーム利用' : '個人利用'}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-3">契約SNS</h3>
                  <div className="flex flex-wrap gap-2">
                    {userProfile?.contractSNS.map((sns, index) => (
                      <span key={index} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                        {sns}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">契約開始日</label>
                    <p className="text-gray-900">{new Date(userProfile?.contractStartDate || '').toLocaleDateString('ja-JP')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">契約終了日</label>
                    <p className="text-gray-900">{new Date(userProfile?.contractEndDate || '').toLocaleDateString('ja-JP')}</p>
                  </div>
                </div>
              </div>

              {/* ビジネス情報 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">ビジネス情報</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      業界
                    </label>
                    <input
                      type="text"
                      value={profileData.businessInfo.industry}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        businessInfo: { ...prev.businessInfo, industry: e.target.value }
                      }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="業界を入力"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      会社規模
                    </label>
                    <input
                      type="text"
                      value={profileData.businessInfo.companySize}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        businessInfo: { ...prev.businessInfo, companySize: e.target.value }
                      }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="会社規模を入力"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ビジネスタイプ
                    </label>
                    <input
                      type="text"
                      value={profileData.businessInfo.businessType}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        businessInfo: { ...prev.businessInfo, businessType: e.target.value }
                      }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ビジネスタイプを入力"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ターゲット市場
                    </label>
                    <input
                      type="text"
                      value={profileData.businessInfo.targetMarket}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        businessInfo: { ...prev.businessInfo, targetMarket: e.target.value }
                      }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ターゲット市場を入力"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ビジネス説明
                  </label>
                  <textarea
                    value={profileData.businessInfo.description}
                    onChange={(e) => setProfileData(prev => ({
                      ...prev,
                      businessInfo: { ...prev.businessInfo, description: e.target.value }
                    }))}
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ビジネスについて説明してください"
                  />
                </div>

                <div className="flex justify-end mt-6">
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

              {/* 二要素認証 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">二要素認証</h2>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">二要素認証（2FA）</h3>
                    <p className="text-gray-600 mb-2">
                      アカウントのセキュリティを強化するために、二要素認証を有効にできます。
                    </p>
                    <p className="text-sm text-gray-500">
                      現在の状態: <span className={`font-medium ${twoFactorEnabled ? 'text-green-600' : 'text-red-600'}`}>
                        {twoFactorEnabled ? '有効' : '無効'}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={handleToggleTwoFactor}
                    disabled={isSaving}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      twoFactorEnabled
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    } disabled:opacity-50`}
                  >
                    {isSaving ? '設定中...' : twoFactorEnabled ? '無効にする' : '有効にする'}
                  </button>
                </div>
              </div>

              {/* アカウント削除 */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-red-900 mb-2 flex items-center">
                  <Trash2 className="w-5 h-5 mr-2" />
                  アカウント削除
                </h3>
                <p className="text-red-700 mb-4">
                  アカウントを削除すると、すべてのデータが永久に失われます。この操作は取り消せません。
                </p>
                <button
                  onClick={() => {
                    if (confirm('本当にアカウントを削除しますか？この操作は取り消せません。')) {
                      // 実際の削除処理
                      setMessage({ type: 'success', text: 'アカウント削除の手続きを開始しました' });
                    }
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>アカウントを削除</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </SNSLayout>
  );
}
