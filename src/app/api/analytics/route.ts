import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

// 分析データの型定義
interface AnalyticsData {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  metrics: {
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    avgEngagementRate: number;
    followerGrowth: number;
    topHashtags: Array<{ tag: string; count: number }>;
    postTypeBreakdown: {
      feed: number;
      reel: number;
      story: number;
    };
    engagementByHour: Array<{ hour: number; engagement: number }>;
  };
  generatedAt: Date;
}

// 分析データ生成・取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') || 'monthly';

    if (!userId) {
      return NextResponse.json(
        { error: 'userIdが必要です' },
        { status: 400 }
      );
    }

    // 期間に応じて日付範囲を計算
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'daily':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    // 投稿データを取得
    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', userId),
      where('createdAt', '>=', startDate),
      orderBy('createdAt', 'desc')
    );

    const postsSnapshot = await getDocs(postsQuery);
    const posts = postsSnapshot.docs.map(doc => doc.data());

    // 基本メトリクス計算
    const totalPosts = posts.length;
    const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);
    const totalComments = posts.reduce((sum, post) => sum + (post.comments || 0), 0);
    const totalShares = posts.reduce((sum, post) => sum + (post.shares || 0), 0);
    
    // エンゲージメント率計算（模擬データ）
    const avgEngagementRate = totalPosts > 0 ? 
      Math.round(((totalLikes + totalComments + totalShares) / totalPosts) * 100) / 100 : 0;

    // フォロワー増加（模擬データ）
    const followerGrowth = Math.floor(Math.random() * 100) + 10;

    // ハッシュタグ分析
    const hashtagCounts: { [key: string]: number } = {};
    posts.forEach(post => {
      if (post.hashtags) {
        post.hashtags.forEach((tag: string) => {
          hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
        });
      }
    });

    const topHashtags = Object.entries(hashtagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    // 投稿タイプ別分析
    const postTypeBreakdown = {
      feed: posts.filter(post => post.postType === 'feed').length,
      reel: posts.filter(post => post.postType === 'reel').length,
      story: posts.filter(post => post.postType === 'story').length
    };

    // 時間別エンゲージメント（模擬データ）
    const engagementByHour = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      engagement: Math.floor(Math.random() * 100) + 10
    }));

    const analyticsData: AnalyticsData = {
      userId,
      period: period as 'daily' | 'weekly' | 'monthly',
      metrics: {
        totalPosts,
        totalLikes,
        totalComments,
        totalShares,
        avgEngagementRate,
        followerGrowth,
        topHashtags,
        postTypeBreakdown,
        engagementByHour
      },
      generatedAt: new Date()
    };

    return NextResponse.json({
      analytics: analyticsData,
      summary: {
        period,
        totalPosts,
        avgEngagementRate,
        followerGrowth,
        topPerformingHashtag: topHashtags[0]?.tag || 'なし',
        mostUsedPostType: Object.entries(postTypeBreakdown)
          .sort(([,a], [,b]) => b - a)[0][0] || 'feed'
      }
    });

  } catch (error) {
    console.error('分析データ取得エラー:', error);
    return NextResponse.json(
      { error: '分析データの取得に失敗しました' },
      { status: 500 }
    );
  }
}
