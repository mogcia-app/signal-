"use client";

import SNSLayout from "../../../components/sns-layout";

export default function InstagramPlanPage() {
  return (
    <SNSLayout customTitle="Instagram 運用計画" customDescription="このページは一時停止中です">
      <div className="w-full px-4 md:px-8 py-8">
        {/* 一時停止: 旧 運用計画ページ本体 */}
        <div className="bg-white border border-gray-200 p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">運用計画ページは一時停止中です</h1>
          <p className="text-sm text-gray-600">ホーム画面の「運用計画」エリアをご利用ください。</p>
        </div>
      </div>
    </SNSLayout>
  );
}
