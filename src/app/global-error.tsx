'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        {/* エラーページのコンテンツ */}
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">エラーが発生しました</h1>
            <p className="text-gray-600 mb-6">
              {error && typeof error === 'object' && 'message' in error 
                ? error.message 
                : '予期しないエラーが発生しました'}
            </p>
            <button
              onClick={reset}
              className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              もう一度試す
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

