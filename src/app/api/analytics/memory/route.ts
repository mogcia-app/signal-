import { NextRequest, NextResponse } from 'next/server';

// メモリベースのデータストレージ（本番環境対応）
let analyticsData: Record<string, unknown>[] = [];

// 分析データ作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      postId, 
      userId, 
      likes, 
      comments, 
      shares, 
      reach, 
      engagementRate,
      profileClicks,
      websiteClicks,
      storyViews,
      followerChange,
      publishedAt 
    } = body;

    // バリデーション
    if (!postId || !userId) {
      return NextResponse.json(
        { error: 'postIdとuserIdが必要です' },
        { status: 400 }
      );
    }

    const newAnalyticsData = {
      id: 'analytics_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      postId,
      userId,
      likes: parseInt(likes) || 0,
      comments: parseInt(comments) || 0,
      shares: parseInt(shares) || 0,
      reach: parseInt(reach) || 0,
      engagementRate: parseFloat(engagementRate) || 0,
      profileClicks: parseInt(profileClicks) || 0,
      websiteClicks: parseInt(websiteClicks) || 0,
      storyViews: parseInt(storyViews) || 0,
      followerChange: parseInt(followerChange) || 0,
      publishedAt: new Date(publishedAt).toISOString(),
      createdAt: new Date().toISOString()
    };

    // メモリに追加
    analyticsData = [newAnalyticsData, ...analyticsData];
    
    console.log('Analytics data saved to memory:', newAnalyticsData);
    console.log('Total analytics records in memory:', analyticsData.length);
    
    return NextResponse.json({
      id: newAnalyticsData.id,
      message: '分析データが保存されました',
      data: newAnalyticsData
    });

  } catch (error) {
    console.error('分析データ保存エラー:', error);
    return NextResponse.json(
      { error: '分析データの保存に失敗しました' },
      { status: 500 }
    );
  }
}

// 分析データ一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const postId = searchParams.get('postId');
    const limit = parseInt(searchParams.get('limit') || '50');

    // フィルタリング
    let filteredData = analyticsData;
    
    if (userId) {
      filteredData = filteredData.filter((item: Record<string, unknown>) => item.userId === userId);
    }
    
    if (postId) {
      filteredData = filteredData.filter((item: Record<string, unknown>) => item.postId === postId);
    }
    
    // 制限
    const analytics = filteredData.slice(0, limit);

    console.log('Fetched analytics from memory:', analytics.length, 'records');
    console.log('Total records in memory:', analyticsData.length);

    return NextResponse.json({
      analytics,
      total: filteredData.length
    });

  } catch (error) {
    console.error('分析データ取得エラー:', error);
    return NextResponse.json({
      analytics: [],
      total: 0
    });
  }
}
