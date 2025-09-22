'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import SNSLayout from '../../components/sns-layout';

export default function TermsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 8;

  const pages = [
    { id: 1, title: '第1条 総則' },
    { id: 2, title: '第2条 サブスクリプション' },
    { id: 3, title: '第3条 支払い条件' },
    { id: 4, title: '第4条 解約・返金' },
    { id: 5, title: '第5条 免責事項' },
    { id: 6, title: '第6条 プライバシー' },
    { id: 7, title: '第7条 知的財産権' },
    { id: 8, title: '第8条 その他' }
  ];

  return (
    <SNSLayout 
      currentSNS="instagram" 
      customTitle="利用規約" 
      customDescription="Signal. - SNSマーケティング支援ツール"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-8">
          {/* サイドバー */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">目次</h3>
              <nav className="space-y-2">
                {pages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => setCurrentPage(page.id)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      currentPage === page.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page.title}
                  </button>
                ))}
              </nav>
              
              {/* ページナビゲーション */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">
                    {currentPage} / {totalPages}
                  </span>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    前へ
                  </button>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    次へ
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            {/* 第1条 総則 */}
            {currentPage === 1 && (
              <div>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">第1条 総則</h2>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第1項 目的</h3>
                    <p className="text-gray-700 mb-4">
                      本利用規約は、株式会社MOGCIA（以下「当社」）が提供するSignal.サービス（以下「本サービス」）の利用条件を定めるものです。
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-blue-800 text-sm">
                        <strong>重要：</strong>本サービスをご利用いただく前に、必ず本利用規約をお読みください。
                        本サービスをご利用いただくことで、本利用規約に同意したものとみなします。
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第2項 サービス内容</h3>
                    <p className="text-gray-700 mb-4">
                      Signal.は、Instagram、Twitter、YouTube、TikTokなどのSNSプラットフォームでのマーケティング活動を支援するツールです。
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>投稿の分析・最適化</li>
                      <li>AIを活用したコンテンツ提案</li>
                      <li>競合分析・トレンド分析</li>
                      <li>運用計画の立案・管理</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第3項 適用範囲</h3>
                    <p className="text-gray-700">
                      本利用規約は、本サービスのすべての機能、コンテンツ、およびユーザーとの関係に適用されます。
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第4項 規約の変更</h3>
                    <p className="text-gray-700">
                      当社は、必要に応じて本利用規約を変更することができます。変更後の利用規約は、当社が別途定める場合を除き、本サービス上に表示した時点から効力を生じるものとします。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 第2条 サブスクリプション */}
            {currentPage === 2 && (
              <div>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">第2条 サブスクリプション</h2>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第1項 サブスクリプション契約</h3>
                    <p className="text-gray-700 mb-4">
                      本サービスは、月額または年額のサブスクリプション契約によりご利用いただけます。
                      契約期間中は、契約プランに応じた機能をご利用いただけます。
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <p className="text-yellow-800 text-sm font-semibold mb-2">解約に関する重要事項：</p>
                      <ul className="text-yellow-800 text-sm space-y-1">
                        <li>• 解約は更新日の<strong>1ヶ月前まで</strong>にお手続きください</li>
                        <li>• 途中解約の場合、残り期間分の料金をお支払いいただきます</li>
                        <li>• 解約手続き後も、契約期間終了までサービスをご利用いただけます</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第2項 料金プラン</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900">スタータープラン</h4>
                        <p className="text-2xl font-bold text-blue-600 mt-2">¥3,980<span className="text-sm text-gray-500">/月</span></p>
                        <ul className="text-sm text-gray-600 mt-3 space-y-1">
                          <li>• 基本分析機能</li>
                          <li>• 月50投稿まで</li>
                          <li>• メールサポート</li>
                        </ul>
                      </div>
                      <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                        <h4 className="font-semibold text-gray-900">プロプラン</h4>
                        <p className="text-2xl font-bold text-blue-600 mt-2">¥9,980<span className="text-sm text-gray-500">/月</span></p>
                        <ul className="text-sm text-gray-600 mt-3 space-y-1">
                          <li>• 全分析機能</li>
                          <li>• 無制限投稿</li>
                          <li>• AI機能</li>
                          <li>• 優先サポート</li>
                        </ul>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900">エンタープライズ</h4>
                        <p className="text-2xl font-bold text-blue-600 mt-2">カスタム</p>
                        <ul className="text-sm text-gray-600 mt-3 space-y-1">
                          <li>• 全機能</li>
                          <li>• 専用サポート</li>
                          <li>• カスタマイズ</li>
                          <li>• SLA保証</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第3項 自動更新</h3>
                    <p className="text-gray-700">
                      サブスクリプションは自動的に更新されます。解約をご希望の場合は、
                      更新日の1ヶ月前までにマイアカウントページから解約手続きを行ってください。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 第3条 支払い条件 */}
            {currentPage === 3 && (
              <div>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">第3条 支払い条件</h2>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第1項 支払い方法</h3>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-red-800 text-sm font-semibold mb-2">支払い期限と法的措置：</p>
                      <ul className="text-red-800 text-sm space-y-1">
                        <li>• 振り込み支払いの場合、請求書発行から<strong>15日以内</strong>にお支払いください</li>
                        <li>• 支払いが遅延した場合、最大30日間の猶予期間を設けます</li>
                        <li>• 支払いがなく、連絡もつかない場合は<strong>法的措置を取らせていただく場合があります</strong></li>
                        <li>• 延滞料として月利14.6%の利息が発生します</li>
                      </ul>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">クレジットカード</h4>
                        <p className="text-sm text-gray-600">
                          Visa、MasterCard、JCB、American Expressに対応しています。
                          毎月自動引き落としとなります。
                        </p>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">銀行振込</h4>
                        <p className="text-sm text-gray-600">
                          請求書発行から15日以内にお支払いください。
                          振込手数料はお客様負担となります。
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第2項 料金の変更</h3>
                    <p className="text-gray-700">
                      料金の変更は、30日前に事前通知を行います。料金変更に同意いただけない場合は、
                      解約手続きを行ってください。
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第3項 税務処理</h3>
                    <p className="text-gray-700">
                      料金には消費税が含まれています。請求書は自動的に発行され、
                      確定申告等でご利用いただけます。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 第4条 解約・返金 */}
            {currentPage === 4 && (
              <div>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">第4条 解約・返金</h2>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第1項 解約手続き</h3>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                      <p className="text-orange-800 text-sm font-semibold mb-2">解約に関する重要事項：</p>
                      <ul className="text-orange-800 text-sm space-y-1">
                        <li>• 解約は更新日の<strong>1ヶ月前まで</strong>にお手続きください</li>
                        <li>• 途中解約の場合、残り期間分の料金は<strong>返金されません</strong></li>
                        <li>• 解約手続き後も、契約期間終了までサービスをご利用いただけます</li>
                      </ul>
                    </div>
                    <ol className="list-decimal list-inside text-gray-700 space-y-2">
                      <li>マイアカウントページにログイン</li>
                      <li>「アカウント設定」→「サブスクリプション管理」</li>
                      <li>「解約」ボタンをクリック</li>
                      <li>解約理由の選択と確認</li>
                      <li>解約完了メールの受信</li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第2項 返金ポリシー</h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <ul className="text-gray-700 space-y-2">
                        <li>• 初回利用から7日以内の場合：全額返金</li>
                        <li>• 7日を超える場合：返金なし</li>
                        <li>• 途中解約の場合：残り期間分の料金は返金されません</li>
                        <li>• 返金は元の支払い方法に戻されます（10-15営業日）</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 第5条 免責事項 */}
            {currentPage === 5 && (
              <div>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">第5条 免責事項</h2>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第1項 サービス利用に関する免責</h3>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-red-800 text-sm font-semibold mb-2">効果保証に関する免責事項：</p>
                      <div className="text-red-800 text-sm space-y-2">
                        <p>
                          <strong>本サービスは必ずバズる効果を保証するものではありません。</strong>
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>SNSでの成果は、コンテンツの質、タイミング、ターゲット層など様々な要因に依存します</li>
                          <li>フォロワー増加、エンゲージメント向上、売上向上などの効果は保証できません</li>
                          <li>競合他社の動向や、SNSプラットフォームの仕様変更により効果が変動する可能性があります</li>
                          <li>AI機能は提案であり、必ずしも最適解とは限りません</li>
                        </ul>
                      </div>
                    </div>
                    <ul className="text-gray-700 space-y-2">
                      <li>• 本サービスの利用により生じた損害について、当社は一切の責任を負いません</li>
                      <li>• サービス停止、データ消失、アクセス不能などが発生しても責任を負いません</li>
                      <li>• 第三者との間で生じたトラブルについて、当社は関与しません</li>
                      <li>• 本サービスは「現状のまま」提供され、瑕疵のないことを保証しません</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第2項 技術的制限</h3>
                    <ul className="text-gray-700 space-y-2">
                      <li>• SNSプラットフォームのAPI制限により、一部機能が制限される場合があります</li>
                      <li>• インターネット接続環境により、パフォーマンスが変動する場合があります</li>
                      <li>• ブラウザの互換性により、一部機能が利用できない場合があります</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 第6条 プライバシー */}
            {currentPage === 6 && (
              <div>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">第6条 プライバシー</h2>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第1項 個人情報の取り扱い</h3>
                    <ul className="text-gray-700 space-y-2">
                      <li>• お客様の個人情報は、プライバシーポリシーに従って適切に管理されます</li>
                      <li>• 第三者への提供は、法令に基づく場合を除き行いません</li>
                      <li>• データの暗号化、アクセス制限など、適切なセキュリティ対策を実施します</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第2項 データの利用目的</h3>
                    <ul className="text-gray-700 space-y-2">
                      <li>• サービスの提供・改善</li>
                      <li>• お客様サポート</li>
                      <li>• 分析・統計（個人を特定できない形で）</li>
                      <li>• 法的義務の履行</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第3項 データの保存期間</h3>
                    <p className="text-gray-700">
                      お客様のデータは、アカウント削除後30日以内に削除されます。
                      法令により保存が義務付けられている場合を除きます。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 第7条 知的財産権 */}
            {currentPage === 7 && (
              <div>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">第7条 知的財産権</h2>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第1項 著作権・知的財産権</h3>
                    <p className="text-gray-700 mb-4">
                      お客様が作成・投稿したコンテンツの著作権はお客様に帰属します。
                      当社は、サービス提供のために必要な範囲でのみコンテンツを利用します。
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第2項 禁止事項</h3>
                    <ul className="text-gray-700 space-y-2">
                      <li>• 著作権、商標権、その他の知的財産権を侵害する行為</li>
                      <li>• 第三者の権利を侵害する行為</li>
                      <li>• 法令に違反する行為</li>
                      <li>• 公序良俗に反する行為</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第3項 損害賠償</h3>
                    <p className="text-gray-700">
                      お客様が本利用規約に違反したことにより当社に損害が生じた場合、
                      お客様は当社に対して損害賠償責任を負います。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 第8条 その他 */}
            {currentPage === 8 && (
              <div>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">第8条 その他</h2>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第1項 準拠法・管轄裁判所</h3>
                    <p className="text-gray-700 mb-4">
                      本利用規約は、日本法に準拠し、東京地方裁判所を専属的合意管轄とします。
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第2項 お問い合わせ</h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h4 className="font-semibold text-blue-900 mb-3">サポートセンター</h4>
                      <div className="space-y-3">
                        <div className="flex items-center text-blue-800">
                          <Mail className="w-5 h-5 mr-3" />
                          <span>support@signal-app.com</span>
                        </div>
                        <div className="flex items-center text-blue-800">
                          <Phone className="w-5 h-5 mr-3" />
                          <span>03-1234-5678（平日 10:00-18:00）</span>
                        </div>
                        <div className="flex items-center text-blue-800">
                          <MapPin className="w-5 h-5 mr-3" />
                          <span>東京都渋谷区恵比寿1-1-1 恵比寿ビル10F</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第3項 法的情報</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>会社名: 株式会社MOGCIA</p>
                      <p>代表取締役: 田中太郎</p>
                      <p>設立: 2024年1月</p>
                      <p>資本金: 1,000万円</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            本利用規約は、日本法に準拠し、東京地方裁判所を専属的合意管轄とします。
          </p>
          <p className="text-xs text-gray-400 mt-2">
            最終更新日: 2024年1月20日 | 効力発生日: 2024年1月20日
          </p>
        </div>
      </div>
    </SNSLayout>
  );
}