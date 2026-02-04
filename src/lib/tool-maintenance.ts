import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

const MAINTENANCE_DOC_PATH = "toolMaintenance/current";

// Cloud FunctionsのURL（環境変数から取得、なければデフォルト値を使用）
const getCloudFunctionUrl = (functionName: string): string => {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "signal-v1-fc481";
  const region = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || "asia-northeast1";
  return `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;
};

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
 * 認証前でもアクセス可能なように、Cloud Functions経由で取得します
 */
export async function getToolMaintenanceStatus(): Promise<ToolMaintenance> {
  try {
    // Cloud Functions経由で取得（認証不要）
    const functionUrl = getCloudFunctionUrl("getToolMaintenanceStatus");
    const response = await fetch(functionUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
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

