import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';

interface AnalyticsData {
  id: string;
  userId: string;
  postId: string | null;
  likes: number;
  comments: number;
  shares: number;
  reposts: number;
  reach: number;
  saves: number;
  followerIncrease: number;
  engagementRate: number;
  publishedAt: Date | { toDate: () => Date };
  publishedTime: string;
  createdAt: Date | { toDate: () => Date };
  // 投稿情報
  title?: string;
  content?: string;
  hashtags?: string[] | string;
  thumbnail?: string;
  category?: 'reel' | 'feed' | 'story';
  // フィード専用フィールド
  reachFollowerPercent?: number;
  interactionCount?: number;
  interactionFollowerPercent?: number;
  reachSourceProfile?: number;
  reachSourceFeed?: number;
  reachSourceExplore?: number;
  reachSourceSearch?: number;
  reachSourceOther?: number;
  reachedAccounts?: number;
  profileVisits?: number;
  profileFollows?: number;
  // リール専用フィールド
  reelReachFollowerPercent?: number;
  reelInteractionCount?: number;
  reelInteractionFollowerPercent?: number;
  reelReachSourceProfile?: number;
  reelReachSourceReel?: number;
  reelReachSourceExplore?: number;
  reelReachSourceSearch?: number;
  reelReachSourceOther?: number;
  reelReachedAccounts?: number;
  reelSkipRate?: number;
  reelNormalSkipRate?: number;
  reelPlayTime?: number;
  // オーディエンス分析
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
    topCities: {
      city: string;
      percentage: number;
    }[];
    topCountries: {
      country: string;
      percentage: number;
    }[];
    followers: number;
    nonFollowers: number;
  };
  // リーチソース分析
  reachSource?: {
    profile: number;
    feed: number;
    explore: number;
    search: number;
    other: number;
  };
}

interface PostData {
  id: string;
  title: string;
  content: string;
  hashtags: string[] | string;
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
  try {
    console.log('📅 getWeekRange呼び出し:', weekString);
    
    if (!weekString || !weekString.includes('-W')) {
      throw new Error(`Invalid week string format: ${weekString}`);
    }
    
    const [year, week] = weekString.split('-W');
    
    if (!year || !week || isNaN(parseInt(year)) || isNaN(parseInt(week))) {
      throw new Error(`Invalid year or week: year=${year}, week=${week}`);
    }
    
    const startOfYear = new Date(parseInt(year), 0, 1);
    const startOfWeek = new Date(startOfYear.getTime() + (parseInt(week) - 1) * 7 * 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);
    
    console.log('📅 getWeekRange結果:', { start: startOfWeek, end: endOfWeek });
    
    return { start: startOfWeek, end: endOfWeek };
  } catch (error) {
    console.error('❌ getWeekRangeエラー:', error);
    console.error('❌ weekString:', weekString);
    throw error;
  }
}

// 前期間のデータを取得
function getPreviousWeek(currentWeekString: string): string {
  try {
    console.log('📅 getPreviousWeek呼び出し:', currentWeekString);
    
    const [year, week] = currentWeekString.split('-W');
    
    if (!year || !week || isNaN(parseInt(year)) || isNaN(parseInt(week))) {
      throw new Error(`Invalid year or week: year=${year}, week=${week}`);
    }
    
    const currentWeek = parseInt(week);
    const previousWeek = currentWeek > 1 ? currentWeek - 1 : 52;
    const previousYear = currentWeek > 1 ? year : (parseInt(year) - 1).toString();
    const result = `${previousYear}-W${previousWeek.toString().padStart(2, '0')}`;
    console.log('📅 getPreviousWeek結果:', result);
    return result;
  } catch (error) {
    console.error('❌ getPreviousWeekエラー:', error);
    console.error('❌ パラメータ:', currentWeekString);
    throw error;
  }
}

