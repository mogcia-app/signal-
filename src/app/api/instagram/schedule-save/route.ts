import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId,
      scheduleType, // 'feed' | 'reel' | 'story'
      scheduleData,
      monthlyPosts,
      dailyPosts,
      businessInfo
    } = body;

    if (!userId || !scheduleType || !scheduleData) {
      return NextResponse.json({ error: '必要なパラメータが不足しています' }, { status: 400 });
    }

    // Firestoreにスケジュールを保存
    const scheduleRef = db.collection('userSchedules').doc(userId);
    
    const scheduleDoc = {
      [`${scheduleType}Schedule`]: {
        schedule: scheduleData,
        monthlyPosts,
        dailyPosts,
        businessInfo,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }
    };

    await scheduleRef.set(scheduleDoc, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'スケジュールが保存されました'
    });

  } catch (error) {
    console.error('スケジュール保存エラー:', error);
    return NextResponse.json({ error: 'スケジュール保存に失敗しました' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const scheduleType = searchParams.get('scheduleType'); // 'feed' | 'reel' | 'story'

    if (!userId || !scheduleType) {
      return NextResponse.json({ error: '必要なパラメータが不足しています' }, { status: 400 });
    }

    // Firestoreからスケジュールを取得
    const scheduleRef = db.collection('userSchedules').doc(userId);
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
      return NextResponse.json({ 
        success: true, 
        schedule: null,
        message: '保存されたスケジュールがありません'
      });
    }

    const scheduleData = scheduleDoc.data();
    const savedSchedule = scheduleData?.[`${scheduleType}Schedule`];

    return NextResponse.json({
      success: true,
      schedule: savedSchedule || null
    });

  } catch (error) {
    console.error('スケジュール取得エラー:', error);
    return NextResponse.json({ error: 'スケジュール取得に失敗しました' }, { status: 500 });
  }
}
