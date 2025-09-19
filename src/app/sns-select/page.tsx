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
  twitter: {
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
    router.push(`/dashboard/${snsName}`);
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
  const availableSNS = contractSNS.filter(sns => SNS_INFO[sns as keyof typeof SNS_INFO]);

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
          <div className="mt-4 text-sm text-gray-500">
            契約SNS: {contractSNS.length}個 | 利用形態: {userProfile.usageType === 'team' ? 'チーム利用' : '個人利用'}
          </div>
        </div>

        {/* SNS選択グリッド */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {availableSNS.map((snsName) => {
            const snsInfo = SNS_INFO[snsName as keyof typeof SNS_INFO];
            if (!snsInfo) return null;

            return (
              <button
                key={snsName}
                onClick={() => handleSNSSelect(snsName)}
                className="group relative bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 border-2 border-transparent hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="text-center">
                  {/* SNSアイコン */}
                  <div className={`w-16 h-16 mx-auto rounded-full ${snsInfo.color} flex items-center justify-center text-white text-2xl mb-4 group-hover:scale-110 transition-transform duration-200`}>
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
                  
                  {/* 選択ボタン */}
                  <div className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 group-hover:bg-blue-700 transition-colors duration-200">
                    選択
                    <svg className="ml-2 -mr-1 w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </button>
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
