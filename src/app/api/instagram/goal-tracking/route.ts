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
    if (!goalSettings) {
      return NextResponse.json({ success: true, data: { goals: [] }, message: 'No goal settings data found' });
    }

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 今週の投稿数を取得
    const weeklyPostsQuery = await adminDb
      .collection('posts')
      .where('userId', '==', userId)
      .get();

    const weeklyPostCount = weeklyPostsQuery.docs.filter(doc => {
      const data = doc.data();
      let createdAt = data.createdAt;
      if (createdAt && createdAt.toDate) {
        createdAt = createdAt.toDate();
      } else if (createdAt && typeof createdAt === 'string') {
        createdAt = new Date(createdAt);
      }
      return createdAt && createdAt >= startOfWeek;
    }).length;

    // 今月の投稿数を取得
    const monthlyPostsQuery = await adminDb
      .collection('posts')
      .where('userId', '==', userId)
      .get();

    const monthlyPostCount = monthlyPostsQuery.docs.filter(doc => {
      const data = doc.data();
      let createdAt = data.createdAt;
      if (createdAt && createdAt.toDate) {
        createdAt = createdAt.toDate();
      } else if (createdAt && typeof createdAt === 'string') {
        createdAt = new Date(createdAt);
      }
      return createdAt && createdAt >= startOfMonth;
    }).length;

    // 今月のフォロワー増加数を取得
    const analyticsQuery = await adminDb
      .collection('analytics')
      .where('userId', '==', userId)
      .get();

    let totalFollowerIncrease = 0;
    analyticsQuery.forEach(doc => {
      const data = doc.data();
      if (data.followerIncrease) {
        // publishedAtが今月以降かチェック
        let publishedAt = data.publishedAt;
        if (publishedAt && publishedAt.toDate) {
          publishedAt = publishedAt.toDate();
        } else if (publishedAt && typeof publishedAt === 'string') {
          publishedAt = new Date(publishedAt);
        }
        
        if (publishedAt && publishedAt >= startOfMonth) {
          totalFollowerIncrease += parseInt(data.followerIncrease) || 0;
        }
      }
    });

    // 目標達成状況を計算
    const goals = [
      {
        title: '週間投稿目標',
        current: weeklyPostCount,
        target: goalSettings.weeklyPostGoal || 0,
        unit: '件',
        status: weeklyPostCount >= (goalSettings.weeklyPostGoal || 0) ? 'achieved' : 'in_progress',
        percentage: goalSettings.weeklyPostGoal ? Math.round((weeklyPostCount / goalSettings.weeklyPostGoal) * 100) : 0
      },
      {
        title: 'フォロワー増加',
        current: totalFollowerIncrease,
        target: goalSettings.followerGoal || 0,
        unit: '人',
        status: totalFollowerIncrease >= (goalSettings.followerGoal || 0) ? 'achieved' : 'in_progress',
        percentage: goalSettings.followerGoal ? Math.round((totalFollowerIncrease / goalSettings.followerGoal) * 100) : 0
      },
      {
        title: '月間投稿目標',
        current: monthlyPostCount,
        target: goalSettings.monthlyPostGoal || 0,
        unit: '件',
        status: monthlyPostCount >= (goalSettings.monthlyPostGoal || 0) ? 'achieved' : 'in_progress',
        percentage: goalSettings.monthlyPostGoal ? Math.round((monthlyPostCount / goalSettings.monthlyPostGoal) * 100) : 0
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
      error: 'Failed to fetch goal tracking data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}