// データを期間でフィルタリング
function filterDataByWeek(data: AnalyticsData[], weekString: string): AnalyticsData[] {
  try {
    console.log('🔍 filterDataByWeek呼び出し:', { dataLength: data.length, weekString });
    
    const weekRange = getWeekRange(weekString);
    
    return data.filter(item => {
      try {
        const itemDate = item.publishedAt instanceof Date ? item.publishedAt : 
          (item.publishedAt && typeof item.publishedAt === 'object' && 'toDate' in item.publishedAt) ?
            item.publishedAt.toDate() : new Date(item.publishedAt);
        
        if (isNaN(itemDate.getTime())) {
          console.warn('⚠️ 無効な日付をスキップ:', item.publishedAt);
          return false;
        }
        
        const matches = itemDate >= weekRange.start && itemDate <= weekRange.end;
        if (matches) {
          console.log('📅 週次マッチ:', { itemDate, weekRange });
        }
        return matches;
      } catch (error) {
        console.error('❌ フィルタリングエラー:', error, 'item:', item);
        return false;
      }
    });
  } catch (error) {
    console.error('❌ filterDataByWeek全体エラー:', error);
    return [];
  }
}

// 統計値を計算
function calculateTotals(analytics: AnalyticsData[]) {
  return {
    totalLikes: analytics.reduce((sum, data) => sum + data.likes, 0),
    totalComments: analytics.reduce((sum, data) => sum + data.comments, 0),
    totalShares: analytics.reduce((sum, data) => sum + data.shares, 0),
    totalReposts: analytics.reduce((sum, data) => sum + (data.reposts || 0), 0),
    totalReach: analytics.reduce((sum, data) => sum + data.reach, 0),
    totalSaves: analytics.reduce((sum, data) => sum + (data.saves || 0), 0),
    totalFollowerIncrease: analytics.reduce((sum, data) => sum + (data.followerIncrease || 0), 0),
    avgEngagementRate: analytics.length > 0 ? analytics.reduce((sum, data) => sum + (data.engagementRate || 0), 0) / analytics.length : 0,
    totalPosts: 0 // 投稿数は別途計算するため0で初期化
  };
}

// 変化率を計算
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous * 100);
}

