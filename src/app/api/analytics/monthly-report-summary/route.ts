import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

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
  publishedAt: Date | { toDate: () => Date };
  publishedTime?: string;
  createdAt: Date | { toDate: () => Date };
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

interface PostData {
  id: string;
  title: string;
  content: string;
  hashtags: string[];
  postType: 'feed' | 'reel' | 'story';
  scheduledDate?: string;
  scheduledTime?: string;
  status: 'draft' | 'scheduled' | 'published';
  createdAt: Date | { toDate: () => Date };
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  reach?: number;
  engagementRate?: number;
}

// 週の開始日と終了日を取得する関数
function getWeekRange(weekString: string): { start: Date; end: Date } {
  const [year, week] = weekString.split('-W');
  const startOfYear = new Date(parseInt(year), 0, 1);
  const startOfWeek = new Date(startOfYear.getTime() + (parseInt(week) - 1) * 7 * 24 * 60 * 60 * 1000);
  const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);
  return { start: startOfWeek, end: endOfWeek };
}

// 前期間のデータを取得
function getPreviousPeriod(period: 'weekly' | 'monthly', currentDate: string): string {
  if (period === 'monthly') {
    const current = new Date(currentDate + '-01');
    current.setMonth(current.getMonth() - 1);
    return current.toISOString().slice(0, 7);
  } else {
    const [year, week] = currentDate.split('-W');
    const currentWeek = parseInt(week);
    const previousWeek = currentWeek > 1 ? currentWeek - 1 : 52;
    const previousYear = currentWeek > 1 ? year : (parseInt(year) - 1).toString();
    return `${previousYear}-W${previousWeek.toString().padStart(2, '0')}`;
  }
}

// データを期間でフィルタリング
function filterDataByPeriod(data: AnalyticsData[], period: 'weekly' | 'monthly', date: string): AnalyticsData[] {
  return data.filter(item => {
    const itemDate = item.publishedAt instanceof Date ? item.publishedAt : 
      (item.publishedAt && typeof item.publishedAt === 'object' && 'toDate' in item.publishedAt) ?
        item.publishedAt.toDate() : new Date(item.publishedAt);
    
    if (period === 'monthly') {
      const itemMonth = itemDate.toISOString().slice(0, 7);
      return itemMonth === date;
    } else if (period === 'weekly') {
      const weekRange = getWeekRange(date);
      return itemDate >= weekRange.start && itemDate <= weekRange.end;
    }
    
    return true;
  });
}

// 統計値を計算
function calculateTotals(analytics: AnalyticsData[]) {
  return {
    totalLikes: analytics.reduce((sum, data) => sum + data.likes, 0),
    totalComments: analytics.reduce((sum, data) => sum + data.comments, 0),
    totalShares: analytics.reduce((sum, data) => sum + data.shares, 0),
    totalReach: analytics.reduce((sum, data) => sum + data.reach, 0),
    totalFollowerChange: analytics.reduce((sum, data) => sum + (data.followerChange || 0), 0),
    totalPosts: analytics.length
  };
}

// 変化率を計算
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous * 100);
}

