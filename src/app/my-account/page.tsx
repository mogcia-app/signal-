'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MyAccountPage() {
  const router = useRouter();

  useEffect(() => {
    // /my-accountにアクセスしたら/dashboardにリダイレクト
    console.log('🔄 /my-account から /dashboard にリダイレクト中...');
    router.replace('/dashboard');
  }, [router]);

  // リダイレクト中はローディング表示
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">マイアカウントページに移動中...</p>
      </div>
    </div>
  );
}