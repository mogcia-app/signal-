'use client';

import { useState } from 'react';

export default function TestSentryPage() {
  const [errorThrown, setErrorThrown] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 本番環境でのアクセス制限
  const isProduction = process.env.NODE_ENV === 'production';
  const enableTest = process.env.NEXT_PUBLIC_ENABLE_SENTRY_TEST === 'true';

  const triggerError = () => {
    try {
      // 意図的なエラーを発生させる
      (window as any).undefinedFunction();
    } catch (error) {
      setErrorThrown(true);
      // Sentryにエラーを報告
      throw error;
    }
  };

  const triggerAsyncError = async () => {
    try {
      // 非同期エラーを発生させる
      await Promise.reject(new Error('Async error test'));
    } catch (error) {
      setErrorThrown(true);
      throw error;
    }
  };

  const triggerTypeError = () => {
    try {
      const obj: any = null;
      obj.method();
    } catch (error) {
      setErrorThrown(true);
      throw error;
    }
  };

  // 本番環境でアクセス制限をチェック
  if (isProduction && !enableTest) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Sentry エラーテスト</h1>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-yellow-700">
            ⚠️ 本番環境ではテストページは無効化されています。
            <br />
            環境変数 NEXT_PUBLIC_ENABLE_SENTRY_TEST=true を設定すると使用できます。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Sentry エラーテスト</h1>
      
      <div className="space-y-4">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-yellow-700">
            ⚠️ このページはSentryのエラー監視をテストするためのものです。
            エラーをSentryに送信します。
          </p>
        </div>

        <div className="grid gap-4">
          <button
            onClick={triggerError}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            🔴 undefinedFunction() エラーをテスト
          </button>

          <button
            onClick={triggerAsyncError}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            🔵 非同期エラーをテスト
          </button>

          <button
            onClick={triggerTypeError}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            🟢 TypeError をテスト
          </button>
        </div>

        {errorThrown && (
          <div className="mt-6 bg-green-50 border-l-4 border-green-400 p-4">
            <p className="text-green-700">
              ✅ エラーがSentryに送信されました。Sentryダッシュボードで確認してください。
            </p>
          </div>
        )}

        <div className="mt-8 p-4 bg-gray-50 rounded">
          <h2 className="text-xl font-bold mb-3">テスト項目</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>undefinedFunction(): 定義されていない関数呼び出しエラー</li>
            <li>Async Error: 非同期処理でのエラー</li>
            <li>TypeError: nullやundefinedのメソッド呼び出し</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

