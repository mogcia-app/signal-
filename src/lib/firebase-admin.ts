import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin SDKの初期化
const firebaseAdminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "signal-v1-fc481",
  // 本番環境ではサービスアカウントキーを使用
  // 開発環境ではエミュレーターを使用
};

// 既に初期化されている場合は既存のアプリを使用
const app = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0];

// Firestore Admin SDKを取得
export const adminDb = getFirestore(app);

export default app;
