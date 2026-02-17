/**
 * 認証関連のユーティリティ関数
 */

import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { UserProfile } from "../types/user";

/**
 * ユーザーの契約期間をチェック
 * @param userId - Firebase Auth UID
 * @returns 契約が有効な場合はtrue、無効な場合はfalse
 */
export async function checkUserContract(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      if (process.env.NODE_ENV === "development") {
        console.error("❌ User data not found:", userId);
      }
      return false;
    }

    const userData = userDoc.data() as UserProfile;
    const now = new Date();
    const endDate = new Date(userData.contractEndDate);
    const status = userData.status;

    // 契約が有効かチェック
    // statusが'active'で、契約終了日が未来である必要がある
    const isActive = status === "active" && endDate > now;

    if (process.env.NODE_ENV === "development") {
      console.group("📋 Contract Check");
      console.log("User:", userId);
      console.log("Status:", status);
      console.log("Contract End Date:", endDate.toISOString());
      console.log("Current Date:", now.toISOString());
      console.log("Is Valid:", isActive);
      console.groupEnd();
    }

    if (!isActive) {
      if (process.env.NODE_ENV === "development") {
        console.warn("⏰ Contract expired or inactive:", {
          userId,
          status,
          endDate: endDate.toISOString(),
          currentDate: now.toISOString(),
        });
      }

      // 契約期間切れの場合はfalseを返す
      // ログアウト処理は呼び出し側で実装

      return false;
    }

    return true;
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "permission-denied") {
      if (process.env.NODE_ENV === "development") {
        console.warn("⚠️ Contract check skipped due to Firestore permission-denied:", userId);
      }
      return true;
    }
    if (process.env.NODE_ENV === "development") {
      console.error("❌ Error checking contract:", error);
    }
    return false;
  }
}
