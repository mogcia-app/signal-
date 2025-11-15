"use server";

import { adminDb } from "../firebase-admin";

function parseFollowerValue(value: unknown): number | null {
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

    const planData = planDoc.data() || {};

    let analyticsSnapshot = await adminDb
      .collection("analytics")
      .where("userId", "==", userId)
      .where("snsType", "==", "instagram")
      .get();

    if (analyticsSnapshot.empty) {
      analyticsSnapshot = await adminDb.collection("analytics").where("userId", "==", userId).get();
    }

    const totalFollowerIncrease = analyticsSnapshot.docs.reduce((sum, doc) => {
      const value = Number(doc.data().followerIncrease) || 0;
      return sum + value;
    }, 0);

    const formCurrent = planData?.formData?.currentFollowers;
    const parsedFormCurrent = parseFollowerValue(formCurrent);
    const baselineFollowers =
      parsedFormCurrent ?? (Number(planData.currentFollowers) || 0);
    const actualFollowers = Math.max(0, baselineFollowers + totalFollowerIncrease);

    await planDoc.ref.update({
      analyticsFollowerIncrease: totalFollowerIncrease,
      actualFollowers,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("計画フォロワー同期エラー:", error);
  }
}

