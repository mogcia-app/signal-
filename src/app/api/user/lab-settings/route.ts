import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";

interface LabSettings {
  templates: string[];
  hashtags: string[];
  updatedAt: Date;
}

/**
 * ラボ設定（よく使う文言・ハッシュタグ）取得API
 * GET /api/user/lab-settings
 */
export async function GET(request: NextRequest) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "lab-settings-get", limit: 30, windowSeconds: 60 },
      auditEventName: "lab_settings_get",
    });

    const db = getAdminDb();
    const settingsDoc = await db.collection("labSettings").doc(userId).get();

    if (!settingsDoc.exists) {
      // デフォルト値を返す
      return NextResponse.json({
        success: true,
        data: {
          templates: [
            "おはようございます！今日も素敵な一日をお過ごしください✨",
            "ありがとうございます🙏",
            "フォローありがとうございます！",
            "いいねありがとうございます💕",
            "コメントありがとうございます！",
            "今日の一枚📸",
            "お疲れ様でした！",
            "素敵な週末をお過ごしください🌅",
          ],
          hashtags: [],
        },
      });
    }

    const settingsData = settingsDoc.data() as LabSettings;
    
    return NextResponse.json({
      success: true,
      data: {
        templates: settingsData.templates || [],
        hashtags: settingsData.hashtags || [],
      },
    });
  } catch (error) {
    console.error("ラボ設定取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

/**
 * ラボ設定（よく使う文言・ハッシュタグ）保存API
 * POST /api/user/lab-settings
 */
export async function POST(request: NextRequest) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "lab-settings-save", limit: 30, windowSeconds: 60 },
      auditEventName: "lab_settings_save",
    });

    const body = await request.json();
    const { templates, hashtags } = body;

    if (!Array.isArray(templates) || !Array.isArray(hashtags)) {
      return NextResponse.json(
        { success: false, error: "templatesとhashtagsは配列である必要があります" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const settingsData: LabSettings = {
      templates: templates || [],
      hashtags: hashtags || [],
      updatedAt: new Date(),
    };

    await db.collection("labSettings").doc(userId).set(settingsData, { merge: true });

    return NextResponse.json({
      success: true,
      message: "ラボ設定が保存されました",
    });
  } catch (error) {
    console.error("ラボ設定保存エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

