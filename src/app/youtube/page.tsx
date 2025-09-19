'use client';

import { useUserProfile } from '../../hooks/useUserProfile';
import { useSNSSettings } from '../../hooks/useSNSSettings';
import { AuthGuard } from '../../components/auth-guard';
import SNSLayout from '../../components/sns-layout';

function YouTubeDashboardContent() {
  const { userProfile, loading: profileLoading } = useUserProfile();
  const { getSNSSettings } = useSNSSettings();

  const youtubeSettings = getSNSSettings('youtube');

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <SNSLayout currentSNS="youtube">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左カラム - AI設定 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">YouTube AI設定</h2>
                <p className="text-sm text-gray-600">自動投稿・サムネイル・SEO最適化設定</p>
              </div>
              <div className="p-6">
                {Object.keys(youtubeSettings).length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {Object.entries(youtubeSettings).map(([key, value]) => (
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
                      管理者にYouTube用のAI設定を依頼してください
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

            {/* チャンネル統計 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">チャンネル統計</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">登録者数</span>
                  <span className="text-sm font-medium text-gray-900">-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">総再生回数</span>
                  <span className="text-sm font-medium text-gray-900">-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">公開動画数</span>
                  <span className="text-sm font-medium text-gray-900">-</span>
                </div>
              </div>
            </div>

            {/* クイックアクション */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">クイックアクション</h3>
              </div>
              <div className="p-6 space-y-3">
                <button className="w-full text-left px-4 py-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                  <div className="font-medium text-red-900">📹 動画アップロード</div>
                  <div className="text-sm text-red-700">新しい動画をアップロード</div>
                </button>
                <button className="w-full text-left px-4 py-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                  <div className="font-medium text-orange-900">🎨 サムネイル生成</div>
                  <div className="text-sm text-orange-700">AI自動サムネイル作成</div>
                </button>
                <button className="w-full text-left px-4 py-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors">
                  <div className="font-medium text-yellow-900">📊 アナリティクス</div>
                  <div className="text-sm text-yellow-700">再生回数・収益分析</div>
                </button>
                <button className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                  <div className="font-medium text-green-900">🏷️ タグ・説明文生成</div>
                  <div className="text-sm text-green-700">SEO最適化されたタグ</div>
                </button>
                <button className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                  <div className="font-medium text-purple-900">⏰ 投稿スケジュール</div>
                  <div className="text-sm text-purple-700">最適なタイミングで公開</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SNSLayout>
  );
}

export default function YouTubeDashboard() {
  return (
    <AuthGuard>
      <YouTubeDashboardContent />
    </AuthGuard>
  );
}
