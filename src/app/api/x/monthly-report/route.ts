import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') || 'monthly';
    const date = searchParams.get('date');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('X月次レポート取得開始:', { userId, period, date });

    // X analyticsデータを取得
    const analyticsRef = collection(db, 'xanalytics');
    const analyticsQuery = query(
      analyticsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const analyticsSnapshot = await getDocs(analyticsQuery);
    const analyticsData = analyticsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date()
    })) as Array<{
      id: string;
      likes: number;
      retweets: number;
      comments: number;
      saves: number;
      impressions: number;
      engagements: number;
      followers: number;
      audience?: Record<string, unknown>;
      reachSource?: Record<string, unknown>;
      createdAt: Date;
    }>;

    console.log('X analyticsデータ取得完了:', analyticsData.length, '件');

    // X postsデータを取得
    const postsRef = collection(db, 'x_posts');
    const postsQuery = query(
      postsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const postsSnapshot = await getDocs(postsQuery);
    const postsData = postsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date()
    }));

    console.log('X postsデータ取得完了:', postsData.length, '件');

    // データ集計
    const totals = {
      totalLikes: analyticsData.reduce((sum, data) => sum + (Number(data.likes) || 0), 0),
      totalRetweets: analyticsData.reduce((sum, data) => sum + (Number(data.retweets) || 0), 0),
      totalComments: analyticsData.reduce((sum, data) => sum + (Number(data.comments) || 0), 0),
      totalSaves: analyticsData.reduce((sum, data) => sum + (Number(data.saves) || 0), 0),
      totalImpressions: analyticsData.reduce((sum, data) => sum + (Number(data.impressions) || 0), 0),
      totalEngagements: analyticsData.reduce((sum, data) => sum + (Number(data.engagements) || 0), 0),
      totalPosts: postsData.length,
      totalFollowers: analyticsData.length > 0 ? (Number(analyticsData[0].followers) || 0) : 0,
    };

    // エンゲージメント率計算
    const engagementRate = totals.totalImpressions > 0 
      ? (totals.totalEngagements / totals.totalImpressions) * 100 
      : 0;

    const likeRate = totals.totalImpressions > 0 
      ? (totals.totalLikes / totals.totalImpressions) * 100 
      : 0;

    const retweetRate = totals.totalImpressions > 0 
      ? (totals.totalRetweets / totals.totalImpressions) * 100 
      : 0;

    const replyRate = totals.totalImpressions > 0 
      ? (totals.totalComments / totals.totalImpressions) * 100 
      : 0;

    // オーディエンス分析（最新のデータから）
    const latestAnalytics = analyticsData[0];
    const audienceAnalysis = latestAnalytics?.audience || {
      gender: { male: 65, female: 32, other: 3 },
      age: { '13-17': 5, '18-24': 28, '25-34': 35, '35-44': 20, '45-54': 8, '55-64': 3, '65+': 1 }
    };

    // リーチソース分析（最新のデータから）
    const reachSourceAnalysis = latestAnalytics?.reachSource || {
      sources: { home: 45, profile: 20, explore: 15, search: 12, other: 8 },
      followers: { followers: 68, nonFollowers: 32 }
    };

    // トップ投稿（エンゲージメント数でソート）
    const topPosts = analyticsData
      .sort((a, b) => (Number(b.engagements) || 0) - (Number(a.engagements) || 0))
      .slice(0, 5);

    const response = {
      period,
      date,
      totals,
      engagement: {
        engagementRate: Number(engagementRate.toFixed(2)),
        likeRate: Number(likeRate.toFixed(2)),
        retweetRate: Number(retweetRate.toFixed(2)),
        replyRate: Number(replyRate.toFixed(2)),
      },
      audienceAnalysis,
      reachSourceAnalysis,
      topPosts,
      analyticsData: analyticsData.slice(0, 10), // 最新10件
      postsData: postsData.slice(0, 10), // 最新10件
    };

    console.log('X月次レポート生成完了:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('X月次レポート取得エラー:', error);
    return NextResponse.json(
      { error: 'Failed to fetch X monthly report data' },
      { status: 500 }
    );
  }
}
