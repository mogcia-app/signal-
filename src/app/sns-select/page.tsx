'use client';

import { useRouter } from 'next/navigation';
import { useUserProfile } from '../../hooks/useUserProfile';
import { AuthGuard } from '../../components/auth-guard';

// SNS情報の定義
const SNS_INFO = {
  instagram: {
    name: 'Instagram',
    icon: '📷',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    description: '写真・動画投稿プラットフォーム'
  },
  x: {
    name: 'X (Twitter)',
    icon: '🐦',
    color: 'bg-gradient-to-r from-blue-400 to-blue-600',
    description: '短文投稿・リアルタイム情報共有'
  },
  youtube: {
    name: 'YouTube',
    icon: '📺',
    color: 'bg-gradient-to-r from-red-500 to-red-700',
    description: '動画配信・チャンネル運営'
  },
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    color: 'bg-gradient-to-r from-black to-gray-800',
    description: 'ショート動画・エンターテイメント'
  }
};

function SNSSelectContent() {
  const router = useRouter();
  const { userProfile, loading, error } = useUserProfile();

  const handleSNSSelect = (snsName: string) => {
    router.push(`/${snsName}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">エラー</h1>
          <p className="text-gray-600">ユーザー情報の取得に失敗しました</p>
        </div>
      </div>
    );
  }

  const contractSNS = userProfile.contractSNS || [];
  const snsAISettings = userProfile.snsAISettings || {};
  const snsWithSettings = Object.keys(snsAISettings);
  
  // デバッグ情報をコンソールに出力
  if (process.env.NODE_ENV === 'development') {
    console.group('🔍 SNS Selection Debug Info');
    console.log('📋 contractSNS:', contractSNS);
    console.log('⚙️ snsAISettings keys:', snsWithSettings);
    console.log('📱 SNS_INFO keys:', Object.keys(SNS_INFO));
    console.log('✅ contractSNS filtered:', contractSNS.filter((sns: string) => SNS_INFO[sns as keyof typeof SNS_INFO]));
    console.log('✅ snsWithSettings filtered:', snsWithSettings.filter((sns: string) => SNS_INFO[sns as keyof typeof SNS_INFO]));
    console.groupEnd();
  }
  
  // 契約SNSまたはAI設定があるSNSを利用可能とする
  const availableSNS = [...new Set([
    ...contractSNS.filter((sns: string) => SNS_INFO[sns as keyof typeof SNS_INFO]),
    ...snsWithSettings.filter((sns: string) => SNS_INFO[sns as keyof typeof SNS_INFO])
  ])];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            SNS選択
          </h1>
          <p className="text-lg text-gray-600">
            管理したいSNSを選択してください
          </p>
          <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                利用可能
              </span>
              <span className="text-gray-600">{availableSNS.length}個</span>
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                AI設定済み
              </span>
              <span className="text-gray-600">{snsWithSettings.length}個</span>
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                アップデート必要
              </span>
              <span className="text-gray-600">{Object.keys(SNS_INFO).length - availableSNS.length}個</span>
            </div>
            <div className="text-gray-500">
              利用形態: {userProfile.usageType === 'team' ? 'チーム利用' : '個人利用'}
            </div>
          </div>
        </div>

        {/* SNS選択グリッド */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(SNS_INFO).map(([snsKey, snsInfo]) => {
            // const isAvailable = contractSNS.includes(snsKey);
            const isContractSNS = availableSNS.includes(snsKey);

            return (
              <div
                key={snsKey}
                className={`relative bg-white rounded-lg shadow-md transition-all duration-200 p-6 border-2 ${
                  isContractSNS 
                    ? 'border-transparent hover:border-blue-300 cursor-pointer' 
                    : 'border-gray-200 opacity-75'
                }`}
                onClick={isContractSNS ? () => handleSNSSelect(snsKey) : undefined}
              >
                <div className="text-center">
                  {/* SNSアイコン */}
                  <div className={`w-16 h-16 mx-auto rounded-full ${snsInfo.color} flex items-center justify-center text-white text-2xl mb-4 ${
                    isContractSNS ? 'group-hover:scale-110 transition-transform duration-200' : ''
                  }`}>
                    {snsInfo.icon}
                  </div>
                  
                  {/* SNS名 */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {snsInfo.name}
                  </h3>
                  
                  {/* 説明 */}
                  <p className="text-sm text-gray-600 mb-4">
                    {snsInfo.description}
                  </p>
                  
                  {/* ステータス表示 */}
                  {isContractSNS ? (
                    <div className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200">
                      選択
                      <svg className="ml-2 -mr-1 w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-gray-100">
                        <svg className="w-4 h-4 mr-1 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        アップデートが必要
                      </div>
                      <p className="text-xs text-gray-500">
                        管理者に契約追加を依頼
                      </p>
                    </div>
                  )}
                </div>

                {/* 利用可能バッジ */}
                {isContractSNS && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      利用可能
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 契約SNSが0個の場合 */}
        {availableSNS.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📱</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              契約SNSがありません
            </h3>
            <p className="text-gray-600 mb-6">
              管理者にSNS契約の設定を依頼してください
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              ダッシュボードに戻る
            </button>
          </div>
        )}

        {/* 戻るボタン */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="mr-2 -ml-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SNSSelect() {
  return (
    <AuthGuard>
      <SNSSelectContent />
    </AuthGuard>
  );
}
