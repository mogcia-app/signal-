import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

const MAINTENANCE_DOC_PATH = "toolMaintenance/current";

export interface ToolMaintenance {
  enabled: boolean;
  message: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  updatedBy: string;
  updatedAt: string | null;
}

/**
 * メンテナンス状態を取得
 * Next.js API Route経由で取得（BFFパターン）
 * - CORS問題を回避
 * - 429エラーを防ぐためにキャッシュを利用
 */
export async function getToolMaintenanceStatus(): Promise<ToolMaintenance> {
  try {
    // Next.js API Route経由で取得（同じドメインなのでCORS問題なし）
    const response = await fetch("/api/tool-maintenance", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // クライアント側でもキャッシュを利用（10秒間）
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      return {
        enabled: result.data.enabled || false,
        message: result.data.message || "",
        scheduledStart: result.data.scheduledStart || null,
        scheduledEnd: result.data.scheduledEnd || null,
        updatedBy: result.data.updatedBy || "",
        updatedAt: result.data.updatedAt || null,
      };
    }

    // デフォルト値（メンテナンス無効）
    return {
      enabled: false,
      message: "",
      scheduledStart: null,
      scheduledEnd: null,
      updatedBy: "",
      updatedAt: null,
    };
  } catch (error) {
    console.error("Error fetching tool maintenance status:", error);
    // エラー時はメンテナンス無効として扱う
    return {
      enabled: false,
      message: "",
      scheduledStart: null,
      scheduledEnd: null,
      updatedBy: "",
      updatedAt: null,
    };
  }
}

/**
 * メンテナンスモードを設定（Admin Panelからのみ使用）
 */
export async function setToolMaintenanceMode(
  enabled: boolean,
  message?: string,
  scheduledStart?: string,
  scheduledEnd?: string,
  updatedBy: string = "admin"
): Promise<ToolMaintenance> {
  try {
    const docRef = doc(db, MAINTENANCE_DOC_PATH);

    const updateData: any = {
      enabled,
      message: message || (enabled ? "システムメンテナンス中です。しばらくお待ちください。" : ""),
      updatedBy,
      updatedAt: serverTimestamp(),
    };

    if (scheduledStart) {
      updateData.scheduledStart = scheduledStart;
    }

    if (scheduledEnd) {
      updateData.scheduledEnd = scheduledEnd;
    }

    await setDoc(docRef, updateData, { merge: true });

    // 更新後のデータを取得
    return await getToolMaintenanceStatus();
  } catch (error) {
    console.error("Error setting tool maintenance mode:", error);
    throw error;
  }
}

