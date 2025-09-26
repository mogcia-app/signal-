import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Firebase Admin SDK初期化
let adminDb: ReturnType<typeof getFirestore> | null = null;

try {
  let app;
  if (getApps().length === 0) {
    // 本番環境では環境変数から、開発環境ではデフォルト認証を使用
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };
      app = initializeApp({ credential: cert(serviceAccount) });
    } else {
      // 開発環境ではデフォルト認証を使用
      app = initializeApp();
    }
  } else {
    app = getApps()[0];
  }
  adminDb = getFirestore(app);
} catch (error) {
  console.error('Firebase Admin SDK initialization error:', error);
  // フォールバック: クライアントSDKを使用
  adminDb = null;
}

export { adminDb };
