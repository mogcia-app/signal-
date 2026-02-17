"use client";

import SNSLayout from "../../../components/sns-layout";

export default function InstagramLabPage() {
  return (
    <SNSLayout customTitle="投稿ラボ" customDescription="このページは一時停止中です">
      <div className="w-full px-4 md:px-8 py-8">
        {/* 一時停止: 旧 投稿ラボページ本体 */}
        <div className="bg-white border border-gray-200 p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">投稿ラボページは一時停止中です</h1>
          <p className="text-sm text-gray-600">ホーム画面の「投稿生成」エリアをご利用ください。</p>
        </div>
      </div>
    </SNSLayout>
  );
}
