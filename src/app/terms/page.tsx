'use client';

import React, { useState } from 'react';
// import { 
//   Phone,
//   Mail,
//   MapPin
// } from 'lucide-react';
import SNSLayout from '../../components/sns-layout';

export default function TermsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 9;

  const pages = [
    { id: 1, title: '第1条 総則' },
    { id: 2, title: '第2条 利用登録' },
    { id: 3, title: '第3条 ID及びパスワードの管理' },
    { id: 4, title: '第4条 商品等の購入又は利用' },
    { id: 5, title: '第5条 支払方法' },
    { id: 6, title: '第6条 商品等に関する免責' },
    { id: 7, title: '第7条 定期購入' },
    { id: 8, title: '第8条 フリートライアル' },
    { id: 9, title: '第9条 知的財産権及びコンテンツ' }
  ];

  return (
    <SNSLayout 
      customTitle="利用規約" 
      customDescription="Signal. - SNSマーケティング支援ツール"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-8">
          {/* サイドバー */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-black mb-4">目次</h3>
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
                  <span className="text-sm text-black">
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
                    <h2 className="text-2xl font-bold text-black mb-6">第1条 総則</h2>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <p className="text-blue-800 text-sm">
                        <strong>重要：</strong>本規約は、株式会社MOGCIA（以下「当社」）が提供する「Signal.」（以下「本サービス」）を利用される際に適用されます。ご利用にあたっては、本規約をお読みいただき、内容をご承諾の上でご利用ください。
                      </p>
                    </div>

                    <h3 className="text-lg font-semibold text-black mb-3">（規約の適用）</h3>
                    <p className="text-gray-700 mb-4">
                      本規約は、当社が本サービスを提供する上で、利用者が本サービスの提供を受けるにあたっての諸条件を定めたものです。
                    </p>
                    
                    <p className="text-gray-700 mb-4">
                      当社は、本サービスの提供に関して、本規約のほか、本サービスの利用に関する個別規約その他のガイドライン等を定めることがあります。この場合、当該個別規約その他のガイドライン等は、本規約の一部として利用者による本サービスの利用に優先して適用されるものとします。
                    </p>
                    
                    <p className="text-gray-700 mb-4">
                      利用者が本サービスを利用された場合、利用者が本規約に同意したものとみなします。
                    </p>
                    
                    <p className="text-gray-700 mb-4">
                      利用者が、未成年の場合、利用者は、本サービスの利用について、親権者等法定代理人の同意を得なければなりません。当社は、未成年者の利用者による本サービスの利用については、親権者等法定代理人の同意を得て行為されたものとみなします。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 第2条 利用登録 */}
            {currentPage === 2 && (
              <div>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-6">第2条 利用登録</h2>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                      <p className="text-yellow-800 text-sm">
                        <strong>重要：</strong>利用登録を行う際は、正確かつ最新の情報を提供してください。登録内容に変更が生じた場合は、速やかに変更内容をお知らせください。
                      </p>
                    </div>

                    <h3 className="text-lg font-semibold text-black mb-3">（利用登録）</h3>
                    <p className="text-gray-700 mb-4">
                      利用者は、当社が定める方法により必要事項を登録いただくことで、利用登録を行うことができます。
                    </p>
                    
                    <p className="text-gray-700 mb-4">
                      利用者は、登録事項について、当社に対して正確かつ最新の情報を届け出なければなりません。
                    </p>
                    
                    <p className="text-gray-700 mb-4">
                      登録内容に変更が生じた場合、利用者は、速やかに、変更内容を当社に届け出るものとします。
                    </p>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-red-800 text-sm">
                        <strong>免責事項：</strong>登録内容が不正確若しくは虚偽であり、又は、変更内容について届出がされていないために、利用者が損害又は不利益を被ったとしても、当社は責任を負わないものとします。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 第3条 ID及びパスワードの管理 */}
            {currentPage === 3 && (
              <div>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-6">第3条 ID及びパスワードの管理</h2>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                      <p className="text-red-800 text-sm">
                        <strong>重要：</strong>ID及びパスワードは厳重に管理してください。第三者に知られないよう注意し、紛失・忘失した場合は直ちに当社に通知してください。
                      </p>
                    </div>

                    <h3 className="text-lg font-semibold text-black mb-3">（ID及びパスワードの管理）</h3>
                    <p className="text-gray-700 mb-4">
                      利用者が利用登録を行った場合、当社はID及びパスワードを発行します。
                    </p>
                    
                    <p className="text-gray-700 mb-4">
                      利用者は、ID及びパスワードを厳重に管理し、保管するものとし、これを第三者に貸与、譲渡、売買その他の方法をもって利用させてはならないものとします。ID又はパスワードの管理が不十分なことにより、利用者が損害又は不利益を被ったとしても、当社は責任を負わないものとします。
                    </p>
                    
                    <p className="text-gray-700 mb-4">
                      ID又はパスワードを紛失又は忘失した場合、又はこれらが第三者に使用されていることが判明した場合、利用者は、直ちにその旨を当社に通知するものとします。
                    </p>
                    
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                      <p className="text-orange-800 text-sm">
                        <strong>責任について：</strong>当社は、利用者に発行したID及びパスワードによる本サービスの利用の一切につき、利用者による真正な利用か否かにかかわらず、利用者本人の行為とみなすものとし、利用者は当該行為の結果生じる一切の責任を負担するものとします。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 第4条 商品等の購入又は利用 */}
            {currentPage === 4 && (
              <div>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-6">第4条 商品等の購入又は利用</h2>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <p className="text-blue-800 text-sm">
                        <strong>重要：</strong>商品等の購入又は利用の申込みを行う際は、当社が指定する方法に従って手続きを行ってください。
                      </p>
                    </div>

                    <h3 className="text-lg font-semibold text-black mb-3">（商品等の購入又は利用）</h3>
                    <p className="text-gray-700 mb-4">
                      利用者は、本サービスにより提供される商品、デジタルコンテンツ又は役務（以下「商品等」といいます。）を購入又は利用しようとする場合、当社が指定する方法に従って、商品等の購入又は利用の申込みを行うものとします。
                    </p>
                    
                    <p className="text-gray-700 mb-4">
                      前項の申込みにあたり、利用者が入力した事項及び申込内容を確認の上、申込みを確定するボタンをクリックし、当社が申込みを受信した時をもって、当社との間で当該商品等の購入又は利用に係る契約が成立するものとします。
                    </p>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-red-800 text-sm">
                        <strong>免責事項：</strong>本条の規定に拘わらず、本サービスの利用に関して本規約の違反があった場合、当社は、売買契約の解除、損害賠償請求その他当社が適当と考える措置を講じることができるものとします。当該措置によって利用者が被った損害又は不利益については、当社の故意又は重過失による場合を除いて、当社は一切の責任を負いません。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 第5条 支払方法 */}
            {currentPage === 5 && (
              <div>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-6">第5条 支払方法</h2>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <p className="text-green-800 text-sm">
                        <strong>重要：</strong>商品等の代金は、購入手続において表示される金額を支払う必要があります。支払方法は購入手続において案内される方法又は当社が別途認める方法となります。
                      </p>
                    </div>

                    <h3 className="text-lg font-semibold text-black mb-3">（支払方法）</h3>
                    <p className="text-gray-700 mb-4">
                      利用者は、前条の商品等の購入手続において表示される商品等の代金を支払うものとします。
                    </p>
                    
                    <p className="text-gray-700 mb-4">
                      商品等の代金の支払方法は、購入手続において案内される方法又は当社が別途認める支払方法とします。
                    </p>
                    
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                      <p className="text-orange-800 text-sm">
                        <strong>クレジットカード支払いについて：</strong>クレジットカードによる支払の場合、利用者は、利用者がクレジットカード会社との間で別途契約する条件に従うものとします。クレジットカードの利用に関連して、利用者とクレジットカード会社との間で何らかの紛争が発生した場合、利用者は、自己の責任と費用において、当該紛争を解決するものとします。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 第6条 商品等に関する免責 */}
            {currentPage === 6 && (
              <div>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-6">第6条 商品等に関する免責</h2>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                      <p className="text-red-800 text-sm">
                        <strong>重要：</strong>本サービスを通じて販売される商品等の品質、機能、性能等について、当社の責任は故意又は重過失による場合を除いて限定されます。
                      </p>
                    </div>

                    <h3 className="text-lg font-semibold text-black mb-3">（商品等に関する免責）</h3>
                    <p className="text-gray-700 mb-4">
                      本サービスを通じて販売される商品等の品質、機能、性能、他の物品との適合性その他の欠陥に関する当社の責任は、当社の故意又は重過失による場合を除いて、前条に定めるものに限られるものとします。
                    </p>
                    
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                      <p className="text-orange-800 text-sm">
                        <strong>表示内容について：</strong>当社は、本サービスのウェブサイト上の表示及び利用者が投稿した商品等に関する写真及びコメント並びにTwitter、Instagramその他のSNSサービスに投稿したコメントについて、適法性、有用性、完全性、正確性、最新性、信頼性、特定目的への適合性を含め何らの保証をしません。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 第7条 定期購入 */}
            {currentPage === 7 && (
              <div>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-6">第7条 定期購入</h2>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <p className="text-blue-800 text-sm">
                        <strong>重要：</strong>定期購入（サブスクリプション）は月次で請求され、自動更新されます。料金変更時は事前に通知いたします。
                      </p>
                    </div>

                    <h3 className="text-lg font-semibold text-black mb-3">（定期購入）</h3>
                    <p className="text-gray-700 mb-4">
                      定期購入（サブスクリプション）のプランは、月次で請求されます。各定期購入期間の前に、継続して請求がなされます。
                    </p>
                    
                    <p className="text-gray-700 mb-4">
                      各定期購入期間の終了時に、利用者または当社が定期購入の解約をしない限り、定期購入は自動的に同一の条件で更新されます。
                    </p>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-red-800 text-sm">
                        <strong>支払い停止について：</strong>定期購入の請求が何らかの理由で支払われなかった場合、当社は、当該利用者に対する本サービスの提供を直ちに停止することができます。
                      </p>
                    </div>
                    
                    <p className="text-gray-700 mb-4">
                      当社は、いつでも自由に、定期購入その他の料金を修正することができます。定期購入の料金の修正は、次の定期購入期間の更新の際に適用されます。
                    </p>
                    
                    <p className="text-gray-700 mb-4">
                      当社は、定期購入の料金の変更の前に、利用者に対して定期購入の継続を判断する機会を与えるために、事前に通知を送付します。
                    </p>
                    
                    <p className="text-gray-700 mb-4">
                      定期購入料金の変更後も本サービスの利用を継続される場合は、定期購入料金の変更に同意したものとみなされます。
                    </p>
                    
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                      <p className="text-orange-800 text-sm">
                        <strong>返金について：</strong>法令の定めによる場合を除き、支払済みの定期購入料金は返還されません。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 第8条 フリートライアル */}
            {currentPage === 8 && (
              <div>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-6">第8条 フリートライアル</h2>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <p className="text-green-800 text-sm">
                        <strong>重要：</strong>フリートライアル期間終了までに定期購入をキャンセルしない場合は、自動的に該当の定期購入料を請求されます。
                      </p>
                    </div>

                    <h3 className="text-lg font-semibold text-black mb-3">（フリートライアル）</h3>
                    <p className="text-gray-700 mb-4">
                      当社は、その裁量で、定期購入に期間限定でフリートライアルを提供することがあります。
                    </p>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-red-800 text-sm">
                        <strong>自動課金について：</strong>フリートライアル期間終了期間までに、利用者が定期購入をキャンセルしない場合は、自動的に該当の定期購入料を請求されます。
                      </p>
                    </div>
                    
                    <p className="text-gray-700 mb-4">
                      当社は、いつでも、フリートライアルの利用条件を変更し、その提供を停止することができます。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 第9条 知的財産権及びコンテンツ */}
            {currentPage === 9 && (
              <div>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-6">第9条 知的財産権及びコンテンツ</h2>
                    
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                      <p className="text-orange-800 text-sm">
                        <strong>重要：</strong>本サービスを構成する全ての素材に関する著作権を含む知的財産権は、当社又は当該権利を有する第三者に帰属しています。
                      </p>
                    </div>

                    <h3 className="text-lg font-semibold text-black mb-3">（知的財産権及びコンテンツ）</h3>
                    <p className="text-gray-700 mb-4">
                      本サービスを構成する全ての素材に関する著作権を含む知的財産権その他の一切の権利は、当社又は当該権利を有する第三者に帰属しています。
                    </p>
                    
                    <p className="text-gray-700 mb-4">
                      利用者は、本サービスの全ての素材に関して、一切の権利を取得することはないものとし、権利者の許可なく、素材に関する権利を侵害する一切の行為をしてはならないものとします。
                    </p>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-red-800 text-sm">
                        <strong>使用許諾について：</strong>本規約に基づく本サービスの利用の許諾は、本サービスに関する当社又は当該権利を有する第三者の権利の使用許諾を意味するものではありません。
                      </p>
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
          <p className="text-sm text-black">
            本利用規約は、日本法に準拠し、東京地方裁判所を専属的合意管轄とします。
          </p>
          <p className="text-xs text-black mt-2">
            最終更新日: 2024年1月20日 | 効力発生日: 2024年1月20日
          </p>
        </div>
      </div>
    </SNSLayout>
  );
}