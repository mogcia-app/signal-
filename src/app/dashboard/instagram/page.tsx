'use client';

import { useRouter } from 'next/navigation';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { useSNSSettings } from '../../../hooks/useSNSSettings';
import { AuthGuard } from '../../../components/auth-guard';

function InstagramDashboardContent() {
  const router = useRouter();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const { getSNSSettings } = useSNSSettings();

  const instagramSettings = getSNSSettings('instagram');

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-4">
                <span className="text-white text-xl">📷</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Instagram Dashboard</h1>
                <p className="text-sm text-gray-600">写真・動画投稿プラットフォーム</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/sns-select')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                SNS選択に戻る
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                全体ダッシュボード
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左カラム - AI設定 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Instagram AI設定</h2>
                <p className="text-sm text-gray-600">自動投稿・ハッシュタグ・エンゲージメント設定</p>
              </div>
              <div className="p-6">
                {Object.keys(instagramSettings).length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {Object.entries(instagramSettings).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h3 className="font-medium text-gray-900 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {typeof value === 'boolean' 
                              ? (value ? '有効' : '無効')
                              : String(value)
                            }
                          </p>
                        </div>
                        <div className="text-right">
                          {typeof value === 'boolean' ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {value ? 'ON' : 'OFF'}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">{String(value)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-4">⚙️</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      AI設定が未設定です
                    </h3>
                    <p className="text-gray-600">
                      管理者にInstagram用のAI設定を依頼してください
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右カラム - 統計・情報 */}
          <div className="space-y-6">
            {/* 契約情報 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">契約情報</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">契約状態</span>
                  <span className="text-sm font-medium text-green-600">アクティブ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">契約タイプ</span>
                  <span className="text-sm font-medium text-gray-900">
                    {userProfile?.contractType === 'annual' ? '年間契約' : 'トライアル'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">利用形態</span>
                  <span className="text-sm font-medium text-gray-900">
                    {userProfile?.usageType === 'team' ? 'チーム利用' : '個人利用'}
                  </span>
                </div>
              </div>
            </div>

            {/* クイックアクション */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">クイックアクション</h3>
              </div>
              <div className="p-6 space-y-3">
                <button className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                  <div className="font-medium text-purple-900">📸 投稿予約</div>
                  <div className="text-sm text-purple-700">コンテンツの投稿を予約</div>
                </button>
                <button className="w-full text-left px-4 py-3 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors">
                  <div className="font-medium text-pink-900">📊 分析レポート</div>
                  <div className="text-sm text-pink-700">エンゲージメント分析</div>
                </button>
                <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                  <div className="font-medium text-blue-900">🏷️ ハッシュタグ生成</div>
                  <div className="text-sm text-blue-700">AI自動ハッシュタグ</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InstagramDashboard() {
  return (
    <AuthGuard>
      <InstagramDashboardContent />
    </AuthGuard>
  );
}
