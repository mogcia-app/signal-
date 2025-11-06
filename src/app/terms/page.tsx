"use client";

import React from "react";
import SNSLayout from "../../components/sns-layout";

export default function TermsPage() {
  const articleStyle = "text-gray-700 mb-4 leading-relaxed";

  return (
    <SNSLayout customTitle="利用規約" customDescription="Signal. - SNSマーケティング支援ツール">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* ヘッダー */}
          <div className="mb-8 text-center border-b border-gray-200 pb-6">
            <h1 className="text-3xl font-bold text-black mb-4">利用規約</h1>
            <p className="text-sm text-gray-600">施行日: 2025年6月1日</p>
          </div>

          {/* 前文 */}
          <div className="mb-12">
            <p className={articleStyle}>
              本利用規約（以下「本規約」といいます。）は、Signal.（以下「本サービス」といいます。）の利用条件を定めるものです。
            </p>
            <p className={articleStyle}>
              本サービスを利用するすべてのユーザー（以下「ユーザー」といいます。）は、本規約に同意した上で本サービスを利用するものとします。
            </p>
          </div>

          <div className="prose max-w-none space-y-10">
            {/* 第1条 */}
            <section id="article-1" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-black mb-4">第1条（目的および適用範囲）</h2>

              <div className="pl-6 space-y-3">
                <p className={articleStyle}>
                  <span className="font-semibold">1.</span>{" "}
                  本規約は、ユーザーと本サービスの運営者（以下「当社」といいます。）との間における、本サービスの利用に関する一切の関係を定めるものです。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">2.</span>{" "}
                  本サービスは、AI技術を活用し、SNS運用やマーケティング活動の効率化・最適化を支援することを目的としています。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">3.</span>{" "}
                  本サービスは、SNS公式APIを用いず、独自の分析およびAI出力機能に基づいて提供されます。
                </p>
              </div>
            </section>

            <hr className="border-gray-300" />

            {/* 第2条 */}
            <section id="article-2" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-black mb-4">第2条（定義）</h2>

              <div className="pl-6 space-y-3">
                <p className={articleStyle}>
                  <span className="font-semibold">1.</span>{" "}
                  「本サービス」とは、AIを活用したSNS運用支援およびコンテンツ提案等の機能を有するオンラインツールをいいます。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">2.</span>{" "}
                  「AI生成コンテンツ」とは、本サービスのAIが自動生成する文章、アイデア、提案、分析、その他出力物をいいます。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">3.</span>{" "}
                  「ユーザー」とは、本サービスを契約の上、利用する個人または法人をいいます。
                </p>
              </div>
            </section>

            <hr className="border-gray-300" />

            {/* 第3条 */}
            <section id="article-3" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-black mb-4">第3条（契約期間および更新）</h2>

              <div className="pl-6 space-y-3">
                <p className={articleStyle}>
                  <span className="font-semibold">1.</span>{" "}
                  本サービスの契約期間は、原則として1年間とします。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">2.</span>{" "}
                  契約満了日の1か月前までに書面または電子メールで解約の意思表示がない場合、同一条件にて自動的に1年間更新されるものとします。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">3.</span>{" "}
                  当社は、契約満了日の1か月前までに、電子メールまたは書面により更新の通知を行います。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">4.</span>{" "}
                  契約期間中の途中解約は原則認められず、ユーザーは残存期間分の利用料金を全額支払う義務を負います。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">5.</span>{" "}
                  当社が特別に認めた場合を除き、日割り・月割り等による返金は行いません。
                </p>
              </div>
            </section>

            <hr className="border-gray-300" />

            {/* 第4条 */}
            <section id="article-4" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-black mb-4">第4条（利用登録）</h2>

              <div className="pl-6 space-y-3">
                <p className={articleStyle}>
                  <span className="font-semibold">1.</span>{" "}
                  本サービスを利用するには、当社所定の方法により契約およびアカウント登録を行う必要があります。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">2.</span>{" "}
                  登録時に虚偽の情報を申請した場合や、過去に規約違反の履歴がある場合、当社は登録を拒否できるものとします。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">3.</span>{" "}
                  ユーザーは、登録情報（メールアドレス、連絡先等）に変更が生じた場合、速やかに当社に届け出るものとします。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">4.</span>{" "}
                  アカウント情報の管理責任はユーザーにあり、第三者への譲渡・貸与は禁止します。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">5.</span>{" "}
                  暴力団、暴力団員、暴力団準構成員、暴力団関係企業、総会屋、社会運動等標ぼうゴロ、特殊知能暴力集団その他これらに準じる者（以下「反社会的勢力」という）が本サービスを利用することを禁止します。反社会的勢力であることが判明した場合、当社は登録を取り消し、契約を解除することができます。
                </p>
              </div>
            </section>

            <hr className="border-gray-300" />

            {/* 第5条 */}
            <section id="article-5" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-black mb-4">第5条（禁止事項）</h2>

              <p className={`${articleStyle} font-semibold mb-4`}>
                ユーザーは、本サービスの利用に際し、以下の行為を行ってはなりません。
              </p>

              <div className="pl-6 space-y-3">
                <p className={articleStyle}>
                  <span className="font-semibold">1.</span> 法令または公序良俗に違反する行為
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">2.</span>{" "}
                  著作権、肖像権、商標権、プライバシー等の他者の権利を侵害する行為
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">3.</span>{" "}
                  差別的、誹謗中傷的、暴力的、性的な内容をAIに生成させる行為
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">4.</span>{" "}
                  本サービスの成果物やAI出力を第三者に販売、転用、再配布する行為
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">5.</span>{" "}
                  不正アクセス、リバースエンジニアリング、情報改ざん等の行為
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">6.</span>{" "}
                  当社または他のユーザーに不利益を与える行為
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">7.</span>{" "}
                  過度なアクセス、自動化ツール、スクリプト等を用いた本サービスの利用制限を回避する行為
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">8.</span>{" "}
                  本サービスの利用権利を第三者に譲渡、貸与または売却する行為
                </p>
              </div>
            </section>

            <hr className="border-gray-300" />

            {/* 第6条 */}
            <section id="article-6" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-black mb-4">第6条（サービス内容）</h2>

              <div className="pl-6 space-y-3">
                <p className={articleStyle}>
                  <span className="font-semibold">1.</span>{" "}
                  本サービスは、AIによるコンテンツ提案・投稿支援・戦略立案支援などを提供します。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">2.</span>{" "}
                  当社は、予告なくサービス内容を変更・追加・停止できるものとします。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">3.</span>{" "}
                  本サービスは、SNSとの直接連携（API接続等）を行っておらず、ユーザー自身の判断と操作によりSNS投稿を行うものとします。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">4.</span>{" "}
                  本サービスの利用には、インターネット接続環境、適切なブラウザ（Google
                  Chrome推奨）、または当社指定の環境が必要です。利用環境の要件は本サービス上で別途案内いたします。
                </p>
              </div>
            </section>

            <hr className="border-gray-300" />

            {/* 第7条 */}
            <section id="article-7" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-black mb-4">
                第7条（AI生成コンテンツの取り扱い）
              </h2>

              <div className="pl-6 space-y-3">
                <p className={articleStyle}>
                  <span className="font-semibold">1.</span>{" "}
                  AI生成コンテンツは自動生成されるものであり、その正確性、合法性、信頼性を当社は保証しません。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">2.</span>{" "}
                  ユーザーは、AI生成コンテンツの利用・公開に関して自己の責任において確認・修正・投稿するものとします。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">3.</span>{" "}
                  当社は、品質向上およびサービス改善のため、生成結果や利用データを匿名化のうえ内部分析に使用する場合があります。
                </p>
              </div>
            </section>

            <hr className="border-gray-300" />

            {/* 第8条 */}
            <section id="article-8" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-black mb-4">第8条（利用料金および支払い）</h2>

              <div className="pl-6 space-y-3">
                <p className={articleStyle}>
                  <span className="font-semibold">1.</span>{" "}
                  本サービスの利用料金、支払い方法、支払い期日は、契約時に別途定める条件によります。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">2.</span>{" "}
                  支払い方法は銀行振り込みとし、一括払い（1年分）または月次払い（毎月）から選択できます。振込手数料はユーザーの負担とします。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">3.</span>{" "}
                  支払い期日までに振込みが確認できない場合、当社は本サービスの提供を停止することができます。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">4.</span>{" "}
                  領収書が必要な場合は、契約時に申し出るものとし、当社は請求に応じて領収書を発行します。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">5.</span>{" "}
                  支払い済みの料金は、理由の如何を問わず返金いたしません。
                </p>
              </div>
            </section>

            <hr className="border-gray-300" />

            {/* 第9条 */}
            <section id="article-9" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-black mb-4">第9条（免責事項）</h2>

              <div className="pl-6 space-y-3">
                <p className={articleStyle}>
                  <span className="font-semibold">1.</span>{" "}
                  当社は、本サービスの利用により発生した損害（営業損失、データ消失、第三者からの請求等）について、一切の責任を負いません。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">2.</span>{" "}
                  AI出力結果の利用により生じた結果や判断についても、当社は責任を負いません。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">3.</span>{" "}
                  本サービスの提供遅延、停止、障害等により損害が発生しても、当社の故意または重過失による場合を除き、一切責任を負いません。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">4.</span>{" "}
                  インターネット接続の断絶、通信環境の問題、端末の故障等によりサービスを利用できない場合、当社は責任を負いません。
                </p>
              </div>
            </section>

            <hr className="border-gray-300" />

            {/* 第10条 */}
            <section id="article-10" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-black mb-4">
                第10条（契約解除および利用停止）
              </h2>

              <div className="pl-6 space-y-3">
                <p className={articleStyle}>
                  <span className="font-semibold">1.</span>{" "}
                  当社は、ユーザーが本規約に違反した場合、事前通知なく契約の解除または利用停止を行うことができます。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">2.</span>{" "}
                  前項以外の理由により契約を解除または利用を停止する場合は、当社は電子メールまたは書面により事前に通知します。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">3.</span>{" "}
                  解除後であっても、未払いの料金がある場合、ユーザーは直ちに支払うものとします。
                </p>
              </div>
            </section>

            <hr className="border-gray-300" />

            {/* 第11条 */}
            <section id="article-11" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-black mb-4">第11条（知的財産権）</h2>

              <div className="pl-6 space-y-3">
                <p className={articleStyle}>
                  <span className="font-semibold">1.</span>{" "}
                  本サービスに関する著作権、商標権、プログラム、デザイン、データ等の知的財産権は、当社または正当な権利を有する第三者に帰属します。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">2.</span>{" "}
                  ユーザーは、本サービスを通じて得た情報や成果物を、契約目的以外で使用してはなりません。
                </p>
              </div>
            </section>

            <hr className="border-gray-300" />

            {/* 第12条 */}
            <section id="article-12" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-black mb-4">第12条（個人情報の取り扱い）</h2>

              <div className="pl-6">
                <p className={articleStyle}>
                  ユーザーの個人情報は、当社が別途定める「プライバシーポリシー」に従い、適切に管理・利用します。
                </p>
              </div>
            </section>

            <hr className="border-gray-300" />

            {/* 第13条 */}
            <section id="article-13" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-black mb-4">第13条（規約の変更）</h2>

              <div className="pl-6">
                <p className={articleStyle}>
                  当社は、必要に応じて本規約を変更できるものとします。変更後の内容は、本サービス上での表示または電子通知をもって効力を生じるものとします。
                </p>
              </div>
            </section>

            <hr className="border-gray-300" />

            {/* 第14条 */}
            <section id="article-14" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-black mb-4">
                第14条（損害賠償および責任の制限）
              </h2>

              <div className="pl-6">
                <p className={articleStyle}>
                  当社の責任は、当該損害が当社の故意または重大な過失によって発生した場合に限り、ユーザーが支払った直近1年分の利用料金を上限とします。
                </p>
              </div>
            </section>

            <hr className="border-gray-300" />

            {/* 第15条 */}
            <section id="article-15" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-black mb-4">第15条（準拠法および裁判管轄）</h2>

              <div className="pl-6">
                <p className={articleStyle}>
                  本規約は日本法に準拠し、本サービスに関して生じた紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
                </p>
              </div>
            </section>

            <hr className="border-gray-300" />

            {/* 第16条 */}
            <section id="article-16" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-black mb-4">
                第16条（データの保存および削除）
              </h2>

              <div className="pl-6 space-y-3">
                <p className={articleStyle}>
                  <span className="font-semibold">1.</span>{" "}
                  当社は、ユーザーの利用状況、投稿内容、生成データ等を本サービスの提供のために保存する場合があります。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">2.</span>{" "}
                  契約終了後、当社は適切な期間を経てユーザーデータを削除します。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">3.</span>{" "}
                  ユーザーは、自己のデータを契約期間中にダウンロードまたは保存する責任を負います。契約終了後、データへのアクセスを保証するものではありません。
                </p>
              </div>
            </section>

            <hr className="border-gray-300" />

            {/* 第17条 */}
            <section id="article-17" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-black mb-4">
                第17条（サービスの停止・メンテナンス）
              </h2>

              <div className="pl-6 space-y-3">
                <p className={articleStyle}>
                  <span className="font-semibold">1.</span>{" "}
                  当社は、システムメンテナンス、サーバー保守、その他業務上の必要がある場合、本サービスを一時的に停止することがあります。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">2.</span>{" "}
                  前項の場合、可能な限り事前に電子メールまたは本サービス上で通知いたします。ただし、緊急性の高い場合は事前通知なく停止することがあります。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">3.</span>{" "}
                  メンテナンスその他により生じた利用者の損害について、当社は責任を負いません。
                </p>
              </div>
            </section>

            <hr className="border-gray-300" />

            {/* 第18条 */}
            <section id="article-18" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-black mb-4">第18条（セキュリティ）</h2>

              <div className="pl-6 space-y-3">
                <p className={articleStyle}>
                  <span className="font-semibold">1.</span>{" "}
                  当社は、本サービスのセキュリティ向上のため、適切な技術的・組織的対策を講じます。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">2.</span>{" "}
                  当社は、サイバー攻撃、不正アクセス、データ漏洩等の脅威に対するセキュリティ対策を実施します。ただし、完全なセキュリティの保証はできません。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">3.</span>{" "}
                  セキュリティ上の問題が発見された場合、当社は必要に応じて本サービスの利用を一時的に停止し、速やかに復旧に努めます。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">4.</span>{" "}
                  ユーザーは、アカウント情報、パスワード等を適切に管理し、第三者に漏洩させないよう注意するものとします。ユーザーの管理不備により発生した損害について、当社は責任を負いません。
                </p>
              </div>
            </section>

            <hr className="border-gray-300" />

            {/* 第19条 */}
            <section id="article-19" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-black mb-4">第19条（事業譲渡）</h2>

              <div className="pl-6 space-y-3">
                <p className={articleStyle}>
                  <span className="font-semibold">1.</span>{" "}
                  当社は、本サービスにかかる事業を他社に譲渡する場合、当該事業譲渡に伴い本契約上の地位、本規約に基づく権利及び義務並びにユーザーの登録情報、その他ユーザー情報を当該事業譲渡の譲受人に譲渡することができるものとします。
                </p>
                <p className={articleStyle}>
                  <span className="font-semibold">2.</span>{" "}
                  前項の事業譲渡の場合、ユーザーは本規約に基づく契約を終了させることができます。
                </p>
              </div>
            </section>

            <hr className="border-gray-300" />

            {/* 第20条 */}
            <section id="article-20" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-black mb-4">第20条（分離可能性）</h2>

              <div className="pl-6 space-y-3">
                <p className={articleStyle}>
                  本規約のいずれかの条項またはその一部が無効または執行不能と判断された場合であっても、本規約の残りの部分および該当条項の残りの部分は、継続して完全に効力を有するものとします。
                </p>
              </div>
            </section>

            <hr className="border-gray-300" />

            {/* 附則 */}
            <section id="supplementary-provisions" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-black mb-4">附則</h2>

              <div className="pl-6 space-y-3">
                <p className="text-lg font-semibold text-gray-800">
                  本規約は 2025年6月1日より施行します。
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* お問い合わせ窓口 */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-black mb-3">お問い合わせ窓口</h3>
          <p className="text-gray-700 text-sm mb-2">
            本規約に関するご質問、ご不明点がございましたら、以下の窓口までお問い合わせください。
          </p>
          <p className="text-gray-700 text-sm">info@signalapp.jp</p>
        </div>
      </div>
    </SNSLayout>
  );
}
