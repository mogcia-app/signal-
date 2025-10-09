import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';

// 日付範囲のヘルパー関数
function getDateRange(period: string, date?: string) {
  const now = date ? new Date(date) : new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // 今月の開始と終了
  const currentMonthStart = new Date(currentYear, currentMonth, 1);
  const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
  
  // 先月の開始と終了
  const previousMonthStart = new Date(currentYear, currentMonth - 1, 1);
  const previousMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);
  
  return {
    current: { start: currentMonthStart, end: currentMonthEnd },
    previous: { start: previousMonthStart, end: previousMonthEnd }
  };
}

// 週次データの集計関数
function aggregateWeeklyData(analyticsData: Array<{
  createdAt: Date;
  likes: number;
  retweets: number;
  comments: number;
  impressions: number;
  followers: number;
}>) {
  const weeklyData: { [key: string]: {
    period: string;
    likes: number;
    retweets: number;
    comments: number;
    impressions: number;
    followers: number;
  } } = {};
  
  analyticsData.forEach(data => {
    const date = data.createdAt;
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // 週の開始（日曜日）
    const weekKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = {
        period: `第${Math.ceil(weekStart.getDate() / 7)}週`,
        likes: 0,
        retweets: 0,
        comments: 0,
        impressions: 0,
        followers: 0
      };
    }
    
    weeklyData[weekKey].likes += Number(data.likes) || 0;
    weeklyData[weekKey].retweets += Number(data.retweets) || 0;
    weeklyData[weekKey].comments += Number(data.comments) || 0;
    weeklyData[weekKey].impressions += Number(data.impressions) || 0;
    weeklyData[weekKey].followers = Number(data.followers) || 0; // 最新のフォロワー数
  });
  
  return Object.values(weeklyData).slice(-4); // 最新4週間
}

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

    // 日付範囲を取得
    const dateRange = getDateRange(period, date || undefined);

    // 今月のX analyticsデータを取得
    const analyticsSnapshot = await adminDb
      .collection('xanalytics')
      .where('userId', '==', userId)
      .limit(100)
      .get();
    const allAnalyticsData = analyticsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) as Array<{
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

    // 今月のデータをフィルタリング
    const currentMonthData = allAnalyticsData.filter(data => 
      data.createdAt >= dateRange.current.start && data.createdAt <= dateRange.current.end
    );

    // 先月のデータをフィルタリング
    const previousMonthData = allAnalyticsData.filter(data => 
      data.createdAt >= dateRange.previous.start && data.createdAt <= dateRange.previous.end
    );

    console.log('X analyticsデータ取得完了:', {
      all: allAnalyticsData.length,
      current: currentMonthData.length,
      previous: previousMonthData.length
    });

    // X postsデータを取得
    const postsSnapshot = await adminDb
      .collection('x_posts')
      .where('userId', '==', userId)
      .limit(100)
      .get();
    const postsData = postsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // クライアント側でソート

    console.log('X postsデータ取得完了:', postsData.length, '件');

    // 今月のデータ集計
    const totals = {
      totalLikes: currentMonthData.reduce((sum, data) => sum + (Number(data.likes) || 0), 0),
      totalRetweets: currentMonthData.reduce((sum, data) => sum + (Number(data.retweets) || 0), 0),
      totalComments: currentMonthData.reduce((sum, data) => sum + (Number(data.comments) || 0), 0),
      totalSaves: currentMonthData.reduce((sum, data) => sum + (Number(data.saves) || 0), 0),
      totalImpressions: currentMonthData.reduce((sum, data) => sum + (Number(data.impressions) || 0), 0),
      totalEngagements: currentMonthData.reduce((sum, data) => sum + (Number(data.engagements) || 0), 0),
      totalPosts: postsData.filter(post => {
        const postDate = post.createdAt;
        return postDate >= dateRange.current.start && postDate <= dateRange.current.end;
      }).length,
      totalFollowers: currentMonthData.length > 0 ? (Number(currentMonthData[0].followers) || 0) : 0,
    };

    // 先月のデータ集計
    const previousTotals = {
      totalLikes: previousMonthData.reduce((sum, data) => sum + (Number(data.likes) || 0), 0),
      totalRetweets: previousMonthData.reduce((sum, data) => sum + (Number(data.retweets) || 0), 0),
      totalComments: previousMonthData.reduce((sum, data) => sum + (Number(data.comments) || 0), 0),
      totalSaves: previousMonthData.reduce((sum, data) => sum + (Number(data.saves) || 0), 0),
      totalImpressions: previousMonthData.reduce((sum, data) => sum + (Number(data.impressions) || 0), 0),
      totalEngagements: previousMonthData.reduce((sum, data) => sum + (Number(data.engagements) || 0), 0),
      totalPosts: postsData.filter(post => {
        const postDate = post.createdAt;
        return postDate >= dateRange.previous.start && postDate <= dateRange.previous.end;
      }).length,
      totalFollowers: previousMonthData.length > 0 ? (Number(previousMonthData[0].followers) || 0) : 0,
    };

    // 週次トレンドデータを生成
    const weeklyTrend = aggregateWeeklyData(allAnalyticsData);

    console.log('データ集計結果:', totals);

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

    // リーチソース分析（最新のデータから）
    const latestAnalytics = allAnalyticsData[0];
    const reachSourceAnalysis = latestAnalytics?.reachSource || {
      sources: { home: 45, profile: 20, explore: 15, search: 12, other: 8 },
      followers: { followers: 68, nonFollowers: 32 }
    };

    // トップ投稿（エンゲージメント数でソート）
    const topPosts = currentMonthData
      .sort((a, b) => (Number(b.engagements) || 0) - (Number(a.engagements) || 0))
      .slice(0, 5);

    const response = {
      period,
      date,
      totals,
      previousTotals,
      weeklyTrend,
      engagement: {
        engagementRate: Number(engagementRate.toFixed(2)),
        likeRate: Number(likeRate.toFixed(2)),
        retweetRate: Number(retweetRate.toFixed(2)),
        replyRate: Number(replyRate.toFixed(2)),
      },
      reachSourceAnalysis,
      topPosts,
      analyticsData: currentMonthData.slice(0, 10), // 今月の最新10件
      postsData: postsData.slice(0, 10), // 最新10件
    };

    console.log('X月次レポート生成完了:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('X月次レポート取得エラー:', error);
    console.error('エラー詳細:', {
      name: (error as Error).name,
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch X monthly report data',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
