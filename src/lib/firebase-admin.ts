import * as admin from "firebase-admin";

// Vercelのビルド時には初期化をスキップ（環境変数が設定されていない可能性があるため）
const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";

let isInitialized = false;

function initializeAdmin() {
  // 既に初期化済みの場合はスキップ
  if (admin.apps.length > 0) {
    isInitialized = true;
    return;
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || "signal-v1-fc481",
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };

  // ビルド時や環境変数がない場合は初期化をスキップ
  if (isBuildTime || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    if (!isBuildTime) {
      console.warn("[firebase-admin] Skipping initialization - missing credentials", {
        hasClientEmail: Boolean(serviceAccount.clientEmail),
        privateKeyLength: serviceAccount.privateKey?.length ?? 0,
      });
    }
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: serviceAccount.projectId,
    });
    isInitialized = true;
    console.log("[firebase-admin] initialized", serviceAccount.projectId);
  } catch (error) {
    console.error("[firebase-admin] Initialization error:", error);
    // エラーが発生してもビルドを止めない
  }
}

// ビルド時以外は初期化を試みる
if (!isBuildTime) {
  initializeAdmin();
}

export function getAdminDb() {
  // ビルド時には初期化をスキップ
  if (isBuildTime) {
    throw new Error("Firebase Admin SDK cannot be initialized during build time.");
  }
  
  if (!isInitialized) {
    initializeAdmin();
  }
  
  if (!admin.apps.length) {
    const serviceAccount = {
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    };
    
    if (!serviceAccount.clientEmail || !serviceAccount.privateKey) {
      throw new Error(
        "Firebase Admin SDK is not initialized. Missing environment variables: " +
        `FIREBASE_ADMIN_CLIENT_EMAIL=${Boolean(serviceAccount.clientEmail)}, ` +
        `FIREBASE_ADMIN_PRIVATE_KEY=${Boolean(serviceAccount.privateKey)}`
      );
    }
    
    throw new Error("Firebase Admin SDK initialization failed. Check logs for details.");
  }
  
  return admin.firestore();
}

export function getAdminAuth() {
  // ビルド時には初期化をスキップ
  if (isBuildTime) {
    throw new Error("Firebase Admin SDK cannot be initialized during build time.");
  }
  
  if (!isInitialized) {
    initializeAdmin();
  }
  
  if (!admin.apps.length) {
    const serviceAccount = {
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    };
    
    if (!serviceAccount.clientEmail || !serviceAccount.privateKey) {
      throw new Error(
        "Firebase Admin SDK is not initialized. Missing environment variables: " +
        `FIREBASE_ADMIN_CLIENT_EMAIL=${Boolean(serviceAccount.clientEmail)}, ` +
        `FIREBASE_ADMIN_PRIVATE_KEY=${Boolean(serviceAccount.privateKey)}`
      );
    }
    
    throw new Error("Firebase Admin SDK initialization failed. Check logs for details.");
  }
  
  return admin.auth();
}

// 互換のため（既存コードで使用されている場合）
// ビルド時には初期化をスキップし、実行時に遅延初期化する
// Proxyを使用してすべてのメソッド呼び出しをインターセプト
export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_target, prop) {
    const db = getAdminDb();
    const value = (db as any)[prop];
    if (typeof value === "function") {
      return value.bind(db);
    }
    return value;
  },
});

export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(_target, prop) {
    const auth = getAdminAuth();
    const value = (auth as any)[prop];
    if (typeof value === "function") {
      return value.bind(auth);
    }
    return value;
  },
});