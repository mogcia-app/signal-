'use client';

export default function SimpleInstagramPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-black text-center">
            📷 Instagram Dashboard
          </h1>
          <p className="mt-2 text-sm text-black text-center">
            シンプルバージョン - エラーハンドリングテスト
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-green-600 text-center">
            ✅ このページは正常に動作しています
          </p>
          <div className="mt-4">
            <a 
              href="/instagram/plan" 
              className="block w-full bg-pink-600 hover:bg-pink-700 text-white text-center py-2 px-4 rounded-md"
            >
              運用計画ページへ
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
