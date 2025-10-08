'use client';

import { useUserProfile } from '../hooks/useUserProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface UserDataDisplayProps {
  showAll?: boolean;
}

export function UserDataDisplay({ showAll = false }: UserDataDisplayProps) {
  const { 
    userProfile, 
    loading, 
    error,
    getContractSNS,
    getBusinessInfo,
    getBillingInfo,
    isContractActive,
    getContractDaysRemaining
  } = useUserProfile();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">データを読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold">エラーが発生しました</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-yellow-800 font-semibold">ユーザー情報が見つかりません</h3>
      </div>
    );
  }

  const contractSNS = getContractSNS();
  const businessInfo = getBusinessInfo();
  const billingInfo = getBillingInfo();
  const contractActive = isContractActive();
  const daysRemaining = getContractDaysRemaining();

  return (
    <div className="space-y-6">
      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            👤 基本情報
            <Badge variant={userProfile.isActive ? "default" : "destructive"}>
              {userProfile.isActive ? "アクティブ" : "非アクティブ"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">ID</p>
              <p className="text-sm">{userProfile.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">メール</p>
              <p className="text-sm">{userProfile.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">表示名</p>
              <p className="text-sm">{userProfile.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">権限</p>
              <Badge variant="outline">{userProfile.role}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">利用形態</p>
              <p className="text-sm">{userProfile.usageType}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">ステータス</p>
              <Badge variant={userProfile.status === 'active' ? "default" : "secondary"}>
                {userProfile.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 契約情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📱 契約情報
            <Badge variant={contractActive ? "default" : "destructive"}>
              {contractActive ? "有効" : "無効"}
            </Badge>
          </CardTitle>
          <CardDescription>
            残り日数: {daysRemaining}日
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">契約タイプ</p>
              <Badge variant="outline">{userProfile.contractType}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">SNS契約数</p>
              <p className="text-sm">{userProfile.contractSNS.length}個</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">契約開始日</p>
              <p className="text-sm">{new Date(userProfile.contractStartDate).toLocaleDateString('ja-JP')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">契約終了日</p>
              <p className="text-sm">{new Date(userProfile.contractEndDate).toLocaleDateString('ja-JP')}</p>
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">契約SNS</p>
            <div className="flex flex-wrap gap-2">
              {contractSNS.map((sns: string) => (
                <Badge key={sns} variant="secondary">
                  {sns}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SNSプロフィール情報は契約SNSセクションで表示 */}

      {/* AI設定 */}
      {userProfile.snsAISettings && Object.keys(userProfile.snsAISettings).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>⚙️ AI設定</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(userProfile.snsAISettings).map(([sns, settings]) => {
                const typedSettings = settings as {
                  aiEnabled?: boolean;
                  autoPosting?: boolean;
                  hashtagOptimization?: boolean;
                  postingFrequency?: string;
                };
                
                return (
                  <div key={sns} className="border rounded-lg p-3">
                    <h4 className="font-semibold capitalize mb-2">{sns}</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">AI有効:</span> 
                        <Badge variant={typedSettings.aiEnabled ? "default" : "secondary"} className="ml-1">
                          {typedSettings.aiEnabled ? "ON" : "OFF"}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">自動投稿:</span> 
                        <Badge variant={typedSettings.autoPosting ? "default" : "secondary"} className="ml-1">
                          {typedSettings.autoPosting ? "ON" : "OFF"}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">ハッシュタグ最適化:</span> 
                        <Badge variant={typedSettings.hashtagOptimization ? "default" : "secondary"} className="ml-1">
                          {typedSettings.hashtagOptimization ? "ON" : "OFF"}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">投稿頻度:</span> {typedSettings.postingFrequency || '未設定'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ビジネス情報 */}
      {showAll && (
        <Card>
          <CardHeader>
            <CardTitle>🏢 ビジネス情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">業界</p>
                <p className="text-sm">{businessInfo.industry}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">会社規模</p>
                <p className="text-sm">{businessInfo.companySize}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">ビジネスタイプ</p>
                <p className="text-sm">{businessInfo.businessType}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">ターゲット市場</p>
                <p className="text-sm">{businessInfo.targetMarket}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">説明</p>
              <p className="text-sm">{businessInfo.description}</p>
            </div>
            {businessInfo.goals.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500">目標</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {businessInfo.goals.map((goal: string, index: number) => (
                    <Badge key={index} variant="outline">{goal}</Badge>
                  ))}
                </div>
              </div>
            )}
            {businessInfo.challenges.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500">課題</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {businessInfo.challenges.map((challenge: string, index: number) => (
                    <Badge key={index} variant="outline">{challenge}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 課金情報 */}
      {showAll && (
        <Card>
          <CardHeader>
            <CardTitle>💰 課金情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              {'paymentMethod' in billingInfo && billingInfo.paymentMethod && (
                <div>
                  <p className="text-sm font-medium text-gray-500">支払い方法</p>
                  <p className="text-sm">{billingInfo.paymentMethod}</p>
                </div>
              )}
              {'nextBillingDate' in billingInfo && billingInfo.nextBillingDate && (
                <div>
                  <p className="text-sm font-medium text-gray-500">次回請求日</p>
                  <p className="text-sm">{new Date(billingInfo.nextBillingDate).toLocaleDateString('ja-JP')}</p>
                </div>
              )}
              {'lastPaymentDate' in billingInfo && billingInfo.lastPaymentDate && (
                <div>
                  <p className="text-sm font-medium text-gray-500">最終支払日</p>
                  <p className="text-sm">{new Date(billingInfo.lastPaymentDate).toLocaleDateString('ja-JP')}</p>
                </div>
              )}
              {'amount' in billingInfo && billingInfo.amount && (
                <div>
                  <p className="text-sm font-medium text-gray-500">金額</p>
                  <p className="text-sm">¥{billingInfo.amount.toLocaleString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* システム情報 */}
      {showAll && (
        <Card>
          <CardHeader>
            <CardTitle>📊 システム情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">作成日時</p>
                <p className="text-sm">{new Date(userProfile.createdAt).toLocaleString('ja-JP')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">更新日時</p>
                <p className="text-sm">{new Date(userProfile.updatedAt).toLocaleString('ja-JP')}</p>
              </div>
            </div>
            {userProfile.notes && (
              <div>
                <p className="text-sm font-medium text-gray-500">管理者メモ</p>
                <p className="text-sm">{userProfile.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
