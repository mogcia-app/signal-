import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { cache, generateCacheKey } from '../../../../lib/cache';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface AnalyticsData {
  id: string;
  postId: string | null;
  userId: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  profileClicks?: number;
  websiteClicks?: number;
  storyViews?: number;
  followerChange?: number;
  publishedAt: Date;
  publishedTime?: string;
  createdAt: Date;
  title?: string;
  content?: string;
  hashtags?: string[];
  category?: string;
  thumbnail?: string;
  audience?: {
    gender: {
      male: number;
      female: number;
      other: number;
    };
    age: {
      '13-17': number;
      '18-24': number;
      '25-34': number;
      '35-44': number;
      '45-54': number;
      '55-64': number;
      '65+': number;
    };
  };
  reachSource?: {
    sources: {
      posts: number;
      profile: number;
      explore: number;
      search: number;
      other: number;
    };
    followers: {
      followers: number;
      nonFollowers: number;
    };
  };
}

// 日別スコア計算関数（account-scoreと同じロジック）
function calculateAccountScore(analyticsData: AnalyticsData[], postsCount: number) {
  if (analyticsData.length === 0) return 0;

  const totalLikes = analyticsData.reduce((sum, data) => sum + data.likes, 0);
  const totalComments = analyticsData.reduce((sum, data) => sum + data.comments, 0);
  const totalShares = analyticsData.reduce((sum, data) => sum + data.shares, 0);
  const totalReach = analyticsData.reduce((sum, data) => sum + data.reach, 0);
  const avgReach = totalReach / analyticsData.length;

  // 厳格なスコアリング
  let score = 0;

  // エンゲージメント率（厳格）
  const engagementRate = totalReach > 0 ? ((totalLikes + totalComments + totalShares) / totalReach) * 100 : 0;
  if (engagementRate >= 10) score += 30;
  else if (engagementRate >= 7) score += 25;
  else if (engagementRate >= 5) score += 20;
  else if (engagementRate >= 3) score += 15;
  else if (engagementRate >= 1) score += 10;
  else score += 5;

  // 投稿頻度（厳格）
  if (postsCount >= 20) score += 25;
  else if (postsCount >= 15) score += 20;
  else if (postsCount >= 10) score += 15;
  else if (postsCount >= 5) score += 10;
  else score += 5;

  // リーチ（厳格）
  if (avgReach >= 10000) score += 25;
  else if (avgReach >= 5000) score += 20;
  else if (avgReach >= 2000) score += 15;
  else if (avgReach >= 1000) score += 10;
  else score += 5;

  // 一貫性（厳格）
  const consistency = analyticsData.length >= 15 ? 20 : analyticsData.length >= 10 ? 15 : analyticsData.length >= 5 ? 10 : 5;
  score += consistency;

  return Math.min(100, Math.max(0, score));
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    // キャッシュキー生成
    const cacheKey = generateCacheKey('daily-scores', { userId, days });
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // 期間の計算
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    console.log('Daily scores API - Fetching data for user:', userId, 'days:', days);
    console.log('Date range:', startDate.toISOString(), 'to', endDate.toISOString());

    // Firebase接続確認
    if (!db) {
      throw new Error('Firebase database not initialized');
    }

    // 分析データを取得（orderByを削除してインデックスエラーを回避）
    const analyticsRef = collection(db, 'analytics');
    const q = query(
      analyticsRef,
      where('userId', '==', userId)
    );
    const analyticsSnapshot = await getDocs(q);

    const allAnalyticsData = analyticsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        publishedAt: data.publishedAt?.toDate ? data.publishedAt.toDate() : new Date(data.publishedAt),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
      } as AnalyticsData;
    });

    // 期間でフィルタリング（クライアント側で実行）
    const analyticsData = allAnalyticsData.filter(data => {
      const dataDate = new Date(data.publishedAt);
      return dataDate >= startDate && dataDate <= endDate;
    });

    console.log('Total analytics data:', allAnalyticsData.length);
    console.log('Filtered analytics data:', analyticsData.length);

    // 投稿データを取得（期間フィルタリングはクライアント側で実行）
    const postsRef = collection(db, 'posts');
    const postsQuery = query(
      postsRef,
      where('userId', '==', userId)
    );
    const postsSnapshot = await getDocs(postsQuery);

    const allPostsData = postsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
      };
    });

    // 期間でフィルタリング（クライアント側で実行）
    const postsData = allPostsData.filter(post => {
      const postDate = new Date(post.createdAt);
      return postDate >= startDate && postDate <= endDate;
    });

    console.log('Total posts data:', allPostsData.length);
    console.log('Filtered posts data:', postsData.length);

    // 日別データを生成
    const dailyScores = [];
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      // その日のデータをフィルタリング
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dayAnalytics = analyticsData.filter(data => {
        const publishedAt = data.publishedAt;
        return publishedAt >= dayStart && publishedAt <= dayEnd;
      });

      const dayPosts = postsData.filter(post => {
        const createdAt = post.createdAt;
        return createdAt >= dayStart && createdAt <= dayEnd;
      });

      // その日のスコアを計算
      const dayScore = calculateAccountScore(dayAnalytics, dayPosts.length);

      dailyScores.push({
        date: currentDate.toISOString().split('T')[0],
        score: dayScore,
        label: `${currentDate.getMonth() + 1}/${currentDate.getDate()}`,
        analyticsCount: dayAnalytics.length,
        postsCount: dayPosts.length
      });
    }

    const result = {
      period: `${days}日間`,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dailyScores,
      totalAnalytics: analyticsData.length,
      totalPosts: postsData.length
    };

    // キャッシュに保存（5分間）
    cache.set(cacheKey, result, 5 * 60 * 1000);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Daily scores API error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: request.headers.get('x-user-id'),
      days: request.nextUrl.searchParams.get('days')
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch daily scores',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
