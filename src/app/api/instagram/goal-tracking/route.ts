import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 401 });
    }

    // 目標設定を取得
    const goalDoc = await adminDb.collection('goalSettings').doc(userId).get();
    if (!goalDoc.exists) {
      return NextResponse.json({ 
        success: true, 
        data: { goals: [] },
        message: 'No goal settings found'
      });
    }

    const goalSettings = goalDoc.data();
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 今週の投稿数を取得
    const weeklyPostsQuery = await adminDb
      .collection('posts')
      .where('userId', '==', userId)
      .where('createdAt', '>=', startOfWeek)
      .get();

    const weeklyPostCount = weeklyPostsQuery.size;

    // 今月の投稿数を取得
    const monthlyPostsQuery = await adminDb
      .collection('posts')
      .where('userId', '==', userId)
      .where('createdAt', '>=', startOfMonth)
      .get();

    const monthlyPostCount = monthlyPostsQuery.size;

    // 今月のフォロワー増加数を取得
    const analyticsQuery = await adminDb
      .collection('analytics')
      .where('userId', '==', userId)
      .where('publishedAt', '>=', startOfMonth)
      .get();

    let totalFollowerIncrease = 0;
    analyticsQuery.forEach(doc => {
      const data = doc.data();
      if (data.followerIncrease) {
        totalFollowerIncrease += parseInt(data.followerIncrease) || 0;
      }
    });

    // 目標達成状況を計算
    const goals = [
      {
        title: '週間投稿目標',
        current: weeklyPostCount,
        target: goalSettings.weeklyPostGoal,
        unit: '件',
        status: weeklyPostCount >= goalSettings.weeklyPostGoal ? 'achieved' : 'in_progress',
        percentage: Math.round((weeklyPostCount / goalSettings.weeklyPostGoal) * 100)
      },
      {
        title: 'フォロワー増加',
        current: totalFollowerIncrease,
        target: goalSettings.followerGoal,
        unit: '人',
        status: totalFollowerIncrease >= goalSettings.followerGoal ? 'achieved' : 'in_progress',
        percentage: Math.round((totalFollowerIncrease / goalSettings.followerGoal) * 100)
      },
      {
        title: '月間投稿目標',
        current: monthlyPostCount,
        target: goalSettings.monthlyPostGoal,
        unit: '件',
        status: monthlyPostCount >= goalSettings.monthlyPostGoal ? 'achieved' : 'in_progress',
        percentage: Math.round((monthlyPostCount / goalSettings.monthlyPostGoal) * 100)
      }
    ];

    return NextResponse.json({ 
      success: true, 
      data: { goals }
    });

  } catch (error) {
    console.error('Goal tracking fetch error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch goal tracking data' 
    }, { status: 500 });
  }
}