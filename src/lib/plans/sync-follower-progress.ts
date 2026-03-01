"use server";

import * as admin from "firebase-admin";
import { adminDb } from "../firebase-admin";

// parseFollowerValue removed (unused)
function _parseFollowerValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
}

function selectLatestPlanDoc(snapshot: FirebaseFirestore.QuerySnapshot) {
  if (snapshot.empty) {
    return null;
  }
  return snapshot.docs.reduce((latest, doc) => {
    if (!latest) {
      return doc;
    }
    const latestUpdated = latest.data()?.updatedAt;
    const docUpdated = doc.data()?.updatedAt;
    const latestTime =
      latestUpdated instanceof Date
        ? latestUpdated.getTime()
        : latestUpdated?.toDate?.()?.getTime() ?? 0;
    const docTime =
      docUpdated instanceof Date
        ? docUpdated.getTime()
        : docUpdated?.toDate?.()?.getTime() ?? 0;
    return docTime > latestTime ? doc : latest;
  }, null as FirebaseFirestore.QueryDocumentSnapshot | null);
}

export async function syncPlanFollowerProgress(userId: string) {
  try {
    const plansCollection = adminDb.collection("plans");
    let planSnapshot = await plansCollection
      .where("userId", "==", userId)
      .where("snsType", "==", "instagram")
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (planSnapshot.empty) {
      planSnapshot = await plansCollection
        .where("userId", "==", userId)
        .where("snsType", "==", "instagram")
        .limit(1)
        .get();
    }

    const planDoc = selectLatestPlanDoc(planSnapshot);
    if (!planDoc) {
      return;
    }

    // planData removed (unused)

    // initialFollowersを取得
    let initialFollowers = 0;
    try {
      const userDoc = await adminDb.collection("users").doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        initialFollowers = userData?.businessInfo?.initialFollowers || 0;
      }
    } catch (error) {
      console.error("ユーザー情報取得エラー:", error);
    }

    // 今月の増加数を計算（今月のanalyticsデータのみを使用）
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const [year, month] = currentMonth.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
    const endTimestamp = admin.firestore.Timestamp.fromDate(endDate);

    const monthlyAnalyticsSnapshot = await adminDb
      .collection("analytics")
      .where("userId", "==", userId)
      .where("snsType", "==", "instagram")
      .where("publishedAt", ">=", startTimestamp)
      .where("publishedAt", "<=", endTimestamp)
      .get();

    // 今月の増加数の合計を計算
    const monthlyFollowerIncrease = monthlyAnalyticsSnapshot.docs.reduce((sum, doc) => {
      const value = Number(doc.data().followerIncrease) || 0;
      return sum + value;
    }, 0);

    // follower_counts の手入力増加数は廃止済み。
    // 今月の合計増加数は投稿に紐づく値のみ採用する。
    const totalMonthlyFollowerIncrease = monthlyFollowerIncrease;

    // プランの現在のフォロワー数 = initialFollowers + 今月の増加数
    const actualFollowers = Math.max(0, initialFollowers + totalMonthlyFollowerIncrease);

    await planDoc.ref.update({
      analyticsFollowerIncrease: totalMonthlyFollowerIncrease,
      actualFollowers,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("計画フォロワー同期エラー:", error);
  }
}
