/**
 * Firebase Admin SDK
 * サーバーサイド（API Routes）専用
 * 
 * Client SDKとは別に初期化
 * Firestoreのrequest.authを正しく設定するために必要
 * 
 * 注意: このファイルはサーバーサイドでのみimportすること
 */

import * as admin from 'firebase-admin';

// Admin SDKの初期化（既に初期化済みの場合はスキップ）
function initializeAdminApp() {
  if (admin.apps.length === 0) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || 'signal-v1-fc481',
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: serviceAccount.projectId,
    });
    
    console.log('🔥 Firebase Admin SDK initialized:', serviceAccount.projectId);
  }
  
  return admin;
}

// Admin SDK のインスタンスをエクスポート
export function getAdminDb() {
  const adminApp = initializeAdminApp();
  return adminApp.firestore();
}

export function getAdminAuth() {
  const adminApp = initializeAdminApp();
  return adminApp.auth();
}

// 互換性のため
export const adminDb = getAdminDb();
export const adminAuth = getAdminAuth();

// Admin SDK は認証済みのコンテキストで実行されるため、
// Firestoreのrequest.authが正しく設定される
