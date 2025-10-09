import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

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
  totalPosts: number;
  avgEngagementRate: number;
  bestPerformingPost: {
    title: string;
    engagement: number;
    postType: string;
  } | null;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API呼び出し開始');
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      console.log('❌ User ID not provided');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🔍 ダッシュボード統計API呼び出し:', { userId });

    // 今週の開始日と終了日を計算
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // 今月の開始日と終了日を計算
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 投稿データを取得
    console.log('🔍 Firebase接続開始');
    console.log('🔍 投稿クエリ実行中...');
    const postsSnapshot = await adminDb
      .collection('posts')
      .where('userId', '==', userId)
      .where('status', '==', 'published')
      .get();
    console.log('✅ 投稿データ取得完了:', postsSnapshot.docs.length, '件');
    
    // 生データをログ出力（デバッグ用）
    // console.log('🔍 生の投稿データ:', postsSnapshot.docs.map(doc => ({
    //   id: doc.id,
    //   data: doc.data()
    // })));
    
    const posts = postsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
      publishedAt: doc.data().publishedAt?.toDate ? doc.data().publishedAt.toDate() : (doc.data().publishedAt ? new Date(doc.data().publishedAt) : undefined)
    })) as Array<{
      id: string;
      userId: string;
      title: string;
      content: string;
      hashtags: string[];
      postType: 'feed' | 'reel' | 'story';
      scheduledDate?: string;
      scheduledTime?: string;
      status: 'draft' | 'scheduled' | 'published';
      imageUrl?: string | null;
      imageData?: string | null;
      createdAt: Date;
      updatedAt: Date;
      publishedAt?: Date; // 投稿日時を追加
    }>;

    // アナリティクスデータを取得
    const analyticsSnapshot = await adminDb
      .collection('analytics')
      .where('userId', '==', userId)
      .get();
    const analytics = analyticsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      publishedAt: doc.data().publishedAt?.toDate ? doc.data().publishedAt.toDate() : new Date(doc.data().publishedAt)
    })) as Array<{
      id: string;
      postId: string | null;
      userId: string;
      likes: number;
      comments: number;
      shares: number;
      reach: number;
      saves?: number;
      followerChange?: number;
      publishedAt: Date;
      publishedTime?: string;
      createdAt: Date;
      hashtags?: string[];
      category?: string;
    }>;

    // 今週の投稿数を計算（createdAtを使用）
    const postsThisWeek = posts.filter(post => {
      const postDate = new Date(post.createdAt);
      return postDate >= startOfWeek && postDate <= endOfWeek;
    }).length;

    // 今月の投稿数を投稿タイプ別に計算（createdAtを使用）
    const monthlyPosts = posts.filter(post => {
      const postDate = new Date(post.createdAt);
      return postDate >= startOfMonth && postDate <= endOfMonth;
    });

    const monthlyFeedPosts = monthlyPosts.filter(post => post.postType === 'feed').length;
    const monthlyReelPosts = monthlyPosts.filter(post => post.postType === 'reel').length;
    const monthlyStoryPosts = monthlyPosts.filter(post => post.postType === 'story').length;

    // デバッグログ: 日付と投稿の詳細
    console.log('📅 日付範囲:', {
      now: now.toISOString(),
      nowLocal: now.toLocaleString('ja-JP'),
      startOfWeek: startOfWeek.toISOString(),
      endOfWeek: endOfWeek.toISOString(),
      startOfMonth: startOfMonth.toISOString(),
      endOfMonth: endOfMonth.toISOString(),
      weekRange: `${startOfWeek.toLocaleDateString('ja-JP')} - ${endOfWeek.toLocaleDateString('ja-JP')}`,
      monthRange: `${startOfMonth.toLocaleDateString('ja-JP')} - ${endOfMonth.toLocaleDateString('ja-JP')}`
    });

    console.log('📊 投稿データ詳細:', {
      totalPosts: posts.length,
      posts: posts.map(post => ({
        id: post.id,
        type: post.postType,
        createdAt: post.createdAt.toISOString(),
        publishedAt: post.publishedAt ? post.publishedAt.toISOString() : 'undefined',
        status: post.status,
        isThisWeek: (() => {
          const postDate = new Date(post.createdAt);
          return postDate >= startOfWeek && postDate <= endOfWeek;
        })(),
        isThisMonth: (() => {
          const postDate = new Date(post.createdAt);
          return postDate >= startOfMonth && postDate <= endOfMonth;
        })()
      }))
    });

    console.log('📊 投稿タイプ別統計:', {
      totalPosts: posts.length,
      monthlyPosts: monthlyPosts.length,
      monthlyFeedPosts,
      monthlyReelPosts,
      monthlyStoryPosts,
      postTypes: monthlyPosts.map(post => ({ id: post.id, type: post.postType, createdAt: post.createdAt }))
    });

    // エンゲージメント統計を計算
    const totalLikes = analytics.reduce((sum, analytic) => sum + (analytic.likes || 0), 0);
    const totalComments = analytics.reduce((sum, analytic) => sum + (analytic.comments || 0), 0);
    const totalShares = analytics.reduce((sum, analytic) => sum + (analytic.shares || 0), 0);
    const totalReach = analytics.reduce((sum, analytic) => sum + (analytic.reach || 0), 0);
    const totalSaves = analytics.reduce((sum, analytic) => sum + (analytic.saves || 0), 0);

    // 平均エンゲージメント率を計算
    const totalEngagement = totalLikes + totalComments + totalShares + totalSaves;
    const avgEngagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;

    // 最もパフォーマンスの良い投稿を特定
    let bestPerformingPost = null;
    if (analytics.length > 0) {
      const bestAnalytic = analytics.reduce((best, current) => {
        const currentEngagement = (current.likes || 0) + (current.comments || 0) + (current.shares || 0) + (current.saves || 0);
        const bestEngagement = (best.likes || 0) + (best.comments || 0) + (best.shares || 0) + (best.saves || 0);
        return currentEngagement > bestEngagement ? current : best;
      });

      const bestPost = posts.find(post => post.id === bestAnalytic.postId);
      if (bestPost) {
        const engagement = (bestAnalytic.likes || 0) + (bestAnalytic.comments || 0) + (bestAnalytic.shares || 0) + (bestAnalytic.saves || 0);
        bestPerformingPost = {
          title: bestPost.title || '無題の投稿',
          engagement,
          postType: bestPost.postType
        };
      }
    }

    // 最も多い投稿タイプを特定
    const postTypeCounts = {
      feed: monthlyPosts.filter(post => post.postType === 'feed').length,
      reel: monthlyPosts.filter(post => post.postType === 'reel').length,
      story: monthlyPosts.filter(post => post.postType === 'story').length
    };
    const topPostType = Object.entries(postTypeCounts)
      .sort(([,a], [,b]) => b - a)[0][0];

    // フォロワー増加率を計算（最新のアナリティクスから）
    const followerChanges = analytics
      .filter(analytic => analytic.followerChange !== undefined)
      .map(analytic => analytic.followerChange!);
    const followerGrowth = followerChanges.length > 0 
      ? followerChanges.reduce((sum, change) => sum + change, 0) 
      : 0;

    // 総シェア数を使用（analyticsページと一致）
    const totalSharesCount = totalShares;

    const dashboardStats: DashboardStats = {
      followers: 1000 + followerGrowth, // 実際のフォロワー数 + 増加数（現在はベース値1000を使用）
      engagement: totalSharesCount, // 総シェア数（analyticsページと一致）
      reach: totalReach,
      saves: totalSaves,
      likes: totalLikes,
      comments: totalComments,
      postsThisWeek,
      weeklyGoal: 5, // 週間目標投稿数
      followerGrowth: Math.round(followerGrowth * 100) / 100,
      topPostType,
      monthlyFeedPosts,
      monthlyReelPosts,
      monthlyStoryPosts,
      totalPosts: posts.length,
      avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
      bestPerformingPost
    };

    console.log('✅ ダッシュボード統計完了:', {
      totalPosts: posts.length,
      totalAnalytics: analytics.length,
      postsThisWeek,
      monthlyFeedPosts: dashboardStats.monthlyFeedPosts,
      monthlyReelPosts: dashboardStats.monthlyReelPosts,
      monthlyStoryPosts: dashboardStats.monthlyStoryPosts,
      avgEngagementRate: dashboardStats.avgEngagementRate
    });

    return NextResponse.json({
      success: true,
      data: dashboardStats,
      period: {
        week: { start: startOfWeek.toISOString(), end: endOfWeek.toISOString() },
        month: { start: startOfMonth.toISOString(), end: endOfMonth.toISOString() }
      }
    });

  } catch (error) {
    console.error('❌ ダッシュボード統計エラー:', error);
    console.error('❌ エラーの詳細:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return NextResponse.json(
      { 
        error: 'ダッシュボード統計の取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
