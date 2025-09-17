'use client';

import { useState } from 'react';
import { callHelloWorld, callApi } from '../lib/functions';

export default function Home() {
  const [helloResult, setHelloResult] = useState<string>('');
  const [apiResult, setApiResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const testHelloWorld = async () => {
    setLoading(true);
    try {
      const result = await callHelloWorld();
      setHelloResult(result);
    } catch (error) {
      setHelloResult('Error: ' + error);
    }
    setLoading(false);
  };

  const testApi = async (method: 'GET' | 'POST') => {
    setLoading(true);
    try {
      const result = await callApi(method, method === 'POST' ? { message: 'Hello from frontend!' } : undefined);
      setApiResult(result);
    } catch (error) {
      setApiResult({ error: String(error) });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            🔥 Signal Firebase Functions
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Firebase Functions のテスト環境
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Hello World Function */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
              Hello World Function
            </h2>
            <button
              onClick={testHelloWorld}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? '実行中...' : 'Hello World を呼び出す'}
            </button>
            {helloResult && (
              <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="font-mono text-sm text-gray-800 dark:text-gray-200">
                  {helloResult}
                </p>
              </div>
            )}
          </div>

          {/* API Function */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
              API Function
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => testApi('GET')}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors mr-3"
              >
                {loading ? '実行中...' : 'GET リクエスト'}
              </button>
              <button
                onClick={() => testApi('POST')}
                disabled={loading}
                className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {loading ? '実行中...' : 'POST リクエスト'}
              </button>
            </div>
            {apiResult && (
              <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <pre className="font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {JSON.stringify(apiResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Firebase Functions エミュレータ稼働中 (localhost:5001)
          </div>
        </div>
      </div>
    </div>
  );
}
