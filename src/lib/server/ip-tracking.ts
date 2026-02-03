/**
 * IPアドレス記録機能
 * ユーザーのIPアドレスを時系列で記録し、異常検知に活用
 */

import { adminDb } from "@/lib/firebase-admin";
import type { IPHistoryEntry } from "@/types/user";

const MAX_IP_HISTORY = 50; // 最大保持件数
const IP_DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5分以内の同一IPは重複記録しない

/**
 * リクエストからIPアドレスを取得
 */
export function getClientIp(request: {
  headers: Headers | { get: (key: string) => string | null };
}): string | undefined {
  const headers = request.headers;
  const forwardedFor = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");

  if (forwardedFor) {
    // x-forwarded-forはカンマ区切りの場合がある（プロキシ経由）
    return forwardedFor.split(",")[0]?.trim();
  }

  if (realIp) {
    return realIp.trim();
  }

  return undefined;
}

/**
 * IPアドレスをユーザーの履歴に追加
 * 重複を避け、最大保持件数を超えた場合は古いものを削除
 */
export async function recordIpAddress(
  userId: string,
  ip: string,
  options?: {
    userAgent?: string;
    path?: string;
    method?: string;
  }
): Promise<void> {
  if (!ip || ip === "unknown") {
    return;
  }

  try {
    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.warn(`[IP Tracking] ユーザーが見つかりません: ${userId}`);
      return;
    }

    const userData = userDoc.data();
    const currentHistory = (userData?.ipHistory as IPHistoryEntry[]) || [];
    const now = new Date().toISOString();

    // 直近の記録を確認（重複回避）
    const recentEntry = currentHistory[currentHistory.length - 1];
    if (recentEntry) {
      const recentTime = new Date(recentEntry.timestamp).getTime();
      const nowTime = Date.now();
      
      // 同一IPで5分以内の場合は記録しない
      if (
        recentEntry.ip === ip &&
        nowTime - recentTime < IP_DEDUP_WINDOW_MS
      ) {
        return;
      }
    }

    // 新しいエントリを作成
    const newEntry: IPHistoryEntry = {
      ip,
      timestamp: now,
      ...(options?.userAgent && { userAgent: options.userAgent }),
      ...(options?.path && { path: options.path }),
      ...(options?.method && { method: options.method }),
    };

    // 履歴に追加（最大保持件数を超えた場合は古いものを削除）
    const updatedHistory = [...currentHistory, newEntry].slice(-MAX_IP_HISTORY);

    // Firestoreに保存
    await userRef.update({
      ipHistory: updatedHistory,
      updatedAt: new Date().toISOString(),
    });

    console.log(`[IP Tracking] IPアドレスを記録: ${userId} → ${ip}`);
  } catch (error) {
    console.error(`[IP Tracking] エラー: ${error instanceof Error ? error.message : String(error)}`);
    // エラーが発生しても処理は続行（IP記録は補助情報のため）
  }
}

/**
 * ユーザーのIP履歴を取得
 */
export async function getIpHistory(userId: string): Promise<IPHistoryEntry[]> {
  try {
    const userDoc = await adminDb.collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      return [];
    }

    const userData = userDoc.data();
    return (userData?.ipHistory as IPHistoryEntry[]) || [];
  } catch (error) {
    console.error(`[IP Tracking] IP履歴取得エラー: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

