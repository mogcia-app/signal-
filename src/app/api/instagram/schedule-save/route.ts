import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, { requireContract: true });

    const body = await request.json();
    const {
      scheduleType, // 'feed' | 'reel' | 'story'
      scheduleData,
      monthlyPosts,
      dailyPosts,
      businessInfo,
    } = body;

    if (!scheduleType || !scheduleData) {
      return NextResponse.json(
        { success: false, error: "必要なパラメータが不足しています" },
        { status: 400 },
      );
    }

    // Firestoreにスケジュールを保存
    const db = getAdminDb();
    const scheduleRef = db.collection("userSchedules").doc(uid);

    const scheduleDoc = {
      [`${scheduleType}Schedule`]: {
        schedule: scheduleData,
        monthlyPosts,
        dailyPosts,
        businessInfo,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
    };

    await scheduleRef.set(scheduleDoc, { merge: true });

    return NextResponse.json({
      success: true,
      message: "スケジュールが保存されました",
    });
  } catch (error) {
    console.error("スケジュール保存エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, { requireContract: true });
    const { searchParams } = new URL(request.url);
    const scheduleType = searchParams.get("scheduleType"); // 'feed' | 'reel' | 'story'

    if (!scheduleType) {
      return NextResponse.json(
        { success: false, error: "必要なパラメータが不足しています" },
        { status: 400 },
      );
    }

    // Firestoreからスケジュールを取得
    const db = getAdminDb();
    const scheduleRef = db.collection("userSchedules").doc(uid);
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
      return NextResponse.json({
        success: true,
        schedule: null,
        message: "保存されたスケジュールがありません",
      });
    }

    const scheduleData = scheduleDoc.data();
    const savedSchedule = scheduleData?.[`${scheduleType}Schedule`];

    return NextResponse.json({
      success: true,
      schedule: savedSchedule || null,
    });
  } catch (error) {
    console.error("スケジュール取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
