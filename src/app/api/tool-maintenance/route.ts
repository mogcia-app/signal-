import { NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebase-admin";

// キャッシュ用（メモリキャッシュ）
let cachedStatus: {
  data: {
    enabled: boolean;
    message: string;
    scheduledStart: string | null;
    scheduledEnd: string | null;
    updatedBy: string;
    updatedAt: string | null;
  };
  timestamp: number;
} | null = null;

const CACHE_DURATION = 10 * 1000; // 10秒間キャッシュ

export async function GET() {
  try {
    // キャッシュをチェック
    const now = Date.now();
    if (cachedStatus && now - cachedStatus.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: cachedStatus.data,
      });
    }

    // Firestoreから直接取得（Cloud Functionに依存しない）
    const maintenanceDoc = await adminDb.collection("toolMaintenance").doc("current").get();

    let resultData: {
      enabled: boolean;
      message: string;
      scheduledStart: string | null;
      scheduledEnd: string | null;
      updatedBy: string;
      updatedAt: string | null;
    };

    if (!maintenanceDoc.exists) {
      // デフォルト値（メンテナンス無効）
      resultData = {
        enabled: false,
        message: "",
        scheduledStart: null,
        scheduledEnd: null,
        updatedBy: "",
        updatedAt: null,
      };
    } else {
      const data = maintenanceDoc.data();
      const updatedAt = data?.updatedAt;
      const updatedAtISO =
        updatedAt && updatedAt.toDate
          ? updatedAt.toDate().toISOString()
          : updatedAt instanceof Date
            ? updatedAt.toISOString()
            : updatedAt || null;

      resultData = {
        enabled: data?.enabled || false,
        message: data?.message || "",
        scheduledStart: data?.scheduledStart || null,
        scheduledEnd: data?.scheduledEnd || null,
        updatedBy: data?.updatedBy || "",
        updatedAt: updatedAtISO,
      };
    }

    // キャッシュを更新
    cachedStatus = {
      data: resultData,
      timestamp: now,
    };

    return NextResponse.json({
      success: true,
      data: resultData,
    });
  } catch (error) {
    console.error("Error fetching tool maintenance status:", error);

    // エラー時はキャッシュがあればそれを返す
    if (cachedStatus) {
      return NextResponse.json({
        success: true,
        data: cachedStatus.data,
      });
    }

    // キャッシュもない場合はデフォルト値を返す
    return NextResponse.json({
      success: true,
      data: {
        enabled: false,
        message: "",
        scheduledStart: null,
        scheduledEnd: null,
        updatedBy: "",
        updatedAt: null,
      },
    });
  }
}

