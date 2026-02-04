import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
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
 */
export async function getToolMaintenanceStatus(): Promise<ToolMaintenance> {
  try {
    const docRef = doc(db, MAINTENANCE_DOC_PATH);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return {
        enabled: false,
        message: "",
        scheduledStart: null,
        scheduledEnd: null,
        updatedBy: "",
        updatedAt: null,
      };
    }

    const data = docSnap.data();
    const updatedAt = data.updatedAt;
    const updatedAtISO =
      updatedAt && updatedAt.toDate ? updatedAt.toDate().toISOString() : updatedAt || null;

    return {
      enabled: data.enabled || false,
      message: data.message || "",
      scheduledStart: data.scheduledStart || null,
      scheduledEnd: data.scheduledEnd || null,
      updatedBy: data.updatedBy || "",
      updatedAt: updatedAtISO,
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

