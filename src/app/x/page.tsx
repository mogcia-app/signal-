'use client';

import { useUserProfile } from '../../hooks/useUserProfile';
import { useSNSSettings } from '../../hooks/useSNSSettings';
import { AuthGuard } from '../../components/auth-guard';
import SNSLayout from '../../components/sns-layout';

function XDashboardContent() {
  const { userProfile, loading: profileLoading } = useUserProfile();
  const { getSNSSettings } = useSNSSettings();

  const xSettings = getSNSSettings('x');

  // エラーハンドリング
  if (profileLoading === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">エラー: プロフィールの読み込みに失敗しました</div>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <SNSLayout 
      currentSNS="x"
      customTitle="X (Twitter) Dashboard"
      customDescription="短文投稿・リアルタイム情報共有の管理画面"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左カラム - AI設定 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">X (Twitter) AI設定</h2>
                <p className="text-sm text-gray-600">自動投稿・ハッシュタグ・エンゲージメント設定</p>
              </div>
              <div className="p-6">
                {Object.keys(xSettings).length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {Object.entries(xSettings).map(([key, value]) => (
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
                      管理者にX用のAI設定を依頼してください
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
                <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                  <div className="font-medium text-blue-900">🐦 ツイート投稿</div>
                  <div className="text-sm text-blue-700">新しいツイートを投稿</div>
                </button>
                <button className="w-full text-left px-4 py-3 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors">
                  <div className="font-medium text-cyan-900">📊 エンゲージメント分析</div>
                  <div className="text-sm text-cyan-700">フォロワー・いいね分析</div>
                </button>
                <button className="w-full text-left px-4 py-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                  <div className="font-medium text-indigo-900">🏷️ ハッシュタグ提案</div>
                  <div className="text-sm text-indigo-700">AI自動ハッシュタグ</div>
                </button>
                <button className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                  <div className="font-medium text-green-900">⏰ 投稿スケジュール</div>
                  <div className="text-sm text-green-700">最適なタイミングで投稿</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SNSLayout>
  );
}

export default function XDashboard() {
  return (
    <AuthGuard>
      <XDashboardContent />
    </AuthGuard>
  );
}
