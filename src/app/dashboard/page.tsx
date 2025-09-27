'use client';

import { useAuth } from '../../contexts/auth-context';
import { AuthGuard } from '../../components/auth-guard';
import { useUserProfile } from '../../hooks/useUserProfile';
import { UserDataDisplay } from '../../components/UserDataDisplay';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function DashboardContent() {
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
  const [showAllData, setShowAllData] = useState(false);

  // SNS契約数に応じたルーティング
  useEffect(() => {
    if (userProfile && !profileLoading) {
      const contractSNS = getContractSNS();
      
      // デバッグログ
      console.log('Dashboard routing check:', {
        contractSNS,
        length: contractSNS.length,
        userProfile: userProfile,
        contractActive: isContractActive(),
        daysRemaining: getContractDaysRemaining()
      });
      
      if (contractSNS.length === 1) {
        // 契約SNSが1つの場合、直接そのSNSのダッシュボードに遷移
        console.log('Redirecting to single SNS:', contractSNS[0]);
        router.push(`/${contractSNS[0]}`);
      } else if (contractSNS.length > 1) {
        // 契約SNSが複数の場合、SNS選択ページに遷移
        console.log('Redirecting to SNS select page');
        router.push('/sns-select');
      }
      // 契約SNSが0個の場合は現在のページ（全体ダッシュボード）を表示
    }
  }, [userProfile, profileLoading, router, getContractSNS, isContractActive, getContractDaysRemaining]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">
                🔥 Signal Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* ユーザー情報カード */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {user?.email?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        ユーザー情報
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {user?.email}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* UID情報カード */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">#</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        ユーザーID (UID)
                      </dt>
                      <dd className="text-sm font-medium text-gray-900 break-all">
                        {user?.uid}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* ステータスカード */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">✓</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        ログイン状態
                      </dt>
                      <dd className="text-lg font-medium text-green-600">
                        認証済み
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* 詳細情報セクション */}
          <div className="mt-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  認証情報詳細
                </h3>
                <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user?.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">UID</dt>
                    <dd className="mt-1 text-sm text-gray-900 break-all">{user?.uid}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">メール確認状態</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {user?.emailVerified ? '確認済み' : '未確認'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">最終ログイン</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {user?.metadata.lastSignInTime ? 
                        new Date(user.metadata.lastSignInTime).toLocaleString('ja-JP') : 
                        '不明'
                      }
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">アカウント作成日</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {user?.metadata.creationTime ? 
                        new Date(user.metadata.creationTime).toLocaleString('ja-JP') : 
                        '不明'
                      }
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">プロバイダー</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {user?.providerData.map(provider => provider.providerId).join(', ') || 'email'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">アカウント状態</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      有効
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">匿名ユーザー</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {user?.isAnonymous ? 'はい' : 'いいえ'}
                    </dd>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* プロバイダー情報セクション */}
          <div className="mt-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  認証プロバイダー情報
                </h3>
                <div className="space-y-4">
                  {user?.providerData.map((provider, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">プロバイダーID</dt>
                          <dd className="mt-1 text-sm text-gray-900">{provider.providerId}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">UID</dt>
                          <dd className="mt-1 text-sm text-gray-900 break-all">{provider.uid}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
                          <dd className="mt-1 text-sm text-gray-900">{provider.email || 'なし'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">表示名</dt>
                          <dd className="mt-1 text-sm text-gray-900">{provider.displayName || 'なし'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">電話番号</dt>
                          <dd className="mt-1 text-sm text-gray-900">{provider.phoneNumber || 'なし'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">写真URL</dt>
                          <dd className="mt-1 text-sm text-gray-900 break-all">{provider.photoURL || 'なし'}</dd>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* トークン情報セクション */}
          <div className="mt-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  トークン情報
                </h3>
                <div className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">アクセストークン</dt>
                    <dd className="mt-1 text-sm text-gray-900 break-all font-mono bg-gray-100 p-2 rounded">
                      Firebase User オブジェクトでは直接取得不可
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">リフレッシュトークン</dt>
                    <dd className="mt-1 text-sm text-gray-900 break-all font-mono bg-gray-100 p-2 rounded">
                      Firebase User オブジェクトでは直接取得不可
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">カスタムクレーム</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <pre className="bg-gray-100 p-2 rounded text-xs">
                        {JSON.stringify({}, null, 2)}
                      </pre>
                    </dd>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SNS契約情報セクション */}
          <div className="mt-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  SNS契約情報
                </h3>
                {profileLoading ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ) : profileError ? (
                  <div className="text-red-600">
                    <p>エラー: {profileError}</p>
                    <p className="text-sm mt-2">管理者にユーザー情報の登録を依頼してください。</p>
                  </div>
                ) : userProfile ? (
                  <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">契約SNS数</dt>
                      <dd className="mt-1 text-sm text-gray-900">{userProfile.snsCount}個</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">利用形態</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {userProfile.usageType === 'team' ? 'チーム利用' : '個人利用'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">契約タイプ</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {userProfile.contractType === 'annual' ? '年間契約' : 'トライアル'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">契約SNS</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {userProfile.contractSNS.length > 0 ? 
                          userProfile.contractSNS.join(', ') : 
                          '未設定'
                        }
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">契約開始日</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(userProfile.contractStartDate).toLocaleDateString('ja-JP')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">契約終了日</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(userProfile.contractEndDate).toLocaleDateString('ja-JP')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">アカウント状態</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          userProfile.status === 'active' ? 'bg-green-100 text-green-800' :
                          userProfile.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {userProfile.status === 'active' ? 'アクティブ' :
                           userProfile.status === 'inactive' ? '非アクティブ' : '停止中'}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">アクティブ状態</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          userProfile.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {userProfile.isActive ? '有効' : '無効'}
                        </span>
                      </dd>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">ユーザー情報がありません</p>
                )}
              </div>
            </div>
          </div>

          {/* 事業情報セクション */}
          <div className="mt-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  事業情報
                </h3>
                {userProfile?.businessInfo ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">業界</dt>
                        <dd className="mt-1 text-sm text-gray-900">{userProfile.businessInfo.industry}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">会社規模</dt>
                        <dd className="mt-1 text-sm text-gray-900">{userProfile.businessInfo.companySize}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">事業タイプ</dt>
                        <dd className="mt-1 text-sm text-gray-900">{userProfile.businessInfo.businessType}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">ターゲット市場</dt>
                        <dd className="mt-1 text-sm text-gray-900">{userProfile.businessInfo.targetMarket}</dd>
                      </div>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">事業説明</dt>
                      <dd className="mt-1 text-sm text-gray-900">{userProfile.businessInfo.description}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">目標</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <ul className="list-disc list-inside space-y-1">
                          {userProfile.businessInfo.goals.map((goal, index) => (
                            <li key={index}>{goal}</li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">課題</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <ul className="list-disc list-inside space-y-1">
                          {userProfile.businessInfo.challenges.map((challenge, index) => (
                            <li key={index}>{challenge}</li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">事業情報が登録されていません</p>
                )}
              </div>
            </div>
          </div>

          {/* SNS AI設定セクション */}
          <div className="mt-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  SNS AI設定
                </h3>
                {userProfile?.snsAISettings ? (
                  <div className="space-y-6">
                    {/* SNS別設定表示 */}
                    {Object.entries(userProfile.snsAISettings).map(([snsName, settings]) => (
                      <div key={snsName} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                          <span className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                            <span className="text-white font-bold text-sm">
                              {snsName.charAt(0).toUpperCase()}
                            </span>
                          </span>
                          {snsName.toUpperCase()} AI設定
                        </h4>
                        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                          {typeof settings === 'object' && settings !== null ? (
                            Object.entries(settings as Record<string, unknown>).map(([key, value]) => (
                              <div key={key}>
                                <dt className="text-sm font-medium text-gray-500 capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                  {typeof value === 'boolean' ? (
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                      {value ? '有効' : '無効'}
                                    </span>
                                  ) : typeof value === 'object' && value !== null ? (
                                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                                      {JSON.stringify(value, null, 2)}
                                    </pre>
                                  ) : (
                                    String(value)
                                  )}
                                </dd>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-2">
                              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                                {JSON.stringify(settings, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* 生データ表示（デバッグ用） */}
                    <details className="mt-6">
                      <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700">
                        生データ（JSON）- デバッグ用
                      </summary>
                      <div className="mt-2 bg-gray-100 p-4 rounded-lg">
                        <pre className="text-xs text-gray-800 overflow-auto max-h-96">
                          {JSON.stringify(userProfile.snsAISettings, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                ) : (
                  <p className="text-gray-500">SNS AI設定が登録されていません</p>
                )}
              </div>
            </div>
          </div>

          {/* 生データ表示セクション */}
          <div className="mt-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  生データ（JSON）
                </h3>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <pre className="text-xs text-gray-800 overflow-auto max-h-96">
                    {JSON.stringify(user, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>

        </div>
        
        {/* ユーザーデータ表示セクション */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">ユーザー情報詳細</h2>
            <button
              onClick={() => setShowAllData(!showAllData)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {showAllData ? '基本情報のみ' : '全データ表示'}
            </button>
          </div>
          
          <UserDataDisplay showAll={showAllData} />
        </div>
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

