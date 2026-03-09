import { NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebase-admin";
import {
  normalizeMaintenanceDoc,
  serializeMaintenanceForResponse,
} from "@/lib/server/maintenance-config";

// キャッシュ用（メモリキャッシュ）
let cachedStatus: {
  data: ReturnType<typeof serializeMaintenanceForResponse>;
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

    const resultData = serializeMaintenanceForResponse(
      normalizeMaintenanceDoc(maintenanceDoc.data()),
    );

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
        allowAdminBypass: true,
        allowedRoles: ["super_admin"],
        loginBlocked: false,
        sessionPolicy: "allow_existing",
        allowPasswordReset: true,
        featureFlags: {
          "dashboard.write": true,
          "plan.write": true,
          "post.write": true,
          "analytics.write": true,
          "ai.generate": true,
        },
        version: 0,
        updatedByEmail: "",
        scheduledStart: null,
        scheduledEnd: null,
        updatedBy: "",
        updatedAt: null,
      },
    });
  }
}
