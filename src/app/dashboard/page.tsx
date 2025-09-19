'use client';

import { useAuth } from '../../contexts/auth-context';
import { AuthGuard } from '../../components/auth-guard';

function DashboardContent() {
  const { user, signOut } = useAuth();

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
                      {user?.disabled ? '無効' : '有効'}
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
                      {user?.accessToken || '取得中...'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">リフレッシュトークン</dt>
                    <dd className="mt-1 text-sm text-gray-900 break-all font-mono bg-gray-100 p-2 rounded">
                      {user?.refreshToken || '取得中...'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">カスタムクレーム</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <pre className="bg-gray-100 p-2 rounded text-xs">
                        {JSON.stringify(user?.customClaims || {}, null, 2)}
                      </pre>
                    </dd>
                  </div>
                </div>
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

