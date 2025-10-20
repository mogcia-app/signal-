'use client';

import { useRouter } from 'next/navigation';
import { useUserProfile } from '../../hooks/useUserProfile';
import { AuthGuard } from '../../components/auth-guard';

// SNS情報の定義
const SNS_INFO = {
  instagram: {
    name: 'Instagram',
    icon: (
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    description: '写真・動画投稿プラットフォーム'
  },
  x: {
    name: 'X (Twitter)',
    icon: (
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    color: 'bg-gradient-to-r from-blue-400 to-blue-600',
    description: '短文投稿・リアルタイム情報共有'
  },
  // youtube: {
  //   name: 'YouTube',
  //   icon: '📺',
  //   color: 'bg-gradient-to-r from-red-500 to-red-700',
  //   description: '動画配信・チャンネル運営'
  // },
  tiktok: {
    name: 'TikTok',
    icon: (
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ),
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
          <h1 className="text-2xl font-bold text-black mb-4">エラー</h1>
          <p className="text-black">ユーザー情報の取得に失敗しました</p>
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
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-black mb-4">
            SNS選択
          </h1>
          <p className="text-xl text-black">
            管理したいSNSを選択してください
          </p>
          <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center">
              <span className="inline-flex items-center px-2 py-1 rounded-none text-xs font-medium bg-green-100 text-green-800 mr-2">
                利用可能
              </span>
              <span className="text-black">{availableSNS.length}個</span>
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center px-2 py-1 rounded-none text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                AI設定済み
              </span>
              <span className="text-black">{snsWithSettings.length}個</span>
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center px-2 py-1 rounded-none text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                アップデート必要
              </span>
              <span className="text-black">{Object.keys(SNS_INFO).length - availableSNS.length}個</span>
            </div>
            <div className="text-black">
              利用形態: {userProfile.usageType === 'team' ? 'チーム利用' : '個人利用'}
            </div>
          </div>
        </div>

        {/* SNS選択グリッド */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {Object.entries(SNS_INFO).map(([snsKey, snsInfo]) => {
            // const isAvailable = contractSNS.includes(snsKey);
            const isContractSNS = availableSNS.includes(snsKey);

            return (
              <div
                key={snsKey}
                className={`relative bg-white rounded-none shadow-lg hover:shadow-xl transition-all duration-300 p-8 border-2 ${
                  isContractSNS 
                    ? 'border-transparent hover:border-orange-300 cursor-pointer hover:scale-105' 
                    : 'border-gray-200 opacity-75'
                }`}
                onClick={isContractSNS ? () => handleSNSSelect(snsKey) : undefined}
              >
                <div className="text-center">
                  {/* SNSアイコン */}
                  <div className={`w-20 h-20 mx-auto rounded-none ${snsInfo.color} flex items-center justify-center text-white text-3xl mb-6 ${
                    isContractSNS ? 'group-hover:scale-110 transition-transform duration-200' : ''
                  }`}>
                    {snsInfo.icon}
                  </div>
                  
                  {/* SNS名 */}
                  <h3 className="text-xl font-bold text-black mb-3">
                    {snsInfo.name}
                  </h3>
                  
                  {/* 説明 */}
                  <p className="text-base text-black mb-6">
                    {snsInfo.description}
                  </p>
                  
                  {/* ステータス表示 */}
                  {isContractSNS ? (
                    <div className="inline-flex items-center justify-center px-8 py-2 border border-transparent text-sm font-medium rounded-none text-white bg-orange-500 hover:bg-orange-600 transition-all duration-200 min-w-[120px] h-10">
                      選択
                      <svg className="ml-2 w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-none text-gray-700 bg-gray-100">
                        <svg className="w-4 h-4 mr-1 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        アップデートが必要
                      </div>
                      <p className="text-xs text-black">
                        管理者に契約追加を依頼
                      </p>
                    </div>
                  )}
                </div>

                {/* 利用可能バッジ */}
                {isContractSNS && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-none text-xs font-medium bg-green-100 text-green-800">
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
            <div className="text-black text-6xl mb-4">📱</div>
            <h3 className="text-lg font-medium text-black mb-2">
              契約SNSがありません
            </h3>
            <p className="text-black mb-6">
              管理者にSNS契約の設定を依頼してください
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-none shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              ダッシュボードに戻る
            </button>
          </div>
        )}

        {/* 戻るボタン */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-none shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
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
