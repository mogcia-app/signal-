import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

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

interface AnalyticsData {
  id: string;
  postId: string;
  userId: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagementRate: number;
  profileClicks?: number;
  websiteClicks?: number;
  storyViews?: number;
  followerChange?: number;
  publishedAt: Date;
  createdAt: Date;
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

    // 本番環境でもFirebaseに接続を試行
    console.log('Dashboard environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Set' : 'Not set'
    });

    // まずローカルストレージから取得を試行（クライアントサイドでのみ動作）
    // サーバーサイドではFirebaseから取得
    let analyticsData: AnalyticsData[] = [];
    
    try {
      const analyticsQuery = query(
        collection(db, 'analytics'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const analyticsSnapshot = await getDocs(analyticsQuery);
      analyticsData = analyticsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AnalyticsData));
    } catch (firebaseError) {
      console.warn('Firebase fetch failed, using empty data:', firebaseError);
      analyticsData = [];
    }

    // デバッグ用ログ
    console.log('Total analytics records:', analyticsData.length);
    console.log('Sample analytics data:', analyticsData[0]);

    // 統計データを計算
    const totalLikes = analyticsData.reduce((sum, data) => 
      sum + (data.likes || 0), 0
    );
    const totalComments = analyticsData.reduce((sum, data) => 
      sum + (data.comments || 0), 0
    );
    const totalSaves = analyticsData.reduce((sum, data) => 
      sum + (data.shares || 0), 0
    );
    const totalReach = analyticsData.reduce((sum, data) => 
      sum + (data.reach || 0), 0
    );

    // 今週の投稿数
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const postsThisWeek = analyticsData.filter(data => 
      new Date(data.publishedAt) >= oneWeekAgo
    ).length;

    // 今月の投稿数（タイプ別）
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    // const monthlyAnalytics = analyticsData.filter(data => 
    //   new Date(data.publishedAt) >= oneMonthAgo
    // );

    // 投稿タイプ別の集計（投稿データから取得する必要がある）
    const monthlyFeedPosts = 0; // TODO: 投稿データから取得
    const monthlyReelPosts = 0; // TODO: 投稿データから取得
    const monthlyStoryPosts = 0; // TODO: 投稿データから取得

    // エンゲージメント率の計算
    const avgEngagement = analyticsData.length > 0 
      ? analyticsData.reduce((sum, data) => sum + (data.engagementRate || 0), 0) / analyticsData.length
      : 0;

    // フォロワー数の推定（実際のAPIから取得する場合はここを変更）
    const estimatedFollowers = 1000 + (totalLikes * 0.1);

    // 人気投稿タイプの計算（投稿データから取得する必要がある）
    const topPostType = 'ー'; // TODO: 投稿データから取得

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
      topPostType,
      monthlyFeedPosts,
      monthlyReelPosts,
      monthlyStoryPosts
    };

    return NextResponse.json({
      stats,
      totalAnalytics: analyticsData.length,
      message: 'ダッシュボード統計データを取得しました'
    });

  } catch (error) {
    console.error('ダッシュボード統計取得エラー:', error);
    // エラーが発生した場合はデフォルト値を返す
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
