'use client';

import { useUserProfile } from '../../hooks/useUserProfile';
import { useSNSSettings } from '../../hooks/useSNSSettings';
import { AuthGuard } from '../../components/auth-guard';
import SNSLayout from '../../components/sns-layout';

function TikTokDashboardContent() {
  const { userProfile, loading: profileLoading } = useUserProfile();
  const { getSNSSettings } = useSNSSettings();

  const tiktokSettings = getSNSSettings('tiktok');

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  return (
    <SNSLayout 
      currentSNS="tiktok"
      customTitle="TikTok Dashboard"
      customDescription="ショート動画・エンターテイメントの管理画面"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左カラム - AI設定 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">TikTok AI設定</h2>
                <p className="text-sm text-gray-600">自動投稿・トレンド分析・エフェクト設定</p>
              </div>
              <div className="p-6">
                {Object.keys(tiktokSettings).length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {Object.entries(tiktokSettings).map(([key, value]) => (
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
                      管理者にTikTok用のAI設定を依頼してください
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

            {/* アカウント統計 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">アカウント統計</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">フォロワー数</span>
                  <span className="text-sm font-medium text-gray-900">-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">総いいね数</span>
                  <span className="text-sm font-medium text-gray-900">-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">投稿動画数</span>
                  <span className="text-sm font-medium text-gray-900">-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">平均再生回数</span>
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
                <button className="w-full text-left px-4 py-3 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors">
                  <div className="font-medium">🎵 動画投稿</div>
                  <div className="text-sm opacity-80">新しいショート動画を投稿</div>
                </button>
                <button className="w-full text-left px-4 py-3 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors">
                  <div className="font-medium text-pink-900">🎭 エフェクト提案</div>
                  <div className="text-sm text-pink-700">トレンドエフェクトを提案</div>
                </button>
                <button className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                  <div className="font-medium text-purple-900">🎶 音楽・BGM提案</div>
                  <div className="text-sm text-purple-700">バイラル音楽を提案</div>
                </button>
                <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                  <div className="font-medium text-blue-900">📊 トレンド分析</div>
                  <div className="text-sm text-blue-700">人気コンテンツ分析</div>
                </button>
                <button className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                  <div className="font-medium text-green-900">🏷️ ハッシュタグ戦略</div>
                  <div className="text-sm text-green-700">バイラルハッシュタグ</div>
                </button>
                <button className="w-full text-left px-4 py-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                  <div className="font-medium text-orange-900">⏰ 最適投稿時間</div>
                  <div className="text-sm text-orange-700">エンゲージメント最大化</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SNSLayout>
  );
}

export default function TikTokDashboard() {
  return (
    <AuthGuard>
      <TikTokDashboardContent />
    </AuthGuard>
  );
}
