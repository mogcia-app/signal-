import { NextResponse } from "next/server";

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

// Cloud FunctionsのURL
const getCloudFunctionUrl = (functionName: string): string => {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "signal-v1-fc481";
  const region = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || "asia-northeast1";
  return `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;
};

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

    // Cloud Functionsから取得
    const functionUrl = getCloudFunctionUrl("getToolMaintenanceStatus");
    const response = await fetch(functionUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // サーバーサイドからのリクエストなのでCORS問題なし
      cache: "no-store",
    });

    if (!response.ok) {
      // エラー時はキャッシュがあればそれを返す
      if (cachedStatus) {
        return NextResponse.json({
          success: true,
          data: cachedStatus.data,
        });
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      // キャッシュを更新
      cachedStatus = {
        data: result.data,
        timestamp: now,
      };

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    }

    // デフォルト値
    const defaultData = {
      enabled: false,
      message: "",
      scheduledStart: null,
      scheduledEnd: null,
      updatedBy: "",
      updatedAt: null,
    };

    // キャッシュを更新
    cachedStatus = {
      data: defaultData,
      timestamp: now,
    };

    return NextResponse.json({
      success: true,
      data: defaultData,
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

