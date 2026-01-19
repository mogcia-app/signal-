/**
 * サーバーサイド用ユーザープロファイル取得ユーティリティ
 * 
 * APIルートなど、サーバーサイドでユーザープロファイルを取得する際に使用します
 */

import { adminDb } from "@/lib/firebase-admin";
import { UserProfile } from "@/types/user";

/**
 * ユーザープロファイルを取得（サーバーサイド用）
 * 
 * @param userId - ユーザーID
 * @returns ユーザープロファイル、存在しない場合はnull
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userDoc = await adminDb.collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    if (!userData) {
      return null;
    }

    return {
      id: userDoc.id,
      ...userData,
    } as UserProfile;
  } catch (error) {
    console.error("ユーザープロファイル取得エラー:", error);
    return null;
  }
}