// ハッシュタグ統計を計算（postsコレクション + 手動入力分析データから取得）
function calculateHashtagStats(analytics: AnalyticsData[], posts: PostData[]) {
  const hashtagCounts: { [key: string]: number } = {};
  
  console.log('🔍 ハッシュタグ統計計算開始:', { 
    postsCount: posts.length, 
    analyticsCount: analytics.length 
  });
  
  // 1. postsコレクションから直接ハッシュタグを取得
  posts.forEach((post, index) => {
    console.log(`📝 Post ${index}:`, { 
      postId: post.id,
      hashtags: post.hashtags,
      hasHashtags: !!post.hashtags && post.hashtags.length > 0
    });
    
    if (post.hashtags) {
      let hashtagsArray: string[] = [];
      
      // hashtagsが配列か文字列かを判定
      if (Array.isArray(post.hashtags)) {
        hashtagsArray = post.hashtags;
      } else if (typeof post.hashtags === 'string') {
        // 文字列の場合はカンマ区切りで分割
        hashtagsArray = post.hashtags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
      
      console.log(`📝 Postハッシュタグ処理:`, { 
        postId: post.id,
        originalHashtags: post.hashtags,
        hashtagsType: typeof post.hashtags,
        isArray: Array.isArray(post.hashtags),
        processedHashtags: hashtagsArray
      });
      
      if (hashtagsArray.length > 0) {
        hashtagsArray.forEach(hashtag => {
          hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
        });
      }
    }
  });

  // 2. 手動入力の分析データからもハッシュタグを取得（postIdがnullの場合）
  analytics.forEach((data, index) => {
    console.log(`📊 Analytics ${index}:`, { 
      postId: data.postId,
      hashtags: data.hashtags,
      hasAnalyticsHashtags: !!data.hashtags && data.hashtags.length > 0,
      isManualInput: data.postId === null
    });
    
    // postIdがnull（手動入力）の場合、分析データからハッシュタグを取得
    if (data.postId === null && data.hashtags) {
      let hashtagsArray: string[] = [];
      
      // hashtagsが配列か文字列かを判定
      if (Array.isArray(data.hashtags)) {
        hashtagsArray = data.hashtags;
      } else if (typeof data.hashtags === 'string') {
        // 文字列の場合はカンマ区切りで分割
        hashtagsArray = data.hashtags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
      
      console.log(`📊 手動入力ハッシュタグ処理:`, { 
        postId: data.postId,
        originalHashtags: data.hashtags,
        hashtagsType: typeof data.hashtags,
        isArray: Array.isArray(data.hashtags),
        processedHashtags: hashtagsArray
      });
      
      if (hashtagsArray.length > 0) {
        hashtagsArray.forEach(hashtag => {
          hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
        });
      }
    }
  });

  console.log('📊 ハッシュタグ集計結果:', hashtagCounts);
  
  const result = Object.entries(hashtagCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10) // 上位10件
    .map(([hashtag, count]) => ({ hashtag, count }));
    
  console.log('📊 最終ハッシュタグ結果:', result);
  
  return result;
}

// 投稿時間分析を計算
function calculateTimeSlotAnalysis(analytics: AnalyticsData[]) {
  const timeSlots = [
    { label: '早朝 (6-9時)', range: [6, 9], color: 'from-blue-400 to-blue-600' },
    { label: '午前 (9-12時)', range: [9, 12], color: 'from-green-400 to-green-600' },
    { label: '午後 (12-15時)', range: [12, 15], color: 'from-yellow-400 to-yellow-600' },
    { label: '夕方 (15-18時)', range: [15, 18], color: 'from-orange-400 to-orange-600' },
    { label: '夜間 (18-21時)', range: [18, 21], color: 'from-red-400 to-red-600' },
    { label: '深夜 (21-6時)', range: [21, 6], color: 'from-purple-400 to-purple-600' }
  ];

  return timeSlots.map(slot => {
    const postsInRange = analytics.filter(data => {
      const hour = data.publishedAt instanceof Date ? data.publishedAt.getHours() : 
        (data.publishedAt && typeof data.publishedAt === 'object' && 'toDate' in data.publishedAt) ?
          data.publishedAt.toDate().getHours() : new Date(data.publishedAt).getHours();
      
      if (slot.range[0] <= slot.range[1]) {
        return hour >= slot.range[0] && hour < slot.range[1];
      } else {
        return hour >= slot.range[0] || hour < slot.range[1];
      }
    });

    const totalEngagement = postsInRange.reduce((sum, data) => 
      sum + data.likes + data.comments + data.shares + (data.saves || 0), 0);
    const avgEngagement = postsInRange.length > 0 ? totalEngagement / postsInRange.length : 0;

    return {
      ...slot,
      postsInRange: postsInRange.length,
      avgEngagement: Math.round(avgEngagement)
    };
  });
}

// 投稿タイプ別統計を計算
function calculatePostTypeStats(analytics: AnalyticsData[], posts: PostData[]) {
  const postTypeCounts: { [key: string]: number } = { feed: 0, reel: 0, story: 0 };
  
  // postsコレクションから投稿タイプを集計
  posts.forEach(post => {
    if (post.postType && postTypeCounts.hasOwnProperty(post.postType)) {
      postTypeCounts[post.postType]++;
    }
  });

  const total = Object.values(postTypeCounts).reduce((sum, count) => sum + count, 0);
  
  return [
    { type: 'feed', count: postTypeCounts.feed, label: 'フィード', color: 'text-blue-600', bg: 'bg-blue-100' },
    { type: 'reel', count: postTypeCounts.reel, label: 'リール', color: 'text-purple-600', bg: 'bg-purple-100' },
    { type: 'story', count: postTypeCounts.story, label: 'ストーリー', color: 'text-green-600', bg: 'bg-green-100' }
  ].map(({ type, count, label, color, bg }) => {
    const percentage = total > 0 ? (count / total * 100) : 0;
    return { type, count, label, color, bg, percentage };
  });
}

// 現在の週を取得する関数
function getCurrentWeek(): string {
  const now = new Date();
  const year = now.getFullYear();
  
  // 年の最初の日を取得
  const startOfYear = new Date(year, 0, 1);
  
  // 現在の日付までの経過日数を計算
  const daysSinceStart = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  
  // 週数を計算（1週目から開始）
  const weekNumber = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);
  
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 週次レポートサマリーAPI開始');
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const weekString = searchParams.get('week') || getCurrentWeek(); // デフォルトは現在の週

    console.log('🔍 パラメータ確認:', { userId, weekString });

    if (!userId) {
      console.log('❌ パラメータ不足');
      return NextResponse.json(
        { error: 'userId パラメータが必要です' },
        { status: 400 }
      );
    }

    console.log('📊 週次レポートサマリー取得開始:', { userId, weekString });

    // Firebase接続確認
    console.log('🔍 Firebase接続確認中...');
    if (!adminDb) {
      console.error('❌ Firebase接続エラー: adminDb is null');
      return NextResponse.json(
        { error: 'Firebase接続エラー' },
        { status: 500 }
      );
    }
    console.log('✅ Firebase接続OK');

    // 分析データを取得（投稿一覧ページと同じロジック）
    console.log('🔍 分析データ取得開始...');
    const analyticsSnapshot = await adminDb
      .collection('analytics')
      .where('userId', '==', userId)
      .get();
    console.log('✅ 分析データ取得完了:', analyticsSnapshot.docs.length, '件');
    const analytics: AnalyticsData[] = analyticsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId || '',
        postId: data.postId,
        likes: data.likes || 0,
        comments: data.comments || 0,
        shares: data.shares || 0,
        reposts: data.reposts || 0,
        reach: data.reach || 0,
        saves: data.saves || 0,
        followerIncrease: data.followerIncrease || 0,
        engagementRate: data.engagementRate || 0,
        publishedAt: data.publishedAt?.toDate ? data.publishedAt.toDate() : new Date(data.publishedAt || Date.now()),
        publishedTime: data.publishedTime || '',
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
        title: data.title,
        content: data.content,
        hashtags: data.hashtags,
        thumbnail: data.thumbnail,
        category: data.category,
        reachFollowerPercent: data.reachFollowerPercent,
        interactionCount: data.interactionCount,
        interactionFollowerPercent: data.interactionFollowerPercent,
        reachSourceProfile: data.reachSourceProfile,
        reachSourceFeed: data.reachSourceFeed,
        reachSourceExplore: data.reachSourceExplore,
        reachSourceSearch: data.reachSourceSearch,
        reachSourceOther: data.reachSourceOther,
        reachedAccounts: data.reachedAccounts,
        profileVisits: data.profileVisits,
        profileFollows: data.profileFollows,
        reelReachFollowerPercent: data.reelReachFollowerPercent,
        reelInteractionCount: data.reelInteractionCount,
        reelInteractionFollowerPercent: data.reelInteractionFollowerPercent,
        reelReachSourceProfile: data.reelReachSourceProfile,
        reelReachSourceReel: data.reelReachSourceReel,
        reelReachSourceExplore: data.reelReachSourceExplore,
        reelReachSourceSearch: data.reelReachSourceSearch,
        reelReachSourceOther: data.reelReachSourceOther,
        reelReachedAccounts: data.reelReachedAccounts,
        reelSkipRate: data.reelSkipRate,
        reelNormalSkipRate: data.reelNormalSkipRate,
        reelPlayTime: data.reelPlayTime,
        audience: data.audience,
        reachSource: data.reachSource
      };
    });

    // 投稿データを取得（投稿一覧ページと同じロジック）
    console.log('🔍 投稿データ取得開始...');
    const postsSnapshot = await adminDb
      .collection('posts')
      .where('userId', '==', userId)
      .get();
    console.log('✅ 投稿データ取得完了:', postsSnapshot.docs.length, '件');
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

    // 現在週のデータをフィルタリング
    const currentAnalytics = filterDataByWeek(analytics, weekString);
    
    // 投稿データは期間フィルタリングを別途実装
    const currentPosts = posts.filter(post => {
      const postDate = post.createdAt instanceof Date ? post.createdAt : 
        (post.createdAt && typeof post.createdAt === 'object' && 'toDate' in post.createdAt) ?
          post.createdAt.toDate() : new Date(post.createdAt);
      
      const weekRange = getWeekRange(weekString);
      return postDate >= weekRange.start && postDate <= weekRange.end;
    });
    
    // 前週のデータを取得
    const previousWeek = getPreviousWeek(weekString);
    const previousAnalytics = filterDataByWeek(analytics, previousWeek);
    const previousPosts = posts.filter(post => {
      const postDate = post.createdAt instanceof Date ? post.createdAt : 
        (post.createdAt && typeof post.createdAt === 'object' && 'toDate' in post.createdAt) ?
          post.createdAt.toDate() : new Date(post.createdAt);
      
      const weekRange = getWeekRange(previousWeek);
      return postDate >= weekRange.start && postDate <= weekRange.end;
    });

    console.log('📊 週別データ:', { 
      currentAnalytics: currentAnalytics.length,
      currentPosts: currentPosts.length,
      previousAnalytics: previousAnalytics.length,
      previousPosts: previousPosts.length
    });

    // 統計値を計算（投稿一覧ページと同じロジック）
    const currentTotals = calculateTotals(currentAnalytics);
    const previousTotals = calculateTotals(previousAnalytics);
    
    console.log('📊 calculateTotals結果（投稿数上書き前）:', {
      currentTotalsPosts: currentTotals.totalPosts,
      previousTotalsPosts: previousTotals.totalPosts,
      currentAnalyticsLength: currentAnalytics.length,
      previousAnalyticsLength: previousAnalytics.length
    });
    
    // 投稿数も正確に計算
    currentTotals.totalPosts = currentPosts.length;
    previousTotals.totalPosts = previousPosts.length;
    
    console.log('📊 投稿数上書き後:', {
      currentTotalsPosts: currentTotals.totalPosts,
      previousTotalsPosts: previousTotals.totalPosts,
      currentPostsLength: currentPosts.length,
      previousPostsLength: previousPosts.length
    });

    // 変化率を計算
    const changes = {
      likesChange: calculateChange(currentTotals.totalLikes, previousTotals.totalLikes),
      commentsChange: calculateChange(currentTotals.totalComments, previousTotals.totalComments),
      sharesChange: calculateChange(currentTotals.totalShares, previousTotals.totalShares),
      repostsChange: calculateChange(currentTotals.totalReposts, previousTotals.totalReposts),
      reachChange: calculateChange(currentTotals.totalReach, previousTotals.totalReach),
      savesChange: calculateChange(currentTotals.totalSaves, previousTotals.totalSaves),
      followerChange: calculateChange(currentTotals.totalFollowerIncrease, previousTotals.totalFollowerIncrease),
      engagementRateChange: calculateChange(currentTotals.avgEngagementRate, previousTotals.avgEngagementRate),
      postsChange: calculateChange(currentTotals.totalPosts, previousTotals.totalPosts)
    };

    // 詳細分析を計算（投稿一覧ページと同じロジック）
    const hashtagStats = calculateHashtagStats(currentAnalytics, currentPosts);
    const timeSlotAnalysis = calculateTimeSlotAnalysis(currentAnalytics);
    const postTypeStats = calculatePostTypeStats(currentAnalytics, currentPosts);

    // 最適な投稿時間を特定
    const bestTimeSlot = timeSlotAnalysis.reduce((best, current) => {
      if (current.postsInRange > 0 && current.avgEngagement > best.avgEngagement) {
        return current;
      }
      return best;
    }, timeSlotAnalysis[0]);

    const summary = {
      period: 'weekly' as const,
      date: weekString,
      totals: currentTotals,
      previousTotals,
      changes,
      hashtagStats,
      timeSlotAnalysis,
      postTypeStats,
      bestTimeSlot,
      avgEngagementRate: currentTotals.avgEngagementRate,
      totalSaves: currentTotals.totalSaves,
      totalReposts: currentTotals.totalReposts,
      totalFollowerIncrease: currentTotals.totalFollowerIncrease
    };

    console.log('📊 週次レポートサマリー計算完了');

    return NextResponse.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('❌ 週次レポートサマリー取得エラー:', error);
    console.error('❌ エラー詳細:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      {
        success: false,
        error: '週次レポートサマリーの取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
