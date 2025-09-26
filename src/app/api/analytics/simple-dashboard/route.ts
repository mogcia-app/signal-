import { NextRequest, NextResponse } from 'next/server';
import { readFile, mkdir } from 'fs/promises';
import { join } from 'path';

// 簡単なファイルベースデータベース
const DATA_DIR = join(process.cwd(), 'data');
const ANALYTICS_FILE = join(DATA_DIR, 'analytics.json');

// ダッシュボード用の統計データ型定義
interface DashboardStats {
  followers: number;
  engagement: number;
  reach: number;
  saves: number;
  likes: number;
  comments: number;
  postsThisWeek: number;
  weeklyGoal: number;
  followerGrowth: number;
  topPostType: string;
  monthlyFeedPosts: number;
  monthlyReelPosts: number;
  monthlyStoryPosts: number;
}

// データを読み込み
async function readAnalyticsData() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const data = await readFile(ANALYTICS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading analytics data:', error);
    return [];
  }
}

// ダッシュボード統計データ取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // データを読み込み
    const allData = await readAnalyticsData();
    const analyticsData = allData.filter((item: Record<string, unknown>) => item.userId === userId);

    console.log('Dashboard - Total analytics records:', analyticsData.length);

    // 統計データを計算
    const totalLikes = analyticsData.reduce((sum: number, data: Record<string, unknown>) => 
      sum + (Number(data.likes) || 0), 0
    );
    const totalComments = analyticsData.reduce((sum: number, data: Record<string, unknown>) => 
      sum + (Number(data.comments) || 0), 0
    );
    const totalSaves = analyticsData.reduce((sum: number, data: Record<string, unknown>) => 
      sum + (Number(data.shares) || 0), 0
    );
    const totalReach = analyticsData.reduce((sum: number, data: Record<string, unknown>) => 
      sum + (Number(data.reach) || 0), 0
    );

    // 今週の投稿数
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const postsThisWeek = analyticsData.filter((data: Record<string, unknown>) => 
      new Date(data.publishedAt as string) >= oneWeekAgo
    ).length;

    // エンゲージメント率の計算
    const avgEngagement = analyticsData.length > 0 
      ? analyticsData.reduce((sum: number, data: Record<string, unknown>) => sum + (Number(data.engagementRate) || 0), 0) / analyticsData.length
      : 0;

    // フォロワー数の推定
    const estimatedFollowers = 1000 + (totalLikes * 0.1);

    const stats: DashboardStats = {
      followers: Math.round(estimatedFollowers),
      engagement: Math.round(avgEngagement * 10) / 10,
      reach: totalReach,
      saves: totalSaves,
      likes: totalLikes,
      comments: totalComments,
      postsThisWeek,
      weeklyGoal: 5,
      followerGrowth: analyticsData.length > 0 ? 12.5 : 0,
      topPostType: 'ー',
      monthlyFeedPosts: 0,
      monthlyReelPosts: 0,
      monthlyStoryPosts: 0
    };

    return NextResponse.json({
      stats,
      totalAnalytics: analyticsData.length,
      message: 'ダッシュボード統計データを取得しました'
    });

  } catch (error) {
    console.error('ダッシュボード統計取得エラー:', error);
    const defaultStats: DashboardStats = {
      followers: 0,
      engagement: 0,
      reach: 0,
      saves: 0,
      likes: 0,
      comments: 0,
      postsThisWeek: 0,
      weeklyGoal: 5,
      followerGrowth: 0,
      topPostType: 'ー',
      monthlyFeedPosts: 0,
      monthlyReelPosts: 0,
      monthlyStoryPosts: 0
    };
    return NextResponse.json({ stats: defaultStats });
  }
}
