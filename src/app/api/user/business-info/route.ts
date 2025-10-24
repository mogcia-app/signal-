import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'ユーザーIDが必要です' }, { status: 400 });
    }

    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    const userData = userDoc.data();
    const businessInfo = userData?.businessInfo || {};

    return NextResponse.json({
      success: true,
      businessInfo: {
        companySize: businessInfo.companySize || '',
        targetMarket: businessInfo.targetMarket || [],
        goals: businessInfo.goals || [],
        challenges: businessInfo.challenges || [],
        features: businessInfo.features || [],
        industry: businessInfo.industry || '',
        snsAISettings: businessInfo.snsAISettings || {}
      }
    });

  } catch (error) {
    console.error('ビジネス情報取得エラー:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
