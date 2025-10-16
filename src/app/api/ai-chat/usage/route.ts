import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // 今月の使用回数を取得
    const usageSnapshot = await adminDb
      .collection('aiChatUsage')
      .where('userId', '==', userId)
      .where('date', '>=', startOfMonth)
      .where('date', '<=', endOfMonth)
      .get();

    const usageCount = usageSnapshot.size;
    const maxUsage = 5;
    const remainingUsage = Math.max(0, maxUsage - usageCount);

    return NextResponse.json({
      usageCount,
      maxUsage,
      remainingUsage,
      canUse: remainingUsage > 0
    });

  } catch (error) {
    console.error('Error fetching AI chat usage:', error);
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // 今月の使用回数をチェック
    const usageSnapshot = await adminDb
      .collection('aiChatUsage')
      .where('userId', '==', userId)
      .where('date', '>=', startOfMonth)
      .where('date', '<=', endOfMonth)
      .get();

    const usageCount = usageSnapshot.size;
    const maxUsage = 5;

    if (usageCount >= maxUsage) {
      return NextResponse.json({ 
        error: 'Monthly usage limit exceeded',
        usageCount,
        maxUsage,
        remainingUsage: 0,
        canUse: false
      }, { status: 429 });
    }

    // 使用記録を追加
    await adminDb.collection('aiChatUsage').add({
      userId,
      date: currentDate,
      createdAt: new Date()
    });

    const remainingUsage = maxUsage - usageCount - 1;

    return NextResponse.json({
      usageCount: usageCount + 1,
      maxUsage,
      remainingUsage,
      canUse: remainingUsage > 0
    });

  } catch (error) {
    console.error('Error recording AI chat usage:', error);
    return NextResponse.json({ error: 'Failed to record usage' }, { status: 500 });
  }
}
