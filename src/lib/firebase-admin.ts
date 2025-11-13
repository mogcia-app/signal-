import * as admin from "firebase-admin";

const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || "signal-v1-fc481",
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

console.log("[firebase-admin] env check", {
  hasProjectId: Boolean(serviceAccount.projectId),
  hasClientEmail: Boolean(serviceAccount.clientEmail),
  privateKeyLength: serviceAccount.privateKey?.length ?? 0,
});

if (!serviceAccount.clientEmail || !serviceAccount.privateKey) {
  throw new Error(
    `Missing Firebase Admin credentials (clientEmail: ${Boolean(serviceAccount.clientEmail)}, privateKeyLength: ${
      serviceAccount.privateKey?.length ?? 0
    })`,
  );
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  projectId: serviceAccount.projectId,
});

console.log("[firebase-admin] initialized", serviceAccount.projectId);

export function getAdminDb() {
  return admin.firestore();
}

export function getAdminAuth() {
  return admin.auth();
}

// 互換のため（既存コードで使用されている場合）
export const adminDb = getAdminDb();
export const adminAuth = getAdminAuth();