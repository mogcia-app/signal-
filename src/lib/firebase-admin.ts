import { initializeApp, getApps, cert, AppOptions } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin SDKの初期化
const firebaseAdminConfig: AppOptions = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "signal-v1-fc481",
};

// 本番環境ではサービスアカウントキーを使用
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    firebaseAdminConfig.credential = cert(serviceAccount);
  } catch (error) {
    console.error('Failed to parse service account key:', error);
  }
}

// 既に初期化されている場合は既存のアプリを使用
const app = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0];

// Firestore Admin SDKを取得
export const adminDb = getFirestore(app);

export default app;
