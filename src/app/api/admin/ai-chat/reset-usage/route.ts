import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../../lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, month } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // 指定された月の使用回数をリセット
    const monthKey = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const usageRef = adminDb.collection('aiChatUsage').doc(`${userId}-${monthKey}`);
    
    await usageRef.delete();

    return NextResponse.json({
      success: true,
      message: `Usage reset for user ${userId} in month ${monthKey}`,
      data: {
        userId,
        month: monthKey,
        resetAt: new Date()
      }
    });

  } catch (error) {
    console.error('Usage reset error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to reset usage',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // ユーザーの使用履歴を取得
    const usageSnapshot = await adminDb
      .collection('aiChatUsage')
      .where('userId', '==', userId)
      .orderBy('month', 'desc')
      .get();

    const usageHistory = usageSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        month: data.month,
        count: data.count,
        lastUsed: data.lastUsed?.toDate?.() || null,
        createdAt: data.createdAt?.toDate?.() || null
      };
    });

    return NextResponse.json({
      success: true,
      userId,
      usageHistory
    });

  } catch (error) {
    console.error('Usage history error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get usage history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
