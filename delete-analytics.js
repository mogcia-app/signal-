// Firestoreのanalyticsデータを一括削除するスクリプト
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyCvX4cKWKtn_qnh3CV-d1UC4GEiVpdPB9w",
  authDomain: "signal-v1-fc481.firebaseapp.com",
  projectId: "signal-v1-fc481",
  storageBucket: "signal-v1-fc481.firebasestorage.app",
  messagingSenderId: "913459926537",
  appId: "1:913459926537:web:3f27082cdf1e913c444ad8",
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteAllAnalytics() {
  try {
    console.log("Analyticsデータの削除を開始...");

    // analyticsコレクションの全ドキュメントを取得
    const analyticsRef = collection(db, "analytics");
    const snapshot = await getDocs(analyticsRef);

    console.log(`削除対象: ${snapshot.docs.length}件のドキュメント`);

    // 各ドキュメントを削除
    const deletePromises = snapshot.docs.map((docSnapshot) => {
      console.log(`削除中: ${docSnapshot.id}`);
      return deleteDoc(doc(db, "analytics", docSnapshot.id));
    });

    await Promise.all(deletePromises);

    console.log("✅ 全analyticsデータの削除が完了しました！");
  } catch (error) {
    console.error("❌ 削除エラー:", error);
  }
}

// 実行
deleteAllAnalytics();
