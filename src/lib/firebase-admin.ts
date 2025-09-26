import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Firebase Admin SDK初期化
let adminDb: ReturnType<typeof getFirestore> | null = null;

try {
  let app;
  if (getApps().length === 0) {
    // 環境変数からサービスアカウント情報を取得
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      console.log('Initializing Firebase Admin SDK with service account...');
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };
      app = initializeApp({ 
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
      console.log('Firebase Admin SDK initialized successfully');
    } else {
      console.log('Firebase Admin SDK environment variables not found, using default authentication...');
      // 開発環境ではデフォルト認証を使用
      app = initializeApp();
    }
  } else {
    app = getApps()[0];
  }
  adminDb = getFirestore(app);
  console.log('Firebase Admin SDK ready');
} catch (error) {
  console.error('Firebase Admin SDK initialization error:', error);
  console.log('Falling back to client SDK...');
  // フォールバック: クライアントSDKを使用
  adminDb = null;
}

export { adminDb };
