import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  MAINTENANCE_COLLECTION,
  MAINTENANCE_DOC_ID,
  normalizeMaintenanceDoc,
} from "@/lib/server/maintenance-config";

let cached:
  | {
      timestamp: number;
      data: {
        maintenanceEnabled: boolean;
        loginBlocked: boolean;
        featureFlags: Record<string, boolean>;
      };
    }
  | null = null;

const CACHE_MS = 10_000;

export async function GET() {
  try {
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_MS) {
      return NextResponse.json({
        success: true,
        data: cached.data,
      });
    }

    const db = getAdminDb();
    const snapshot = await db.collection(MAINTENANCE_COLLECTION).doc(MAINTENANCE_DOC_ID).get();
    const current = normalizeMaintenanceDoc(snapshot.data());

    const data = {
      maintenanceEnabled: current.enabled,
      loginBlocked: current.loginBlocked,
      featureFlags: current.featureFlags,
    };
    cached = { timestamp: now, data };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[feature-flags] failed to fetch:", error);
    return NextResponse.json(
      {
        success: true,
        data: {
          maintenanceEnabled: false,
          loginBlocked: false,
          featureFlags: {
            "dashboard.write": true,
            "plan.write": true,
            "post.write": true,
            "analytics.write": true,
            "ai.generate": true,
          },
        },
      },
      { status: 200 },
    );
  }
}