// オーディエンス分析を計算
function calculateAudienceAnalysis(analytics: AnalyticsData[]) {
  const audienceData = analytics.filter(data => data.audience);
  if (audienceData.length === 0) {
    return {
      gender: { male: 0, female: 0, other: 0 },
      age: { '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0 }
    };
  }

  const avgGender = {
    male: audienceData.reduce((sum, data) => sum + (data.audience?.gender.male || 0), 0) / audienceData.length,
    female: audienceData.reduce((sum, data) => sum + (data.audience?.gender.female || 0), 0) / audienceData.length,
    other: audienceData.reduce((sum, data) => sum + (data.audience?.gender.other || 0), 0) / audienceData.length
  };

  const avgAge = {
    '18-24': audienceData.reduce((sum, data) => sum + (data.audience?.age['18-24'] || 0), 0) / audienceData.length,
    '25-34': audienceData.reduce((sum, data) => sum + (data.audience?.age['25-34'] || 0), 0) / audienceData.length,
    '35-44': audienceData.reduce((sum, data) => sum + (data.audience?.age['35-44'] || 0), 0) / audienceData.length,
    '45-54': audienceData.reduce((sum, data) => sum + (data.audience?.age['45-54'] || 0), 0) / audienceData.length
  };

  return { gender: avgGender, age: avgAge };
}

// 閲覧ソース分析を計算
function calculateReachSourceAnalysis(analytics: AnalyticsData[]) {
  const reachSourceData = analytics.filter(data => data.reachSource);
  if (reachSourceData.length === 0) {
    return {
      sources: { posts: 0, profile: 0, explore: 0, search: 0 },
      followers: { followers: 0, nonFollowers: 0 }
    };
  }

  const avgSources = {
    posts: reachSourceData.reduce((sum, data) => sum + (data.reachSource?.sources.posts || 0), 0) / reachSourceData.length,
    profile: reachSourceData.reduce((sum, data) => sum + (data.reachSource?.sources.profile || 0), 0) / reachSourceData.length,
    explore: reachSourceData.reduce((sum, data) => sum + (data.reachSource?.sources.explore || 0), 0) / reachSourceData.length,
    search: reachSourceData.reduce((sum, data) => sum + (data.reachSource?.sources.search || 0), 0) / reachSourceData.length
  };

  const avgFollowers = {
    followers: reachSourceData.reduce((sum, data) => sum + (data.reachSource?.followers.followers || 0), 0) / reachSourceData.length,
    nonFollowers: reachSourceData.reduce((sum, data) => sum + (data.reachSource?.followers.nonFollowers || 0), 0) / reachSourceData.length
  };

  return { sources: avgSources, followers: avgFollowers };
}

// ハッシュタグ統計を計算
function calculateHashtagStats(analytics: AnalyticsData[], posts: PostData[]) {
  const hashtagCounts: { [key: string]: number } = {};
  
  analytics.forEach(data => {
    if (!data.postId && data.hashtags) {
      data.hashtags.forEach(hashtag => {
        hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
      });
    } else {
      const post = posts.find(p => p.id === data.postId);
      if (post?.hashtags) {
        post.hashtags.forEach(hashtag => {
          hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
        });
      }
    }
  });

  return Object.entries(hashtagCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([hashtag, count]) => ({ hashtag, count }));
}

// 投稿時間分析を計算
function calculateTimeSlotAnalysis(analytics: AnalyticsData[]) {
  const timeSlots = [
    { label: '早朝 (6-9時)', range: [6, 9], color: 'from-blue-400 to-blue-600' },
    { label: '午前 (9-12時)', range: [9, 12], color: 'from-green-400 to-green-600' },
    { label: '午後 (12-15時)', range: [12, 15], color: 'from-yellow-400 to-yellow-600' },
    { label: '夕方 (15-18時)', range: [15, 18], color: 'from-orange-400 to-orange-600' },
    { label: '夜 (18-21時)', range: [18, 21], color: 'from-red-400 to-red-600' },
    { label: '深夜 (21-6時)', range: [21, 24], color: 'from-purple-400 to-purple-600' }
  ];

  return timeSlots.map(({ label, range, color }) => {
    const postsInRange = analytics.filter(data => {
      if (data.publishedTime && data.publishedTime !== '') {
        const hour = parseInt(data.publishedTime.split(':')[0]);
        
        if (range[0] === 21 && range[1] === 24) {
          return hour >= 21 || hour < 6;
        }
        
        return hour >= range[0] && hour < range[1];
      }
      return false;
    });

    const avgEngagement = postsInRange.length > 0 
      ? postsInRange.reduce((sum, data) => sum + (data.likes + data.comments + data.shares), 0) / postsInRange.length
      : 0;

    return {
      label,
      range,
      color,
      postsInRange: postsInRange.length,
      avgEngagement
    };
  });
}

// 投稿タイプ別統計を計算
function calculatePostTypeStats(analytics: AnalyticsData[], posts: PostData[]) {
  const feedCount = analytics.filter(data => {
    if (!data.postId) {
      return data.category === 'feed';
    }
    const post = posts.find(p => p.id === data.postId);
    return post?.postType === 'feed';
  }).length;

  const reelCount = analytics.filter(data => {
    if (!data.postId) {
      return data.category === 'reel';
    }
    const post = posts.find(p => p.id === data.postId);
    return post?.postType === 'reel';
  }).length;

  const storyCount = analytics.filter(data => {
    if (!data.postId) {
      return data.category === 'story';
    }
    const post = posts.find(p => p.id === data.postId);
    return post?.postType === 'story';
  }).length;

  const total = feedCount + reelCount + storyCount;

  return [
    { type: 'feed', count: feedCount, label: '📸 フィード', color: 'from-blue-400 to-blue-600', bg: 'from-blue-50 to-blue-100' },
    { type: 'reel', count: reelCount, label: '🎬 リール', color: 'from-purple-400 to-purple-600', bg: 'from-purple-50 to-purple-100' },
    { type: 'story', count: storyCount, label: '📱 ストーリーズ', color: 'from-pink-400 to-pink-600', bg: 'from-pink-50 to-pink-100' }
  ].map(({ type, count, label, color, bg }) => {
    const percentage = total > 0 ? (count / total * 100) : 0;
    return { type, count, label, color, bg, percentage };
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') as 'weekly' | 'monthly';
    const date = searchParams.get('date');

    if (!userId || !period || !date) {
      return NextResponse.json(
        { error: 'userId, period, date パラメータが必要です' },
        { status: 400 }
      );
    }

    console.log('📊 月次レポートサマリー取得開始:', { userId, period, date });

    // 分析データを取得
    const analyticsQuery = query(
      collection(db, 'analytics'),
      where('userId', '==', userId),
      orderBy('publishedAt', 'desc')
    );
    const analyticsSnapshot = await getDocs(analyticsQuery);
    const analytics: AnalyticsData[] = analyticsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        postId: data.postId || null,
        userId: data.userId || '',
        likes: data.likes || 0,
        comments: data.comments || 0,
        shares: data.shares || 0,
        reach: data.reach || 0,
        profileClicks: data.profileClicks,
        websiteClicks: data.websiteClicks,
        storyViews: data.storyViews,
        followerChange: data.followerChange,
        publishedAt: data.publishedAt?.toDate ? data.publishedAt.toDate() : new Date(data.publishedAt || Date.now()),
        publishedTime: data.publishedTime,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
        title: data.title,
        content: data.content,
        hashtags: data.hashtags,
        category: data.category,
        thumbnail: data.thumbnail,
        audience: data.audience,
        reachSource: data.reachSource
      };
    });

    // 投稿データを取得
    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const postsSnapshot = await getDocs(postsQuery);
    const posts: PostData[] = postsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        content: data.content || '',
        hashtags: data.hashtags || [],
        postType: data.postType || 'feed',
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime,
        status: data.status || 'draft',
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
        likes: data.likes,
        comments: data.comments,
        shares: data.shares,
        views: data.views,
        reach: data.reach,
        engagementRate: data.engagementRate
      };
    });

    console.log('📊 データ取得完了:', { 
      analyticsCount: analytics.length, 
      postsCount: posts.length 
    });

    // 現在期間のデータをフィルタリング
    const currentAnalytics = filterDataByPeriod(analytics, period, date);
    
    // 前期間のデータを取得
    const previousPeriod = getPreviousPeriod(period, date);
    const previousAnalytics = filterDataByPeriod(analytics, period, previousPeriod);

    console.log('📊 期間別データ:', { 
      currentCount: currentAnalytics.length, 
      previousCount: previousAnalytics.length 
    });

    // 統計値を計算
    const currentTotals = calculateTotals(currentAnalytics);
    const previousTotals = calculateTotals(previousAnalytics);

    // 変化率を計算
    const changes = {
      likesChange: calculateChange(currentTotals.totalLikes, previousTotals.totalLikes),
      commentsChange: calculateChange(currentTotals.totalComments, previousTotals.totalComments),
      sharesChange: calculateChange(currentTotals.totalShares, previousTotals.totalShares),
      reachChange: calculateChange(currentTotals.totalReach, previousTotals.totalReach),
      followerChange: calculateChange(currentTotals.totalFollowerChange, previousTotals.totalFollowerChange),
      postsChange: calculateChange(currentTotals.totalPosts, previousTotals.totalPosts)
    };

    // 詳細分析を計算
    const audienceAnalysis = calculateAudienceAnalysis(currentAnalytics);
    const reachSourceAnalysis = calculateReachSourceAnalysis(currentAnalytics);
    const hashtagStats = calculateHashtagStats(currentAnalytics, posts);
    const timeSlotAnalysis = calculateTimeSlotAnalysis(currentAnalytics);
    const postTypeStats = calculatePostTypeStats(currentAnalytics, posts);

    // 最適な投稿時間を特定
    const bestTimeSlot = timeSlotAnalysis.reduce((best, current) => {
      if (current.postsInRange > 0 && current.avgEngagement > best.avgEngagement) {
        return current;
      }
      return best;
    }, timeSlotAnalysis[0]);

    const summary = {
      period,
      date,
      totals: currentTotals,
      previousTotals,
      changes,
      audienceAnalysis,
      reachSourceAnalysis,
      hashtagStats,
      timeSlotAnalysis,
      bestTimeSlot,
      postTypeStats
    };

    console.log('📊 月次レポートサマリー計算完了');

    return NextResponse.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('❌ 月次レポートサマリー取得エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: '月次レポートサマリーの取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
